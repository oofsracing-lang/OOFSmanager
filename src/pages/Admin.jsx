
import { useState, useRef, useEffect } from 'react';
import { useChampionship } from '../context/ChampionshipContext';
import { formatTime as formatTimeHelper, parseTimeInput } from '../utils/timeHelpers';
import { parseRaceXml } from '../utils/raceParser';
import { uploadXmlBackup, subscribeToIncidents, updateIncident, deleteIncident } from '../firebase/db';
import AttendanceTab from '../components/AttendanceTab';
import LicensePointsTab from '../components/LicensePointsTab';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

const Admin = () => {
    const [activeTab, setActiveTab] = useState('results');
    const [selectedRace, setSelectedRace] = useState(null);
    const [incidents, setIncidents] = useState([]); // Stewarding Incidents
    const { championshipData, seasonData, currentSeasonId, updatePenalty, updateManualPosition, updateExclusion, exclusions, importRaceResults, addRound, deleteRound, resetSeasonData, exportSeasonData, qualifyingSettings, updateQualifyingSettings, qualifyingSubmissions, deleteSubmission } = useChampionship();


    const [filterPassedOnly, setFilterPassedOnly] = useState(false);





    // Local state ...
    const [lmp2Laps, setLmp2Laps] = useState(qualifyingSettings?.['LMP2-UR']?.consecutiveLaps || 5);
    const [lmgt3Laps, setLmgt3Laps] = useState(qualifyingSettings?.LMGT3?.consecutiveLaps || 5);
    const [lmp2MaxTimeStr, setLmp2MaxTimeStr] = useState(formatTimeHelper(qualifyingSettings?.['LMP2-UR']?.maxAvgTime || 120));
    const [lmgt3MaxTimeStr, setLmgt3MaxTimeStr] = useState(formatTimeHelper(qualifyingSettings?.LMGT3?.maxAvgTime || 140));

    // Sync local state when Firestore updates
    useEffect(() => {
        if (qualifyingSettings?.['LMP2-UR']?.consecutiveLaps !== undefined) {
            setLmp2Laps(qualifyingSettings['LMP2-UR'].consecutiveLaps);
            setLmp2MaxTimeStr(formatTimeHelper(qualifyingSettings['LMP2-UR'].maxAvgTime || 120));
        }
        if (qualifyingSettings?.LMGT3?.consecutiveLaps !== undefined) {
            setLmgt3Laps(qualifyingSettings.LMGT3.consecutiveLaps);
            setLmgt3MaxTimeStr(formatTimeHelper(qualifyingSettings.LMGT3.maxAvgTime || 140));
        }
    }, [qualifyingSettings]);

    // Safety Check
    if (!championshipData || !championshipData.races) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
                <h3>Data Error</h3>
                <p>The season data appears to be corrupted.</p>
                <button
                    className="btn btn-danger"
                    onClick={() => {
                        // Attempt to clear all known keys
                        const keys = Object.keys(localStorage);
                        keys.forEach(k => {
                            if (k.startsWith('srm_')) localStorage.removeItem(k);
                        });
                        window.location.reload();
                    }}
                    style={{ marginTop: '1rem' }}
                >
                    Hard Reset Data
                </button>
            </div>
        );
    }

    // Get ALL races (Scheduled + Completed)
    const completedRaces = (seasonData && seasonData.races) ? seasonData.races : [];

    const getRaceResults = (raceId) => {
        if (!raceId) return [];
        // Flatten all driver results for this race
        const results = [];
        championshipData.drivers.forEach(driver => {
            const result = driver.raceResults.find(r => String(r.raceId) === String(raceId));
            if (result) {
                results.push({
                    ...result,
                    driverId: driver.id,
                    name: driver.name,
                    team: driver.team,
                    car: driver.car,
                    number: driver.number,
                    class: result.drivenClass || driver.class,
                    isExcluded: exclusions[`${raceId}-${driver.id}`]
                });
            }
        });
        // Sort by newPosition (ascending)
        return results.sort((a, b) => (a.newPosition || a.position || 999) - (b.newPosition || b.position || 999));
    };

    const results = selectedRace ? getRaceResults(selectedRace) : [];

    // DEBUG: Inspect Data state
    useEffect(() => {
        if (!selectedRace) return;
    }, [selectedRace, championshipData]);

    // New Race Form State
    const [newRaceTrack, setNewRaceTrack] = useState('');
    const [newRaceDate, setNewRaceDate] = useState('');

    // Subscribe to incidents when tab is active
    useEffect(() => {
        if (activeTab === 'stewarding' && currentSeasonId) {
            const unsubscribe = subscribeToIncidents(currentSeasonId, setIncidents);
            return () => unsubscribe();
        }
    }, [activeTab, currentSeasonId]);

    const handleAddRound = (e) => {
        e.preventDefault();
        if (newRaceTrack && newRaceDate) {
            addRound(newRaceTrack, newRaceDate);
            setNewRaceTrack('');
            setNewRaceDate('');
            alert(`Added ${newRaceTrack} to schedule.`);
        }
    };

    const handleDeleteRound = async (raceId) => {
        try {
            await deleteRound(Number(raceId));
            alert("Round Deleted Successfully!");

            // If the deleted race was selected, clear selection
            if (selectedRace === raceId) {
                setSelectedRace(null);
            }
        } catch (error) {
            console.error("Delete failed:", error);
            alert("Failed to delete round");
        }
    };

    const handleFiles = async (files) => {
        if (files && files[0]) {
            const file = files[0];

            if (file.name.toLowerCase().endsWith('.xml')) {
                // 1. Upload Backup first
                try {
                    await uploadXmlBackup(file, currentSeasonId);
                } catch (uploadErr) {
                    console.error("Backup Upload Failed:", uploadErr);
                    alert("Warning: Automatic cloud backup failed (check console). Importing data locally anyway.");
                }

                const text = await file.text();
                try {
                    const result = parseRaceXml(text);
                    if (result.error) {
                        alert("Parser Error: " + result.error);
                        return;
                    }

                    if (!result.results || result.results.length === 0) {
                        alert("Warning: No results found in this XML.");
                        return;
                    }

                    // Import Logic

                    // Smart Match Logic
                    const xmlTrack = result.trackName || '';
                    const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, '');

                    // Look for a scheduled race (incomplete) that matches the XML track name
                    // FIX: Use seasonData.races (Raw) to ensure we find ALL existing matches
                    // Use fallback to empty array if undefined
                    const matchingRace = (seasonData?.races || []).find(r => {
                        // Only look at future/current races, or races deemed "Scheduled"
                        // Simple check: Is the name similar?
                        const dbTrack = normalize(r.track);
                        const fileTrack = normalize(xmlTrack);
                        return dbTrack.includes(fileTrack) || fileTrack.includes(dbTrack);
                    });

                    let raceIdToUse;
                    if (matchingRace) {
                        raceIdToUse = matchingRace.id;
                    } else {
                        const maxId = (seasonData && seasonData.races && seasonData.races.length > 0)
                            ? Math.max(...seasonData.races.map(r => r.id))
                            : 0;
                        raceIdToUse = maxId + 1;
                    }

                    // Update Context
                    await importRaceResults(raceIdToUse, result.results, {
                        trackName: result.trackName,
                        raceDate: result.raceDate,
                        dramaLog: result.dramaLog || []
                    });

                    // Success Feedback
                    const driverCount = result.results ? result.results.length : 0;
                    const track = result.trackName || 'Unknown Track';
                    alert(`Success! Imported ${driverCount} drivers for ${track} (Round ${raceIdToUse}).`);

                } catch (err) {
                    console.error("Error parsing/importing XML", err);
                    alert("Error processing file: " + err.message);
                }
            } else {
                alert("Please select a valid XML file (must end in .xml).");
            }
        }
    };

    const formatTime = (time) => {
        if (time === undefined || time === null) return '-';
        const numTime = typeof time === 'string' ? parseFloat(time) : time;
        if (isNaN(numTime)) return time;

        // Threshold: 20 hours (72000s). Anything larger is likely a placeholder/date timestamp misinterpreted
        if (numTime > 72000 || numTime === 999999) return '-';

        const hours = Math.floor(numTime / 3600);
        const minutes = Math.floor((numTime % 3600) / 60);
        const seconds = (numTime % 60);

        const mStr = minutes.toString().padStart(2, '0');
        const sStr = seconds.toFixed(3).padStart(6, '0');

        if (hours > 0) {
            return `${hours}:${mStr}:${sStr}`;
        }
        return `${mStr}:${sStr}`;
    };

    const selectedRaceName = completedRaces.find(r => r.id === selectedRace)?.track || `Round ${selectedRace}`;

    const [isResetting, setIsResetting] = useState(false);
    const [showResetModal, setShowResetModal] = useState(false);

    const handleResetClick = () => {
        setShowResetModal(true);
    };

    const confirmReset = async () => {
        setIsResetting(true);
        try {
            await resetSeasonData(currentSeasonId);
            alert("Reset Complete. The page will now reload.");
            window.location.reload();
        } catch (error) {
            console.error("Reset Failed:", error);
            alert("Reset Failed: " + error.message);
            setIsResetting(false);
            setShowResetModal(false);
        }
    };

    // Debug: Trace what the Admin UI actually received from Context
    // [CLEANUP] Debug logs removed

    return (
        <div>
            {/* Reset Button Area */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2>Admin - Schedule & Penalties</h2>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button
                        className="btn btn-outline-danger"
                        disabled={isResetting}
                        style={{ fontSize: '0.8rem', padding: '0.5rem 1rem', opacity: isResetting ? 0.7 : 1 }}
                        onClick={handleResetClick}
                    >
                        {isResetting ? "Resetting..." : "Reset All Data"}
                    </button>
                </div>
            </div>

            {/* Reset Confirmation Modal */}
            {showResetModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1100,
                    display: 'flex', justifyContent: 'center', alignItems: 'center'
                }}>
                    <div className="glass-panel" style={{ width: '400px', padding: '2rem', textAlign: 'center', border: '1px solid var(--danger)' }}>
                        <h3 style={{ color: 'var(--danger)', marginBottom: '1rem' }}>⚠️ DANGER ZONE</h3>
                        <p style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>
                            You are about to <strong>DELETE ALL DATA</strong> for the current season.
                        </p>
                        <p style={{ marginBottom: '2rem', color: 'var(--text-muted)' }}>
                            Results, penalties, standings, and qualifying data will be permanently erased.
                            <br /><br />
                            <strong>This cannot be undone.</strong>
                        </p>
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                            <button
                                className="btn"
                                onClick={() => setShowResetModal(false)}
                                disabled={isResetting}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-danger"
                                onClick={confirmReset}
                                disabled={isResetting}
                            >
                                {isResetting ? "Deleting..." : "Yes, Delete Everything"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Sub-Tab Navigation */}
            <div style={{
                display: 'flex',
                gap: '0.5rem',
                marginBottom: '2rem',
                borderBottom: '2px solid var(--border-color)',
                paddingBottom: '0'
            }}>
                {['results', 'attendance', 'stewarding', 'qualifying', 'license points'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{
                            padding: '0.75rem 1.5rem',
                            border: 'none',
                            background: activeTab === tab ? 'var(--primary)' : 'transparent',
                            color: activeTab === tab ? 'white' : 'var(--text-main)',
                            borderRadius: '8px 8px 0 0',
                            cursor: 'pointer',
                            fontWeight: activeTab === tab ? 'bold' : 'normal',
                            textTransform: 'capitalize',
                            transition: 'all 0.2s'
                        }}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Results Tab Content */}
            {activeTab === 'results' && (
                <div>



                    {/* Standard XML Ingestion */}
                    {/* Standard XML Ingestion */}
                    <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem', textAlign: 'center' }}>
                        <h3 style={{ marginBottom: '1rem', color: 'var(--text-main)' }}>Upload Race Results</h3>
                        <input
                            type="file"
                            accept=".xml"
                            onChange={(e) => handleFiles(e.target.files)}
                            className="form-control"
                            style={{
                                display: 'inline-block',
                                width: 'auto',
                                padding: '0.5rem',
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-sm)',
                                background: 'var(--bg-card)',
                                color: 'var(--text-main)'
                            }}
                        />
                        <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                            Select a Le Mans Ultimate XML result file to import.
                        </p>
                    </div>
                    {/* End XML Zone */}



                    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '2rem' }}>
                        {/* Race Selection & Management */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                                <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Select Race</h3>
                                {completedRaces.length > 0 ? (
                                    <div style={{ display: 'grid', gap: '0.75rem' }}>
                                        {completedRaces.map(race => (
                                            <div
                                                key={race.id}
                                                className={`glass - panel ${selectedRace === race.id ? 'selected' : ''} `}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    padding: '0.75rem 1rem',
                                                    border: selectedRace === race.id ? '1px solid var(--primary)' : '1px solid transparent',
                                                    transition: 'all 0.2s ease'
                                                }}
                                            >
                                                <div
                                                    onClick={() => {
                                                        console.log("Selecting race:", race.id);
                                                        setSelectedRace(Number(race.id));
                                                    }}
                                                    style={{ flex: 1, cursor: 'pointer', display: 'flex', flexDirection: 'column' }}
                                                >
                                                    <span style={{ fontWeight: 'bold', color: 'white' }}>{race.track || race.name}</span>
                                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                                        {race.date} • {race.status || 'Scheduled'}
                                                    </span>
                                                </div>

                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <button
                                                        className="btn btn-ghost"
                                                        style={{ color: 'var(--text-danger)', padding: '1rem', margin: '-0.5rem', borderRadius: '4px', cursor: 'pointer', zIndex: 9999, position: 'relative' }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            e.preventDefault();

                                                            // INSTANT DELETE - NO CONFIRMATION
                                                            deleteRound(Number(race.id));
                                                        }}
                                                        title="Delete Round"
                                                    >
                                                        <span style={{ fontSize: '1.5rem', lineHeight: 1, pointerEvents: 'none', fontWeight: 'bold' }}>×</span>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                                        No races scheduled yet.
                                    </div>
                                )}
                            </div>

                            {/* Add Round Form */}
                            <div className="glass-panel" style={{ padding: '1.5rem' }}>
                                <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', color: 'var(--text-main)' }}>Add Schedule Entry</h3>
                                <form onSubmit={handleAddRound} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Track Name</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Spa-Francorchamps"
                                            className="form-control"
                                            value={newRaceTrack}
                                            onChange={e => setNewRaceTrack(e.target.value)}
                                            required
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Race Date</label>
                                        <input
                                            type="date"
                                            className="form-control"
                                            value={newRaceDate}
                                            onChange={e => setNewRaceDate(e.target.value)}
                                            required
                                            style={{ width: '100%' }}
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        style={{ marginTop: '0.5rem', width: '100%', justifyContent: 'center' }}
                                    >
                                        + Add to Schedule
                                    </button>
                                </form>
                            </div>
                        </div>

                        {/* Results Table */}
                        <div className="glass-panel" style={{ padding: '1.5rem' }}>
                            {selectedRace ? (
                                <>
                                    <h3 style={{ marginBottom: '1.5rem' }}>
                                        {selectedRaceName} (ID: {selectedRace}) - Results: {results.length}
                                    </h3>

                                    {/* LMP2 Results */}
                                    {results.filter(r => r.class === 'LMP2-UR' || r.class === 'LMP2').length > 0 && (
                                        <div style={{ marginBottom: '2rem' }}>
                                            <h4 style={{ color: 'var(--info)', marginBottom: '1rem' }}>LMP2-UR</h4>
                                            <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                                                <div style={{ overflowX: 'auto' }}>
                                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                                        <thead>
                                                            <tr style={{ borderBottom: '2px solid var(--primary)', textAlign: 'left' }}>
                                                                <th style={{ padding: '0.5rem' }}>Rank</th>
                                                                <th style={{ padding: '0.5rem' }}>Driver</th>
                                                                <th style={{ padding: '0.5rem' }}>Orig Time</th>
                                                                <th style={{ padding: '0.5rem' }}>Penalty</th>
                                                                <th style={{ padding: '0.5rem' }}>Final Time</th>
                                                                <th style={{ padding: '0.5rem' }}>Points</th>
                                                                <th style={{ padding: '0.5rem' }}>Actions</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {results.filter(r => r.class === 'LMP2-UR' || r.class === 'LMP2').map(result => (
                                                                <tr key={result.driverId} style={{ borderBottom: '1px solid var(--border-color)', opacity: result.isExcluded ? 0.5 : 1, textDecoration: result.isExcluded ? 'line-through' : 'none' }}>
                                                                    <td style={{ padding: '0.5rem' }}>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                                            <span style={{ fontWeight: 'bold' }}>P{result.newPosition || result.position}</span>
                                                                            <input
                                                                                type="number"
                                                                                placeholder="#"
                                                                                style={{ width: '40px', padding: '2px', fontSize: '12px' }}
                                                                                defaultValue={result.manualPosition || ''}
                                                                                onBlur={(e) => updateManualPosition(result.driverId, selectedRace, e.target.value)}
                                                                                onKeyDown={(e) => {
                                                                                    if (e.key === 'Enter') updateManualPosition(result.driverId, selectedRace, e.target.value);
                                                                                }}
                                                                            />
                                                                        </div>
                                                                    </td>
                                                                    <td style={{ padding: '0.5rem' }}>{result.name}</td>
                                                                    <td style={{ padding: '0.5rem' }}>{formatTime(result.originalTime)}</td>
                                                                    <td style={{ padding: '0.5rem' }}>
                                                                        {result.totalPenalty > 0 ? (
                                                                            <span style={{ color: 'var(--danger)' }}>
                                                                                +{result.totalPenalty}s
                                                                                {result.additionalPenalty > 0 && ` (${result.originalPenalty || 0}s + ${result.additionalPenalty}s)`}
                                                                            </span>
                                                                        ) : '-'}
                                                                    </td>
                                                                    <td style={{ padding: '0.5rem', fontWeight: 'bold' }}>{formatTime(result.finalTime)}</td>
                                                                    <td style={{ padding: '0.5rem' }}>
                                                                        <span style={{ color: 'var(--success)' }}>
                                                                            {result.newPoints || result.points}
                                                                        </span>
                                                                    </td>
                                                                    <td style={{ padding: '0.5rem' }}>
                                                                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                                            <button
                                                                                className={`btn ${result.isExcluded ? 'btn-danger' : 'btn-outline-danger'} `}
                                                                                style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', minWidth: '35px' }}
                                                                                onClick={() => updateExclusion(result.driverId, selectedRace, !result.isExcluded)}
                                                                                title={result.isExcluded ? "Re-instate Driver" : "Exclude Driver (DSQ)"}
                                                                            >
                                                                                {result.isExcluded ? "IN" : "DQ"}
                                                                            </button>
                                                                            <input
                                                                                type="number"
                                                                                step="0.1"
                                                                                placeholder="0"
                                                                                defaultValue={result.additionalPenalty || ''}
                                                                                id={`penalty - p2 - ${result.driverId} `}
                                                                                style={{
                                                                                    width: '60px',
                                                                                    padding: '0.25rem',
                                                                                    background: 'var(--bg-card)',
                                                                                    border: '1px solid var(--border-color)',
                                                                                    borderRadius: 'var(--radius-sm)',
                                                                                    color: 'var(--text-main)',
                                                                                    fontSize: '0.85rem'
                                                                                }}
                                                                            />
                                                                            <button
                                                                                className="btn btn-primary"
                                                                                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                                                                onClick={() => {
                                                                                    const input = document.getElementById(`penalty - p2 - ${result.driverId} `);
                                                                                    const penalty = parseFloat(input.value);
                                                                                    updatePenalty(result.driverId, selectedRace, isNaN(penalty) ? 0 : penalty);
                                                                                }}
                                                                            >
                                                                                Apply
                                                                            </button>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* LMGT3 Results */}
                                    {results.filter(r => r.class === 'LMGT3').length > 0 && (
                                        <div>
                                            <h4 style={{ color: 'var(--warning)', marginBottom: '1rem' }}>LMGT3</h4>
                                            <div style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                                                <div style={{ overflowX: 'auto' }}>
                                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                                        <thead>
                                                            <tr style={{ borderBottom: '2px solid var(--primary)', textAlign: 'left' }}>
                                                                <th style={{ padding: '0.5rem' }}>Rank</th>
                                                                <th style={{ padding: '0.5rem' }}>Driver</th>
                                                                <th style={{ padding: '0.5rem' }}>Orig Time</th>
                                                                <th style={{ padding: '0.5rem' }}>Penalty</th>
                                                                <th style={{ padding: '0.5rem' }}>Final Time</th>
                                                                <th style={{ padding: '0.5rem' }}>Points</th>
                                                                <th style={{ padding: '0.5rem' }}>Actions</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {results.filter(r => r.class === 'LMGT3').map(result => (
                                                                <tr key={result.driverId} style={{ borderBottom: '1px solid var(--border-color)', opacity: result.isExcluded ? 0.5 : 1, textDecoration: result.isExcluded ? 'line-through' : 'none' }}>
                                                                    <td style={{ padding: '0.5rem' }}>
                                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                                            <span style={{ fontWeight: 'bold' }}>P{result.newPosition || result.classPosition || result.position}</span>
                                                                            <input
                                                                                type="number"
                                                                                placeholder="#"
                                                                                style={{ width: '40px', padding: '2px', fontSize: '12px' }}
                                                                                defaultValue={result.manualPosition || ''}
                                                                                onBlur={(e) => updateManualPosition(result.driverId, selectedRace, e.target.value)}
                                                                                onKeyDown={(e) => {
                                                                                    if (e.key === 'Enter') updateManualPosition(result.driverId, selectedRace, e.target.value);
                                                                                }}
                                                                            />
                                                                        </div>
                                                                    </td>
                                                                    <td style={{ padding: '0.5rem' }}>{result.name}</td>
                                                                    <td style={{ padding: '0.5rem' }}>{formatTime(result.originalTime)}</td>
                                                                    <td style={{ padding: '0.5rem' }}>
                                                                        {result.totalPenalty > 0 ? (
                                                                            <span style={{ color: 'var(--danger)' }}>
                                                                                +{result.totalPenalty}s
                                                                                {result.additionalPenalty > 0 && ` (${result.originalPenalty || 0}s + ${result.additionalPenalty}s)`}
                                                                            </span>
                                                                        ) : '-'}
                                                                    </td>
                                                                    <td style={{ padding: '0.5rem', fontWeight: 'bold' }}>{formatTime(result.finalTime)}</td>
                                                                    <td style={{ padding: '0.5rem' }}>
                                                                        <span style={{ color: 'var(--success)' }}>
                                                                            {result.newPoints || result.points}
                                                                        </span>
                                                                    </td>
                                                                    <td style={{ padding: '0.5rem' }}>
                                                                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                                            <button
                                                                                className={`btn ${result.isExcluded ? 'btn-danger' : 'btn-outline-danger'} `}
                                                                                style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', minWidth: '35px' }}
                                                                                onClick={() => updateExclusion(result.driverId, selectedRace, !result.isExcluded)}
                                                                                title={result.isExcluded ? "Re-instate Driver" : "Exclude Driver (DSQ)"}
                                                                            >
                                                                                {result.isExcluded ? "IN" : "DQ"}
                                                                            </button>
                                                                            <input
                                                                                type="number"
                                                                                step="0.1"
                                                                                placeholder="0"
                                                                                defaultValue={result.additionalPenalty || ''}
                                                                                id={`penalty - gt3 - ${result.driverId} `}
                                                                                style={{
                                                                                    width: '60px',
                                                                                    padding: '0.25rem',
                                                                                    background: 'var(--bg-card)',
                                                                                    border: '1px solid var(--border-color)',
                                                                                    borderRadius: 'var(--radius-sm)',
                                                                                    color: 'var(--text-main)',
                                                                                    fontSize: '0.85rem'
                                                                                }}
                                                                            />
                                                                            <button
                                                                                className="btn btn-primary"
                                                                                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                                                                onClick={() => {
                                                                                    const input = document.getElementById(`penalty - gt3 - ${result.driverId} `);
                                                                                    const penalty = parseFloat(input.value);
                                                                                    updatePenalty(result.driverId, selectedRace, isNaN(penalty) ? 0 : penalty);
                                                                                }}
                                                                            >
                                                                                Apply
                                                                            </button>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <p style={{ color: 'var(--text-muted)' }}>Select a race to manage penalties</p>
                            )}
                        </div>
                    </div >



                </div >
            )}

            {/* Attendance Tab Content */}
            {activeTab === 'attendance' && (
                <AttendanceTab />
            )}

            {/* Stewarding Tab Content */}
            {activeTab === 'stewarding' && (
                <div className="glass-panel" style={{ padding: '0' }}>
                    <div style={{ padding: '2rem', borderBottom: '1px solid var(--border-color)' }}>
                        <h3>Incident Reviews ({incidents.length})</h3>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ textAlign: 'left', background: 'rgba(255,255,255,0.05)' }}>
                                    <th style={{ padding: '1rem', width: '10%' }}>Submission Date</th>
                                    <th style={{ padding: '1rem', width: '15%' }}>Race Session</th>
                                    <th style={{ padding: '1rem', width: '10%' }}>Car(s) Involved</th>
                                    <th style={{ padding: '1rem', width: '15%' }}>Timestamp/Lap</th>
                                    <th style={{ padding: '1rem', width: '25%' }}>Descriptions</th>
                                    <th style={{ padding: '1rem', width: '10%' }}>Stewarding Decision</th>
                                    <th style={{ padding: '1rem', width: '5%' }}>Time Penalty</th>
                                    <th style={{ padding: '1rem', width: '5%' }}>Penalized Car(s)</th>
                                    <th style={{ padding: '1rem' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {incidents.map((incident) => (
                                    <tr key={incident.id} style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: incident.status === 'Complete' ? 'rgba(16, 185, 129, 0.05)' : 'transparent' }}>
                                        <td style={{ padding: '1rem', verticalAlign: 'top', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                            {incident.createdAt ? new Date(incident.createdAt).toLocaleString() : '-'}
                                        </td>
                                        <td style={{ padding: '1rem', verticalAlign: 'top' }}>
                                            <select
                                                className="form-control input-ghost"
                                                defaultValue={incident.raceId}
                                                onChange={(e) => updateIncident(incident.id, { raceId: e.target.value })}
                                                style={{ width: '100%', fontSize: '0.85rem', padding: '0.4rem' }}
                                            >
                                                {championshipData?.races?.map(race => (
                                                    <option key={race.id} value={race.id}>
                                                        {race.track || `Round ${race.id}`}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                        <td style={{ padding: '1rem', verticalAlign: 'top' }}>
                                            <input
                                                type="text"
                                                className="form-control"
                                                defaultValue={incident.carNumbers}
                                                onBlur={(e) => updateIncident(incident.id, { carNumbers: e.target.value })}
                                                style={{ width: '100%', fontSize: '0.9rem', padding: '0.4rem', background: 'transparent', border: '1px solid transparent', color: 'white' }}
                                            />
                                        </td>
                                        <td style={{ padding: '1rem', verticalAlign: 'top' }}>
                                            <input
                                                type="text"
                                                className="form-control"
                                                defaultValue={incident.timestamp}
                                                onBlur={(e) => updateIncident(incident.id, { timestamp: e.target.value })}
                                                style={{ width: '100%', fontSize: '0.9rem', color: 'var(--text-muted)', background: 'transparent', border: '1px solid transparent' }}
                                            />
                                        </td>
                                        <td style={{ padding: '1rem', verticalAlign: 'top' }}>
                                            <div style={{ marginBottom: '1rem' }}>
                                                <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Driver Report</div>
                                                <textarea
                                                    className="form-control"
                                                    defaultValue={incident.description}
                                                    onBlur={(e) => updateIncident(incident.id, { description: e.target.value })}
                                                    rows="3"
                                                    style={{ width: '100%', fontSize: '0.9rem', color: 'var(--text-muted)', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)' }}
                                                    placeholder="Driver's description..."
                                                />
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#60a5fa', marginBottom: '0.25rem' }}>Steward Notes</div>
                                                <textarea
                                                    className="form-control"
                                                    defaultValue={incident.stewardNotes || ''}
                                                    onBlur={(e) => updateIncident(incident.id, { stewardNotes: e.target.value })}
                                                    rows="3"
                                                    style={{ width: '100%', fontSize: '0.9rem', color: 'white', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)' }}
                                                    placeholder="Notes for the driver..."
                                                />
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem', verticalAlign: 'top' }}>
                                            <select
                                                className="form-control input-ghost"
                                                defaultValue={incident.decision || ''}
                                                onChange={(e) => updateIncident(incident.id, { decision: e.target.value })}
                                                style={{ padding: '0.4rem', fontSize: '0.9rem', width: '100%' }}
                                            >
                                                <option value="">-- No Decision --</option>
                                                <option value="No Further Action">No Further Action</option>
                                                <option value="Racing Incident">Racing Incident</option>
                                                <option value="Warning">Warning</option>
                                                <option value="Time Penalty">Time Penalty</option>
                                                <option value="Drive Through">Drive Through</option>
                                                <option value="Stop and Go">Stop and Go</option>
                                                <option value="Disqualification">Disqualification</option>
                                                <option value="Avoidable Contact">Avoidable Contact</option>
                                                <option value="Unsafe Rejoin">Unsafe Rejoin</option>
                                            </select>
                                        </td>
                                        <td style={{ padding: '1rem', verticalAlign: 'top' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                <input
                                                    type="number"
                                                    className="form-control input-ghost"
                                                    defaultValue={incident.timePenalty || ''}
                                                    onBlur={(e) => updateIncident(incident.id, { timePenalty: parseFloat(e.target.value) })}
                                                    style={{ width: '50px', padding: '0.4rem', borderRadius: '4px' }}
                                                />
                                                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>s</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem', verticalAlign: 'top' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                                {incident.raceId ? (
                                                    <select
                                                        className="form-control input-ghost"
                                                        value={incident.penalizedDriverId || ''}
                                                        onChange={(e) => updateIncident(incident.id, { penalizedDriverId: Number(e.target.value) })}
                                                        style={{
                                                            width: '120px',
                                                            padding: '0.4rem',
                                                            borderRadius: '4px',
                                                            fontSize: '0.85rem'
                                                        }}
                                                    >
                                                        <option value="">-- Select Driver --</option>
                                                        {getRaceResults(incident.raceId).map(driver => (
                                                            <option key={driver.driverId} value={driver.driverId}>
                                                                #{driver.carNumber || driver.number} - {driver.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Select Race First</span>
                                                )}
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem', verticalAlign: 'top', textAlign: 'right' }}>
                                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                <button
                                                    className="btn btn-icon"
                                                    style={{
                                                        backgroundColor: incident.status === 'Complete' ? '#10b981' : 'transparent',
                                                        border: '1px solid #10b981',
                                                        color: incident.status === 'Complete' ? 'white' : '#10b981',
                                                        cursor: 'pointer',
                                                        opacity: (!incident.penalizedDriverId && incident.timePenalty > 0) ? 0.5 : 1
                                                    }}
                                                    onClick={async () => {
                                                        const isCompleting = incident.status !== 'Complete';

                                                        // 1. Update Incident Status
                                                        await updateIncident(incident.id, { status: isCompleting ? 'Complete' : 'Pending' });

                                                        // 2. If Completing, Apply Time Penalty & License Points (via updated Context)
                                                        if (isCompleting && incident.timePenalty && incident.timePenalty > 0 && incident.penalizedDriverId) {
                                                            try {
                                                                // This triggers Context -> Auto-Recalc Standings -> Auto-Log License Points (if > 15s)
                                                                // We pass the "Decision" text as the reason for the log
                                                                // Note: updatePenalty is smart enough to handle the data flow
                                                                await updatePenalty(
                                                                    incident.penalizedDriverId,
                                                                    incident.raceId,
                                                                    incident.timePenalty,
                                                                    incident.decision || 'Admin Penalty' // Pass decision as reason
                                                                );
                                                                alert(`Penalty Applied: +${incident.timePenalty}s to Driver ID ${incident.penalizedDriverId}`);
                                                            } catch (err) {
                                                                console.error("Smart Stewarding Error:", err);
                                                                alert("Error applying penalty logic. Check console.");
                                                            }
                                                        }
                                                    }}
                                                    title={incident.status === 'Complete' ? "Mark as Pending" : "Commit Decision (Apply Penalties)"}
                                                    disabled={!incident.penalizedDriverId && incident.timePenalty > 0}
                                                >
                                                    {incident.status === 'Complete' ? '✓' : '⚡'}
                                                </button>
                                                <button
                                                    className="btn btn-icon btn-danger"
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        // Match Qualifying Logic: Immediate Delete (No Confirm) + Optimistic Update
                                                        try {
                                                            setIncidents(prev => prev.filter(i => i.id !== incident.id));
                                                            await deleteIncident(incident.id);
                                                        } catch (err) {
                                                            console.error("Failed to delete:", err);
                                                            alert("Failed to delete: " + err.message);
                                                            // Optional: Revert optimistic update here if needed
                                                        }
                                                    }}
                                                    title="Delete"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {incidents.length === 0 && (
                                    <tr>
                                        <td colSpan="9" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                            No active protests or incidents.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Qualifying Tab Content */}
            {activeTab === 'qualifying' && (
                <div>
                    {/* Qualifying Criteria Settings */}
                    <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
                        <h3 style={{ marginBottom: '1.5rem' }}>Qualifying Criteria</h3>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                            {/* LMP2-UR Criteria */}
                            <div style={{ padding: '1.5rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                                <h4 style={{ color: '#3b82f6', marginBottom: '1rem' }}>LMP2-UR Criteria</h4>

                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                                        Consecutive Laps Required
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="10"
                                        value={lmp2Laps}
                                        onChange={(e) => setLmp2Laps(parseInt(e.target.value))}
                                        className="form-control"
                                        style={{ width: '100px' }}
                                    />
                                </div>

                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                                        Max Average Time (MM:ss.sss)
                                    </label>
                                    <input
                                        type="text"
                                        value={lmp2MaxTimeStr}
                                        onChange={(e) => setLmp2MaxTimeStr(e.target.value)}
                                        className="form-control"
                                        style={{ width: '150px' }}
                                        placeholder="01:30.000"
                                    />
                                    <small style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                        Saved: {formatTimeHelper(qualifyingSettings?.['LMP2-UR']?.maxAvgTime || 120)} ({(qualifyingSettings?.['LMP2-UR']?.maxAvgTime || 120).toFixed(3)}s)
                                    </small>
                                </div>

                                <button
                                    className="btn btn-primary"
                                    onClick={() => {
                                        const seconds = parseTimeInput(lmp2MaxTimeStr);
                                        if (seconds === null) {
                                            alert("Invalid Time Format (MM:ss.sss)");
                                            return;
                                        }
                                        updateQualifyingSettings('LMP2-UR', {
                                            consecutiveLaps: lmp2Laps,
                                            maxAvgTime: seconds
                                        });
                                    }}
                                    style={{ fontSize: '0.9rem' }}
                                >
                                    Save LMP2-UR Settings
                                </button>
                            </div>

                            {/* LMGT3 Criteria */}
                            <div style={{ padding: '1.5rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                                <h4 style={{ color: '#8b5cf6', marginBottom: '1rem' }}>LMGT3 Criteria</h4>

                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                                        Consecutive Laps Required
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="10"
                                        value={lmgt3Laps}
                                        onChange={(e) => setLmgt3Laps(parseInt(e.target.value))}
                                        className="form-control"
                                        style={{ width: '100px' }}
                                    />
                                </div>

                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                                        Max Average Time (MM:ss.sss)
                                    </label>
                                    <input
                                        type="text"
                                        value={lmgt3MaxTimeStr}
                                        onChange={(e) => setLmgt3MaxTimeStr(e.target.value)}
                                        className="form-control"
                                        style={{ width: '150px' }}
                                        placeholder="02:00.000"
                                    />
                                    <small style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                        Saved: {formatTimeHelper(qualifyingSettings?.LMGT3?.maxAvgTime || 140)} ({(qualifyingSettings?.LMGT3?.maxAvgTime || 140).toFixed(3)}s)
                                    </small>
                                </div>

                                <button
                                    className="btn btn-primary"
                                    onClick={() => {
                                        const seconds = parseTimeInput(lmgt3MaxTimeStr);
                                        if (seconds === null) {
                                            alert("Invalid Time Format (MM:ss.sss)");
                                            return;
                                        }
                                        updateQualifyingSettings('LMGT3', {
                                            consecutiveLaps: lmgt3Laps,
                                            maxAvgTime: seconds
                                        });
                                    }}
                                    style={{ fontSize: '0.9rem' }}
                                >
                                    Save LMGT3 Settings
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Qualifying Submissions History */}
                    <div className="glass-panel" style={{ padding: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <div>
                                <h3>Qualifying Submissions History</h3>
                            </div>

                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={filterPassedOnly}
                                    onChange={(e) => setFilterPassedOnly(e.target.checked)}
                                />
                                <span>Show Passed Only</span>
                            </label>
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', width: '200px' }}>Event Date (XML)</th>
                                        <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>Driver</th>
                                        <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>Track</th>
                                        <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>Class</th>
                                        <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>Result</th>
                                        <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>Best Avg</th>
                                        <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>Splits</th>
                                        <th style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)' }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(filterPassedOnly
                                        ? qualifyingSubmissions.filter(s => s.passed)
                                        : qualifyingSubmissions
                                    ).map((submission) => (
                                        <tr key={submission.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            <td style={{ padding: '1rem', verticalAlign: 'middle' }}>
                                                <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>
                                                    {new Date(submission.xmlDate || submission.timestamp).toLocaleString('en-US', {
                                                        month: 'numeric',
                                                        day: 'numeric',
                                                        year: 'numeric',
                                                        hour: 'numeric',
                                                        minute: '2-digit',
                                                        hour12: true
                                                    })}
                                                </div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                    Sub: {new Date(submission.createdAt || submission.timestamp).toLocaleString('en-US', {
                                                        month: 'numeric',
                                                        day: 'numeric',
                                                        year: 'numeric',
                                                        hour: 'numeric',
                                                        minute: '2-digit',
                                                        hour12: true
                                                    })}
                                                </div>
                                            </td>
                                            <td style={{ padding: '1rem', verticalAlign: 'middle', fontWeight: 500 }}>{submission.driverName}</td>
                                            <td style={{ padding: '1rem', verticalAlign: 'middle' }}>{submission.track}</td>
                                            <td style={{ padding: '1rem', verticalAlign: 'middle' }}>
                                                <span style={{
                                                    padding: '0.25rem 0.5rem',
                                                    borderRadius: '4px',
                                                    fontSize: '0.75rem',
                                                    backgroundColor: submission.carClass === 'LMP2-UR' ? '#3b82f6' : '#8b5cf6',
                                                    color: 'white',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {submission.carClass}
                                                </span>
                                            </td>
                                            <td style={{ padding: '1rem', verticalAlign: 'middle' }}>
                                                <span style={{
                                                    padding: '0.25rem 0.75rem',
                                                    borderRadius: '4px',
                                                    fontSize: '0.85rem',
                                                    fontWeight: 'bold',
                                                    backgroundColor: submission.passed ? '#10b981' : '#ef4444',
                                                    color: 'white'
                                                }}>
                                                    {submission.passed ? 'PASSED' : 'FAILED'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '1rem', verticalAlign: 'middle', fontFamily: 'monospace', fontSize: '0.9rem' }}>
                                                {formatTimeHelper(submission.bestAverage || submission.bestAvg)}
                                            </td>
                                            <td style={{ padding: '1rem', verticalAlign: 'middle' }}>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', maxWidth: '300px' }}>
                                                    {(submission.bestLaps || submission.splits || []).map((split, idx) => {
                                                        const val = typeof split === 'object' ? split.time : split;
                                                        return (
                                                            <span
                                                                key={idx}
                                                                style={{
                                                                    padding: '0.15rem 0.4rem',
                                                                    borderRadius: '3px',
                                                                    fontSize: '0.7rem',
                                                                    backgroundColor: 'var(--bg-tertiary)',
                                                                    fontFamily: 'monospace'
                                                                }}
                                                            >
                                                                {formatTimeHelper(val)}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                                {!submission.passed && submission.note && (
                                                    <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.25rem' }}>
                                                        {submission.note}
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{ padding: '1rem', verticalAlign: 'middle' }}>
                                                <button
                                                    className="btn btn-icon btn-danger"
                                                    onClick={() => deleteSubmission(submission.id)}
                                                    title="Delete Submission"
                                                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem', lineHeight: 1 }}
                                                >
                                                    ✕
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* License Points Tab Content */}
            {activeTab === 'license points' && (
                <LicensePointsTab />
            )}

        </div>
    );
};

export default Admin;
