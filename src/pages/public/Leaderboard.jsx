import { useState, useEffect } from "react";
import { collection, onSnapshot, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import { Trophy, Medal, Crown } from "lucide-react";

export default function Leaderboard() {
    const [competitions, setCompetitions] = useState([]);
    const [teams, setTeams] = useState({});
    const [scores, setScores] = useState({});
    const [loading, setLoading] = useState(true);
    const [selectedComp, setSelectedComp] = useState(null);

    useEffect(() => {
        // 1. Fetch Teams Map (ID -> Name/Details)
        // We only need names really.
        getDocs(collection(db, "teams")).then(snap => {
            const teamMap = {};
            snap.docs.forEach(d => { teamMap[d.id] = d.data(); });
            setTeams(teamMap);
        });

        // 2. Real-time Competitions & Scores
        const q = query(collection(db, "competitions"), orderBy("createdAt", "desc"));
        const unsubComp = onSnapshot(q, (snapshot) => {
            const comps = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setCompetitions(comps);
            if (comps.length > 0 && !selectedComp) {
                setSelectedComp(comps[0].id);
            }
        });

        const unsubScores = onSnapshot(collection(db, "scores"), (snapshot) => {
            const scoreMap = {}; // { compId: [ { teamId, score } ] }
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                if (!scoreMap[data.competitionId]) scoreMap[data.competitionId] = [];
                scoreMap[data.competitionId].push({ teamId: data.teamId, score: data.score });
            });
            setScores(scoreMap);
            setLoading(false);
        });

        return () => {
            unsubComp();
            unsubScores();
        };
    }, []);

    // Derived Leaderboard
    const getLeaderboard = (compId) => {
        if (!compId || !scores[compId]) return [];
        return scores[compId]
            .map(s => ({
                ...s,
                teamName: teams[s.teamId]?.name || "Unknown Team",
                // we could add owner/icon info here if we fetched teamPlayers
            }))
            .sort((a, b) => b.score - a.score);
    };

    const currentLeaderboard = getLeaderboard(selectedComp);

    if (loading) return <div className="min-h-screen flex items-center justify-center">Loading Leaderboard...</div>;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="text-center mb-12">
                <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mb-4">
                    Techotsav Leaderboard
                </h1>
                <p className="text-gray-600 text-lg">Live scores and standings</p>
            </div>

            {/* Competition Tabs */}
            <div className="flex flex-wrap justify-center gap-2 mb-8">
                {competitions.map(comp => (
                    <button
                        key={comp.id}
                        onClick={() => setSelectedComp(comp.id)}
                        className={`px-6 py-2 rounded-full font-medium transition-all ${selectedComp === comp.id
                            ? "bg-blue-600 text-white shadow-lg scale-105"
                            : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                            }`}
                    >
                        {comp.name}
                    </button>
                ))}
            </div>

            {/* Leaderboard Table */}
            {selectedComp && currentLeaderboard.length > 0 ? (
                <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 max-w-4xl mx-auto">
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-4 md:p-6 text-white text-center">
                        <h2 className="text-xl md:text-2xl font-bold flex items-center justify-center gap-2">
                            <Trophy className="text-yellow-400 w-6 h-6" />
                            {competitions.find(c => c.id === selectedComp)?.name}
                        </h2>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {currentLeaderboard.map((entry, index) => (
                            <div
                                key={entry.teamId}
                                className={`p-4 flex items-center justify-between transition-colors
                                ${index === 0 ? "bg-yellow-50/50" : index === 1 ? "bg-gray-50/50" : index === 2 ? "bg-orange-50/50" : "hover:bg-gray-50"}
                                `}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shadow-sm border
                                        ${index === 0 ? "bg-yellow-100 text-yellow-700 border-yellow-200" :
                                            index === 1 ? "bg-gray-100 text-gray-700 border-gray-200" :
                                                index === 2 ? "bg-orange-100 text-orange-700 border-orange-200" : "bg-white text-gray-500 border-gray-100"}`}>
                                        {index + 1}
                                    </div>
                                    <div>
                                        <h3 className={`font-bold text-gray-900 ${index < 3 ? "text-lg" : "text-base"}`}>{entry.teamName}</h3>
                                        {index === 0 && <span className="text-[10px] text-yellow-600 font-bold uppercase tracking-wider flex items-center gap-1 mt-0.5"><Crown size={10} /> Leader</span>}
                                    </div>
                                </div>
                                <div className={`font-mono font-bold ${index < 3 ? "text-2xl text-blue-600" : "text-xl text-gray-600"}`}>
                                    {entry.score}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="text-center py-12 text-gray-500 bg-white rounded-xl shadow-sm max-w-2xl mx-auto">
                    No scores available for this competition yet.
                </div>
            )}
        </div>
    );
}
