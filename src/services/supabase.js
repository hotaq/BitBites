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
 * Uploads a file to the 'meal-images' bucket.
 * @param {File} file 
 * @returns {Promise<string|null>} Public URL of the uploaded file or null on error
 */
export async function uploadMealImage(file) {
    try {
        // Compress image before upload to reduce file size by 70-80%
        const compressedBlob = await compressImageSimple(file, {
            maxWidth: 1920,
            maxHeight: 1080,
            initialQuality: 0.8,
            targetSize: 1024 * 1024 // 1MB target
        });

        // Create a File object from the compressed blob
        const fileExt = 'jpg'; // Compressed images are always JPEG
        const fileName = `${Math.random()}.${fileExt}`;
        const compressedFile = new File([compressedBlob], fileName, { type: 'image/jpeg' });
        const filePath = `${fileName}`;

        const { data, error } = await supabase.storage
            .from('meal-images')
            .upload(filePath, compressedFile);

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
            .from('meal-images')
            .getPublicUrl(filePath);

        return publicUrl;
    } catch (error) {
        console.error('Error uploading image:', error.message);
        return null;
    }
}

/**
 * Inserts a new meal record.
 * @param {Object} mealData 
 */
export async function saveMeal(mealData) {
    // Ensure we have a user (even anon)
    const { data: { user } } = await supabase.auth.getUser();

    // Allow saving even if no user is logged in (public mode)
    const userId = user ? user.id : null;

    if (user && user.email) {
        try {
            // Auto-create/update profile with username from email (optional)
            const username = user.email.split('@')[0];
            await supabase.from('profiles').upsert({ id: userId, username: username });
        } catch (error) {
            // Profiles table might not exist yet, but that's okay
            console.log('Profile upsert skipped (table may not exist)');
        }
    }

    const { data, error } = await supabase
        .from('meals')
        .insert([
            { ...mealData, user_id: userId }
        ])
        .select();

    if (error) throw error;
    return data ? data[0] : null;
}

/**
 * Fetches the latest meals from the database.
 * @returns {Promise<Array>} Array of meal objects
 */
export async function fetchMeals() {
    const { data, error } = await supabase
        .from('meals')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) {
        console.error('Error fetching meals:', error);
        return [];
    }
    return data;
}

/**
 * Fetches the leaderboard (total scores per user).
 * @returns {Promise<Array>} Array of { userId, totalScore, username }
 */
export async function fetchLeaderboard() {
    // 1. Try to get profiles, but don't fail if table doesn't exist
    let profiles = [];
    try {
        const { data: profileData } = await supabase.from('profiles').select('*');
        profiles = profileData || [];
    } catch (error) {
        console.log('Profiles table not available, using fallback names');
    }

    // 2. Get all scores
    const { data: meals, error } = await supabase
        .from('meals')
        .select('user_id, score');

    if (error || !meals) return [];

    // 3. Aggregate scores
    const leaderboardMap = {};
    meals.forEach(meal => {
        const uid = meal.user_id || 'anonymous';
        if (!leaderboardMap[uid]) {
            leaderboardMap[uid] = 0;
        }
        leaderboardMap[uid] += (meal.score || 0);
    });

    // 4. Transform to array and sort
    const leaderboard = Object.keys(leaderboardMap).map(uid => {
        const userProfile = profiles?.find(p => p.id === uid);
        return {
            id: uid,
            username: userProfile && userProfile.username
                ? userProfile.username
                : (uid === 'anonymous' ? 'Guest' : 'Unknown'),
            totalScore: leaderboardMap[uid]
        };
    }).sort((a, b) => b.totalScore - a.totalScore); // Highest score first

    return leaderboard;
}
