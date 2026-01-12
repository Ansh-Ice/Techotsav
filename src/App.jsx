import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import AdminLayout from "./layouts/AdminLayout";
import PublicLayout from "./layouts/PublicLayout";
import Login from "./pages/Login";

// Placeholder Pages
const Dashboard = () => <div className="text-2xl font-bold">Admin Dashboard</div>;
const Players = () => <div className="text-2xl font-bold">Manage Players</div>;
const Teams = () => <div className="text-2xl font-bold">Manage Teams</div>;
const Competitions = () => <div className="text-2xl font-bold">Manage Competitions</div>;

const Leaderboard = () => <div className="text-2xl font-bold">Leaderboard View (Guests)</div>;

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<PublicLayout />}>
            <Route index element={<Leaderboard />} />
            <Route path="teams" element={<div className="text-2xl">Teams View</div>} />
            <Route path="players" element={<div className="text-2xl">Players View</div>} />
            <Route path="login" element={<Login />} />
          </Route>

          {/* Admin Protected Routes */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="players" element={<Players />} />
            <Route path="teams" element={<Teams />} />
            <Route path="competitions" element={<Competitions />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
