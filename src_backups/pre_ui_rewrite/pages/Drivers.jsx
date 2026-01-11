import { Link } from 'react-router-dom';
import { useChampionship } from '../context/ChampionshipContext';
import { formatDriverName, formatTeamName } from '../utils/formatting';

const Drivers = () => {
    const { championshipData, loading } = useChampionship();

    if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: 'white' }}>Loading Drivers...</div>;
    if (!championshipData || !championshipData.drivers) return <div style={{ padding: '2rem', textAlign: 'center', color: 'white' }}>No data available</div>;

    // Sort drivers by total points (desc)
    const sortedDrivers = [...championshipData.drivers].sort((a, b) => b.totalPoints - a.totalPoints);

    return (
        <div className="page-container" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <h1 style={{ color: 'white', marginBottom: '2rem', borderBottom: '2px solid var(--primary)', paddingBottom: '0.5rem' }}>
                Driver Standings
            </h1>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {sortedDrivers.map(driver => (
                    <Link
                        to={`/drivers/${driver.id}`}
                        key={driver.id}
                        style={{ textDecoration: 'none' }}
                    >
                        <div className="driver-card" style={{
                            backgroundColor: 'var(--card-bg)',
                            padding: '1.5rem',
                            borderRadius: '12px',
                            border: '1px solid var(--border-color)',
                            transition: 'transform 0.2s, box-shadow 0.2s',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.5rem',
                            height: '100%'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <h3 style={{ margin: 0, color: 'white', fontSize: '1.2rem' }}>{formatDriverName(driver.name)}</h3>
                                <span style={{
                                    backgroundColor: 'var(--primary)',
                                    color: 'white',
                                    padding: '0.25rem 0.5rem',
                                    borderRadius: '4px',
                                    fontSize: '0.9rem',
                                    fontWeight: 'bold'
                                }}>
                                    {driver.totalPoints} pts
                                </span>
                            </div>

                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                {formatTeamName(driver.team, driver.name)}
                            </div>

                            <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: '1rem' }}>
                                <span style={{
                                    fontSize: '0.8rem',
                                    color: driver.class === 'ALM' ? '#ff4d4d' : '#4dff4d',
                                    border: `1px solid ${driver.class === 'ALM' ? '#ff4d4d' : '#4dff4d'}`,
                                    padding: '0.2rem 0.4rem',
                                    borderRadius: '4px'
                                }}>
                                    {driver.class}
                                </span>
                                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                    #{driver.car || 'N/A'}
                                </span>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
};

export default Drivers;
