import { Link } from 'react-router-dom';
import { useChampionship } from '../context/ChampionshipContext';

const Races = () => {
    const { championshipData } = useChampionship();
    const currentRound = championshipData.currentRound;

    return (
        <div>
            <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
                <h2>{championshipData.season} Races</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
                    Round {currentRound} of {championshipData.totalRounds} completed
                </p>

                <div style={{ display: 'grid', gap: '1rem' }}>
                    {championshipData.races.map((race) => {
                        const isCompleted = race.id <= currentRound;
                        const isCurrent = race.id === currentRound + 1;

                        return (
                            <Link
                                key={race.id}
                                to={`/races/${race.id}`}
                                style={{ textDecoration: 'none' }}
                            >
                                <div
                                    style={{
                                        background: isCompleted ? 'var(--bg-card)' : 'rgba(255, 255, 255, 0.02)',
                                        padding: '1.5rem',
                                        borderRadius: 'var(--radius-md)',
                                        border: isCurrent ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                                        transition: 'all var(--transition-fast)',
                                        cursor: 'pointer'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = isCompleted ? 'var(--bg-card)' : 'rgba(255, 255, 255, 0.02)';
                                        e.currentTarget.style.transform = 'translateY(0)';
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                                                <span style={{
                                                    background: isCompleted ? 'var(--success)' : isCurrent ? 'var(--primary)' : 'var(--text-dim)',
                                                    color: 'white',
                                                    padding: '0.25rem 0.75rem',
                                                    borderRadius: 'var(--radius-sm)',
                                                    fontSize: '0.8rem',
                                                    fontWeight: 'bold'
                                                }}>
                                                    Round {race.id}
                                                </span>
                                                {isCurrent && (
                                                    <span style={{ color: 'var(--primary)', fontSize: '0.9rem', fontWeight: 'bold' }}>
                                                        NEXT RACE
                                                    </span>
                                                )}
                                            </div>
                                            <h3 style={{ marginBottom: '0.5rem' }}>{race.name}</h3>
                                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                                {race.track}
                                            </p>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                                {new Date(race.date).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric'
                                                })}
                                            </p>
                                            {isCompleted && (
                                                <span style={{ color: 'var(--success)', fontSize: '0.85rem', marginTop: '0.5rem', display: 'block' }}>
                                                    ✓ Completed
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default Races;
