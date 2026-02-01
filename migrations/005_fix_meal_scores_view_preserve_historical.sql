-- Migration: Fix meal_scores view to preserve historical scores
-- Date: 2026-02-01
-- Description: Historical meals (before 2026-01-28) use the original score column
--              New meals use the calculated score from raw_score + multipliers
-- 
-- This fixes the score drop issue caused by the 3NF migration where bonus 
-- multipliers were lost when clamping scores to raw_score (0-100 range)

-- Fix meal_scores view 
CREATE OR REPLACE VIEW meal_scores AS
SELECT
    m.id AS meal_id,
    m.user_id,
    m.image_before_url,
    m.image_after_url,
    m.raw_score,
    m.analysis,
    m.created_at,
    m.updated_at,
    
    -- Food type info
    ft.type_name AS food_type,
    ft.score_multiplier AS food_multiplier,
    ft.max_score_cap,
    
    -- Bonus info
    bw.id AS bonus_window_id,
    bw.meal_period,
    bw.multiplier AS bonus_multiplier,
    bw.window_start AS bonus_start,
    bw.window_end AS bonus_end,
    
    -- FIXED: Use original score for historical meals, calculated for new
    CASE 
        WHEN m.created_at < '2026-01-28 00:00:00+00'::timestamptz THEN m.score
        ELSE ROUND(
            LEAST(m.raw_score, COALESCE(ft.max_score_cap, m.raw_score))::DECIMAL
            * ft.score_multiplier
            * COALESCE(bw.multiplier, 1.0)
        )::INTEGER
    END AS final_score

FROM meals m
JOIN food_types ft ON m.food_type_id = ft.id
LEFT JOIN bonus_windows bw ON m.bonus_window_id = bw.id;

-- Update user_stats view to use the fixed meal_scores
CREATE OR REPLACE VIEW user_stats AS
SELECT
    p.id AS user_id,
    p.username,
    p.avatar_url,
    p.created_at AS profile_created_at,
    
    -- Aggregate stats from meal_scores view
    COUNT(ms.meal_id) AS total_meals,
    COALESCE(SUM(ms.final_score), 0)::INTEGER AS total_score,
    COALESCE(AVG(ms.final_score), 0)::DECIMAL(10,2) AS avg_score,
    MAX(ms.created_at) AS last_meal_at

FROM profiles p
LEFT JOIN meal_scores ms ON ms.user_id = p.id
GROUP BY p.id, p.username, p.avatar_url, p.created_at;

-- Leaderboard view (references user_stats)
CREATE OR REPLACE VIEW leaderboard AS
SELECT
    user_id,
    username,
    total_meals,
    total_score,
    RANK() OVER (ORDER BY total_score DESC) AS rank
FROM user_stats
ORDER BY total_score DESC;
