import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import { Users, Shield, Trophy, UserCheck } from "lucide-react";

export default function Dashboard() {
    const [stats, setStats] = useState({
        totalPlayers: 0,
        assignedPlayers: 0,
        teamsCount: 0,
        competitionsCount: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchStats() {
            try {
                const playersSnap = await getDocs(collection(db, "players"));
                const teamsSnap = await getDocs(collection(db, "teams"));
                const compsSnap = await getDocs(collection(db, "competitions"));

                const players = playersSnap.docs.map(d => d.data());

                setStats({
                    totalPlayers: players.length,
                    assignedPlayers: players.filter(p => p.isAssigned).length,
                    teamsCount: teamsSnap.size,
                    competitionsCount: compsSnap.size
                });
            } catch (error) {
                console.error("Error fetching stats:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchStats();
    }, []);

    if (loading) return <div className="p-8 text-gray-500">Loading stats...</div>;

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Admin Dashboard
                </h1>
                <p className="text-gray-600 mt-2">Welcome back! Here's what's happening in Techotsav Auction.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    icon={<Users className="text-blue-600" size={24} />}
                    label="Total Players"
                    value={stats.totalPlayers}
                    color="bg-blue-50"
                />
                <StatCard
                    icon={<UserCheck className="text-green-600" size={24} />}
                    label="Assigned"
                    value={stats.assignedPlayers}
                    subvalue={`${stats.totalPlayers ? Math.round((stats.assignedPlayers / stats.totalPlayers) * 100) : 0}%`}
                    color="bg-green-50"
                />
                <StatCard
                    icon={<Shield className="text-purple-600" size={24} />}
                    label="Teams"
                    value={stats.teamsCount}
                    color="bg-purple-50"
                />
                <StatCard
                    icon={<Trophy className="text-amber-600" size={24} />}
                    label="Competitions"
                    value={stats.competitionsCount}
                    color="bg-amber-50"
                />
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4">Quick Actions</h3>
                <div className="flex gap-4">
                    <a href="/admin/players" className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium transition-colors"> Manage Players</a>
                    <a href="/admin/teams" className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium transition-colors"> Manage Auctions</a>
                    <a href="/admin/competitions" className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium transition-colors"> Update Scores</a>
                </div>
            </div>
        </div>
    );
}

function StatCard({ icon, label, value, subvalue, color }) {
    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
                {icon}
            </div>
            <div>
                <p className="text-sm font-medium text-gray-500">{label}</p>
                <div className="flex items-baseline gap-2">
                    <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
                    {subvalue && <span className="text-xs text-green-600 font-medium">{subvalue}</span>}
                </div>
            </div>
        </div>
    );
}
