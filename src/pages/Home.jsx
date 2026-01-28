
import { useNavigate } from 'react-router-dom';
import logo from '../assets/oofs_logo.png';

const Home = () => {
    const navigate = useNavigate();

    const handleSeasonSelect = (seasonId) => {
        // Navigation drives the state now via SeasonLayout
        navigate(`/season/${seasonId}`);
    };

    return (
        <div className="home-wrapper">
            {/* Fixed Background Layers */}
            <div className="home-bg-layer" />
            <div className="home-overlay" />

            {/* Scrollable Content */}
            <div className="home-content">
                <h1 className="home-title">OOFS RACING</h1>
                <p className="home-subtitle">Championship Portal</p>

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
                </div>

                {/* Social Links */}
                <div className="social-container">
                    <a
                        href="https://discord.gg/F292B8qAU4"
                        target="_blank"
                        rel="noreferrer"
                        className="social-btn"
                    >
                        {/* Simple Discord Icon SVG */}
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.086 2.157 2.419 0 1.334-.956 2.419-2.157 2.419zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.086 2.157 2.419 0 1.334-.946 2.419-2.157 2.419z" />
                        </svg>
                        Join Discord
                    </a>

                    <a
                        href="https://www.thesimgrid.com/communities/out-of-fuel-sim-racing-oofs-racing"
                        target="_blank"
                        rel="noreferrer"
                        className="social-btn"
                    >
                        {/* Simple Grid/Flag Icon SVG */}
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M4 4h4v4H4V4zm6 0h4v4h-4V4zm6 0h4v4h-4V4zM4 10h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4zM4 16h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4z" />
                        </svg>
                        The SimGrid
                    </a>

                    <a
                        href="https://www.youtube.com/@oofsracing"
                        target="_blank"
                        rel="noreferrer"
                        className="social-btn"
                    >
                        {/* Simple YouTube Icon SVG */}
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                        </svg>
                        YouTube
                    </a>
                </div>

                <button
                    className="archive-btn"
                    onClick={() => handleSeasonSelect('2')} // Simulating going to archived season 2
                >
                    View Archived Seasons
                </button>

                {/* OOFS Logo */}
                <div style={{ marginTop: '4rem', opacity: 0.8 }}>
                    <img src={logo} alt="OOFS Racing Logo" style={{ width: '120px', height: 'auto' }} />
                </div>

            </div>
        </div>
    );
};

export default Home;
