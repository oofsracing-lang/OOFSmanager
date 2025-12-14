import { NavLink } from 'react-router-dom';
import { useChampionship } from '../context/ChampionshipContext';
import logo from '../assets/logo.png';

const Navbar = () => {
    const { currentSeasonId, changeSeason, seasonList } = useChampionship();

    return (
        <nav style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-md)',
            padding: 'var(--space-md) 0',
            borderBottom: '1px solid var(--border-color)',
            marginBottom: 'var(--space-lg)',
            background: 'rgba(20, 22, 31, 0.8)', // Semi-transparent background
            backdropFilter: 'blur(10px)',
            position: 'sticky',
            top: 0,
            zIndex: 100
        }}>
            <div style={{ display: 'flex', alignItems: 'center', marginRight: 'var(--space-xl)' }}>
                <img src={logo} alt="OOFS Racing" style={{ height: '48px', marginRight: 'var(--space-md)' }} />
                <h1 style={{
                    fontSize: '1.4rem',
                    margin: 0,
                    color: 'white',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    fontStyle: 'italic' // Racing feel
                }}>
                    OOFS <span style={{ color: 'var(--primary)' }}>Manager</span>
                </h1>
            </div>
            <NavLink
                to="/"
                className={({ isActive }) => isActive ? 'btn btn-primary' : 'btn btn-ghost'}
            >
                Dashboard
            </NavLink>
            <NavLink
                to="/standings"
                className={({ isActive }) => isActive ? 'btn btn-primary' : 'btn btn-ghost'}
            >
                Standings
            </NavLink>
            <NavLink
                to="/races"
                className={({ isActive }) => isActive ? 'btn btn-primary' : 'btn btn-ghost'}
            >
                Races
            </NavLink>
            <NavLink
                to="/admin"
                className={({ isActive }) => isActive ? 'btn btn-primary' : 'btn btn-ghost'}
            >
                Admin
            </NavLink>

            {/* Season Selector */}
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Season:</span>
                <select
                    value={currentSeasonId}
                    onChange={(e) => changeSeason(parseInt(e.target.value))}
                    style={{
                        background: 'var(--bg-card)',
                        color: 'var(--text-main)',
                        border: '1px solid var(--border-color)',
                        padding: '0.25rem 0.5rem',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer'
                    }}
                >
                    {seasonList && seasonList.map(season => (
                        <option key={season.id} value={season.id}>{season.name}</option>
                    ))}
                </select>
            </div>
        </nav>
    );
};

export default Navbar;
