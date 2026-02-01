-- Restore scores by estimating original values from analysis text
-- Run this in Supabase SQL Editor

-- =====================================================
-- STEP 1: Identify meals likely to have had bonuses
-- =====================================================

-- Create a temporary table to track which meals need fixing
CREATE TEMP TABLE meals_to_fix AS
SELECT
    m.id,
    m.raw_score as current_raw,
    m.analysis,
    m.food_type_id,
    m.created_at
FROM meals m
WHERE
    -- High scores that were likely boosted
    m.raw_score >= 67  -- 100 / 1.5 = 66.6
    AND (
        m.analysis ILIKE '%bonus%'
        OR m.analysis ILIKE '%boosted%'
        OR m.analysis ILIKE '%1.5%'
        OR m.analysis ILIKE '%x %'  -- "80 x 1.5" pattern
    );

-- See what we're about to fix
SELECT * FROM meals_to_fix ORDER BY current_raw DESC;

-- =====================================================
-- STEP 2: Estimate original raw scores
-- =====================================================

-- Extract the "Base Score" from analysis if it exists
-- Pattern: "Score boosted from X to Y" or "Base Score: X"
UPDATE meals
SET raw_score = CASE
    -- If analysis mentions "boosted from XX", extract that number
    WHEN analysis ~ 'from (\d+) to' THEN
        LEAST(100, (regexp_match(analysis, 'from (\d+) to'))[1]::int)
    -- If analysis mentions "Base Score: XX", extract that number
    WHEN analysis ~ 'Base Score: (\d+)' THEN
        LEAST(100, (regexp_match(analysis, 'Base Score: (\d+)'))[1]::int)
    -- Otherwise estimate by dividing by 1.5
    ELSE
        GREATEST(50, LEAST(100, ROUND(raw_score / 1.5)))
END
WHERE id IN (SELECT id FROM meals_to_fix);

-- =====================================================
-- STEP 3: Create retrospective bonus windows
-- =====================================================

-- Create bonus windows for past dates based on when meals were logged
INSERT INTO bonus_windows (window_date, meal_period, window_start, window_end)
SELECT DISTINCT
    DATE(m.created_at) as window_date,
    CASE
        WHEN EXTRACT(HOUR FROM m.created_at) BETWEEN 6 AND 11 THEN 'breakfast'
        WHEN EXTRACT(HOUR FROM m.created_at) BETWEEN 11 AND 15 THEN 'lunch'
        WHEN EXTRACT(HOUR FROM m.created_at) BETWEEN 15 AND 22 THEN 'dinner'
        ELSE 'lunch'
    END as meal_period,
    -- Create a window that includes the meal time
    DATE(m.created_at) + (EXTRACT(HOUR FROM m.created_at)::text || ':00:00')::time - INTERVAL '15 minutes' as window_start,
    DATE(m.created_at) + (EXTRACT(HOUR FROM m.created_at)::text || ':00:00')::time + INTERVAL '15 minutes' as window_end
FROM meals m
WHERE m.id IN (SELECT id FROM meals_to_fix)
ON CONFLICT (window_date, meal_period) DO NOTHING;

-- Link those meals to the bonus windows
UPDATE meals m
SET bonus_window_id = bw.id
FROM bonus_windows bw
WHERE DATE(m.created_at) = bw.window_date
  AND m.created_at BETWEEN bw.window_start AND bw.window_end
  AND m.bonus_window_id IS NULL
  AND m.id IN (SELECT id FROM meals_to_fix);

-- =====================================================
-- STEP 4: Verify the fix
-- =====================================================

-- Compare before and after
SELECT
    'Total meals fixed' as metric,
    COUNT(*)::text as value
FROM meals_to_fix
UNION ALL
SELECT
    'Estimated total score (after fix)',
    SUM(ms.final_score)::text
FROM meals_to_fix f
JOIN meal_scores ms ON ms.meal_id = f.id;

-- Show top 10 meals by final score
SELECT
    m.id,
    m.raw_score,
    ft.type_name as food_type,
    CASE WHEN bw.id IS NOT NULL THEN 'YES' ELSE 'NO' END as bonus,
    ms.final_score,
    LEFT(m.analysis, 40) as analysis
FROM meals m
JOIN food_types ft ON m.food_type_id = ft.id
LEFT JOIN bonus_windows bw ON m.bonus_window_id = bw.id
JOIN meal_scores ms ON ms.meal_id = m.id
ORDER BY ms.final_score DESC
LIMIT 10;

-- Clean up
DROP TABLE IF EXISTS meals_to_fix;
