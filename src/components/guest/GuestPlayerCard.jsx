import { User } from "lucide-react";

export default function GuestPlayerCard({ player }) {
    const isAssigned = player.isAssigned;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 flex items-start gap-4 mb-3">
            {/* Photo */}
            <div className="flex-shrink-0">
                <div className="w-16 h-16 rounded-xl bg-gray-100 overflow-hidden shadow-inner">
                    {player.photoUrl ? (
                        <img src={player.photoUrl} alt={player.name} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <User className="w-8 h-8" />
                        </div>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="flex-grow min-w-0">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="font-bold text-gray-900 truncate pr-2">{player.name}</h3>
                        <p className="text-xs text-gray-500 font-medium">Semester {player.semester}</p>
                    </div>
                    {/* Status Badge */}
                    <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${isAssigned
                            ? "bg-green-100 text-green-700 border border-green-200"
                            : "bg-yellow-100 text-yellow-700 border border-yellow-200"
                        }`}>
                        {isAssigned ? "Assigned" : "Available"}
                    </span>
                </div>

                {/* Skills */}
                <div className="mt-2 flex flex-wrap gap-1">
                    {player.primarySkills && player.primarySkills.length > 0 ? (
                        player.primarySkills.slice(0, 3).map((skill, index) => (
                            <span
                                key={index}
                                className="px-1.5 py-0.5 bg-gray-50 text-gray-600 rounded text-[10px] border border-gray-200"
                            >
                                {skill}
                            </span>
                        ))
                    ) : (
                        <span className="text-[10px] text-gray-400 italic">No specific skills listed</span>
                    )}
                    {player.primarySkills && player.primarySkills.length > 3 && (
                        <span className="text-[10px] text-gray-400">+{player.primarySkills.length - 3}</span>
                    )}
                </div>
            </div>
        </div>
    );
}
