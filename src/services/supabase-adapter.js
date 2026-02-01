/**
 * Backward Compatibility Adapter for 3NF Migration
 *
 * This adapter provides the same API as the original supabase.js
 * but uses the new 3NF schema internally.
 *
 * Use this during transition to avoid changing all components at once.
 *
 * After migration is complete, update components to use supabase-3nf.js directly
 * for better performance and access to new features.
 */

import {
    supabase,
    uploadMealImage,
    saveMeal as saveMeal3NF,
    fetchMeals as fetchMeals3NF,
    fetchLeaderboard as fetchLeaderboard3NF,
    fetchProfile,
    updateProfile,
    isCurrentlyBonusTime
} from './supabase-3nf.js'

// Re-export supabase client
export { supabase, uploadMealImage }

/**
 * Save meal with backward-compatible API
 *
 * Old API: saveMeal({ image_before, image_after, score, analysis })
 * New API: saveMeal({ image_before_url, image_after_url, raw_score, foodType, analysis })
 *
 * This adapter accepts both formats and converts as needed.
 */
export async function saveMeal(mealData) {
    // Detect which API format is being used
    const isLegacyFormat = 'score' in mealData && !('raw_score' in mealData)

    if (isLegacyFormat) {
        console.warn('Deprecated: Using legacy meal save format. Update to use raw_score and foodType.')

        // Try to detect food type from analysis (best effort)
        const analysis = mealData.analysis || ''
        let foodType = 'other'

        if (analysis.toLowerCase().includes('instant') || analysis.toLowerCase().includes('noodle')) {
            foodType = 'instant_noodles'
        } else if (analysis.toLowerCase().includes('snack') || analysis.toLowerCase().includes('dessert')) {
            foodType = 'snack'
        } else if (analysis.toLowerCase().includes('main') || analysis.toLowerCase().includes('meal')) {
            foodType = 'main_course'
        }

        // Convert legacy format to 3NF format
        const convertedData = {
            image_before_url: mealData.image_before,
            image_after_url: mealData.image_after,
            raw_score: mealData.score, // Legacy stored final score, but we'll use it as raw
            foodType: foodType,
            analysis: mealData.analysis
        }

        const result = await saveMeal3NF(convertedData)

        // Return in legacy format
        return {
            id: result.meal_id,
            user_id: result.user_id,
            image_before: result.image_before_url,
            image_after: result.image_after_url,
            score: result.final_score, // Map final_score back to score
            analysis: result.analysis,
            created_at: result.created_at
        }
    }

    // New format - pass through directly
    const result = await saveMeal3NF(mealData)

    // Return in legacy format for backward compatibility
    return {
        id: result.meal_id,
        user_id: result.user_id,
        image_before: result.image_before_url,
        image_after: result.image_after_url,
        score: result.final_score,
        analysis: result.analysis,
        created_at: result.created_at
    }
}

/**
 * Fetch meals with backward-compatible output format
 *
 * Old format: [{ id, user_id, image_before, image_after, score, analysis, created_at }]
 * New format: [{ meal_id, user_id, image_before_url, image_after_url, final_score, ... }]
 */
export async function fetchMeals() {
    const meals = await fetchMeals3NF()

    // Map to legacy format
    return meals.map(meal => ({
        id: meal.meal_id,
        user_id: meal.user_id,
        image_before: meal.image_before_url,
        image_after: meal.image_after_url,
        score: meal.final_score,
        analysis: meal.analysis,
        created_at: meal.created_at,
        // New fields (won't break old code but available for new)
        raw_score: meal.raw_score,
        food_type: meal.food_type,
        bonus_multiplier: meal.bonus_multiplier,
        food_multiplier: meal.food_multiplier
    }))
}

/**
 * Fetch leaderboard with backward-compatible output format
 *
 * Old format: [{ id, username, totalScore }]
 * New format: [{ user_id, username, total_score, total_meals, rank }]
 */
export async function fetchLeaderboard() {
    const leaderboard = await fetchLeaderboard3NF()

    // Already mapped to legacy format in 3nf version
    return leaderboard
}

/**
 * Check if currently in bonus time (backward compatible)
 *
 * Old format: { isBonus: boolean, window: { mealType, label, start, end } }
 * New format: Same (no change needed)
 */
export async function checkBonusTime() {
    return isCurrentlyBonusTime()
}

/**
 * Re-export profile functions (no API change)
 */
export { fetchProfile, updateProfile }

/**
 * Migration helper: Check database schema version
 */
export async function checkSchemaVersion() {
    try {
        // Check if 3NF tables exist
        const { data: foodTypes } = await supabase
            .from('food_types')
            .select('count')
            .limit(1)

        const has3NF = foodTypes !== null

        // Check meals table columns
        const { data: mealColumns } = await supabase
            .rpc('get_table_columns', { table_name: 'meals' })

        const hasRawScore = mealColumns?.some(col => col.column_name === 'raw_score')

        return {
            is3NF: has3NF && hasRawScore,
            hasFoodTypes: has3NF,
            hasRawScoreColumn: hasRawScore
        }
    } catch (error) {
        console.error('Error checking schema version:', error)
        return { is3NF: false, error: error.message }
    }
}
