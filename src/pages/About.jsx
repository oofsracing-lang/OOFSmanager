import { useNavigate } from 'react-router-dom';
import logo from '../assets/oofs_logo.png';

const About = () => {
    const navigate = useNavigate();

    return (
        <div className="home-wrapper">
            <div className="home-bg-layer" />
            <div className="home-overlay" />

            <div className="home-content about-content">
                {/* Header */}
                <h1 className="home-title">OOFS RACING</h1>
                <p className="home-subtitle">About Our League</p>

                {/* Core Mission Banner */}
                <div className="about-hero-card">
                    <div className="about-hero-line"></div>
                    <p className="about-mission-quote">
                        “OOFS Racing is an adult-only community dedicated to organizing competitive LMU league racing within a positive, respectful, and enjoyable environment. We strive to deliver structured events, clean racing, and a culture that supports both performance and camaraderie.”
                    </p>
                </div>

                {/* Values & Pillars */}
                <div className="about-grid">
                    <div className="about-card">
                        <div className="about-card-icon">🛡️</div>
                        <h3 className="about-card-title">Clean & Structured Racing</h3>
                        <p className="about-card-text">
                            We pride ourselves on professional stewarding, clear sporting regulations, and an active driver license points system. Our qualification benchmarks ensure high standards and close, safe competition on track.
                        </p>
                    </div>

                    <div className="about-card">
                        <div className="about-card-icon">🤝</div>
                        <h3 className="about-card-title">Adult Paddock & Camaraderie</h3>
                        <p className="about-card-text">
                            We are an adult-only community that values mutual respect and good sportsmanship above all. Whether you are battling for the championship or turning your first competitive laps, you'll find a welcoming, ego-free atmosphere.
                        </p>
                    </div>

                    <div className="about-card">
                        <div className="about-card-icon">⏱️</div>
                        <h3 className="about-card-title">Data & Driver Progression</h3>
                        <p className="about-card-text">
                            Powered by custom telemetry and XML results parsing, our portal tracks standings, driver profiles, and performance metrics across every round so you can measure your growth over every season.
                        </p>
                    </div>
                </div>

                {/* Series Breakdown */}
                <h2 className="about-section-heading">Championship Series</h2>
                <div className="about-series-container">
                    <div className="about-series-card endurance-accent">
                        <div className="about-series-badge">Season 6</div>
                        <h3 className="about-series-title">Endurance Championship</h3>
                        <div className="about-series-classes">HYPERCAR • LMGT3</div>
                        <p className="about-series-desc">
                            Simulating the full thrill of the FIA World Endurance Championship. Extended race formats demanding pit strategy, tire management, and disciplined multiclass traffic navigation across world-renowned circuits.
                        </p>
                    </div>

                    <div className="about-series-card sprint-accent">
                        <div className="about-series-badge">Season 6</div>
                        <h3 className="about-series-title">Sprint Series</h3>
                        <div className="about-series-classes">LMP3 • LMGT3</div>
                        <p className="about-series-desc">
                            High-tempo, punchy multiclass sprint races where every corner counts. Fierce wheel-to-wheel battles and rapid strategy in the agile LMP3 prototype and LMGT3 machines.
                        </p>
                    </div>
                </div>

                {/* Community & Action Links */}
                <div className="about-actions">
                    <button
                        className="archive-btn"
                        onClick={() => navigate('/')}
                        style={{ marginTop: 0 }}
                    >
                        Return to Portal
                    </button>
                    <a
                        href="https://discord.gg/F292B8qAU4"
                        target="_blank"
                        rel="noreferrer"
                        className="archive-btn about-discord-btn"
                        style={{ marginTop: 0 }}
                    >
                        Join Our Discord
                    </a>
                </div>

                {/* OOFS Logo */}
                <div style={{ marginTop: '3.5rem', opacity: 0.8 }}>
                    <img src={logo} alt="OOFS Racing Logo" style={{ width: '120px', height: 'auto' }} />
                </div>
            </div>
        </div>
    );
};

export default About;
