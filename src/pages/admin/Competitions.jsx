import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, doc, updateDoc, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../../firebase";
import { Plus, Trophy, Save, Activity } from "lucide-react";

export default function Competitions() {
    const [competitions, setCompetitions] = useState([]);
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [newComp, setNewComp] = useState({ name: "", type: "TECHNICAL" });

    // Score Editing State
    // Map: competitionId -> { teamId: score }
    const [scores, setScores] = useState({});
    const [unsavedChanges, setUnsavedChanges] = useState({});

    useEffect(() => {
        const unsubscribeList = [];

        // 1. Fetch Teams
        getDocs(collection(db, "teams")).then(snap => {
            setTeams(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        // 2. Listen to competitions
        const q = query(collection(db, "competitions"), orderBy("createdAt", "desc"));
        const unsubComp = onSnapshot(q, (snapshot) => {
            const comps = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setCompetitions(comps);
            setLoading(false);
        });
        unsubscribeList.push(unsubComp);

        // 3. Listen to Scores
        // ideally we query by competition, but for real-time map of all scores:
        const unsubScores = onSnapshot(collection(db, "scores"), (snapshot) => {
            const scoreMap = {}; // { compId: { teamId: score } }
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                if (!scoreMap[data.competitionId]) scoreMap[data.competitionId] = {};
                scoreMap[data.competitionId][data.teamId] = data.score;
            });
            setScores(scoreMap);
        });
        unsubscribeList.push(unsubScores);

        return () => unsubscribeList.forEach(u => u());
    }, []);

    const handleCreateComp = async (e) => {
        e.preventDefault();
        try {
            await addDoc(collection(db, "competitions"), {
                ...newComp,
                createdAt: new Date().toISOString()
            });
            setIsModalOpen(false);
            setNewComp({ name: "", type: "TECHNICAL" });
        } catch (error) {
            console.error("Error creating competition:", error);
            alert("Failed to create competition");
        }
    };

    const handleScoreChange = (compId, teamId, value) => {
        const val = parseInt(value) || 0;
        setScores(prev => ({
            ...prev,
            [compId]: {
                ...prev[compId],
                [teamId]: val
            }
        }));
        setUnsavedChanges(prev => ({ ...prev, [compId]: true }));
    };

    const saveScores = async (compId) => {
        try {
            const batch = writeBatch(db);
            const compScores = scores[compId] || {};

            // We need to efficiently update or set scores. 
            // Since we don't know the doc IDs easily (or we'd have to query them),
            // a simple strategy is: 
            // 1. Generate a predictable ID or query. 
            // Predictable ID: `${compId}_${teamId}` is best for deduplication.

            for (const teamId of Object.keys(compScores)) {
                const scoreVal = compScores[teamId];
                const scoreRef = doc(db, "scores", `${compId}_${teamId}`);
                batch.set(scoreRef, {
                    competitionId: compId,
                    teamId: teamId,
                    score: scoreVal,
                    updatedAt: new Date().toISOString()
                }, { merge: true });
            }

            await batch.commit();
            setUnsavedChanges(prev => ({ ...prev, [compId]: false }));

        } catch (error) {
            console.error("Error saving scores:", error);
            alert("Failed to save scores");
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-gray-800">Competitions & Scoring</h2>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                    <Plus size={20} />
                    New Competition
                </button>
            </div>

            <div className="space-y-6">
                {competitions.map(comp => (
                    <div key={comp.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${comp.type === "TECHNICAL" ? "bg-blue-100 text-blue-600" : "bg-green-100 text-green-600"}`}>
                                    <Trophy size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">{comp.name}</h3>
                                    <span className="text-xs text-gray-500 font-medium">{comp.type}</span>
                                </div>
                            </div>
                            {unsavedChanges[comp.id] && (
                                <button
                                    onClick={() => saveScores(comp.id)}
                                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all animate-pulse"
                                >
                                    <Save size={16} />
                                    Save Scores
                                </button>
                            )}
                        </div>

                        <div className="p-0 overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50/50 text-gray-500 text-xs uppercase tracking-wider">
                                    <tr>
                                        <th className="px-6 py-3">Team</th>
                                        <th className="px-6 py-3 w-40 text-center">Score</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {teams.map(team => (
                                        <tr key={team.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-3 font-medium text-gray-700">{team.name}</td>
                                            <td className="px-6 py-3 text-center">
                                                <input
                                                    type="number"
                                                    className="w-24 text-center border border-gray-300 rounded-md p-1 focus:ring-2 focus:ring-purple-500 outline-none"
                                                    value={scores[comp.id]?.[team.id] || 0}
                                                    onChange={(e) => handleScoreChange(comp.id, team.id, e.target.value)}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))}

                {competitions.length === 0 && !loading && (
                    <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                        No competitions yet. Create one to start scoring!
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl p-6 w-full max-w-sm">
                        <h3 className="text-xl font-bold mb-4">New Competition</h3>
                        <form onSubmit={handleCreateComp}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                    <input
                                        required
                                        className="w-full border p-2 rounded-lg"
                                        value={newComp.name}
                                        onChange={e => setNewComp({ ...newComp, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                                    <select
                                        className="w-full border p-2 rounded-lg"
                                        value={newComp.type}
                                        onChange={e => setNewComp({ ...newComp, type: e.target.value })}
                                    >
                                        <option value="TECHNICAL">Technical</option>
                                        <option value="NON_TECHNICAL">Non-Technical</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 mt-6">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
