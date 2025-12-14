import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { seasons, latestSeason } from '../data';
import { parseTime, BALLAST_SYSTEM } from '../utils/raceLogic';

const ChampionshipContext = createContext(null);

export const ChampionshipProvider = ({ children }) => {

    // Season State
    const [currentSeasonId, setCurrentSeasonId] = useState(2);

    const [loading, setLoading] = useState(false); // Fix: Add missing loading state

    // Base Data State (Persistence per season)
    const [seasonData, setSeasonData] = useState(() => {
        const key = `srm_data_s${currentSeasonId}`;
        const saved = localStorage.getItem(key);
        // Fallback to static initial data if no save exists
        return saved ? JSON.parse(saved) : JSON.parse(JSON.stringify(seasons[currentSeasonId] || latestSeason));
    });

    // When season changes, load that season's data (saved or default)
    useEffect(() => {
        const key = `srm_data_s${currentSeasonId}`;
        const saved = localStorage.getItem(key);
        if (saved) {
            setSeasonData(JSON.parse(saved));
        } else {
            // Load default from file
            setSeasonData(JSON.parse(JSON.stringify(seasons[currentSeasonId] || latestSeason)));
        }
    }, [currentSeasonId]);

    // Persist data whenever it changes
    useEffect(() => {
        const key = `srm_data_s${currentSeasonId}`;
        localStorage.setItem(key, JSON.stringify(seasonData));
    }, [seasonData, currentSeasonId]);

    // Load penalties for the CURRENT season
    const [penalties, setPenalties] = useState(() => {
        const saved = localStorage.getItem(`srm_penalties_s${currentSeasonId}`);
        // Fallback: Check if the loaded default seasonData has penalties baked in
        if (!saved && seasons[currentSeasonId]?.penalties) return seasons[currentSeasonId].penalties;
        return saved ? JSON.parse(saved) : {};
    });

    // When season changes, we need to load that season's penalties.
    useEffect(() => {
        const saved = localStorage.getItem(`srm_penalties_s${currentSeasonId}`);
        setPenalties(saved ? JSON.parse(saved) : {});
    }, [currentSeasonId]);

    // Save penalties when they change
    useEffect(() => {
        localStorage.setItem(`srm_penalties_s${currentSeasonId}`, JSON.stringify(penalties));
    }, [penalties, currentSeasonId]);

    // State for manual position overrides (forcing rank)
    const [manualPositions, setManualPositions] = useState(() => {
        try {
            const key = `srm_manual_positions_s${currentSeasonId}`;
            const saved = localStorage.getItem(key);
            // Fallback: Check if baked into seasonData
            if (!saved && seasons[currentSeasonId]?.manualPositions) return seasons[currentSeasonId].manualPositions;
            return saved ? JSON.parse(saved) : {};
        } catch (e) {
            console.error("Failed to load manual positions", e);
            return {};
        }
    });

    // When season changes, we need to load that season's manual positions.
    useEffect(() => {
        const key = `srm_manual_positions_s${currentSeasonId}`;
        const saved = localStorage.getItem(key);
        setManualPositions(saved ? JSON.parse(saved) : {});
    }, [currentSeasonId]);

    // Save manual positions when they change
    useEffect(() => {
        const key = `srm_manual_positions_s${currentSeasonId}`;
        localStorage.setItem(key, JSON.stringify(manualPositions));
    }, [manualPositions, currentSeasonId]);

    // Season Switching
    const changeSeason = (id) => {
        if (seasons[id]) {
            setCurrentSeasonId(Number(id));
        }
    };

    const seasonList = Object.keys(seasons).map(id => ({
        id: Number(id),
        name: seasons[id].season
    }));

    const updatePenalty = (driverId, raceId, seconds) => {
        const key = `${raceId}-${driverId}`;
        setPenalties(prev => {
            const next = { ...prev };
            if (seconds === 0 || seconds === null) {
                delete next[key];
            } else {
                next[key] = seconds;
            }
            return next;
        });
    };

    const updateManualPosition = (driverId, raceId, position) => {
        const key = `${raceId}-${driverId}`;
        setManualPositions(prev => {
            const next = { ...prev };
            const parsedPosition = parseInt(position);
            if (parsedPosition === 0 || isNaN(parsedPosition)) { // 0 or invalid means no override
                delete next[key];
            } else {
                next[key] = parsedPosition;
            }
            return next;
        });
    };

    const addRound = (raceName, raceDate) => {
        setSeasonData(prev => {
            const next = JSON.parse(JSON.stringify(prev));
            const newId = next.races.length > 0 ? Math.max(...next.races.map(r => r.id)) + 1 : 1;
            next.races.push({
                id: newId,
                name: `Round ${newId}`,
                track: raceName || 'Unknown Track',
                date: raceDate || new Date().toISOString().split('T')[0],
                status: 'Scheduled'
            });
            next.totalRounds = next.races.length;
            return next;
        });
    };

    const deleteRound = (raceId) => {
        console.log("Deleting Round ID:", raceId);

        setSeasonData(prev => {
            try {
                const next = JSON.parse(JSON.stringify(prev));

                // Remove Race
                const initialCount = next.races.length;
                next.races = next.races.filter(r => String(r.id) !== String(raceId));
                console.log(`Races: ${initialCount} -> ${next.races.length}`);

                next.totalRounds = next.races.length;

                // Remove associated results from all drivers
                if (next.drivers && Array.isArray(next.drivers)) {
                    next.drivers.forEach(driver => {
                        if (driver.raceResults && Array.isArray(driver.raceResults)) {
                            driver.raceResults = driver.raceResults.filter(r => String(r.raceId) !== String(raceId));
                        }
                    });
                }

                // Adjust current round
                if (next.currentRound >= raceId && next.currentRound > 0) {
                    const remainingIds = next.races.map(r => r.id);
                    if (remainingIds.length > 0) {
                        next.currentRound = Math.max(...remainingIds.filter(id => id < next.currentRound), 0) || Math.min(...remainingIds);
                    } else {
                        next.currentRound = 0;
                    }
                }

                return next;
            } catch (err) {
                console.error("Critical Error in deleteRound:", err);
                return prev; // Fallback
            }
        });
    };

    const importRaceResults = (raceId, parsedResults, raceInfo = {}) => {
        console.log("Importing Results:", { raceId, count: parsedResults.length, raceInfo });
        setSeasonData(prevData => {
            // Deep clone to avoid mutation
            const newData = JSON.parse(JSON.stringify(prevData));

            // 0. Update/Add Race Metadata
            let raceIdToUse = raceId;
            let existingRaceIndex = -1;

            // Smart Match: Try to find an existing race with minimal name matching
            if (raceInfo && raceInfo.trackName) {
                const normalizedImportTrack = raceInfo.trackName.toLowerCase().replace(/[^a-z0-9]/g, '');

                existingRaceIndex = newData.races.findIndex(r => {
                    const normalizedScheduleTrack = r.track.toLowerCase().replace(/[^a-z0-9]/g, '');
                    // Check if one contains the other (e.g., "Silverstone" in "Silverstone Circuit" or vice versa)
                    // Also check strict date match if available? No, dates often shift.
                    return normalizedScheduleTrack.includes(normalizedImportTrack) || normalizedImportTrack.includes(normalizedScheduleTrack);
                });

                if (existingRaceIndex !== -1) {
                    raceIdToUse = newData.races[existingRaceIndex].id;
                    console.log(`Matched import ${raceInfo.trackName} to existing Round ${raceIdToUse} (${newData.races[existingRaceIndex].track})`);
                }
            }

            // Fallback: If passed raceId was just "next available" but we found a match, use the match.
            // If we didn't find a match, we use the passed raceId (which Admin.jsx calculated as max+1).
            if (existingRaceIndex === -1 && raceId === newData.races.length + 1) {
                // Confirm we are appending
                existingRaceIndex = -1;
            } else if (existingRaceIndex !== -1) {
                // If we matched, ensure we update THAT race, not append a new one
                // But wait, key logic is: if we matched, we use matched ID.
            }

            let raceDate = new Date().toISOString().split('T')[0];
            try {
                if (raceInfo && raceInfo.raceDate) {
                    const parsedTimestamp = parseInt(raceInfo.raceDate);
                    if (!isNaN(parsedTimestamp)) {
                        raceDate = new Date(parsedTimestamp * 1000).toISOString().split('T')[0];
                    }
                }
            } catch (err) {
                console.error("Date parsing failed", err);
            }

            if (existingRaceIndex !== -1) {
                // Update existing
                newData.races[existingRaceIndex] = {
                    ...newData.races[existingRaceIndex],
                    // Don't overwrite track name from schedule with XML name unless explicitly desired. 
                    // Usually schedule names are "cleaner". Let's keep schedule name but update date.
                    date: raceDate,
                    status: 'Completed'
                };
            } else {
                // Add new
                newData.races.push({
                    id: raceIdToUse,
                    name: `Round ${raceIdToUse}`,
                    track: raceInfo.trackName || 'Unknown Track',
                    date: raceDate,
                    status: 'Completed'
                });
            }

            // Update Current Round
            if (raceIdToUse > newData.currentRound) {
                newData.currentRound = raceIdToUse;
            }

            // 1. Process parsed results
            parsedResults.forEach(pResult => {
                // Find or Create Driver
                let driver = newData.drivers.find(d => d.name === pResult.name);

                // Better Class Mapping
                let determinedClass = 'LMGT3'; // Default
                const rawClass = (pResult.carClass || '').toUpperCase();
                // Check for generic LMP2 indicators
                if (rawClass.includes('LMP2') || rawClass.includes('P2') || rawClass.includes('ORECA')) {
                    determinedClass = 'LMP2';
                }

                if (!driver) {
                    const newId = newData.drivers.length > 0 ? Math.max(...newData.drivers.map(d => d.id)) + 1 : 1;
                    driver = {
                        id: newId,
                        name: pResult.name,
                        team: pResult.team,
                        car: pResult.car,
                        class: determinedClass,
                        raceResults: []
                    };
                    newData.drivers.push(driver);
                } else {
                    // Update class if needed (e.g. driver switched cars)
                    // Or keep sticky? Usually good to update if it's the latest race.
                    // Let's trust the XML for the current state.
                    driver.class = determinedClass;
                }

                // Create Result Object
                const raceResult = {
                    raceId: Number(raceIdToUse), // Enforce Number
                    position: Number(pResult.position),
                    classPosition: Number(pResult.classPosition),
                    laps: Number(pResult.laps),
                    finishTime: parseTime(String(pResult.totalTime)),
                    bestLap: pResult.bestLap,
                    status: pResult.status || 'Finished',
                    attendance: 'Raced',
                    drivenClass: determinedClass, // Store the class driven in this specific race
                    points: 0,
                    ballastChange: 0, // Init explicit
                    effectiveBallastChange: 0
                };

                // Update or Add Result
                const existingResultIndex = driver.raceResults.findIndex(r => String(r.raceId) === String(raceIdToUse));
                if (existingResultIndex !== -1) {
                    driver.raceResults[existingResultIndex] = { ...driver.raceResults[existingResultIndex], ...raceResult };
                } else {
                    driver.raceResults.push(raceResult);
                }
            });

            return newData;
        });
    };

    // Derived State (Calculations)
    const processedData = useMemo(() => {
        console.log("Calculated processedData running...");
        // Guard Clause: Prevent crash if data is missing/corrupt
        if (!seasonData || !seasonData.races || !seasonData.drivers) {
            console.error("Missing seasonData in useMemo", seasonData);
            return {
                season: 'Error',
                races: [],
                drivers: [],
                currentRound: 0,
                totalRounds: 0
            };
        }

        try {
            console.log("Processing championship data for season:", seasonData.season);
            const data = JSON.parse(JSON.stringify(seasonData));
            // Points System: P1-P25.
            const pointsTable = [
                50, 47, 44, 41, 38, // P1-P5
                35, 34, 33, 32, 31, 30, 29, 28, 27, 26, 25, 24, 23, 22, 21, 20, 19, 18, 17, 16 // P6-P25
            ];

            // 1. Calculate Points for Completed Races
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
                        // Use parseTime to ensure we handle "MM:SS" strings OR Seconds Numbers safely
                        const finishTime = parseTime(result.finishTime) || 999999;

                        result.laps = Number(result.laps); // Ensure Number
                        result.originalTime = finishTime;
                        result.totalPenalty = penaltyTime;
                        result.finalTime = finishTime + penaltyTime;
                    });

                    // Sort by Laps (Desc) then Time (Asc), THEN apply Manual Overrides re-sort
                    // Step 1: Standard Sort
                    participants.sort((a, b) => {
                        const rA = a.raceResults.find(r => String(r.raceId) === String(race.id));
                        const rB = b.raceResults.find(r => String(r.raceId) === String(race.id));



                        if (rA.laps !== rB.laps) return rB.laps - rA.laps;

                        // Hybrid Logic: Trust XML Position if NO penalties are involved.
                        const hasPenaltyA = (rA.totalPenalty || 0) > 0;
                        const hasPenaltyB = (rB.totalPenalty || 0) > 0;

                        if (!hasPenaltyA && !hasPenaltyB) {
                            // If neither driver has a manual penalty, prioritize the source XML position
                            // This ensures Sim-specific DNF/Countback rules are respected.
                            // Use drivenClass-specific position (classPosition) or overall (position).
                            const posA = rA.classPosition || rA.position || 0;
                            const posB = rB.classPosition || rB.position || 0;
                            if (posA !== 0 && posB !== 0) return posA - posB;
                        }

                        // Fallback/Penalty Mode: Sort by Calculated Time
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

                        // Primary: Position (Manual or Natural)
                        if (posA !== posB) return posA - posB;

                        // Secondary: Preservce "Natural" order if collision (i.e. if user sets multiple P1s, or if natural P1 clashes with manual P1)
                        return a.naturalIndex - b.naturalIndex;
                    });

                    // Assign Points & Positions based on NEW Order
                    entries.forEach((entry, i) => {
                        const { driver, result } = entry;
                        // i is the new 0-based index.

                        if (result) {
                            result.classPosition = i + 1;
                            result.newPosition = i + 1;

                            // Points Rule: Position Based, but must complete at least 1 lap.
                            if (result.laps && result.laps > 0) {
                                result.points = pointsTable[i] || 0;
                            } else {
                                result.points = 0;
                            }

                            // Also attach the manual pos for UI awareness
                            result.manualPosition = entry.manualPos;

                            // Calculate Ballast Change
                            const pos = i + 1;
                            let bChange = BALLAST_SYSTEM.default;

                            // Check valid finish statuses
                            const validStatuses = ['Finished', 'Finished Normally', 'Completed'];
                            const isFinished = validStatuses.includes(result.status);

                            if (isFinished && BALLAST_SYSTEM[pos] !== undefined) {
                                bChange = BALLAST_SYSTEM[pos];
                            } else if (!isFinished) {
                                // DNF/DNS/DQ
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
                        // Points Calculation with Class Swap Logic
                        // Rule 1: Swap <= Race 2: Keep all points.
                        // Rule 2: Swap > Race 2: Only count points for current class.
                        // Note: "current class" is driver.class.

                        // Detect if mixed classes exist
                        const classesDriven = [...new Set(driver.raceResults.map(r => r.drivenClass || driver.class))];
                        const hasSwapped = classesDriven.length > 1;

                        let validResults = driver.raceResults;

                        if (hasSwapped) {
                            // Find when the swap happened (first race of the current class)
                            const currentClassResults = driver.raceResults.filter(r => (r.drivenClass || driver.class) === driver.class);
                            const firstRaceInCurrentClass = currentClassResults.length > 0
                                ? Math.min(...currentClassResults.map(r => r.raceId))
                                : 999;

                            // If swap happened strictly AFTER race 2 (i.e. first race is round 3 or later)
                            if (firstRaceInCurrentClass > 2) {
                                // Only count points from the current class results
                                validResults = currentClassResults;
                                console.log(`Driver ${driver.name} swapped class > Race 2. Counting only ${driver.class} points.`);
                            } else {
                                // Swap was early (Race 1 or 2), keep all points.
                                console.log(`Driver ${driver.name} swapped class early (<= Race 2). Keeping all points.`);
                            }
                        }

                        driver.totalPoints = validResults.reduce((sum, r) => sum + (r.points || 0), 0);

                        // Ballast Calculation (Simulation from Round 1)
                        let runningBallast = 0; // Starting Ballast
                        // Sort results by raceId to ensure chronological order
                        const sortedResults = [...driver.raceResults].sort((a, b) => a.raceId - b.raceId);

                        sortedResults.forEach(r => {
                            // Apply change
                            runningBallast += (r.ballastChange || 0);
                            // Clamp 0-45
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

        } catch (err) {
            console.error("Critical Error processing championship data:", err);
            return {
                season: 'Data Corruption Error',
                races: [],
                drivers: [],
                currentRound: 0,
                error: err.message
            };
        }
    }, [penalties, manualPositions, seasonData]);

    const resetSeasonData = () => {
        console.log("executing resetSeasonData - NUCLEAR WIPE");

        // 1. Clear Key State Variables
        setSeasonData(null);
        setPenalties({});
        setManualPositions({});

        // 2. Clear LocalStorage Explicitly for ALL SRM keys
        const keys = Object.keys(localStorage);
        keys.forEach(k => {
            if (k.startsWith('srm_')) {
                console.log("Removing:", k);
                localStorage.removeItem(k);
            }
        });


        processClass('LMP2');
        processClass('LMGT3');
        processClass('GT4'); // Added GT4 class processing
    });

    // 2. Recalculate Driver Totals
    if (data.drivers) {
        data.drivers.forEach(driver => {
            if (driver.raceResults) {
                // Points Calculation with Class Swap Logic
                // Rule 1: Swap <= Race 2: Keep all points.
                // Rule 2: Swap > Race 2: Only count points for current class.
                // Note: "current class" is driver.class.

                // Detect if mixed classes exist
                const classesDriven = [...new Set(driver.raceResults.map(r => r.drivenClass || driver.class))];
                const hasSwapped = classesDriven.length > 1;

                let validResults = driver.raceResults;

                if (hasSwapped) {
                    // Find when the swap happened (first race of the current class)
                    const currentClassResults = driver.raceResults.filter(r => (r.drivenClass || driver.class) === driver.class);
                    const firstRaceInCurrentClass = currentClassResults.length > 0
                        ? Math.min(...currentClassResults.map(r => r.raceId))
                        : 999;

                    // If swap happened strictly AFTER race 2 (i.e. first race is round 3 or later)
                    if (firstRaceInCurrentClass > 2) {
                        // Only count points from the current class results
                        validResults = currentClassResults;
                        console.log(`Driver ${driver.name} swapped class > Race 2. Counting only ${driver.class} points.`);
                    } else {
                        // Swap was early (Race 1 or 2), keep all points.
                        console.log(`Driver ${driver.name} swapped class early (<= Race 2). Keeping all points.`);
                    }
                }

                driver.totalPoints = validResults.reduce((sum, r) => sum + (r.points || 0), 0);

                // Ballast Calculation (Simulation from Round 1)
                let runningBallast = 0; // Starting Ballast
                // Sort results by raceId to ensure chronological order
                const sortedResults = [...driver.raceResults].sort((a, b) => a.raceId - b.raceId);

                sortedResults.forEach(r => {
                    // Apply change
                    runningBallast += (r.ballastChange || 0);
                    // Clamp 0-45
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

} catch (err) {
    console.error("Critical Error processing championship data:", err);
    return {
        season: 'Data Corruption Error',
        races: [],
        drivers: [],
        currentRound: 0,
        error: err.message
    };
    changeSeason,
        seasonList,
        updatePenalty,
        importRaceResults,
        addRound,
        deleteRound,
        resetSeasonData,
        updateManualPosition,
        manualPositions,
        exportSeasonData
};

return (
    <ChampionshipContext.Provider value={value}>
        {children}
    </ChampionshipContext.Provider>
);
};

export const useChampionship = () => {
    const context = useContext(ChampionshipContext);
    if (!context) {
        throw new Error('useChampionship must be used within a ChampionshipProvider');
    }
    return context;
};
