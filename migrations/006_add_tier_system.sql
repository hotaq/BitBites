-- =====================================================
-- TIER SYSTEM MIGRATION
-- Date: 2026-02-01
-- Description: Adds tier/rebirth system with 10 levels,
--              score multipliers, and escalating requirements
-- =====================================================

-- Step 1: Add tier column to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS tier INTEGER DEFAULT 0;

-- Add constraint for tier range (0-10)
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_tier_check;

ALTER TABLE profiles 
ADD CONSTRAINT profiles_tier_check CHECK (tier >= 0 AND tier <= 10);

-- Step 2: Create tier_config lookup table
CREATE TABLE IF NOT EXISTS tier_config (
    tier INTEGER PRIMARY KEY CHECK (tier >= 0 AND tier <= 10),
    points_required INTEGER NOT NULL,
    score_multiplier DECIMAL(4,2) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE tier_config ENABLE ROW LEVEL SECURITY;

-- Everyone can read tier config
CREATE POLICY "Tier config is viewable by everyone"
    ON tier_config FOR SELECT
    USING (true);

-- Seed tier data (1.15^tier for multiplier)
INSERT INTO tier_config (tier, points_required, score_multiplier, description) VALUES
    (0, 0, 1.00, 'Starter'),
    (1, 10000, 1.15, 'Bronze'),
    (2, 20000, 1.32, 'Silver'),
    (3, 30000, 1.52, 'Gold'),
    (4, 40000, 1.75, 'Platinum'),
    (5, 50000, 2.01, 'Diamond'),
    (6, 60000, 2.31, 'Master'),
    (7, 70000, 2.66, 'Grandmaster'),
    (8, 80000, 3.06, 'Champion'),
    (9, 90000, 3.52, 'Legend'),
    (10, 100000, 4.05, 'Mythic')
ON CONFLICT (tier) DO UPDATE SET
    points_required = EXCLUDED.points_required,
    score_multiplier = EXCLUDED.score_multiplier,
    description = EXCLUDED.description;

-- Step 3: Create index for tier lookups
CREATE INDEX IF NOT EXISTS idx_profiles_tier ON profiles(tier);

-- =====================================================
-- UPDATE VIEWS FOR TIER SYSTEM
-- =====================================================

-- Must drop views in order due to dependencies
DROP VIEW IF EXISTS leaderboard CASCADE;
DROP VIEW IF EXISTS user_stats CASCADE;
DROP VIEW IF EXISTS meal_scores CASCADE;

-- Recreate meal_scores view with tier bonus
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
    COALESCE(tc.score_multiplier, 1.0) AS tier_multiplier,
    -- Calculate base score (before tier bonus)
    CASE 
        WHEN m.created_at < '2026-01-28 00:00:00+00'::timestamptz THEN m.score
        ELSE ROUND(
            LEAST(m.raw_score, COALESCE(ft.max_score_cap, m.raw_score))::DECIMAL
            * ft.score_multiplier
            * COALESCE(bw.multiplier, 1.0)
        )::INTEGER
    END AS base_score,
    -- Calculate final score WITH tier bonus
    ROUND(
        CASE 
            WHEN m.created_at < '2026-01-28 00:00:00+00'::timestamptz THEN m.score
            ELSE ROUND(
                LEAST(m.raw_score, COALESCE(ft.max_score_cap, m.raw_score))::DECIMAL
                * ft.score_multiplier
                * COALESCE(bw.multiplier, 1.0)
            )
        END
        * COALESCE(tc.score_multiplier, 1.0)
    )::INTEGER AS final_score
FROM meals m
JOIN food_types ft ON m.food_type_id = ft.id
LEFT JOIN bonus_windows bw ON m.bonus_window_id = bw.id
LEFT JOIN profiles p ON m.user_id = p.id
LEFT JOIN tier_config tc ON COALESCE(p.tier, 0) = tc.tier;

-- Recreate user_stats view with tier info
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
    COALESCE(SUM(ms.final_score), 0)::INTEGER AS total_score,
    COALESCE(AVG(ms.final_score), 0)::DECIMAL(10,2) AS avg_score,
    MAX(ms.created_at) AS last_meal_at,
    GREATEST(0, COALESCE(SUM(ms.final_score), 0) - tc.points_required)::INTEGER AS cycle_score,
    CASE 
        WHEN COALESCE(p.tier, 0) >= 10 THEN 100
        WHEN next_tc.points_required IS NULL THEN 0
        WHEN next_tc.points_required = tc.points_required THEN 0
        ELSE LEAST(100, GREATEST(0, ROUND(
            (COALESCE(SUM(ms.final_score), 0) - tc.points_required)::DECIMAL 
            / NULLIF(next_tc.points_required - tc.points_required, 0) * 100
        )))::INTEGER
    END AS tier_progress,
    CASE 
        WHEN COALESCE(p.tier, 0) >= 10 THEN 0
        ELSE GREATEST(0, next_tc.points_required - COALESCE(SUM(ms.final_score), 0))::INTEGER
    END AS points_to_next_tier
FROM profiles p
LEFT JOIN meal_scores ms ON ms.user_id = p.id
LEFT JOIN tier_config tc ON COALESCE(p.tier, 0) = tc.tier
LEFT JOIN tier_config next_tc ON next_tc.tier = COALESCE(p.tier, 0) + 1
GROUP BY p.id, p.username, p.avatar_url, p.created_at, p.tier, 
         tc.score_multiplier, tc.description, tc.points_required,
         next_tc.points_required, next_tc.description;

-- Recreate leaderboard view
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
    RANK() OVER (ORDER BY tier DESC, cycle_score DESC) AS rank
FROM user_stats
ORDER BY tier DESC, cycle_score DESC;

-- =====================================================
-- TIER UP FUNCTION
-- =====================================================

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
    
    SELECT total_score INTO v_total_score FROM user_stats WHERE user_id = p_user_id;
    SELECT points_required INTO v_next_requirement FROM tier_config WHERE tier = v_current_tier + 1;
    
    IF v_total_score >= v_next_requirement THEN
        v_new_tier := v_current_tier + 1;
        UPDATE profiles SET tier = v_new_tier WHERE id = p_user_id;
        SELECT description INTO v_tier_name FROM tier_config WHERE tier = v_new_tier;
        RETURN QUERY SELECT true, v_current_tier, v_new_tier, v_tier_name;
    ELSE
        SELECT description INTO v_tier_name FROM tier_config WHERE tier = v_current_tier;
        RETURN QUERY SELECT false, v_current_tier, v_current_tier, v_tier_name;
    END IF;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION check_tier_up(UUID) TO authenticated;
