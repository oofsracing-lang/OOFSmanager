import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Standings from './pages/Standings';
import Races from './pages/Races';
import RaceDetail from './pages/RaceDetail';
import DriverProfile from './pages/DriverProfile';
import Admin from './pages/Admin';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="standings" element={<Standings />} />
          <Route path="races" element={<Races />} />
          <Route path="races/:raceId" element={<RaceDetail />} />
          <Route path="driver/:driverId" element={<DriverProfile />} />
          <Route path="admin" element={<Admin />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
