import { Link } from 'react-router-dom';
import { useChampionship } from '../context/ChampionshipContext';
import { formatDriverName } from '../utils/formatting';

const Dashboard = () => {
    const { championshipData, seasonConfig, currentSeasonId, teams } = useChampionship();
    const classesToShow = (seasonConfig.id === '2' || championshipData.season === 'Season 2')
        ? ['LMP2-UR', 'LMGT3']
        : (seasonConfig.classes || ['LMP2', 'LMGT3']);

    const seasonDisplayNames = {
        's6-endurance': 'Season 6 Endurance',
        's6-sprint': 'Season 6 Sprint',
        's5-multi': 'Season 5 Multiclass',
        's5-sprint': 'Season 5 Sprint',
        's4-multi': 'Season 4 Multiclass',
        's4-sprint': 'Season 4 Sprint',
        's3-sprint': 'Season 3 Sprint',
        '3': 'Season 3 Multiclass',
        '2': 'Season 2',
    };
    const seasonLabel = seasonDisplayNames[currentSeasonId] || championshipData.season;

    const seasonTeams = (teams && teams.length > 0) ? teams : (championshipData?.teams || []);
    const showTeamChampionship = seasonConfig.ui?.showTeamChampionship === true || seasonTeams.length > 0;

    // 1. Upcoming Schedule
    const upcomingRaces = (championshipData.races || [])
        .filter(r => r.id > (championshipData.currentRound || 0))
        .sort((a, b) => a.id - b.id)
        .slice(0, 3);

    // 2. Standings Helper - Drivers
    const getTop5 = (className) => {
        return (championshipData.drivers || [])
            .filter(d => d.class === className)
            .sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0))
            .slice(0, 5);
    };

    // 3. Standings Helper - Teams
    const getTeamTop5 = (className) => {
        if (!seasonTeams || seasonTeams.length === 0) return [];

        const driverMap = new Map();
        (championshipData.drivers || []).forEach(d => {
            if (d && d.name) {
                driverMap.set(String(d.id), d);
                driverMap.set(d.name.trim().toLowerCase(), d);
            }
        });

        const classTeams = seasonTeams.map(team => {
            const d1 = (team.driver1Id && driverMap.get(String(team.driver1Id))) ||
                (team.driver1Name && driverMap.get(team.driver1Name.trim().toLowerCase())) || null;

            const d2 = (team.driver2Id && driverMap.get(String(team.driver2Id))) ||
                (team.driver2Name && driverMap.get(team.driver2Name.trim().toLowerCase())) || null;

            const d1Class = d1?.class || '';
            const d2Class = d2?.class || '';
            const teamClass = team.class || d1Class || d2Class || '';

            const d1Points = d1 ? (Number(d1.totalPoints) || 0) : 0;
            const d2Points = d2 ? (Number(d2.totalPoints) || 0) : 0;
            const totalPoints = d1Points + d2Points;

            return {
                id: team.id,
                name: team.name,
                class: teamClass,
                driver1Name: team.driver1Name || d1?.name || 'Driver 1',
                driver2Name: team.driver2Name || d2?.name || 'Driver 2',
                driver1Id: d1?.id || team.driver1Id,
                driver2Id: d2?.id || team.driver2Id,
                driver1Points: d1Points,
                driver2Points: d2Points,
                totalPoints
            };
        }).filter(t => (t.class || '').toLowerCase() === className.toLowerCase());

        return classTeams
            .sort((a, b) => {
                if (b.totalPoints !== a.totalPoints) {
                    return b.totalPoints - a.totalPoints;
                }
                return a.name.localeCompare(b.name);
            })
            .slice(0, 5);
    };

    // 4. Recent Race Results
    const recentRace = (championshipData.races || []).find(r => r.id === championshipData.currentRound);

    // Helper to get top 3 for recent race
    const getRecentPodium = (className) => {
        if (!recentRace) return [];
        return (championshipData.drivers || [])
            .filter(d => d.class === className)
            .map(d => {
                const result = (d.raceResults || []).find(r => r.raceId === recentRace.id);
                return result ? { ...d, result } : null;
            })
            .filter(d => d !== null && d.result.attendance === 'Raced')
            .sort((a, b) => {
                if (a.result.position && b.result.position) {
                    return a.result.position - b.result.position;
                }
                return (b.result.points || 0) - (a.result.points || 0);
            })
            .slice(0, 3);
    };

    // Helper for class header colors
    const getClassHeaderColor = (className) => {
        if (className.includes('LMP2')) return 'var(--info)';
        if (className.includes('Hypercar')) return 'var(--danger)'; // RED
        if (className.includes('LMGT3') || className.includes('GT3')) return '#f08c00'; // GT3 badge orange
        if (className.includes('LMP3')) return '#a855f7'; // Dark purple
        return 'var(--text-main)';
    };

    return (
        <div>
            <h2 style={{ marginBottom: '2rem' }}>Dashboard - {seasonLabel}</h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>

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
                                            {race.date === 'TBD' ? 'TBD' : new Date(race.date + (race.date.includes('/') ? '' : 'T12:00:00')).toLocaleDateString()}
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
                        <Link to="races" className="btn btn-ghost" style={{ fontSize: '0.9rem' }}>View Full Schedule →</Link>
                    </div>
                </div>

                {/* Recent Results */}
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                    <h3 style={{ marginBottom: '1rem', color: 'var(--success)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                        Recent Results: {recentRace?.name || 'N/A'}
                    </h3>

                    {recentRace ? (
                        <>
                            {classesToShow.map(className => {
                                const podium = getRecentPodium(className);
                                if (podium.length === 0) return null;
                                return (
                                    <div key={className} style={{ marginBottom: '1.5rem' }}>
                                        <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>{className} Podium</h4>
                                        {podium.map((d, i) => (
                                            <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                                <span>{i + 1}. {formatDriverName(d.name)}</span>
                                                <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>+{d.result.points}</span>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })}

                            <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                                <Link to={`races/${recentRace?.id}`} className="btn btn-ghost" style={{ fontSize: '0.9rem' }}>View Full Results →</Link>
                            </div>
                        </>
                    ) : (
                        <p style={{ color: 'var(--text-muted)' }}>No races completed yet.</p>
                    )}
                </div>

                {/* Dynamic Driver Standings Top 5 */}
                {classesToShow.map(className => {
                    const top5 = getTop5(className);
                    const headerColor = getClassHeaderColor(className);

                    return (
                        <div key={`driver-${className}`} className="glass-panel" style={{ padding: '1.5rem' }}>
                            <h3 style={{ marginBottom: '1rem', color: headerColor, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                                {className} Top 5
                            </h3>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '300px' }}>
                                    <tbody>
                                        {top5.map((d, i) => (
                                            <tr key={d.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                <td style={{ padding: '0.5rem 0', fontWeight: 'bold', width: '30px' }}>{i + 1}</td>
                                                <td style={{ padding: '0.5rem 0' }}>
                                                    <Link to={`driver/${d.id}`} style={{ color: 'var(--text-main)', textDecoration: 'none' }}>
                                                        {formatDriverName(d.name)}
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
                            <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                                <Link 
                                    to={`standings?class=${encodeURIComponent(className)}`}
                                    state={{ class: className }} 
                                    className="btn btn-ghost" 
                                    style={{ fontSize: '0.9rem' }}
                                >
                                    View Full Standings →
                                </Link>
                            </div>
                        </div>
                    );
                })}

                {/* Team Standings Top 5 */}
                {showTeamChampionship && classesToShow.map(className => {
                    const teamTop5 = getTeamTop5(className);
                    if (teamTop5.length === 0) return null;
                    const headerColor = getClassHeaderColor(className);

                    return (
                        <div key={`team-${className}`} className="glass-panel" style={{ padding: '1.5rem' }}>
                            <h3 style={{ marginBottom: '1rem', color: headerColor, borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                                {className} Team Top 5
                            </h3>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '300px' }}>
                                    <tbody>
                                        {teamTop5.map((t, i) => (
                                            <tr key={t.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                <td style={{ padding: '0.5rem 0', fontWeight: 'bold', width: '30px', verticalAlign: 'top' }}>
                                                    {i + 1}
                                                </td>
                                                <td style={{ padding: '0.5rem 0' }}>
                                                    <div style={{ fontWeight: '500', color: 'var(--text-main)' }}>
                                                        {t.name}
                                                    </div>
                                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                        {t.driver1Id ? (
                                                            <Link to={`driver/${t.driver1Id}`} style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
                                                                {formatDriverName(t.driver1Name)}
                                                            </Link>
                                                        ) : (
                                                            <span>{formatDriverName(t.driver1Name)}</span>
                                                        )}
                                                        {' & '}
                                                        {t.driver2Id ? (
                                                            <Link to={`driver/${t.driver2Id}`} style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
                                                                {formatDriverName(t.driver2Name)}
                                                            </Link>
                                                        ) : (
                                                            <span>{formatDriverName(t.driver2Name)}</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '0.5rem 0', textAlign: 'right', fontWeight: 'bold', color: 'var(--primary)', verticalAlign: 'top' }}>
                                                    {t.totalPoints}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                                <Link 
                                    to={`standings?tab=Teams&class=${encodeURIComponent(className)}`}
                                    state={{ tab: 'Teams', teamClass: className }} 
                                    className="btn btn-ghost" 
                                    style={{ fontSize: '0.9rem' }}
                                >
                                    View Full Standings →
                                </Link>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Dashboard;
