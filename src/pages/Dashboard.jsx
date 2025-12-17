import { Link } from 'react-router-dom';
import { useChampionship } from '../context/ChampionshipContext';

const Dashboard = () => {
    const { championshipData } = useChampionship();

    // 1. Upcoming Schedule
    const upcomingRaces = championshipData.races
        .filter(r => r.id > championshipData.currentRound)
        .sort((a, b) => a.id - b.id);

    // 2. Standings Helper
    const getTop5 = (className) => {
        return championshipData.drivers
            .filter(d => d.class === className)
            .sort((a, b) => b.totalPoints - a.totalPoints)
            .slice(0, 5);
    };

    const top5LMP2 = getTop5('LMP2');
    const top5LMGT3 = getTop5('LMGT3');

    // 3. Recent Race Results
    const recentRace = championshipData.races.find(r => r.id === championshipData.currentRound);

    // Helper to get top 3 for recent race
    const getRecentPodium = (className) => {
        if (!recentRace) return [];
        return championshipData.drivers
            .filter(d => d.class === className)
            .map(d => {
                const result = d.raceResults.find(r => r.raceId === recentRace.id);
                return result ? { ...d, result } : null;
            })
            // Only show those who actually finished (have points or attendance)
            // Using the new context, results have finalTime, points, etc.
            .filter(d => d !== null && d.result.attendance === 'Raced')
            .sort((a, b) => {
                if (a.result.position && b.result.position) {
                    return a.result.position - b.result.position;
                }
                return b.result.points - a.result.points
            })
            .slice(0, 3);
    };

    const recentLMP2 = getRecentPodium('LMP2');
    const recentLMGT3 = getRecentPodium('LMGT3');

    if (!championshipData.drivers || championshipData.drivers.length === 0) {
        return (
            <div>
                <h2 style={{ marginBottom: '2rem' }}>Dashboard for {championshipData.season}</h2>
                <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center' }}>
                    <p style={{ color: 'var(--text-muted)' }}>No data available for this season yet.</p>
                </div>
            </div>
        )
    }

    return (
        <div>
            <h2 style={{ marginBottom: '2rem' }}>Dashboard - {championshipData.season}</h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>

                {/* Upcoming Schedule */}
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <h3 style={{ marginBottom: '1rem', color: 'var(--primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                        Upcoming Schedule
                    </h3>
                    {upcomingRaces.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {upcomingRaces.map(race => (
                                <div key={race.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontWeight: 'bold' }}>{race.name}</div>
                                        <div style={{ fontSize: '0.9rem', marginBottom: '0.25rem' }}>{race.track}</div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                            {new Date(race.date).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <div style={{
                                        background: 'var(--bg-app)',
                                        padding: '0.25rem 0.75rem',
                                        borderRadius: 'var(--radius-sm)',
                                        fontSize: '0.8rem',
                                        border: '1px solid var(--border-color)'
                                    }}>
                                        R{race.id}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p style={{ color: 'var(--text-muted)' }}>No upcoming races.</p>
                    )}
                    <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                        <Link to="/races" className="btn btn-ghost" style={{ fontSize: '0.9rem' }}>View Full Schedule →</Link>
                    </div>
                </div>

                {/* Recent Results */}
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <h3 style={{ marginBottom: '1rem', color: 'var(--success)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                        Recent Results: {recentRace?.name || 'N/A'}
                    </h3>

                    {recentRace ? (
                        <>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>LMP2-UR Podium</h4>
                                {recentLMP2.map((d, i) => (
                                    <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                        <span>{i + 1}. {d.name}</span>
                                        <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>+{d.result.points}</span>
                                    </div>
                                ))}
                            </div>

                            <div>
                                <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>LMGT3 Podium</h4>
                                {recentLMGT3.map((d, i) => (
                                    <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                        <span>{i + 1}. {d.name}</span>
                                        <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>+{d.result.points}</span>
                                    </div>
                                ))}
                            </div>

                            <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                                <Link to={`/races/${recentRace?.id}`} className="btn btn-ghost" style={{ fontSize: '0.9rem' }}>View Full Results →</Link>
                            </div>
                        </>
                    ) : (
                        <p style={{ color: 'var(--text-muted)' }}>No races completed yet.</p>
                    )}
                </div>

                {/* LMP2 Standings Top 5 */}
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <h3 style={{ marginBottom: '1rem', color: 'var(--info)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                        LMP2-UR Top 5
                    </h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <tbody>
                            {top5LMP2.map((d, i) => (
                                <tr key={d.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <td style={{ padding: '0.5rem 0', fontWeight: 'bold', width: '30px' }}>{i + 1}</td>
                                    <td style={{ padding: '0.5rem 0' }}>
                                        <Link to={`/driver/${d.id}`} style={{ color: 'var(--text-main)', textDecoration: 'none' }}>
                                            {d.name}
                                        </Link>
                                    </td>
                                    <td style={{ padding: '0.5rem 0', textAlign: 'right', fontWeight: 'bold', color: 'var(--primary)' }}>
                                        {d.totalPoints}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* LMGT3 Standings Top 5 */}
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <h3 style={{ marginBottom: '1rem', color: 'var(--warning)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                        LMGT3 Top 5
                    </h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <tbody>
                            {top5LMGT3.map((d, i) => (
                                <tr key={d.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                    <td style={{ padding: '0.5rem 0', fontWeight: 'bold', width: '30px' }}>{i + 1}</td>
                                    <td style={{ padding: '0.5rem 0' }}>
                                        <Link to={`/driver/${d.id}`} style={{ color: 'var(--text-main)', textDecoration: 'none' }}>
                                            {d.name}
                                        </Link>
                                    </td>
                                    <td style={{ padding: '0.5rem 0', textAlign: 'right', fontWeight: 'bold', color: 'var(--primary)' }}>
                                        {d.totalPoints}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

            </div>
        </div>
    );
};

export default Dashboard;
