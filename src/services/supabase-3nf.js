import { createClient } from '@supabase/supabase-js'
import { compressImageSimple } from '../utils/imageCompression.js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ MISSING SUPABASE CREDENTIALS!')
    console.error('supabaseUrl:', supabaseUrl)
    console.error('supabaseAnonKey:', supabaseAnonKey ? 'EXISTS' : 'MISSING')
    alert('Deployment Error: Missing Supabase environment variables. Check Vercel settings.')
}

export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder')

/**
 * FOOD TYPES - 3NF Lookup Table Operations
 * Food type rules are now data-driven instead of hardcoded
 */

const FOOD_TYPE_MAP = {
    'main_course': 1,
    'instant_noodles': 2,
    'snack': 3,
    'other': 4
}

/**
 * Get food type ID from AI classification string
 * Maps AI output to database foreign key
 * @param {string} aiFoodType - 'main_course', 'non_main_course', 'instant_noodles', etc.
 * @returns {number} food_type_id for database
 */
export function getFoodTypeId(aiFoodType) {
    // Map AI classifications to database food types
    const mapping = {
        'main_course': FOOD_TYPE_MAP.main_course,
        'instant_noodles': FOOD_TYPE_MAP.instant_noodles,
        'non_main_course': FOOD_TYPE_MAP.snack,
        'snack': FOOD_TYPE_MAP.snack
    }

    return mapping[aiFoodType] || FOOD_TYPE_MAP.other
}

/**
 * Fetch all food types (for admin/debugging)
 * @returns {Promise<Array>} Food type rules
 */
export async function fetchFoodTypes() {
    const { data, error } = await supabase
        .from('food_types')
        .select('*')
        .order('id')

    if (error) {
        console.error('Error fetching food types:', error)
        return []
    }

    return data
}

/**
 * BONUS WINDOWS - 3NF Lookup Table Operations
 * Bonus windows are now stored in database instead of localStorage
 */

/**
 * Get or generate today's bonus windows
 * Calls database function to ensure windows exist
 * @returns {Promise<Array>} Today's bonus windows
 */
export async function getOrCreateBonusWindows() {
    const { data, error } = await supabase
        .rpc('generate_daily_bonus_windows')

    if (error) {
        console.error('Error generating bonus windows:', error)
        return []
    }

    return data || []
}

/**
 * Get currently active bonus window
 * @returns {Promise<Object|null>} Active bonus window or null
 */
export async function getActiveBonusWindow() {
    // Ensure windows exist for today
    await getOrCreateBonusWindows()

    const { data, error } = await supabase
        .from('bonus_windows')
        .select('*')
        .eq('window_date', new Date().toISOString().split('T')[0])
        .lte('window_start', new Date().toISOString())
        .gte('window_end', new Date().toISOString())
        .maybeSingle()

    if (error) {
        console.error('Error fetching active bonus window:', error)
        return null
    }

    return data
}

/**
 * Check if currently in bonus time
 * @returns {Promise<{isBonus: boolean, window: Object|null}>}
 */
export async function isCurrentlyBonusTime() {
    const window = await getActiveBonusWindow()
    return {
        isBonus: !!window,
        window: window
    }
}

/**
 * IMAGE UPLOAD - Unchanged from original
 */

/**
 * Uploads a file to the 'meal-images' bucket.
 * @param {File} file
 * @returns {Promise<string|null>} Public URL of the uploaded file or null on error
 */
export async function uploadMealImage(file) {
    try {
        const compressedBlob = await compressImageSimple(file, {
            maxWidth: 1920,
            maxHeight: 1080,
            initialQuality: 0.8,
            targetSize: 1024 * 1024
        })

        const fileExt = 'jpg'
        const fileName = `${Math.random()}.${fileExt}`
        const compressedFile = new File([compressedBlob], fileName, { type: 'image/jpeg' })
        const filePath = `${fileName}`

        const { data, error } = await supabase.storage
            .from('meal-images')
            .upload(filePath, compressedFile)

        if (error) throw error

        const { data: { publicUrl } } = supabase.storage
            .from('meal-images')
            .getPublicUrl(filePath)

        return publicUrl
    } catch (error) {
        console.error('Error uploading image:', error.message)
        return null
    }
}

/**
 * MEAL OPERATIONS - 3NF Compliant
 */

/**
 * Inserts a new meal record (3NF version)
 * Stores raw_score and foreign keys instead of derived final_score
 *
 * @param {Object} mealData
 * @param {string} mealData.image_before_url - URL of before image
 * @param {string} mealData.image_after_url - URL of after image
 * @param {number} mealData.raw_score - AI score 0-100 (before multipliers)
 * @param {string} mealData.foodType - 'main_course', 'instant_noodles', 'snack'
 * @param {string} mealData.analysis - AI commentary
 * @returns {Promise<Object>} Created meal with final_score from view
 */
export async function saveMeal(mealData) {
    const { data: { user } } = await supabase.auth.getUser()
    const userId = user ? user.id : null

    // Ensure profile exists
    if (user && user.email) {
        try {
            const username = user.email.split('@')[0]
            await supabase.from('profiles').upsert(
                { id: userId, username: username },
                { onConflict: 'id' }
            )
        } catch (error) {
            console.log('Profile upsert skipped:', error.message)
        }
    }

    // Get food type ID (foreign key)
    const foodTypeId = getFoodTypeId(mealData.foodType)

    // Get active bonus window ID (foreign key) if in bonus time
    const bonusWindow = await getActiveBonusWindow()
    const bonusWindowId = bonusWindow ? bonusWindow.id : null

    // Insert normalized meal data (no derived values)
    const { data, error } = await supabase
        .from('meals')
        .insert([{
            user_id: userId,
            image_before_url: mealData.image_before_url,
            image_after_url: mealData.image_after_url,
            raw_score: mealData.raw_score,
            food_type_id: foodTypeId,
            bonus_window_id: bonusWindowId,
            analysis: mealData.analysis
        }])
        .select()

    if (error) throw error

    // Fetch the complete meal data from view to get final_score
    const { data: mealWithScore } = await supabase
        .from('meal_scores')
        .select('*')
        .eq('meal_id', data[0].id)
        .single()

    return mealWithScore
}

/**
 * Fetches meals with calculated scores from view
 * Uses meal_scores view instead of calculating in application
 *
 * @param {number} limit - Number of meals to fetch (default: 20)
 * @returns {Promise<Array>} Meals with final_score calculated by database
 */
export async function fetchMeals(limit = 20) {
    const { data, error } = await supabase
        .from('meal_scores')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)

    if (error) {
        console.error('Error fetching meals:', error)
        return []
    }

    return data || []
}

/**
 * Fetches meals for a specific user
 * @param {string} userId
 * @param {number} limit
 * @returns {Promise<Array>}
 */
export async function fetchUserMeals(userId, limit = 20) {
    const { data, error } = await supabase
        .from('meal_scores')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)

    if (error) {
        console.error('Error fetching user meals:', error)
        return []
    }

    return data || []
}

/**
 * LEADERBOARD - Uses 3NF Views
 */

/**
 * Fetches the leaderboard from user_stats view
 * Database handles aggregation instead of application code
 *
 * @returns {Promise<Array>} Leaderboard with rankings and tier info
 */
export async function fetchLeaderboard() {
    const { data, error } = await supabase
        .from('leaderboard')
        .select('*')

    if (error) {
        console.error('Error fetching leaderboard:', error)
        return []
    }

    // Format with tier info
    return (data || []).map(entry => ({
        id: entry.user_id,
        username: entry.username || 'Unknown',
        // Tier info
        tier: entry.tier || 0,
        tierName: entry.tier_name || 'Starter',
        tierMultiplier: parseFloat(entry.tier_multiplier) || 1.0,
        // Scores
        totalScore: entry.total_score,
        cycleScore: entry.cycle_score,
        totalMeals: entry.total_meals,
        // Progress
        tierProgress: entry.tier_progress || 0,
        pointsToNextTier: entry.points_to_next_tier || 0,
        rank: entry.rank
    }))
}

/**
 * Fetches detailed user statistics
 * @returns {Promise<Array>} User stats with aggregated data
 */
export async function fetchUserStats() {
    const { data, error } = await supabase
        .from('user_stats')
        .select('*')
        .order('total_score', { ascending: false })

    if (error) {
        console.error('Error fetching user stats:', error)
        return []
    }

    return data || []
}

/**
 * PROFILE OPERATIONS
 */

/**
 * Update user profile
 * @param {string} userId
 * @param {Object} updates - { username, avatar_url }
 * @returns {Promise<Object>}
 */
export async function updateProfile(userId, updates) {
    const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()

    if (error) throw error
    return data ? data[0] : null
}

/**
 * Fetch user profile
 * @param {string} userId
 * @returns {Promise<Object|null>}
 */
export async function fetchProfile(userId) {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

    if (error) {
        console.error('Error fetching profile:', error)
        return null
    }

    return data
}

/**
 * ADMIN OPERATIONS (for managing food types)
 */

/**
 * Update food type rules (admin only)
 * @param {number} foodTypeId
 * @param {Object} updates - { score_multiplier, max_score_cap, description }
 * @returns {Promise<Object>}
 */
export async function updateFoodType(foodTypeId, updates) {
    const { data, error } = await supabase
        .from('food_types')
        .update(updates)
        .eq('id', foodTypeId)
        .select()

    if (error) throw error
    return data ? data[0] : null
}

/**
 * TIER SYSTEM OPERATIONS
 */

/**
 * Check if user can tier up and apply if so
 * @param {string} userId
 * @returns {Promise<Object>} { tieredUp, oldTier, newTier, tierName }
 */
export async function checkTierUp(userId) {
    const { data, error } = await supabase
        .rpc('check_tier_up', { p_user_id: userId })

    if (error) {
        console.error('Error checking tier up:', error)
        return { tieredUp: false, oldTier: 0, newTier: 0, tierName: 'Starter' }
    }

    if (data && data.length > 0) {
        return {
            tieredUp: data[0].tiered_up,
            oldTier: data[0].old_tier,
            newTier: data[0].new_tier,
            tierName: data[0].tier_name
        }
    }

    return { tieredUp: false, oldTier: 0, newTier: 0, tierName: 'Starter' }
}

/**
 * Fetch tier configuration table
 * @returns {Promise<Array>} All tier levels with requirements
 */
export async function fetchTierConfig() {
    const { data, error } = await supabase
        .from('tier_config')
        .select('*')
        .order('tier')

    if (error) {
        console.error('Error fetching tier config:', error)
        return []
    }

    return data || []
}

/**
 * Get current user's tier info
 * @param {string} userId
 * @returns {Promise<Object>} User tier stats
 */
export async function getUserTierInfo(userId) {
    const { data, error } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', userId)
        .single()

    if (error) {
        console.error('Error fetching user tier info:', error)
        return null
    }

    return {
        tier: data.tier || 0,
        tierName: data.tier_name || 'Starter',
        tierMultiplier: parseFloat(data.tier_multiplier) || 1.0,
        totalScore: data.total_score || 0,
        cycleScore: data.cycle_score || 0,
        tierProgress: data.tier_progress || 0,
        pointsToNextTier: data.points_to_next_tier || 0,
        nextTier: data.next_tier,
        nextTierName: data.next_tier_name
    }
}
