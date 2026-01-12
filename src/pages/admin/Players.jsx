import { useState, useEffect } from "react";
import { collection, getDocs, addDoc, deleteDoc, doc, setDoc, writeBatch } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../firebase";
import Papa from "papaparse";
import { Plus, Upload, Search, Trash2, User, Image as ImageIcon, Loader2 } from "lucide-react";

export default function Players() {
    const [players, setPlayers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [imageUploading, setImageUploading] = useState(false);

    // Form State
    const [newPlayer, setNewPlayer] = useState({
        name: "",
        enrollmentNo: "",
        semester: "",
        division: "",
        contact: "",
        email: "",
        photoUrl: "",
        primarySkills: "", // comma separated
        technicalEvents: "",
        nonTechnicalEvents: ""
    });

    useEffect(() => {
        fetchPlayers();
    }, []);

    async function fetchPlayers() {
        try {
            const querySnapshot = await getDocs(collection(db, "players"));
            const playersList = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setPlayers(playersList);
        } catch (error) {
            console.error("Error fetching players:", error);
            alert("Failed to fetch players. Ensure you are an Admin.");
        } finally {
            setLoading(false);
        }
    }

    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setUploading(true);
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                try {
                    const batch = writeBatch(db);
                    let count = 0;
                    const BATCH_SIZE = 450; // Firestore limit is 500

                    // Chunking manually if needed, but for now assuming < 500 or just simple loop for batches in future
                    // For simple Vibe Coding: just use one batch for demo, or loop

                    const chunks = [];
                    for (let i = 0; i < results.data.length; i += BATCH_SIZE) {
                        chunks.push(results.data.slice(i, i + BATCH_SIZE));
                    }

                    for (const chunk of chunks) {
                        const currentBatch = writeBatch(db);
                        chunk.forEach((row) => {
                            // Map CSV fields to Schema
                            // Assuming CSV headers match or we map them. 
                            // For simplicity, let's assume loose mapping or standard headers
                            // 'Timestamp' from Google Forms is ignored

                            const playerRef = doc(collection(db, "players"));
                            currentBatch.set(playerRef, {
                                enrollmentNo: row["Enrollment No"] || row.enrollmentNo || "N/A",
                                name: row["Name"] || row.name || "Unknown",
                                semester: row["Semester"] || row.semester || row["Sem"] || row.sem || "",
                                division: row["Division"] || row.division || row["Div"] || row.div || "",
                                contact: row["Contact"] || row.contact || "",
                                email: row["Email Address"] || row.email || "",
                                technicalEvents: row["Technical Events"] ? row["Technical Events"].split(",").map(s => s.trim()) : [],
                                nonTechnicalEvents: row["Non-Technical Events"] ? row["Non-Technical Events"].split(",").map(s => s.trim()) : [],
                                primarySkills: row["Primary Skills"] ? row["Primary Skills"].split(",").map(s => s.trim()) : [],
                                isAssigned: false,
                                createdAt: new Date().toISOString()
                            });
                        });
                        await currentBatch.commit();
                    }

                    alert(`Successfully uploaded ${results.data.length} players!`);
                    fetchPlayers();
                } catch (error) {
                    console.error("Error uploading CSV:", error);
                    alert("Error uploading data: " + error.message);
                } finally {
                    setUploading(false);
                    event.target.value = null; // reset input
                }
            }
        });
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validation - basic check
        if (!file.type.startsWith("image/")) {
            alert("Please upload an image file.");
            return;
        }

        // Use enrollmentNo or a temp ID if not available yet (but prefer enrollmentNo or just allow random name)
        // If creating new player, enrollmentNo might be typed in form.
        const idForImage = newPlayer.enrollmentNo || Date.now().toString();

        setImageUploading(true);
        try {
            const storageRef = ref(storage, `players/${idForImage}.jpg`);
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);

            setNewPlayer(prev => ({ ...prev, photoUrl: downloadURL }));
        } catch (error) {
            console.error("Error uploading image:", error);
            alert("Failed to upload image.");
        } finally {
            setImageUploading(false);
        }
    };

    const handleAddPlayer = async (e) => {
        e.preventDefault();
        try {
            const playerData = {
                name: newPlayer.name,
                enrollmentNo: newPlayer.enrollmentNo,
                email: newPlayer.email,
                contact: newPlayer.contact,
                photoUrl: newPlayer.photoUrl || "",
                semester: newPlayer.semester,
                division: newPlayer.division,
                primarySkills: newPlayer.primarySkills.split(",").map(s => s.trim()),
                technicalEvents: newPlayer.technicalEvents.split(",").map(s => s.trim()),
                nonTechnicalEvents: newPlayer.nonTechnicalEvents.split(",").map(s => s.trim()),
            };

            if (newPlayer.id) {
                // Update
                await setDoc(doc(db, "players", newPlayer.id), {
                    ...playerData,
                    updatedAt: new Date().toISOString()
                }, { merge: true });
            } else {
                // Create
                await addDoc(collection(db, "players"), {
                    ...playerData,
                    isAssigned: false,
                    createdAt: new Date().toISOString()
                });
            }

            setIsModalOpen(false);
            setNewPlayer({ name: "", enrollmentNo: "", semester: "", division: "", contact: "", email: "", photoUrl: "", primarySkills: "", technicalEvents: "", nonTechnicalEvents: "" });
            fetchPlayers();
        } catch (error) {
            console.error("Error saving player:", error);
            alert("Failed to save player.");
        }
    };

    const handleDeletePlayer = async (player) => {
        if (!window.confirm(`Are you sure you want to delete ${player.name}?`)) return;

        if (player.isAssigned) {
            alert("Cannot delete an assigned player. Please remove them from their team first.");
            return;
        }

        try {
            await deleteDoc(doc(db, "players", player.id));
            // Optional: Delete image from storage if we had the path. 
            // We store full URL, so extracting path is tricky unless we stored ref. 
            // We'll skip image delete for now to avoid complexity/errors, or just leave it orphan.
            fetchPlayers();
        } catch (error) {
            console.error("Error deleting player:", error);
            alert("Failed to delete player.");
        }
    };

    const filteredPlayers = players.filter(p =>
        p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.enrollmentNo?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-gray-800">Players Management</h2>
                <div className="flex gap-4">
                    <label className={`flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg cursor-pointer hover:bg-green-700 transition-colors ${uploading ? "opacity-50 cursor-not-allowed" : ""}`}>
                        <Upload size={20} />
                        {uploading ? "Uploading..." : "Import CSV"}
                        <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                    </label>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Plus size={20} />
                        Add Player
                    </button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                    type="text"
                    placeholder="Search by name or enrollment no..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Players List */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-gray-600">Name</th>
                                <th className="px-6 py-4 font-semibold text-gray-600">Enrollment</th>
                                <th className="px-6 py-4 font-semibold text-gray-600">Class</th>
                                <th className="px-6 py-4 font-semibold text-gray-600">Skills</th>
                                <th className="px-6 py-4 font-semibold text-gray-600">Status</th>
                                <th className="px-6 py-4 font-semibold text-gray-600">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan="6" className="px-6 py-8 text-center text-gray-500">Loading players...</td></tr>
                            ) : filteredPlayers.length === 0 ? (
                                <tr><td colSpan="6" className="px-6 py-8 text-center text-gray-500">No players found.</td></tr>
                            ) : (
                                filteredPlayers.map((player) => (
                                    <tr key={player.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                                                {player.name?.[0]?.toUpperCase()}
                                            </div>
                                            {player.name}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 font-mono text-sm">{player.enrollmentNo}</td>
                                        <td className="px-6 py-4 text-gray-600">{player.semester} {player.division}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1">
                                                {player.primarySkills?.slice(0, 2).map((skill, i) => (
                                                    <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{skill}</span>
                                                ))}
                                                {player.primarySkills?.length > 2 && <span className="text-xs text-gray-400">+{player.primarySkills.length - 2}</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${player.isAssigned ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                                                {player.isAssigned ? "Assigned" : "Unassigned"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => {
                                                    setNewPlayer({
                                                        id: player.id,
                                                        name: player.name || "",
                                                        enrollmentNo: player.enrollmentNo || "",
                                                        semester: player.semester || "",
                                                        division: player.division || "",
                                                        contact: player.contact || "",
                                                        email: player.email || "",
                                                        photoUrl: player.photoUrl || "",
                                                        primarySkills: player.primarySkills?.join(", ") || "",
                                                        technicalEvents: player.technicalEvents?.join(", ") || "",
                                                        nonTechnicalEvents: player.nonTechnicalEvents?.join(", ") || ""
                                                    });
                                                    setIsModalOpen(true);
                                                }}
                                                className="text-gray-400 hover:text-blue-600 transition-colors mr-3"
                                                title="Edit"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDeletePlayer(player)}
                                                className="text-gray-400 hover:text-red-600 transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add/Edit Player Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden">
                        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                            <h3 className="text-xl font-bold">{newPlayer.id ? "Edit Player" : "Add New Player"}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                        </div>
                        <form onSubmit={handleAddPlayer} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                    <input required className="w-full border rounded-lg p-2" value={newPlayer.name} onChange={e => setNewPlayer({ ...newPlayer, name: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Enrollment No</label>
                                    <input required className="w-full border rounded-lg p-2" value={newPlayer.enrollmentNo} onChange={e => setNewPlayer({ ...newPlayer, enrollmentNo: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <input required type="email" className="w-full border rounded-lg p-2" value={newPlayer.email} onChange={e => setNewPlayer({ ...newPlayer, email: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact</label>
                                    <input required className="w-full border rounded-lg p-2" value={newPlayer.contact} onChange={e => setNewPlayer({ ...newPlayer, contact: e.target.value })} />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Player Photo</label>
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                                            {newPlayer.photoUrl ? (
                                                <img src={newPlayer.photoUrl} alt="Preview" className="w-full h-full object-cover" />
                                            ) : (
                                                <User className="text-gray-400 w-8 h-8" />
                                            )}
                                        </div>
                                        <div className="flex-grow">
                                            <input
                                                type="text"
                                                className="w-full border rounded-lg p-2 text-sm mb-2"
                                                placeholder="Enter URL manually or upload..."
                                                value={newPlayer.photoUrl || ""}
                                                onChange={e => setNewPlayer({ ...newPlayer, photoUrl: e.target.value })}
                                            />
                                            <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium cursor-pointer transition-colors">
                                                {imageUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImageIcon className="w-3 h-3" />}
                                                {imageUploading ? "Uploading..." : "Upload Image"}
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={handleImageUpload}
                                                    disabled={imageUploading}
                                                />
                                            </label>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Sem</label>
                                        <input className="w-full border rounded-lg p-2" value={newPlayer.semester} onChange={e => setNewPlayer({ ...newPlayer, semester: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Div</label>
                                        <input className="w-full border rounded-lg p-2" value={newPlayer.division} onChange={e => setNewPlayer({ ...newPlayer, division: e.target.value })} />
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Primary Skills (comma separated)</label>
                                <input className="w-full border rounded-lg p-2" value={newPlayer.primarySkills} onChange={e => setNewPlayer({ ...newPlayer, primarySkills: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Tech Events</label>
                                    <input className="w-full border rounded-lg p-2" value={newPlayer.technicalEvents} onChange={e => setNewPlayer({ ...newPlayer, technicalEvents: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Non-Tech Events</label>
                                    <input className="w-full border rounded-lg p-2" value={newPlayer.nonTechnicalEvents} onChange={e => setNewPlayer({ ...newPlayer, nonTechnicalEvents: e.target.value })} />
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                                    {newPlayer.id ? "Update Player" : "Save Player"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

