import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

const Layout = () => {
    return (
        <div className="container">
            <header style={{ padding: '2rem 0', borderBottom: '1px solid var(--border-color)', marginBottom: '1rem' }}>
                <h1>
                    <span className="text-primary">OOFS</span> Manager
                </h1>
                <p style={{ color: 'var(--text-muted)' }}>Out of Fuel Sim Racing League</p>
            </header>

            <Navbar />

            <main>
                <Outlet />
            </main>

            <footer style={{
                marginTop: '4rem',
                padding: '2rem 0',
                borderTop: '1px solid var(--border-color)',
                color: 'var(--text-muted)',
                textAlign: 'center',
                fontSize: '0.8rem'
            }}>
                &copy; {new Date().getFullYear()} Out of Fuel Sim Racing. Built with React.
            </footer>
        </div>
    );
};

export default Layout;
