import { useState } from 'react';
import { useChampionship } from '../context/ChampionshipContext';
import { formatTime } from '../utils/timeHelpers';
import { httpsCallable } from 'firebase/functions';
import { functions, storage } from '../firebase';
import { ref, uploadBytes } from 'firebase/storage';

const Qualifying = () => {
    const { qualifyingSettings, submitQualifyingResult, currentSeasonId } = useChampionship();
    const [copiedPath, setCopiedPath] = useState(false);
    const [status, setStatus] = useState('IDLE'); // IDLE, PROCESSING, SUCCESS, ERROR, SELECTING_DRIVER
    const [resultMessage, setResultMessage] = useState(null);
    const [lastSubmission, setLastSubmission] = useState(null);
    const [driversList, setDriversList] = useState([]);
    const [cachedFileContent, setCachedFileContent] = useState(null);

    const processDriver = async (driver) => {
        if (!cachedFileContent) return;

        setStatus('PROCESSING');
        setResultMessage(`Analyzing for ${driver.driverName}...`);

        try {
            const submitQualifying = httpsCallable(functions, 'submitQualifying');
            const result = await submitQualifying({
                xmlContent: cachedFileContent,
                seasonId: String(currentSeasonId || 3),
                driverName: driver.driverName // New param
            });

            const data = result.data;
            if (data.success) {
                setLastSubmission(data.submission);
                setStatus('SUCCESS');
                setResultMessage(data.message);
                setCachedFileContent(null); // Clear cache
                setDriversList([]);
            } else {
                throw new Error(data.message || "Submission failed");
            }
        } catch (err) {
            console.error(err);
            setStatus('ERROR');
            setResultMessage("Error: " + (err.message || "Cloud processing failed"));
        }
    };

    const handleFileChange = async (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;

        setStatus('PROCESSING');
        setResultMessage("Uploading and Analyzing on Cloud...");
        setLastSubmission(null);
        setDriversList([]);

        try {
            // 1. Auto-Backup to Storage
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const safeName = selectedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const storagePath = `season_${currentSeasonId || 3}/uploads/${timestamp}_${safeName}`;
            const storageRef = ref(storage, storagePath);

            // Non-blocking upload (fire and forget, or await if strict safety needed)
            // Awaiting ensures we have a backup before processing
            await uploadBytes(storageRef, selectedFile);
            console.log("Backup uploaded to:", storagePath);

            const text = await selectedFile.text();
            setCachedFileContent(text); // Cache for potential re-submission

            const submitQualifying = httpsCallable(functions, 'submitQualifying');

            // Call Cloud Function (Initial Attempt)
            const result = await submitQualifying({
                xmlContent: text,
                seasonId: String(currentSeasonId || 3)
            });

            const data = result.data; // { success, submission, message, status, drivers }

            if (data.success) {
                setLastSubmission(data.submission);
                setStatus('SUCCESS');
                setResultMessage(data.message);
            } else if (data.status === 'MULTIPLE_DRIVERS') {
                setStatus('SELECTING_DRIVER');
                setDriversList(data.drivers || []);
                setResultMessage("Multiple drivers found. Please select yours.");
            } else {
                // Other logic failure?
                throw new Error(data.message || "Unknown error");
            }

        } catch (err) {
            console.error(err);
            setStatus('ERROR');
            setResultMessage("Error: " + (err.message || "Cloud processing failed"));
        }

        // Clear input to allow re-upload of same file
        e.target.value = null;
    };

    return (
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '4rem 2rem', textAlign: 'center' }}>
            <h1 style={{ marginBottom: '3rem', fontSize: '2.5rem' }}>Qualifying Submission</h1>

            <div className="glass-panel" style={{ padding: '3rem' }}>
                <div style={{ marginBottom: '1rem', textAlign: 'left' }}>
                    <label style={{ display: 'block', marginBottom: '0.8rem', color: 'var(--text-muted)' }}>Qualifying XML</label>
                    <div style={{ position: 'relative', overflow: 'hidden', display: 'inline-block', width: '100%' }}>
                        <input
                            type="file"
                            accept=".xml"
                            className="form-control"
                            style={{ width: '100%', padding: '1rem', cursor: 'pointer' }}
                            onChange={handleFileChange}
                            disabled={status === 'PROCESSING'}
                        />
                    </div>
                </div>

                {status === 'ERROR' && (
                    <div style={{ marginTop: '1.5rem', color: 'var(--danger)', fontWeight: 'bold' }}>
                        {resultMessage}
                    </div>
                )}

                {status === 'PROCESSING' && (
                    <div style={{ marginTop: '1.5rem', color: 'var(--info)' }}>
                        {resultMessage || "Processing..."}
                    </div>
                )}

                {status === 'SELECTING_DRIVER' && (
                    <div style={{ marginTop: '2rem', textAlign: 'left' }}>
                        <h3 style={{ marginBottom: '1rem', color: 'var(--text-primary)' }}>Select Your Driver</h3>
                        <p style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>Multiple drivers found. Which one is you?</p>
                        <div style={{ display: 'grid', gap: '0.5rem' }}>
                            {driversList.map((driver, idx) => (
                                <button
                                    key={idx}
                                    className="btn btn-secondary"
                                    style={{
                                        textAlign: 'left',
                                        padding: '1rem',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}
                                    onClick={() => processDriver(driver)}
                                >
                                    <span>
                                        <strong>{driver.driverName}</strong>
                                        <span style={{ marginLeft: '0.5rem', opacity: 0.7 }}>({driver.carClass})</span>
                                    </span>
                                    <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                        {driver.lapCount} Laps used for analysis
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Result Table */}
            {status === 'SUCCESS' && lastSubmission && (
                <div className="glass-panel" style={{ marginTop: '2rem', padding: '2rem', animation: 'fadeIn 0.5s ease' }}>
                    <h2 style={{
                        marginBottom: '1.5rem',
                        color: lastSubmission.passed ? 'var(--success)' : 'var(--danger)',
                        borderBottom: '1px solid var(--border-color)',
                        paddingBottom: '1rem'
                    }}>
                        {resultMessage}
                    </h2>

                    <div style={{ overflowX: 'auto' }}>
                        <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                                    <th style={{ padding: '1rem' }}>Driver Name</th>
                                    <th style={{ padding: '1rem' }}>Class</th>
                                    <th style={{ padding: '1rem' }}>Car</th>
                                    <th style={{ padding: '1rem' }}>Track</th>
                                    <th style={{ padding: '1rem' }}>Best Avg</th>
                                    <th style={{ padding: '1rem' }}>Required Avg</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td style={{ padding: '1rem', fontWeight: 'bold' }}>{lastSubmission.driverName}</td>
                                    <td style={{ padding: '1rem' }}>{lastSubmission.carClass}</td>
                                    <td style={{ padding: '1rem' }}>{lastSubmission.carType}</td>
                                    <td style={{ padding: '1rem' }}>{lastSubmission.track}</td>
                                    <td style={{ padding: '1rem', fontFamily: 'monospace', fontSize: '1.1rem' }}>
                                        {formatTime(lastSubmission.bestAverage)}
                                    </td>
                                    <td style={{ padding: '1rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                                        {formatTime(lastSubmission.criteriaUsed.maxAvgTime)}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Qualifying Instructions & Requirements */}
            <div className="glass-panel" style={{ marginTop: '2.5rem', padding: '2.5rem', textAlign: 'left' }}>
                <h2 style={{ fontSize: '1.5rem', margin: '0 0 1.5rem 0', color: 'var(--text-main)', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                    Qualifying Instructions
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                    {/* Endurance */}
                    <div>
                        <h3 style={{ fontSize: '1.3rem', color: 'var(--primary)', marginBottom: '1rem' }}>
                            Endurance
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', color: 'var(--text-secondary)', lineHeight: '1.7', fontSize: '0.95rem' }}>
                            <div style={{
                                background: 'rgba(255, 255, 255, 0.03)',
                                borderLeft: '4px solid var(--primary)',
                                padding: '1.25rem',
                                borderRadius: '0 8px 8px 0'
                            }}>
                                <h4 style={{ color: 'var(--text-main)', marginBottom: '0.6rem', fontSize: '1.05rem' }}>
                                    Qualifying Requirements:
                                </h4>
                                <ul style={{ margin: 0, paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                    <li><strong>Track:</strong> Fuji Classic</li>
                                    <li><strong>Laps:</strong> 7 consecutive</li>
                                    <li><strong>Time:</strong> Average of 104% (1:32.00)</li>
                                    <li><strong>Only new Hypercar drivers need to complete this.</strong> Licenses carry over from the most recent season.</li>
                                </ul>
                            </div>

                            <p style={{ margin: 0 }}>
                                Run this in a private session (race weekend) or an OOFS qualifying session. Any track conditions or setups allowed (goldilocks temps and saturated grip).
                            </p>

                            <div>
                                <p style={{ margin: '0 0 0.5rem 0' }}>
                                    Once laps are complete. close the session and navigate to:
                                </p>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    background: 'rgba(0, 0, 0, 0.45)',
                                    padding: '0.65rem 1rem',
                                    borderRadius: '6px',
                                    fontFamily: 'monospace',
                                    fontSize: '0.85rem',
                                    color: 'var(--text-main)',
                                    overflowX: 'auto',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    justifyContent: 'space-between',
                                    gap: '1rem'
                                }}>
                                    <span style={{ wordBreak: 'break-all' }}>C:\Program Files (x86)\Steam\steamapps\common\Le Mans Ultimate\UserData\Log\Results</span>
                                    <button
                                        type="button"
                                        className="btn btn-ghost"
                                        style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem', flexShrink: 0, border: '1px solid var(--border-color)' }}
                                        onClick={() => {
                                            navigator.clipboard.writeText("C:\\Program Files (x86)\\Steam\\steamapps\\common\\Le Mans Ultimate\\UserData\\Log\\Results");
                                            setCopiedPath(true);
                                            setTimeout(() => setCopiedPath(false), 2000);
                                        }}
                                    >
                                        {copiedPath ? 'Copied!' : 'Copy Path'}
                                    </button>
                                </div>
                            </div>

                            <p style={{ margin: 0 }}>
                                Verify the session practice file (ex <code>2026_01_02_21_29_45-78P1.xml</code>) is there.
                            </p>

                            <p style={{ margin: 0 }}>
                                Submit the file above. A message will appear if you passed or failed upon submission. Admins will receive that information as well so no need to message after submission.
                            </p>
                        </div>
                    </div>

                    {/* Sprint */}
                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '2rem' }}>
                        <h3 style={{ fontSize: '1.3rem', color: 'var(--primary)', marginBottom: '1rem' }}>
                            Sprint
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', color: 'var(--text-secondary)', lineHeight: '1.7', fontSize: '0.95rem' }}>
                            <div style={{
                                background: 'rgba(255, 255, 255, 0.03)',
                                borderLeft: '4px solid var(--primary)',
                                padding: '1.25rem',
                                borderRadius: '0 8px 8px 0'
                            }}>
                                <h4 style={{ color: 'var(--text-main)', marginBottom: '0.6rem', fontSize: '1.05rem' }}>
                                    Qualifying Requirements:
                                </h4>
                                <ul style={{ margin: 0, paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                    <li><strong>Track:</strong> Fuji Classic</li>
                                    <li><strong>Laps:</strong> 7 consecutive</li>
                                    <li><strong>Time:</strong> Average of 104% (1:39.00)</li>
                                    <li><strong>Only new LMP3 drivers need to complete this.</strong> Licenses carry over from the most recent season.</li>
                                </ul>
                            </div>

                            <p style={{ margin: 0 }}>
                                Run this in a private session (race weekend) or an OOFS qualifying session. Any track conditions or setups allowed (goldilocks temps and saturated grip).
                            </p>

                            <div>
                                <p style={{ margin: '0 0 0.5rem 0' }}>
                                    Once laps are complete. close the session and navigate to:
                                </p>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    background: 'rgba(0, 0, 0, 0.45)',
                                    padding: '0.65rem 1rem',
                                    borderRadius: '6px',
                                    fontFamily: 'monospace',
                                    fontSize: '0.85rem',
                                    color: 'var(--text-main)',
                                    overflowX: 'auto',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    justifyContent: 'space-between',
                                    gap: '1rem'
                                }}>
                                    <span style={{ wordBreak: 'break-all' }}>C:\Program Files (x86)\Steam\steamapps\common\Le Mans Ultimate\UserData\Log\Results</span>
                                    <button
                                        type="button"
                                        className="btn btn-ghost"
                                        style={{ padding: '0.2rem 0.6rem', fontSize: '0.75rem', flexShrink: 0, border: '1px solid var(--border-color)' }}
                                        onClick={() => {
                                            navigator.clipboard.writeText("C:\\Program Files (x86)\\Steam\\steamapps\\common\\Le Mans Ultimate\\UserData\\Log\\Results");
                                            setCopiedPath(true);
                                            setTimeout(() => setCopiedPath(false), 2000);
                                        }}
                                    >
                                        {copiedPath ? 'Copied!' : 'Copy Path'}
                                    </button>
                                </div>
                            </div>

                            <p style={{ margin: 0 }}>
                                Verify the session practice file (ex <code>2026_01_02_21_29_45-78P1.xml</code>) is there.
                            </p>

                            <p style={{ margin: 0 }}>
                                Submit the file above. A message will appear if you passed or failed upon submission. Admins will receive that information as well so no need to message after submission.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Qualifying;
