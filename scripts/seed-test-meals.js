/**
 * Test Data Seeder for BitBites Gallery
 *
 * This script adds 50+ test meals to the database for performance verification.
 * Run with: node scripts/seed-test-meals.js
 *
 * Prerequisites:
 * - Supabase credentials in .env file
 * - User must be logged in or anonymous access must be enabled
 */

/* eslint-disable no-undef -- Node.js globals */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials!');
    console.error('Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Sample meal data for testing
const sampleMeals = [
    { score: 85, analysis: "Great portion control!", image_before: "https://picsum.photos/400/300?random=1", image_after: "https://picsum.photos/400/300?random=2" },
    { score: 92, analysis: "Clean plate club! 🎉", image_before: "https://picsum.photos/400/300?random=3", image_after: "https://picsum.photos/400/300?random=4" },
    { score: 78, analysis: "Good effort, but some leftovers.", image_before: "https://picsum.photos/400/300?random=5", image_after: "https://picsum.photos/400/300?random=6" },
    { score: 95, analysis: "Perfect finish! Amazing!", image_before: "https://picsum.photos/400/300?random=7", image_after: "https://picsum.photos/400/300?random=8" },
    { score: 70, analysis: "Decent try, room for improvement.", image_before: "https://picsum.photos/400/300?random=9", image_after: "https://picsum.photos/400/300?random=10" },
    { score: 88, analysis: "Excellent work! Almost perfect.", image_before: "https://picsum.photos/400/300?random=11", image_after: "https://picsum.photos/400/300?random=12" },
    { score: 82, analysis: "Well done! Good job.", image_before: "https://picsum.photos/400/300?random=13", image_after: "https://picsum.photos/400/300?random=14" },
    { score: 90, analysis: "Fantastic! Keep it up!", image_before: "https://picsum.photos/400/300?random=15", image_after: "https://picsum.photos/400/300?random=16" },
    { score: 75, analysis: "Not bad, could be better.", image_before: "https://picsum.photos/400/300?random=17", image_after: "https://picsum.photos/400/300?random=18" },
    { score: 98, analysis: "Outstanding! Perfect score!", image_before: "https://picsum.photos/400/300?random=19", image_after: "https://picsum.photos/400/300?random=20" },
];

/**
 * Generates random test meal data
 */
function generateRandomMeal(index) {
    const baseMeal = sampleMeals[index % sampleMeals.length];
    // Add variation to scores and images
    return {
        score: Math.min(100, Math.max(50, baseMeal.score + Math.floor(Math.random() * 20 - 10))),
        analysis: baseMeal.analysis,
        image_before: `https://picsum.photos/400/300?random=${index * 2}`,
        image_after: `https://picsum.photos/400/300?random=${index * 2 + 1}`,
    };
}

/**
 * Seeds test meals to the database
 */
async function seedTestMeals(count = 50) {
    console.log(`🌱 Seeding ${count} test meals to database...`);

    try {
        // Get current user (if logged in)
        const { data: { user } } = await supabase.auth.getUser();
        const userId = user ? user.id : null;

        console.log(userId ? `✅ Logged in as: ${user.email}` : '⚠️ No user logged in (anonymous mode)');

        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < count; i++) {
            const mealData = generateRandomMeal(i);

            const { error } = await supabase
                .from('meals')
                .insert([
                    { ...mealData, user_id: userId }
                ]);

            if (error) {
                console.error(`❌ Failed to insert meal ${i + 1}:`, error.message);
                failCount++;
            } else {
                successCount++;
                if ((i + 1) % 10 === 0) {
                    console.log(`✅ Inserted ${i + 1}/${count} meals...`);
                }
            }
        }

        console.log(`\n✨ Seeding complete!`);
        console.log(`✅ Successfully inserted: ${successCount} meals`);
        console.log(`❌ Failed: ${failCount} meals`);

        // Fetch total count
        const { count: totalCount } = await supabase
            .from('meals')
            .select('*', { count: 'exact', head: true });

        console.log(`\n📊 Total meals in database: ${totalCount}`);

    } catch (error) {
        console.error('❌ Error seeding test meals:', error);
        process.exit(1);
    }
}

// Command line interface
const args = process.argv.slice(2);
const countArg = args.find(arg => arg.startsWith('--count='));
const count = countArg ? parseInt(countArg.split('=')[1]) : 50;

console.log('🚀 BitBites Test Data Seeder\n');
seedTestMeals(count);
