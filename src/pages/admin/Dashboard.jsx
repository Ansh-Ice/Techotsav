import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "../../firebase";
import { Users, Shield, Trophy, UserCheck, Activity, ArrowUpRight, Calendar } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Link } from "react-router-dom";

export default function Dashboard() {
    const [stats, setStats] = useState({
        totalPlayers: 0,
        assignedPlayers: 0,
        teamsCount: 0,
        competitionsCount: 0
    });
    const [chartData, setChartData] = useState([]);
    const [recentComps, setRecentComps] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            try {
                const playersSnap = await getDocs(collection(db, "players"));
                const teamsSnap = await getDocs(collection(db, "teams"));
                const compsSnap = await getDocs(query(collection(db, "competitions"), orderBy("createdAt", "desc"), limit(5)));

                const players = playersSnap.docs.map(d => d.data());
                const teams = teamsSnap.docs.map(d => d.data());
                const comps = compsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

                // Calculate Stats
                setStats({
                    totalPlayers: players.length,
                    assignedPlayers: players.filter(p => p.isAssigned).length,
                    teamsCount: teamsSnap.size,
                    competitionsCount: compsSnap.size
                });

                setRecentComps(comps);

                // Calculate Chart Data: Players per Primary Skill (Top 5)
                const skillCounts = {};
                players.forEach(p => {
                    const skills = p.primarySkills || [];
                    skills.forEach(s => {
                        skillCounts[s] = (skillCounts[s] || 0) + 1;
                    });
                });

                const data = Object.entries(skillCounts)
                    .map(([name, value]) => ({ name, value }))
                    .sort((a, b) => b.value - a.value)
                    .slice(0, 5);

                setChartData(data);

            } catch (error) {
                console.error("Error fetching dashboard data:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
    );

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-extrabold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                        Dashboard
                    </h1>
                    <p className="text-gray-500 mt-2 font-medium">Overview of the Techotsav Auction System</p>
                </div>
                <div className="text-sm text-gray-400 bg-white px-3 py-1 rounded-full border border-gray-100 shadow-sm">
                    {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    icon={<Users className="text-white" size={20} />}
                    label="Total Players"
                    value={stats.totalPlayers}
                    gradient="from-blue-500 to-blue-600"
                    trend="+12% from last week"
                />
                <StatCard
                    icon={<UserCheck className="text-white" size={20} />}
                    label="Assigned Rate"
                    value={`${stats.totalPlayers ? Math.round((stats.assignedPlayers / stats.totalPlayers) * 100) : 0}%`}
                    subtext={`${stats.assignedPlayers}/${stats.totalPlayers} players`}
                    gradient="from-emerald-500 to-teal-500"
                />
                <StatCard
                    icon={<Shield className="text-white" size={20} />}
                    label="Active Teams"
                    value={stats.teamsCount}
                    gradient="from-violet-500 to-purple-600"
                />
                <StatCard
                    icon={<Trophy className="text-white" size={20} />}
                    label="Competitions"
                    value={stats.competitionsCount}
                    gradient="from-amber-400 to-orange-500"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Chart Section */}
                <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-gray-800">Top Skills Distribution</h3>
                        <button className="text-sm text-blue-600 font-medium hover:underline">View All</button>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                                <Tooltip
                                    cursor={{ fill: '#f3f4f6' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="value" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Sidebar / Recent Activity */}
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col">
                    <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <Activity size={18} className="text-orange-500" />
                        Recent Competitions
                    </h3>

                    <div className="flex-1 space-y-4">
                        {recentComps.length === 0 ? (
                            <div className="text-center text-gray-400 py-8">No activity yet.</div>
                        ) : (
                            recentComps.map(comp => (
                                <div key={comp.id} className="group flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-default border border-transparent hover:border-gray-100">
                                    <div className={`mt-1 min-w-[32px] h-8 rounded-lg flex items-center justify-center ${comp.type === 'TECHNICAL' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                                        {comp.type === 'TECHNICAL' ? <Trophy size={14} /> : <Calendar size={14} />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold text-gray-900 truncate">{comp.name}</h4>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            {new Date(comp.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <ArrowUpRight size={14} className="text-gray-300 group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-all" />
                                </div>
                            ))
                        )}
                    </div>

                    <div className="mt-6 pt-4 border-t border-gray-100">
                        <Link to="/admin/competitions" className="block w-full py-2.5 text-center text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors">
                            Manage Competitions
                        </Link>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-4 overflow-x-auto pb-2">
                <QuickActionLink to="/admin/players" title="Add Player" desc="Register new participants" color="border-blue-200 hover:border-blue-400 bg-blue-50/50" />
                <QuickActionLink to="/admin/teams" title="Create Team" desc="Setup new auction teams" color="border-purple-200 hover:border-purple-400 bg-purple-50/50" />
                <QuickActionLink to="/admin/competitions" title="New Event" desc="Launch a competition" color="border-amber-200 hover:border-amber-400 bg-amber-50/50" />
            </div>
        </div>
    );
}

function StatCard({ icon, label, value, subtext, gradient, trend }) {
    return (
        <div className="relative overflow-hidden bg-white p-6 rounded-2xl shadow-sm border border-gray-100 group hover:shadow-md transition-all duration-300">
            <div className={`absolute top-0 right-0 p-3 rounded-bl-2xl bg-gradient-to-br ${gradient} shadow-lg group-hover:scale-110 transition-transform`}>
                {icon}
            </div>
            <div className="relative z-10">
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
                <h3 className="text-3xl font-black text-gray-900 mt-2 mb-1">{value}</h3>
                {subtext && <p className="text-xs font-medium text-gray-500">{subtext}</p>}
                {trend && <p className="text-xs font-medium text-green-600 mt-1 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                    {trend}
                </p>}
            </div>
        </div>
    );
}

function QuickActionLink({ to, title, desc, color }) {
    return (
        <Link to={to} className={`min-w-[200px] p-4 rounded-xl border ${color} transition-all hover:-translate-y-1 hover:shadow-sm`}>
            <h4 className="font-bold text-gray-800">{title}</h4>
            <p className="text-xs text-gray-500 mt-1">{desc}</p>
        </Link>
    );
}
