/**
 * Sim Racing Manager - Core Logic
 */

// Points system for P1-P25
const POINTS_SYSTEM = {
    1: 50, 2: 47, 3: 44, 4: 41, 5: 38,
    6: 35, 7: 34, 8: 33, 9: 32, 10: 31,
    11: 30, 12: 29, 13: 28, 14: 27, 15: 26,
    16: 25, 17: 24, 18: 23, 19: 22, 20: 21,
    21: 20, 22: 19, 23: 18, 24: 17, 25: 16,
    26: 15, 27: 14, 28: 13, 29: 12, 30: 11,
    31: 10, 32: 9, 33: 8, 34: 7, 35: 6,
    36: 5, 37: 4, 38: 3, 39: 2, 40: 1
};

// Success Ballast (kg)
export const BALLAST_SYSTEM = {
    1: 15, 2: 10, 3: 5, 4: 0, 5: -5, 6: -10, default: -15
};

/**
 * Parse a lap time string "MM:SS.ms" or "SS.ms" to seconds
 * @param {string} timeStr 
 * @returns {number} Time in seconds
 */
export const parseTime = (timeStr) => {
    if (timeStr === undefined || timeStr === null) return Infinity; // DNF/DNS
    if (typeof timeStr === 'number') return timeStr; // Already valid seconds
    if (timeStr === "DNF" || timeStr === "DNS") return Infinity;

    // Handle string inputs
    const str = String(timeStr).trim();
    const parts = str.split(':');

    if (parts.length === 3) {
        // HH:MM:SS.ms
        const h = parseFloat(parts[0]);
        const m = parseFloat(parts[1]);
        const s = parseFloat(parts[2]);
        return (h * 3600) + (m * 60) + s;
    } else if (parts.length === 2) {
        // MM:SS.ms
        const m = parseFloat(parts[0]);
        const s = parseFloat(parts[1]);
        return (m * 60) + s;
    }

    // Just Seconds or unknown
    return parseFloat(str);
};

/**
 * Format seconds back to "MM:SS.ms"
 * @param {number} seconds 
 * @returns {string}
 */
export const formatTime = (seconds) => {
    if (seconds === Infinity) return "DNF";
    const m = Math.floor(seconds / 60);
    const s = (seconds % 60).toFixed(3);
    return `${m}:${s.padStart(6, '0')}`;
};

/**
 * Apply penalties and re-calculate positions
 * @param {Array} results - Array of driver results
 * @param {Array} penalties - Array of { driverId, seconds }
 * @returns {Array} Sorted results with new positions
 */
export const processRaceResults = (results, penalties = []) => {
    // 1. Apply penalties
    const adjustedResults = results.map(driver => {
        const penalty = penalties.find(p => p.driverId === driver.id);
        const penaltyTime = penalty ? penalty.seconds : 0;
        const totalTime = parseTime(driver.totalTime) + penaltyTime;

        return {
            ...driver,
            penaltyTime,
            finalTimeSeconds: totalTime,
            isDnf: driver.totalTime === "DNF" || driver.totalTime === "DNS"
        };
    });

    // 2. Sort by time (separately for each class if needed, but usually overall then filtered)
    // For now, assuming we process one class at a time or sort all.
    // Let's sort all, but we might need to group by class later.
    adjustedResults.sort((a, b) => {
        if (a.isDnf && !b.isDnf) return 1;
        if (!a.isDnf && b.isDnf) return -1;
        return a.finalTimeSeconds - b.finalTimeSeconds;
    });

    // 3. Assign new positions and points
    return adjustedResults.map((driver, index) => {
        const position = index + 1;
        let points = 0;

        if (!driver.isDnf) {
            points = POINTS_SYSTEM[position] || (position > 25 ? 16 : 0); // Fallback logic if > 25? Plan said 16 is min? 
            // Plan: "P6-P25: 35 down to 16". If > 25, assume 0 or 16? 
            // Let's stick to the map for now. If > 25, it's 0 unless specified.
            // Actually plan says "P6-P25: 35 down to 16". 
            // Let's assume > 25 get 0 for now unless clarified.
        }

        return {
            ...driver,
            position,
            points
        };
    });
};

/**
 * Get Ballast Adjustment (Delta)
 * @param {number} position 
 * @param {boolean} isDnf
 * @param {object} rules - The config.rules object
 * @param {string} className 
 * @returns {number} Adjustment value (e.g. +15, -10)
 */
export const getBallastAdjustment = (position, isDnf, isDns, rules = {}, className = "LMGT3") => {
    // 1. None Check
    if (rules.ballastType === 'none') return 0;

    // 2. Determine System
    let adjustments = BALLAST_SYSTEM; // Default Standard

    if (rules.ballastType === 'custom_class' && rules.ballastRules) {
        if (rules.ballastRules[className]) {
            adjustments = rules.ballastRules[className];
        }
    }

    // Check DNS FIRST
    if (isDns) return 0;

    // 3. Return Adjustment
    if (!isDnf && adjustments[position] !== undefined) {
        return adjustments[position];
    }
    return adjustments.default || -15;
};

/**
 * Calculate Ballast for next race
 * @param {number} position 
 * @param {number} currentBallast 
 * @param {boolean} isDnf
 * @param {object} rules - The config.rules object from season file
 * @param {string} className - Optional, for class-specific rules
 * @returns {number} New ballast
 */
export const calculateNextBallast = (position, currentBallast, isDnf, rules = {}, className = "LMGT3") => {
    // 1. None Check
    if (rules.ballastType === 'none') return 0;

    // 2. Determine System to use
    let adjustments = BALLAST_SYSTEM; // Default Standard

    if (rules.ballastType === 'custom_class' && rules.ballastRules) {
        // Look for class specific rules
        if (rules.ballastRules[className]) {
            adjustments = rules.ballastRules[className];
        }
    }

    // 3. Max Ballast Cap
    const MAX_BALLAST = typeof adjustments.max === 'number' ? adjustments.max : 45; // Default 45 if not specified

    // 4. Calculate Adjustment
    let adjustment = adjustments.default || -15; // Default drop

    // DNS Check (Implicit in caller? Or passed as isDnf? Specification says DNS = No Change)
    // Caller usually handles "Did they participate?" logic. 
    // Assuming 'isDnf' here implies they STARTED but failed. 
    // If they didn't start, this function usually isn't called or returns current.

    if (!isDnf && adjustments[position] !== undefined) {
        adjustment = adjustments[position];
    }

    const newBallast = currentBallast + adjustment;
    return Math.max(0, Math.min(MAX_BALLAST, newBallast));
};
