const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
// Deployed: Jan 3 2026 - Season 3 Update

admin.initializeApp();

const db = admin.firestore();

// Helper: Recursively replace undefined with null for Firestore
const sanitizeForFirestore = (obj) => {
    if (obj === undefined) return null;
    if (obj === null || typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
        return obj.map(sanitizeForFirestore);
    }

    const newObj = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const val = obj[key];
            newObj[key] = (val === undefined) ? null : sanitizeForFirestore(val);
        }
    }
    return newObj;
};

// --- LOGIC START (Ported from logic_verification.js) ---
const BALLAST_SYSTEM = {
    1: 15, 2: 10, 3: 5, 4: 0, 5: -5, 6: -10,
    default: -15
};

function parseTime(timeStr) {
    if (!timeStr) return null;
    if (typeof timeStr === 'number') return timeStr;
    return parseFloat(timeStr);
}

// Helper: Get Ballast Adjustment (Delta)
function getBallastAdjustment(position, isDnf, rules = {}, className = "LMGT3") {
    // 1. None Check
    if (rules.ballastType === 'none') return 0;

    // 2. Determine System
    let adjustments = {
        1: 15, 2: 10, 3: 5, 4: 0, 5: -5, 6: -10,
        default: -15
    };

    if (rules.ballastType === 'custom_class' && rules.ballastRules) {
        if (rules.ballastRules[className]) {
            adjustments = rules.ballastRules[className];
        }
    }

    // 3. Return Adjustment
    if (!isDnf && adjustments[position] !== undefined) {
        return adjustments[position];
    }
    return adjustments.default || -15;
}

function calculateChampionship(seasonData) {
    // console.log("Processing championship data for season:", seasonData.season);

    const data = JSON.parse(JSON.stringify(seasonData));
    const penalties = data.penalties || {};
    const manualPositions = data.manualPositions || {};
    const exclusions = data.exclusions || {};

    // EMERGENCY HOTFIX (Persisted)
    if (data.drivers) {
        data.drivers = data.drivers.filter(d => ![40, 41].includes(d.id));
    }

    const pointsTable = [
        50, 47, 44, 41, 38,
        35, 34, 33, 32, 31, 30, 29, 28, 27, 26, 25, 24, 23, 22, 21, 20, 19, 18, 17, 16
    ];

    // Defensive checks
    if (!data.drivers || !Array.isArray(data.drivers)) {
        console.error('Invalid drivers data:', data.drivers);
        return {
            season: data.season || 'Unknown',
            races: [],
            drivers: [],
            currentRound: 0,
            totalRounds: 0,
            error: 'Invalid drivers data structure'
        };
    }

    if (!data.races || !Array.isArray(data.races)) {
        console.error('Invalid races data:', data.races);
        return {
            season: data.season || 'Unknown',
            races: [],
            drivers: [],
            currentRound: 0,
            totalRounds: 0,
            error: 'Invalid races data structure'
        };
    }

    // Auto-calculate currentRound based on which races have results
    // Find the highest race ID that has at least one driver with results
    const currentRound = data.currentRound || Math.max(
        0,
        ...data.drivers.flatMap(d =>
            (d.raceResults || []).map(r => r.raceId)
        )
    );

    const completedRaces = data.races.filter(r => r.id <= currentRound);

    completedRaces.forEach(race => {
        const processClass = (className) => {
            // 1. Filter Participants
            const participants = data.drivers.filter(d => {
                const r = d.raceResults.find(res => String(res.raceId) === String(race.id));
                if (!r) return false;
                const raceClass = r.drivenClass || d.class;
                return raceClass === className;
            });

            // 2. Prepare Data (Penalties, Times)
            participants.forEach(d => {
                const result = d.raceResults.find(r => String(r.raceId) === String(race.id));
                const penaltyKey = `${race.id}-${d.id}`;
                const penaltyTime = parseFloat(penalties[penaltyKey] || 0);
                const isExcluded = !!exclusions[`${race.id}-${d.id}`];

                const finishTime = parseTime(result.finishTime) || 999999;

                result.laps = Number(result.laps);
                result.originalTime = finishTime;
                result.totalPenalty = penaltyTime;
                result.finalTime = finishTime + penaltyTime;
                result.isExcluded = isExcluded;
            });

            // Helper: Sort Logic
            const sortDrivers = (list, respectExclusions) => {
                return [...list].sort((a, b) => {
                    const rA = a.raceResults.find(r => String(r.raceId) === String(race.id));
                    const rB = b.raceResults.find(r => String(r.raceId) === String(race.id));

                    if (respectExclusions) {
                        if (rA.isExcluded && !rB.isExcluded) return 1;
                        if (!rA.isExcluded && rB.isExcluded) return -1;
                    }

                    if (rA.laps !== rB.laps) return rB.laps - rA.laps;

                    const hasPenaltyA = (rA.totalPenalty || 0) > 0;
                    const hasPenaltyB = (rB.totalPenalty || 0) > 0;
                    const isDnfA = rA.originalTime >= 900000;
                    const isDnfB = rB.originalTime >= 900000;

                    if (isDnfA && isDnfB) {
                        const posA = rA.classPosition || rA.position || 0;
                        const posB = rB.classPosition || rB.position || 0;
                        return posA - posB;
                    }

                    if (!hasPenaltyA && !hasPenaltyB) {
                        const posA = rA.classPosition || rA.position || 0;
                        const posB = rB.classPosition || rB.position || 0;
                        if (posA !== 0 && posB !== 0) return posA - posB;
                    }

                    return rA.finalTime - rB.finalTime;
                });
            };

            // Helper: Apply Manual Positions and get Final Ordered List
            const getOrderedEntries = (sortedParticipants) => {
                const entries = sortedParticipants.map((p, index) => {
                    const key = `${race.id}-${p.id}`;
                    const manPos = manualPositions[key];
                    return {
                        driver: p,
                        result: p.raceResults.find(r => String(r.raceId) === String(race.id)),
                        naturalIndex: index,
                        manualPos: manPos ? parseInt(manPos) : null
                    };
                });

                return entries.sort((a, b) => {
                    const posA = a.manualPos !== null ? a.manualPos : (a.naturalIndex + 1);
                    const posB = b.manualPos !== null ? b.manualPos : (b.naturalIndex + 1);
                    if (posA !== posB) return posA - posB;
                    return a.naturalIndex - b.naturalIndex;
                });
            };

            // PASS 1: Calculate Ballast (Respect Manual Pos, IGNORE Exclusions)
            // This represents "On Truth Finish"
            const ballastSorted = sortDrivers(participants, false); // <--- False = Ignore Exclusions
            const ballastEntries = getOrderedEntries(ballastSorted);
            const ballastMap = {}; // driverId -> ballastChange

            ballastEntries.forEach((entry, i) => {
                const pos = i + 1;
                const { result } = entry;
                // Use Helper with Config
                const rules = data.config && data.config.rules ? data.config.rules : {};
                const isFinished = true; // Race is completed if we're calculating standings
                bChange = getBallastAdjustment(pos, !isFinished, rules, className);
                ballastMap[entry.driver.id] = bChange;
            });

            // PASS 2: Calculate Points (Respect Manual Pos, RESPECT Exclusions)
            // This represents "Official Classification"
            const pointsSorted = sortDrivers(participants, true); // <--- True = Respect Exclusions
            const finalEntries = getOrderedEntries(pointsSorted);

            finalEntries.forEach((entry, i) => {
                const { driver, result } = entry;

                if (result) {
                    result.classPosition = i + 1;
                    result.newPosition = i + 1;

                    if (result.isExcluded) {
                        result.points = 0;
                        result.status = "DSQ";
                    } else if (result.laps && result.laps > 0) {
                        result.points = pointsTable[i] || 0;
                    } else {
                        result.points = 0;
                    }

                    result.manualPosition = entry.manualPos;

                    // APPLY FROZEN BALLAST FROM PASS 1
                    result.ballastChange = ballastMap[driver.id] || 0;
                }
            });
        };


        // DYNAMIC CLASS PROCESSING
        const classesToProcess = (data.config && data.config.classes) ? data.config.classes : ['LMP2', 'LMGT3'];
        classesToProcess.forEach(cls => processClass(cls));
    });

    if (data.drivers) {
        data.drivers.forEach(driver => {
            if (driver.raceResults) {
                const classesDriven = [...new Set(driver.raceResults.map(r => r.drivenClass || driver.class))];
                const hasSwapped = classesDriven.length > 1;
                let validResults = driver.raceResults;

                if (hasSwapped) {
                    const currentClassResults = driver.raceResults.filter(r => (r.drivenClass || driver.class) === driver.class);
                    const firstRaceInCurrentClass = currentClassResults.length > 0
                        ? Math.min(...currentClassResults.map(r => r.raceId))
                        : 999;

                    if (firstRaceInCurrentClass > 2) {
                        validResults = currentClassResults;
                    }
                }

                driver.totalPoints = validResults.reduce((sum, r) => sum + (r.points || 0), 0);

                let runningBallast = 0;
                const sortedResults = [...driver.raceResults].sort((a, b) => a.raceId - b.raceId);

                const rules = data.config && data.config.rules ? data.config.rules : {};

                // Determine Max for this driver's class
                let maxBallast = 45; // Default
                if (rules.ballastType === 'custom_class' && rules.ballastRules && rules.ballastRules[driver.class]) {
                    if (typeof rules.ballastRules[driver.class].max === 'number') {
                        maxBallast = rules.ballastRules[driver.class].max;
                    }
                } else if (typeof rules.maxBallast === 'number') {
                    maxBallast = rules.maxBallast;
                }

                sortedResults.forEach(r => {
                    r.startBallast = runningBallast;

                    // Logic: Use the stored ballastChange from the race processing step
                    // OR recalculate if needed? 
                    // Better to rely on the change we calculated properly above (which respects class rules)
                    // But we didn't store it on 'r' permanently in step 1, we stored it on result object 'result.ballastChange'

                    const change = r.ballastChange || 0; // The logic above saved it to result object
                    runningBallast = Math.max(0, Math.min(maxBallast, runningBallast + change));
                    // Note: Max cap might differ per class! 
                    // To be safe, re-clamp using helper if we want strictness, or trust the change.
                    // Let's just accumulate. The helper above already clamped the change? No, helper returns NEW ballast. 
                    // If we pass 0, it returns 0 + adjustment. 
                    // So bChange above is actually "The adjustment relative to 0". 
                    // E.g. P1 -> returns 15. P7 -> returns -15 (clamped to 0). 
                    // Wait, Math.max(0, ...) clamps the result. 
                    // If we pass 0, and adjustment is -15, it returns 0. That's WRONG for calculating "Change".

                    // FIX: We need just the ADJUSTMENT from the rules, not the final clamped value.
                    // Use a simpler lookup for the loop above or accept that we need to calc cumulative here.

                    r.endBallast = runningBallast;
                });
                driver.currentBallast = runningBallast;
            } else {
                driver.totalPoints = 0;
                driver.currentBallast = 0;
            }
        });
    }

    return data;
}
// --- LOGIC END ---

/**
 * Trigger: On write to seasons/{seasonId}
 * Action: Recalculate standings
 * Output: Write to standings/{seasonId}
 * 
 * USING V1 API FOR STABILITY
 */
/**
 * Trigger: On write to seasons/{seasonId}
 * Action: Recalculate standings
 * Output: Write to standings/{seasonId}
 * 
 * USING V1 API FOR STABILITY
 */
exports.calculateStandings = functions.firestore.document("seasons/{seasonId}")
    .onWrite(async (change, context) => {
        const seasonId = context.params.seasonId;
        const newData = change.after.exists ? change.after.data() : null;

        if (!newData) {
            console.log(`Season ${seasonId} deleted.`);
            return null; // Handle deletion if needed
        }

        console.log(`Recalculating standings for Season ${seasonId}...`);

        try {
            // Perform the heavy lifting
            const resultData = calculateChampionship(newData);
            const processedData = sanitizeForFirestore(resultData);

            // Add metadata
            processedData.lastUpdated = admin.firestore.FieldValue.serverTimestamp();
            processedData.calculationSource = 'cloud-functions-v1';

            // Write to SEPARATE collection to avoid infinite loops
            await db.collection('standings').doc(seasonId).set(processedData);

            console.log(`Standings updated for Season ${seasonId}.`);
            return null;

        } catch (error) {
            console.error("Error calculating standings:", error);
            // Optionally write error state to db
            return null;
        }
    });


// --- QUALIFYING SUBMISSION LOGIC ---
const { XMLParser } = require("fast-xml-parser");

// Helper: Parse and Analyze XML (Moved from Frontend)
// Helper: Time Formatter
const formatTime = (seconds) => {
    if (!seconds || seconds === Infinity) return "N/A";
    const m = Math.floor(seconds / 60);
    const s = (seconds % 60).toFixed(4); // 4 decimals
    return `${m}:${s.padStart(7, '0')}`;
};

// Helper: Parse and Analyze XML (Moved from Frontend)
const analyzeQualifyingXml = (xmlContent, criteriaSettings, targetDriverName = null) => {
    const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "@_"
    });
    const parsed = parser.parse(xmlContent);

    if (!parsed.rFactorXML || !parsed.rFactorXML.RaceResults) {
        throw new functions.https.HttpsError('invalid-argument', "Invalid XML structure: Missing rFactorXML or RaceResults");
    }

    const raceResults = parsed.rFactorXML.RaceResults;
    const trackName = raceResults.TrackVenue;

    // Priority: Try TimeString (e.g. "2026/01/10 14:12:04")
    // Fallback: DateTime (Unix Seconds or Milliseconds)
    let rawDate = raceResults.DateTime;
    let timeString = raceResults.TimeString;
    let raceDateVal;

    if (timeString && typeof timeString === 'string') {
        const parsed = new Date(timeString); // Works with "2026/01/10..."
        if (!isNaN(parsed.getTime())) {
            raceDateVal = parsed;
        }
    }

    if (!raceDateVal) {
        // Fallback to DateTime logic
        if (typeof rawDate === 'string' && !isNaN(rawDate)) {
            rawDate = parseInt(rawDate);
        }

        if (typeof rawDate === 'number') {
            // Heuristic: If < 100,000,000,000, it's seconds
            if (rawDate < 100000000000) {
                raceDateVal = new Date(rawDate * 1000);
            } else {
                raceDateVal = new Date(rawDate);
            }
        } else {
            raceDateVal = new Date(rawDate);
        }
    }

    // Fallback if invalid
    if (isNaN(raceDateVal.getTime())) {
        raceDateVal = new Date(); // Warning: Date parsing failed
        console.warn("Date parsing failed for XML, defaulting to Now", { rawDate, timeString });
    }

    const raceDate = raceDateVal.toISOString();

    // 1. Extract Drivers
    let driversData = raceResults.Driver;
    let targetSession = raceResults.Race;

    if (!driversData) {
        const potentialSessions = Object.keys(raceResults).filter(key =>
            key !== 'Setting' && key !== 'ServerName' && key !== 'TrackVenue' && typeof raceResults[key] === 'object'
        );
        for (const key of potentialSessions) {
            if (raceResults[key] && raceResults[key].Driver) {
                driversData = raceResults[key].Driver;
                targetSession = raceResults[key];
                break;
            }
        }
    }

    if (!driversData) throw new functions.https.HttpsError('invalid-argument', "No drivers found in XML.");
    if (!Array.isArray(driversData)) driversData = [driversData];

    // Filter for Player or Target
    let driver;

    if (targetDriverName) {
        // user selected a specific driver
        driver = driversData.find(d => d.Name === targetDriverName);
        if (!driver) throw new functions.https.HttpsError('not-found', `Driver '${targetDriverName}' not found in XML.`);
    } else {
        // Automatic Detection Logic
        if (driversData.length > 1) {
            // STRICT: If multiple drivers, always ask user
            return {
                status: 'MULTIPLE_DRIVERS',
                drivers: driversData.map(d => {
                    const laps = Array.isArray(d.Lap) ? d.Lap : (d.Lap ? [d.Lap] : []);
                    return {
                        driverName: d.Name,
                        carClass: d.CarClass,
                        carType: d.CarType,
                        teamName: d.TeamName,
                        lapCount: laps.length
                    };
                })
            };
        }
        // Only one driver found
        driver = driversData[0];
    }

    if (!driver) {
        throw new functions.https.HttpsError('failed-precondition', "No valid driver found.");
    }

    // Class Determination
    let criteriaClass = 'LMGT3';
    const rawClass = (driver.CarClass || '').toUpperCase();
    if (rawClass.includes('LMP2') || rawClass.includes('P2') || rawClass.includes('ORECA')) {
        criteriaClass = 'LMP2-UR';
    }

    const criteria = criteriaSettings[criteriaClass] || { consecutiveLaps: 5, maxAvgTime: 999 };

    // 2. Extract Laps from Driver.Lap (qualifying/practice format)
    const validLaps = [];

    if (driver.Lap) {
        const laps = Array.isArray(driver.Lap) ? driver.Lap : [driver.Lap];
        laps.forEach(lap => {
            const lapNum = parseInt(lap['@_num']);
            const s1 = parseFloat(lap['@_s1']);
            const s2 = parseFloat(lap['@_s2']);
            const s3 = parseFloat(lap['@_s3']);
            const et = parseFloat(lap['@_et'] || 0);

            // Only include laps with valid sector times (all positive)
            if (!isNaN(s1) && !isNaN(s2) && !isNaN(s3) && s1 > 0 && s2 > 0 && s3 > 0) {
                const total = s1 + s2 + s3;
                validLaps.push({
                    lap: lapNum,
                    time: total,
                    timestamp: et
                });
            }
        });
    }

    validLaps.sort((a, b) => a.lap - b.lap);

    // 3. Analyze Logic
    const requiredConsecutive = criteria.consecutiveLaps;
    const maxAvgTime = criteria.maxAvgTime;

    let maxConsecutiveCount = 0;
    let currentStreak = 0;

    // Calculate Stats
    if (validLaps.length > 0) {
        currentStreak = 1;
        maxConsecutiveCount = 1;
        for (let i = 0; i < validLaps.length - 1; i++) {
            if (validLaps[i + 1].lap === validLaps[i].lap + 1) {
                currentStreak++;
            } else {
                currentStreak = 1;
            }
            if (currentStreak > maxConsecutiveCount) maxConsecutiveCount = currentStreak;
        }
    }

    if (validLaps.length === 0) {
        return {
            passed: false,
            msg: `FAILED: No valid laps found.`,
            driver,
            trackName,
            raceDate,
            criteriaClass,
            criteria,
            stats: { bestAverage: 0, maxConsecutiveCount: 0 }
        };
    }

    if (validLaps.length < requiredConsecutive) {
        return {
            passed: false,
            msg: `FAILED: Insufficient valid laps (${validLaps.length}/${requiredConsecutive}).`,
            driver,
            trackName,
            raceDate,
            criteriaClass,
            criteria,
            stats: { bestAverage: 0, maxConsecutiveCount }
        };
    }

    let bestAverage = Infinity;
    let bestSequence = [];

    for (let i = 0; i <= validLaps.length - requiredConsecutive; i++) {
        const sequence = validLaps.slice(i, i + requiredConsecutive);
        // Continuous check
        let isContinuous = true;
        for (let j = 0; j < sequence.length - 1; j++) {
            if (sequence[j + 1].lap !== sequence[j].lap + 1) { isContinuous = false; break; }
        }
        if (!isContinuous) continue;

        const totalTime = sequence.reduce((sum, l) => sum + l.time, 0);
        const avg = totalTime / requiredConsecutive;
        if (avg < bestAverage) {
            bestAverage = avg;
            bestSequence = sequence;
        }
    }

    const passed = (bestAverage <= maxAvgTime);
    let msg = 'PASSED';
    if (!passed) {
        if (bestAverage === Infinity) {
            msg = `FAILED: No consecutive sequence of ${requiredConsecutive} valid laps found.`;
        } else {
            msg = `FAILED: Average Time ${formatTime(bestAverage)} (Limit: ${formatTime(maxAvgTime)})`;
        }
    }

    return {
        passed,
        msg,
        driver,
        trackName,
        raceDate,
        criteriaClass,
        criteria,
        stats: { bestAverage: bestAverage === Infinity ? 0 : bestAverage, bestSequence, maxConsecutiveCount }
    };

};

exports.submitQualifying = functions.https.onCall(async (data, context) => {
    // data: { xmlContent: string, seasonId: string, driverName?: string }
    const { xmlContent, seasonId, driverName } = data;

    if (!xmlContent) throw new functions.https.HttpsError('invalid-argument', "Missing XML Content");

    const targetSeasonId = String(seasonId || '3');

    // 1. Fetch Settings
    const seasonDoc = await db.collection('seasons').doc(targetSeasonId).get();
    let settings = {
        'LMP2-UR': { consecutiveLaps: 5, maxAvgTime: 120.0 }, // fallback
        'LMGT3': { consecutiveLaps: 5, maxAvgTime: 140.0 }
    };

    if (seasonDoc.exists && seasonDoc.data().qualifyingSettings) {
        settings = seasonDoc.data().qualifyingSettings;
        console.log('[submitQualifying] Using custom settings from Firestore:', JSON.stringify(settings));
    } else {
        console.log('[submitQualifying] Using default settings (no custom settings found)');
    }

    // 2. Analyze
    try {
        const result = analyzeQualifyingXml(xmlContent, settings, driverName);

        // Handle Multiple Drivers Interruption
        if (result.status === 'MULTIPLE_DRIVERS') {
            return {
                success: false,
                status: 'MULTIPLE_DRIVERS',
                drivers: result.drivers,
                message: "Multiple drivers found. Please select one."
            };
        }

        // 3. Save to Firestore
        const submission = {
            id: db.collection('qualifying').doc().id, // Generate ID
            timestamp: result.raceDate || new Date().toISOString(),
            createdAt: new Date().toISOString(),
            xmlDate: result.raceDate,
            driverName: result.driver.Name,
            carClass: result.criteriaClass,
            carType: result.driver.CarType || 'Unknown',
            track: result.trackName || 'Unknown',
            passed: result.passed,
            bestAverage: result.stats.bestAverage === Infinity ? 0 : result.stats.bestAverage,
            bestLaps: result.stats.bestSequence || [],
            criteriaUsed: result.criteria,
            validLapCount: result.stats.validLapCount || 0, // Need to pass this through
            maxConsecutiveCount: result.stats.maxConsecutiveCount,
            note: result.msg,
            seasonId: targetSeasonId,
            calculationSource: 'cloud-function-v1'
        };

        // Use custom ID or auto? UI logic used random string. Let's use auto-generated ID from line above.
        await db.collection('qualifying').doc(submission.id).set(submission);

        return {
            success: true,
            submission: submission,
            message: result.msg
        };

    } catch (err) {
        console.error("Qualifying Analysis Error:", err);
        throw new functions.https.HttpsError('internal', err.message);
    }
});




// Temporary HTTP function to manually populate standings/3
exports.fixStandings = functions.https.onRequest(async (req, res) => {
    try {
        console.log('Manual standings fix triggered...');

        // Read season data
        const seasonDoc = await admin.firestore().collection('seasons').doc('3').get();
        if (!seasonDoc.exists) {
            throw new Error('Season 3 not found');
        }

        const seasonData = seasonDoc.data();
        console.log(`Season: ${seasonData.season}, Drivers: ${seasonData.drivers?.length}`);

        // Calculate standings
        const calculatedData = calculateChampionship(seasonData);
        const sanitized = sanitizeForFirestore(calculatedData);

        // Add metadata
        sanitized.lastUpdated = admin.firestore.FieldValue.serverTimestamp();
        sanitized.calculationSource = 'Manual Fix via HTTP';

        // Write to standings/3
        await admin.firestore().collection('standings').doc('3').set(sanitized);

        console.log(`✓ Standings written. Drivers: ${sanitized.drivers?.length}`);

        res.status(200).json({
            success: true,
            season: sanitized.season,
            drivers: sanitized.drivers?.length || 0,
            races: sanitized.races?.length || 0,
            currentRound: sanitized.currentRound
        });
    } catch (error) {
        console.error('Fix standings error:', error);
        res.status(500).json({ error: error.message });
    }
});
