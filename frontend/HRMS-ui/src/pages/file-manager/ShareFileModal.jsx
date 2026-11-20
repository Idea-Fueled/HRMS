import React, { useState, useEffect } from "react";
import { Share2, Search, X, Check, Loader2, Users, User, Shield } from "lucide-react";
import { toast } from "sonner";
import { getShareableEmployees, shareFile } from "../../services/file.service";

const ShareFileModal = ({ file, isOpen, onClose, onShareSuccess }) => {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedIds, setSelectedIds] = useState([]);

    useEffect(() => {
        if (!isOpen || !file) return;

        // Initialize selected IDs with existing sharedWith users
        const existingIds = (file.sharedWith || [])
            .map((s) => (typeof s.user === "object" ? s.user?._id : s.user))
            .filter(Boolean);
        setSelectedIds(existingIds);

        const fetchEmployees = async () => {
            try {
                setLoading(true);
                const res = await getShareableEmployees();
                if (res.data?.success) {
                    setEmployees(res.data.employees || []);
                }
            } catch (err) {
                console.error("Failed to fetch employees:", err);
                toast.error("Failed to load employee list.");
            } finally {
                setLoading(false);
            }
        };

        fetchEmployees();
    }, [isOpen, file]);

    if (!isOpen || !file) return null;

    const fileOwnerId = typeof file.uploadedBy === "object" ? file.uploadedBy?._id : file.uploadedBy;

    // Filter employees: exclude file owner and match search query
    const filteredEmployees = employees.filter((emp) => {
        if (emp._id === fileOwnerId) return false;
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
            (emp.name || "").toLowerCase().includes(q) ||
            (emp.email || "").toLowerCase().includes(q) ||
            (emp.department || "").toLowerCase().includes(q)
        );
    });

    const toggleSelect = (id) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    };

    const handleSelectAll = () => {
        const visibleIds = filteredEmployees.map((e) => e._id);
        const allSelected = visibleIds.every((id) => selectedIds.includes(id));
        if (allSelected) {
            setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
        } else {
            setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await shareFile(file._id, selectedIds);
            if (res.data?.success) {
                toast.success(res.data.message || "Sharing updated successfully!");
                if (onShareSuccess) {
                    onShareSuccess(res.data.file);
                }
                onClose();
            } else {
                toast.error(res.data?.message || "Failed to share file.");
            }
        } catch (err) {
            console.error("Save Share Error:", err);
            toast.error(err.response?.data?.message || "Failed to share file.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn select-none">
            <div className="bg-white border border-gray-150 rounded-[22px] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="px-6 py-4.5 border-b border-gray-150 flex items-center justify-between shrink-0 bg-white">
                    <div className="flex items-center gap-2.5 min-w-0 pr-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#2D79C7] flex items-center justify-center shrink-0">
                            <Share2 className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-base font-black text-slate-800 truncate">
                                Share "{file.name}"
                            </h3>
                            <p className="text-[11px] font-semibold text-slate-400">
                                Select colleagues who can view this file in their File Manager
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-gray-100 cursor-pointer shrink-0"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Search & Actions Bar */}
                <div className="p-4 border-b border-gray-100 bg-slate-50/60 flex items-center gap-2.5 shrink-0">
                    <div className="relative flex-1">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search colleagues by name or email..."
                            className="w-full bg-white border border-gray-200 pl-9 pr-3 py-2 text-xs font-semibold text-slate-800 rounded-xl focus:outline-none focus:border-[#2D79C7] transition-all shadow-inner"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery("")}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={handleSelectAll}
                        className="px-3 py-2 rounded-xl text-xs font-bold text-slate-600 bg-white border border-gray-200 hover:bg-gray-50 transition-all cursor-pointer shadow-2xs shrink-0"
                    >
                        {filteredEmployees.length > 0 &&
                        filteredEmployees.every((e) => selectedIds.includes(e._id))
                            ? "Deselect All"
                            : "Select All"}
                    </button>
                </div>

                {/* Employee List */}
                <div className="p-4 overflow-y-auto space-y-1.5 flex-1 min-h-[260px] max-h-[380px]">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                            <Loader2 className="w-6 h-6 animate-spin text-[#2D79C7] mb-2" />
                            <p className="text-xs font-semibold">Loading colleagues...</p>
                        </div>
                    ) : filteredEmployees.length === 0 ? (
                        <div className="text-center py-12 text-slate-400">
                            <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-xs font-bold text-slate-600">No colleagues found</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">Try searching with a different name</p>
                        </div>
                    ) : (
                        filteredEmployees.map((emp) => {
                            const isSelected = selectedIds.includes(emp._id);
                            return (
                                <div
                                    key={emp._id}
                                    onClick={() => toggleSelect(emp._id)}
                                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                                        isSelected
                                            ? "bg-blue-50/70 border-blue-200 shadow-2xs"
                                            : "bg-white border-gray-150 hover:bg-slate-50/80"
                                    }`}
                                >
                                    <div className="flex items-center gap-3 min-w-0 pr-2">
                                        {emp.profilePicture ? (
                                            <img
                                                src={emp.profilePicture}
                                                alt={emp.name}
                                                className="w-8 h-8 rounded-full object-cover border border-gray-200 shrink-0"
                                            />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full bg-blue-100 text-[#2D79C7] font-black text-xs flex items-center justify-center shrink-0">
                                                {emp.name?.charAt(0)?.toUpperCase() || "U"}
                                            </div>
                                        )}

                                        <div className="min-w-0">
                                            <h4 className="text-xs font-bold text-slate-800 truncate">
                                                {emp.name}
                                            </h4>
                                            <p className="text-[10px] text-slate-400 truncate">
                                                {emp.email} • {emp.department}
                                            </p>
                                        </div>
                                    </div>

                                    <div
                                        className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                                            isSelected
                                                ? "bg-[#2D79C7] border-[#2D79C7] text-white"
                                                : "border-gray-300 bg-white"
                                        }`}
                                    >
                                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-150 bg-gray-50/50 flex items-center justify-between shrink-0">
                    <span className="text-xs font-bold text-slate-500">
                        {selectedIds.length} colleague(s) selected
                    </span>

                    <div className="flex items-center gap-2.5">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={saving}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-gray-100 transition-all cursor-pointer disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving}
                            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#2D79C7] hover:bg-[#1F5EA8] shadow-sm shadow-[#2D79C7]/30 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>Saving...</span>
                                </>
                            ) : (
                                <>
                                    <Share2 className="w-3.5 h-3.5" />
                                    <span>Save Sharing</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ShareFileModal;
