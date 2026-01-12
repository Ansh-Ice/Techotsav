import { useState, useEffect } from "react";
import { collection, onSnapshot, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import { Trophy, Medal, Star, TrendingUp } from "lucide-react";

export default function Leaderboard() {
    const [leaderboard, setLeaderboard] = useState([]);
    const [competitions, setCompetitions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 1. Fetch Teams
        const teamsPromise = getDocs(collection(db, "teams"));

        // 2. Listen to Competitions
        const q = query(collection(db, "competitions"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const teamsSnap = await teamsPromise;
            const teams = teamsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

            const comps = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setCompetitions(comps);

            // Calculate Totals
            const rankings = teams.map(team => {
                let total = 0;
                let tech = 0;
                let nonTech = 0;

                comps.forEach(comp => {
                    const score = comp.scores?.[team.id] || 0;
                    total += score;
                    if (comp.type === "TECHNICAL") tech += score;
                    else nonTech += score;
                });

                return {
                    ...team,
                    totalScore: total,
                    techScore: tech,
                    nonTechScore: nonTech
                };
            });

            // Sort by Total Score
            setLeaderboard(rankings.sort((a, b) => b.totalScore - a.totalScore));
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const getRankIcon = (index) => {
        switch (index) {
            case 0: return <Trophy className="text-yellow-500" size={32} />;
            case 1: return <Medal className="text-gray-400" size={28} />;
            case 2: return <Medal className="text-amber-700" size={28} />;
            default: return <span className="text-xl font-bold text-gray-400">#{index + 1}</span>;
        }
    };

    return (
        <div className="space-y-12">
            {/* Hero Section */}
            <div className="text-center space-y-4 py-8">
                <h1 className="text-5xl font-extrabold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                    Techotsav Leaderboard
                </h1>
                <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                    Live standings for the ultimate tech showdown. Watch the teams battle for glory in technical and non-technical events.
                </p>
            </div>

            {/* Leaderboard Cards */}
            <div className="grid gap-6">
                {loading ? (
                    <div className="text-center py-12 text-gray-500">Loading standings...</div>
                ) : leaderboard.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">No teams registered yet.</div>
                ) : (
                    leaderboard.map((team, index) => (
                        <div
                            key={team.id}
                            className={`relative bg-white rounded-2xl p-6 flex items-center gap-6 transition-all transform hover:-translate-y-1 hover:shadow-xl border ${index === 0 ? "border-yellow-200 shadow-yellow-100 shadow-lg" : "border-gray-100 shadow-sm"}`}
                        >
                            <div className="w-16 flex justify-center">{getRankIcon(index)}</div>

                            <div className="flex-1">
                                <h3 className="text-2xl font-bold text-gray-900">{team.name}</h3>
                                <div className="flex gap-4 mt-1 text-sm text-gray-500">
                                    <span className="flex items-center gap-1"><Star size={14} className="text-blue-500" /> Tech: {team.techScore}</span>
                                    <span className="flex items-center gap-1"><Activity size={14} className="text-green-500" /> Non-Tech: {team.nonTechScore}</span>
                                </div>
                            </div>

                            <div className="text-right">
                                <div className="text-4xl font-black text-gray-900">{team.totalScore}</div>
                                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Points</div>
                            </div>

                            {index === 0 && (
                                <div className="absolute -top-3 -right-3 bg-yellow-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
                                    <TrendingUp size={12} /> LEADER
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Recent Competitions Table */}
            <div className="mt-16">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Competition Details</h2>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Competition</th>
                                    <th className="px-6 py-4">Type</th>
                                    {leaderboard.map(team => (
                                        <th key={team.id} className="px-6 py-4 text-center whitespace-nowrap">{team.name}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {competitions.map(comp => (
                                    <tr key={comp.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium text-gray-900">{comp.name}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${comp.type === "TECHNICAL" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>
                                                {comp.type}
                                            </span>
                                        </td>
                                        {leaderboard.map(team => (
                                            <td key={team.id} className="px-6 py-4 text-center text-gray-600 font-mono">
                                                {comp.scores?.[team.id] || "-"}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
