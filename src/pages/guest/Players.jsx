import { useState, useEffect } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../../firebase";
import GuestPlayerCard from "../../components/guest/GuestPlayerCard";
import PlayerDetailsModal from "../../components/common/PlayerDetailsModal";
import { Loader2, Search, Filter } from "lucide-react";

export default function GuestPlayers() {
    const [players, setPlayers] = useState([]);
    const [rawPlayers, setRawPlayers] = useState([]);
    const [rawTeams, setRawTeams] = useState([]);
    const [rawAssignments, setRawAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [semesterFilter, setSemesterFilter] = useState("all");
    const [selectedPlayer, setSelectedPlayer] = useState(null);

    useEffect(() => {
        // Fetch Players
        const unsubPlayers = onSnapshot(query(collection(db, "players"), orderBy("name")), (snapshot) => {
            const playersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Nested fetch for context (Teams & Assignments)
            // Real-time listener for teamPlayers to map assignments
            // Note: In a production app, we might just fetch once or use a join, but listeners are fine here.
            // We need a way to combine them. Let's use a separate listener or just one-off?
            // "Real-time" is a feature. Let's try to keep it.
            // Limitation: Multiple listeners inside useEffect might be tricky to sync.
            // Simplified: Fetch teams/teamPlayers ONCE on load, or listen to them too.
            // Let's listen to all 3.
        });

        // Refactored to listen to all 3 collections
        const unsubP = onSnapshot(collection(db, "players"), (pSnap) => {
            const pList = pSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            setRawPlayers(pList);
        });
        const unsubT = onSnapshot(collection(db, "teams"), (tSnap) => {
            const tList = tSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            setRawTeams(tList);
        });
        const unsubTP = onSnapshot(collection(db, "teamPlayers"), (tpSnap) => {
            const tpList = tpSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            setRawAssignments(tpList);
        });

        return () => {
            unsubP();
            unsubT();
            unsubTP();
        };
    }, []);

    // Merge Data
    useEffect(() => {
        if (rawPlayers.length === 0) {
            setPlayers([]);
            setLoading(false);
            return;
        }

        const merged = rawPlayers.map(p => {
            if (!p.isAssigned) return p;

            const assignment = rawAssignments.find(tp => tp.playerId === p.id);
            if (assignment) {
                const team = rawTeams.find(t => t.id === assignment.teamId);
                return {
                    ...p,
                    teamName: team ? team.name : "Unknown Team",
                    role: assignment.role,
                    bidAmount: assignment.bidAmount
                };
            }
            return p;
        });

        // Sort by name
        merged.sort((a, b) => a.name.localeCompare(b.name));
        setPlayers(merged);
        setLoading(false);
    }, [rawPlayers, rawTeams, rawAssignments]);


    const filteredPlayers = players.filter(player => {
        const matchesSearch = player.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            player.primarySkills?.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesStatus = statusFilter === "all" ||
            (statusFilter === "assigned" ? player.isAssigned : !player.isAssigned);
        const matchesSemester = semesterFilter === "all" || player.semester?.toString() === semesterFilter;

        return matchesSearch && matchesStatus && matchesSemester;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="max-w-md mx-auto">
            <header className="mb-4">
                <h1 className="text-2xl font-bold text-gray-900">Players</h1>
                <p className="text-gray-500 text-sm">Browse all registered participants</p>
            </header>

            {/* Filters */}
            <div className="sticky top-14 bg-slate-50 z-40 pb-4 space-y-3">
                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Search players or skills..."
                        className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Filter Pills */}
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                    <select
                        className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 outline-none focus:border-blue-500"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="all">All Status</option>
                        <option value="assigned">Assigned</option>
                        <option value="available">Available</option>
                    </select>

                    <select
                        className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 outline-none focus:border-blue-500"
                        value={semesterFilter}
                        onChange={(e) => setSemesterFilter(e.target.value)}
                    >
                        <option value="all">All Semesters</option>
                        <option value="2">Sem 2</option>
                        <option value="4">Sem 4</option>
                        <option value="6">Sem 6</option>
                        <option value="8">Sem 8</option>
                    </select>
                </div>
            </div>

            {/* List */}
            <div className="">
                {filteredPlayers.length > 0 ? (
                    filteredPlayers.map(player => (
                        <div key={player.id} onClick={() => setSelectedPlayer(player)} className="cursor-pointer active:scale-95 transition-transform">
                            <GuestPlayerCard player={player} />
                        </div>
                    ))
                ) : (
                    <div className="text-center py-12 text-gray-500 text-sm">
                        No players found matching your filters.
                    </div>
                )}
            </div>

            <div className="text-center text-gray-400 text-xs mt-4">
                Showing {filteredPlayers.length} of {players.length} players
            </div>

            {/* Player Details Modal */}
            {selectedPlayer && (
                <PlayerDetailsModal
                    player={selectedPlayer}
                    onClose={() => setSelectedPlayer(null)}
                    teamName={selectedPlayer.teamName}
                />
            )}
        </div>
    );
}
