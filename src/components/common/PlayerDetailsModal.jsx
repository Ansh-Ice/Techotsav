import { X, User, MapPin, Award, BookOpen } from "lucide-react";
import { useEffect, useRef } from "react";

export default function PlayerDetailsModal({ player, onClose, teamName }) {
    if (!player) return null;

    // Close on escape key
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleEsc);
        return () => window.removeEventListener("keydown", handleEsc);
    }, [onClose]);

    // Prevent scrolling background when modal is open
    useEffect(() => {
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = "unset";
        };
    }, []);

    const isAssigned = player.isAssigned;

    return (
        <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            {/* Modal Content - Bottom Sheet on Mobile, Dialog on Desktop */}
            <div className="relative w-full max-w-md bg-white md:rounded-2xl rounded-t-2xl shadow-2xl transform transition-transform duration-300 max-h-[90vh] overflow-y-auto">

                {/* Close Handle / Button */}
                <div className="sticky top-0 right-0 z-10 flex justify-end p-4 bg-gradient-to-b from-black/20 to-transparent absolute w-full h-full pointer-events-none">
                    {/* Just a visual overlay for image, close button is separate */}
                </div>

                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-20 p-2 bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-full text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Hero Image Section */}
                <div className="relative h-64 bg-gray-100">
                    {player.photoUrl ? (
                        <img
                            src={player.photoUrl}
                            alt={player.name}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-300 bg-slate-50">
                            <User className="w-20 h-20 mb-2" />
                            <span className="text-sm font-medium">No Photo Available</span>
                        </div>
                    )}

                    {/* Status Badge Overlay */}
                    <div className="absolute bottom-4 left-4">
                        <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide backdrop-blur-md border shadow-sm ${isAssigned
                            ? "bg-green-500/90 text-white border-green-400"
                            : "bg-yellow-500/90 text-white border-yellow-400"
                            }`}>
                            {isAssigned ? "Assigned" : "Available"}
                        </span>
                    </div>
                </div>

                {/* Content Body */}
                <div className="p-6 space-y-6">
                    {/* Header Info */}
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 leading-tight">{player.name}</h2>
                        <div className="flex items-center gap-2 mt-2 text-gray-600 font-mono text-sm">
                            <span className="px-2 py-0.5 bg-gray-100 rounded border border-gray-200">
                                {player.enrollmentNo}
                            </span>
                            <span>•</span>
                            <span>Sem {player.semester} - {player.division}</span>
                        </div>
                    </div>

                    {/* Assignment Info */}
                    {isAssigned && (
                        <div className={`rounded-xl p-4 border flex items-start gap-3 ${player.role === "OWNER" ? "bg-purple-50 border-purple-100" :
                                player.role === "ICON" ? "bg-blue-50 border-blue-100" :
                                    "bg-gray-50 border-gray-100"
                            }`}>
                            <div className={`p-2 rounded-lg ${player.role === "OWNER" ? "bg-purple-100 text-purple-700" :
                                    player.role === "ICON" ? "bg-blue-100 text-blue-700" :
                                        "bg-gray-200 text-gray-700"
                                }`}>
                                <Award className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className={`font-bold border-b pb-1 mb-1 ${player.role === "OWNER" ? "text-purple-900 border-purple-200" :
                                        player.role === "ICON" ? "text-blue-900 border-blue-200" :
                                            "text-gray-900 border-gray-200"
                                    }`}>
                                    {teamName || player.teamName ? `Member of ${teamName || player.teamName}` : "Assigned to a Team"}
                                </h3>
                                <div className="flex flex-wrap items-center gap-2 mt-2">
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase ${player.role === "OWNER" ? "bg-purple-200 text-purple-800" :
                                            player.role === "ICON" ? "bg-blue-200 text-blue-800" :
                                                "bg-gray-200 text-gray-700"
                                        }`}>
                                        {player.role || "MEMBER"}
                                    </span>
                                    {player.bidAmount && (
                                        <span className="text-xs text-gray-600 font-mono bg-white px-2 py-0.5 rounded border border-gray-200">
                                            Bid: ₹{Number(player.bidAmount).toLocaleString()}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Skills */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-blue-500" />
                            Skills
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {player.primarySkills && player.primarySkills.length > 0 ? (
                                player.primarySkills.map((skill, i) => (
                                    <span key={i} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium border border-blue-100 shadow-sm">
                                        {skill}
                                    </span>
                                ))
                            ) : (
                                <span className="text-sm text-gray-400 italic">No skills listed</span>
                            )}
                        </div>
                    </div>

                    {/* Events */}
                    <div className="grid grid-cols-1 gap-4">
                        {(player.technicalEvents?.length > 0) && (
                            <div className="bg-slate-50 p-3 rounded-xl border border-gray-100">
                                <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Technical Events</h4>
                                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                                    {player.technicalEvents.map((ev, i) => <li key={i}>{ev}</li>)}
                                </ul>
                            </div>
                        )}

                        {(player.nonTechnicalEvents?.length > 0) && (
                            <div className="bg-slate-50 p-3 rounded-xl border border-gray-100">
                                <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Non-Technical Events</h4>
                                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                                    {player.nonTechnicalEvents.map((ev, i) => <li key={i}>{ev}</li>)}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
