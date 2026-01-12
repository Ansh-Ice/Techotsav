import { Outlet, Link } from "react-router-dom";

export default function PublicLayout() {
    return (
        <div className="min-h-screen bg-slate-50">
            {/* Public Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
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
                        <Link to="/" className="text-gray-600 hover:text-gray-900 font-medium">Leaderboard</Link>
                        <Link to="/teams" className="text-gray-600 hover:text-gray-900 font-medium">Teams</Link>
                        <Link to="/players" className="text-gray-600 hover:text-gray-900 font-medium">Players</Link>
                    </nav>
                    <Link
                        to="/login"
                        className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                    >
                        Admin Login
                    </Link>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Outlet />
            </main>
        </div>
    );
}
