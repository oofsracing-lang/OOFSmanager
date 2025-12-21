import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useChampionship } from '../context/ChampionshipContext';
import { formatDriverName, formatTeamName } from '../utils/formatting';

const Standings = () => {
    const [selectedClass, setSelectedClass] = useState('LMGT3');
    const [useDropRound, setUseDropRound] = useState(false);
    const { championshipData } = useChampionship();

    // Filter and sort drivers by class and points
    const getClassStandings = (className) => {
        return championshipData.drivers
            .filter(d => d.class === className)
            .map(driver => {
                // Calculate Drop Round Data
                const results = driver.raceResults || [];
                const roundsCompleted = results.length;
                const roundsHeld = championshipData.currentRound;

                // If they missed a race, their lowest score is 0.
                // If they did every race, lowest is min(points).
                let droppedPoints = 0;

                if (roundsCompleted < roundsHeld) {
                    droppedPoints = 0;
                } else if (results.length > 0) {
                    droppedPoints = Math.min(...results.map(r => r.points || 0));
                }

                const adjustedPoints = (driver.totalPoints || 0) - droppedPoints;

                return {
                    ...driver,
                    droppedPoints,
                    effectivePoints: useDropRound ? adjustedPoints : driver.totalPoints
                };
            })
            .sort((a, b) => b.effectivePoints - a.effectivePoints)
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
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: '1rem' }}>
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

                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Drop Round:</span>
                        <button
                            className={useDropRound ? 'btn btn-primary' : 'btn btn-ghost'}
                            onClick={() => setUseDropRound(!useDropRound)}
                            style={{
                                padding: '0.25rem 0.75rem',
                                fontSize: '0.8rem',
                                border: useDropRound ? 'none' : '1px solid var(--border-color)'
                            }}
                        >
                            {useDropRound ? 'Enabled (-1 Worst)' : 'Disabled'}
                        </button>
                    </div>
                </div>

                {/* Standings Table */}
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
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
                                            {formatDriverName(driver.name)}
                                        </Link>
                                    </td>
                                    <td style={{ padding: '1rem 0.5rem', color: 'var(--text-muted)' }}>
                                        {formatTeamName(driver.team, driver.name)}
                                    </td>
                                    <td style={{
                                        padding: '1rem 0.5rem',
                                        textAlign: 'center',
                                        fontWeight: 'bold',
                                        color: 'var(--success)'
                                    }}>
                                        {driver.effectivePoints}
                                        {useDropRound && (
                                            <span style={{
                                                display: 'block',
                                                fontSize: '0.7rem',
                                                color: 'var(--text-dim)',
                                                fontWeight: 'normal'
                                            }}>
                                                (Dropped: {driver.droppedPoints})
                                            </span>
                                        )}
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


            {/* Debug Info / Source Indicator */}
            <div style={{
                marginTop: '1rem',
                textAlign: 'center',
                fontSize: '0.8rem',
                color: 'var(--text-dim)',
                fontFamily: 'monospace'
            }}>
                Calculation Source: {championshipData.calculationSource || 'Unknown'}
            </div>
        </div >
    );
};

export default Standings;
