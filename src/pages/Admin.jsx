import { useState, useRef } from 'react';
import { useChampionship } from '../context/ChampionshipContext';
import { parseRaceXml } from '../utils/raceParser';

const Admin = () => {
    const [selectedRace, setSelectedRace] = useState(null);
    const { championshipData, updatePenalty, updateManualPosition, importRaceResults, addRound, deleteRound, resetSeasonData, exportSeasonData } = useChampionship();

    // Export Modal State
    const [showExport, setShowExport] = useState(false);
    const [exportText, setExportText] = useState('');

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

    // Get completed races
    const completedRaces = championshipData.races;

    const getRaceResults = (raceId) => {
        if (!raceId) return [];
        // Flatten all driver results for this race
        const results = [];
        championshipData.drivers.forEach(driver => {
            const result = driver.raceResults.find(r => r.raceId === raceId);
            if (result) {
                results.push({
                    ...result,
                    driverId: driver.id,
                    name: driver.name,
                    team: driver.team,
                    car: driver.car,
                    class: result.drivenClass || driver.class,
                });
            }
        });
        // Sort by newPosition (ascending)
        return results.sort((a, b) => (a.newPosition || a.position || 999) - (b.newPosition || b.position || 999));
    };

    const results = selectedRace ? getRaceResults(selectedRace) : [];

    // New Race Form State
    const [newRaceTrack, setNewRaceTrack] = useState('');
    const [newRaceDate, setNewRaceDate] = useState('');

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
            console.log("Admin requesting delete for:", raceId);
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
            console.log("File selected:", file.name);

            if (file.name.toLowerCase().endsWith('.xml')) {
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
                    const maxId = championshipData.races.length > 0 ? Math.max(...championshipData.races.map(r => r.id)) : 0;
                    const raceIdToUse = maxId + 1;

                    console.log("Importing to Race ID:", raceIdToUse);

                    // Update Context
                    importRaceResults(raceIdToUse, result.results, {
                        trackName: result.trackName,
                        raceDate: result.raceDate
                    });

                    // Success Feedback
                    const driverCount = result.results ? result.results.length : 0;
                    const track = result.trackName || 'Unknown Track';
                    alert(`Success! Imported ${driverCount} drivers for ${track}.`);

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

    return (
        <div>
            {/* Reset Button Area REMOVED entirely per user request */}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2>Admin - Schedule & Penalties</h2>
                <button
                    className="btn btn-outline-danger"
                    style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}
                    onClick={() => {
                        console.log("Reset Button Clicked");
                        if (window.confirm("WARNING: This will perform a HARD RESET. All data will be cleared and the page will reload. Continue?")) {
                            console.log("Reset Confirmed - Triggering Reload");
                            resetSeasonData();
                        }
                    }}
                >
                    Reset All Data
                </button>
                <button
                    className="btn btn-primary"
                    style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}
                    onClick={() => {
                        const data = exportSeasonData();
                        setExportText(data);
                        setShowExport(true);
                    }}
                >
                    Export Season Data
                </button>
            </div>

            {/* Export Modal Overlay */}
            {showExport && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1000,
                    display: 'flex', justifyContent: 'center', alignItems: 'center'
                }}>
                    <div className="glass-panel" style={{ width: '80%', maxWidth: '600px', padding: '2rem', display: 'flex', flexDirection: 'column' }}>
                        <h3>Export Data</h3>
                        <p>Copy the text below and paste it into <strong>src/data/seasons/season2.json</strong> in VS Code.</p>
                        <textarea
                            readOnly
                            value={exportText}
                            style={{
                                width: '100%', height: '300px',
                                backgroundColor: '#1a1a1a', color: '#fff',
                                border: '1px solid #333', padding: '1rem',
                                marginBottom: '1rem'
                            }}
                            onClick={(e) => e.target.select()}
                        />
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                            <button className="btn btn-primary" onClick={() => {
                                navigator.clipboard.writeText(exportText);
                                alert("Copied to Clipboard!");
                            }}>Copy to Clipboard</button>
                            <button className="btn btn-outline-danger" onClick={() => setShowExport(false)}>Close</button>
                        </div>
                    </div>
                </div>
            )}

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
                                        className={`glass-panel ${selectedRace === race.id ? 'selected' : ''}`}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            padding: '0.75rem 1rem',
                                            border: selectedRace === race.id ? '1px solid var(--primary)' : '1px solid transparent',
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        <div
                                            onClick={() => setSelectedRace(race.id)}
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
                                                    console.log('White X Clicked - INSTANT DELETE');

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
                                {selectedRaceName} - Results
                            </h3>

                            {/* LMP2 Results */}
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
                                                {results.filter(r => r.class === 'LMP2').map(result => (
                                                    <tr key={result.driverId} style={{ borderBottom: '1px solid var(--border-color)' }}>
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
                                                                <input
                                                                    type="number"
                                                                    step="0.1"
                                                                    placeholder="0"
                                                                    defaultValue={result.additionalPenalty || ''}
                                                                    id={`penalty-p2-${result.driverId}`}
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
                                                                        const input = document.getElementById(`penalty-p2-${result.driverId}`);
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

                            {/* LMGT3 Results */}
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
                                                    <tr key={result.driverId} style={{ borderBottom: '1px solid var(--border-color)' }}>
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
                                                                <input
                                                                    type="number"
                                                                    step="0.1"
                                                                    placeholder="0"
                                                                    defaultValue={result.additionalPenalty || ''}
                                                                    id={`penalty-gt3-${result.driverId}`}
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
                                                                        const input = document.getElementById(`penalty-gt3-${result.driverId}`);
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
                        </>
                    ) : (
                        <p style={{ color: 'var(--text-muted)' }}>Select a race to manage penalties</p>
                    )}
                </div>
            </div >
        </div >
    );
};

export default Admin;
