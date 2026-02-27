import { useState, useEffect } from 'react';
import { useChampionship } from '../context/ChampionshipContext';
import { useAuth } from '../context/AuthContext';
import {
    subscribeToLicensePoints,
    updateDriverLicensePoints,
    removeDriverLicensePoints,
    markPenaltyServed,
    calculateLicenseStatus
} from '../firebase/db';

const LicensePointsTab = () => {
    const { championshipData, currentSeasonId, seasonData, licensePoints } = useChampionship();
    const { currentUser } = useAuth();
    // const [licenseRecords, setLicenseRecords] = useState([]); // Removed local state
    const licenseRecords = licensePoints || []; // Use context data
    const [selectedDriver, setSelectedDriver] = useState(null);
    const [showAddDriver, setShowAddDriver] = useState(false);
    const [showLogModal, setShowLogModal] = useState(false);

    // Add Driver Form
    const [newDriverName, setNewDriverName] = useState('');
    const [manualPoints, setManualPoints] = useState('');
    const [manualReason, setManualReason] = useState('');

    // Edit Points Modal
    const [editDriver, setEditDriver] = useState(null);
    const [editPointsVal, setEditPointsVal] = useState('');
    const [editReasonVal, setEditReasonVal] = useState('');

    // Delete Confirmation Modal
    const [deleteDriver, setDeleteDriver] = useState(null);

    // Mark Penalty Form (Restored)
    const [penaltyType, setPenaltyType] = useState('DT');
    const [penaltyNote, setPenaltyNote] = useState('');

    // Subscribe to license points
    // useEffect(() => { ... }) - REMOVED, using Context now.

    const handleAddDriver = async (e) => {
        e.preventDefault();
        if (!currentUser || !newDriverName) return;

        // Find driver in roster by name
        const rosterEntry = seasonData?.config?.driverRoster?.find(
            d => (d.name || '').toLowerCase() === (newDriverName || '').toLowerCase()
        );

        if (!rosterEntry) {
            alert('Driver not found in roster');
            return;
        }

        // Find driver ID from drivers list
        const driver = championshipData?.drivers?.find(
            d => (d.name || '').toLowerCase() === (rosterEntry.name || '').toLowerCase()
        );

        if (!driver) {
            alert('Driver has not raced yet. Points can only be added to drivers with race results.');
            return;
        }

        const points = parseInt(manualPoints) || 0;
        if (points <= 0) {
            alert('Please enter a positive number of points');
            return;
        }

        try {
            await updateDriverLicensePoints(
                currentSeasonId,
                driver.id,
                driver.name,
                points,
                manualReason || 'Manual addition',
                'manual_add',
                null,
                currentUser.email
            );
            setShowAddDriver(false);
            setNewDriverName('');
            setManualPoints('');
            setManualReason('');
        } catch (err) {
            console.error('Failed to add driver:', err);
            alert('Failed to add driver to license system');
        }
    };

    // Open Edit Modal
    const openEditModal = (record) => {
        if (!currentUser) {
            alert("You must be logged in to edit points.");
            return;
        }
        setEditDriver(record);
        setEditPointsVal('');
        setEditReasonVal('');
    };

    // Submit Edit
    const submitEditPoints = async (e) => {
        e.preventDefault();
        if (!editDriver || !currentUser) return;

        const points = parseInt(editPointsVal);
        if (isNaN(points)) {
            alert('Invalid number');
            return;
        }

        try {
            await updateDriverLicensePoints(
                currentSeasonId,
                editDriver.driverId,
                editDriver.driverName,
                points,
                editReasonVal,
                'manual_adjustment',
                null,
                currentUser.email || 'Admin'
            );
            setEditDriver(null);
            setEditPointsVal('');
            setEditReasonVal('');
        } catch (err) {
            console.error('Failed to update points:', err);
            alert('Failed to update points: ' + err.message);
        }
    };


    // Open Delete Modal
    const openDeleteModal = (record) => {
        setDeleteDriver(record);
    };

    const confirmDelete = async () => {
        if (!deleteDriver) return;
        try {
            await removeDriverLicensePoints(currentSeasonId, deleteDriver.driverId);
            setDeleteDriver(null);
        } catch (err) {
            console.error('Failed to remove driver:', err);
            alert('Failed to remove driver: ' + err.message);
        }
    };

    const handleMarkServed = async (e) => {
        e.preventDefault();
        if (!selectedDriver || !penaltyNote) return;

        try {
            await markPenaltyServed(
                currentSeasonId,
                selectedDriver.driverId,
                penaltyType,
                penaltyNote,
                currentUser.email
            );
            setPenaltyType('DT');
            setPenaltyNote('');
            alert('Penalty marked as served');
        } catch (err) {
            console.error('Failed to mark penalty served:', err);
            alert('Failed to mark penalty');
        }
    };

    const formatDate = (isoString) => {
        const date = new Date(isoString);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    // Get roster and filter:
    // 1. Must be in roster
    // 2. Must NOT already be in license system
    // 3. Must have participated in a race (exist in championshipData.drivers)
    const roster = seasonData?.config?.driverRoster || [];
    const participants = championshipData?.drivers || [];

    const availableDrivers = roster.filter(rosterEntry => {
        const isAlreadyTracked = licenseRecords.find(r => (r.driverName || '').toLowerCase() === (rosterEntry.name || '').toLowerCase());
        const hasRaced = participants.find(p => (p.name || '').toLowerCase() === (rosterEntry.name || '').toLowerCase());
        return !isAlreadyTracked && hasRaced;
    });

    return (
        <div style={{ padding: '2rem' }}>
            {/* Rules Header */}
            <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', background: 'rgba(255, 100, 100, 0.1)' }}>
                <h3 style={{ marginBottom: '1rem', color: 'var(--danger)' }}>📋 License Point System Rules</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', fontSize: '0.95rem' }}>
                    <div>• <strong>1 point</strong> per 15 seconds of penalties</div>
                    <div>• <strong>2 points</strong> for Steward-issued DT</div>
                    <div>• <strong>3 points</strong> = Pre-race DT (3 laps to serve)</div>
                    <div>• <strong>5 points</strong> = Qualifying ban</div>
                    <div>• <strong>7 points</strong> = Full race ban</div>
                </div>
            </div>

            {/* Add Driver Button */}
            <div style={{ marginBottom: '2rem' }}>
                <button
                    className="btn btn-primary"
                    onClick={() => setShowAddDriver(!showAddDriver)}
                >
                    + Add Driver to License System
                </button>
            </div>

            {/* Add Driver Form */}
            {showAddDriver && (
                <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
                    <h3 style={{ marginBottom: '1.5rem' }}>Add Driver</h3>
                    <form onSubmit={handleAddDriver} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Select Driver</label>
                            <select
                                className="form-control"
                                value={newDriverName}
                                onChange={(e) => setNewDriverName(e.target.value)}
                                required
                            >
                                <option value="">-- Select Driver --</option>
                                {availableDrivers.map((rosterEntry, idx) => (
                                    <option key={idx} value={rosterEntry.name}>
                                        {rosterEntry.name} ({rosterEntry.class})
                                    </option>
                                ))}
                            </select>
                            {availableDrivers.length === 0 && (
                                <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--warning)' }}>
                                    ⚠️ Only drivers who have participated in at least one race can be added.
                                </div>
                            )}
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Initial Points</label>
                            <input
                                type="number"
                                className="form-control"
                                value={manualPoints}
                                onChange={(e) => setManualPoints(e.target.value)}
                                min="1"
                                required
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Reason</label>
                            <input
                                type="text"
                                className="form-control"
                                value={manualReason}
                                onChange={(e) => setManualReason(e.target.value)}
                                placeholder="Why are these points being added?"
                                required
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button type="submit" className="btn btn-primary">Add Driver</button>
                            <button type="button" className="btn" onClick={() => setShowAddDriver(false)}>Cancel</button>
                        </div>
                    </form>
                </div>
            )}

            {/* License Points Table */}
            <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
                    <h3>Driver License Points ({licenseRecords.length})</h3>
                </div>

                {licenseRecords.length === 0 ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No drivers with license points yet.
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ background: 'rgba(255,255,255,0.05)', textAlign: 'left' }}>
                                    <th style={{ padding: '1rem' }}>Driver</th>
                                    <th style={{ padding: '1rem' }}>Points</th>
                                    <th style={{ padding: '1rem' }}>Status</th>
                                    <th style={{ padding: '1rem' }}>Last Updated</th>
                                    <th style={{ padding: '1rem' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {licenseRecords.map(record => {
                                    const status = calculateLicenseStatus(record.totalPoints, record.highestServedThreshold || 0);
                                    return (
                                        <tr key={record.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <td style={{ padding: '1rem', fontWeight: 'bold' }}>{record.driverName}</td>
                                            <td style={{ padding: '1rem', fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--danger)' }}>
                                                {record.totalPoints}
                                            </td>
                                            <td style={{ padding: '1rem' }}>
                                                <span style={{
                                                    padding: '0.25rem 0.75rem',
                                                    borderRadius: '4px',
                                                    fontSize: '0.85rem',
                                                    fontWeight: 'bold',
                                                    background: `var(--${status.color})`,
                                                    color: '#000'
                                                }}>
                                                    {status.emoji} {status.description}
                                                </span>
                                            </td>
                                            <td style={{ padding: '1rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                                {record.updatedAt ? formatDate(record.updatedAt) : '-'}
                                            </td>
                                            <td style={{ padding: '1rem' }}>
                                                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                                    <button
                                                        className="btn btn-sm"
                                                        onClick={() => {
                                                            setSelectedDriver(record);
                                                            setShowLogModal(true);
                                                        }}
                                                    >
                                                        View Log
                                                    </button>
                                                    <button
                                                        className="btn btn-sm"
                                                        onClick={() => openEditModal(record)}
                                                    >
                                                        Edit Points
                                                    </button>
                                                    <button
                                                        className="btn btn-sm btn-danger"
                                                        onClick={() => openDeleteModal(record)}
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* EDIT POINTS MODAL */}
            {editDriver && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100
                }}>
                    <div className="glass-panel" style={{ width: '400px', padding: '2rem' }}>
                        <h3 style={{ marginBottom: '1.5rem' }}>Edit Points for {editDriver.driverName}</h3>
                        <form onSubmit={submitEditPoints}>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Points to Add/Subtract</label>
                                <input
                                    type="number"
                                    className="form-control"
                                    value={editPointsVal}
                                    onChange={e => setEditPointsVal(e.target.value)}
                                    placeholder="e.g. 2 or -2"
                                    required
                                    autoFocus
                                />
                            </div>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Reason</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={editReasonVal}
                                    onChange={e => setEditReasonVal(e.target.value)}
                                    placeholder="Reason for adjustment"
                                    required
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                                <button type="button" className="btn" onClick={() => setEditDriver(null)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* DELETE CONFIRMATION MODAL */}
            {deleteDriver && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100
                }}>
                    <div className="glass-panel" style={{ width: '400px', padding: '2rem' }}>
                        <h3 style={{ marginBottom: '1rem', color: 'var(--danger)' }}>Confirm Removal</h3>
                        <p style={{ marginBottom: '2rem' }}>
                            Are you sure you want to remove <strong>{deleteDriver.driverName}</strong> from license point tracking?
                            <br /><br />
                            This will completely delete their points history. This action cannot be undone.
                        </p>
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                            <button type="button" className="btn" onClick={() => setDeleteDriver(null)}>Cancel</button>
                            <button type="button" className="btn btn-danger" onClick={confirmDelete}>Yes, Remove Driver</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Log Modal */}
            {showLogModal && selectedDriver && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '2rem'
                }}>
                    <div className="glass-panel" style={{
                        maxWidth: '900px',
                        width: '100%',
                        maxHeight: '80vh',
                        overflow: 'auto',
                        padding: '2rem'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                            <h2>{selectedDriver.driverName} - License Points History</h2>
                            <button
                                className="btn"
                                onClick={() => {
                                    setShowLogModal(false);
                                    setSelectedDriver(null);
                                }}
                            >
                                ✕ Close
                            </button>
                        </div>

                        <div style={{
                            padding: '1.5rem',
                            background: 'rgba(255,255,255,0.05)',
                            borderRadius: '8px',
                            marginBottom: '2rem'
                        }}>
                            <div style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                                Total Points: <span style={{ color: 'var(--danger)' }}>{selectedDriver.totalPoints}</span>
                            </div>
                            <div style={{ fontSize: '1.2rem' }}>
                                Current Status: {calculateLicenseStatus(selectedDriver.totalPoints, selectedDriver.highestServedThreshold || 0).emoji} {selectedDriver.statusDescription}
                            </div>
                        </div>

                        {/* Mark Penalty Served Form */}
                        <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', background: 'rgba(100, 255, 100, 0.05)' }}>
                            <h4 style={{ marginBottom: '1rem' }}>Mark Penalty as Served</h4>
                            <form onSubmit={handleMarkServed} style={{ display: 'flex', gap: '1rem', alignItems: 'end' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>Penalty Type</label>
                                    <select
                                        className="form-control"
                                        value={penaltyType}
                                        onChange={(e) => setPenaltyType(e.target.value)}
                                    >
                                        <option value="DT">Pre-race DT</option>
                                        <option value="Quali Ban">Qualifying Ban</option>
                                        <option value="Race Ban">Race Ban</option>
                                    </select>
                                </div>
                                <div style={{ flex: 2 }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>Note</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={penaltyNote}
                                        onChange={(e) => setPenaltyNote(e.target.value)}
                                        placeholder="e.g., Served in Race 6"
                                        required
                                    />
                                </div>
                                <button type="submit" className="btn btn-primary">Mark Served</button>
                            </form>
                        </div>

                        {/* Activity Log */}
                        <h4 style={{ marginBottom: '1rem' }}>Activity Log</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {(selectedDriver.pointHistory || []).slice().reverse().map((entry, idx) => (
                                <div
                                    key={idx}
                                    className="glass-panel"
                                    style={{
                                        padding: '1rem',
                                        background: entry.isPenaltyServed
                                            ? 'rgba(100, 255, 100, 0.1)'
                                            : entry.points > 0
                                                ? 'rgba(255, 100, 100, 0.1)'
                                                : 'rgba(100, 100, 255, 0.1)'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                        <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                                            {entry.isPenaltyServed ? '✅' : entry.points > 0 ? `+${entry.points}` : entry.points}
                                            {!entry.isPenaltyServed && ' points'}
                                        </div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                            {formatDate(entry.timestamp)}
                                        </div>
                                    </div>
                                    <div style={{ marginBottom: '0.5rem' }}>{entry.reason}</div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                        Source: {entry.source} {entry.sourceId && `(${entry.sourceId})`} •
                                        Admin: {entry.adminName} •
                                        Total After: {entry.totalAfter}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LicensePointsTab;
