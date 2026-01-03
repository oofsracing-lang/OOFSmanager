import { useState } from 'react';
import { useChampionship } from '../context/ChampionshipContext';
import { formatTime } from '../utils/timeHelpers';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

const Qualifying = () => {
    const { qualifyingSettings, submitQualifyingResult, currentSeasonId } = useChampionship();
    const [status, setStatus] = useState('IDLE'); // IDLE, PROCESSING, SUCCESS, ERROR, SELECTING_DRIVER
    const [resultMessage, setResultMessage] = useState(null);
    const [lastSubmission, setLastSubmission] = useState(null);
    const [driversList, setDriversList] = useState([]);
    const [cachedFileContent, setCachedFileContent] = useState(null);

    // Import functions (Lazy load or assume global available via context? Usually imported from firebase config)
    // We assume `functions` is exported from `../firebase/db` or similar, but typically we need `getFunctions`.
    // Let's use the standard import pattern if available, or just fetch from window/module if configured.
    // In this project structure, we need to verify where `functions` instance is safely exposed.
    // Looking at Context, it usually exposes `submitQualifyingResult` which is a DB write.
    // Now we need a CALLABLE.

    // Functions initialized globally

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
        </div>
    );
};

export default Qualifying;
