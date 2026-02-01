# BitBites 3NF Database Migration Guide

## Overview

This migration transitions the BitBites database from **2NF to 3NF** by:
- Creating lookup tables for scoring rules (`food_types`)
- Creating lookup tables for bonus windows (`bonus_windows`)
- Removing derived data from `meals` and `profiles` tables
- Creating database views for calculated values

## Migration Steps

### 1. Run SQL Migration

Execute the SQL migration file in your Supabase SQL Editor:

```bash
# File: migrations/001_3nf_schema.sql
```

This will:
- Create `food_types` table with scoring rules
- Create `bonus_windows` table for bonus time tracking
- Add new columns to `meals` table
- Migrate existing data
- Create views: `meal_scores`, `user_stats`, `leaderboard`
- Create helper functions

### 2. Verify Migration

Run these queries in Supabase SQL Editor to verify:

```sql
-- Check food types were created
SELECT * FROM food_types;

-- Check meals have food_type_id
SELECT id, raw_score, food_type_id, bonus_window_id
FROM meals
LIMIT 5;

-- Check views work
SELECT * FROM meal_scores LIMIT 5;
SELECT * FROM user_stats;
SELECT * FROM leaderboard;
```

### 3. Update Application Code

#### Option A: Full Migration (Recommended)

Replace your service files with the 3NF versions:

```bash
# Backup old files
cp src/services/supabase.js src/services/supabase-legacy.js
cp src/services/ai.js src/services/ai-legacy.js

# Use new 3NF versions
cp src/services/supabase-3nf.js src/services/supabase.js
cp src/services/ai-3nf.js src/services/ai.js
```

Update your components to use the new API:

**Before:**
```javascript
import { saveMeal, fetchLeaderboard } from './services/supabase.js'
import { calculateMealScore } from './services/ai.js'

// AI calculated final score
const { score, commentary, foodType } = await calculateMealScore(before, after)

// Stored final score directly
await saveMeal({
  image_before: url1,
  image_after: url2,
  score,
  analysis: commentary
})

// Leaderboard calculated in JS
const leaderboard = await fetchLeaderboard()
```

**After:**
```javascript
import { saveMeal, fetchLeaderboard } from './services/supabase.js'
import { calculateMealScore } from './services/ai.js'

// AI returns raw score only
const { rawScore, foodType, commentary } = await calculateMealScore(before, after)

// Database calculates final score via views
const meal = await saveMeal({
  image_before_url: url1,
  image_after_url: url2,
  raw_score: rawScore,
  foodType,
  analysis: commentary
})

// Returns meal with final_score from database view
console.log(meal.final_score) // Fully calculated

// Leaderboard from database view
const leaderboard = await fetchLeaderboard()
```

#### Option B: Backward Compatibility Adapter

Use the compatibility adapter to keep existing component code:

```bash
# Use adapter instead
cp src/services/supabase-adapter.js src/services/supabase.js
```

See `src/services/supabase-adapter.js` for details.

### 4. Update Components

#### MealTracker.jsx Changes

**Before:**
```javascript
const handleComplete = async () => {
  const result = await calculateMealScore(beforeImage, afterImage)
  const meal = await saveMeal({
    image_before: beforeUrl,
    image_after: afterUrl,
    score: result.score,
    analysis: result.commentary
  })
  setScore(result.score)
}
```

**After:**
```javascript
const handleComplete = async () => {
  const result = await calculateMealScore(beforeImage, afterImage)
  const meal = await saveMeal({
    image_before_url: beforeUrl,
    image_after_url: afterUrl,
    raw_score: result.rawScore,
    foodType: result.foodType,
    analysis: result.commentary
  })
  setScore(meal.final_score) // From database view
}
```

#### Leaderboard.jsx Changes

**Before:**
```javascript
const data = await fetchLeaderboard()
// Returns: [{ id, username, totalScore }]
```

**After:**
```javascript
const data = await fetchLeaderboard()
// Returns: [{ id, username, totalScore, totalMeals, rank }]
```

### 5. Environment Variables

No changes required. Existing `.env.local` works:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GEMINI_API_KEY=your_gemini_api_key
```

### 6. Test Migration

Run through these test scenarios:

1. **Upload a meal during normal time**
   - Verify raw_score is stored
   - Verify final_score is calculated correctly
   - Check food_type_id is set

2. **Upload a meal during bonus time**
   - Verify bonus_window_id is set
   - Verify final_score includes bonus multiplier

3. **Upload instant noodles**
   - Verify score is halved in final_score

4. **Upload a snack**
   - Verify max 70 points cap is applied

5. **Check leaderboard**
   - Verify rankings are correct
   - Verify totals match sum of final_scores

### 7. Rollback Plan (if needed)

If issues occur, you can rollback:

```sql
-- Restore original column names
ALTER TABLE meals RENAME COLUMN image_before_url TO image_before;
ALTER TABLE meals RENAME COLUMN image_after_url TO image_after;

-- Drop new columns (data will be lost)
ALTER TABLE meals DROP COLUMN raw_score;
ALTER TABLE meals DROP COLUMN food_type_id;
ALTER TABLE meals DROP COLUMN bonus_window_id;
ALTER TABLE meals DROP COLUMN updated_at;

-- Drop views
DROP VIEW IF EXISTS leaderboard;
DROP VIEW IF EXISTS user_stats;
DROP VIEW IF EXISTS meal_scores;

-- Restore score column if needed
ALTER TABLE meals ADD COLUMN score INTEGER;

-- Drop new tables
DROP TABLE IF EXISTS bonus_windows;
DROP TABLE IF EXISTS food_types;
```

Then restore the original JS files from backups.

## Post-Migration Checklist

- [ ] All meals display with correct final scores
- [ ] Leaderboard shows correct rankings
- [ ] Bonus time detection works
- [ ] Food type multipliers apply correctly
- [ ] New meals are created with all foreign keys
- [ ] No console errors in application

## Troubleshooting

### Issue: "food_type_id violates not-null constraint"

**Cause:** `getFoodTypeId()` returned undefined

**Fix:** Check AI is returning valid foodType values

### Issue: "relation 'meal_scores' does not exist"

**Cause:** Migration didn't run or views weren't created

**Fix:** Re-run the SQL migration

### Issue: Scores seem wrong

**Cause:** Check the view calculation:
```sql
SELECT
  m.id,
  m.raw_score,
  ft.type_name,
  ft.score_multiplier,
  ft.max_score_cap,
  bw.multiplier as bonus_multiplier,
  ms.final_score
FROM meals m
JOIN food_types ft ON m.food_type_id = ft.id
LEFT JOIN bonus_windows bw ON m.bonus_window_id = bw.id
JOIN meal_scores ms ON ms.meal_id = m.id
WHERE m.id = 'your-meal-id';
```

## Benefits Achieved

✅ **3NF Compliance:** No transitive dependencies
✅ **Data Integrity:** Scoring rules in database, not code
✅ **Audit Trail:** Complete history of bonus windows applied
✅ **Flexibility:** Change scoring rules without deploying code
✅ **Performance:** Database-optimized views for leaderboard
✅ **Debugging:** Can trace exactly how any score was calculated
