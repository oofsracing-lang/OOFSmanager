
import { Routes, Route, HashRouter, Navigate, useLocation } from 'react-router-dom';
import SeasonLayout from './components/SeasonLayout';
import Dashboard from './pages/Dashboard';
import Standings from './pages/Standings';
import Races from './pages/Races';
import RaceDetail from './pages/RaceDetail';
import Drivers from './pages/Drivers';
import DriverProfile from './pages/DriverProfile';
import Admin from './pages/Admin';
import Login from './pages/Login';
import Qualifying from './pages/Qualifying';
import Stewarding from './pages/Stewarding';
import Home from './pages/Home';
import { ChampionshipProvider } from './context/ChampionshipContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';

const ProtectedRoute = ({ children }) => {
  const { currentUser } = useAuth();
  const location = useLocation(); // Keep track of current location
  if (!currentUser) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
};

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ChampionshipProvider>
          <HashRouter>
            <Routes>
              {/* Landing Page */}
              <Route path="/" element={<Home />} />

              {/* Login Page */}
              <Route path="/login" element={<Login />} />

              {/* Season Routes */}
              <Route path="/season/:seasonId" element={<SeasonLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="standings" element={<Standings />} />
                <Route path="races" element={<Races />} />
                <Route path="races/:id" element={<RaceDetail />} />
                <Route path="drivers" element={<Drivers />} />
                <Route path="driver/:id" element={<DriverProfile />} />
                <Route path="qualifying" element={<Qualifying />} />
                <Route path="stewarding" element={<Stewarding />} />
                <Route path="admin" element={
                  <ProtectedRoute>
                    <Admin />
                  </ProtectedRoute>
                } />
              </Route>
            </Routes>
          </HashRouter>
        </ChampionshipProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
