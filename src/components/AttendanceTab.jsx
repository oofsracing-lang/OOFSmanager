import { useState } from 'react';
import { useChampionship } from '../context/ChampionshipContext';
import { useAuth } from '../context/AuthContext';

const AttendanceTab = () => {
    const { championshipData, seasonData, toggleDriverReserveStatus, addRosterDriver, deleteRosterDriver, updateDriverName, mergeDrivers, updateDriverAttendance } = useChampionship();
    const { currentUser } = useAuth();
    const [filterClass, setFilterClass] = useState('all');

    // UI States
    const [editingDriver, setEditingDriver] = useState(null); // { name, newName }
    const [showAddModal, setShowAddModal] = useState(false);
    const [newDriver, setNewDriver] = useState({ name: '', class: 'LMGT3', team: '', reserve: false });
    const [showMergeModal, setShowMergeModal] = useState(false);
    const [mergeTarget, setMergeTarget] = useState(''); // The one we are keeping
    const [mergeSource, setMergeSource] = useState(''); // The one we are merging FROM (deleting)


    if (!championshipData || !seasonData) {
        return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;
    }

    // Get driver roster from config
    const driverRoster = seasonData.config?.driverRoster || [];
    // Sort: Active first, then Reserves
    const drivers = [...driverRoster].sort((a, b) => {
        if (a.reserve === b.reserve) return a.name.localeCompare(b.name);
        return a.reserve ? 1 : -1;
    });

    const races = seasonData.races || [];

    // Filter by class
    const filteredDrivers = drivers.filter(d => filterClass === 'all' || d.class === filterClass);

    // Get attendance status for a driver in a race
    const getAttendanceStatus = (rosterDriver, raceId) => {
        const driver = championshipData.drivers.find(d =>
            d.name.toLowerCase().trim() === rosterDriver.name.toLowerCase().trim()
        );

        const result = driver?.raceResults?.find(r => r.raceId === raceId);

        // 1. If result exists, they were there (Regular or Reserve)
        if (result) {
            if (result.attendance) return result.attendance.toLowerCase(); // 'raced' or 'dns'
            if (result.laps > 0) return 'raced';
            return 'dns'; // In XML but 0 laps (fallback)
        }

        // 2. If no result...
        if (rosterDriver.reserve) return 'reserve'; // Reserve absent -> generic/dash
        return 'withdrew'; // Active absent -> Withdrew
    };

    const getStatusBadge = (status, driverName, raceId) => {
        if (!status || status === 'reserve') return <span style={{ color: 'var(--text-muted)' }}>-</span>;

        const styles = {
            raced: { backgroundColor: '#10b981', color: 'white' }, // Green
            withdrew: { backgroundColor: '#f59e0b', color: 'white' }, // Yellow
            dns: { backgroundColor: '#ef4444', color: 'white' }    // Red
        };

        const labels = {
            raced: '✓',
            withdrew: 'W',
            dns: 'DNS'
        };

        const handleStatusClick = async (e) => {
            if (!currentUser) return;
            e.stopPropagation();

            // Cycle: DNS -> Raced -> Withdrew -> DNS
            // Or simpler for now: DNS <-> Raced as requested
            let newStatus = status;
            if (status === 'dns') newStatus = 'raced';
            else if (status === 'raced') newStatus = 'dns';
            // We can add 'withdrew' later if needed, but 'raced' <-> 'dns' is the main fix

            if (newStatus !== status) {
                // Determine correct casing (backend uses 'Raced', 'DNS', etc sometimes title case)
                // The getter returns lowercase. The setter in Context handles it? 
                // Context just sets what we pass. Let's pass 'Raced' or 'DNS' (Title Case) for consistency with XML parser
                const statusMap = {
                    'raced': 'Raced',
                    'dns': 'DNS'
                };

                if (confirm(`Change status from ${status.toUpperCase()} to ${statusMap[newStatus]}?`)) {
                    await updateDriverAttendance(driverName, raceId, statusMap[newStatus]);
                }
            }
        };

        return (
            <span
                onClick={handleStatusClick}
                style={{
                    ...styles[status],
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    display: 'inline-block',
                    minWidth: '40px',
                    textAlign: 'center',
                    cursor: currentUser ? 'pointer' : 'default',
                    opacity: currentUser ? 1 : 0.9
                }} title={`${status.toUpperCase()} - Click to toggle`}>
                {labels[status]}
            </span>
        );
    };

    // Actions
    const handleAddSubmit = async (e) => {
        e.preventDefault();
        if (!newDriver.name) return;
        try {
            await addRosterDriver(newDriver.name, newDriver.class, newDriver.team, newDriver.reserve);
            setShowAddModal(false);
            setNewDriver({ name: '', class: 'LMGT3', team: '', reserve: false });
        } catch (err) {
            alert("Failed to add driver: " + err.message);
        }
    };

    const handleUpdateName = async () => {
        if (!editingDriver || !editingDriver.newName || editingDriver.newName === editingDriver.name) {
            setEditingDriver(null);
            return;
        }

        // Check availability (simple check)
        if (drivers.some(d => d.name.toLowerCase() === editingDriver.newName.toLowerCase())) {
            if (confirm(`Driver "${editingDriver.newName}" already exists. Do you want to MERGE "${editingDriver.name}" into "${editingDriver.newName}"?`)) {
                try {
                    await mergeDrivers(editingDriver.newName, editingDriver.name);
                    setEditingDriver(null);
                } catch (err) {
                    alert("Merge failed: " + err.message);
                }
            }
            return;
        }

        try {
            await updateDriverName(editingDriver.name, editingDriver.newName);
            setEditingDriver(null);
        } catch (err) {
            alert("Update failed: " + err.message);
        }
    };

    const handleDelete = async (name) => {
        if (confirm(`Are you sure you want to delete ${name}? This will remove them from the roster.`)) {
            try {
                await deleteRosterDriver(name);
            } catch (err) {
                alert("Delete failed: " + err.message);
            }
        }
    };

    return (
        <div>
            <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0 }}>Driver Attendance</h3>
                <select
                    value={filterClass}
                    onChange={(e) => setFilterClass(e.target.value)}
                    className="form-control"
                    style={{ width: 'auto' }}
                >
                    <option value="all">All Classes</option>
                    <option value="Hypercar">Hypercar</option>
                    <option value="LMGT3">LMGT3</option>
                </select>

                {currentUser && (
                    <button className="btn btn-primary" onClick={() => setShowAddModal(true)} style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>
                        + Add Driver
                    </button>
                )}

                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Tip: Click name to rename/merge. Click 'R' to toggle Reserve.
                </div>
            </div>

            {/* ADD MODAL */}
            {showAddModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 1100,
                    display: 'flex', justifyContent: 'center', alignItems: 'center'
                }}>
                    <div className="glass-panel" style={{ width: '400px', padding: '2rem' }}>
                        <h4>Add New Driver</h4>
                        <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.3rem' }}>Name</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={newDriver.name}
                                    onChange={e => setNewDriver({ ...newDriver, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.3rem' }}>Class</label>
                                <select
                                    className="form-control"
                                    value={newDriver.class}
                                    onChange={e => setNewDriver({ ...newDriver, class: e.target.value })}
                                >
                                    <option value="LMGT3">LMGT3</option>
                                    <option value="Hypercar">Hypercar</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.3rem' }}>Team (Optional)</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={newDriver.team}
                                    onChange={e => setNewDriver({ ...newDriver, team: e.target.value })}
                                />
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <input
                                    type="checkbox"
                                    checked={newDriver.reserve}
                                    onChange={e => setNewDriver({ ...newDriver, reserve: e.target.checked })}
                                />
                                <label>Reserve Driver?</label>
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button type="button" className="btn" onClick={() => setShowAddModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Add Driver</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div style={{ overflowX: 'auto', maxHeight: '70vh' }}>
                <table className="table" style={{ minWidth: '800px', borderCollapse: 'separate', borderSpacing: 0 }}>
                    <thead style={{ position: 'sticky', top: 0, zIndex: 5 }}>
                        <tr>
                            <th style={{ position: 'sticky', left: 0, backgroundColor: 'var(--bg-secondary)', zIndex: 6, borderBottom: '1px solid var(--border-color)' }}>Driver</th>
                            <th style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)' }}>Class</th>
                            {races.map(race => (
                                <th key={race.id} style={{ minWidth: '60px', textAlign: 'center', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', fontSize: '0.85rem' }}>
                                    R{race.id}
                                    <div style={{ fontSize: '0.7rem', fontWeight: 'normal', color: 'var(--text-muted)' }}>
                                        {race.status === 'Completed' ? new Date(race.date).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' }) : '-'}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredDrivers.map((driver, idx) => (
                            <tr key={idx} style={{ backgroundColor: driver.reserve ? 'rgba(255,255,255,0.02)' : 'transparent' }}>
                                <td style={{
                                    position: 'sticky',
                                    left: 0,
                                    backgroundColor: 'var(--bg-card)',
                                    zIndex: 4,
                                    borderRight: '1px solid var(--border-color)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem'
                                }}>
                                    {currentUser && (
                                        <>
                                            <button
                                                className="btn btn-ghost"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    e.preventDefault();
                                                    handleDelete(driver.name);
                                                }}
                                                style={{
                                                    color: 'white',
                                                    padding: '0',
                                                    marginLeft: '4px',
                                                    width: '24px',
                                                    height: '24px',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer',
                                                    zIndex: 9999,
                                                    position: 'relative',
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center'
                                                }}
                                                title="Delete Driver"
                                            >
                                                <span style={{ fontSize: '0.85rem', lineHeight: 1, pointerEvents: 'none', fontWeight: 'bold' }}>✕</span>
                                            </button>
                                            <button
                                                onClick={() => toggleDriverReserveStatus(driver.name)}
                                                title={driver.reserve ? "Click to Remove Reserve Status" : "Click to Set as Reserve"}
                                                style={{
                                                    fontSize: '0.65rem',
                                                    backgroundColor: driver.reserve ? 'var(--bg-tertiary)' : 'transparent',
                                                    color: driver.reserve ? 'var(--text-muted)' : 'var(--text-dim)',
                                                    padding: '1px 4px',
                                                    borderRadius: '3px',
                                                    border: '1px solid var(--border-color)',
                                                    cursor: 'pointer',
                                                    minWidth: '20px',
                                                    textAlign: 'center',
                                                    opacity: driver.reserve ? 1 : 0.5
                                                }}
                                            >
                                                R
                                            </button>
                                        </>
                                    )}

                                    {/* EDITABLE NAME */}
                                    {editingDriver?.name === driver.name ? (
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <input
                                                type="text"
                                                value={editingDriver.newName}
                                                onChange={e => setEditingDriver({ ...editingDriver, newName: e.target.value })}
                                                style={{ fontSize: '0.8rem', padding: '2px 4px', width: '120px' }}
                                                autoFocus
                                            />
                                            <button onClick={handleUpdateName} style={{ fontSize: '0.7rem', padding: '0 4px', color: 'var(--success)' }}>✓</button>
                                            <button onClick={() => setEditingDriver(null)} style={{ fontSize: '0.7rem', padding: '0 4px', color: 'var(--text-muted)' }}>✕</button>
                                        </div>
                                    ) : (
                                        <span
                                            style={{ fontWeight: 500, cursor: currentUser ? 'pointer' : 'default' }}
                                            onClick={() => currentUser && setEditingDriver({ name: driver.name, newName: driver.name })}
                                            title={currentUser ? "Click to Rename/Merge" : ""}
                                        >
                                            {driver.name}
                                        </span>
                                    )}

                                </td>
                                <td>
                                    <span style={{
                                        padding: '0.25rem 0.5rem',
                                        borderRadius: '4px',
                                        fontSize: '0.7rem',
                                        backgroundColor: driver.class === 'Hypercar' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(139, 92, 246, 0.2)',
                                        color: driver.class === 'Hypercar' ? '#ef4444' : '#a78bfa',
                                        border: '1px solid transparent'
                                    }}>
                                        {driver.class}
                                    </span>
                                </td>
                                {races.map(race => (
                                    <td key={race.id} style={{ textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.05)' }}>
                                        {race.status === 'Completed'
                                            ? getStatusBadge(getAttendanceStatus(driver, race.id), driver.name, race.id)
                                            : <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>•</span>
                                        }
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div style={{ marginTop: '1.5rem', padding: '1rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                <h4 style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>Legend:</h4>
                <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {getStatusBadge('raced')} <span>Raced (laps &gt; 0)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {getStatusBadge('withdrew')} <span>Withdrew (Active Driver No-Show)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {getStatusBadge('dns')} <span>DNS (In XML, 0 laps)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{
                            fontSize: '0.7rem',
                            backgroundColor: 'var(--bg-tertiary)',
                            color: 'var(--text-muted)',
                            padding: '1px 4px',
                            borderRadius: '3px',
                            border: '1px solid var(--border-color)'
                        }}>R</span>
                        <span>Reserve Driver</span>
                    </div>
                </div>
            </div>
            {/* NON-ROSTER DRIVERS SECTION */}
            {
                (() => {
                    // Calculate Non-Roster Drivers (Drivers in data but not in roster config)
                    const nonRosterDrivers = championshipData.drivers.filter(d => {
                        // Normalize names to match roster check
                        const dName = d.name.toLowerCase().trim();
                        const inRoster = driverRoster.some(r => r.name.toLowerCase().trim() === dName);
                        return !inRoster;
                    });

                    if (nonRosterDrivers.length === 0) return null;

                    // Sort by name
                    nonRosterDrivers.sort((a, b) => a.name.localeCompare(b.name));

                    // Filter by class if selected
                    const filteredNonRoster = nonRosterDrivers.filter(d => filterClass === 'all' || d.class === filterClass);

                    if (filteredNonRoster.length === 0) return null;

                    return (
                        <div style={{ marginTop: '3rem' }}>
                            <h4 style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                                Guest / Non-Roster Drivers
                            </h4>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '1rem' }}>
                                These drivers have race results but are not listed in the official driver roster.
                                They may be guest drivers or duplicate entries (misspelled names).
                                <br />
                                <strong>Tip:</strong> You can merge a "Withdrew" roster driver into one of these entries to fix a duplicate.
                            </p>

                            <div style={{ overflowX: 'auto', maxHeight: '50vh' }}>
                                <table className="table" style={{ minWidth: '800px', borderCollapse: 'separate', borderSpacing: 0 }}>
                                    <thead>
                                        <tr>
                                            <th style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>Driver</th>
                                            <th style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>Class</th>
                                            {races.map(race => (
                                                <th key={race.id} style={{ minWidth: '60px', textAlign: 'center', backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                                                    R{race.id}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredNonRoster.map((driver, idx) => (
                                            <tr key={idx}>
                                                <td style={{
                                                    backgroundColor: 'var(--bg-card)',
                                                    borderRight: '1px solid var(--border-color)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.5rem'
                                                }}>
                                                    {/* EDITABLE NAME (Same as above) */}
                                                    {editingDriver?.name === driver.name ? (
                                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                            <input
                                                                type="text"
                                                                value={editingDriver.newName}
                                                                onChange={e => setEditingDriver({ ...editingDriver, newName: e.target.value })}
                                                                style={{ fontSize: '0.8rem', padding: '2px 4px', width: '120px' }}
                                                                autoFocus
                                                            />
                                                            <button onClick={handleUpdateName} style={{ fontSize: '0.7rem', padding: '0 4px', color: 'var(--success)' }}>✓</button>
                                                            <button onClick={() => setEditingDriver(null)} style={{ fontSize: '0.7rem', padding: '0 4px', color: 'var(--text-muted)' }}>✕</button>
                                                        </div>
                                                    ) : (
                                                        <span
                                                            style={{ fontWeight: 500, cursor: currentUser ? 'pointer' : 'default', color: 'var(--text-dim)' }}
                                                            onClick={() => currentUser && setEditingDriver({ name: driver.name, newName: driver.name })}
                                                            title={currentUser ? "Click to Rename/Merge" : ""}
                                                        >
                                                            {driver.name}
                                                        </span>
                                                    )}
                                                </td>
                                                <td>
                                                    <span style={{
                                                        padding: '0.25rem 0.5rem',
                                                        borderRadius: '4px',
                                                        fontSize: '0.7rem',
                                                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                                        color: 'var(--text-muted)',
                                                        border: '1px solid var(--border-color)'
                                                    }}>
                                                        {driver.class || '-'}
                                                    </span>
                                                </td>
                                                {races.map(race => {
                                                    // Modified getAttendanceStatus for non-roster (simple existence check)
                                                    // We can just reuse getAttendanceStatus logic but need to create a mock "rosterDriver" object
                                                    // or simpler: check results directly.
                                                    const result = driver.raceResults?.find(r => r.raceId === race.id);
                                                    let status = null;
                                                    if (result) {
                                                        if (result.attendance) status = result.attendance.toLowerCase();
                                                        else if (result.laps > 0) status = 'raced';
                                                        else status = 'dns';
                                                    }

                                                    return (
                                                        <td key={race.id} style={{ textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.05)' }}>
                                                            {race.status === 'Completed'
                                                                ? (status ? getStatusBadge(status, driver.name, race.id) : <span style={{ color: 'var(--text-muted)' }}>-</span>)
                                                                : <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>•</span>
                                                            }
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    );
                })()
            }
        </div >
    );
};

export default AttendanceTab;
