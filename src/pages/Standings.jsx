import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useChampionship } from '../context/ChampionshipContext';

const Standings = () => {
    const [selectedClass, setSelectedClass] = useState('LMGT3');
    const { championshipData } = useChampionship();

    // Filter and sort drivers by class and points
    const getClassStandings = (className) => {
        return championshipData.drivers
            .filter(d => d.class === className)
            .sort((a, b) => b.totalPoints - a.totalPoints)
            .map((driver, index) => ({ ...driver, position: index + 1 }));
    };

    const standings = getClassStandings(selectedClass);

    return (
        <div>
            <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
                <h2>Championship Standings</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                    Season 1 - Round {championshipData.currentRound} of {championshipData.totalRounds}
                </p>

                {/* Class Selector */}
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                    <button
                        className={selectedClass === 'LMGT3' ? 'btn btn-primary' : 'btn btn-ghost'}
                        onClick={() => setSelectedClass('LMGT3')}
                    >
                        LMGT3
                    </button>
                    <button
                        className={selectedClass === 'LMP2' ? 'btn btn-primary' : 'btn btn-ghost'}
                        onClick={() => setSelectedClass('LMP2')}
                    >
                        LMP2-UR
                    </button>
                </div>

                {/* Standings Table */}
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{
                                textAlign: 'left',
                                borderBottom: '2px solid var(--primary)',
                                color: 'var(--text-main)'
                            }}>
                                <th style={{ padding: '1rem 0.5rem' }}>Pos</th>
                                <th style={{ padding: '1rem 0.5rem' }}>Driver</th>
                                <th style={{ padding: '1rem 0.5rem' }}>Team</th>
                                <th style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>Points</th>
                                <th style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>Ballast</th>
                            </tr>
                        </thead>
                        <tbody>
                            {standings.map((driver) => (
                                <tr
                                    key={driver.id}
                                    style={{
                                        borderBottom: '1px solid var(--border-color)',
                                        transition: 'background var(--transition-fast)'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    <td style={{ padding: '1rem 0.5rem' }}>
                                        <span style={{
                                            fontWeight: 'bold',
                                            color: driver.position === 1 ? 'var(--primary)' : 'var(--text-main)'
                                        }}>
                                            {driver.position}
                                        </span>
                                    </td>
                                    <td style={{ padding: '1rem 0.5rem', fontWeight: '600' }}>
                                        <Link to={`/driver/${driver.id}`} style={{ color: 'var(--text-main)', textDecoration: 'none' }}>
                                            {driver.name}
                                        </Link>
                                    </td>
                                    <td style={{ padding: '1rem 0.5rem', color: 'var(--text-muted)' }}>
                                        {driver.team}
                                    </td>
                                    <td style={{
                                        padding: '1rem 0.5rem',
                                        textAlign: 'center',
                                        fontWeight: 'bold',
                                        color: 'var(--success)'
                                    }}>
                                        {driver.totalPoints}
                                    </td>
                                    <td style={{
                                        padding: '1rem 0.5rem',
                                        textAlign: 'center',
                                        color: driver.currentBallast > 0 ? 'var(--warning)' : 'var(--text-muted)'
                                    }}>
                                        {driver.currentBallast}kg
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Recent Races */}
            <div className="glass-panel" style={{ padding: '2rem' }}>
                <h3>Recent Races</h3>
                <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {championshipData.races.map((race) => (
                        <div
                            key={race.id}
                            style={{
                                padding: '0.75rem',
                                background: 'var(--bg-card)',
                                borderRadius: 'var(--radius-sm)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}
                        >
                            <div>
                                <strong>{race.name}</strong>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                    {race.track}
                                </p>
                            </div>
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                {race.date}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Standings;
