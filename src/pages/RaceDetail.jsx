import { useParams, Link } from 'react-router-dom';
import { useChampionship } from '../context/ChampionshipContext';

const RaceDetail = () => {
    const { id: raceId } = useParams();
    const { championshipData, loading } = useChampionship();
    const race = championshipData.races.find(r => String(r.id) === String(raceId));

    if (loading) {
        return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading Race Data...</div>;
    }

    if (!race) {
        return <div style={{ padding: '2rem', textAlign: 'center' }}>Race not found (ID: {raceId})</div>;
    }

    const isCompleted = race.id <= championshipData.currentRound;

    // Helper to calculate effective ballast change for a specific race
    const getEffectiveBallastChange = (driver, targetRaceId) => {
        if (Number(targetRaceId) === 7) console.log(`Trace R7 ${driver.name}`, driver.raceResults);
        // Debug first driver only to reduce spam
        const debug = driver.id === 1; // Assuming P1 driver
        if (debug && Number(targetRaceId) === 6) {
            console.log(`Ballast Trace ${driver.name}:`, driver.raceResults.map(r => ({ id: r.raceId, bChange: r.ballastChange })));
        }
        let currentBallast = 0;
        let effectiveChange = 0;
        const targetIdNum = Number(targetRaceId);

        // Sort results by race ID (ensure number comparison)
        const sortedResults = [...driver.raceResults].sort((a, b) => Number(a.raceId) - Number(b.raceId));

        for (const result of sortedResults) {
            const rId = Number(result.raceId);
            if (rId > targetIdNum) break;

            const theoreticalChange = result.ballastChange || 0;
            let change = theoreticalChange;

            // Simple clamping logic (Max 45, Min 0 implicit via change?)
            // Assuming cumulative ballast is 0-45kg.

            if (theoreticalChange < 0) {
                // If removing weight, can't go below 0 total
                if (currentBallast + theoreticalChange < 0) {
                    change = -currentBallast;
                }
            } else if (theoreticalChange > 0) {
                // If adding weight, can't go above 45 total
                if (currentBallast + theoreticalChange > 45) {
                    change = 45 - currentBallast;
                }
            }

            if (rId === targetIdNum) {
                effectiveChange = change;
            }

            currentBallast += change;
        }

        return effectiveChange;
    };

    // Get all drivers who participated in this race
    const getClassResults = (className) => {
        return championshipData.drivers
            .filter(d => {
                const r = d.raceResults.find(res => String(res.raceId) === String(race.id));
                if (!r) return false; // Must have participated
                return (r.drivenClass || d.class) === className;
            })
            .map(driver => {
                const raceResult = driver.raceResults.find(r => String(r.raceId) === String(race.id));
                // The results in championshipData from context are already updated with final positions, points, specific to this race/penalty state.

                if (!raceResult) return null;

                return {
                    ...driver,
                    raceResult: {
                        ...raceResult,
                        effectiveBallastChange: getEffectiveBallastChange(driver, race.id)
                    }
                };
            })
            .filter(d => d !== null)
            .sort((a, b) => {
                // Determine sort based on explicit NEW position (calculated) if available
                const posA = a.raceResult.newPosition || a.raceResult.position || 999;
                const posB = b.raceResult.newPosition || b.raceResult.position || 999;
                return posA - posB;
            });
    };

    const lmgt3Results = getClassResults('LMGT3');
    const lmp2Results = getClassResults('LMP2');

    return (
        <div>
            <Link to="/races" style={{ color: 'var(--primary)', textDecoration: 'none', marginBottom: '1rem', display: 'inline-block' }}>
                ← Back to Races
            </Link>

            <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '2rem' }}>
                    <div>
                        <span style={{
                            background: isCompleted ? 'var(--success)' : 'var(--text-dim)',
                            color: 'white',
                            padding: '0.25rem 0.75rem',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.8rem',
                            fontWeight: 'bold',
                            marginBottom: '1rem',
                            display: 'inline-block'
                        }}>
                            Round {race.id}
                        </span>
                        <h2>{race.name}</h2>
                        <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>{race.track}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <p style={{ color: 'var(--text-muted)' }}>
                            {new Date(race.date).toLocaleDateString('en-US', {
                                weekday: 'long',
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric'
                            })}
                        </p>
                    </div>
                </div>

                {!isCompleted ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                        <h3>Race Not Yet Completed</h3>
                        <p style={{ marginTop: '1rem' }}>Results will be available after the race.</p>
                    </div>
                ) : (
                    <>
                        {/* LMP2 Results */}
                        <div style={{ marginBottom: '3rem' }}>
                            <h3 style={{ marginBottom: '1rem', color: 'var(--primary)' }}>LMP2-UR Results</h3>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--primary)' }}>
                                            <th style={{ padding: '0.75rem 0.5rem' }}>Pos</th>
                                            <th style={{ padding: '0.75rem 0.5rem' }}>Driver</th>
                                            <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>Status</th>
                                            <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>Points</th>
                                            <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>Ballast Δ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {lmp2Results.map((driver, index) => (
                                            <tr key={driver.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                <td style={{ padding: '0.75rem 0.5rem', fontWeight: 'bold' }}>P{driver.raceResult.classPosition || index + 1}</td>
                                                <td style={{ padding: '0.75rem 0.5rem' }}>
                                                    <Link to={`/driver/${driver.id}`} style={{ color: 'var(--text-main)', textDecoration: 'none' }}>
                                                        {driver.name}
                                                    </Link>
                                                </td>
                                                <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                                                    <span style={{
                                                        color: driver.raceResult.laps === 0 ? 'var(--text-muted)' : (driver.raceResult.attendance === 'Raced' ? 'var(--text-muted)' : 'var(--warning)'),
                                                        fontSize: '0.85rem'
                                                    }}>
                                                        {driver.raceResult.laps === 0 ? "DNS" :
                                                            (driver.raceResult.attendance === 'Raced' ?
                                                                (driver.raceResult.totalPenalty ?
                                                                    <span>Finished <span style={{ color: 'var(--danger)', fontSize: '0.7em' }}>(+{driver.raceResult.totalPenalty}s)</span></span>
                                                                    : "Finished")
                                                                : driver.raceResult.attendance)
                                                        }
                                                    </span>
                                                </td>
                                                <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontWeight: 'bold', color: 'var(--success)' }}>
                                                    +{driver.raceResult.points}
                                                </td>
                                                <td style={{
                                                    padding: '0.75rem 0.5rem',
                                                    textAlign: 'center',
                                                    color: driver.raceResult.effectiveBallastChange > 0 ? 'var(--warning)' : driver.raceResult.effectiveBallastChange < 0 ? 'var(--success)' : 'var(--text-muted)'
                                                }}>
                                                    {driver.raceResult.effectiveBallastChange > 0 ? '+' : ''}{driver.raceResult.effectiveBallastChange}kg
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* LMGT3 Results */}
                        <div>
                            <h3 style={{ marginBottom: '1rem', color: 'var(--primary)' }}>LMGT3 Results</h3>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--primary)' }}>
                                            <th style={{ padding: '0.75rem 0.5rem' }}>Pos</th>
                                            <th style={{ padding: '0.75rem 0.5rem' }}>Driver</th>
                                            <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>Status</th>
                                            <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>Points</th>
                                            <th style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>Ballast Δ</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {lmgt3Results.map((driver, index) => (
                                            <tr key={driver.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                <td style={{ padding: '0.75rem 0.5rem', fontWeight: 'bold' }}>P{driver.raceResult.classPosition || index + 1}</td>
                                                <td style={{ padding: '0.75rem 0.5rem' }}>
                                                    <Link to={`/driver/${driver.id}`} style={{ color: 'var(--text-main)', textDecoration: 'none' }}>
                                                        {driver.name}
                                                    </Link>
                                                </td>
                                                <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center' }}>
                                                    <span style={{
                                                        color: driver.raceResult.laps === 0 ? 'var(--text-muted)' : (driver.raceResult.attendance === 'Raced' ? 'var(--text-muted)' : 'var(--warning)'),
                                                        fontSize: '0.85rem'
                                                    }}>
                                                        {driver.raceResult.laps === 0 ? "DNS" :
                                                            (driver.raceResult.attendance === 'Raced' ?
                                                                (driver.raceResult.totalPenalty ?
                                                                    <span>Finished <span style={{ color: 'var(--danger)', fontSize: '0.7em' }}>(+{driver.raceResult.totalPenalty}s)</span></span>
                                                                    : "Finished")
                                                                : driver.raceResult.attendance)
                                                        }
                                                    </span>
                                                </td>
                                                <td style={{ padding: '0.75rem 0.5rem', textAlign: 'center', fontWeight: 'bold', color: 'var(--success)' }}>
                                                    +{driver.raceResult.points}
                                                </td>
                                                <td style={{
                                                    padding: '0.75rem 0.5rem',
                                                    textAlign: 'center',
                                                    color: driver.raceResult.effectiveBallastChange > 0 ? 'var(--warning)' : driver.raceResult.effectiveBallastChange < 0 ? 'var(--success)' : 'var(--text-muted)'
                                                }}>
                                                    {driver.raceResult.effectiveBallastChange > 0 ? '+' : ''}{driver.raceResult.effectiveBallastChange}kg
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default RaceDetail;
