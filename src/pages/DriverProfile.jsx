import { useParams, Link } from 'react-router-dom';
import { useChampionship } from '../context/ChampionshipContext';

const DriverProfile = () => {
    const { driverId } = useParams();
    const { championshipData } = useChampionship();
    const driver = championshipData.drivers.find(d => d.id === parseInt(driverId));

    if (!driver) {
        return <div>Driver not found</div>;
    }

    // Calculate championship position
    const classDrivers = championshipData.drivers
        .filter(d => d.class === driver.class)
        .sort((a, b) => b.totalPoints - a.totalPoints);

    const championshipPosition = classDrivers.findIndex(d => d.id === driver.id) + 1;

    // Calculate statistics
    const racesCompleted = driver.raceResults.filter(r => r.attendance === 'Raced').length;

    // Use points from the calculated context, which are already updated
    // Calculate Best Result (Position)
    const racedResults = driver.raceResults.filter(r => r.attendance === 'Raced');
    let bestPosition = '-';

    if (racedResults.length > 0) {
        const positions = racedResults.map(result => {
            // Use calculated newPosition if available (from context calculation), otherwise classPosition, then raw position
            if (result.newPosition) return result.newPosition;
            if (result.classPosition) return result.classPosition;
            if (result.position) return result.position;

            // Fallback calculation if position is missing
            const raceStandings = championshipData.drivers
                .filter(d => d.class === driver.class)
                .map(d => ({
                    id: d.id,
                    points: d.raceResults.find(r => r.raceId === result.raceId)?.points || 0
                }))
                .sort((a, b) => b.points - a.points);
            return raceStandings.findIndex(d => d.id === driver.id) + 1;
        });

        const minPos = Math.min(...positions);
        bestPosition = `P${minPos}`;
    }

    const avgPoints = racesCompleted > 0
        ? (driver.totalPoints / racesCompleted).toFixed(1)
        : 0;

    return (
        <div>
            <Link to="/standings" style={{ color: 'var(--primary)', textDecoration: 'none', marginBottom: '1rem', display: 'inline-block' }}>
                ← Back to Standings
            </Link>

            <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
                {/* Driver Header */}
                <div style={{ marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '2rem' }}>
                    <span style={{
                        background: driver.class === 'LMP2' ? 'var(--primary)' : 'var(--info)',
                        color: 'white',
                        padding: '0.25rem 0.75rem',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.8rem',
                        fontWeight: 'bold',
                        marginBottom: '1rem',
                        display: 'inline-block'
                    }}>
                        {driver.class === 'LMP2' ? 'LMP2-UR' : 'LMGT3'}
                    </span>
                    <h2 style={{ marginBottom: '0.5rem' }}>{driver.name}</h2>
                    <p style={{ color: 'var(--text-muted)' }}>{driver.team}</p>
                </div>

                {/* Stats Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                    <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: 'var(--radius-md)' }}>
                        <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Championship Position</h4>
                        <p className="text-primary" style={{ fontSize: '2rem', fontWeight: 'bold' }}>P{championshipPosition}</p>
                    </div>

                    <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: 'var(--radius-md)' }}>
                        <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Total Points</h4>
                        <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--success)' }}>{driver.totalPoints}</p>
                    </div>

                    <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: 'var(--radius-md)' }}>
                        <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Current Ballast</h4>
                        <p style={{
                            fontSize: '2rem',
                            fontWeight: 'bold',
                            color: driver.currentBallast > 0 ? 'var(--warning)' : 'var(--text-main)'
                        }}>
                            {driver.currentBallast}kg
                        </p>
                    </div>

                    <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: 'var(--radius-md)' }}>
                        <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Races Completed</h4>
                        <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{racesCompleted}</p>
                    </div>

                    <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: 'var(--radius-md)' }}>
                        <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Best Result</h4>
                        <p style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--success)' }}>{bestPosition}</p>
                    </div>

                    <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: 'var(--radius-md)' }}>
                        <h4 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Avg Points/Race</h4>
                        <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{avgPoints}</p>
                    </div>
                </div>

                {/* Race History */}
                <div>
                    <h3 style={{ marginBottom: '1.5rem' }}>Race History</h3>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--primary)' }}>
                                    <th style={{ padding: '0.75rem 0.5rem' }}>Round</th>
                                    <th style={{ padding: '0.75rem 0.5rem' }}>Race</th>
                                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>Pos</th>
                                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>Status</th>
                                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>Points</th>
                                    <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>Ballast Δ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(() => {
                                    let runningBallast = 0;
                                    // Sort results by race ID to ensure correct history calculation
                                    const sortedResults = [...driver.raceResults].sort((a, b) => a.raceId - b.raceId);

                                    return sortedResults.map((result) => {
                                        const race = championshipData.races.find(r => r.id === result.raceId);

                                        // Calculate effective ballast change
                                        let effectiveChange = result.ballastChange;

                                        if (effectiveChange < 0) {
                                            // If trying to reduce ballast, can't go below 0
                                            if (runningBallast + effectiveChange < 0) {
                                                effectiveChange = -runningBallast;
                                            }
                                        } else if (effectiveChange > 0) {
                                            // If trying to add ballast, can't go above 45
                                            if (runningBallast + effectiveChange > 45) {
                                                effectiveChange = 45 - runningBallast;
                                            }
                                        }

                                        // Update running ballast for next iteration
                                        runningBallast += effectiveChange;

                                        // Calculate Position
                                        let positionDisplay = '-';
                                        if (result.attendance === 'Raced') {
                                            // Prioritize recalculated positions (newPosition > classPosition > raw position)
                                            const finalPos = result.newPosition || result.classPosition || result.position;

                                            if (finalPos) {
                                                positionDisplay = `P${finalPos}`;
                                            } else {
                                                // Fallback if not available for some reason (should be available from context)
                                                const raceStandings = championshipData.drivers
                                                    .filter(d => d.class === driver.class)
                                                    .map(d => ({
                                                        id: d.id,
                                                        points: d.raceResults.find(r => r.raceId === result.raceId)?.points || 0
                                                    }))
                                                    .sort((a, b) => b.points - a.points);
                                                const pos = raceStandings.findIndex(d => d.id === driver.id) + 1;
                                                positionDisplay = `P${pos}`;
                                            }
                                        }

                                        return (
                                            <tr key={result.raceId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                <td style={{ padding: '0.75rem 0.5rem' }}>R{result.raceId}</td>
                                                <td style={{ padding: '0.75rem 0.5rem' }}>
                                                    <Link to={`/races/${result.raceId}`} style={{ color: 'var(--text-main)', textDecoration: 'none' }}>
                                                        {race?.name || 'Unknown'}
                                                    </Link>
                                                </td>
                                                <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontWeight: 'bold' }}>
                                                    {positionDisplay}
                                                </td>
                                                <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                                                    <span style={{
                                                        color: result.attendance === 'Raced' ? 'var(--success)' : 'var(--warning)',
                                                        fontSize: '0.85rem'
                                                    }}>
                                                        {result.attendance}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontWeight: 'bold', color: 'var(--success)' }}>
                                                    +{result.points}
                                                </td>
                                                <td style={{
                                                    padding: '0.75rem 0.5rem',
                                                    textAlign: 'center',
                                                    color: effectiveChange > 0 ? 'var(--warning)' : effectiveChange < 0 ? 'var(--success)' : 'var(--text-muted)'
                                                }}>
                                                    {effectiveChange > 0 ? '+' : ''}{effectiveChange}kg
                                                </td>
                                            </tr>
                                        );
                                    });
                                })()}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DriverProfile;
