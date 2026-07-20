import { useState, useEffect } from 'react';
import { useChampionship } from '../context/ChampionshipContext';
import { saveIncident, subscribeToIncidents } from '../firebase/db';
import { formatDriverName } from '../utils/formatting';
import { useAuth } from '../context/AuthContext';

const Stewarding = () => {
    const { currentUser } = useAuth();
    const { championshipData, currentSeasonId } = useChampionship();
    const [incidents, setIncidents] = useState([]);

    // Form State
    const [selectedRace, setSelectedRace] = useState('');
    const [carNumbers, setCarNumbers] = useState('');
    const [timestamp, setTimestamp] = useState('');
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    // Subscribe to incidents
    useEffect(() => {
        if (!currentSeasonId) return;
        const unsubscribe = subscribeToIncidents(currentSeasonId, (data) => {
            setIncidents(data);
        });
        return () => unsubscribe();
    }, [currentSeasonId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedRace || !carNumbers || !timestamp || !description) {
            alert("Please fill in all fields.");
            return;
        }

        setIsSubmitting(true);
        try {
            await saveIncident({
                seasonId: String(currentSeasonId),
                raceId: selectedRace,
                carNumbers,
                timestamp,
                description
            });

            // Reset Form
            setCarNumbers('');
            setTimestamp('');
            setDescription('');
            setSubmitted(true);
        } catch (error) {
            console.error("Submission error:", error);
            alert("Failed to submit incident.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Helper to get race name
    const getRaceName = (raceId) => {
        const race = championshipData?.races?.find(r => String(r.id) === String(raceId));
        return race ? (race.track || race.name) : `Round ${raceId}`;
    };

    // Helper to get penalized driver number
    const getPenalizedDriverNumber = (driverId) => {
        if (!driverId) return '-';
        const driver = championshipData?.drivers?.find(d => d.id === Number(driverId));
        return driver ? `#${driver.number}` : '-';
    };

    // Helper to format public description without exposing force factor
    const formatPublicDescription = (desc) => {
        if (!desc) return '';
        return desc
            .replace(/\s*\[Impact Force:\s*[\d.]+\]/gi, '')
            .replace(/\s*\[Force:\s*[\d.]+\]/gi, '');
    };

    return (
        <div className="fade-in">
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                <h1 style={{ fontSize: '3rem', fontWeight: '800', marginBottom: '1rem', letterSpacing: '-0.02em' }}>
                    Race Control
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>
                    Submit incident reports and view stewards' decisions.
                </p>
            </div>

            {/* Submission Form or Success Message */}
            <div className="glass-panel" style={{ padding: '2.5rem', marginBottom: '3rem' }}>
                <h2 style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                    Submit Incident Report
                </h2>

                {submitted ? (
                    <div className="fade-in" style={{ textAlign: 'center', padding: '2rem' }}>
                        <div style={{ fontSize: '4rem', color: 'var(--success)', marginBottom: '1rem' }}>✓</div>
                        <h3 style={{ marginBottom: '1rem', color: 'white' }}>Report Submitted Successfully</h3>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
                            The stewards have received your report and will review it shortly.
                        </p>
                        <button
                            className="btn btn-primary"
                            onClick={() => setSubmitted(false)}
                        >
                            Submit Another Report
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div className="stewarding-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Race Session *</label>
                                <select
                                    className="form-control"
                                    value={selectedRace}
                                    onChange={(e) => setSelectedRace(e.target.value)}
                                    required
                                    style={{ width: '100%' }}
                                >
                                    <option value="">-- Select Race --</option>
                                    {championshipData?.races?.map(race => (
                                        <option key={race.id} value={race.id}>
                                            Round {race.id}: {race.track || race.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Cars Involved *</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="e.g. #14, #228"
                                    value={carNumbers}
                                    onChange={(e) => setCarNumbers(e.target.value)}
                                    required
                                    style={{ width: '100%' }}
                                />
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Timestamp / Lap Number *</label>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="e.g. Lap 4, Turn 1 (18:30 elapsed)"
                                value={timestamp}
                                onChange={(e) => setTimestamp(e.target.value)}
                                required
                                style={{ width: '100%' }}
                            />
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Description of Incident *</label>
                            <textarea
                                className="form-control"
                                rows="4"
                                placeholder="Describe what happened..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                required
                                style={{ width: '100%', resize: 'vertical' }}
                            />
                        </div>

                        <div style={{ textAlign: 'right' }}>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={isSubmitting}
                                style={{ minWidth: '150px' }}
                            >
                                {isSubmitting ? 'Submitting...' : 'Submit Report'}
                            </button>
                        </div>
                    </form>
                )}
            </div>

            {/* Incidents Board */}
            <div className="glass-panel" style={{ padding: '0' }}>
                <div style={{ padding: '2rem 2rem 1rem 2rem', borderBottom: '1px solid var(--border-color)' }}>
                    <h3>Stewards' Decisions</h3>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', minWidth: '900px', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: 'rgba(255,255,255,0.05)', textAlign: 'left' }}>
                                <th style={{ padding: '1rem 0.5rem' }}>Review Status</th>
                                <th style={{ padding: '1rem 0.5rem' }}>Race</th>
                                <th style={{ padding: '1rem 0.5rem' }}>Cars</th>
                                <th style={{ padding: '1rem 0.5rem', minWidth: '300px' }}>Description</th>
                                <th style={{ padding: '1rem 0.5rem' }}>Timestamp</th>
                                <th style={{ padding: '1rem 0.5rem' }}>Car #</th>
                                <th style={{ padding: '1rem 0.5rem' }}>Decision</th>
                                <th style={{ padding: '1rem 0.5rem' }}>Penalty</th>
                            </tr>
                        </thead>
                        <tbody>
                            {incidents.length === 0 ? (
                                <tr>
                                    <td colSpan="8" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        No incidents reported yet.
                                    </td>
                                </tr>
                            ) : (
                                incidents.map(incident => (
                                    <tr key={incident.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <td style={{ padding: '1rem' }}>
                                            <span
                                                className={`badge ${['Reviewed', 'Complete'].includes(incident.status) ? 'badge-success' : 'badge-warning'}`}
                                                style={{
                                                    padding: '0.25rem 0.5rem',
                                                    borderRadius: '4px',
                                                    fontSize: '0.75rem',
                                                    textTransform: 'uppercase',
                                                    background: ['Reviewed', 'Complete'].includes(incident.status) ? 'var(--success)' : 'var(--warning)',
                                                    color: '#000',
                                                    fontWeight: 'bold'
                                                }}
                                            >
                                                {incident.status || 'Pending'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1rem', fontWeight: 'bold' }}>{getRaceName(incident.raceId)}</td>
                                        <td style={{ padding: '1rem' }}>
                                            {incident.isFinal ? incident.carNumbers : <span style={{ color: 'var(--text-muted)' }}>-</span>}
                                        </td>
                                        <td style={{ padding: '1rem', fontSize: '0.9rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                            {incident.isFinal ? (
                                                incident.stewardNotes ? (
                                                    <>
                                                        <div style={{ color: 'white', marginBottom: '0.5rem' }}>{incident.stewardNotes}</div>
                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', borderLeft: '2px solid var(--border-color)', paddingLeft: '0.5rem' }}>
                                                            Original: {formatPublicDescription(incident.description)}
                                                        </div>
                                                    </>
                                                ) : (
                                                    <span style={{ color: 'var(--text-muted)' }}>{formatPublicDescription(incident.description)}</span>
                                                )
                                            ) : (
                                                <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Pending stewarding review...</span>
                                            )}
                                        </td>
                                        <td style={{ padding: '1rem', wordBreak: 'break-word' }}>
                                            {incident.isFinal ? incident.timestamp : <span style={{ color: 'var(--text-muted)' }}>-</span>}
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            {incident.isFinal ? (
                                                <>
                                                    <div style={{ fontWeight: 'bold', color: 'var(--accent)', fontSize: '1.2rem' }}>
                                                        {getPenalizedDriverNumber(incident.penalizedDriverId)}
                                                    </div>
                                                    {incident.penalizedDriverId && (
                                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                                            {(() => {
                                                                const d = championshipData?.drivers?.find(driver => driver.id === Number(incident.penalizedDriverId));
                                                                return d ? formatDriverName(d.name) : '';
                                                            })()}
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <span style={{ color: 'var(--text-muted)' }}>-</span>
                                            )}
                                        </td>
                                        <td style={{ padding: '1rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                                            {incident.isFinal ? (incident.decision || '-') : <span style={{ color: 'var(--text-muted)' }}>-</span>}
                                        </td>
                                        <td style={{ padding: '1rem' }}>
                                            {incident.isFinal ? (
                                                incident.decision ? (
                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                        {incident.timePenalty > 0 && <span style={{ color: 'var(--danger)' }}>+{incident.timePenalty}s</span>}
                                                    </div>
                                                ) : '-'
                                            ) : (
                                                <span style={{ color: 'var(--text-muted)' }}>-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Stewarding;
