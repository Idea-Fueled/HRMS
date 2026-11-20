import React, { useState } from "react";
import { FileSpreadsheet, FileText, X, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { createDocument } from "../../services/file.service";

const CreateDocModal = ({ isOpen, onClose, type, folderId, folderName, onCreated }) => {
    const [name, setName] = useState("");
    const [creating, setCreating] = useState(false);

    if (!isOpen) return null;

    const isExcel = type === "excel";
    const extension = isExcel ? "xlsx" : "docx";

    const handleSubmit = async (e) => {
        e.preventDefault();
        const trimmed = name.trim();
        if (!trimmed) {
            toast.error("Please enter a document name.");
            return;
        }

        setCreating(true);
        try {
            const res = await createDocument({
                name: trimmed,
                type: isExcel ? "excel" : "word",
                folderId: folderId || null
            });

            if (res.data?.success) {
                toast.success(res.data.message || `${isExcel ? "Spreadsheet" : "Document"} created!`);
                setName("");
                onClose();
                if (onCreated) {
                    onCreated(res.data.file);
                }
            } else {
                toast.error(res.data?.message || "Failed to create document.");
            }
        } catch (err) {
            console.error("Create Doc Error:", err);
            toast.error(err.response?.data?.message || "Failed to create document.");
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn select-none">
            <div className="bg-white border border-gray-150 rounded-[22px] shadow-2xl w-full max-w-sm overflow-hidden text-left transform transition-all">
                {/* Header */}
                <div className="px-6 py-4.5 border-b border-gray-150 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                                isExcel
                                    ? "bg-emerald-50 text-emerald-600"
                                    : "bg-blue-50 text-[#2D79C7]"
                            }`}
                        >
                            {isExcel ? <FileSpreadsheet className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                        </div>
                        <div>
                            <h3 className="text-base font-black text-slate-800">
                                {isExcel ? "New Excel Spreadsheet" : "New Word Document"}
                            </h3>
                            <p className="text-[11px] font-semibold text-slate-400">
                                Location: <span className="font-bold text-slate-700">{folderName || "Home / Root"}</span>
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-gray-100 cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="text-xs font-bold text-slate-700 block mb-1.5">
                            Document Name
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder={isExcel ? "e.g. Monthly Budget 2026" : "e.g. Project Proposal Draft"}
                                className="w-full bg-gray-50 border border-gray-200 pl-3.5 pr-14 py-2.5 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#2D79C7] focus:bg-white transition-all shadow-inner"
                                autoFocus
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-mono font-bold text-slate-400">
                                .{extension}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-2.5 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-gray-100 cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={creating}
                            className={`px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm transition-all cursor-pointer flex items-center gap-2 ${
                                isExcel
                                    ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30"
                                    : "bg-[#2D79C7] hover:bg-[#1F5EA8] shadow-[#2D79C7]/30"
                            } disabled:opacity-50`}
                        >
                            {creating ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>Creating...</span>
                                </>
                            ) : (
                                <>
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Create & Open</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateDocModal;
