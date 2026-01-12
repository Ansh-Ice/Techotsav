import { useState, useEffect } from "react";
import { collection, onSnapshot, query, where, orderBy } from "firebase/firestore";
import { db } from "../../firebase";
import GuestPlayerCard from "../../components/guest/GuestPlayerCard";
import PlayerDetailsModal from "../../components/common/PlayerDetailsModal";
import { Loader2, Gavel } from "lucide-react";

export default function AuctionPool() {
    const [players, setPlayers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPlayer, setSelectedPlayer] = useState(null);

    useEffect(() => {
        // Query only unassigned players
        const q = query(
            collection(db, "players"),
            where("isAssigned", "==", false),
            orderBy("name")
            // Note: composite index might be needed for where + orderBy. 
            // If it fails, we can client-side sort. 
            // Standard queries usually need index for multiple fields.
            // Let's try simple query first, checking console for index error if it happens.
            // Or safest: fetch all unassigned, sort client side.
        );

        const unsubscribe = onSnapshot(collection(db, "players"), (snapshot) => {
            // Client-side filter to avoid index requirement issues for now
            const unassignedPlayers = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(p => p.isAssigned === false)
                .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

            setPlayers(unassignedPlayers);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Group by Semester
    const groupedPlayers = {
        2: players.filter(p => p.semester?.toString() === "2"),
        4: players.filter(p => p.semester?.toString() === "4"),
        6: players.filter(p => p.semester?.toString() === "6"),
        8: players.filter(p => p.semester?.toString() === "8"),
        "Other": players.filter(p => !["2", "4", "6", "8"].includes(p.semester?.toString()))
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="max-w-md mx-auto">
            <header className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Gavel className="w-6 h-6 text-blue-600" />
                        Auction Pool
                    </h1>
                    <p className="text-gray-500 text-sm">{players.length} players waiting for bids</p>
                </div>
            </header>

            <div className="space-y-8">
                {["2", "4", "6", "8", "Other"].map(sem => {
                    const group = groupedPlayers[sem];
                    if (group.length === 0) return null;

                    return (
                        <div key={sem} className="relative">
                            <div className="flex items-center gap-4 mb-4">
                                <h2 className="text-lg font-bold text-gray-800 bg-slate-50 px-3 py-1 rounded-lg border border-gray-200">
                                    Semester {sem}
                                </h2>
                                <div className="h-px bg-gray-200 flex-grow"></div>
                                <span className="text-xs text-gray-400 font-medium">{group.length} Players</span>
                            </div>

                            <div className="space-y-2">
                                {group.map(player => (
                                    <div key={player.id} onClick={() => setSelectedPlayer(player)} className="cursor-pointer active:scale-95 transition-transform">
                                        <GuestPlayerCard player={player} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}

                {players.length === 0 && (
                    <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                        <p className="text-gray-500">No players currently in pool.</p>
                        <p className="text-xs text-gray-400 mt-1">All players may be assigned.</p>
                    </div>
                )}
            </div>

            {selectedPlayer && (
                <PlayerDetailsModal
                    player={selectedPlayer}
                    onClose={() => setSelectedPlayer(null)}
                />
            )}
        </div>
    );
}
