-- Fix scores after 3NF migration
-- This script helps diagnose and fix score discrepancies

-- =====================================================
-- DIAGNOSTIC: Check for score discrepancies
-- =====================================================

-- 1. Find meals where raw_score was clamped (likely had bonus multipliers)
SELECT
    id,
    raw_score,
    food_type_id,
    bonus_window_id,
    analysis
FROM meals
WHERE raw_score = 100
ORDER BY created_at DESC
LIMIT 10;

-- 2. Compare old vs new scoring for all meals
-- (Run this before and after fixes to verify)
SELECT
    m.id,
    m.raw_score,
    ft.type_name,
    ft.score_multiplier as food_mult,
    ft.max_score_cap,
    bw.multiplier as bonus_mult,
    ms.final_score,
    m.analysis
FROM meals m
JOIN food_types ft ON m.food_type_id = ft.id
LEFT JOIN bonus_windows bw ON m.bonus_window_id = bw.id
JOIN meal_scores ms ON ms.meal_id = m.id
ORDER BY m.created_at DESC
LIMIT 20;

-- =====================================================
-- FIX 1: Update food types based on analysis text
-- (If detect_food_type_from_analysis didn't work well)
-- =====================================================

-- Manually fix instant noodles
UPDATE meals
SET food_type_id = (SELECT id FROM food_types WHERE type_name = 'instant_noodles')
WHERE (
    analysis ILIKE '%instant%'
    OR analysis ILIKE '%noodle%'
    OR analysis ILIKE '%ramen%'
    OR analysis ILIKE '%cup noodle%'
)
AND food_type_id = (SELECT id FROM food_types WHERE type_name = 'other');

-- Manually fix snacks
UPDATE meals
SET food_type_id = (SELECT id FROM food_types WHERE type_name = 'snack')
WHERE (
    analysis ILIKE '%snack%'
    OR analysis ILIKE '%dessert%'
    OR analysis ILIKE '%chip%'
    OR analysis ILIKE '%candy%'
    OR analysis ILIKE '%fruit%'
)
AND food_type_id = (SELECT id FROM food_types WHERE type_name = 'other');

-- Manually fix main courses (if analysis mentions proper food)
UPDATE meals
SET food_type_id = (SELECT id FROM food_types WHERE type_name = 'main_course')
WHERE (
    analysis ILIKE '%rice%'
    OR analysis ILIKE '%curry%'
    OR analysis ILIKE '%steak%'
    OR analysis ILIKE '%chicken%'
    OR analysis ILIKE '%pasta%'
    OR analysis ILIKE '%fish%'
    OR analysis ILIKE '%meal%'
)
AND food_type_id = (SELECT id FROM food_types WHERE type_name = 'other');

-- =====================================================
-- FIX 2: Recalculate raw_scores for meals that likely had bonuses
-- =====================================================

-- If a meal has commentary mentioning "bonus" or "boosted",
-- it likely had a bonus multiplier applied in the old system.
-- We can't know the exact original raw_score, but we can estimate:

-- For meals with "bonus" in commentary, assume raw_score was roughly 2/3 of stored score
-- (since bonus multiplier is 1.5x)
UPDATE meals
SET raw_score = GREATEST(0, LEAST(100, ROUND(raw_score / 1.5)))
WHERE (
    analysis ILIKE '%bonus%'
    OR analysis ILIKE '%boosted%'
    OR analysis ILIKE '%1.5%'
)
AND raw_score > 50;  -- Only adjust higher scores

-- =====================================================
-- FIX 3: Apply retrospective bonus windows
-- =====================================================

-- Create bonus windows for past days based on meal timestamps
-- This is optional and depends on how accurate you want historical data

-- For each unique date with meals, create the bonus windows
INSERT INTO bonus_windows (window_date, meal_period, window_start, window_end)
SELECT DISTINCT
    DATE(m.created_at) as window_date,
    CASE
        WHEN EXTRACT(HOUR FROM m.created_at) BETWEEN 7 AND 10 THEN 'breakfast'
        WHEN EXTRACT(HOUR FROM m.created_at) BETWEEN 12 AND 14 THEN 'lunch'
        WHEN EXTRACT(HOUR FROM m.created_at) BETWEEN 18 AND 21 THEN 'dinner'
        ELSE 'lunch'  -- Default
    END as meal_period,
    DATE(m.created_at) + CASE
        WHEN EXTRACT(HOUR FROM m.created_at) BETWEEN 7 AND 10 THEN '08:00'::time
        WHEN EXTRACT(HOUR FROM m.created_at) BETWEEN 12 AND 14 THEN '12:30'::time
        WHEN EXTRACT(HOUR FROM m.created_at) BETWEEN 18 AND 21 THEN '19:00'::time
        ELSE '12:00'::time
    END as window_start,
    DATE(m.created_at) + CASE
        WHEN EXTRACT(HOUR FROM m.created_at) BETWEEN 7 AND 10 THEN '08:30'::time
        WHEN EXTRACT(HOUR FROM m.created_at) BETWEEN 12 AND 14 THEN '13:00'::time
        WHEN EXTRACT(HOUR FROM m.created_at) BETWEEN 18 AND 21 THEN '19:30'::time
        ELSE '12:30'::time
    END as window_end
FROM meals m
WHERE m.created_at < CURRENT_DATE  -- Only for past meals
ON CONFLICT (window_date, meal_period) DO NOTHING;

-- Link historical meals to bonus windows if they fall within a window
UPDATE meals m
SET bonus_window_id = bw.id
FROM bonus_windows bw
WHERE DATE(m.created_at) = bw.window_date
  AND m.created_at BETWEEN bw.window_start AND bw.window_end
  AND m.bonus_window_id IS NULL;

-- =====================================================
-- VERIFICATION: Compare totals before and after
-- =====================================================

-- Calculate total scores by user for verification
SELECT
    p.username,
    COUNT(m.id) as meal_count,
    SUM(m.raw_score) as total_raw_score,
    SUM(ms.final_score) as total_final_score,
    AVG(ms.final_score) as avg_final_score
FROM profiles p
LEFT JOIN meals m ON m.user_id = p.id
LEFT JOIN meal_scores ms ON ms.meal_id = m.id
GROUP BY p.id, p.username
ORDER BY total_final_score DESC;

-- Show meals with highest scores (should be near 100 or 150 with bonus)
SELECT
    m.id,
    p.username,
    m.raw_score,
    ft.type_name,
    bw.multiplier as bonus,
    ms.final_score,
    LEFT(m.analysis, 50) as analysis_preview
FROM meals m
JOIN profiles p ON m.user_id = p.id
JOIN food_types ft ON m.food_type_id = ft.id
LEFT JOIN bonus_windows bw ON m.bonus_window_id = bw.id
JOIN meal_scores ms ON ms.meal_id = m.id
ORDER BY ms.final_score DESC
LIMIT 10;
