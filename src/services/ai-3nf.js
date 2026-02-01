import { GoogleGenerativeAI } from '@google/generative-ai'
import { compressImageSimple } from '../utils/imageCompression.js'
import { getActiveBonusWindow } from './supabase-3nf.js'

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const genAI = new GoogleGenerativeAI(API_KEY)
const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' })

/**
 * AI Service - 3NF Version
 *
 * Changes from original:
 * - Returns raw_score and foodType (stored in DB)
 * - Bonus detection moved to database layer
 * - Final score calculated by database view, not application code
 */

/**
 * Analyzes a meal photo to identify content.
 * @param {File} imageFile - The image file to analyze.
 * @returns {Promise<string>} - The analysis text.
 */
export async function analyzeMeal(imageFile) {
    try {
        const imageData = await fileToGenerativePart(imageFile)
        const prompt = "Analyze this meal. Describe what you see in a short, fun, 8-bit style description. Keep it under 50 words."

        const result = await model.generateContent([prompt, imageData])
        return result.response.text()
    } catch (error) {
        console.error("Error analyzing meal:", error)
        throw error
    }
}

/**
 * Compares before and after photos to calculate a RAW score.
 *
 * IMPORTANT: This returns the RAW score (0-100) and food classification.
 * The database will calculate the final_score using:
 * - food_types.score_multiplier (for instant noodles)
 * - food_types.max_score_cap (for snacks)
 * - bonus_windows.multiplier (for bonus time)
 *
 * @param {File} beforeImage - The full meal image.
 * @param {File} afterImage - The empty plate image.
 * @returns {Promise<{rawScore: number, foodType: string, commentary: string}>}
 */
export async function calculateMealScore(beforeImage, afterImage) {
    try {
        const beforeData = await fileToGenerativePart(beforeImage)
        const afterData = await fileToGenerativePart(afterImage)

        const prompt = `
      Compare these two images:
      Image 1: The meal BEFORE eating.
      Image 2: The meal AFTER eating.

      Task:
      1. VERIFY: Are these images of the SAME meal? (Check if the food type, plate, and setting match)
         - If they are COMPLETELY DIFFERENT foods (e.g., salmon vs noodles), give a score of 0 and say "Nice try! These aren't the same meal 😏"

      2. IDENTIFY the food type:
         - main_course: Rice dishes, pasta (not instant), steak, chicken, fish, curry, stir-fry, etc.
         - instant_noodles: Cup noodles, ramen packets, instant noodles (any brand)
         - snack: Snacks, desserts, drinks, appetizers, fruits, small bites, chips, candy

      3. If they ARE the same meal, estimate what percentage of the food was consumed.

      4. Award a Score from 0 to 100 based on consumption percentage ONLY (ignore food type penalties for now):
         - 90-100: Plate is clean or nearly clean (great job!)
         - 70-89: Most of the food is gone
         - 50-69: About half eaten
         - 30-49: Only a few bites taken
         - 0-29: Barely touched

      5. Write a witty, romantic, retro-gaming style commentary (max 2 sentences).
         - For instant noodles, mention it's a "quick power-up"
         - For snacks, be playfully harsh: "Go eat real food!" "This gives you no XP!"

      Return JSON format: { "rawScore": NUMBER, "commentary": "STRING", "foodType": "main_course|instant_noodles|snack" }

      IMPORTANT:
      - Return "rawScore" as consumption percentage 0-100 (food type adjustments will be applied by database)
      - Do NOT apply instant noodle penalties or bonus multipliers here
    `

        const result = await model.generateContent([prompt, beforeData, afterData])
        const responseText = result.response.text()

        // Clean up markdown code blocks if present
        const jsonStr = responseText.replace(/```json|```/g, '').trim()
        const parsedResult = JSON.parse(jsonStr)

        // Ensure rawScore is a valid number 0-100
        let rawScore = Math.max(0, Math.min(100, Math.round(parsedResult.rawScore || 0)))

        // Check for active bonus window from database
        const bonusWindow = await getActiveBonusWindow()

        return {
            rawScore: rawScore,
            foodType: parsedResult.foodType || 'other',
            commentary: parsedResult.commentary || 'Good meal!',
            isBonusTime: !!bonusWindow,
            bonusWindow: bonusWindow
        }

    } catch (error) {
        console.error("Error scoring meal:", error)
        throw error
    }
}

// Helper to convert File to Base64 for Gemini
async function fileToGenerativePart(file) {
    const compressedBlob = await compressImageSimple(file, {
        maxWidth: 1920,
        maxHeight: 1080,
        initialQuality: 0.8,
        targetSize: 1024 * 1024
    })

    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => {
            const base64Data = reader.result.split(',')[1]
            resolve({
                inlineData: {
                    data: base64Data,
                    mimeType: 'image/jpeg'
                }
            })
        }
        reader.onerror = reject
        reader.readAsDataURL(compressedBlob)
    })
}
