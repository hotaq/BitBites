-- Migration 007: Refine Tier System Logic & Config
-- 1. Fix check_tier_up to strictly increment tier and set tiered_at timestamp
-- 2. Restrict tier multiplier to apply only to meals created AFTER tier-up
-- 3. Update cycle score calculation to explicitly deduct points spent
-- 4. Update tier requirements to use escalating gaps (10k, 30k, 60k...)

-- 1. Add tiered_at column if not exists
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tiered_at TIMESTAMPTZ;

-- 2. Update check_tier_up function
CREATE OR REPLACE FUNCTION check_tier_up(p_user_id UUID)
RETURNS TABLE(tiered_up BOOLEAN, old_tier INTEGER, new_tier INTEGER, tier_name TEXT) 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_tier INTEGER;
    v_total_score INTEGER;
    v_next_requirement INTEGER;
    v_new_tier INTEGER;
    v_tier_name TEXT;
BEGIN
    SELECT COALESCE(tier, 0) INTO v_current_tier FROM profiles WHERE id = p_user_id;
    
    IF v_current_tier >= 10 THEN
        RETURN QUERY SELECT false, v_current_tier, v_current_tier, 'Mythic'::TEXT;
        RETURN;
    END IF;
    
    -- Get total score (lifetime)
    SELECT total_score INTO v_total_score FROM user_stats WHERE user_id = p_user_id;
    
    -- Get next tier requirement
    SELECT points_required INTO v_next_requirement FROM tier_config WHERE tier = v_current_tier + 1;
    
    IF v_total_score >= v_next_requirement THEN
        v_new_tier := v_current_tier + 1;
        
        -- Just update tier and timestamp. DO NOT touch score_adjustment.
        UPDATE profiles 
        SET tier = v_new_tier,
            tiered_at = NOW()
        WHERE id = p_user_id;
        
        SELECT description INTO v_tier_name FROM tier_config WHERE tier = v_new_tier;
        RETURN QUERY SELECT true, v_current_tier, v_new_tier, v_tier_name;
    ELSE
        SELECT description INTO v_tier_name FROM tier_config WHERE tier = v_current_tier;
        RETURN QUERY SELECT false, v_current_tier, v_current_tier, v_tier_name;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 3. Update meal_scores view (Multiplier logic)
DROP VIEW IF EXISTS leaderboard CASCADE;
DROP VIEW IF EXISTS user_stats CASCADE;
DROP VIEW IF EXISTS meal_scores CASCADE;

CREATE VIEW meal_scores AS
SELECT
    m.id AS meal_id,
    m.user_id,
    m.image_before_url,
    m.image_after_url,
    m.raw_score,
    m.analysis,
    m.created_at,
    m.updated_at,
    ft.type_name AS food_type,
    ft.score_multiplier AS food_multiplier,
    ft.max_score_cap,
    bw.id AS bonus_window_id,
    bw.meal_period,
    bw.multiplier AS bonus_multiplier,
    bw.window_start AS bonus_start,
    bw.window_end AS bonus_end,
    COALESCE(p.tier, 0) AS user_tier,
    -- Only apply tier multiplier to meals created AFTER tier-up
    CASE 
        WHEN p.tiered_at IS NOT NULL AND m.created_at > p.tiered_at 
        THEN COALESCE(tc.score_multiplier, 1.0)
        ELSE 1.0
    END AS tier_multiplier,
    -- Base score (before tier)
    CASE 
        WHEN m.created_at < '2026-01-28 00:00:00+00'::timestamptz THEN m.score
        ELSE ROUND(
            LEAST(m.raw_score, COALESCE(ft.max_score_cap, m.raw_score))::DECIMAL
            * ft.score_multiplier
            * COALESCE(bw.multiplier, 1.0)
        )::INTEGER
    END AS base_score,
    -- Final score - tier multiplier only for new meals after tier-up
    ROUND(
        CASE 
            WHEN m.created_at < '2026-01-28 00:00:00+00'::timestamptz THEN m.score
            ELSE ROUND(
                LEAST(m.raw_score, COALESCE(ft.max_score_cap, m.raw_score))::DECIMAL
                * ft.score_multiplier
                * COALESCE(bw.multiplier, 1.0)
            )
        END
        * CASE 
            WHEN p.tiered_at IS NOT NULL AND m.created_at > p.tiered_at 
            THEN COALESCE(tc.score_multiplier, 1.0)
            ELSE 1.0
          END
    )::INTEGER AS final_score
FROM meals m
JOIN food_types ft ON m.food_type_id = ft.id
LEFT JOIN bonus_windows bw ON m.bonus_window_id = bw.id
LEFT JOIN profiles p ON m.user_id = p.id
LEFT JOIN tier_config tc ON COALESCE(p.tier, 0) = tc.tier;

-- 4. Update user_stats view (Cycle Score calc)
CREATE VIEW user_stats AS
SELECT
    p.id AS user_id,
    p.username,
    p.avatar_url,
    p.created_at AS profile_created_at,
    COALESCE(p.tier, 0) AS tier,
    tc.score_multiplier AS tier_multiplier,
    tc.description AS tier_name,
    tc.points_required AS tier_points_spent,
    CASE WHEN COALESCE(p.tier, 0) < 10 THEN COALESCE(p.tier, 0) + 1 ELSE NULL END AS next_tier,
    next_tc.points_required AS next_tier_requirement,
    next_tc.description AS next_tier_name,
    COUNT(ms.meal_id) AS total_meals,
    (COALESCE(SUM(ms.final_score), 0) + COALESCE(p.score_adjustment, 0))::INTEGER AS total_score,
    COALESCE(AVG(ms.final_score), 0)::DECIMAL(10,2) AS avg_score,
    MAX(ms.created_at) AS last_meal_at,
    
    -- Cycle Score = Total - Points Spent for current tier
    GREATEST(0, (COALESCE(SUM(ms.final_score), 0) + COALESCE(p.score_adjustment, 0)) - tc.points_required)::INTEGER AS cycle_score,
    
    -- Progress: (Total - Current Tier Req) / (Next Tier Req - Current Tier Req)
    CASE 
        WHEN COALESCE(p.tier, 0) >= 10 THEN 100
        WHEN next_tc.points_required IS NULL THEN 0
        WHEN next_tc.points_required = tc.points_required THEN 0
        ELSE LEAST(100, GREATEST(0, ROUND(
            ((COALESCE(SUM(ms.final_score), 0) + COALESCE(p.score_adjustment, 0)) - tc.points_required)::DECIMAL 
            / NULLIF(next_tc.points_required - tc.points_required, 0) * 100
        )))::INTEGER
    END AS tier_progress,
    
    CASE 
        WHEN COALESCE(p.tier, 0) >= 10 THEN 0
        ELSE GREATEST(0, next_tc.points_required - (COALESCE(SUM(ms.final_score), 0) + COALESCE(p.score_adjustment, 0)))::INTEGER
    END AS points_to_next_tier,
    
    COALESCE(p.score_adjustment, 0) AS score_adjustment
FROM profiles p
LEFT JOIN meal_scores ms ON ms.user_id = p.id
LEFT JOIN tier_config tc ON COALESCE(p.tier, 0) = tc.tier
LEFT JOIN tier_config next_tc ON next_tc.tier = COALESCE(p.tier, 0) + 1
GROUP BY p.id, p.username, p.avatar_url, p.created_at, p.tier, p.score_adjustment,
         tc.score_multiplier, tc.description, tc.points_required,
         next_tc.points_required, next_tc.description;

-- 5. Recreate leaderboard
CREATE VIEW leaderboard AS
SELECT
    user_id,
    username,
    tier,
    tier_name,
    tier_multiplier,
    total_meals,
    total_score,
    cycle_score,
    tier_progress,
    points_to_next_tier,
    score_adjustment,
    RANK() OVER (ORDER BY tier DESC, cycle_score DESC) AS rank
FROM user_stats
ORDER BY tier DESC, cycle_score DESC;

-- 6. Update tier_config with escalating gaps
UPDATE tier_config SET points_required = 10000 WHERE tier = 1;
UPDATE tier_config SET points_required = 30000 WHERE tier = 2;
UPDATE tier_config SET points_required = 60000 WHERE tier = 3;
UPDATE tier_config SET points_required = 100000 WHERE tier = 4;
UPDATE tier_config SET points_required = 150000 WHERE tier = 5;
UPDATE tier_config SET points_required = 210000 WHERE tier = 6;
UPDATE tier_config SET points_required = 280000 WHERE tier = 7;
UPDATE tier_config SET points_required = 360000 WHERE tier = 8;
UPDATE tier_config SET points_required = 450000 WHERE tier = 9;
UPDATE tier_config SET points_required = 550000 WHERE tier = 10;
