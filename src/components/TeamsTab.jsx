import { useState, useMemo } from 'react';
import { useChampionship } from '../context/ChampionshipContext';
import { useAuth } from '../context/AuthContext';
import { formatDriverName } from '../utils/formatting';

const TeamsTab = () => {
    const { championshipData, seasonData, teams, updateSeasonTeams } = useChampionship();
    const { currentUser } = useAuth();

    const [teamName, setTeamName] = useState('');
    const [driver1Id, setDriver1Id] = useState('');
    const [driver2Id, setDriver2Id] = useState('');
    const [driver1Manual, setDriver1Manual] = useState('');
    const [driver2Manual, setDriver2Manual] = useState('');
    const [useManual1, setUseManual1] = useState(false);
    const [useManual2, setUseManual2] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [searchFilter, setSearchFilter] = useState('');

    // Gather all known drivers from race results AND roster
    const availableDrivers = useMemo(() => {
        const map = new Map();

        // 1. Drivers with championship results
        (championshipData?.drivers || []).forEach(d => {
            if (d && d.name) {
                const key = d.name.trim().toLowerCase();
                map.set(key, {
                    id: String(d.id || d.name),
                    name: d.name,
                    class: d.class || ''
                });
            }
        });

        // 2. Drivers from config roster
        (seasonData?.config?.driverRoster || []).forEach(d => {
            if (d && d.name) {
                const key = d.name.trim().toLowerCase();
                if (!map.has(key)) {
                    map.set(key, {
                        id: String(d.id || d.name),
                        name: d.name,
                        class: d.class || ''
                    });
                }
            }
        });

        return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [championshipData?.drivers, seasonData?.config?.driverRoster]);

    const activeTeams = Array.isArray(teams) ? teams : [];

    const handleCreateTeam = async (e) => {
        e.preventDefault();
        if (!currentUser) {
            alert("You must be logged in as an admin to manage teams.");
            return;
        }

        const trimmedName = teamName.trim();
        if (!trimmedName) {
            alert("Please enter a team name.");
            return;
        }

        // Resolve driver 1
        let d1Name = '';
        let d1Id = '';
        if (useManual1) {
            d1Name = driver1Manual.trim();
            d1Id = d1Name;
        } else {
            const found1 = availableDrivers.find(d => String(d.id) === String(driver1Id));
            if (found1) {
                d1Name = found1.name;
                d1Id = found1.id;
            }
        }

        // Resolve driver 2
        let d2Name = '';
        let d2Id = '';
        if (useManual2) {
            d2Name = driver2Manual.trim();
            d2Id = d2Name;
        } else {
            const found2 = availableDrivers.find(d => String(d.id) === String(driver2Id));
            if (found2) {
                d2Name = found2.name;
                d2Id = found2.id;
            }
        }

        if (!d1Name || !d2Name) {
            alert("Please select or enter both Driver 1 and Driver 2.");
            return;
        }

        if (d1Name.toLowerCase() === d2Name.toLowerCase()) {
            alert("Driver 1 and Driver 2 must be different drivers.");
            return;
        }

        // Check if team name already exists in this season
        if (activeTeams.some(t => t.name.toLowerCase() === trimmedName.toLowerCase())) {
            alert(`A team named "${trimmedName}" already exists in this season.`);
            return;
        }

        const newTeam = {
            id: `team_${Date.now()}`,
            name: trimmedName,
            driver1Id: String(d1Id),
            driver1Name: d1Name,
            driver2Id: String(d2Id),
            driver2Name: d2Name,
            createdAt: new Date().toISOString()
        };

        setIsSaving(true);
        try {
            const updated = [...activeTeams, newTeam];
            await updateSeasonTeams(updated);
            setTeamName('');
            setDriver1Id('');
            setDriver2Id('');
            setDriver1Manual('');
            setDriver2Manual('');
            setUseManual1(false);
            setUseManual2(false);
            alert(`Team "${newTeam.name}" created successfully!`);
        } catch (err) {
            alert("Error creating team: " + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteTeam = async (teamId, name) => {
        if (!currentUser) return;
        if (!confirm(`Are you sure you want to delete team "${name}"?`)) return;

        setIsSaving(true);
        try {
            const updated = activeTeams.filter(t => t.id !== teamId);
            await updateSeasonTeams(updated);
        } catch (err) {
            alert("Error deleting team: " + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const filteredTeams = activeTeams.filter(t => {
        if (!searchFilter.trim()) return true;
        const q = searchFilter.toLowerCase();
        return (
            t.name.toLowerCase().includes(q) ||
            (t.driver1Name && t.driver1Name.toLowerCase().includes(q)) ||
            (t.driver2Name && t.driver2Name.toLowerCase().includes(q))
        );
    });

    return (
        <div>
            {/* Create Team Form */}
            <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
                <h3 style={{ marginBottom: '0.5rem', color: 'var(--text-main)' }}>Create Team</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                    Assign two drivers to a team for the Team Championship. Points will automatically sum their individual race points.
                </p>

                <form onSubmit={handleCreateTeam}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
                        {/* Team Name */}
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Team Name *
                            </label>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="e.g. Scuderia OOFS"
                                value={teamName}
                                onChange={(e) => setTeamName(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.65rem 0.85rem',
                                    borderRadius: 'var(--radius-sm)',
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid var(--border-color)',
                                    color: 'white',
                                    fontSize: '0.95rem'
                                }}
                            />
                        </div>

                        {/* Driver 1 */}
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Driver 1 *
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setUseManual1(!useManual1)}
                                    style={{ background: 'none', border: 'none', color: 'var(--primary-color)', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}
                                >
                                    {useManual1 ? 'Pick from List' : 'Custom Name'}
                                </button>
                            </div>

                            {useManual1 ? (
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Type driver name"
                                    value={driver1Manual}
                                    onChange={(e) => setDriver1Manual(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '0.65rem 0.85rem',
                                        borderRadius: 'var(--radius-sm)',
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid var(--border-color)',
                                        color: 'white'
                                    }}
                                />
                            ) : (
                                <select
                                    className="form-control"
                                    value={driver1Id}
                                    onChange={(e) => setDriver1Id(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '0.65rem 0.85rem',
                                        borderRadius: 'var(--radius-sm)',
                                        background: 'rgba(20,20,30,0.95)',
                                        border: '1px solid var(--border-color)',
                                        color: 'white',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <option value="">-- Select Driver 1 --</option>
                                    {availableDrivers.map(d => (
                                        <option key={`d1-${d.id}`} value={d.id} disabled={String(d.id) === String(driver2Id)}>
                                            {formatDriverName(d.name)} {d.class ? `(${d.class})` : ''}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>

                        {/* Driver 2 */}
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    Driver 2 *
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setUseManual2(!useManual2)}
                                    style={{ background: 'none', border: 'none', color: 'var(--primary-color)', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}
                                >
                                    {useManual2 ? 'Pick from List' : 'Custom Name'}
                                </button>
                            </div>

                            {useManual2 ? (
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Type driver name"
                                    value={driver2Manual}
                                    onChange={(e) => setDriver2Manual(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '0.65rem 0.85rem',
                                        borderRadius: 'var(--radius-sm)',
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid var(--border-color)',
                                        color: 'white'
                                    }}
                                />
                            ) : (
                                <select
                                    className="form-control"
                                    value={driver2Id}
                                    onChange={(e) => setDriver2Id(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '0.65rem 0.85rem',
                                        borderRadius: 'var(--radius-sm)',
                                        background: 'rgba(20,20,30,0.95)',
                                        border: '1px solid var(--border-color)',
                                        color: 'white',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <option value="">-- Select Driver 2 --</option>
                                    {availableDrivers.map(d => (
                                        <option key={`d2-${d.id}`} value={d.id} disabled={String(d.id) === String(driver1Id)}>
                                            {formatDriverName(d.name)} {d.class ? `(${d.class})` : ''}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={isSaving}
                        style={{
                            padding: '0.65rem 1.75rem',
                            fontWeight: 'bold',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem'
                        }}
                    >
                        {isSaving ? 'Saving Team...' : '+ Add Team'}
                    </button>
                </form>
            </div>

            {/* Active Teams List */}
            <div className="glass-panel" style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div>
                        <h3 style={{ margin: 0, color: 'var(--text-main)' }}>Active Teams ({activeTeams.length})</h3>
                        <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            Teams configured for this series will be displayed on the public Standings board under the Teams tab.
                        </p>
                    </div>

                    {activeTeams.length > 5 && (
                        <input
                            type="text"
                            placeholder="Filter teams..."
                            value={searchFilter}
                            onChange={(e) => setSearchFilter(e.target.value)}
                            style={{
                                padding: '0.4rem 0.8rem',
                                background: 'rgba(255,255,255,0.05)',
                                border: '1px solid var(--border-color)',
                                borderRadius: 'var(--radius-sm)',
                                color: 'white',
                                fontSize: '0.85rem'
                            }}
                        />
                    )}
                </div>

                {filteredTeams.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                        {activeTeams.length === 0
                            ? 'No teams created yet for this series. Use the form above to add a team.'
                            : 'No teams match your search filter.'}
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table className="table" style={{ width: '100%', minWidth: '650px', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--primary)', color: 'var(--text-main)' }}>
                                    <th style={{ padding: '0.85rem 1rem' }}>#</th>
                                    <th style={{ padding: '0.85rem 1rem' }}>Team Name</th>
                                    <th style={{ padding: '0.85rem 1rem' }}>Driver 1</th>
                                    <th style={{ padding: '0.85rem 1rem' }}>Driver 2</th>
                                    <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTeams.map((team, index) => (
                                    <tr
                                        key={team.id || index}
                                        style={{
                                            borderBottom: '1px solid var(--border-color)',
                                            transition: 'background 0.2s'
                                        }}
                                    >
                                        <td style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)' }}>
                                            {index + 1}
                                        </td>
                                        <td style={{ padding: '0.85rem 1rem', fontWeight: 'bold', color: 'white' }}>
                                            {team.name}
                                        </td>
                                        <td style={{ padding: '0.85rem 1rem' }}>
                                            <span style={{ color: 'var(--primary-color)' }}>🏎️</span> {formatDriverName(team.driver1Name)}
                                        </td>
                                        <td style={{ padding: '0.85rem 1rem' }}>
                                            <span style={{ color: 'var(--primary-color)' }}>🏎️</span> {formatDriverName(team.driver2Name)}
                                        </td>
                                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                                            <button
                                                className="btn btn-ghost"
                                                onClick={() => handleDeleteTeam(team.id, team.name)}
                                                disabled={isSaving}
                                                style={{
                                                    color: 'var(--danger)',
                                                    padding: '0.3rem 0.6rem',
                                                    fontSize: '0.8rem',
                                                    border: '1px solid rgba(239, 68, 68, 0.3)',
                                                    borderRadius: '4px'
                                                }}
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TeamsTab;
