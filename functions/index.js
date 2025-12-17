const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");

admin.initializeApp();

const db = admin.firestore();

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

function calculateChampionship(seasonData) {
    // console.log("Processing championship data for season:", seasonData.season);

    const data = JSON.parse(JSON.stringify(seasonData));
    const penalties = data.penalties || {};
    const manualPositions = data.manualPositions || {};

    // EMERGENCY HOTFIX (Persisted)
    if (data.drivers) {
        data.drivers = data.drivers.filter(d => ![40, 41].includes(d.id));
    }

    const pointsTable = [
        50, 47, 44, 41, 38,
        35, 34, 33, 32, 31, 30, 29, 28, 27, 26, 25, 24, 23, 22, 21, 20, 19, 18, 17, 16
    ];

    const completedRaces = data.races.filter(r => r.id <= data.currentRound);

    completedRaces.forEach(race => {
        const processClass = (className) => {
            const participants = data.drivers.filter(d => {
                const r = d.raceResults.find(res => String(res.raceId) === String(race.id));
                if (!r) return false;
                const raceClass = r.drivenClass || d.class;
                return raceClass === className;
            });

            participants.forEach(d => {
                const result = d.raceResults.find(r => String(r.raceId) === String(race.id));
                const penaltyKey = `${race.id}-${d.id}`;
                const penaltyTime = parseFloat(penalties[penaltyKey] || 0);
                const finishTime = parseTime(result.finishTime) || 999999;

                result.laps = Number(result.laps);
                result.originalTime = finishTime;
                result.totalPenalty = penaltyTime;
                result.finalTime = finishTime + penaltyTime;
            });

            participants.sort((a, b) => {
                const rA = a.raceResults.find(r => String(r.raceId) === String(race.id));
                const rB = b.raceResults.find(r => String(r.raceId) === String(race.id));

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

            const entries = participants.map((p, index) => {
                const r = p.raceResults.find(res => String(res.raceId) === String(race.id));
                const key = `${race.id}-${p.id}`;
                const manPos = manualPositions[key];
                return {
                    driver: p,
                    result: r,
                    naturalIndex: index,
                    manualPos: manPos ? parseInt(manPos) : null
                };
            });

            entries.sort((a, b) => {
                const posA = a.manualPos !== null ? a.manualPos : (a.naturalIndex + 1);
                const posB = b.manualPos !== null ? b.manualPos : (b.naturalIndex + 1);

                if (posA !== posB) return posA - posB;
                return a.naturalIndex - b.naturalIndex;
            });

            entries.forEach((entry, i) => {
                const { driver, result } = entry;

                if (result) {
                    result.classPosition = i + 1;
                    result.newPosition = i + 1;

                    if (result.laps && result.laps > 0) {
                        result.points = pointsTable[i] || 0;
                    } else {
                        result.points = 0;
                    }

                    result.manualPosition = entry.manualPos;

                    const pos = i + 1;
                    let bChange = BALLAST_SYSTEM.default;
                    const validStatuses = ['Finished', 'Finished Normally', 'Completed'];
                    const isFinished = validStatuses.includes(result.status);

                    if (isFinished && BALLAST_SYSTEM[pos] !== undefined) {
                        bChange = BALLAST_SYSTEM[pos];
                    } else if (!isFinished) {
                        bChange = BALLAST_SYSTEM.default;
                    }
                    result.ballastChange = bChange;
                }
            });
        };

        processClass('LMP2');
        processClass('LMGT3');
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
                sortedResults.forEach(r => {
                    runningBallast += (r.ballastChange || 0);
                    if (runningBallast < 0) runningBallast = 0;
                    if (runningBallast > 45) runningBallast = 45;
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
            const processedData = calculateChampionship(newData);

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
