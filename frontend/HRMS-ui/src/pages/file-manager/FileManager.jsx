import React, { useState, useEffect, useCallback, useRef } from "react";
import {
    Folder, FolderPlus, UploadCloud, File, FileText, Image as ImageIcon, Video, Music,
    Archive, MoreVertical, Download, Link2, Trash2, Eye, Search, Filter,
    Check, X, HardDrive, RefreshCw, Loader2, Sparkles, ExternalLink, AlertTriangle, FileSpreadsheet
} from "lucide-react";
import { toast } from "sonner";
import { ViewToggle, SkeletonLoader, EmptyState } from "../../components/SharedComponents";
import ConfirmDialog from "../../components/ConfirmDialog";
import {
    getFiles,
    getFolders,
    createFolder,
    getStorageStats,
    uploadFiles,
    deleteFile
} from "../../services/file.service";

/* ─────────────────────────────────────────────
   HELPERS & BADGES
 ───────────────────────────────────────────── */
const categoryBadge = (cat) => {
    switch (cat) {
        case "image":
            return "bg-emerald-50 text-emerald-700 border-emerald-200";
        case "document":
            return "bg-blue-50 text-blue-700 border-blue-200";
        case "video":
            return "bg-purple-50 text-purple-700 border-purple-200";
        case "audio":
            return "bg-amber-50 text-amber-700 border-amber-200";
        case "archive":
            return "bg-orange-50 text-orange-700 border-orange-200";
        default:
            return "bg-slate-50 text-slate-700 border-slate-200";
    }
};

const getFileIcon = (file) => {
    const ext = (file.extension || "").toLowerCase();
    const cat = file.category || "other";

    if (cat === "image") {
        return <ImageIcon className="w-5 h-5 text-emerald-600" />;
    }
    if (cat === "video") {
        return <Video className="w-5 h-5 text-purple-600" />;
    }
    if (cat === "audio") {
        return <Music className="w-5 h-5 text-amber-600" />;
    }
    if (["xls", "xlsx", "csv"].includes(ext)) {
        return <FileSpreadsheet className="w-5 h-5 text-teal-600" />;
    }
    if (cat === "document") {
        return <FileText className="w-5 h-5 text-blue-600" />;
    }
    if (cat === "archive") {
        return <Archive className="w-5 h-5 text-orange-600" />;
    }
    return <File className="w-5 h-5 text-slate-500" />;
};

const FileManager = () => {
    const [files, setFiles] = useState([]);
    const [folders, setFolders] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState("card");

    // Filters
    const [selectedFolder, setSelectedFolder] = useState("all");
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");

    // Modals
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
    const [newFolderName, setNewFolderName] = useState("");
    const [previewFile, setPreviewFile] = useState(null);
    const [deleteTargetFile, setDeleteTargetFile] = useState(null);
    const [deleting, setDeleting] = useState(false);

    // Upload state
    const [uploadQueue, setUploadQueue] = useState([]);
    const [uploadFolder, setUploadFolder] = useState("");
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const fileInputRef = useRef(null);

    // Fetch files & folders
    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [filesRes, foldersRes, statsRes] = await Promise.all([
                getFiles({
                    folder: selectedFolder !== "all" ? selectedFolder : undefined,
                    category: selectedCategory !== "all" ? selectedCategory : undefined,
                    search: searchQuery.trim() || undefined
                }),
                getFolders(),
                getStorageStats()
            ]);

            if (filesRes.data?.success) {
                setFiles(filesRes.data.files || []);
            }
            if (foldersRes.data?.success) {
                setFolders(foldersRes.data.folders || []);
            }
            if (statsRes.data?.success) {
                setStats(statsRes.data.stats || null);
            }
        } catch (err) {
            console.error("Failed to load files:", err);
            toast.error("Failed to load files. Please try again.");
        } finally {
            setLoading(false);
        }
    }, [selectedFolder, selectedCategory, searchQuery]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Handle Copy Link
    const handleCopyLink = (url) => {
        if (!url) return;
        navigator.clipboard.writeText(url);
        toast.success("File link copied to clipboard!");
    };

    // Handle Direct Download
    const handleDownload = (file) => {
        if (!file?.url) return;
        const link = document.createElement("a");
        link.href = file.url;
        link.download = file.originalName || file.name || "download";
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Handle File Delete
    const handleDeleteConfirm = async () => {
        if (!deleteTargetFile) return;
        setDeleting(true);
        try {
            const res = await deleteFile(deleteTargetFile._id);
            if (res.data?.success) {
                toast.success("File deleted successfully.");
                setFiles((prev) => prev.filter((f) => f._id !== deleteTargetFile._id));
                setDeleteTargetFile(null);
                // Refresh folders and stats in background
                getFolders().then((r) => r.data?.success && setFolders(r.data.folders));
                getStorageStats().then((r) => r.data?.success && setStats(r.data.stats));
            } else {
                toast.error(res.data?.message || "Failed to delete file.");
            }
        } catch (err) {
            console.error("Delete Error:", err);
            toast.error(err.response?.data?.message || "Failed to delete file.");
        } finally {
            setDeleting(false);
        }
    };

    // Handle Create Folder
    const handleCreateFolder = async (e) => {
        e.preventDefault();
        const trimmed = newFolderName.trim();
        if (!trimmed) {
            toast.error("Please enter a folder name.");
            return;
        }
        if (folders.some((f) => f.name.toLowerCase() === trimmed.toLowerCase())) {
            toast.error("A folder with this name already exists.");
            return;
        }
        try {
            const res = await createFolder(trimmed);
            if (res.data?.success) {
                toast.success(res.data.message || `Folder "${trimmed}" created!`);
                setFolders((prev) => [...prev, { name: trimmed, count: 0 }]);
                setUploadFolder(trimmed);
                setSelectedFolder(trimmed);
                setNewFolderName("");
                setIsFolderModalOpen(false);
                fetchData();
            } else {
                toast.error(res.data?.message || "Failed to create folder.");
            }
        } catch (err) {
            console.error("Create Folder Error:", err);
            toast.error(err.response?.data?.message || "Failed to create folder.");
        }
    };

    // Handle File Input Selection
    const handleFilesSelected = (e) => {
        const selected = Array.from(e.target.files || []);
        if (selected.length === 0) return;
        setUploadQueue(selected);
    };

    // Handle Drag & Drop in modal
    const handleDrop = (e) => {
        e.preventDefault();
        const dropped = Array.from(e.dataTransfer.files || []);
        if (dropped.length === 0) return;
        setUploadQueue(dropped);
    };

    // Submit Upload
    const handleUploadSubmit = async () => {
        if (uploadQueue.length === 0) {
            toast.error("Please select at least one file to upload.");
            return;
        }

        setUploading(true);
        setUploadProgress(0);

        try {
            const formData = new FormData();
            uploadQueue.forEach((file) => {
                formData.append("files", file);
            });
            formData.append("folder", uploadFolder);

            const res = await uploadFiles(formData, (progress) => {
                setUploadProgress(progress);
            });

            if (res.data?.success) {
                toast.success(res.data.message || "Files uploaded successfully!");
                setUploadQueue([]);
                setIsUploadModalOpen(false);
                fetchData();
            } else {
                toast.error(res.data?.message || "Upload failed.");
            }
        } catch (err) {
            console.error("Upload error:", err);
            toast.error(err.response?.data?.message || "Failed to upload files.");
        } finally {
            setUploading(false);
            setUploadProgress(0);
        }
    };

    return (
        <div className="space-y-6 pb-12 select-none animate-fadeIn">
            {/* ── HEADER ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-[20px] border border-gray-150 shadow-xs">
                <div>
                    <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#2D79C7] flex items-center justify-center font-bold shadow-xs">
                            <Folder className="w-5 h-5" />
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
                                File Manager
                            </h1>
                            <p className="text-xs font-semibold text-slate-500 mt-0.5">
                                Secure company media repository, contracts, documents & cloud assets (Global Admin only)
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                    <button
                        onClick={() => setIsFolderModalOpen(true)}
                        className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-slate-700 text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
                    >
                        <FolderPlus className="w-4 h-4 text-slate-500" />
                        <span>New Folder</span>
                    </button>

                    <button
                        onClick={() => setIsUploadModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-sm shadow-[#2D79C7]/30 hover:opacity-95 active:scale-95 cursor-pointer"
                        style={{ background: "linear-gradient(135deg, #2D79C7 0%, #1F5EA8 100%)" }}
                    >
                        <UploadCloud className="w-4 h-4" />
                        <span>Upload Files</span>
                    </button>
                </div>
            </div>

            {/* ── STORAGE STATS CARDS ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4.5 rounded-[16px] border border-gray-150 shadow-2xs">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Files</span>
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#2D79C7] flex items-center justify-center">
                            <File className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-2xl font-black text-slate-800 mt-2">
                        {stats?.totalFiles ?? files.length}
                    </div>
                    <p className="text-[11px] font-semibold text-slate-400 mt-0.5">Stored in Cloud</p>
                </div>

                <div className="bg-white p-4.5 rounded-[16px] border border-gray-150 shadow-2xs">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Space</span>
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <HardDrive className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-2xl font-black text-slate-800 mt-2">
                        {stats?.totalFormatted || "0 B"}
                    </div>
                    <p className="text-[11px] font-semibold text-slate-400 mt-0.5">Used storage</p>
                </div>

                <div className="bg-white p-4.5 rounded-[16px] border border-gray-150 shadow-2xs">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Images & Media</span>
                        <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                            <ImageIcon className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-2xl font-black text-slate-800 mt-2">
                        {(stats?.breakdown?.image?.count || 0) + (stats?.breakdown?.video?.count || 0)}
                    </div>
                    <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                        {stats?.breakdown?.image?.formatted || "0 B"}
                    </p>
                </div>

                <div className="bg-white p-4.5 rounded-[16px] border border-gray-150 shadow-2xs">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Documents</span>
                        <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                            <FileText className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-2xl font-black text-slate-800 mt-2">
                        {stats?.breakdown?.document?.count || 0}
                    </div>
                    <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                        {stats?.breakdown?.document?.formatted || "0 B"}
                    </p>
                </div>
            </div>

            {/* ── FOLDERS PILLS / TABS (Only shown when custom folders exist) ── */}
            {folders.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                    <button
                        onClick={() => setSelectedFolder("all")}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                            selectedFolder === "all"
                                ? "bg-[#2D79C7] text-white shadow-sm shadow-[#2D79C7]/30"
                                : "bg-white border border-gray-200 text-slate-600 hover:bg-gray-50 shadow-2xs"
                        }`}
                    >
                        <Folder className="w-3.5 h-3.5" />
                        <span>All Files</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${selectedFolder === "all" ? "bg-white/20 text-white" : "bg-gray-100 text-slate-500"}`}>
                            {files.length}
                        </span>
                    </button>

                    {folders.map((folder) => {
                        const isSelected = selectedFolder === folder.name;
                        return (
                            <button
                                key={folder.name}
                                onClick={() => setSelectedFolder(folder.name)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                                    isSelected
                                        ? "bg-[#2D79C7] text-white shadow-sm shadow-[#2D79C7]/30"
                                        : "bg-white border border-gray-200 text-slate-600 hover:bg-gray-50 shadow-2xs"
                                }`}
                            >
                                <Folder className={`w-3.5 h-3.5 ${isSelected ? "text-white" : "text-amber-500"}`} />
                                <span>{folder.name}</span>
                                {folder.count !== undefined && (
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${isSelected ? "bg-white/20 text-white" : "bg-gray-100 text-slate-500"}`}>
                                        {folder.count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}

            {/* ── CONTROLS & FILTER BAR ── */}
            <div className="bg-white p-4 rounded-[16px] border border-gray-150 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto flex-1">
                    {/* Search Input */}
                    <div className="relative w-full sm:w-72">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by file name..."
                            className="w-full bg-gray-50 border border-gray-200 pl-10 pr-4 py-2 text-xs font-semibold text-slate-800 rounded-xl focus:outline-none focus:border-[#2D79C7] focus:bg-white transition-all shadow-inner"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Category Filter */}
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="bg-gray-50 border border-gray-200 px-3 py-2 text-xs font-bold text-slate-700 rounded-xl focus:outline-none focus:border-[#2D79C7] cursor-pointer shadow-inner w-full sm:w-auto"
                        >
                            <option value="all">All Types</option>
                            <option value="image">Images</option>
                            <option value="document">Documents</option>
                            <option value="video">Videos</option>
                            <option value="audio">Audios</option>
                            <option value="archive">Archives (ZIP/RAR)</option>
                            <option value="other">Other Files</option>
                        </select>

                        <button
                            onClick={fetchData}
                            title="Refresh Files"
                            className="p-2 border border-gray-200 bg-gray-50 hover:bg-gray-100 text-slate-600 rounded-xl transition-all cursor-pointer shrink-0"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#2D79C7]" : ""}`} />
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                    <ViewToggle view={view} onViewChange={setView} />
                </div>
            </div>

            {/* ── MAIN CONTENT (FILES) ── */}
            {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                        <div key={i} className="bg-white border border-gray-150 rounded-[16px] p-4 h-48 animate-pulse" />
                    ))}
                </div>
            ) : files.length === 0 ? (
                <div className="bg-white rounded-[20px] border border-gray-150 p-12 text-center shadow-xs">
                    <div className="w-16 h-16 rounded-2xl bg-blue-50 text-[#2D79C7] flex items-center justify-center mx-auto mb-4">
                        <UploadCloud className="w-8 h-8" />
                    </div>
                    <h3 className="text-base font-black text-slate-800">No files found</h3>
                    <p className="text-xs font-semibold text-slate-400 mt-1 max-w-sm mx-auto">
                        {searchQuery || selectedCategory !== "all" || selectedFolder !== "all"
                            ? "No files matched your filter criteria. Try resetting filters."
                            : "Your file repository is empty. Upload your first file or document above."}
                    </p>
                    <button
                        onClick={() => setIsUploadModalOpen(true)}
                        className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#2D79C7] hover:bg-[#1F5EA8] shadow-sm transition-all cursor-pointer"
                    >
                        <UploadCloud className="w-4 h-4" />
                        <span>Upload File</span>
                    </button>
                </div>
            ) : view === "card" ? (
                /* ── CARD GRID VIEW ── */
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {files.map((file) => {
                        const isImage = file.category === "image";
                        return (
                            <div
                                key={file._id}
                                className="group bg-white rounded-[16px] border border-gray-150 hover:border-gray-300 hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col justify-between"
                            >
                                {/* Thumbnail / Preview Box */}
                                <div
                                    onClick={() => setPreviewFile(file)}
                                    className="h-32 bg-slate-50 relative flex items-center justify-center cursor-pointer overflow-hidden border-b border-gray-100"
                                >
                                    {isImage && file.url ? (
                                        <img
                                            src={file.url}
                                            alt={file.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                            loading="lazy"
                                        />
                                    ) : (
                                        <div className="w-12 h-12 rounded-xl bg-white border border-gray-200/80 shadow-2xs flex items-center justify-center group-hover:scale-110 transition-transform">
                                            {getFileIcon(file)}
                                        </div>
                                    )}

                                    {/* Extension Badge */}
                                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-white/90 backdrop-blur-xs text-[10px] font-extrabold text-slate-700 shadow-2xs uppercase tracking-wider font-mono">
                                        {file.extension || file.category}
                                    </span>

                                    {/* Quick Preview Hover Pill */}
                                    <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <span className="px-3 py-1 bg-white rounded-lg text-xs font-bold text-slate-800 shadow-md flex items-center gap-1.5">
                                            <Eye className="w-3.5 h-3.5 text-[#2D79C7]" /> Preview
                                        </span>
                                    </div>
                                </div>

                                {/* Body Information */}
                                <div className="p-3.5 flex flex-col gap-1.5 flex-1 justify-between">
                                    <div>
                                        <h4
                                            title={file.name}
                                            className="text-xs font-bold text-slate-800 truncate leading-snug group-hover:text-[#2D79C7] transition-colors"
                                        >
                                            {file.name}
                                        </h4>
                                        <div className="flex items-center justify-between text-[10.5px] font-semibold text-slate-400 mt-1">
                                            <span>{file.formattedSize || "0 B"}</span>
                                            <span className="truncate max-w-[90px]">{file.folder}</span>
                                        </div>
                                    </div>

                                    {/* Action Bar */}
                                    <div className="flex items-center justify-between pt-2 border-t border-gray-100 mt-1">
                                        <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider ${categoryBadge(file.category)}`}>
                                            {file.category}
                                        </span>

                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => handleCopyLink(file.url)}
                                                title="Copy Shareable Link"
                                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
                                            >
                                                <Link2 className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => handleDownload(file)}
                                                title="Download File"
                                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
                                            >
                                                <Download className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => setDeleteTargetFile(file)}
                                                title="Delete File"
                                                className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* ── LIST / TABLE VIEW ── */
                <div className="bg-white rounded-[20px] border border-gray-150 overflow-hidden shadow-2xs">
                    <div className="overflow-x-auto">
                        <table className="w-full whitespace-nowrap text-left">
                            <thead className="bg-gray-50/75 border-b border-gray-150 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                <tr>
                                    <th className="py-3 px-4">Name</th>
                                    <th className="py-3 px-4">Folder</th>
                                    <th className="py-3 px-4">Category</th>
                                    <th className="py-3 px-4">Size</th>
                                    <th className="py-3 px-4">Uploaded Date</th>
                                    <th className="py-3 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-xs font-semibold text-slate-700">
                                {files.map((file) => (
                                    <tr key={file._id} className="hover:bg-slate-50/70 transition-colors">
                                        <td className="py-3 px-4 flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center shrink-0">
                                                {getFileIcon(file)}
                                            </div>
                                            <div className="min-w-0">
                                                <p
                                                    onClick={() => setPreviewFile(file)}
                                                    className="font-bold text-slate-800 hover:text-[#2D79C7] cursor-pointer truncate max-w-xs"
                                                >
                                                    {file.name}
                                                </p>
                                                <p className="text-[10px] text-slate-400 font-mono truncate max-w-xs">
                                                    {file.originalName}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-slate-600 font-bold">{file.folder}</td>
                                        <td className="py-3 px-4">
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider ${categoryBadge(file.category)}`}>
                                                {file.category}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-slate-500 font-mono">{file.formattedSize || "0 B"}</td>
                                        <td className="py-3 px-4 text-slate-400">
                                            {new Date(file.createdAt).toLocaleDateString("en-US", {
                                                day: "numeric",
                                                month: "short",
                                                year: "numeric"
                                            })}
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button
                                                    onClick={() => setPreviewFile(file)}
                                                    title="Preview"
                                                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleCopyLink(file.url)}
                                                    title="Copy Link"
                                                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                                                >
                                                    <Link2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDownload(file)}
                                                    title="Download"
                                                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                                                >
                                                    <Download className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteTargetFile(file)}
                                                    title="Delete"
                                                    className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── UPLOAD MODAL ── */}
            {isUploadModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
                    <div className="bg-white border border-gray-150 rounded-[22px] shadow-2xl w-full max-w-lg overflow-hidden text-left transform transition-all">
                        {/* Header */}
                        <div className="px-6 py-4.5 border-b border-gray-150 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#2D79C7] flex items-center justify-center">
                                    <UploadCloud className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-slate-800">Upload Files</h3>
                                    <p className="text-[11px] font-semibold text-slate-400">
                                        Upload any media, document, archive or data file
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setIsUploadModalOpen(false);
                                    setUploadQueue([]);
                                }}
                                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-gray-100 cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-4">
                            {/* Target Folder Selector */}
                            <div>
                                <div className="flex items-center justify-between mb-1.5">
                                    <label className="text-xs font-bold text-slate-700">
                                        Target Folder {folders.length === 0 && <span className="text-slate-400 font-normal">(Optional)</span>}
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsUploadModalOpen(false);
                                            setIsFolderModalOpen(true);
                                        }}
                                        className="text-[11px] font-bold text-[#2D79C7] hover:underline cursor-pointer flex items-center gap-1"
                                    >
                                        <FolderPlus className="w-3.5 h-3.5" />
                                        <span>+ New Folder</span>
                                    </button>
                                </div>
                                {folders.length > 0 ? (
                                    <select
                                        value={uploadFolder}
                                        onChange={(e) => setUploadFolder(e.target.value)}
                                        className="w-full bg-gray-50 border border-gray-200 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#2D79C7] focus:bg-white transition-all shadow-inner cursor-pointer"
                                    >
                                        <option value="">Root / Unorganized</option>
                                        {folders.map((f) => (
                                            <option key={f.name} value={f.name}>
                                                {f.name}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        type="text"
                                        value={uploadFolder}
                                        onChange={(e) => setUploadFolder(e.target.value)}
                                        placeholder="Folder name (optional, or leave blank for root)"
                                        className="w-full bg-gray-50 border border-gray-200 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#2D79C7] focus:bg-white transition-all shadow-inner"
                                    />
                                )}
                            </div>

                            {/* Drag & Drop Zone */}
                            <div
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-gray-200 hover:border-[#2D79C7] bg-slate-50/60 hover:bg-blue-50/20 rounded-[16px] p-6 text-center cursor-pointer transition-all duration-200"
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    multiple
                                    onChange={handleFilesSelected}
                                    className="hidden"
                                />
                                <div className="w-12 h-12 rounded-2xl bg-white border border-gray-200 shadow-2xs flex items-center justify-center mx-auto mb-3 text-[#2D79C7]">
                                    <UploadCloud className="w-6 h-6" />
                                </div>
                                <p className="text-xs font-black text-slate-800">
                                    Click to browse or drag and drop files here
                                </p>
                                <p className="text-[11px] font-semibold text-slate-400 mt-1">
                                    Images, PDFs, Word, Excel, Videos, Audio, ZIP (Max 50MB per file)
                                </p>
                            </div>

                            {/* Selected Files List */}
                            {uploadQueue.length > 0 && (
                                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                        Selected Files ({uploadQueue.length}):
                                    </p>
                                    {uploadQueue.map((file, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-150 text-xs font-semibold text-slate-700"
                                        >
                                            <span className="truncate max-w-[280px]">{file.name}</span>
                                            <span className="text-[10px] text-slate-400 font-mono">
                                                {(file.size / (1024 * 1024)).toFixed(2)} MB
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Progress bar */}
                            {uploading && (
                                <div className="space-y-1.5">
                                    <div className="flex justify-between text-xs font-bold text-[#2D79C7]">
                                        <span>Uploading to Cloud...</span>
                                        <span>{uploadProgress}%</span>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                        <div
                                            className="bg-[#2D79C7] h-full rounded-full transition-all duration-300"
                                            style={{ width: `${uploadProgress}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-gray-150 bg-gray-50/50 flex items-center justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsUploadModalOpen(false);
                                    setUploadQueue([]);
                                }}
                                disabled={uploading}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-gray-100 transition-all cursor-pointer disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleUploadSubmit}
                                disabled={uploading || uploadQueue.length === 0}
                                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#2D79C7] hover:bg-[#1F5EA8] shadow-sm shadow-[#2D79C7]/30 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {uploading ? (
                                    <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        <span>Uploading...</span>
                                    </>
                                ) : (
                                    <>
                                        <UploadCloud className="w-3.5 h-3.5" />
                                        <span>Upload {uploadQueue.length > 0 ? `(${uploadQueue.length})` : ""}</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── CREATE FOLDER MODAL ── */}
            {isFolderModalOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn">
                    <div className="bg-white border border-gray-150 rounded-[22px] shadow-2xl w-full max-w-sm overflow-hidden text-left transform transition-all">
                        <div className="px-6 py-4.5 border-b border-gray-150 flex items-center justify-between">
                            <h3 className="text-base font-black text-slate-800">Create New Folder</h3>
                            <button
                                onClick={() => setIsFolderModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-gray-100 cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateFolder} className="p-6 space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                                    Folder Name
                                </label>
                                <input
                                    type="text"
                                    value={newFolderName}
                                    onChange={(e) => setNewFolderName(e.target.value)}
                                    placeholder="e.g. Legal Contracts, Marketing 2026..."
                                    className="w-full bg-gray-50 border border-gray-200 px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-[#2D79C7] focus:bg-white transition-all shadow-inner"
                                    autoFocus
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2.5 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsFolderModalOpen(false)}
                                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-gray-100 cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#2D79C7] hover:bg-[#1F5EA8] shadow-sm transition-all cursor-pointer"
                                >
                                    Create Folder
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── PREVIEW MODAL ── */}
            {previewFile && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
                    <div className="bg-white rounded-[22px] border border-gray-150 shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh]">
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-gray-150 flex items-center justify-between bg-white shrink-0">
                            <div className="min-w-0 pr-4">
                                <h3 className="text-sm font-black text-slate-800 truncate">{previewFile.name}</h3>
                                <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                                    {previewFile.formattedSize} • {previewFile.folder} • Uploaded by {previewFile.uploadedBy?.fullName || "Admin"}
                                </p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    onClick={() => handleCopyLink(previewFile.url)}
                                    className="p-2 border border-gray-200 hover:bg-gray-100 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                    title="Copy Link"
                                >
                                    <Link2 className="w-3.5 h-3.5" />
                                    <span>Copy</span>
                                </button>
                                <button
                                    onClick={() => handleDownload(previewFile)}
                                    className="p-2 bg-[#2D79C7] hover:bg-[#1F5EA8] text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm shadow-[#2D79C7]/20"
                                    title="Download"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>Download</span>
                                </button>
                                <button
                                    onClick={() => setPreviewFile(null)}
                                    className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-gray-100 cursor-pointer ml-1"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Viewer Body */}
                        <div className="p-6 overflow-auto flex items-center justify-center bg-slate-50 min-h-[300px]">
                            {previewFile.category === "image" ? (
                                <img
                                    src={previewFile.url}
                                    alt={previewFile.name}
                                    className="max-h-[65vh] max-w-full rounded-lg object-contain shadow-md"
                                />
                            ) : previewFile.category === "video" ? (
                                <video
                                    src={previewFile.url}
                                    controls
                                    className="max-h-[65vh] max-w-full rounded-lg shadow-md"
                                />
                            ) : previewFile.category === "audio" ? (
                                <audio src={previewFile.url} controls className="w-full max-w-md" />
                            ) : (previewFile.extension === "pdf" || previewFile.mimeType?.includes("pdf")) ? (
                                <iframe
                                    src={previewFile.url}
                                    title={previewFile.name}
                                    className="w-full h-[65vh] rounded-lg border border-gray-200 bg-white"
                                />
                            ) : (
                                <div className="text-center p-8 bg-white rounded-2xl border border-gray-200 max-w-sm">
                                    <div className="w-16 h-16 rounded-2xl bg-blue-50 text-[#2D79C7] flex items-center justify-center mx-auto mb-3">
                                        {getFileIcon(previewFile)}
                                    </div>
                                    <h4 className="text-sm font-black text-slate-800">{previewFile.name}</h4>
                                    <p className="text-xs text-slate-400 mt-1 font-mono">{previewFile.originalName}</p>
                                    <p className="text-[11px] text-slate-500 mt-3 font-semibold">
                                        Direct in-browser preview is not available for this file type. Click below to download or view.
                                    </p>
                                    <button
                                        onClick={() => handleDownload(previewFile)}
                                        className="mt-4 px-4 py-2 bg-[#2D79C7] text-white text-xs font-bold rounded-xl shadow-sm hover:bg-[#1F5EA8] transition-all cursor-pointer inline-flex items-center gap-1.5"
                                    >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                        <span>Download / Open File</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── DELETE CONFIRMATION DIALOG ── */}
            <ConfirmDialog
                isOpen={!!deleteTargetFile}
                onClose={() => setDeleteTargetFile(null)}
                onConfirm={handleDeleteConfirm}
                title="Delete File Permanently?"
                message={`Are you sure you want to delete "${deleteTargetFile?.name}"? This action cannot be undone and the file will be removed from storage.`}
                confirmText={deleting ? "Deleting..." : "Delete File"}
                cancelText="Cancel"
                isDestructive={true}
            />
        </div>
    );
};

export default FileManager;

