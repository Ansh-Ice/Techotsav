import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, doc, runTransaction, query, where, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { Plus, Shield, UserPlus, Users, X, Trash2, Edit2, Wallet } from "lucide-react";

export default function Teams() {
    const [teams, setTeams] = useState([]);
    const [unassignedPlayers, setUnassignedPlayers] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal States
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // Form States
    const [teamForm, setTeamForm] = useState({ name: "", maxPurse: 10000 }); // Default 10k or whatever
    const [editingTeam, setEditingTeam] = useState(null);

    // Assignment Modal State
    const [assignmentModal, setAssignmentModal] = useState({
        isOpen: false,
        teamId: null,
        role: null // "OWNER", "ICON", "MEMBER"
    });
    const [bidAmount, setBidAmount] = useState("");
    const [searchPlayer, setSearchPlayer] = useState("");

    useEffect(() => {
        fetchTeamsAndPlayers();
    }, []);

    async function fetchTeamsAndPlayers() {
        try {
            setLoading(true);
            const teamsSnap = await getDocs(collection(db, "teams"));
            const teamsList = teamsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

            const tpSnap = await getDocs(collection(db, "teamPlayers"));
            const tpList = tpSnap.docs.map(d => ({ id: d.id, ...d.data() }));

            const teamsWithPlayers = teamsList.map(team => ({
                ...team,
                members: tpList.filter(tp => tp.teamId === team.id)
            }));

            setTeams(teamsWithPlayers);

            const q = query(collection(db, "players"), where("isAssigned", "==", false));
            const playersSnap = await getDocs(q);
            setUnassignedPlayers(playersSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    }

    // --- Team Management ---

    const handleCreateTeam = async (e) => {
        e.preventDefault();
        if (!teamForm.name.trim()) return;
        try {
            const purse = parseInt(teamForm.maxPurse) || 0;
            await addDoc(collection(db, "teams"), {
                name: teamForm.name,
                maxPurse: purse,
                remainingPurse: purse,
                createdAt: new Date().toISOString()
            });
            setTeamForm({ name: "", maxPurse: 10000 });
            setIsCreateModalOpen(false);
            fetchTeamsAndPlayers();
        } catch (error) {
            console.error("Error creating team:", error);
            alert("Failed to create team");
        }
    };

    const openEditTeam = (team) => {
        setEditingTeam(team);
        setTeamForm({ name: team.name, maxPurse: team.maxPurse || 0 });
        setIsEditModalOpen(true);
    };

    const handleUpdateTeam = async (e) => {
        e.preventDefault();
        if (!editingTeam) return;

        try {
            const newMax = parseInt(teamForm.maxPurse) || 0;
            const oldMax = editingTeam.maxPurse || 0;
            const diff = newMax - oldMax;

            // Adjust remaining purse by the difference
            // If new max is lower, remaining could go negative conceptually, but we allow it for correction 
            // or we could block it. Requirement says "Edit allowed... with validation".
            // Let's allow it but warn if negative? Typically basic arithmetic is safe.

            const newRemaining = (editingTeam.remainingPurse || 0) + diff;

            await updateDoc(doc(db, "teams", editingTeam.id), {
                name: teamForm.name,
                maxPurse: newMax,
                remainingPurse: newRemaining
            });

            setIsEditModalOpen(false);
            setEditingTeam(null);
            fetchTeamsAndPlayers();
        } catch (error) {
            console.error("Error updating team:", error);
            alert("Failed to update team");
        }
    };

    const handleDeleteTeam = async (team) => {
        if (!window.confirm(`Are you sure you want to delete ${team.name}?`)) return;

        // Check for members locally first (fastest)
        if (team.members && team.members.length > 0) {
            alert(`Cannot delete team "${team.name}" because it has ${team.members.length} members assigned. Please remove them first.`);
            return;
        }

        try {
            await deleteDoc(doc(db, "teams", team.id));
            fetchTeamsAndPlayers();
        } catch (error) {
            console.error("Error deleting team:", error);
            alert("Failed to delete team.");
        }
    };


    // --- Assignment Logic ---

    const handleAssignPlayer = async (playerId, playerDetails) => {
        const { teamId, role } = assignmentModal;
        const bid = role === "MEMBER" ? (parseInt(bidAmount) || 0) : 0;

        if (!teamId || !role || !playerId) return;

        try {
            await runTransaction(db, async (transaction) => {
                const teamRef = doc(db, "teams", teamId);
                const playerRef = doc(db, "players", playerId);
                const teamPlayerRef = doc(collection(db, "teamPlayers")); // Auto-ID

                // 1. Read Team
                const teamDoc = await transaction.get(teamRef);
                if (!teamDoc.exists()) throw "Team does not exist!";

                const teamData = teamDoc.data();
                const currentPurse = teamData.remainingPurse || 0;

                // 2. Validate Bid
                if (role === "MEMBER") {
                    if (!bid || bid <= 0) {
                        throw "Bid amount must be greater than 0.";
                    }
                    if (bid > currentPurse) {
                        throw `Insufficient funds! Remaining: ${currentPurse}, Bid: ${bid}`;
                    }
                }

                // 3. Writes
                transaction.set(teamPlayerRef, {
                    teamId,
                    playerId,
                    playerName: playerDetails.name,
                    role,
                    bidAmount: bid,
                    assignedAt: new Date().toISOString()
                });

                transaction.update(playerRef, { isAssigned: true });

                // Deduct from purse ONLY for MEMBER (Owner/Icon are free/exempt)
                if (role === "MEMBER") {
                    transaction.update(teamRef, {
                        remainingPurse: currentPurse - bid
                    });
                }
            });

            // 4. Refresh
            setAssignmentModal({ isOpen: false, teamId: null, role: null });
            setBidAmount("");
            fetchTeamsAndPlayers();

        } catch (error) {
            console.error("Assignment Error:", error);
            alert("Assignment Failed: " + (typeof error === 'string' ? error : error.message));
        }
    };

    const handleRemoveMember = async (member) => {
        if (!window.confirm(`Are you sure you want to remove ${member.playerName}? Bid (${member.bidAmount || 0}) will be refunded.`)) return;

        try {
            await runTransaction(db, async (transaction) => {
                const teamRef = doc(db, "teams", member.teamId);
                const playerRef = doc(db, "players", member.playerId);
                const teamPlayerRef = doc(db, "teamPlayers", member.id);

                const teamDoc = await transaction.get(teamRef);
                if (!teamDoc.exists()) throw "Team not found";

                const refund = member.bidAmount || 0;
                const currentPurse = teamDoc.data().remainingPurse || 0;

                transaction.delete(teamPlayerRef);
                transaction.update(playerRef, { isAssigned: false });
                transaction.update(teamRef, { remainingPurse: currentPurse + refund });
            });
            fetchTeamsAndPlayers();
        } catch (error) {
            console.error("Remove Error:", error);
            alert("Failed to remove member: " + error.message);
        }
    };

    // New: Edit Bid Logic
    const [editBidModal, setEditBidModal] = useState({ isOpen: false, member: null, currentBid: 0 });

    const openEditBid = (member) => {
        setEditBidModal({ isOpen: true, member, currentBid: member.bidAmount || 0 });
    };

    const handleUpdateBid = async (e) => {
        e.preventDefault();
        const { member, currentBid } = editBidModal;
        const newBid = parseInt(currentBid) || 0;
        const oldBid = member.bidAmount || 0;
        const diff = newBid - oldBid; // Positive if bid increased (deduct more), Negative if decreased (refund)

        if (diff === 0) {
            setEditBidModal({ isOpen: false, member: null, currentBid: 0 });
            return;
        }

        try {
            await runTransaction(db, async (transaction) => {
                const teamRef = doc(db, "teams", member.teamId);
                const teamPlayerRef = doc(db, "teamPlayers", member.id);

                const teamDoc = await transaction.get(teamRef);
                if (!teamDoc.exists()) throw "Team not found";

                const teamData = teamDoc.data();
                const currentPurse = teamData.remainingPurse || 0;

                // If asking for more money (diff > 0), check if we have it
                if (diff > 0 && currentPurse < diff) {
                    throw `Insufficient purse balance! Need ${diff}, have ${currentPurse}.`;
                }

                transaction.update(teamPlayerRef, { bidAmount: newBid });
                transaction.update(teamRef, { remainingPurse: currentPurse - diff });
            });

            setEditBidModal({ isOpen: false, member: null, currentBid: 0 });
            fetchTeamsAndPlayers();
        } catch (error) {
            console.error("Update Bid Error:", error);
            alert("Failed to update bid: " + (typeof error === 'string' ? error : error.message));
        }
    };

    // --- Render Helpers ---

    const hasRole = (team, role) => team.members.some(m => m.role === role);

    const openAssignment = (teamId, role) => {
        const team = teams.find(t => t.id === teamId);
        if ((role === "OWNER" || role === "ICON") && hasRole(team, role)) {
            alert(`This team already has an ${role}`);
            return;
        }
        setAssignmentModal({ isOpen: true, teamId, role });
        setBidAmount("");
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
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Plus size={20} />
                    Create Team
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {teams.map(team => (
                    <div key={team.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                        <div className="p-4 bg-gradient-to-r from-slate-800 to-slate-900 text-white flex justify-between items-start">
                            <div>
                                <h3 className="font-bold text-lg">{team.name}</h3>
                                <div className="flex items-center gap-1 text-xs text-blue-200 mt-1">
                                    <Wallet size={12} />
                                    <span>Purse: {team.remainingPurse?.toLocaleString()} / {team.maxPurse?.toLocaleString()}</span>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => openEditTeam(team)} className="text-slate-400 hover:text-white transition-colors" title="Edit Team">
                                    <Edit2 size={16} />
                                </button>
                                <button onClick={() => handleDeleteTeam(team)} className="text-slate-400 hover:text-red-400 transition-colors" title="Delete Team">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>

                        <div className="p-4 flex-1 space-y-4">
                            {/* Owner & Icon Slots */}
                            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                                {/* Owner */}
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Owner</span>
                                    {!hasRole(team, "OWNER") && (
                                        <button onClick={() => openAssignment(team.id, "OWNER")} className="text-xs text-blue-600 hover:underline">+ Assign</button>
                                    )}
                                </div>
                                {team.members.find(m => m.role === "OWNER") ? (
                                    <div className="flex justify-between items-center group">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold">O</div>
                                            <span className="font-medium text-sm text-gray-800">{team.members.find(m => m.role === "OWNER").playerName}</span>
                                        </div>
                                        <button onClick={() => handleRemoveMember(team.members.find(m => m.role === "OWNER"))} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ) : <div className="text-sm text-gray-400 italic">Empty Slot</div>}

                                <div className="border-t border-gray-200 my-2"></div>

                                {/* Icon */}
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Icon Player</span>
                                    {!hasRole(team, "ICON") && (
                                        <button onClick={() => openAssignment(team.id, "ICON")} className="text-xs text-blue-600 hover:underline">+ Assign</button>
                                    )}
                                </div>
                                {team.members.find(m => m.role === "ICON") ? (
                                    <div className="flex justify-between items-center group">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold">I</div>
                                            <span className="font-medium text-sm text-gray-800">{team.members.find(m => m.role === "ICON").playerName}</span>
                                        </div>
                                        <button onClick={() => handleRemoveMember(team.members.find(m => m.role === "ICON"))} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ) : <div className="text-sm text-gray-400 italic">Empty Slot</div>}
                            </div>

                            {/* Members */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Squad ({team.members.filter(m => m.role === "MEMBER").length})</span>
                                    <button onClick={() => openAssignment(team.id, "MEMBER")} className="text-xs text-blue-600 hover:underline">+ Add Member</button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {team.members.filter(m => m.role === "MEMBER").map(member => (
                                        <div key={member.id} className="group relative px-2 py-1 bg-gray-100 rounded text-xs text-gray-700 flex items-center gap-2 border border-transparent hover:border-gray-300">
                                            <span>{member.playerName}</span>
                                            <button onClick={() => openEditBid(member)} className="text-gray-500 hover:text-blue-600 font-mono underline decoration-dotted">
                                                ({member.bidAmount})
                                            </button>
                                            <button onClick={() => handleRemoveMember(member)} className="text-red-400 hover:text-red-600 hidden group-hover:block absolute -top-2 -right-2 bg-white rounded-full p-0.5 shadow-sm border border-gray-200">
                                                <X size={10} />
                                            </button>
                                        </div>
                                    ))}
                                    {team.members.filter(m => m.role === "MEMBER").length === 0 && (
                                        <span className="text-sm text-gray-400 italic">No members yet</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Create Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl p-6 w-full max-w-sm">
                        <h3 className="text-xl font-bold mb-4">Create New Team</h3>
                        <form onSubmit={handleCreateTeam}>
                            <div className="space-y-3 mb-4">
                                <label className="block text-sm font-medium text-gray-700">Team Name</label>
                                <input required className="w-full border p-2 rounded" value={teamForm.name} onChange={e => setTeamForm({ ...teamForm, name: e.target.value })} />
                                <label className="block text-sm font-medium text-gray-700">Max Purse</label>
                                <input required type="number" className="w-full border p-2 rounded" value={teamForm.maxPurse} onChange={e => setTeamForm({ ...teamForm, maxPurse: e.target.value })} />
                            </div>
                            <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl p-6 w-full max-w-sm">
                        <h3 className="text-xl font-bold mb-4">Edit Team</h3>
                        <form onSubmit={handleUpdateTeam}>
                            <div className="space-y-3 mb-4">
                                <label className="block text-sm font-medium text-gray-700">Team Name</label>
                                <input required className="w-full border p-2 rounded" value={teamForm.name} onChange={e => setTeamForm({ ...teamForm, name: e.target.value })} />
                                <label className="block text-sm font-medium text-gray-700">Max Purse</label>
                                <input required type="number" className="w-full border p-2 rounded" value={teamForm.maxPurse} onChange={e => setTeamForm({ ...teamForm, maxPurse: e.target.value })} />
                                <p className="text-xs text-yellow-600 bg-yellow-50 p-2 rounded">Warning: Changing max purse will adjust remaining purse by the difference.</p>
                            </div>
                            <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save Changes</button>
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
                                Assign {assignmentModal.role}
                            </h3>
                            <button onClick={() => setAssignmentModal({ ...assignmentModal, isOpen: false })}><X size={20} /></button>
                        </div>

                        {assignmentModal.role === "MEMBER" && (
                            <div className="p-4 bg-yellow-50 border-b border-yellow-100">
                                <label className="block text-sm font-medium text-yellow-800 mb-1">Bid Amount</label>
                                <input
                                    type="number"
                                    autoFocus
                                    className="w-full border border-yellow-300 rounded p-2 focus:ring-2 focus:ring-yellow-500 outline-none"
                                    placeholder="Enter bid amount..."
                                    value={bidAmount}
                                    onChange={e => setBidAmount(e.target.value)}
                                />
                            </div>
                        )}

                        <div className="p-4 bg-white border-b border-gray-100">
                            <input
                                className="w-full border p-2 rounded-lg bg-gray-50"
                                placeholder="Search unassigned players..."
                                value={searchPlayer}
                                onChange={e => setSearchPlayer(e.target.value)}
                            />
                        </div>

                        <div className="flex-1 overflow-y-auto p-2">
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
                                {filteredUnassigned.length === 0 && <div className="p-8 text-center text-gray-500">No players found.</div>}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Bid Modal */}
            {editBidModal.isOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl p-6 w-full max-w-sm">
                        <h3 className="text-xl font-bold mb-4">Update Bid</h3>
                        <p className="text-sm text-gray-500 mb-4">
                            Changing bid for <strong>{editBidModal.member?.playerName}</strong> from {editBidModal.member?.bidAmount} to:
                        </p>
                        <form onSubmit={handleUpdateBid}>
                            <input
                                autoFocus
                                type="number"
                                required
                                className="w-full border p-2 rounded mb-4"
                                value={editBidModal.currentBid}
                                onChange={e => setEditBidModal({ ...editBidModal, currentBid: e.target.value })}
                            />
                            <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => setEditBidModal({ isOpen: false, member: null, currentBid: 0 })} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Update</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
