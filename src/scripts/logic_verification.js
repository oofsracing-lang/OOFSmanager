
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- MOCKED DEPENDENCIES & UTILS from Frontend ---

const BALLAST_SYSTEM = {
    1: 45, 2: 40, 3: 35, 4: 30, 5: 25, 6: 20, 7: 15, 8: 10, 9: 5, 10: 0,
    default: -5
};

function parseTime(timeStr) {
    if (!timeStr) return null;
    if (typeof timeStr === 'number') return timeStr;
    // Basic "MM:SS.ms" or "SS.ms" parsing if needed, but usually data is seconds in XML/JSON
    return parseFloat(timeStr);
}

// --- CORE LOGIC (Extracted from ChampionshipContext.jsx) ---
// This function takes raw season data and returns the processed championship object
function calculateChampionship(seasonData) {
    console.log("Processing championship data for season:", seasonData.season);

    // Deep clone
    const data = JSON.parse(JSON.stringify(seasonData));

    // Penalties & Manual Positions are embedded in the passed data for this simulation
    const penalties = data.penalties || {};
    const manualPositions = data.manualPositions || {};

    // EMERGENCY HOTFIX (Replicating the one we just added)
    if (data.drivers) {
        data.drivers = data.drivers.filter(d => ![40, 41].includes(d.id));
    }

    const pointsTable = [
        50, 47, 44, 41, 38, // P1-P5
        35, 34, 33, 32, 31, 30, 29, 28, 27, 26, 25, 24, 23, 22, 21, 20, 19, 18, 17, 16 // P6-P25
    ];

    // 1. Calculate Points for Completed Races
    // Ensure currentRound is respected
    const completedRaces = data.races.filter(r => r.id <= data.currentRound);

    completedRaces.forEach(race => {
        const processClass = (className) => {
            // Filter drivers who actually raced in this class for this round
            const participants = data.drivers.filter(d => {
                const r = d.raceResults.find(res => String(res.raceId) === String(race.id));
                if (!r) return false;

                // Use historical drivenClass if available, otherwise fallback to current class
                const raceClass = r.drivenClass || d.class;
                return raceClass === className;
            });

            // Add Penalty Time
            participants.forEach(d => {
                const result = d.raceResults.find(r => String(r.raceId) === String(race.id));
                const penaltyKey = `${race.id}-${d.id}`;
                const penaltyTime = parseFloat(penalties[penaltyKey] || 0);

                // Calculate total time
                const finishTime = parseTime(result.finishTime) || 999999;

                result.laps = Number(result.laps);
                result.originalTime = finishTime;
                result.totalPenalty = penaltyTime;
                result.finalTime = finishTime + penaltyTime;
            });

            // Sort by Laps (Desc) then Time (Asc), THEN apply Manual Overrides re-sort
            participants.sort((a, b) => {
                const rA = a.raceResults.find(r => String(r.raceId) === String(race.id));
                const rB = b.raceResults.find(r => String(r.raceId) === String(race.id));

                if (rA.laps !== rB.laps) return rB.laps - rA.laps;

                // DNF/Penalty Logic
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

            // Step 2: Manual Position Override Re-Sort
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

            // Assign Points & Positions based on NEW Order
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

                    // Ballast
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

    // 2. Recalculate Driver Totals
    if (data.drivers) {
        data.drivers.forEach(driver => {
            if (driver.raceResults) {
                // Class Swap Logic
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
                        console.log(`Driver ${driver.name} swapped class > Race 2. Counting only ${driver.class} points.`);
                    }
                }

                driver.totalPoints = validResults.reduce((sum, r) => sum + (r.points || 0), 0);

                // Ballast Total
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

// --- MAIN EXECUTION ---
const dataPath = path.resolve(__dirname, '../data/seasons/season2.json');
try {
    const rawData = fs.readFileSync(dataPath, 'utf-8');
    const seasonData = JSON.parse(rawData);

    console.log("Running Logic Verification on Season:", seasonData.season, "Current Round:", seasonData.currentRound);

    const result = calculateChampionship(seasonData);
    const end = performance.now();

    console.log(`Calculation took ${(end - start).toFixed(2)}ms`);

    // Write FULL Golden Master to JSON
    // We want to verify: Drivers, RaceResults (points, penalties, manualPos, ballast), and Season Totals
    const goldenMasterPath = path.resolve(__dirname, 'golden_master.json');
    fs.writeFileSync(goldenMasterPath, JSON.stringify(result, null, 2));
    console.log(`FULL Golden Master saved to: ${goldenMasterPath}`);
    console.log("Includes: Points, Ballast, Penalties, Manual Positions, Class Swaps for ALL drivers.");

    // Output visual summary for sanity check
    const classes = ['LMP2', 'LMGT3'];
    classes.forEach(c => {
        console.log(`\n--- Top 5 ${c} Standings ---`);
        const sorted = result.drivers
            .filter(d => d.class === c)
            .sort((a, b) => b.totalPoints - a.totalPoints)
            .slice(0, 5);

        sorted.forEach((d, i) => {
            console.log(`#${i + 1} ${d.name}: ${d.totalPoints} pts (${d.currentBallast}kg)`);
        });
    });

} catch (e) {
    console.error("Verification failed:", e);
}
