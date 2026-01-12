import { Outlet, Link, useLocation } from "react-router-dom";
import { Trophy, Users, Shield, Gavel, LogIn } from "lucide-react";

export default function PublicLayout() {
    const location = useLocation();

    const isActive = (path) => {
        return location.pathname === path ? "text-blue-600" : "text-gray-500";
    };

    return (
        <div className="min-h-screen bg-slate-50 relative pb-20 md:pb-0">
            {/* Mobile Header - Minimal */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-50 md:hidden">
                <div className="px-4 h-14 flex items-center justify-between">
                    <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                        Techotsav
                    </span>
                    <Link to="/login" className="p-2">
                        <LogIn className="w-5 h-5 text-gray-500" />
                    </Link>
                </div>
            </header>

            {/* Desktop Header - Hidden on mobile */}
            <header className="hidden md:block bg-white border-b border-gray-200 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
                            T
                        </div>
                        <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            Techotsav Auction
                        </span>
                    </div>
                    <nav className="flex gap-6">
                        <Link to="/leaderboard" className="text-gray-600 hover:text-gray-900 font-medium">Leaderboard</Link>
                        <Link to="/teams" className="text-gray-600 hover:text-gray-900 font-medium">Teams</Link>
                        <Link to="/players" className="text-gray-600 hover:text-gray-900 font-medium">Players</Link>
                        <Link to="/pool" className="text-gray-600 hover:text-gray-900 font-medium">Pool</Link>
                    </nav>
                    <Link
                        to="/login"
                        className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                    >
                        Admin Login
                    </Link>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
                <Outlet />
            </main>

            {/* Bottom Navigation - Mobile Only */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden z-50 px-4 py-2">
                <div className="flex justify-around items-center">
                    <Link to="/leaderboard" className={`flex flex-col items-center gap-1 ${isActive("/leaderboard")}`}>
                        <Trophy className="w-6 h-6" />
                        <span className="text-[10px] font-medium">Rankings</span>
                    </Link>
                    <Link to="/teams" className={`flex flex-col items-center gap-1 ${isActive("/teams")}`}>
                        <Shield className="w-6 h-6" />
                        <span className="text-[10px] font-medium">Teams</span>
                    </Link>
                    <Link to="/players" className={`flex flex-col items-center gap-1 ${isActive("/players")}`}>
                        <Users className="w-6 h-6" />
                        <span className="text-[10px] font-medium">Players</span>
                    </Link>
                    <Link to="/pool" className={`flex flex-col items-center gap-1 ${isActive("/pool")}`}>
                        <Gavel className="w-6 h-6" />
                        <span className="text-[10px] font-medium">Pool</span>
                    </Link>
                </div>
            </nav>
        </div>
    );
}
