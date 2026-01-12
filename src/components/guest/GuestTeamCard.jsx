import { useState } from "react";
import { ChevronDown, ChevronUp, User, Users, Coins } from "lucide-react";

export default function GuestTeamCard({ team, members = [] }) {
    const [isExpanded, setIsExpanded] = useState(false);

    // Calculate member count excluding owner if owner is separate, 
    // but usually "members" includes everyone assigned.
    // Prompt says "MEMBER list (collapsible)" and "Each member card shows... Bid amount (only for MEMBERS)"
    // It also says "OWNER (highlighted)".
    // We'll assume the passed 'members' array contains the player details + bid info.

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-4">
            {/* Team Header Card */}
            <div
                className="p-4 bg-gradient-to-r from-white to-gray-50 cursor-pointer"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        {/* Team Icon */}
                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-2xl border-2 border-white shadow-sm">
                            {team.icon || "🛡️"}
                        </div>

                        <div>
                            <h3 className="font-bold text-gray-900 leading-tight">{team.name}</h3>
                            <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                                <span className="flex items-center gap-1">
                                    <User className="w-3 h-3" />
                                    {team.ownerName || "No Owner"}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="text-right">
                        <div className="flex items-center justify-end gap-1 text-green-600 font-bold">
                            <Coins className="w-4 h-4" />
                            <span>₹{team.remainingPurse?.toLocaleString() ?? 0}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">remaining</div>
                    </div>
                </div>

                {/* Expansion Toggle */}
                <div className="mt-3 flex items-center justify-between text-xs text-gray-500 border-t border-gray-100 pt-2">
                    <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        <span>{members.length} Members</span>
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
            </div>

            {/* Collapsible Members List */}
            {isExpanded && (
                <div className="bg-gray-50 px-3 py-2 space-y-2 border-t border-gray-100">
                    {members.length > 0 ? (
                        members.map((member) => {
                            const isOwner = member.role === "OWNER";
                            const isIcon = member.role === "ICON";

                            return (
                                <div key={member.id} className={`p-2 rounded-lg border flex items-center justify-between shadow-sm ${isOwner ? "bg-purple-50 border-purple-200" :
                                        isIcon ? "bg-blue-50 border-blue-200" :
                                            "bg-white border-gray-200"
                                    }`}>
                                    <div className="flex items-center gap-3">
                                        {/* Player Photo/Avatar */}
                                        <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 relative">
                                            {member.photoUrl ? (
                                                <img src={member.photoUrl} alt={member.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                    <User className="w-5 h-5" />
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className={`font-semibold text-sm ${isOwner ? "text-purple-900" :
                                                        isIcon ? "text-blue-900" :
                                                            "text-gray-900"
                                                    }`}>
                                                    {member.name}
                                                </p>
                                                {(isOwner || isIcon) && (
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${isOwner ? "bg-purple-200 text-purple-800" : "bg-blue-200 text-blue-800"
                                                        }`}>
                                                        {member.role}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-500">Sem {member.semester}</p>
                                        </div>
                                    </div>

                                    {/* Bid Amount - Show for Members, maybe hide or show specially for others */}
                                    <div className="text-right">
                                        {(!isOwner && !isIcon) ? (
                                            <span className="block text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded-full border border-green-100">
                                                ₹{member.bidAmount?.toLocaleString() ?? 0}
                                            </span>
                                        ) : (
                                            <span className="text-xs text-gray-400 font-medium">
                                                {member.role}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <p className="text-center text-gray-400 text-sm py-2">No members assigned yet</p>
                    )}
                </div>
            )}
        </div>
    );
}
