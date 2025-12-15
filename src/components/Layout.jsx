import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import logo from '../assets/logo.png';

const Layout = () => {
    return (
        <div className="container">
            <header style={{
                padding: '2rem 0',
                borderBottom: '1px solid var(--border-color)',
                marginBottom: '1rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div>
                    <h1 style={{ color: 'white', margin: 0 }}>
                        Out of Fuel Sim Racing League
                    </h1>
                </div>
                <img src={logo} alt="OOFS Logo" style={{ height: '80px' }} />
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
