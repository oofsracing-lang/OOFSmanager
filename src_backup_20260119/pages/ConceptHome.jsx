
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChampionship } from '../context/ChampionshipContext';

const ConceptHome = () => {
    const navigate = useNavigate();
    const { setSeason } = useChampionship();
    const [hoveredCard, setHoveredCard] = useState(null);
    const [hoveredSocial, setHoveredSocial] = useState(null);

    const handleSeasonSelect = (seasonId) => {
        setSeason(seasonId);
        navigate('/'); // Go to Dashboard
    };

    // Style Constants
    const styles = {
        container: {
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundImage: 'url("/assets/le_mans_hypercar_bg.png")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            overflow: 'hidden',
            fontFamily: "'Outfit', sans-serif"
        },
        overlay: {
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.9))', // Darker bottom for socials
            zIndex: 1
        },
        content: {
            zIndex: 2,
            textAlign: 'center',
            width: '100%',
            maxWidth: '1200px',
            padding: '2rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
        },
        title: {
            fontSize: '4.5rem',
            fontWeight: 800,
            marginBottom: '0.5rem',
            background: 'linear-gradient(45deg, #fff, #e0e0e0)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-2px',
            textShadow: '0 10px 30px rgba(0,0,0,0.5)',
            textTransform: 'uppercase'
        },
        subtitle: {
            fontSize: '1.1rem',
            color: '#aaa',
            marginBottom: '4rem',
            letterSpacing: '3px',
            textTransform: 'uppercase',
            fontWeight: 500
        },
        grid: {
            display: 'flex',
            justifyContent: 'center',
            gap: '2.5rem',
            flexWrap: 'wrap',
            marginBottom: '4rem'
        },
        card: (id) => ({
            background: hoveredCard === id
                ? 'rgba(255, 255, 255, 0.12)'
                : 'rgba(255, 255, 255, 0.04)',
            backdropFilter: 'blur(15px)',
            border: hoveredCard === id
                ? '1px solid rgba(255, 255, 255, 0.4)'
                : '1px solid rgba(255, 255, 255, 0.08)',
            padding: '3rem 2rem',
            borderRadius: '20px',
            width: '320px',
            cursor: 'pointer',
            transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            transform: hoveredCard === id ? 'translateY(-10px) scale(1.02)' : 'translateY(0)',
            boxShadow: hoveredCard === id
                ? '0 25px 50px rgba(0,0,0,0.5), 0 0 30px rgba(255, 255, 255, 0.1)'
                : '0 4px 6px rgba(0,0,0,0.1)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            position: 'relative',
            overflow: 'hidden'
        }),
        // Gradient line at top of card
        cardLine: (color) => ({
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '4px',
            background: color
        }),
        cardTitle: {
            fontSize: '1.8rem',
            fontWeight: 700,
            marginBottom: '0.5rem',
            marginTop: '1rem'
        },
        cardType: {
            fontSize: '0.8rem',
            textTransform: 'uppercase',
            letterSpacing: '2px',
            opacity: 0.7,
            marginBottom: '1.5rem'
        },
        cardDesc: {
            fontSize: '0.9rem',
            color: '#ccc',
            lineHeight: 1.6
        },
        socialContainer: {
            display: 'flex',
            gap: '2rem',
            marginTop: '2rem'
        },
        socialBtn: (id) => ({
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.75rem 1.5rem',
            borderRadius: '50px',
            background: hoveredSocial === id ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.1)',
            color: hoveredSocial === id ? 'black' : 'white',
            backdropFilter: 'blur(5px)',
            border: '1px solid rgba(255,255,255,0.2)',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            textDecoration: 'none',
            fontSize: '0.9rem',
            fontWeight: 600
        }),
        archiveBtn: {
            marginTop: '3rem',
            fontSize: '0.9rem',
            color: '#888',
            cursor: 'pointer',
            border: hoveredSocial === 'archive' ? '1px solid rgba(255,255,255,0.3)' : '1px solid rgba(255,255,255,0.1)',
            padding: '0.75rem 2rem',
            borderRadius: '30px',
            transition: 'all 0.3s ease',
            background: hoveredSocial === 'archive' ? 'rgba(255,255,255,0.1)' : 'transparent',
            letterSpacing: '1px',
            textTransform: 'uppercase',
            backdropFilter: 'blur(5px)'
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.overlay}></div>

            <div style={styles.content}>
                <h1 style={styles.title}>OOFS RACING</h1>
                <p style={styles.subtitle}>Championship Portal</p>

                <div style={styles.grid}>
                    {/* Season 3 Multiclass */}
                    <div
                        style={styles.card('s3-multi')}
                        onMouseEnter={() => setHoveredCard('s3-multi')}
                        onMouseLeave={() => setHoveredCard(null)}
                        onClick={() => handleSeasonSelect('3')}
                    >
                        <div style={styles.cardLine('linear-gradient(90deg, #ff4d4d, #f9cb28)')}></div>
                        <span style={styles.cardType}>Season 3</span>
                        <h2 style={styles.cardTitle}>Multiclass</h2>
                        <p style={styles.cardDesc}>
                            The main event.
                            <br />
                            <strong>LMP2-UR • LMGT3</strong>
                        </p>
                    </div>

                    {/* Season 3 Sprint */}
                    <div
                        style={styles.card('s3-sprint')}
                        onMouseEnter={() => setHoveredCard('s3-sprint')}
                        onMouseLeave={() => setHoveredCard(null)}
                        onClick={() => handleSeasonSelect('3sprint')}
                    >
                        <div style={styles.cardLine('linear-gradient(90deg, #4d79ff, #00d2ff)')}></div>
                        <span style={styles.cardType}>Season 3</span>
                        <h2 style={styles.cardTitle}>Sprint Series</h2>
                        <p style={styles.cardDesc}>
                            High intensity, short format.
                            <br />
                            <strong>LMGT3</strong>
                        </p>
                    </div>
                </div>

                {/* Social Links */}
                <div style={styles.socialContainer}>
                    <a
                        href="https://discord.gg/your-link" // Replace with real link
                        target="_blank"
                        rel="noreferrer"
                        style={styles.socialBtn('discord')}
                        onMouseEnter={() => setHoveredSocial('discord')}
                        onMouseLeave={() => setHoveredSocial(null)}
                    >
                        {/* Simple Discord Icon SVG */}
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.086 2.157 2.419 0 1.334-.956 2.419-2.157 2.419zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.086 2.157 2.419 0 1.334-.946 2.419-2.157 2.419z" />
                        </svg>
                        Join Discord
                    </a>

                    <a
                        href="https://www.thesimgrid.com" // Replace with real link
                        target="_blank"
                        rel="noreferrer"
                        style={styles.socialBtn('simgrid')}
                        onMouseEnter={() => setHoveredSocial('simgrid')}
                        onMouseLeave={() => setHoveredSocial(null)}
                    >
                        {/* Simple Grid/Flag Icon SVG */}
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M4 4h4v4H4V4zm6 0h4v4h-4V4zm6 0h4v4h-4V4zM4 10h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4zM4 16h4v4H4v-4zm6 0h4v4h-4v-4zm6 0h4v4h-4v-4z" />
                        </svg>
                        The SimGrid
                    </a>
                </div>

                {/* Archive Button */}
                <button
                    style={styles.archiveBtn}
                    onMouseEnter={() => setHoveredSocial('archive')}
                    onMouseLeave={() => setHoveredSocial(null)}
                    onClick={() => handleSeasonSelect('2')} // Simulating going to archived season 2
                >
                    View Archived Seasons
                </button>

            </div>
        </div>
    );
};

export default ConceptHome;
