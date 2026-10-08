import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useChampionship } from '../context/ChampionshipContext';
import { formatDriverName, formatTeamName } from '../utils/formatting';

const Standings = () => {
    const { championshipData, seasonConfig, licensePoints, teams } = useChampionship();
    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);
    const paramTab = searchParams.get('tab') || location.state?.tab;
    const paramClass = searchParams.get('class') || location.state?.class;
    const paramTeamClass = searchParams.get('teamClass') || location.state?.teamClass || (paramTab === 'Teams' ? paramClass : null);

    const classesToShow = (seasonConfig.id === '2' || championshipData.season === 'Season 2')
        ? ['LMP2-UR', 'LMGT3']
        : (seasonConfig.classes || ['LMP2', 'LMGT3']);

    const [selectedClass, setSelectedClass] = useState(() => {
        if (paramTab === 'Teams') return 'Teams';
        if (paramClass && classesToShow.includes(paramClass)) return paramClass;
        return classesToShow[0] || 'LMGT3';
    });
    const [selectedTeamClass, setSelectedTeamClass] = useState(() => {
        if (paramTeamClass && classesToShow.includes(paramTeamClass)) return paramTeamClass;
        return classesToShow[0] || 'LMGT3';
    });
    const [useDropRound, setUseDropRound] = useState(false);

    const showBallast = seasonConfig.rules?.ballastType !== 'none';
    const showCar = seasonConfig.ui?.showCarColumn !== false; // Default true
    const showTeam = seasonConfig.ui?.showTeamColumn === true; // Default false/undefined usually? Check legacy. 
    // Legacy S2 had Team. Config says showTeamColumn: true.

    const seasonTeams = (teams && teams.length > 0) ? teams : (championshipData?.teams || []);
    const showTeamChampionship = seasonConfig.ui?.showTeamChampionship === true || seasonTeams.length > 0;

    // Effect: Handle navigation with tab/class query params or state
    useEffect(() => {
        if (paramTab === 'Teams') {
            setSelectedClass('Teams');
        } else if (paramClass && classesToShow.includes(paramClass)) {
            setSelectedClass(paramClass);
        }
        if (paramTeamClass && classesToShow.includes(paramTeamClass)) {
            setSelectedTeamClass(paramTeamClass);
        }
    }, [location.search, location.state]);

    // Effect: Validate Selected Class and Selected Team Class when switching seasons
    useEffect(() => {
        if (!classesToShow.includes(selectedClass) && selectedClass !== 'Teams') {
            setSelectedClass(classesToShow[0] || 'LMGT3');
        }
        if (!classesToShow.includes(selectedTeamClass)) {
            setSelectedTeamClass(classesToShow[0] || 'LMGT3');
        }
    }, [classesToShow, selectedClass, selectedTeamClass]);

    // Calculate individual driver points honoring drop round and car switch penalties
    const calculateDriverPoints = (driver) => {
        const results = driver.raceResults || [];
        const roundsHeld = championshipData.currentRound || 0;

        // Build a pool of droppable round scores (exclude zeroed car switch penalties)
        const pool = [];
        for (let rId = 1; rId <= roundsHeld; rId++) {
            const res = results.find(r => String(r.raceId) === String(rId));
            if (res) {
                const isCarSwitchPenalized = res.pointsBeforeSwitch !== undefined;
                if (!isCarSwitchPenalized) {
                    pool.push(res.points || 0);
                }
            } else {
                // Missed round counts as a 0 in the droppable pool
                pool.push(0);
            }
        }

        const droppedPoints = pool.length > 0 ? Math.min(...pool) : 0;
        const adjustedPoints = (driver.totalPoints || 0) - droppedPoints;

        return {
            ...driver,
            droppedPoints,
            effectivePoints: useDropRound ? adjustedPoints : (driver.totalPoints || 0)
        };
    };

    // Filter and sort drivers by class and points
    const getClassStandings = (className) => {
        return (championshipData.drivers || [])
            .filter(d => d.class === className)
            .map(calculateDriverPoints)
            .sort((a, b) => b.effectivePoints - a.effectivePoints)
            .map((driver, index) => ({ ...driver, position: index + 1 }));
    };

    // Calculate team standings by dropping the lowest team round, filtered by class
    const getTeamStandings = (targetClass) => {
        if (!seasonTeams || seasonTeams.length === 0) return [];

        const driverMap = new Map();
        (championshipData.drivers || []).forEach(d => {
            if (d && d.name) {
                driverMap.set(String(d.id), d);
                driverMap.set(d.name.trim().toLowerCase(), d);
            }
        });

        const roundsHeld = championshipData.currentRound || 0;

        const allProcessed = seasonTeams.map(team => {
            const d1 = (team.driver1Id && driverMap.get(String(team.driver1Id))) ||
                (team.driver1Name && driverMap.get(team.driver1Name.trim().toLowerCase())) || null;

            const d2 = (team.driver2Id && driverMap.get(String(team.driver2Id))) ||
                (team.driver2Name && driverMap.get(team.driver2Name.trim().toLowerCase())) || null;

            const d1Results = d1?.raceResults || [];
            const d2Results = d2?.raceResults || [];

            const d1Class = d1?.class || '';
            const d2Class = d2?.class || '';
            const teamClass = team.class || d1Class || d2Class || '';

            // Build droppable pool of team round scores across all rounds held
            const pool = [];
            for (let rId = 1; rId <= roundsHeld; rId++) {
                const res1 = d1Results.find(r => String(r.raceId) === String(rId));
                const res2 = d2Results.find(r => String(r.raceId) === String(rId));

                const isCarSwitchPenalized1 = res1 && res1.pointsBeforeSwitch !== undefined;
                const isCarSwitchPenalized2 = res2 && res2.pointsBeforeSwitch !== undefined;

                if (!isCarSwitchPenalized1 && !isCarSwitchPenalized2) {
                    const d1Pts = res1 ? (Number(res1.points) || 0) : 0;
                    const d2Pts = res2 ? (Number(res2.points) || 0) : 0;
                    const teamRoundPts = d1Pts + d2Pts;
                    pool.push({
                        raceId: rId,
                        teamPoints: teamRoundPts,
                        d1Points: d1Pts,
                        d2Points: d2Pts
                    });
                }
            }

            let worstRound = null;
            if (pool.length > 0) {
                worstRound = pool.reduce((min, r) => (r.teamPoints < min.teamPoints ? r : min), pool[0]);
            }

            const d1RawTotal = d1 ? (Number(d1.totalPoints) || 0) : 0;
            const d2RawTotal = d2 ? (Number(d2.totalPoints) || 0) : 0;
            const rawTotalPoints = d1RawTotal + d2RawTotal;

            const d1Dropped = worstRound ? worstRound.d1Points : 0;
            const d2Dropped = worstRound ? worstRound.d2Points : 0;
            const totalDropped = worstRound ? worstRound.teamPoints : 0;

            const effectivePoints = useDropRound ? (rawTotalPoints - totalDropped) : rawTotalPoints;
            const d1Points = useDropRound ? (d1RawTotal - d1Dropped) : d1RawTotal;
            const d2Points = useDropRound ? (d2RawTotal - d2Dropped) : d2RawTotal;

            return {
                id: team.id,
                name: team.name,
                class: teamClass,
                driver1Name: team.driver1Name || d1?.name || 'Driver 1',
                driver2Name: team.driver2Name || d2?.name || 'Driver 2',
                driver1Class: d1Class,
                driver2Class: d2Class,
                driver1Id: d1?.id,
                driver2Id: d2?.id,
                driver1Points: d1Points,
                driver2Points: d2Points,
                driver1Dropped: d1Dropped,
                driver2Dropped: d2Dropped,
                droppedPoints: totalDropped,
                effectivePoints: effectivePoints
            };
        });

        const filtered = targetClass
            ? allProcessed.filter(t => (t.class || '').toLowerCase() === targetClass.toLowerCase())
            : allProcessed;

        return filtered
            .sort((a, b) => b.effectivePoints - a.effectivePoints)
            .map((team, index) => ({ ...team, position: index + 1 }));
    };

    const standings = selectedClass !== 'Teams' ? getClassStandings(selectedClass) : [];
    const teamStandings = selectedClass === 'Teams' ? getTeamStandings(selectedTeamClass) : [];

    return (
        <div>
            <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
                <h2>Championship Standings</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                    {championshipData.season} - Round {championshipData.currentRound} of {championshipData.totalRounds}
                </p>

                {/* Class & Team Selector */}
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        {classesToShow.length > 1 && classesToShow.map(cls => (
                            <button
                                key={cls}
                                className={selectedClass === cls ? 'btn btn-primary' : 'btn btn-ghost'}
                                onClick={() => setSelectedClass(cls)}
                            >
                                {cls}
                            </button>
                        ))}
                        {showTeamChampionship && (
                            <button
                                key="Teams"
                                className={selectedClass === 'Teams' ? 'btn btn-primary' : 'btn btn-ghost'}
                                onClick={() => setSelectedClass('Teams')}
                            >
                                Teams
                            </button>
                        )}
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
                {selectedClass === 'Teams' ? (
                    <div>
                        {/* Team Class Sub-Tabs */}
                        {classesToShow.length > 1 && (
                            <div style={{
                                display: 'flex',
                                gap: '0.75rem',
                                marginBottom: '1.5rem',
                                alignItems: 'center',
                                padding: '0.75rem 1rem',
                                background: 'rgba(255, 255, 255, 0.03)',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--border-color)',
                                flexWrap: 'wrap'
                            }}>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold' }}>
                                    Team Class:
                                </span>
                                {classesToShow.map(cls => (
                                    <button
                                        key={cls}
                                        className={selectedTeamClass === cls ? 'btn btn-primary' : 'btn btn-ghost'}
                                        onClick={() => setSelectedTeamClass(cls)}
                                        style={{
                                            padding: '0.35rem 0.9rem',
                                            fontSize: '0.85rem',
                                            fontWeight: selectedTeamClass === cls ? 'bold' : 'normal'
                                        }}
                                    >
                                        {cls} Teams
                                    </button>
                                ))}
                            </div>
                        )}

                        <div style={{ overflowX: 'auto' }}>
                            {teamStandings.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                                    No {selectedTeamClass} teams registered yet for this series. Teams can be created in the Admin panel.
                                </div>
                            ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
                                <thead>
                                    <tr style={{
                                        textAlign: 'left',
                                        borderBottom: '2px solid var(--primary)',
                                        color: 'var(--text-main)'
                                    }}>
                                        <th style={{ padding: '1rem 0.5rem', width: '8%' }}>Pos</th>
                                        <th style={{ padding: '1rem 0.5rem', width: '28%' }}>Team</th>
                                        <th style={{ padding: '1rem 0.5rem', width: '24%' }}>Driver 1</th>
                                        <th style={{ padding: '1rem 0.5rem', width: '24%' }}>Driver 2</th>
                                        {useDropRound && (
                                            <th style={{ padding: '1rem 0.5rem', textAlign: 'center', width: '8%', color: 'var(--text-muted)' }}>
                                                Drop
                                            </th>
                                        )}
                                        <th style={{ padding: '1rem 0.5rem', textAlign: 'center', width: '8%' }}>Points</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {teamStandings.map((team) => (
                                        <tr
                                            key={team.id}
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
                                                    color: team.position === 1 ? 'var(--primary)' : 'var(--text-main)',
                                                    fontSize: team.position === 1 ? '1.1rem' : '1rem'
                                                }}>
                                                    {team.position}
                                                </span>
                                            </td>
                                            <td style={{ padding: '1rem 0.5rem', fontWeight: 'bold', color: 'white', fontSize: '1.05rem' }}>
                                                {team.name}
                                            </td>
                                            <td style={{ padding: '1rem 0.5rem' }}>
                                                {team.driver1Id ? (
                                                    <Link to={`../driver/${team.driver1Id}`} style={{ color: 'var(--text-main)', textDecoration: 'none', fontWeight: '600' }}>
                                                        {formatDriverName(team.driver1Name)}
                                                    </Link>
                                                ) : (
                                                    <span style={{ color: 'var(--text-main)', fontWeight: '600' }}>
                                                        {formatDriverName(team.driver1Name)}
                                                    </span>
                                                )}
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                                                    {team.driver1Class && <span style={{ marginRight: '0.5rem', color: 'var(--primary-color)' }}>{team.driver1Class}</span>}
                                                    <span style={{ color: 'var(--success)' }}>+{team.driver1Points} pts</span>
                                                    {useDropRound && team.driver1Dropped > 0 && (
                                                        <span style={{ color: 'var(--text-dim)', marginLeft: '0.35rem' }}>
                                                            (drop -{team.driver1Dropped})
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td style={{ padding: '1rem 0.5rem' }}>
                                                {team.driver2Id ? (
                                                    <Link to={`../driver/${team.driver2Id}`} style={{ color: 'var(--text-main)', textDecoration: 'none', fontWeight: '600' }}>
                                                        {formatDriverName(team.driver2Name)}
                                                    </Link>
                                                ) : (
                                                    <span style={{ color: 'var(--text-main)', fontWeight: '600' }}>
                                                        {formatDriverName(team.driver2Name)}
                                                    </span>
                                                )}
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                                                    {team.driver2Class && <span style={{ marginRight: '0.5rem', color: 'var(--primary-color)' }}>{team.driver2Class}</span>}
                                                    <span style={{ color: 'var(--success)' }}>+{team.driver2Points} pts</span>
                                                    {useDropRound && team.driver2Dropped > 0 && (
                                                        <span style={{ color: 'var(--text-dim)', marginLeft: '0.35rem' }}>
                                                            (drop -{team.driver2Dropped})
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            {useDropRound && (
                                                <td style={{ padding: '1rem 0.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                                    -{team.droppedPoints}
                                                </td>
                                            )}
                                            <td style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>
                                                <span style={{
                                                    fontWeight: 'bold',
                                                    fontSize: '1.15rem',
                                                    color: 'var(--primary)'
                                                }}>
                                                    {team.effectivePoints}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
                ) : (
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
                                    <th style={{ padding: '1rem 0.5rem' }}>Car #</th>
                                    {showCar && <th style={{ padding: '1rem 0.5rem' }}>Car</th>}
                                    {showTeam && <th style={{ padding: '1rem 0.5rem' }}>Team</th>}
                                    <th style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>Points</th>
                                    {showBallast && <th style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>Ballast</th>}
                                    <th style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>License Points</th>
                                    <th style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>License Status</th>
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
                                            <Link to={`../driver/${driver.id}`} style={{ color: 'var(--text-main)', textDecoration: 'none' }}>
                                                {formatDriverName(driver.name)}
                                            </Link>
                                        </td>
                                        <td style={{ padding: '1rem 0.5rem', color: 'var(--text-muted)' }}>
                                            {driver.number || driver.carNumber || '-'}
                                        </td>
                                        {showCar && (
                                            <td style={{ padding: '1rem 0.5rem', color: 'var(--text-muted)' }}>
                                                {driver.car || driver.carType || '-'}
                                            </td>
                                        )}
                                        {showTeam && (
                                            <td style={{ padding: '1rem 0.5rem', color: 'var(--text-muted)' }}>
                                                {formatTeamName(driver.team, driver.name)}
                                            </td>
                                        )}
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
                                        {showBallast && (
                                            <td style={{
                                                padding: '1rem 0.5rem',
                                                textAlign: 'center',
                                                color: driver.currentBallast > 0 ? 'var(--warning)' : 'var(--text-muted)'
                                            }}>
                                                {driver.currentBallast}kg
                                            </td>
                                        )}
                                        {(() => {
                                            const lpData = (licensePoints || []).find(lp =>
                                                (lp.driverName || '').toLowerCase() === (driver?.name || '').toLowerCase()
                                            );
                                            const points = lpData ? lpData.totalPoints : 0;
                                            const status = lpData?.currentStatus || 'OK';
                                            const description = lpData?.statusDescription || 'Clean License';

                                            const pointsCell = points === 0
                                                ? <span style={{ color: 'var(--text-muted)', opacity: 0.5 }}>-</span>
                                                : <span style={{
                                                    color: points >= 7 ? 'var(--danger)' : points >= 4 ? 'var(--warning)' : 'var(--text-main)',
                                                    fontWeight: 'bold'
                                                }}>{points}</span>;

                                            const statusEmoji = status === 'RACE_BAN' ? '🔴' : status === 'QUALI_BAN' ? '🟠' : status === 'DT_PENDING' ? '🟡' : '✅';
                                            const statusColor = status === 'RACE_BAN' ? 'var(--danger)' : status === 'QUALI_BAN' || status === 'DT_PENDING' ? 'var(--warning)' : 'var(--success)';
                                            const statusLabel = status === 'OK' ? 'Clean' : description;

                                            return (
                                                <>
                                                    <td style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>
                                                        {pointsCell}
                                                    </td>
                                                    <td style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>
                                                        <span style={{ color: statusColor, fontWeight: status !== 'OK' ? 'bold' : 'normal', fontSize: '0.85rem' }}>
                                                            {statusEmoji} {statusLabel}
                                                        </span>
                                                    </td>
                                                </>
                                            );
                                        })()}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
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
