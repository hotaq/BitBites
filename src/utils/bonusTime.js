/**
 * Bonus Time System
 * Generates random 30-minute bonus windows for breakfast, lunch, and dinner.
 * Windows are randomized daily and persist in localStorage.
 */

const BONUS_MULTIPLIER = 1.5;

const MEAL_PERIODS = {
    breakfast: { start: 7, end: 10, label: 'Breakfast Bonus' },
    lunch: { start: 12, end: 14, label: 'Lunch Bonus' },
    dinner: { start: 18, end: 21, label: 'Dinner Bonus' }
};

/**
 * Get today's date string (YYYY-MM-DD) for localStorage key
 */
function getTodayKey() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * Generate a random 30-minute window within a meal period
 * @param {number} startHour - Start hour of meal period (24-hour format)
 * @param {number} endHour - End hour of meal period (24-hour format)
 * @returns {{start: Date, end: Date}} - Start and end times of bonus window
 */
function generateRandomWindow(startHour, endHour) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Calculate total minutes in the period (minus 30 to ensure window fits)
    const periodMinutes = (endHour - startHour) * 60 - 30;

    // Random minute offset from start of period
    const randomOffset = Math.floor(Math.random() * periodMinutes);

    // Create start time
    const start = new Date(today);
    start.setHours(startHour, randomOffset, 0, 0);

    // Create end time (30 minutes later)
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + 30);

    return { start, end };
}

/**
 * Get or generate today's bonus time windows
 * @returns {Object} - Object with breakfast, lunch, dinner windows
 */
export function getBonusTimeWindows() {
    const todayKey = getTodayKey();
    const storageKey = `bonusWindows_${todayKey}`;

    // Check if we already have windows for today
    const stored = localStorage.getItem(storageKey);
    if (stored) {
        const parsed = JSON.parse(stored);
        // Convert string dates back to Date objects
        Object.keys(parsed).forEach(meal => {
            parsed[meal].start = new Date(parsed[meal].start);
            parsed[meal].end = new Date(parsed[meal].end);
        });
        return parsed;
    }

    // Generate new windows for today
    const windows = {
        breakfast: {
            ...generateRandomWindow(MEAL_PERIODS.breakfast.start, MEAL_PERIODS.breakfast.end),
            label: MEAL_PERIODS.breakfast.label
        },
        lunch: {
            ...generateRandomWindow(MEAL_PERIODS.lunch.start, MEAL_PERIODS.lunch.end),
            label: MEAL_PERIODS.lunch.label
        },
        dinner: {
            ...generateRandomWindow(MEAL_PERIODS.dinner.start, MEAL_PERIODS.dinner.end),
            label: MEAL_PERIODS.dinner.label
        }
    };

    // Store for today
    localStorage.setItem(storageKey, JSON.stringify(windows));

    return windows;
}

/**
 * Check if current time is within any bonus window
 * @returns {{isBonus: boolean, window: Object|null}} - Bonus status and active window
 */
export function isCurrentlyBonusTime() {
    const now = new Date();
    const windows = getBonusTimeWindows();

    for (const [mealType, window] of Object.entries(windows)) {
        if (now >= window.start && now <= window.end) {
            return {
                isBonus: true,
                window: {
                    mealType,
                    label: window.label,
                    start: window.start,
                    end: window.end
                }
            };
        }
    }

    return { isBonus: false, window: null };
}

/**
 * Get the active bonus window details (if any)
 * @returns {Object|null} - Active window details or null
 */
export function getActiveBonusWindow() {
    const { isBonus, window } = isCurrentlyBonusTime();
    return isBonus ? window : null;
}

/**
 * Apply bonus multiplier to score if bonus time is active
 * @param {number} score - Original score
 * @param {boolean} isBonusTime - Whether bonus time is active
 * @returns {{finalScore: number, bonusApplied: boolean, originalScore: number}}
 */
export function applyBonusToScore(score, isBonusTime) {
    if (!isBonusTime) {
        return {
            finalScore: score,
            bonusApplied: false,
            originalScore: score
        };
    }

    const finalScore = Math.floor(score * BONUS_MULTIPLIER);

    return {
        finalScore,
        bonusApplied: true,
        originalScore: score,
        multiplier: BONUS_MULTIPLIER
    };
}

/**
 * Get time remaining in current bonus window (in minutes)
 * @returns {number|null} - Minutes remaining or null if no active bonus
 */
export function getTimeRemainingInBonus() {
    const { isBonus, window } = isCurrentlyBonusTime();
    if (!isBonus) return null;

    const now = new Date();
    const remaining = Math.ceil((window.end - now) / 1000 / 60);
    return remaining;
}
