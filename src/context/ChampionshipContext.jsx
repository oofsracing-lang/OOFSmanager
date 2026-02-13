import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { seasons, latestSeason } from '../data';
import { parseTime, BALLAST_SYSTEM, getBallastAdjustment } from '../utils/raceLogic';
import {
    subscribeToSeason,
    subscribeToStandings,
    saveSeasonData,
    overwriteSeasonData,
    updateSeasonFields,
    saveQualifyingSubmission,
    deleteQualifyingSubmission,
    subscribeToQualifying,
    deleteStandings,
    mergeDriverLicensePoints,
    subscribeToLicensePoints
} from '../firebase/db';
import { useAuth } from './AuthContext';

const ChampionshipContext = createContext(null);

export const ChampionshipProvider = ({ children }) => {

    // Season State
    const [currentSeasonId, setCurrentSeasonId] = useState("3");
    const [seasonData, setSeasonData] = useState(null);

    const [loading, setLoading] = useState(false); // Fix: Add missing loading state

    // Base Data State (Persistence per season)
    const [penalties, setPenalties] = useState({});
    const [manualPositions, setManualPositions] = useState({});
    const [exclusions, setExclusions] = useState({});
    const [qualifyingSettings, setQualifyingSettings] = useState({
        'LMP2-UR': { consecutiveLaps: 5, maxAvgTime: 120.0 },
        'LMGT3': { consecutiveLaps: 5, maxAvgTime: 140.0 }
    });
    // Store submissions in state for Admin view
    const [qualifyingSubmissions, setQualifyingSubmissions] = useState([]);

    // Cloud Calculated Standings
    const [cloudStandings, setCloudStandings] = useState(null);

    // Global License Points Data
    const [licensePoints, setLicensePoints] = useState([]);

    // Auth for writing permissions
    const { currentUser } = useAuth();

    // Firestore Subscription
    useEffect(() => {
        setLoading(true);
        // Subscribe to input data (Races, Drivers List, etc - needed for Admin/Input)
        const unsubSeason = subscribeToSeason(currentSeasonId, (data, isLoading) => {
            if (data) {
                setSeasonData(data);
                setPenalties(data.penalties || {});
                setManualPositions(data.manualPositions || {});
                setManualPositions(data.manualPositions || {});
                setExclusions(data.exclusions || {});
                if (data.qualifyingSettings) {
                    setQualifyingSettings(data.qualifyingSettings);
                }
            } else {
                // Legacy: Do NOT load qualifyingSubmissions from seasonData anymore (ghost data)
                // Fallback to local default
                const defaultData = JSON.parse(JSON.stringify(seasons[currentSeasonId] || latestSeason));
                setSeasonData(defaultData);
                setPenalties(defaultData.penalties || {});
                setManualPositions(defaultData.manualPositions || {});
                setExclusions(defaultData.exclusions || {});
                setQualifyingSettings(defaultData.qualifyingSettings || {
                    'LMP2-UR': { consecutiveLaps: 5, maxAvgTime: 120.0 },
                    'LMGT3': { consecutiveLaps: 5, maxAvgTime: 140.0 }
                });
            }
            // Only stop loading if we are not waiting for standings? 
            // Actually loading state usually refers to Input data availability.
            setLoading(isLoading);
        });

        // Subscribe to QUALIFYING Data (New Collection)
        const unsubQualifying = subscribeToQualifying(currentSeasonId, (data) => {
            if (data) {
                setQualifyingSubmissions(data);
            }
        });

        // Debug: Log when legacy data would have been loaded
        // const unsubSeason = subscribeToSeason... (existing code)
        const unsubStandings = subscribeToStandings(currentSeasonId, (data) => {
            console.log("Cloud Standings Received for Season", currentSeasonId, ":", data ? "Found" : "Empty");
            if (data) {
                console.log("Cloud Standings Data:", {
                    season: data.season,
                    drivers: data.drivers?.length,
                    races: data.races?.length,
                    calculationSource: data.calculationSource
                });
            }
            setCloudStandings(data);
        });

        const unsubLicense = subscribeToLicensePoints(currentSeasonId, (data) => {
            setLicensePoints(data || []);
        });

        return () => {
            unsubSeason();
            unsubStandings();
            unsubQualifying();
            unsubLicense();
        };
    }, [currentSeasonId]);

    // Helpers to save data to cloud (Only if Admin)
    const saveToCloud = async (newData, newPenalties, newManualPositions) => {
        if (!currentUser) return; // Only allow writes if logged in

        const payload = {
            ...newData,
            penalties: newPenalties || penalties,
            manualPositions: newManualPositions || manualPositions,
            manualPositions: newManualPositions || manualPositions,
            manualPositions: newManualPositions || manualPositions,
            exclusions: exclusions,
            qualifyingSettings: qualifyingSettings,
            qualifyingSubmissions: qualifyingSubmissions
        };

        await saveSeasonData(currentSeasonId, payload);
    };


    // Season Switching
    const changeSeason = (id) => {
        if (seasons[id]) {
            setCurrentSeasonId(id);
        }
    };

    const seasonList = Object.keys(seasons).map(id => ({
        id: id,
        name: seasons[id].season
    }));

    const updatePenalty = async (driverId, raceId, seconds, reason = 'admin_penalty') => {
        if (!currentUser) return;
        const key = `${raceId}-${driverId}`;
        const nextPenalties = { ...penalties };

        // Track previous penalty for license point calculation
        const previousPenalty = penalties[key] || 0;
        const penaltyDiff = seconds - previousPenalty;

        if (seconds === 0 || seconds === null) {
            delete nextPenalties[key];
        } else {
            nextPenalties[key] = seconds;
        }

        // Optimistic Update
        setPenalties(nextPenalties);

        // Cloud Save
        try {
            await updateSeasonFields(currentSeasonId, { penalties: nextPenalties });

            // Auto-calculate license points if penalty increased or decreased
            if (penaltyDiff !== 0) {
                const { updateDriverLicensePoints } = await import('../firebase/db');

                // Find driver name
                const driver = seasonData?.drivers?.find(d => d.id === driverId);
                if (driver) {
                    // Logic: 15s = 1 point.
                    let licensePoints = 0;

                    // Special Rule: Drive Through = 2 License Points
                    if (reason === 'Drive Through') {
                        licensePoints = 2;
                    }
                    // Standard Rule: 15s Time Penalty = 1 License Point
                    else if (Math.abs(penaltyDiff) >= 15) {
                        licensePoints = Math.trunc(penaltyDiff / 15);
                    }

                    if (licensePoints !== 0) {
                        const action = licensePoints > 0 ? "applied" : "removed";
                        // Use provided reason or build a default string
                        const logReason = reason === 'admin_penalty'
                            ? `${Math.abs(penaltyDiff)}s time penalty ${action} (Race ${raceId})`
                            : `${Math.abs(penaltyDiff)}s time penalty - ${reason} (Race ${raceId})`;

                        await updateDriverLicensePoints(
                            currentSeasonId,
                            driverId,
                            driver.name,
                            licensePoints,
                            logReason,
                            'admin_penalty',
                            String(raceId),
                            currentUser.email || 'Admin'
                        );
                    }
                }
            }
        } catch (err) {
            console.error("Failed to save Penalty or License Points:", err);
        }
    };


    const updateManualPosition = (driverId, raceId, position) => {
        if (!currentUser) return;
        const key = `${raceId}-${driverId}`;
        const nextManualPositions = { ...manualPositions };
        const parsedPosition = parseInt(position);

        if (parsedPosition === 0 || isNaN(parsedPosition)) {
            delete nextManualPositions[key];
        } else {
            nextManualPositions[key] = parsedPosition;
        }

        // Optimistic
        setManualPositions(nextManualPositions);
        updateSeasonFields(currentSeasonId, { manualPositions: nextManualPositions })
            .catch(err => console.error("Failed to save Manual Position:", err));
    };

    const updateExclusion = (driverId, raceId, isExcluded) => {
        if (!currentUser) return;
        const key = `${raceId}-${driverId}`;
        const nextExclusions = { ...exclusions };

        if (!isExcluded) {
            delete nextExclusions[key];
        } else {
            nextExclusions[key] = true;
        }

        setExclusions(nextExclusions);
        updateSeasonFields(currentSeasonId, { exclusions: nextExclusions })
            .catch(err => console.error("Failed to save Exclusion:", err));
    };

    const updateQualifyingSettings = (cls, settings) => {
        if (!currentUser) return;
        const nextSettings = { ...qualifyingSettings, [cls]: settings };
        setQualifyingSettings(nextSettings);
        updateSeasonFields(currentSeasonId, { qualifyingSettings: nextSettings })
            .catch(err => console.error("Failed to save Qual Settings:", err));
    };

    const submitQualifyingResult = async (submission) => {
        // submission: { driverName, discordUser, carClass, passed, details, timestamp... }
        try {
            await saveQualifyingSubmission(submission);
            // State update will happen via subscription
        } catch (err) {
            console.error("Failed to save submission:", err);
            throw err;
        }
    };

    const deleteSubmission = async (submissionId) => {
        try {
            // Optimistic update
            setQualifyingSubmissions(prev => prev.filter(s => s.id !== submissionId));
            await deleteQualifyingSubmission(submissionId);
        } catch (err) {
            console.error("Failed to delete submission:", err);
            alert("Failed to delete. Check permissions?");
            // Revert might be needed here if valid, but subscription usually handles sync
        }
    };

    const addRound = (raceName, raceDate) => {
        if (!currentUser) return;

        const nextSeasonData = JSON.parse(JSON.stringify(seasonData));
        const newId = nextSeasonData.races.length > 0 ? Math.max(...nextSeasonData.races.map(r => r.id)) + 1 : 1;

        nextSeasonData.races.push({
            id: newId,
            name: `Round ${newId}`,
            track: raceName || 'Unknown Track',
            date: raceDate || new Date().toISOString().split('T')[0],
            status: 'Scheduled'
        });
        nextSeasonData.totalRounds = nextSeasonData.races.length;

        // Save Full Object
        saveSeasonData(currentSeasonId, nextSeasonData);
    };

    const deleteRound = (raceId) => {
        if (!currentUser) return;

        try {
            const next = JSON.parse(JSON.stringify(seasonData));

            // Remove Race
            const initialCount = next.races.length;
            next.races = next.races.filter(r => String(r.id) !== String(raceId));

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

            saveSeasonData(currentSeasonId, next);

        } catch (err) {
            console.error("Critical Error in deleteRound:", err);
        }
    };

    const toggleDriverReserveStatus = (driverName) => {
        if (!currentUser || !seasonData) return;

        try {
            const next = JSON.parse(JSON.stringify(seasonData));

            // Ensure config exists
            if (!next.config) next.config = {};
            if (!next.config.driverRoster) next.config.driverRoster = [];

            // Find driver in roster
            const rosterIndex = next.config.driverRoster.findIndex(
                d => d.name.toLowerCase().trim() === driverName.toLowerCase().trim()
            );

            if (rosterIndex !== -1) {
                // Toggle existing
                next.config.driverRoster[rosterIndex].reserve = !next.config.driverRoster[rosterIndex].reserve;
            } else {
                // Should not happen theoretically if we auto-add, but robust handling:
                // Add as reserve if not found (implied intent is to manage them)
                // We need to try and find their class/team from drivers list if possible
                const existingDriver = next.drivers.find(d => d.name.toLowerCase().trim() === driverName.toLowerCase().trim());
                next.config.driverRoster.push({
                    name: driverName,
                    class: existingDriver ? existingDriver.class : 'LMGT3',
                    team: existingDriver ? existingDriver.team : '',
                    reserve: true // Toggle ON
                });
            }

            saveSeasonData(currentSeasonId, next);

        } catch (err) {
            console.error("Error toggling reserve status:", err);
        }
    };

    // --- ROSTER MANAGEMENT (NEW) ---

    const addRosterDriver = async (name, vehicleClass, team, isReserve = false) => {
        if (!currentUser || !seasonData) return;
        try {
            const next = JSON.parse(JSON.stringify(seasonData));
            if (!next.config) next.config = {};
            if (!next.config.driverRoster) next.config.driverRoster = [];

            // Check duplicate
            if (next.config.driverRoster.some(d => d.name.toLowerCase() === name.toLowerCase())) {
                alert("Driver already exists in roster!");
                return;
            }

            next.config.driverRoster.push({
                name,
                class: vehicleClass,
                team: team || '',
                reserve: isReserve
            });

            // Also ensure they exist in drivers list if not already
            if (!next.drivers.find(d => d.name.toLowerCase() === name.toLowerCase())) {
                const newId = next.drivers.length > 0 ? Math.max(...next.drivers.map(d => d.id)) + 1 : 1;
                next.drivers.push({
                    id: newId,
                    name: name,
                    class: vehicleClass,
                    team: team || '',
                    raceResults: []
                });
            }

            await saveSeasonData(currentSeasonId, next);
        } catch (err) {
            console.error("Error adding driver:", err);
            throw err;
        }
    };

    const deleteRosterDriver = async (name) => {
        if (!currentUser || !seasonData) return;
        try {
            const next = JSON.parse(JSON.stringify(seasonData));
            if (!next.config || !next.config.driverRoster) return;

            // Remove from Roster
            next.config.driverRoster = next.config.driverRoster.filter(d => d.name.toLowerCase() !== name.toLowerCase());

            // OPTIONAL: Do we remove from 'drivers' list (historical results)? 
            // Usually safest to KEEP results history but remove from Roster view to hide them from future management.
            // But user asked "Delete". If they have 0 results, we should delete them entirely.
            // OR if the user EXPLICITLY deleted them, they probably want them gone.
            const driverIndex = next.drivers.findIndex(d => d.name.toLowerCase() === name.toLowerCase());
            if (driverIndex !== -1) {
                const driver = next.drivers[driverIndex];
                // Only delete form Master list if NO results, or if specific user request (implied "clean up"). 
                // Let's delete if no results strings attached.
                if (!driver.raceResults || driver.raceResults.length === 0) {
                    next.drivers.splice(driverIndex, 1);
                }
            }

            await saveSeasonData(currentSeasonId, next);
        } catch (err) {
            console.error("Error deleting driver:", err);
            throw err;
        }
    };

    const updateDriverName = async (oldName, newName) => {
        if (!currentUser || !seasonData) return;
        try {
            const next = JSON.parse(JSON.stringify(seasonData));

            // 1. Update Roster
            if (next.config && next.config.driverRoster) {
                const rParams = next.config.driverRoster.find(d => d.name.toLowerCase() === oldName.toLowerCase());
                if (rParams) rParams.name = newName;
            }

            // 2. Update Master Driver List
            const driver = next.drivers.find(d => d.name.toLowerCase() === oldName.toLowerCase());
            if (driver) {
                driver.name = newName;
            }

            await saveSeasonData(currentSeasonId, next);
        } catch (err) {
            console.error("Error updating name:", err);
            throw err;
        }
    };

    const updateDriverAttendance = async (driverName, raceId, newStatus) => {
        if (!currentUser || !seasonData) return;
        try {
            const next = JSON.parse(JSON.stringify(seasonData));
            const driver = next.drivers.find(d => d.name.toLowerCase() === driverName.toLowerCase());

            if (!driver) {
                console.error("Driver not found:", driverName);
                return;
            }

            const result = driver.raceResults.find(r => String(r.raceId) === String(raceId));

            if (result) {
                result.attendance = newStatus;
                // If they are marked as Raced, ensure they are not counted as DNS
                if (newStatus === 'Raced') {
                    // Start of Race / Did Not Finish - Effectively they were there.
                    // We don't change laps/time, just the attendance flag.
                }
            } else {
                // If no result exists but we want to mark them as 'Raced' (e.g. they were there but not in XML??)
                // This is rarer. Usually they are in XML as DNS (0 laps).
                // But if they are completely missing, we might need to create a dummy result?
                // For now, let's assume they have a result (DNS/0 laps) if they "Crashed out on Lap 1".
                console.warn("No result found for driver to update attendance:", driverName);
                return;
            }

            await saveSeasonData(currentSeasonId, next);
        } catch (err) {
            console.error("Error updating attendance:", err);
            throw err;
        }
    };

    const mergeDrivers = async (targetName, sourceName) => {
        if (!currentUser || !seasonData) return;
        console.log(`Merging ${sourceName} into ${targetName}`);
        try {
            const next = JSON.parse(JSON.stringify(seasonData));

            // 1. Find Actors
            const targetDriver = next.drivers.find(d => d.name.toLowerCase() === targetName.toLowerCase());
            const sourceDriverIndex = next.drivers.findIndex(d => d.name.toLowerCase() === sourceName.toLowerCase());

            if (!targetDriver || sourceDriverIndex === -1) {
                throw new Error("Target or Source driver not found");
            }
            const sourceDriver = next.drivers[sourceDriverIndex];

            // 2. Merge Results
            if (sourceDriver.raceResults) {
                sourceDriver.raceResults.forEach((sourceResult) => {
                    // Check if target already has result for this race
                    const existing = targetDriver.raceResults.find(r => String(r.raceId) === String(sourceResult.raceId));
                    if (!existing) {
                        // Transfer result
                        targetDriver.raceResults.push(sourceResult);
                    } else {
                        // Conflict! Target has result, Source has result.
                        // Strategy: Keep Target's result, discard Source's (assuming Target is the "Good" one).
                    }
                });
            }

            // 3. Merge License Points
            // We must do this before deleting the source, just to be clean, 
            // though we already captured the object.
            if (targetDriver.id && sourceDriver.id) {
                await mergeDriverLicensePoints(currentSeasonId, targetDriver.id, sourceDriver.id);
            }

            // 4. Update Roster Logic
            // If Source is in Roster, and Target is NOT -> Target inherits the Roster spot.
            // If Source is in Roster, and Target IS -> Just delete Source (Target keeps their own spot).
            let rosterUpdated = false;

            if (next.config && next.config.driverRoster) {
                const sourceRosterIndex = next.config.driverRoster.findIndex(d => d.name.toLowerCase() === sourceName.toLowerCase());
                const targetRosterIndex = next.config.driverRoster.findIndex(d => d.name.toLowerCase() === targetName.toLowerCase());

                if (sourceRosterIndex !== -1) {
                    // Source is in Roster
                    if (targetRosterIndex === -1) {
                        // Target is NOT in roster -> INHERIT
                        console.log(`[Merge] Transferring Roster spot from ${sourceName} to ${targetName}`);
                        const sourceEntry = next.config.driverRoster[sourceRosterIndex];

                        // Update the entry to match target
                        next.config.driverRoster[sourceRosterIndex] = {
                            ...sourceEntry,
                            name: targetName,
                            // Optionally keep Source's team/class or switch? 
                            // Usually if we are correcting a name, we want to keep the metadata (Reserve status etc)
                            // But maybe update class if Target had a defined class? 
                            // Let's keep source metadata (Reserve/Team) as that's the "Roster Configuration".
                        };
                        rosterUpdated = true;
                    } else {
                        // both in roster -> just delete source
                        console.log(`[Merge] Both in roster. Deleting source ${sourceName}.`);
                        next.config.driverRoster.splice(sourceRosterIndex, 1);
                        rosterUpdated = true;
                    }
                }
            }

            // 5. Remove Source from Master List
            next.drivers.splice(sourceDriverIndex, 1);

            // 6. Fallback Roster cleanup if we didn't handle it in standard logic (e.g. simple delete)
            if (!rosterUpdated && next.config && next.config.driverRoster) {
                next.config.driverRoster = next.config.driverRoster.filter(d => d.name.toLowerCase() !== sourceName.toLowerCase());
            }

            await saveSeasonData(currentSeasonId, next);

        } catch (err) {
            console.error("Error merging drivers:", err);
            throw err;
        }
    };

    const importRaceResults = async (raceId, parsedResults, raceInfo = {}) => {
        if (!currentUser) {
            console.error("Import failed: No User Logged In");
            alert("Error: You must be logged in to import results.");
            return;
        }

        // Deep clone to avoid mutation
        const newData = JSON.parse(JSON.stringify(seasonData));

        // 0. Update/Add Race Metadata
        let raceIdToUse = raceId;
        let existingRaceIndex = -1;

        // Smart Match Logic - DISABLED
        // Reason: Admin.jsx already handles matching/new ID calculation. 
        // Re-running it here causes conflicts (e.g. overriding 'New Round 9' back to 'Existing Round 8' because track names match).
        /*
        if (raceInfo && raceInfo.trackName) {
            const normalizedImportTrack = raceInfo.trackName.toLowerCase().replace(/[^a-z0-9]/g, '');

            existingRaceIndex = newData.races.findIndex(r => {
                const normalizedScheduleTrack = r.track.toLowerCase().replace(/[^a-z0-9]/g, '');
                return normalizedScheduleTrack.includes(normalizedImportTrack) || normalizedImportTrack.includes(normalizedScheduleTrack);
            });

            if (existingRaceIndex !== -1) {
                raceIdToUse = newData.races[existingRaceIndex].id;
                console.log(`Matched import ${raceInfo.trackName} to existing Round ${raceIdToUse} (${newData.races[existingRaceIndex].track})`);
            }
        }
        */

        // Explicitly Find index based on the PASSED raceId
        existingRaceIndex = newData.races.findIndex(r => String(r.id) === String(raceIdToUse));

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
                status: 'Completed',
                dramaLog: raceInfo.dramaLog || []
            };
        } else {
            // Add new
            newData.races.push({
                id: raceIdToUse,
                name: `Round ${raceIdToUse}`,
                track: raceInfo.trackName || 'Unknown Track',
                date: raceDate,
                status: 'Completed',
                dramaLog: raceInfo.dramaLog || []
            });
        }

        if (raceIdToUse > newData.currentRound) {
            newData.currentRound = raceIdToUse;
        }
        if (newData.races.length > (newData.totalRounds || 0)) {
            newData.totalRounds = newData.races.length;
        }

        // 1. Process parsed results & Roster Updates

        // Ensure roster exists
        if (!newData.config) newData.config = {};
        if (!newData.config.driverRoster) newData.config.driverRoster = [];

        parsedResults.forEach(pResult => {
            // Hardened matching: Case-insensitive & Trimmed
            const pResultName = (pResult.name || '').trim();

            // --- ROSTER SYNC ---
            // If this driver is NOT in the roster, add them as Active (reserve: false)
            const rosterEntry = newData.config.driverRoster.find(rd => rd.name.toLowerCase() === pResultName.toLowerCase());

            // Better Class Mapping
            let determinedClass = 'LMGT3'; // Default
            const rawClass = (pResult.carClass || '').toUpperCase();
            // Check for generic LMP2 indicators
            if (rawClass.includes('LMP2') || rawClass.includes('P2') || rawClass.includes('ORECA')) {
                determinedClass = 'LMP2-UR';
            }

            if (!rosterEntry) {
                newData.config.driverRoster.push({
                    name: pResultName,
                    class: determinedClass,
                    team: pResult.team || '',
                    reserve: false // Default to ACTIVE
                });
            } else {
                // Optional: Update class/team if they changed? 
                // Let's stick to the roster being the master for simple things, but maybe update team if missing.
                if (!rosterEntry.team && pResult.team) rosterEntry.team = pResult.team;
                // Don't overwrite class blindly as user might have corrected it manually in JSON
            }
            // -------------------

            // Find or Create Driver
            let driver = newData.drivers.find(d => (d.name || '').trim().toLowerCase() === pResultName.toLowerCase());

            if (!driver) {
                const newId = newData.drivers.length > 0 ? Math.max(...newData.drivers.map(d => d.id)) + 1 : 1;
                driver = {
                    id: newId,
                    name: pResultName || 'Unknown Driver',
                    team: pResult.team || '',
                    car: pResult.car || '',
                    number: pResult.carNumber || '',
                    class: determinedClass,
                    raceResults: []
                };
                newData.drivers.push(driver);
            } else {
                // Update class if needed (e.g. driver switched cars)
                // Or keep sticky? Usually good to update if it's the latest race.
                // Let's trust the XML for the current state.
                // Update class, car, and number if needed (sticky latest)
                driver.class = determinedClass;
                if (pResult.car) driver.car = pResult.car;
                if (pResult.carNumber) driver.number = pResult.carNumber;
                if (pResult.team) driver.team = pResult.team;
            }

            // Create Result Object
            const lapsCount = Number(pResult.laps) || 0;
            const raceResult = {
                raceId: Number(raceIdToUse), // Enforce Number
                position: Number(pResult.position) || 0,
                classPosition: Number(pResult.classPosition) || 0,
                laps: lapsCount,
                finishTime: parseTime(pResult.finishTime || pResult.totalTime) || null,
                bestLap: pResult.bestLap || null,
                status: pResult.status || 'Finished',
                attendance: lapsCount > 0 ? 'Raced' : 'DNS', // Dynamic Attendance
                drivenClass: determinedClass, // Store the class driven in this specific race
                // Don't set points/ballast here - let cloud function calculate
                purpleSectors: Number(pResult.purpleSectors) || 0,
                incidents: Number(pResult.incidents) || 0,
                penaltyCount: Number(pResult.penalties) || 0,
                startPosition: Number(pResult.startPosition) || 0
            };

            // Update or Add Result
            const existingResultIndex = driver.raceResults.findIndex(r => String(r.raceId) === String(raceIdToUse));
            if (existingResultIndex !== -1) {
                // Merge: Keep existing points/ballast, update race data
                const existing = driver.raceResults[existingResultIndex];
                driver.raceResults[existingResultIndex] = {
                    ...existing,
                    ...raceResult,
                    // Preserve calculated values from cloud function
                    points: existing.points || 0,
                    ballastChange: existing.ballastChange || 0,
                    effectiveBallastChange: existing.effectiveBallastChange || 0
                };
            } else {
                // New result: Initialize with 0 (cloud function will calculate)
                driver.raceResults.push({
                    ...raceResult,
                    points: 0,
                    ballastChange: 0,
                    effectiveBallastChange: 0
                });
            }
        });

        // Enforce Correct Season ID
        newData.id = String(currentSeasonId);

        // Save to Cloud
        return await saveSeasonData(currentSeasonId, newData);
    };

    // Derived State (Calculations)
    const processedData = useMemo(() => {
        // PRIORITY 1: Cloud Calculated Standings (PRODUCTION ONLY)
        // In Dev, we ignore this to test local changes/inputs instantly.
        // In Prod, we trust the cloud function for consistency across users.
        // PRIORITY 1: Cloud Calculated Standings (PRODUCTION ONLY)
        // In Dev, we ignore this to test local changes/inputs instantly.
        // In Prod, we trust the cloud function for consistency across users.
        // EXCEPTION: IF USER IS LOGGED IN (Admin), we FORCE local calculation to see optimistic updates (e.g. penalties) instantly.
        const isProd = import.meta.env.PROD;

        console.log("[processedData] Decision factors:", {
            isProd,
            currentUser: !!currentUser,
            cloudStandings: !!cloudStandings,
            cloudStandingsSeason: cloudStandings?.season,
            seasonDataSeason: seasonData?.season,
            cloudRaces: cloudStandings?.races?.length,
            seasonRaces: seasonData?.races?.length
        });

        // Use cloud standings in production if available and valid
        if (isProd && cloudStandings && cloudStandings.season === (seasonData?.season) &&
            (cloudStandings.races || []).length >= (seasonData?.races || []).length) {

            console.log("[processedData] Using CLOUD STANDINGS");
            return {
                ...cloudStandings,
                calculationSource: 'Cloud Backend (Official)'
            };
        }

        console.log("[processedData] Using LOCAL CALCULATION");

        // PRIORITY 2: Local Fallback (The original huge logic)

        // PRIORITY 2: Local Fallback (The original huge logic)

        // Guard Clause: Prevent crash if data is missing/corrupt
        // Guard Clause: Prevent crash if data is missing/corrupt
        if (!seasonData || !seasonData.races || !seasonData.drivers) {
            // console.debug("Waiting for seasonData...");
            return {
                season: seasonData?.season || `Season ${currentSeasonId}`,
                races: [],
                drivers: [],
                currentRound: 0,
                totalRounds: 0
            };
        }

        try {
            // console.log("[ChampionshipContext] Starting data processing...");
            // console.log("[ChampionshipContext] seasonData.drivers:", seasonData?.drivers?.length);
            // console.log("[ChampionshipContext] seasonData.races:", seasonData?.races?.length);

            const data = JSON.parse(JSON.stringify(seasonData));



            // [REMOVED] EMERGENCY HOTFIX: Filter was deleting valid drivers (IDs 40/41)
            // if (data.drivers) {
            //    data.drivers = data.drivers.filter(d => ![40, 41].includes(d.id));
            // }

            // Points System: P1-P25.
            const pointsTable = [
                50, 47, 44, 41, 38, // P1-P5
                35, 34, 33, 32, 31, 30, 29, 28, 27, 26, 25, 24, 23, 22, 21, 20, 19, 18, 17, 16, // P6-P25
                15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1 // P26-P40
            ];

            // 1. Calculate Points for Completed Races
            // Fix: Process races that have results, regardless of status field
            const completedRaces = data.races.filter(r => {
                // A race is "completed" if at least one driver has results for it
                const hasResults = data.drivers.some(d =>
                    d.raceResults && d.raceResults.some(res => String(res.raceId) === String(r.id))
                );
                return hasResults || r.status === 'Completed' || (r.id <= (data.currentRound || 0));
            });

            // console.log("[ChampionshipContext] Completed races found:", completedRaces.length);
            // console.log("[ChampionshipContext] Completed race IDs:", completedRaces.map(r => r.id));

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
                        const isExcluded = exclusions[`${race.id}-${d.id}`];

                        // Calculate total time
                        // Use parseTime to ensure we handle "MM:SS" strings OR Seconds Numbers safely
                        const finishTime = parseTime(result.finishTime || result.totalTime) || 999999;

                        result.laps = Number(result.laps); // Ensure Number
                        result.originalTime = finishTime;
                        result.totalPenalty = penaltyTime;
                        result.finalTime = finishTime + penaltyTime;
                        result.isExcluded = isExcluded;
                    });

                    // Sort by Laps (Desc) then Time (Asc), THEN apply Manual Overrides re-sort
                    // Step 1: Standard Sort
                    participants.sort((a, b) => {
                        const rA = a.raceResults.find(r => String(r.raceId) === String(race.id));
                        const rB = b.raceResults.find(r => String(r.raceId) === String(race.id));

                        // Exclusions drop to bottom
                        if (rA.isExcluded && !rB.isExcluded) return 1;
                        if (!rA.isExcluded && rB.isExcluded) return -1;



                        if (rA.laps !== rB.laps) return rB.laps - rA.laps;

                        // Hybrid Logic: Trust XML Position if NO penalties are involved OR if both are DNFs.
                        // If both are DNF (originalTime >= 900000), we trust the specific finishing order from the game/XML.
                        // Adding 15s to "DNF" doesn't make you "more DNF", so we shouldn't change the order.
                        const hasPenaltyA = (rA.totalPenalty || 0) > 0;
                        const hasPenaltyB = (rB.totalPenalty || 0) > 0;

                        const isDnfA = rA.originalTime >= 900000;
                        const isDnfB = rB.originalTime >= 900000;

                        if (isDnfA && isDnfB) {
                            // Both DNF: Honor original order regardless of penalty
                            const posA = rA.classPosition || rA.position || 0;
                            const posB = rB.classPosition || rB.position || 0;
                            return posA - posB;
                        }

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
                            if (result.isExcluded) {
                                result.points = 0;
                                result.status = "DSQ";
                            } else if (result.laps && result.laps > 0) {
                                result.points = pointsTable[i] || 0;
                            } else {
                                result.points = 0;
                            }

                            // Also attach the manual pos for UI awareness
                            result.manualPosition = entry.manualPos;

                            // Calculate Ballast Change
                            const pos = i + 1;

                            // Check valid finish statuses
                            const validStatuses = ['Finished', 'Finished Normally', 'Completed'];
                            const isFinished = validStatuses.includes(result.status);

                            // Use Helper with Config
                            const rules = data.config && data.config.rules ? data.config.rules : {};

                            // Derive class from result or driver
                            const className = result.drivenClass || driver.class || 'LMGT3';

                            const bChange = getBallastAdjustment(pos, !isFinished, rules, className);
                            result.ballastChange = bChange;
                        }
                    });
                };



                // DYNAMIC CLASS PROCESSING
                // Use config or Fallback to Season 2 Standard
                const classesToProcess = (data.config && data.config.classes) ? data.config.classes : ['LMP2', 'LMGT3'];

                classesToProcess.forEach(cls => processClass(cls));
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
                            } else {
                                // Swap was early (Race 1 or 2), keep all points.
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

            // Add Source Tag
            data.calculationSource = 'Local Browser (Fallback)';
            return data;

        } catch (err) {
            console.error("Critical Error processing championship data:", err);
            return {
                season: seasonData?.season || `Season ${currentSeasonId}`,
                races: [],
                drivers: [],
                currentRound: 0,
                error: err.message
            };
        }
    }, [penalties, manualPositions, exclusions, seasonData, cloudStandings, qualifyingSettings, qualifyingSubmissions]);

    const resetSeasonData = async () => {
        if (!currentUser) {
            alert("Error: You must be logged in to reset data.");
            return;
        }

        try {
            console.log("Resetting Season Data for:", currentSeasonId);
            const defaultData = JSON.parse(JSON.stringify(seasons[currentSeasonId] || latestSeason));

            // Hard Overwrite
            await overwriteSeasonData(currentSeasonId, defaultData);

            // CLEAR CACHED STANDINGS
            await deleteStandings(currentSeasonId);

            console.log("Reset Complete");
        } catch (err) {
            console.error("Reset Failed:", err);
            throw err;
        }
    };

    // Auto-Sync removed to prevent overwriting user data
    // useEffect(() => { ... }, []);

    const exportSeasonData = () => {
        // Create an object that includes the current Race Data, Penalties, and Manual Positions
        const exportObj = {
            ...seasonData,
            penalties: penalties,
            manualPositions: manualPositions,
            exclusions: exclusions
        };

        return JSON.stringify(exportObj, null, 2);
    };



    const value = {
        championshipData: processedData,
        loading,
        currentSeasonId,
        changeSeason,
        seasonList,
        updatePenalty,
        importRaceResults,
        addRound,
        deleteRound,
        resetSeasonData,
        updateManualPosition,
        updateExclusion,
        updateQualifyingSettings,
        submitQualifyingResult,
        deleteSubmission,
        toggleDriverReserveStatus,
        addRosterDriver,
        deleteRosterDriver,
        updateDriverName,
        mergeDrivers,
        updateDriverAttendance,
        manualPositions,
        exclusions,
        qualifyingSettings,
        qualifyingSubmissions,
        licensePoints, // Added licensePoints here
        seasonData, // Expose raw data for Admin (Schedule Management)
        exportSeasonData,
        seasonConfig: (seasons[currentSeasonId]?.config)
            ? { ...(seasonData?.config || {}), ...seasons[currentSeasonId].config }
            : (seasonData?.config || {})
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
