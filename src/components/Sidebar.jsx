
import { NavLink, Link } from 'react-router-dom';
import { useChampionship } from '../context/ChampionshipContext';
import { useParams } from 'react-router-dom';
import logo from '../assets/oofs_logo.png';

const Sidebar = ({ isOpen, onClose }) => {
    const { seasonConfig, championshipData } = useChampionship();
    const { seasonId } = useParams();
    const showQualifying = seasonConfig?.ui?.showQualifying !== false;

    const seasonDisplayNames = {
        's4-multi': 'Season 4 Multiclass',
        's4-sprint': 'Season 4 Sprint',
        's3-sprint': 'Season 3 Sprint',
        '3': 'Season 3 Multiclass',
        '2': 'Season 2',
    };
    const seasonLabel = seasonDisplayNames[seasonId] || championshipData?.season || seasonConfig?.name || `Season ${seasonId}`;

    // Helper for generating season-specific paths
    const getPath = (subPath) => `/season/${seasonId}${subPath}`;

    // Close sidebar on navigation (mobile ux)
    const handleNavClick = () => {
        if (onClose) onClose();
    };

    const styles = {
        logoArea: {
            fontFamily: "'Classic Cobra Condensed', sans-serif",
            fontStyle: 'normal', /* Don't have it italicized */
            fontWeight: 'normal', /* Maps to classiccobracond.ttf */
            marginBottom: '3rem',
            fontSize: '1.8rem',
            color: '#ceff00', /* Exact brand green */
            textDecoration: 'none',
            display: 'block',
            textTransform: 'uppercase',
            textShadow: '0 2px 4px rgba(0,0,0,0.5)'
        },
        navGroup: {
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem'
        },
        link: (isActive) => ({
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-sm)',
            color: isActive ? '#fff' : 'var(--text-muted)',
            background: isActive ? 'var(--primary-color)' : 'transparent',
            textDecoration: 'none',
            fontWeight: isActive ? 600 : 400,
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontSize: '0.95rem'
        }),
        footer: {
            marginTop: 'auto',
            paddingTop: '2rem',
            borderTop: '1px solid var(--border-color)'
        },
        backHome: {
            color: 'var(--text-muted)',
            textDecoration: 'none',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            opacity: 0.7,
            transition: 'opacity 0.2s'
        }
    };

    return (
        <aside className={`layout-sidebar ${isOpen ? 'open' : ''}`}>
            <Link to="/" style={styles.logoArea} onClick={handleNavClick}>
                OOFS RACING
            </Link>

            {/* Season Context Label */}
            {championshipData && (
                <div style={{
                    padding: '0 0 2rem 0',
                    color: '#cdff00', // Neon green for high contrast on purple background
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    marginTop: '-2rem' // Pull nicely under logo
                }}>
                    {seasonLabel}
                </div>
            )}

            <nav style={styles.navGroup}>
                <NavLink
                    to={getPath('')}
                    end
                    style={({ isActive }) => styles.link(isActive)}
                    onClick={handleNavClick}
                >
                    Dashboard
                </NavLink>

                <NavLink
                    to={getPath('/standings')}
                    style={({ isActive }) => styles.link(isActive)}
                    onClick={handleNavClick}
                >
                    Standings
                </NavLink>

                <NavLink
                    to={getPath('/races')}
                    style={({ isActive }) => styles.link(isActive)}
                    onClick={handleNavClick}
                >
                    Races
                </NavLink>

                {showQualifying && (
                    <NavLink
                        to={getPath('/qualifying')}
                        style={({ isActive }) => styles.link(isActive)}
                        onClick={handleNavClick}
                    >
                        Qualifying
                    </NavLink>
                )}

                <NavLink
                    to={getPath('/stewarding')}
                    style={({ isActive }) => styles.link(isActive)}
                    onClick={handleNavClick}
                >
                    Stewarding
                </NavLink>

                <NavLink
                    to={getPath('/admin')}
                    style={({ isActive }) => styles.link(isActive)}
                    onClick={handleNavClick}
                >
                    Admin
                </NavLink>
            </nav>

            <div style={styles.footer}>
                <Link to="/" style={styles.backHome} onClick={handleNavClick}>
                    ← Back to Home
                </Link>
                <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center', opacity: 1 }}>
                    <img src={logo} alt="OOFS Racing" style={{ width: '80px', height: 'auto' }} />
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
