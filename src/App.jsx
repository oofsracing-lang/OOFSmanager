import { useRef } from 'react';
import { Routes, Route, HashRouter, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Standings from './pages/Standings';
import Races from './pages/Races';
import RaceDetail from './pages/RaceDetail';
import Drivers from './pages/Drivers';
import DriverProfile from './pages/DriverProfile';
import Admin from './pages/Admin';
import Login from './pages/Login';
import { ChampionshipProvider } from './context/ChampionshipContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';

const ProtectedRoute = ({ children }) => {
  const { currentUser } = useAuth();
  if (!currentUser) return <Navigate to="/login" />;
  return children;
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ChampionshipProvider>
          <HashRouter>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="standings" element={<Standings />} />
                <Route path="races" element={<Races />} />
                <Route path="races/:id" element={<RaceDetail />} />
                <Route path="drivers" element={<Drivers />} />
                <Route path="drivers/:id" element={<DriverProfile />} />
                <Route path="admin" element={
                  <ProtectedRoute>
                    <Admin />
                  </ProtectedRoute>
                } />
                <Route path="login" element={<Login />} />
              </Route>
            </Routes>
          </HashRouter>
        </ChampionshipProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
