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
      
      2. If they ARE the same meal, estimate what percentage of the food was consumed.
      
      3. Award a Score from 0 to 100:
         - 90-100: Plate is clean or nearly clean (great job!)
         - 70-89: Most of the food is gone
         - 50-69: About half eaten
         - 30-49: Only a few bites taken
         - 0-29: Barely touched
      
      4. Write a witty, romantic, retro-gaming style commentary (max 2 sentences).
      
      Return JSON format: { "score": NUMBER, "commentary": "STRING" }
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
