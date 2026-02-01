-- Fix RLS for bonus_windows function
-- The generate_daily_bonus_windows function needs elevated privileges

-- Option 1: Make the function run as SECURITY DEFINER (recommended)
-- This makes the function run with the privileges of the function creator (postgres),
-- bypassing RLS for the insert operation

CREATE OR REPLACE FUNCTION generate_daily_bonus_windows(
    target_date DATE DEFAULT CURRENT_DATE
)
RETURNS SETOF bonus_windows
SECURITY DEFINER  -- Add this to run with postgres privileges
AS $$
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

-- Also fix the get_active_bonus_window function if needed
CREATE OR REPLACE FUNCTION get_active_bonus_window()
RETURNS bonus_windows
SECURITY DEFINER  -- Run with elevated privileges
AS $$
DECLARE
    result bonus_windows;
BEGIN
    -- Ensure windows exist for today (calls the other function)
    PERFORM generate_daily_bonus_windows(CURRENT_DATE);

    SELECT * INTO result
    FROM bonus_windows
    WHERE window_date = CURRENT_DATE
      AND window_start <= NOW()
      AND window_end >= NOW()
    LIMIT 1;

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Alternative: Grant execute permission to public (if not already granted)
GRANT EXECUTE ON FUNCTION generate_daily_bonus_windows(DATE) TO public;
GRANT EXECUTE ON FUNCTION get_active_bonus_window() TO public;

-- Option 2: If SECURITY DEFINER doesn't work, disable RLS for bonus_windows
-- (less secure but simpler for this use case)
-- ALTER TABLE bonus_windows DISABLE ROW LEVEL SECURITY;
