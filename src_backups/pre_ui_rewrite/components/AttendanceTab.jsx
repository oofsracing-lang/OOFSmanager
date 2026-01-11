import { useState } from 'react';
import { useChampionship } from '../context/ChampionshipContext';

const AttendanceTab = () => {
    const { championshipData, seasonData, toggleDriverReserveStatus } = useChampionship();
    const [filterClass, setFilterClass] = useState('all');

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

    const getStatusBadge = (status) => {
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

        return (
            <span style={{
                ...styles[status],
                padding: '0.25rem 0.5rem',
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                display: 'inline-block',
                minWidth: '40px',
                textAlign: 'center'
            }} title={status.toUpperCase()}>
                {labels[status]}
            </span>
        );
    };

    return (
        <div>
            <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <h3 style={{ margin: 0 }}>Driver Attendance</h3>
                <select
                    value={filterClass}
                    onChange={(e) => setFilterClass(e.target.value)}
                    className="form-control"
                    style={{ width: 'auto' }}
                >
                    <option value="all">All Classes</option>
                    <option value="LMP2-UR">LMP2-UR</option>
                    <option value="LMGT3">LMGT3</option>
                </select>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Tip: Click the 'R' button next to a driver to toggle Reserve status.
                </div>
            </div>

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
                                    <span style={{ fontWeight: 500 }}>{driver.name}</span>
                                </td>
                                <td>
                                    <span style={{
                                        padding: '0.25rem 0.5rem',
                                        borderRadius: '4px',
                                        fontSize: '0.7rem',
                                        backgroundColor: driver.class === 'LMP2-UR' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(139, 92, 246, 0.2)',
                                        color: driver.class === 'LMP2-UR' ? '#60a5fa' : '#a78bfa',
                                        border: '1px solid transparent'
                                    }}>
                                        {driver.class}
                                    </span>
                                </td>
                                {races.map(race => (
                                    <td key={race.id} style={{ textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.05)' }}>
                                        {race.status === 'Completed'
                                            ? getStatusBadge(getAttendanceStatus(driver, race.id))
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
        </div>
    );
};

export default AttendanceTab;
