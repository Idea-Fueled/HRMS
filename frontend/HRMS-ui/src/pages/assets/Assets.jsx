import React, { useState, useEffect, useCallback } from "react";
import {
    Laptop, Monitor, Keyboard as KeyboardIcon, Mouse as MouseIcon, Smartphone, Tablet as TabletIcon, Cpu, Zap, Box, UserCheck, CheckCircle2, AlertTriangle, Plus, Search,
    Edit3, Trash2, UserPlus, UserMinus, RefreshCw, X, ChevronDown,
    Building2, Shield, Calendar, Info, Layers, Tag, HardDrive, Check, Loader2, ArrowRight
} from "lucide-react";
import { toast } from "sonner";
import ConfirmDialog from "../../components/ConfirmDialog";
import {
    ViewToggle, SkeletonLoader, EmptyState, SearchBar, Pagination, SortHeader, Avatar
} from "../../components/SharedComponents";
import {
    getAllAssets,
    getAssignedAssets,
    createAsset,
    updateAsset,
    assignAsset,
    unassignAsset,
    updateAssetStatus,
    deleteAsset
} from "../../services/asset.service";
import { getManagers } from "../../services/employee.service";

/* ─────────────────────────────────────────────
   CONSTANTS & HELPERS
───────────────────────────────────────────── */
const CATEGORIES = [
    "Laptop", "Desktop", "Mobile", "Tablet", "Screen",
    "Mouse", "Keyboard", "UPS", "CPU", "Other"
];

const CONDITIONS = ["New", "Excellent", "Good", "Fair", "Poor", "Damaged"];

const STATUSES = ["Available", "Assigned", "In Maintenance", "Not Assigned", "Lost"];

const categoryChip = (cat) => ({
    Screen: "bg-sky-100 text-sky-800 border-sky-200 font-extrabold",
    Keyboard: "bg-purple-100 text-purple-800 border-purple-200 font-extrabold",
    Mouse: "bg-indigo-100 text-indigo-800 border-indigo-200 font-extrabold",
    Laptop: "bg-blue-100 text-blue-800 border-blue-200 font-extrabold",
    Desktop: "bg-violet-100 text-violet-800 border-violet-200 font-extrabold",
    Mobile: "bg-teal-100 text-teal-800 border-teal-200 font-extrabold",
    Tablet: "bg-teal-100 text-teal-800 border-teal-200 font-extrabold",
    UPS: "bg-amber-100 text-amber-800 border-amber-200 font-extrabold",
    CPU: "bg-orange-100 text-orange-800 border-orange-200 font-extrabold",
    Other: "bg-slate-100 text-slate-800 border-slate-200 font-extrabold",
}[cat] || "bg-slate-100 text-slate-800 border-slate-200 font-extrabold");

const conditionBadge = (c) => ({
    New: "bg-emerald-50 text-emerald-700 border-emerald-200/80 font-extrabold",
    Excellent: "bg-blue-50 text-[#2D79C7] border-blue-200/80 font-extrabold",
    Good: "bg-teal-50 text-teal-700 border-teal-200/80 font-extrabold",
    Fair: "bg-amber-50 text-amber-700 border-amber-200/80 font-extrabold",
    Poor: "bg-orange-50 text-orange-700 border-orange-200/80 font-extrabold",
    Damaged: "bg-rose-50 text-rose-700 border-rose-200/80 font-extrabold",
}[c] || "bg-slate-100 text-slate-700 border-slate-200/80 font-extrabold");

const statusBadge = (s) => ({
    Available: { cls: "bg-emerald-50 text-emerald-700 border-emerald-200/80 font-extrabold", dot: "bg-emerald-500 animate-pulse" },
    Assigned: { cls: "bg-blue-50 text-[#2D79C7] border-blue-200/80 font-extrabold", dot: "bg-blue-500" },
    "In Maintenance": { cls: "bg-amber-50 text-amber-700 border-amber-200/80 font-extrabold", dot: "bg-amber-500" },
    "Not Assigned": { cls: "bg-slate-100 text-slate-700 border-slate-200 font-extrabold", dot: "bg-slate-400" },
    Retired: { cls: "bg-gray-100 text-gray-600 border-gray-200 font-extrabold", dot: "bg-gray-400" },
    Lost: { cls: "bg-rose-50 text-rose-700 border-rose-200/80 font-extrabold", dot: "bg-rose-500" },
}[s] || { cls: "bg-slate-100 text-slate-700 border-slate-200 font-extrabold", dot: "bg-slate-400" });

const formatDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const getCategoryIcon = (category, className = "w-5 h-5") => {
    switch (category) {
        case "Screen":
            return <Monitor className={className} />;
        case "Keyboard":
            return <KeyboardIcon className={className} />;
        case "Mouse":
            return <MouseIcon className={className} />;
        case "Mobile":
            return <Smartphone className={className} />;
        case "Tablet":
            return <TabletIcon className={className} />;
        case "CPU":
            return <Cpu className={className} />;
        case "UPS":
            return <Zap className={className} />;
        case "Desktop":
            return <Monitor className={className} />;
        case "Laptop":
        default:
            return <Laptop className={className} />;
    }
};

/* ─────────────────────────────────────────────
   FORM COMPONENTS
───────────────────────────────────────────── */
const FormField = ({ label, required, children, error }) => (
    <div className="flex flex-col gap-1">
        <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">
            {label}{required && <span className="text-rose-500 ml-0.5">*</span>}
        </label>
        {children}
        {error && <p className="text-xs text-rose-500 font-medium mt-0.5">{error}</p>}
    </div>
);

const inputCls = "w-full px-3 py-2 bg-white border border-gray-200 rounded-[10px] text-xs text-[#1E1E1E] focus:outline-none focus:border-[#2D79C7] focus:ring-1 focus:ring-[#2D79C7] transition-all placeholder-gray-400 disabled:bg-gray-50 disabled:text-gray-400";
const selectCls = `${inputCls} cursor-pointer appearance-none`;

/* ─────────────────────────────────────────────
   MAIN ASSETS COMPONENT
───────────────────────────────────────────── */
const Assets = () => {
    const [activeTab, setActiveTab] = useState("all"); // "all" | "assigned"
    const [viewMode, setViewMode] = useState("list"); // "list" | "card"
    const [loading, setLoading] = useState(true);
    
    // Data state
    const [assets, setAssets] = useState([]);
    const [assignedGroups, setAssignedGroups] = useState([]);
    const [summary, setSummary] = useState({ total: 0, assigned: 0, available: 0, inMaintenance: 0, retired: 0, damaged: 0 });
    const [employeesList, setEmployeesList] = useState([]);

    // Filters for "All Assets"
    const [filters, setFilters] = useState({
        search: "",
        category: "",
        status: "",
        condition: ""
    });

    // Filters for "Assigned Assets"
    const [assignedSearch, setAssignedSearch] = useState("");

    // Sorting
    const [sortField, setSortField] = useState("createdAt");
    const [sortDir, setSortDir] = useState("desc");

    // Modal / Drawer states
    const [showAssetDrawer, setShowAssetDrawer] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState(null);
    const [drawerMode, setDrawerMode] = useState("create"); // "create" | "edit" | "view"

    const [showAssignModal, setShowAssignModal] = useState(false);
    const [assetToAssign, setAssetToAssign] = useState(null);
    const [preselectedEmployeeId, setPreselectedEmployeeId] = useState("");

    const [showStatusModal, setShowStatusModal] = useState(false);
    const [assetForStatus, setAssetForStatus] = useState(null);

    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, type: "", asset: null });

    // Fetch All Assets
    const fetchAssetsData = useCallback(async () => {
        setLoading(true);
        try {
            const [assetsRes, assignedRes, employeesRes] = await Promise.all([
                getAllAssets(filters),
                getAssignedAssets(),
                getManagers()
            ]);

            if (assetsRes.data?.success) {
                setAssets(assetsRes.data.assets || []);
                setSummary(assetsRes.data.summary || {});
            }

            if (assignedRes.data?.success) {
                setAssignedGroups(assignedRes.data.assignedGroups || []);
            }

            if (employeesRes.data?.success) {
                setEmployeesList(employeesRes.data.managers || []);
            }
        } catch (error) {
            console.error("Fetch Assets Error:", error);
            toast.error("Failed to load assets data.");
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchAssetsData();
    }, [fetchAssetsData]);

    // Handle sort
    const handleSort = (field) => {
        if (sortField === field) {
            setSortDir(sortDir === "asc" ? "desc" : "asc");
        } else {
            setSortField(field);
            setSortDir("asc");
        }
    };

    // Sort assets
    const sortedAssets = [...assets].sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];
        if (typeof valA === "string") valA = valA.toLowerCase();
        if (typeof valB === "string") valB = valB.toLowerCase();
        if (valA < valB) return sortDir === "asc" ? -1 : 1;
        if (valA > valB) return sortDir === "asc" ? 1 : -1;
        return 0;
    });

    // Unassign asset handler
    const handleUnassignAsset = async (asset) => {
        try {
            const res = await unassignAsset(asset._id);
            if (res.data?.success) {
                toast.success(res.data.message || "Asset unassigned successfully.");
                fetchAssetsData();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to unassign asset.");
        }
    };

    // Delete asset handler
    const handleDeleteAsset = async (asset) => {
        try {
            const res = await deleteAsset(asset._id);
            if (res.data?.success) {
                toast.success(res.data.message || "Asset deleted successfully.");
                fetchAssetsData();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to delete asset.");
        }
    };

    // Filter assigned groups for "Assigned Assets" tab
    const filteredAssignedGroups = assignedGroups.filter(group => {
        if (!assignedSearch) return true;
        const q = assignedSearch.toLowerCase();
        const empName = (group.employee?.fullName || `${group.employee?.firstName || ""} ${group.employee?.lastName || ""}`).toLowerCase();
        const empId = (group.employee?.employeeId || "").toLowerCase();
        const dept = (group.employee?.department || "").toLowerCase();
        const hasMatchingAsset = group.assets.some(a => 
            a.name.toLowerCase().includes(q) || 
            a.assetId.toLowerCase().includes(q) || 
            a.category.toLowerCase().includes(q)
        );
        return empName.includes(q) || empId.includes(q) || dept.includes(q) || hasMatchingAsset;
    });

    return (
        <div className="space-y-6 text-left select-none animate-fadeIn">
            {/* Header Title & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                <div>
                    <h2 className="text-[#1E1E1E] text-[20px] font-extrabold flex items-center gap-2">
                        <Box className="w-6 h-6 text-[#2D79C7]" />
                        Asset Management
                    </h2>
                    <p className="text-gray-400 text-[12px] font-medium mt-1">
                        Track company inventory, manage allocations, and oversee asset lifecycles.
                    </p>
                </div>
                <button
                    onClick={() => {
                        setSelectedAsset(null);
                        setDrawerMode("create");
                        setShowAssetDrawer(true);
                    }}
                    className="bg-gradient-to-r from-[#2D79C7] to-[#1F5EA8] text-white text-xs font-bold px-4 py-2.5 rounded-[12px] hover:opacity-95 transition-all shadow-md flex items-center gap-2 cursor-pointer shrink-0 self-start sm:self-auto"
                >
                    <Plus className="w-4 h-4" />
                    <span>Add New Asset</span>
                </button>
            </div>

            {/* Summary Statistics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                <div className="bg-white border border-slate-200/80 rounded-[18px] p-4 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 flex flex-col justify-between gap-3 group">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Total Assets</span>
                        <div className="w-8 h-8 rounded-[10px] bg-blue-50 text-[#2D79C7] border border-blue-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Box className="w-4 h-4" />
                        </div>
                    </div>
                    <p className="text-[26px] font-black text-slate-800 leading-none tracking-tight">{summary.total || 0}</p>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-[18px] p-4 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 flex flex-col justify-between gap-3 group">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Available</span>
                        <div className="w-8 h-8 rounded-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <CheckCircle2 className="w-4 h-4" />
                        </div>
                    </div>
                    <p className="text-[26px] font-black text-slate-800 leading-none tracking-tight">{summary.available || 0}</p>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-[18px] p-4 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 flex flex-col justify-between gap-3 group">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Assigned</span>
                        <div className="w-8 h-8 rounded-[10px] bg-[#F0F7FF] text-[#1F5EA8] border border-[#D0E5FC] flex items-center justify-center group-hover:scale-110 transition-transform">
                            <UserCheck className="w-4 h-4" />
                        </div>
                    </div>
                    <p className="text-[26px] font-black text-slate-800 leading-none tracking-tight">{summary.assigned || 0}</p>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-[18px] p-4 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 flex flex-col justify-between gap-3 group">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">In Maintenance</span>
                        <div className="w-8 h-8 rounded-[10px] bg-amber-50 text-amber-700 border border-amber-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <AlertTriangle className="w-4 h-4" />
                        </div>
                    </div>
                    <p className="text-[26px] font-black text-slate-800 leading-none tracking-tight">{summary.inMaintenance || 0}</p>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-[18px] p-4 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 flex flex-col justify-between gap-3 group">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Damaged / Poor</span>
                        <div className="w-8 h-8 rounded-[10px] bg-rose-50 text-rose-700 border border-rose-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <AlertTriangle className="w-4 h-4" />
                        </div>
                    </div>
                    <p className="text-[26px] font-black text-slate-800 leading-none tracking-tight">{summary.damaged || 0}</p>
                </div>
            </div>

            {/* Sub-Tabs Navigation */}
            <div className="flex items-center justify-between border-b border-gray-200">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setActiveTab("all")}
                        className={`px-5 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                            activeTab === "all"
                                ? "border-[#2D79C7] text-[#2D79C7]"
                                : "border-transparent text-gray-400 hover:text-gray-600"
                        }`}
                    >
                        <Layers className="w-4 h-4" />
                        <span>All Assets</span>
                        <span className={`px-2 py-0.5 text-[10px] rounded-full font-black ${activeTab === "all" ? "bg-blue-50 text-[#2D79C7]" : "bg-gray-100 text-gray-500"}`}>
                            {summary.total || 0}
                        </span>
                    </button>

                    <button
                        onClick={() => setActiveTab("assigned")}
                        className={`px-5 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                            activeTab === "assigned"
                                ? "border-[#2D79C7] text-[#2D79C7]"
                                : "border-transparent text-gray-400 hover:text-gray-600"
                        }`}
                    >
                        <UserCheck className="w-4 h-4" />
                        <span>Assigned Assets</span>
                        <span className={`px-2 py-0.5 text-[10px] rounded-full font-black ${activeTab === "assigned" ? "bg-blue-50 text-[#2D79C7]" : "bg-gray-100 text-gray-500"}`}>
                            {summary.assigned || 0}
                        </span>
                    </button>
                </div>

                {activeTab === "all" && (
                    <ViewToggle view={viewMode} onViewChange={setViewMode} />
                )}
            </div>

            {/* TAB 1: ALL ASSETS */}
            {activeTab === "all" && (
                <div className="space-y-4">
                    {/* Filters Bar */}
                    <div className="flex flex-wrap items-center gap-2 bg-white p-3 border border-gray-200/70 rounded-[16px] shadow-sm">
                        <SearchBar
                            value={filters.search}
                            onChange={(v) => setFilters({ ...filters, search: v })}
                            placeholder="Search asset ID, category, brand..."
                        />
                        <div className="relative">
                            <select
                                value={filters.category}
                                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                                className="pl-3 pr-8 h-[38px] bg-white border border-gray-200 rounded-[12px] text-xs text-[#1E1E1E] focus:outline-none focus:border-[#2D79C7] appearance-none cursor-pointer"
                            >
                                <option value="">All Categories</option>
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <ChevronDown className="w-3 h-3 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>

                        <div className="relative">
                            <select
                                value={filters.status}
                                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                className="pl-3 pr-8 h-[38px] bg-white border border-gray-200 rounded-[12px] text-xs text-[#1E1E1E] focus:outline-none focus:border-[#2D79C7] appearance-none cursor-pointer"
                            >
                                <option value="">All Statuses</option>
                                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <ChevronDown className="w-3 h-3 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>

                        <div className="relative">
                            <select
                                value={filters.condition}
                                onChange={(e) => setFilters({ ...filters, condition: e.target.value })}
                                className="pl-3 pr-8 h-[38px] bg-white border border-gray-200 rounded-[12px] text-xs text-[#1E1E1E] focus:outline-none focus:border-[#2D79C7] appearance-none cursor-pointer"
                            >
                                <option value="">All Conditions</option>
                                {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <ChevronDown className="w-3 h-3 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>

                        {(filters.search || filters.category || filters.status || filters.condition) && (
                            <button
                                onClick={() => setFilters({ search: "", category: "", status: "", condition: "" })}
                                className="text-xs font-bold text-rose-600 hover:text-rose-700 px-3 py-1.5 rounded-[8px] hover:bg-rose-50 transition-colors cursor-pointer"
                            >
                                Reset Filters
                            </button>
                        )}
                    </div>

                    {/* Loading State */}
                    {loading ? (
                        <SkeletonLoader type={viewMode === "card" ? "card" : "table"} rows={6} />
                    ) : sortedAssets.length === 0 ? (
                        <EmptyState message="No assets found" description="Try adjusting your search criteria or add a new asset to inventory." />
                    ) : viewMode === "list" ? (
                        /* FLOATING ROW HERO CELL VIEW */
                        <div className="bg-white border border-slate-200/80 rounded-[20px] p-4 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[1050px] whitespace-nowrap">
                                    <thead>
                                        <tr className="bg-slate-50/90 border-b border-slate-200">
                                            <th className="text-left px-4 py-3.5 text-[11px] text-slate-500 font-extrabold uppercase tracking-wider">
                                                <SortHeader label="Asset Details" field="brandModel" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                                            </th>
                                            <th className="text-left px-4 py-3.5 text-[11px] text-slate-500 font-extrabold uppercase tracking-wider">
                                                <SortHeader label="Category" field="category" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                                            </th>
                                            <th className="text-left px-4 py-3.5 text-[11px] text-slate-500 font-extrabold uppercase tracking-wider">Condition</th>
                                            <th className="text-left px-4 py-3.5 text-[11px] text-slate-500 font-extrabold uppercase tracking-wider">Status</th>
                                            <th className="text-left px-4 py-3.5 text-[11px] text-slate-500 font-extrabold uppercase tracking-wider">Assigned To</th>
                                            <th className="text-left px-4 py-3.5 text-[11px] text-slate-500 font-extrabold uppercase tracking-wider">Assigned Date</th>
                                            <th className="text-right px-4 py-3.5 text-[11px] text-slate-500 font-extrabold uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {sortedAssets.map((asset) => {
                                            const st = statusBadge(asset.status);
                                            return (
                                                <tr key={asset._id} className="hover:bg-blue-50/20 transition-all group">
                                                    {/* Asset Details (Hero Cell) */}
                                                    <td className="px-4 py-3.5">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-[12px] bg-blue-50/90 border border-blue-100 flex items-center justify-center text-[#2D79C7] shrink-0 shadow-2xs group-hover:bg-[#2D79C7] group-hover:text-white transition-all">
                                                                {getCategoryIcon(asset.category, "w-5 h-5")}
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-extrabold text-sm text-slate-900 leading-tight">
                                                                        {asset.brandModel || asset.category}
                                                                    </span>
                                                                    <span className="text-[10px] font-mono font-extrabold text-[#2D79C7] bg-blue-50 px-2 py-0.5 rounded-[6px] border border-blue-100 shadow-2xs">
                                                                        #{asset.assetId}
                                                                    </span>
                                                                </div>
                                                                <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                                                                    Asset Code: {asset.assetId}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Category */}
                                                    <td className="px-4 py-3.5">
                                                        <span className="inline-flex items-center text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-[8px] border border-slate-200/80 shadow-2xs">
                                                            {asset.category}
                                                        </span>
                                                    </td>

                                                    {/* Condition */}
                                                    <td className="px-4 py-3.5">
                                                        <span className={`inline-flex items-center text-[11px] font-extrabold px-3 py-1 rounded-full border shadow-2xs ${conditionBadge(asset.condition)}`}>
                                                            {asset.condition}
                                                        </span>
                                                    </td>

                                                    {/* Status */}
                                                    <td className="px-4 py-3.5">
                                                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-extrabold px-3 py-1 rounded-full border shadow-2xs ${st.cls}`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                                                            {asset.status}
                                                        </span>
                                                    </td>

                                                    {/* Assigned To */}
                                                    <td className="px-4 py-3.5">
                                                        {asset.assignedTo ? (
                                                            <div className="flex items-center gap-2.5">
                                                                <Avatar src={asset.assignedTo.profilePicture} name={asset.assignedTo.fullName || asset.assignedTo.firstName} size="w-8 h-8 ring-2 ring-blue-100 shadow-2xs" />
                                                                <div>
                                                                    <p className="text-xs font-extrabold text-slate-900 leading-tight">{asset.assignedTo.fullName || `${asset.assignedTo.firstName} ${asset.assignedTo.lastName}`}</p>
                                                                    <p className="text-[10px] font-semibold text-slate-400 mt-0.5">{asset.assignedTo.employeeId} · {asset.assignedTo.department}</p>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs font-semibold text-slate-400 italic bg-slate-50 px-2.5 py-1 rounded-[8px] border border-slate-100">Unassigned</span>
                                                        )}
                                                    </td>

                                                    {/* Assigned Date */}
                                                    <td className="px-4 py-3.5">
                                                        {asset.assignedDate ? (
                                                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-50 px-2.5 py-1 rounded-[8px] border border-slate-200/80">
                                                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                                                {formatDate(asset.assignedDate)}
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs text-slate-400 font-medium">—</span>
                                                        )}
                                                    </td>

                                                    {/* Actions */}
                                                    <td className="px-4 py-3.5 text-right">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            {/* Assign / Unassign Quick Button */}
                                                            {asset.assignedTo ? (
                                                                <button
                                                                    onClick={() => setConfirmDialog({ isOpen: true, type: "unassign", asset })}
                                                                    title="Unassign Asset"
                                                                    className="p-2 bg-amber-50 hover:bg-amber-600 text-amber-700 hover:text-white rounded-[10px] transition-all cursor-pointer border border-amber-100 shadow-2xs"
                                                                >
                                                                    <UserMinus className="w-3.5 h-3.5" />
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    onClick={() => {
                                                                        setAssetToAssign(asset);
                                                                        setPreselectedEmployeeId("");
                                                                        setShowAssignModal(true);
                                                                    }}
                                                                    title="Assign Asset"
                                                                    className="p-2 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white rounded-[10px] transition-all cursor-pointer border border-emerald-100 shadow-2xs"
                                                                >
                                                                    <UserPlus className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}

                                                            {/* Status Update Quick Button */}
                                                            <button
                                                                onClick={() => {
                                                                    setAssetForStatus(asset);
                                                                    setShowStatusModal(true);
                                                                }}
                                                                title="Update Status / Condition"
                                                                className="p-2 bg-blue-50 hover:bg-[#2D79C7] text-[#2D79C7] hover:text-white rounded-[10px] transition-all cursor-pointer border border-blue-100 shadow-2xs"
                                                            >
                                                                <RefreshCw className="w-3.5 h-3.5" />
                                                            </button>

                                                            {/* Edit Asset */}
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedAsset(asset);
                                                                    setDrawerMode("edit");
                                                                    setShowAssetDrawer(true);
                                                                }}
                                                                title="Edit Asset"
                                                                className="p-2 bg-slate-100 hover:bg-slate-800 text-slate-700 hover:text-white rounded-[10px] transition-all cursor-pointer border border-slate-200 shadow-2xs"
                                                            >
                                                                <Edit3 className="w-3.5 h-3.5" />
                                                            </button>

                                                            {/* Delete Asset */}
                                                            <button
                                                                onClick={() => setConfirmDialog({ isOpen: true, type: "delete", asset })}
                                                                title="Delete Asset"
                                                                className="p-2 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white rounded-[10px] transition-all cursor-pointer border border-rose-100 shadow-2xs"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        /* CARD VIEW */
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                            {sortedAssets.map((asset) => {
                                const st = statusBadge(asset.status);
                                return (
                                    <div key={asset._id} className="bg-white border border-slate-200/80 rounded-[20px] p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-4 relative group">
                                        <div>
                                            <div className="flex items-start justify-between gap-2 mb-3">
                                                <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-[#2D79C7] bg-blue-50 px-2.5 py-1 rounded-[8px] border border-blue-100 font-mono shadow-2xs">
                                                    <Box className="w-3 h-3 text-[#2D79C7]" />
                                                    {asset.assetId}
                                                </span>
                                                <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full border shadow-2xs ${st.cls}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                                                    {asset.status}
                                                </span>
                                            </div>
                                            <h3 className="font-extrabold text-sm text-slate-800 truncate">{asset.brandModel || asset.category}</h3>
                                            <p className="text-xs text-slate-500 font-semibold mt-0.5">{asset.category}</p>
                                        </div>

                                        <div className="space-y-2.5 text-xs border-t border-slate-100 pt-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-slate-400 font-extrabold uppercase text-[10px]">Condition:</span>
                                                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${conditionBadge(asset.condition)}`}>
                                                    {asset.condition}
                                                </span>
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <span className="text-slate-400 font-extrabold uppercase text-[10px]">Assigned Date:</span>
                                                <span className="font-semibold text-slate-700">{formatDate(asset.assignedDate)}</span>
                                            </div>

                                            <div className="border-t border-slate-100 pt-2.5">
                                                <span className="text-slate-400 font-extrabold uppercase text-[10px] block mb-1.5">Assigned To:</span>
                                                {asset.assignedTo ? (
                                                    <div className="flex items-center gap-2">
                                                        <Avatar src={asset.assignedTo.profilePicture} name={asset.assignedTo.fullName || asset.assignedTo.firstName} size="w-6 h-6 ring-2 ring-blue-100" />
                                                        <span className="text-xs font-bold text-slate-800 truncate">{asset.assignedTo.fullName || asset.assignedTo.firstName}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-slate-400 italic">Unassigned</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 border-t border-slate-100 pt-3">
                                            {asset.assignedTo ? (
                                                <button
                                                    onClick={() => setConfirmDialog({ isOpen: true, type: "unassign", asset })}
                                                    className="flex-1 py-2 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-600 hover:text-white rounded-[10px] border border-amber-100 transition-all flex items-center justify-center gap-1 cursor-pointer"
                                                >
                                                    <UserMinus className="w-3.5 h-3.5" /> Unassign
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => {
                                                        setAssetToAssign(asset);
                                                        setPreselectedEmployeeId("");
                                                        setShowAssignModal(true);
                                                    }}
                                                    className="flex-1 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-600 hover:text-white rounded-[10px] border border-emerald-100 transition-all flex items-center justify-center gap-1 cursor-pointer"
                                                >
                                                    <UserPlus className="w-3.5 h-3.5" /> Assign
                                                </button>
                                            )}

                                            <button
                                                onClick={() => {
                                                    setAssetForStatus(asset);
                                                    setShowStatusModal(true);
                                                }}
                                                className="p-2 bg-blue-50 hover:bg-[#2D79C7] text-[#2D79C7] hover:text-white rounded-[10px] border border-blue-100 transition-all cursor-pointer"
                                                title="Update Status / Condition"
                                            >
                                                <RefreshCw className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setSelectedAsset(asset);
                                                    setDrawerMode("edit");
                                                    setShowAssetDrawer(true);
                                                }}
                                                className="p-2 bg-slate-100 hover:bg-slate-700 text-slate-700 hover:text-white rounded-[10px] border border-slate-200 transition-all cursor-pointer"
                                                title="Edit Asset"
                                            >
                                                <Edit3 className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => setConfirmDialog({ isOpen: true, type: "delete", asset })}
                                                className="p-2 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white rounded-[10px] border border-rose-100 transition-all cursor-pointer"
                                                title="Delete Asset"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* TAB 2: ASSIGNED ASSETS */}
            {activeTab === "assigned" && (
                <div className="space-y-4">
                    {/* Search Bar for Assigned Tab */}
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 border border-gray-200/70 rounded-[16px] shadow-sm">
                        <SearchBar
                            value={assignedSearch}
                            onChange={setAssignedSearch}
                            placeholder="Search employee name, ID, department, asset..."
                        />
                        <div className="text-xs font-bold text-gray-500">
                            Showing <span className="text-[#2D79C7]">{filteredAssignedGroups.length}</span> employees with assigned assets
                        </div>
                    </div>

                    {loading ? (
                        <SkeletonLoader type="card" rows={4} />
                    ) : filteredAssignedGroups.length === 0 ? (
                        <EmptyState message="No assigned assets" description="No asset assignments match your search or no assets have been assigned yet." />
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {filteredAssignedGroups.map((group) => {
                                const emp = group.employee;
                                const empName = emp?.fullName || `${emp?.firstName || ""} ${emp?.lastName || ""}`;

                                return (
                                    <div key={emp?._id} className="bg-white border border-slate-200/80 rounded-[20px] p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between gap-4 group">
                                        {/* Employee Header */}
                                        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                                            <div className="flex items-center gap-3">
                                                <Avatar src={emp?.profilePicture} name={empName} size="w-10 h-10 ring-2 ring-blue-100 shadow-2xs" />
                                                <div>
                                                    <h3 className="font-extrabold text-sm text-slate-800 leading-tight">{empName}</h3>
                                                    <p className="text-xs text-slate-400 font-semibold mt-0.5">
                                                        {emp?.employeeId} · {emp?.department || "N/A"} · {emp?.designation || "N/A"}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="text-[11px] font-extrabold bg-blue-50/90 text-[#2D79C7] border border-blue-100 px-3 py-1 rounded-full font-mono shadow-2xs flex items-center gap-1">
                                                <Box className="w-3 h-3 text-[#2D79C7]" />
                                                {group.assets.length} {group.assets.length === 1 ? "Asset" : "Assets"}
                                            </span>
                                        </div>

                                        {/* Assets Allocated */}
                                        <div className="space-y-3">
                                            {group.assets.map((asset) => (
                                                <div key={asset._id} className="bg-slate-50/80 border border-slate-200/70 rounded-[14px] p-3.5 flex items-center justify-between gap-3 hover:border-blue-200/80 hover:bg-blue-50/20 transition-all">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-[10px] bg-white border border-slate-200/80 flex items-center justify-center text-[#2D79C7] shadow-2xs shrink-0">
                                                            {getCategoryIcon(asset.category, "w-4.5 h-4.5")}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] font-extrabold text-[#2D79C7] bg-blue-50 px-2 py-0.5 rounded-[6px] border border-blue-100 font-mono shadow-2xs">
                                                                    {asset.assetId}
                                                                </span>
                                                                <span className="font-extrabold text-xs text-slate-800">{asset.brandModel || asset.category}</span>
                                                            </div>
                                                            <p className="text-[11px] text-slate-500 font-medium mt-1 inline-flex items-center gap-1">
                                                                <span>{asset.category}</span>
                                                                <span>·</span>
                                                                <Calendar className="w-3 h-3 text-slate-400" />
                                                                <span>Assigned: {formatDate(asset.assignedDate)}</span>
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border shadow-2xs ${conditionBadge(asset.condition)}`}>
                                                            {asset.condition}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Action footer */}
                                        <div className="border-t border-slate-100 pt-3 flex flex-wrap items-center justify-between gap-3">
                                            <div className="flex flex-wrap items-center gap-2">
                                                {group.assets.map((asset) => (
                                                    <button
                                                        key={asset._id}
                                                        onClick={() => setConfirmDialog({ isOpen: true, type: "unassign", asset })}
                                                        className="text-xs font-extrabold text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-100 px-3.5 py-2 rounded-[10px] transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
                                                    >
                                                        <UserMinus className="w-3.5 h-3.5" />
                                                        <span>Unassign {group.assets.length > 1 ? `(${asset.assetId})` : "Asset"}</span>
                                                    </button>
                                                ))}
                                            </div>

                                            <button
                                                onClick={() => {
                                                    setAssetToAssign(null);
                                                    setPreselectedEmployeeId(emp._id);
                                                    setShowAssignModal(true);
                                                }}
                                                className="text-xs font-extrabold text-[#2D79C7] hover:text-white bg-blue-50 hover:bg-[#2D79C7] border border-blue-100 px-3.5 py-2 rounded-[10px] transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                                            >
                                                <Plus className="w-3.5 h-3.5" /> Assign Another Asset
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* CREATE / EDIT ASSET DRAWER */}
            {showAssetDrawer && (
                <AssetDrawer
                    mode={drawerMode}
                    asset={selectedAsset}
                    employees={employeesList}
                    onClose={() => {
                        setShowAssetDrawer(false);
                        setSelectedAsset(null);
                    }}
                    onSuccess={() => {
                        setShowAssetDrawer(false);
                        setSelectedAsset(null);
                        fetchAssetsData();
                    }}
                />
            )}

            {/* ASSIGN ASSET MODAL */}
            {showAssignModal && (
                <AssignAssetModal
                    asset={assetToAssign}
                    allAssets={assets.filter(a => a.status === "Available")}
                    employees={employeesList}
                    preselectedEmployeeId={preselectedEmployeeId}
                    onClose={() => {
                        setShowAssignModal(false);
                        setAssetToAssign(null);
                        setPreselectedEmployeeId("");
                    }}
                    onSuccess={() => {
                        setShowAssignModal(false);
                        setAssetToAssign(null);
                        setPreselectedEmployeeId("");
                        fetchAssetsData();
                    }}
                />
            )}

            {/* UPDATE STATUS / CONDITION MODAL */}
            {showStatusModal && assetForStatus && (
                <UpdateStatusModal
                    asset={assetForStatus}
                    onClose={() => {
                        setShowStatusModal(false);
                        setAssetForStatus(null);
                    }}
                    onSuccess={() => {
                        setShowStatusModal(false);
                        setAssetForStatus(null);
                        fetchAssetsData();
                    }}
                />
            )}

            {/* CONFIRM DIALOG FOR UNASSIGN / DELETE */}
            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                title={confirmDialog.type === "delete" ? "Delete Asset" : "Unassign Asset"}
                message={
                    confirmDialog.type === "delete"
                        ? `Are you sure you want to permanently delete asset ${confirmDialog.asset?.assetId} (${confirmDialog.asset?.brandModel || confirmDialog.asset?.category})? This action cannot be undone.`
                        : `Are you sure you want to unassign asset ${confirmDialog.asset?.assetId} (${confirmDialog.asset?.brandModel || confirmDialog.asset?.category}) from ${confirmDialog.asset?.assignedTo?.fullName || "employee"}?`
                }
                confirmText={confirmDialog.type === "delete" ? "Delete Asset" : "Unassign Asset"}
                type={confirmDialog.type === "delete" ? "danger" : "warning"}
                onConfirm={() => {
                    const targetAsset = confirmDialog.asset;
                    setConfirmDialog({ isOpen: false, type: "", asset: null });
                    if (confirmDialog.type === "delete") {
                        handleDeleteAsset(targetAsset);
                    } else if (confirmDialog.type === "unassign") {
                        handleUnassignAsset(targetAsset);
                    }
                }}
                onClose={() => setConfirmDialog({ isOpen: false, type: "", asset: null })}
            />
        </div>
    );
};

/* ─────────────────────────────────────────────
   ADD / EDIT ASSET DRAWER COMPONENT
───────────────────────────────────────────── */
const AssetDrawer = ({ mode, asset, employees, onClose, onSuccess }) => {
    const isEdit = mode === "edit";

    const [form, setForm] = useState(() => {
        if (isEdit && asset) {
            return {
                assetId: asset.assetId || "",
                category: asset.category || "Laptop",
                brandModel: asset.brandModel || "",
                condition: asset.condition || "Excellent",
                status: asset.status || "Available",
                assignedTo: asset.assignedTo?._id || asset.assignedTo || "",
                assignedDate: asset.assignedDate ? asset.assignedDate.split("T")[0] : ""
            };
        }
        return {
            assetId: `AST-${Math.floor(1000 + Math.random() * 9000)}`,
            category: "Laptop",
            brandModel: "",
            condition: "Excellent",
            status: "Available",
            assignedTo: "",
            assignedDate: "",
            serialNumber: ""
        };
    });

    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    const validate = () => {
        const errs = {};
        if (!form.assetId || !form.assetId.trim()) errs.assetId = "Asset ID is required.";
        if (!form.category || !form.category.trim()) errs.category = "Category is required.";
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        setSubmitting(true);
        try {
            const payload = {
                ...form,
                name: form.brandModel ? form.brandModel.trim() : form.category
            };
            if (isEdit) {
                const res = await updateAsset(asset._id, payload);
                if (res.data?.success) {
                    toast.success(res.data.message || "Asset updated successfully.");
                    onSuccess();
                }
            } else {
                const res = await createAsset(payload);
                if (res.data?.success) {
                    toast.success(res.data.message || "Asset created successfully.");
                    onSuccess();
                }
            }
        } catch (error) {
            toast.error(error.response?.data?.message || `Failed to ${isEdit ? "update" : "create"} asset.`);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={onClose} />
            <div className="fixed top-0 right-0 h-full w-full max-w-[500px] bg-white z-50 shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-gradient-to-r from-[#2D79C7] to-[#1F5EA8] shadow-md">
                    <div className="flex items-center gap-3 text-white">
                        <Box className="w-5 h-5" />
                        <h3 className="font-bold text-base">{isEdit ? "Edit Asset" : "Add New Asset"}</h3>
                    </div>
                    <button onClick={onClose} className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-all cursor-pointer">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <FormField label="Asset ID" required error={errors.assetId}>
                                <input
                                    type="text"
                                    value={form.assetId}
                                    onChange={(e) => setForm({ ...form, assetId: e.target.value })}
                                    placeholder="e.g. AST-1001"
                                    className={inputCls}
                                />
                            </FormField>

                            <FormField label="Category" required error={errors.category}>
                                <div className="relative">
                                    <select
                                        value={form.category}
                                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                                        className={selectCls}
                                    >
                                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                    <ChevronDown className="w-3 h-3 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                </div>
                            </FormField>
                        </div>

                        <FormField label="Brand / Model">
                            <input
                                type="text"
                                value={form.brandModel}
                                onChange={(e) => setForm({ ...form, brandModel: e.target.value })}
                                placeholder="e.g. Apple MacBook Pro / A2780"
                                className={inputCls}
                            />
                        </FormField>

                        <div className="grid grid-cols-2 gap-3">
                            <FormField label="Condition">
                                <div className="relative">
                                    <select
                                        value={form.condition}
                                        onChange={(e) => setForm({ ...form, condition: e.target.value })}
                                        className={selectCls}
                                    >
                                        {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                    <ChevronDown className="w-3 h-3 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                </div>
                            </FormField>

                            <FormField label="Status">
                                <div className="relative">
                                    <select
                                        value={form.status}
                                        onChange={(e) => setForm({ ...form, status: e.target.value })}
                                        className={selectCls}
                                    >
                                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                    <ChevronDown className="w-3 h-3 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                </div>
                            </FormField>
                        </div>

                        <FormField label="Assigned Employee (Optional)">
                            <div className="relative">
                                <select
                                    value={form.assignedTo}
                                    onChange={(e) => {
                                        const empId = e.target.value;
                                        setForm({
                                            ...form,
                                            assignedTo: empId,
                                            status: empId ? "Assigned" : (form.status === "Assigned" ? "Available" : form.status)
                                        });
                                    }}
                                    className={selectCls}
                                >
                                    <option value="">None (Unassigned)</option>
                                    {employees.map(emp => (
                                        <option key={emp._id} value={emp._id}>
                                            {emp.fullName || `${emp.firstName} ${emp.lastName}`} ({emp.employeeId} - {emp.department})
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="w-3 h-3 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                        </FormField>

                        <FormField label="Assigned Date">
                            <input
                                type="date"
                                value={form.assignedDate}
                                onChange={(e) => setForm({ ...form, assignedDate: e.target.value })}
                                className={inputCls}
                            />
                        </FormField>
                    </div>

                    {/* Fixed Bottom Footer Actions */}
                    <div className="p-4 border-t border-gray-100 bg-white grid grid-cols-2 gap-3 shadow-lg">
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-full py-2.5 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-[10px] transition-colors cursor-pointer text-center"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full py-2.5 text-xs font-bold text-white bg-gradient-to-r from-[#2D79C7] to-[#1F5EA8] hover:opacity-95 rounded-[10px] shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            <span>{isEdit ? "Update Asset" : "Save Asset"}</span>
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
};

/* ─────────────────────────────────────────────
   ASSIGN ASSET MODAL COMPONENT
───────────────────────────────────────────── */
const AssignAssetModal = ({ asset, allAssets, employees, preselectedEmployeeId, onClose, onSuccess }) => {
    const [selectedAssetId, setSelectedAssetId] = useState(asset ? asset._id : (allAssets[0]?._id || ""));
    const [selectedEmployeeId, setSelectedEmployeeId] = useState(preselectedEmployeeId || "");
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedAssetId || !selectedEmployeeId) {
            toast.error("Please select both an asset and an employee.");
            return;
        }

        setSubmitting(true);
        try {
            const res = await assignAsset(selectedAssetId, selectedEmployeeId);
            if (res.data?.success) {
                toast.success(res.data.message || "Asset assigned successfully.");
                onSuccess();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to assign asset.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[20px] shadow-2xl max-w-md w-full overflow-hidden animate-fadeIn">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-[#2D79C7] to-[#1F5EA8]">
                    <h3 className="text-white text-sm font-bold flex items-center gap-2">
                        <UserPlus className="w-4 h-4" /> Assign Asset
                    </h3>
                    <button onClick={onClose} className="text-white/80 hover:text-white p-1 rounded-md transition-colors cursor-pointer">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 text-left">
                    {asset ? (
                        <div className="bg-blue-50 border border-blue-100 p-3 rounded-[12px]">
                            <span className="text-[10px] font-bold text-[#2D79C7] uppercase tracking-wider block mb-1">Target Asset</span>
                            <div className="font-bold text-sm text-[#1E1E1E]">{asset.brandModel || asset.category}</div>
                            <div className="text-xs text-gray-500">{asset.assetId} · {asset.category}</div>
                        </div>
                    ) : (
                        <FormField label="Select Asset to Assign" required>
                            <div className="relative">
                                <select
                                    value={selectedAssetId}
                                    onChange={(e) => setSelectedAssetId(e.target.value)}
                                    className={selectCls}
                                >
                                    <option value="">Select Available Asset</option>
                                    {allAssets.map(a => (
                                        <option key={a._id} value={a._id}>
                                            {a.name} ({a.assetId} - {a.category})
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="w-3 h-3 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                        </FormField>
                    )}

                    <FormField label="Select Employee" required>
                        <div className="relative">
                            <select
                                value={selectedEmployeeId}
                                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                                className={selectCls}
                            >
                                <option value="">Select Active Employee</option>
                                {employees.map(emp => (
                                    <option key={emp._id} value={emp._id}>
                                        {emp.fullName || `${emp.firstName} ${emp.lastName}`} ({emp.employeeId} - {emp.department})
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="w-3 h-3 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                    </FormField>

                    <div className="pt-3 border-t border-gray-100 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-[10px] transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-5 py-2 text-xs font-bold text-white bg-[#2D79C7] hover:bg-[#1F5EA8] rounded-[10px] shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            <span>Confirm Assignment</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

/* ─────────────────────────────────────────────
   UPDATE STATUS & CONDITION MODAL COMPONENT
───────────────────────────────────────────── */
const UpdateStatusModal = ({ asset, onClose, onSuccess }) => {
    const [status, setStatus] = useState(asset.status || "Available");
    const [condition, setCondition] = useState(asset.condition || "Excellent");
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await updateAssetStatus(asset._id, status, condition);
            if (res.data?.success) {
                toast.success(res.data.message || "Asset status updated.");
                onSuccess();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to update asset status.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[20px] shadow-2xl max-w-sm w-full overflow-hidden animate-fadeIn">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-[#2D79C7] to-[#1F5EA8]">
                    <h3 className="text-white text-sm font-bold flex items-center gap-2">
                        <RefreshCw className="w-4 h-4" /> Update Status & Condition
                    </h3>
                    <button onClick={onClose} className="text-white/80 hover:text-white p-1 rounded-md transition-colors cursor-pointer">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 text-left">
                    <div className="text-xs text-gray-500 font-bold">
                        Asset: <span className="text-[#1E1E1E]">{asset.brandModel || asset.category}</span> ({asset.assetId})
                    </div>

                    <FormField label="Asset Status">
                        <div className="relative">
                            <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectCls}>
                                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <ChevronDown className="w-3 h-3 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                    </FormField>

                    <FormField label="Asset Condition">
                        <div className="relative">
                            <select value={condition} onChange={(e) => setCondition(e.target.value)} className={selectCls}>
                                {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <ChevronDown className="w-3 h-3 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                    </FormField>

                    <div className="pt-3 border-t border-gray-100 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-[10px] transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-5 py-2 text-xs font-bold text-white bg-[#2D79C7] hover:bg-[#1F5EA8] rounded-[10px] shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            <span>Update</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Assets;
