import { useNavigate } from 'react-router-dom';
import logo from '../assets/oofs_logo.png';

const Archive = () => {
    const navigate = useNavigate();

    const handleSeasonSelect = (seasonId) => {
        navigate(`/season/${seasonId}`);
    };

    return (
        <div className="home-wrapper">
            <div className="home-bg-layer" />
            <div className="home-overlay" />

            <div className="home-content">
                <h1 className="home-title">OOFS RACING</h1>
                <p className="home-subtitle">Championship Archive</p>

                <div className="home-grid">
                    {/* Season 3 Multiclass */}
                    <div
                        className="home-card"
                        onClick={() => handleSeasonSelect('3')}
                    >
                        <div
                            className="home-card-line"
                            style={{ background: 'linear-gradient(90deg, #7B1FA2, #E1BEE7)' }}
                        ></div>
                        <span className="home-card-type">Season 3</span>
                        <h2 className="home-card-title">Multiclass</h2>
                        <p className="home-card-desc">
                            The main event.
                            <br />
                            <strong>LMP2-UR • LMGT3</strong>
                        </p>
                    </div>

                    {/* Season 3 Sprint */}
                    <div
                        className="home-card"
                        onClick={() => handleSeasonSelect('s3-sprint')}
                    >
                        <div
                            className="home-card-line"
                            style={{ background: 'linear-gradient(90deg, #64DD17, #CCFF90)' }}
                        ></div>
                        <span className="home-card-type">Season 3</span>
                        <h2 className="home-card-title">Sprint Series</h2>
                        <p className="home-card-desc">
                            High intensity, short format.
                            <br />
                            <strong>LMGT3</strong>
                        </p>
                    </div>

                    {/* Season 2 */}
                    <div
                        className="home-card"
                        onClick={() => handleSeasonSelect('2')}
                    >
                        <div
                            className="home-card-line"
                            style={{ background: 'linear-gradient(90deg, #1976D2, #BBDEFB)' }}
                        ></div>
                        <span className="home-card-type">Season 2</span>
                        <h2 className="home-card-title">Championship</h2>
                        <p className="home-card-desc">
                            The previous season.
                            <br />
                            <strong>LMP2 • LMGT3</strong>
                        </p>
                    </div>
                </div>

                <div style={{ marginTop: '2rem' }}>
                    <button
                        className="btn btn-secondary"
                        onClick={() => navigate('/')}
                        style={{ background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', padding: '0.75rem 2rem', borderRadius: '4px', cursor: 'pointer', fontFamily: "'Oxanium', sans-serif", fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em', transition: 'all 0.2s', marginTop: '1rem' }}
                    >
                        Back to Current Season
                    </button>
                </div>

                {/* OOFS Logo */}
                <div style={{ marginTop: '4rem', opacity: 0.8 }}>
                    <img src={logo} alt="OOFS Racing Logo" style={{ width: '120px', height: 'auto' }} />
                </div>

            </div>
        </div>
    );
};

export default Archive;
