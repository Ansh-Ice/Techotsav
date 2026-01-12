import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import AdminLayout from "./layouts/AdminLayout";
import PublicLayout from "./layouts/PublicLayout";
import Login from "./pages/Login";

import Dashboard from "./pages/admin/Dashboard";
import Players from "./pages/admin/Players";
import Teams from "./pages/admin/Teams";
import Competitions from "./pages/admin/Competitions";
import Leaderboard from "./pages/public/Leaderboard";
import GuestTeams from "./pages/guest/Teams";
import GuestPlayers from "./pages/guest/Players";
import AuctionPool from "./pages/guest/AuctionPool";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<PublicLayout />}>
            <Route index element={<Navigate to="/leaderboard" replace />} />
            <Route path="leaderboard" element={<Leaderboard />} />
            <Route path="teams" element={<GuestTeams />} />
            <Route path="players" element={<GuestPlayers />} />
            <Route path="pool" element={<AuctionPool />} />
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
