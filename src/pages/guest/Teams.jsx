import { useState, useEffect } from "react";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db } from "../../firebase";
import GuestTeamCard from "../../components/guest/GuestTeamCard";
import { Loader2 } from "lucide-react";

export default function GuestTeams() {
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // We need 3 collections: teams, players, teamPlayers
        // Real-time listeners for all 3

        let teamsData = [];
        let playersMap = {}; // id -> player data
        let teamPlayersData = [];

        const unsubscribeTeams = onSnapshot(collection(db, "teams"), (snapshot) => {
            teamsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            processData();
        });

        const unsubscribePlayers = onSnapshot(collection(db, "players"), (snapshot) => {
            playersMap = {};
            snapshot.docs.forEach(doc => {
                playersMap[doc.id] = { id: doc.id, ...doc.data() };
            });
            processData();
        });

        const unsubscribeTeamPlayers = onSnapshot(collection(db, "teamPlayers"), (snapshot) => {
            teamPlayersData = snapshot.docs.map(doc => doc.data());
            processData();
        });

        function processData() {
            // Only process if we have initial data for everything (or at least teams)
            // But snapshots fire immediately, so we should be fine.
            // We'll just re-render whenever any changes.

            if (teamsData.length === 0 && loading) {
                // might be just empty
            }

            // Map teamPlayers to their teams and add player details
            const processedTeams = teamsData.map(team => {
                // Find all members for this team
                const members = teamPlayersData
                    .filter(tp => tp.teamId === team.id)
                    .map(tp => {
                        const player = playersMap[tp.playerId];
                        return {
                            ...player, // name, photoUrl, semester etc
                            bidAmount: tp.bidAmount,
                            role: tp.role,
                            id: tp.playerId // ensure ID is passed
                        };
                    });

                return {
                    ...team,
                    members
                };
            });

            setTeams(processedTeams);
            setLoading(false);
        }

        return () => {
            unsubscribeTeams();
            unsubscribePlayers();
            unsubscribeTeamPlayers();
        };
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="max-w-md mx-auto">
            {/* Added max-w-md for mobile look on desktop and pb-20 for bottom nav */}

            <header className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Teams</h1>
                <p className="text-gray-500 text-sm">Live auction status and team compositions</p>
            </header>

            <div className="space-y-4">
                {teams.map(team => (
                    <GuestTeamCard key={team.id} team={team} members={team.members} />
                ))}

                {teams.length === 0 && (
                    <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                        <p className="text-gray-500">No teams registered yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
