-- Migration: BitBites Database 3NF Normalization
-- Date: 2026-01-28
-- Description: Transitions schema from 2NF to 3NF by removing derived data,
--              creating lookup tables, and adding proper relationships

-- =====================================================
-- STEP 1: Create Lookup Tables
-- =====================================================

-- food_types: Stores scoring rules (previously hardcoded in application)
CREATE TABLE IF NOT EXISTS food_types (
    id SERIAL PRIMARY KEY,
    type_name TEXT UNIQUE NOT NULL,
    score_multiplier DECIMAL(3,2) NOT NULL DEFAULT 1.00,
    max_score_cap INTEGER, -- NULL means no cap
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT valid_multiplier CHECK (score_multiplier > 0 AND score_multiplier <= 1.00)
);

-- Seed with initial food type rules
INSERT INTO food_types (type_name, score_multiplier, max_score_cap, description) VALUES
    ('main_course', 1.00, NULL, 'Full meals - no restrictions'),
    ('instant_noodles', 0.50, NULL, 'Quick meals - half points'),
    ('snack', 1.00, 70, 'Snacks/desserts - max 70 points'),
    ('other', 1.00, NULL, 'Uncategorized food')
ON CONFLICT (type_name) DO NOTHING;

-- bonus_windows: Tracks daily bonus time windows (previously client-side only)
CREATE TABLE IF NOT EXISTS bonus_windows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    window_date DATE NOT NULL,
    meal_period TEXT NOT NULL CHECK (meal_period IN ('breakfast', 'lunch', 'dinner')),
    window_start TIMESTAMP NOT NULL,
    window_end TIMESTAMP NOT NULL,
    multiplier DECIMAL(2,1) NOT NULL DEFAULT 1.5,
    created_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(window_date, meal_period)
);

-- =====================================================
-- STEP 2: Migrate Existing meals Table
-- =====================================================

-- Add new columns for 3NF compliance
ALTER TABLE meals
    ADD COLUMN IF NOT EXISTS raw_score INTEGER,
    ADD COLUMN IF NOT EXISTS food_type_id INTEGER REFERENCES food_types(id),
    ADD COLUMN IF NOT EXISTS bonus_window_id UUID REFERENCES bonus_windows(id),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Create function to parse food type from existing analysis
CREATE OR REPLACE FUNCTION detect_food_type_from_analysis(analysis_text TEXT)
RETURNS INTEGER AS $$
DECLARE
    food_type_id INTEGER;
BEGIN
    -- Default to 'other' if can't determine
    SELECT id INTO food_type_id FROM food_types WHERE type_name = 'other';

    -- Check analysis text for food type indicators
    IF analysis_text IS NOT NULL THEN
        IF analysis_text ILIKE '%instant noodle%' OR analysis_text ILIKE '%ramen%' OR analysis_text ILIKE '%cup noodle%' THEN
            SELECT id INTO food_type_id FROM food_types WHERE type_name = 'instant_noodles';
        ELSIF analysis_text ILIKE '%snack%' OR analysis_text ILIKE '%dessert%' OR analysis_text ILIKE '%chip%' THEN
            SELECT id INTO food_type_id FROM food_types WHERE type_name = 'snack';
        ELSIF analysis_text ILIKE '%meal%' OR analysis_text ILIKE '%main%' OR analysis_text ILIKE '%dish%' THEN
            SELECT id INTO food_type_id FROM food_types WHERE type_name = 'main_course';
        END IF;
    END IF;

    RETURN food_type_id;
END;
$$ LANGUAGE plpgsql;

-- Migrate existing data
-- First, clamp existing scores to 0-100 range (they might have bonus multipliers applied)
UPDATE meals
SET
    raw_score = GREATEST(0, LEAST(100, score)), -- Clamp to valid range
    food_type_id = detect_food_type_from_analysis(analysis),
    updated_at = created_at
WHERE raw_score IS NULL;

-- Set default food_type for any NULLs (shouldn't happen but safety)
UPDATE meals
SET food_type_id = (SELECT id FROM food_types WHERE type_name = 'other')
WHERE food_type_id IS NULL;

-- Make food_type_id NOT NULL after migration
ALTER TABLE meals
    ALTER COLUMN food_type_id SET NOT NULL;

-- Add check constraint for raw_score (after data is cleaned)
ALTER TABLE meals
    ADD CONSTRAINT valid_raw_score CHECK (raw_score >= 0 AND raw_score <= 100);

-- Rename old columns for clarity
ALTER TABLE meals
    RENAME COLUMN image_before TO image_before_url;

ALTER TABLE meals
    RENAME COLUMN image_after TO image_after_url;

-- =====================================================
-- STEP 3: Create Indexes for Performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_meals_user_id ON meals(user_id);
CREATE INDEX IF NOT EXISTS idx_meals_created_at ON meals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_meals_food_type ON meals(food_type_id);
CREATE INDEX IF NOT EXISTS idx_meals_bonus_window ON meals(bonus_window_id);
CREATE INDEX IF NOT EXISTS idx_bonus_windows_date ON bonus_windows(window_date);

-- =====================================================
-- STEP 4: Update profiles Table (Must be before views)
-- =====================================================

-- Add missing columns if not exist (needed for views)
ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS avatar_url TEXT,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Note: total_meals and total_score columns should eventually be removed
-- If you want to strictly enforce 3NF, uncomment:
-- ALTER TABLE profiles DROP COLUMN IF EXISTS total_meals;
-- ALTER TABLE profiles DROP COLUMN IF EXISTS total_score;

-- =====================================================
-- STEP 5: Create Views for Derived Data (3NF Compliance)
-- =====================================================

-- meal_scores: Calculates final scores from normalized data
-- Replaces derived 'score' column that violated 3NF
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

    -- Calculate final score:
    -- 1. Apply max cap to raw_score (for snacks)
    -- 2. Apply food type multiplier (noodles ÷ 2)
    -- 3. Apply bonus multiplier if applicable
    ROUND(
        LEAST(m.raw_score, COALESCE(ft.max_score_cap, m.raw_score))::DECIMAL
        * ft.score_multiplier
        * COALESCE(bw.multiplier, 1.0)
    )::INTEGER AS final_score

FROM meals m
JOIN food_types ft ON m.food_type_id = ft.id
LEFT JOIN bonus_windows bw ON m.bonus_window_id = bw.id;

-- =====================================================
-- STEP 5: Create Views for Derived Data (3NF Compliance)
-- =====================================================

-- user_stats: Aggregated user statistics
-- Replaces derived columns in profiles table
CREATE OR REPLACE VIEW user_stats AS
SELECT
    p.id AS user_id,
    p.username,
    p.avatar_url,
    p.created_at AS profile_created_at,

    -- Aggregate stats
    COUNT(m.id) AS total_meals,
    COALESCE(SUM(ms.final_score), 0)::INTEGER AS total_score,
    COALESCE(AVG(ms.final_score), 0)::DECIMAL(10,2) AS avg_score,
    MAX(m.created_at) AS last_meal_at

FROM profiles p
LEFT JOIN meals m ON m.user_id = p.id
LEFT JOIN meal_scores ms ON ms.meal_id = m.id
GROUP BY p.id, p.username, p.avatar_url, p.created_at;

-- leaderboard: Ready-to-use leaderboard view
CREATE OR REPLACE VIEW leaderboard AS
SELECT
    user_id,
    username,
    total_meals,
    total_score,
    RANK() OVER (ORDER BY total_score DESC) AS rank
FROM user_stats
ORDER BY total_score DESC;

-- =====================================================
-- STEP 6: Create Helper Functions
-- =====================================================

-- Function to get or create today's bonus windows
CREATE OR REPLACE FUNCTION generate_daily_bonus_windows(
    target_date DATE DEFAULT CURRENT_DATE
)
RETURNS SETOF bonus_windows AS $$
DECLARE
    periods TEXT[] := ARRAY['breakfast', 'lunch', 'dinner'];
    p TEXT;
    start_time TIME;
    end_time TIME;
    random_start TIMESTAMP;
BEGIN
    FOREACH p IN ARRAY periods
    LOOP
        -- Skip if already exists
        IF EXISTS (
            SELECT 1 FROM bonus_windows
            WHERE window_date = target_date AND meal_period = p
        ) THEN
            CONTINUE;
        END IF;

        -- Define periods (adjust as needed)
        CASE p
            WHEN 'breakfast' THEN
                start_time := '07:00:00';
                end_time := '10:00:00';
            WHEN 'lunch' THEN
                start_time := '12:00:00';
                end_time := '14:00:00';
            WHEN 'dinner' THEN
                start_time := '18:00:00';
                end_time := '21:00:00';
        END CASE;

        -- Generate random 30-minute window
        random_start := target_date + start_time +
            (random() * (EXTRACT(EPOCH FROM (end_time - start_time - INTERVAL '30 minutes')) / 60) || ' minutes')::INTERVAL;

        RETURN QUERY INSERT INTO bonus_windows (window_date, meal_period, window_start, window_end)
        VALUES (
            target_date,
            p,
            random_start,
            random_start + INTERVAL '30 minutes'
        )
        ON CONFLICT (window_date, meal_period) DO NOTHING
        RETURNING *;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to get current active bonus window
CREATE OR REPLACE FUNCTION get_active_bonus_window()
RETURNS bonus_windows AS $$
DECLARE
    result bonus_windows;
BEGIN
    -- Ensure windows exist for today
    PERFORM generate_daily_bonus_windows(CURRENT_DATE);

    SELECT * INTO result
    FROM bonus_windows
    WHERE window_date = CURRENT_DATE
      AND window_start <= NOW()
      AND window_end > NOW()
    LIMIT 1;

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to update timestamps automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_meals_updated_at ON meals;
CREATE TRIGGER update_meals_updated_at
    BEFORE UPDATE ON meals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- STEP 7: Grant Permissions (if using RLS)
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE food_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE bonus_windows ENABLE ROW LEVEL SECURITY;

-- Everyone can read food types
CREATE POLICY "Food types are viewable by everyone"
    ON food_types FOR SELECT
    USING (true);

-- Everyone can read bonus windows
CREATE POLICY "Bonus windows are viewable by everyone"
    ON bonus_windows FOR SELECT
    USING (true);

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Verification queries (uncomment to test):
-- SELECT * FROM food_types;
-- SELECT * FROM meal_scores LIMIT 5;
-- SELECT * FROM user_stats;
-- SELECT * FROM leaderboard;
-- SELECT * FROM get_active_bonus_window();
