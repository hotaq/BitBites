import { GoogleGenerativeAI } from '@google/generative-ai'

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const genAI = new GoogleGenerativeAI(API_KEY)
const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' })

/**
 * Analyzes a meal photo to identify content.
 * @param {File} imageFile - The image file to analyze.
 * @returns {Promise<string>} - The analysis text.
 */
export async function analyzeMeal(imageFile) {
    try {
        const imageData = await fileToGenerativePart(imageFile)
        const prompt = "Analyze this meal. Describe what you see in a short, fun, 8--bit style description. Keep it under 50 words."

        const result = await model.generateContent([prompt, imageData])
        return result.response.text()
    } catch (error) {
        console.error("Error analyzing meal:", error)
        throw error
    }
}

/**
 * Compares before and after photos to calculate a score.
 * @param {File} beforeImage - The full meal image.
 * @param {File} afterImage - The empty plate image.
 * @returns {Promise<{score: number, commentary: string}>}
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
         - Main Course: Rice dishes, pasta (not instant), steak, chicken, fish, curry, stir-fry, etc.
         - Non-Main Course: Snacks, desserts, drinks, appetizers, fruits, small bites
         - Instant Noodles: Cup noodles, ramen packets, instant noodles (any brand)
      
      3. If they ARE the same meal, estimate what percentage of the food was consumed.
      
      4. Award a Score from 0 to 100 based on food type:
      
         FOR MAIN COURSES:
         - 90-100: Plate is clean or nearly clean (great job!)
         - 70-89: Most of the food is gone
         - 50-69: About half eaten
         - 30-49: Only a few bites taken
         - 0-29: Barely touched
         
         FOR NON-MAIN COURSES (Snacks, Desserts, Drinks, Appetizers):
         - Be more lenient! These are smaller portions and treats.
         - 80-100: Finished or mostly finished
         - 60-79: Good portion consumed
         - 40-59: About half eaten
         - 20-39: A few bites/sips taken
         - 0-19: Barely touched
         
         FOR INSTANT NOODLES:
         - Calculate the score normally first, then DIVIDE BY 2
         - Note: Instant noodles get half credit because they're quick and easy!
      
      5. Write a witty, romantic, retro-gaming style commentary (max 2 sentences).
         - For instant noodles, mention that it's a "quick power-up" or similar gaming reference
         - For non-main courses, keep it light and playful
      
      Return JSON format: { "score": NUMBER, "commentary": "STRING", "foodType": "main_course|non_main_course|instant_noodles" }
    `

        const result = await model.generateContent([prompt, beforeData, afterData])
        const responseText = result.response.text()

        // Clean up markdown code blocks if present to parse JSON
        const jsonStr = responseText.replace(/```json|```/g, '').trim()
        return JSON.parse(jsonStr)

    } catch (error) {
        console.error("Error scoring meal:", error)
        throw error
    }
}

// Helper to convert File to Base64 for Gemini
async function fileToGenerativePart(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64Data = reader.result.split(',')[1];
            resolve({
                inlineData: {
                    data: base64Data,
                    mimeType: file.type
                }
            });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}
