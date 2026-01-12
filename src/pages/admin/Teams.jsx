import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, doc, updateDoc, query, where, writeBatch } from "firebase/firestore";
import { db } from "../../firebase";
import { Plus, Shield, UserPlus, Users, X } from "lucide-react";

export default function Teams() {
    const [teams, setTeams] = useState([]);
    const [unassignedPlayers, setUnassignedPlayers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newTeamName, setNewTeamName] = useState("");

    // Assignment Modal State
    const [assignmentModal, setAssignmentModal] = useState({
        isOpen: false,
        teamId: null,
        role: null // "OWNER", "ICON", "MEMBER"
    });
    const [searchPlayer, setSearchPlayer] = useState("");

    useEffect(() => {
        fetchTeamsAndPlayers();
    }, []);

    async function fetchTeamsAndPlayers() {
        try {
            setLoading(true);
            // Fetch Teams
            const teamsSnap = await getDocs(collection(db, "teams"));
            const teamsList = teamsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

            // Fetch Team Players mapping to attach to teams
            // Or we can just query them on demand? For Vibe, let's just fetch all 'teamPlayers' collection?
            // Actually, 'teamPlayers' is a separate collection as per plan.
            const tpSnap = await getDocs(collection(db, "teamPlayers"));
            const tpList = tpSnap.docs.map(d => d.data());

            // Merge players into teams for display
            const teamsWithPlayers = teamsList.map(team => ({
                ...team,
                members: tpList.filter(tp => tp.teamId === team.id)
            }));

            setTeams(teamsWithPlayers);

            // Fetch Unassigned Players
            const q = query(collection(db, "players"), where("isAssigned", "==", false));
            const playersSnap = await getDocs(q);
            setUnassignedPlayers(playersSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    }

    const handleCreateTeam = async (e) => {
        e.preventDefault();
        if (!newTeamName.trim()) return;
        try {
            await addDoc(collection(db, "teams"), {
                name: newTeamName,
                createdAt: new Date().toISOString()
            });
            setNewTeamName("");
            setIsModalOpen(false);
            fetchTeamsAndPlayers();
        } catch (error) {
            console.error("Error creating team:", error);
            alert("Failed to create team");
        }
    };

    const handleAssignPlayer = async (playerId, playerDetails) => {
        const { teamId, role } = assignmentModal;

        try {
            // 1. Create entry in teamPlayers
            await addDoc(collection(db, "teamPlayers"), {
                teamId,
                playerId,
                playerName: playerDetails.name, // de-normalization for easy display
                role,
                assignedAt: new Date().toISOString()
            });

            // 2. Update player as assigned
            await updateDoc(doc(db, "players", playerId), {
                isAssigned: true,
                teamId: teamId, // Optional: helpful denormalization
                teamRole: role
            });

            // 3. Refresh
            setAssignmentModal({ isOpen: false, teamId: null, role: null });
            fetchTeamsAndPlayers();

        } catch (error) {
            console.error("Error assigning player:", error);
            alert("Assignment failed.");
        }
    };

    // Helper to check if team has role filled
    const hasRole = (team, role) => {
        return team.members.some(m => m.role === role);
    };

    const openAssignment = (teamId, role) => {
        // Check constraints
        const team = teams.find(t => t.id === teamId);
        if ((role === "OWNER" || role === "ICON") && hasRole(team, role)) {
            alert(`This team already has an ${role}`);
            return;
        }
        setAssignmentModal({ isOpen: true, teamId, role });
    };

    const filteredUnassigned = unassignedPlayers.filter(p =>
        p.name.toLowerCase().includes(searchPlayer.toLowerCase()) ||
        p.enrollmentNo.toLowerCase().includes(searchPlayer.toLowerCase())
    );

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-gray-800">Teams & Auction</h2>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Plus size={20} />
                    Create Team
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {teams.map(team => (
                    <div key={team.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                        <div className="p-4 bg-gradient-to-r from-slate-800 to-slate-900 text-white flex justify-between items-center">
                            <h3 className="font-bold text-lg">{team.name}</h3>
                            <Shield size={18} className="text-blue-400" />
                        </div>

                        <div className="p-4 flex-1 space-y-4">
                            {/* Owner & Icon Slots */}
                            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Owner</span>
                                    {!hasRole(team, "OWNER") && (
                                        <button onClick={() => openAssignment(team.id, "OWNER")} className="text-xs text-blue-600 hover:underline">+ Assign</button>
                                    )}
                                </div>
                                {team.members.find(m => m.role === "OWNER") ? (
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold">O</div>
                                        <span className="font-medium text-sm text-gray-800">{team.members.find(m => m.role === "OWNER").playerName}</span>
                                    </div>
                                ) : (
                                    <div className="text-sm text-gray-400 italic">Empty Slot</div>
                                )}

                                <div className="border-t border-gray-200 my-2"></div>

                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Icon Player</span>
                                    {!hasRole(team, "ICON") && (
                                        <button onClick={() => openAssignment(team.id, "ICON")} className="text-xs text-blue-600 hover:underline">+ Assign</button>
                                    )}
                                </div>
                                {team.members.find(m => m.role === "ICON") ? (
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold">I</div>
                                        <span className="font-medium text-sm text-gray-800">{team.members.find(m => m.role === "ICON").playerName}</span>
                                    </div>
                                ) : (
                                    <div className="text-sm text-gray-400 italic">Empty Slot</div>
                                )}
                            </div>

                            {/* Members */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Squad ({team.members.filter(m => m.role === "MEMBER").length})</span>
                                    <button onClick={() => openAssignment(team.id, "MEMBER")} className="text-xs text-blue-600 hover:underline">+ Add Member</button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {team.members.filter(m => m.role === "MEMBER").map(member => (
                                        <span key={member.playerId} className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-700">
                                            {member.playerName}
                                        </span>
                                    ))}
                                    {team.members.filter(m => m.role === "MEMBER").length === 0 && (
                                        <span className="text-sm text-gray-400 italic">No members yet</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {teams.length === 0 && !loading && (
                    <div className="col-span-full text-center py-12 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                        No teams created yet. Start by creating a team!
                    </div>
                )}
            </div>

            {/* Create Team Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl p-6 w-full max-w-sm">
                        <h3 className="text-xl font-bold mb-4">Create New Team</h3>
                        <form onSubmit={handleCreateTeam}>
                            <input
                                autoFocus
                                className="w-full border p-2 rounded mb-4"
                                placeholder="Team Name"
                                value={newTeamName}
                                onChange={e => setNewTeamName(e.target.value)}
                            />
                            <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Assignment Modal */}
            {assignmentModal.isOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-lg">
                                Select {assignmentModal.role === "ICON" ? "Icon Player" : assignmentModal.role === "OWNER" ? "Team Owner" : "Squad Member"}
                            </h3>
                            <button onClick={() => setAssignmentModal({ ...assignmentModal, isOpen: false })}><X size={20} /></button>
                        </div>

                        <div className="p-4 bg-white border-b border-gray-100">
                            <input
                                className="w-full border p-2 rounded-lg bg-gray-50"
                                placeholder="Search unassigned players..."
                                value={searchPlayer}
                                onChange={e => setSearchPlayer(e.target.value)}
                            />
                        </div>

                        <div className="flex-1 overflow-y-auto p-2">
                            {filteredUnassigned.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">No matching unassigned players found.</div>
                            ) : (
                                <div className="grid grid-cols-1 divide-y">
                                    {filteredUnassigned.map(player => (
                                        <div key={player.id} className="p-3 hover:bg-blue-50 flex justify-between items-center group rounded-lg">
                                            <div>
                                                <div className="font-medium text-gray-900">{player.name}</div>
                                                <div className="text-xs text-gray-500">{player.enrollmentNo} • {player.semester} {player.division}</div>
                                                <div className="text-xs text-blue-600 mt-1">{player.primarySkills.join(", ")}</div>
                                            </div>
                                            <button
                                                onClick={() => handleAssignPlayer(player.id, player)}
                                                className="px-3 py-1 bg-white border border-blue-200 text-blue-600 rounded hover:bg-blue-600 hover:text-white transition-colors"
                                            >
                                                Select
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
