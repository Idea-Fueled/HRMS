import React, { useState, useEffect, useCallback } from "react";
import {
    Laptop, Box, UserCheck, CheckCircle2, AlertTriangle, Plus, Search,
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

const conditionBadge = (c) => ({
    New: "bg-[#F0FDF4] text-[#166534] border-[#DCFCE7]",
    Excellent: "bg-[#F0F7FF] text-[#1F5EA8] border-[#D0E5FC]",
    Good: "bg-[#F0FDF4] text-[#15803D] border-[#DCFCE7]",
    Fair: "bg-[#FEFCE8] text-[#A16207] border-[#FEF08A]",
    Poor: "bg-[#FFF7ED] text-[#C2410C] border-[#FFEDD5]",
    Damaged: "bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]",
}[c] || "bg-gray-100 text-gray-600 border-gray-200");

const statusBadge = (s) => ({
    Available: "bg-[#F0FDF4] text-[#15803D] border-[#DCFCE7]",
    Assigned: "bg-[#F0F7FF] text-[#1F5EA8] border-[#D0E5FC]",
    "In Maintenance": "bg-[#FEFCE8] text-[#A16207] border-[#FEF08A]",
    "Not Assigned": "bg-gray-100 text-gray-500 border-gray-200",
    Retired: "bg-gray-100 text-gray-500 border-gray-200",
    Lost: "bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]",
}[s] || "bg-gray-100 text-gray-600 border-gray-200");

const formatDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

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
                <div className="premium-3d-card-mini p-4 flex flex-col gap-2.5">
                    <div className="w-8 h-8 rounded-[10px] border flex items-center justify-center bg-blue-50 text-[#2D79C7] border-blue-100">
                        <Box className="w-4 h-4" />
                    </div>
                    <div>
                        <p className="text-[24px] font-black text-[#1E1E1E] leading-none">{summary.total || 0}</p>
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-1">Total Assets</p>
                    </div>
                </div>

                <div className="premium-3d-card-mini p-4 flex flex-col gap-2.5">
                    <div className="w-8 h-8 rounded-[10px] border flex items-center justify-center bg-emerald-50 text-emerald-700 border-emerald-100">
                        <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                        <p className="text-[24px] font-black text-[#1E1E1E] leading-none">{summary.available || 0}</p>
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-1">Available</p>
                    </div>
                </div>

                <div className="premium-3d-card-mini p-4 flex flex-col gap-2.5">
                    <div className="w-8 h-8 rounded-[10px] border flex items-center justify-center bg-[#F0F7FF] text-[#1F5EA8] border-[#D0E5FC]">
                        <UserCheck className="w-4 h-4" />
                    </div>
                    <div>
                        <p className="text-[24px] font-black text-[#1E1E1E] leading-none">{summary.assigned || 0}</p>
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-1">Assigned</p>
                    </div>
                </div>

                <div className="premium-3d-card-mini p-4 flex flex-col gap-2.5">
                    <div className="w-8 h-8 rounded-[10px] border flex items-center justify-center bg-amber-50 text-amber-700 border-amber-100">
                        <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div>
                        <p className="text-[24px] font-black text-[#1E1E1E] leading-none">{summary.inMaintenance || 0}</p>
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-1">In Maintenance</p>
                    </div>
                </div>

                <div className="premium-3d-card-mini p-4 flex flex-col gap-2.5">
                    <div className="w-8 h-8 rounded-[10px] border flex items-center justify-center bg-rose-50 text-rose-700 border-rose-100">
                        <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div>
                        <p className="text-[24px] font-black text-[#1E1E1E] leading-none">{summary.damaged || 0}</p>
                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-1">Damaged / Poor</p>
                    </div>
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
                            placeholder="Search asset name, ID, brand..."
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
                        /* TABLE VIEW */
                        <div className="premium-3d-card overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[1050px] whitespace-nowrap">
                                    <thead>
                                        <tr className="bg-[#F9FAFB] border-b border-[#F3F4F6]">
                                            <th className="text-left px-4 py-3 text-xs text-gray-400">
                                                <SortHeader label="Asset ID" field="assetId" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                                            </th>
                                            <th className="text-left px-4 py-3 text-xs text-gray-400">
                                                <SortHeader label="Asset Name" field="name" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                                            </th>
                                            <th className="text-left px-4 py-3 text-xs text-gray-400">
                                                <SortHeader label="Category" field="category" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                                            </th>
                                            <th className="text-left px-4 py-3 text-xs text-gray-400 font-extrabold uppercase tracking-wider">Brand / Model</th>
                                            <th className="text-left px-4 py-3 text-xs text-gray-400 font-extrabold uppercase tracking-wider">Condition</th>
                                            <th className="text-left px-4 py-3 text-xs text-gray-400 font-extrabold uppercase tracking-wider">Status</th>
                                            <th className="text-left px-4 py-3 text-xs text-gray-400 font-extrabold uppercase tracking-wider">Assigned Employee</th>
                                            <th className="text-left px-4 py-3 text-xs text-gray-400 font-extrabold uppercase tracking-wider">Assigned Date</th>
                                            <th className="text-left px-4 py-3 text-xs text-gray-400 font-extrabold uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#F3F4F6]">
                                        {sortedAssets.map((asset) => (
                                            <tr key={asset._id} className="hover:bg-blue-50/30 transition-colors group">
                                                <td className="px-4 py-3">
                                                    <span className="text-[11px] font-bold text-[#2D79C7] bg-blue-50 px-2 py-0.5 rounded-[6px] border border-blue-100">
                                                        {asset.assetId}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="font-bold text-sm text-[#1E1E1E]">{asset.name}</div>
                                                    {asset.serialNumber && <div className="text-[10px] text-gray-400">SN: {asset.serialNumber}</div>}
                                                </td>
                                                <td className="px-4 py-3 text-xs font-semibold text-gray-600">{asset.category}</td>
                                                <td className="px-4 py-3 text-xs text-gray-600">{asset.brandModel || "—"}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${conditionBadge(asset.condition)}`}>
                                                        {asset.condition}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${statusBadge(asset.status)}`}>
                                                        {asset.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {asset.assignedTo ? (
                                                        <div className="flex items-center gap-2">
                                                            <Avatar src={asset.assignedTo.profilePicture} name={asset.assignedTo.fullName || asset.assignedTo.firstName} size="w-7 h-7" />
                                                            <div>
                                                                <p className="text-xs font-bold text-[#1E1E1E] leading-none">{asset.assignedTo.fullName || `${asset.assignedTo.firstName} ${asset.assignedTo.lastName}`}</p>
                                                                <p className="text-[10px] text-gray-400 mt-0.5">{asset.assignedTo.employeeId} · {asset.assignedTo.department}</p>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs font-semibold text-gray-400 italic">Unassigned</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-xs text-gray-500">{formatDate(asset.assignedDate)}</td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-1.5">
                                                        {/* Assign / Unassign Quick Button */}
                                                        {asset.assignedTo ? (
                                                            <button
                                                                onClick={() => setConfirmDialog({ isOpen: true, type: "unassign", asset })}
                                                                title="Unassign Asset"
                                                                className="p-1.5 bg-amber-50 hover:bg-amber-100 rounded-[8px] text-amber-700 transition-colors cursor-pointer border border-amber-100"
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
                                                                className="p-1.5 bg-emerald-50 hover:bg-emerald-100 rounded-[8px] text-emerald-700 transition-colors cursor-pointer border border-emerald-100"
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
                                                            className="p-1.5 bg-blue-50 hover:bg-blue-100 rounded-[8px] text-[#2D79C7] transition-colors cursor-pointer border border-blue-100"
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
                                                            className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-[8px] text-slate-700 transition-colors cursor-pointer border border-slate-200"
                                                        >
                                                            <Edit3 className="w-3.5 h-3.5" />
                                                        </button>

                                                        {/* Delete Asset */}
                                                        <button
                                                            onClick={() => setConfirmDialog({ isOpen: true, type: "delete", asset })}
                                                            title="Delete Asset"
                                                            className="p-1.5 bg-rose-50 hover:bg-rose-100 rounded-[8px] text-rose-600 transition-colors cursor-pointer border border-rose-100"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        /* CARD VIEW */
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                            {sortedAssets.map((asset) => (
                                <div key={asset._id} className="premium-3d-card p-5 flex flex-col justify-between gap-4 relative">
                                    <div>
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <span className="text-[11px] font-bold text-[#2D79C7] bg-blue-50 px-2 py-0.5 rounded-[6px] border border-blue-100">
                                                {asset.assetId}
                                            </span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusBadge(asset.status)}`}>
                                                {asset.status}
                                            </span>
                                        </div>
                                        <h3 className="font-bold text-sm text-[#1E1E1E] truncate">{asset.name}</h3>
                                        <p className="text-xs text-gray-500 font-medium">{asset.category} · {asset.brandModel || "N/A"}</p>
                                    </div>

                                    <div className="space-y-2 text-xs border-t border-[#F3F4F6] pt-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-400 font-bold uppercase text-[10px]">Condition:</span>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${conditionBadge(asset.condition)}`}>
                                                {asset.condition}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-400 font-bold uppercase text-[10px]">Assigned Date:</span>
                                            <span className="font-semibold text-gray-700">{formatDate(asset.assignedDate)}</span>
                                        </div>

                                        <div className="border-t border-[#F3F4F6] pt-2">
                                            <span className="text-gray-400 font-bold uppercase text-[10px] block mb-1">Assigned To:</span>
                                            {asset.assignedTo ? (
                                                <div className="flex items-center gap-2">
                                                    <Avatar src={asset.assignedTo.profilePicture} name={asset.assignedTo.fullName || asset.assignedTo.firstName} size="w-6 h-6" />
                                                    <span className="text-xs font-bold text-[#1E1E1E] truncate">{asset.assignedTo.fullName || asset.assignedTo.firstName}</span>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-gray-400 italic">Unassigned</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1.5 border-t border-[#F3F4F6] pt-3">
                                        {asset.assignedTo ? (
                                            <button
                                                onClick={() => setConfirmDialog({ isOpen: true, type: "unassign", asset })}
                                                className="flex-1 py-1.5 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-[8px] border border-amber-100 transition-colors flex items-center justify-center gap-1 cursor-pointer"
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
                                                className="flex-1 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-[8px] border border-emerald-100 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                                            >
                                                <UserPlus className="w-3.5 h-3.5" /> Assign
                                            </button>
                                        )}

                                        <button
                                            onClick={() => {
                                                setSelectedAsset(asset);
                                                setDrawerMode("edit");
                                                setShowAssetDrawer(true);
                                            }}
                                            className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-[8px] text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                                            title="Edit Asset"
                                        >
                                            <Edit3 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={() => setConfirmDialog({ isOpen: true, type: "delete", asset })}
                                            className="p-1.5 bg-rose-50 hover:bg-rose-100 rounded-[8px] text-rose-600 border border-rose-100 transition-colors cursor-pointer"
                                            title="Delete Asset"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
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
                                    <div key={emp?._id} className="premium-3d-card p-5 flex flex-col justify-between gap-4">
                                        {/* Employee Header */}
                                        <div className="flex items-center justify-between border-b border-[#F3F4F6] pb-3">
                                            <div className="flex items-center gap-3">
                                                <Avatar src={emp?.profilePicture} name={empName} size="w-10 h-10" />
                                                <div>
                                                    <h3 className="font-bold text-sm text-[#1E1E1E] leading-tight">{empName}</h3>
                                                    <p className="text-xs text-gray-400 font-medium mt-0.5">
                                                        {emp?.employeeId} · {emp?.department || "N/A"} · {emp?.designation || "N/A"}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className="text-[10px] font-black bg-blue-50 text-[#2D79C7] border border-blue-100 px-2.5 py-1 rounded-full">
                                                {group.assets.length} {group.assets.length === 1 ? "Asset" : "Assets"}
                                            </span>
                                        </div>

                                        {/* Assets Allocated */}
                                        <div className="space-y-3">
                                            {group.assets.map((asset) => (
                                                <div key={asset._id} className="bg-slate-50 border border-slate-200/80 rounded-[12px] p-3 flex items-center justify-between gap-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-[8px] bg-white border border-slate-200 flex items-center justify-center text-[#2D79C7] shrink-0">
                                                            <Laptop className="w-4 h-4" />
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] font-bold text-[#2D79C7] bg-blue-50 px-1.5 py-0.2 rounded border border-blue-100">
                                                                    {asset.assetId}
                                                                </span>
                                                                <span className="font-bold text-xs text-[#1E1E1E]">{asset.name}</span>
                                                            </div>
                                                            <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                                                                {asset.category} · Assigned: {formatDate(asset.assignedDate)}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${conditionBadge(asset.condition)}`}>
                                                            {asset.condition}
                                                        </span>
                                                        <button
                                                            onClick={() => setConfirmDialog({ isOpen: true, type: "unassign", asset })}
                                                            className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-100 px-2.5 py-1 rounded-[6px] transition-colors cursor-pointer"
                                                        >
                                                            Unassign
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Action footer */}
                                        <div className="border-t border-[#F3F4F6] pt-3 flex justify-end">
                                            <button
                                                onClick={() => {
                                                    setAssetToAssign(null);
                                                    setPreselectedEmployeeId(emp._id);
                                                    setShowAssignModal(true);
                                                }}
                                                className="text-xs font-bold text-[#2D79C7] hover:text-[#1F5EA8] bg-blue-50 hover:bg-blue-100 border border-blue-100 px-3 py-1.5 rounded-[8px] transition-colors cursor-pointer flex items-center gap-1.5"
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
                        ? `Are you sure you want to permanently delete asset ${confirmDialog.asset?.assetId} (${confirmDialog.asset?.name})? This action cannot be undone.`
                        : `Are you sure you want to unassign asset ${confirmDialog.asset?.assetId} (${confirmDialog.asset?.name}) from ${confirmDialog.asset?.assignedTo?.fullName || "employee"}?`
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
                name: asset.name || "",
                category: asset.category || "Laptop",
                brandModel: asset.brandModel || "",
                condition: asset.condition || "Excellent",
                status: asset.status || "Available",
                assignedTo: asset.assignedTo?._id || asset.assignedTo || "",
                assignedDate: asset.assignedDate ? asset.assignedDate.split("T")[0] : "",
                serialNumber: asset.serialNumber || ""
            };
        }
        return {
            assetId: `AST-${Math.floor(1000 + Math.random() * 9000)}`,
            name: "",
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
        if (!form.assetId.trim()) errs.assetId = "Asset ID is required.";
        if (!form.name.trim()) errs.name = "Asset Name is required.";
        if (!form.category.trim()) errs.category = "Category is required.";
        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        setSubmitting(true);
        try {
            if (isEdit) {
                const res = await updateAsset(asset._id, form);
                if (res.data?.success) {
                    toast.success(res.data.message || "Asset updated successfully.");
                    onSuccess();
                }
            } else {
                const res = await createAsset(form);
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
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
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

                    <FormField label="Asset Name" required error={errors.name}>
                        <input
                            type="text"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            placeholder="e.g. MacBook Pro 16 M2 Max"
                            className={inputCls}
                        />
                    </FormField>

                    <div className="grid grid-cols-2 gap-3">
                        <FormField label="Brand / Model">
                            <input
                                type="text"
                                value={form.brandModel}
                                onChange={(e) => setForm({ ...form, brandModel: e.target.value })}
                                placeholder="e.g. Apple / A2780"
                                className={inputCls}
                            />
                        </FormField>

                        <FormField label="Serial Number">
                            <input
                                type="text"
                                value={form.serialNumber}
                                onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
                                placeholder="e.g. C02G1234MD6R"
                                className={inputCls}
                            />
                        </FormField>
                    </div>

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

                    {/* Footer Actions */}
                    <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-2">
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
                            className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-[#2D79C7] to-[#1F5EA8] hover:opacity-95 rounded-[10px] shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
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
                            <div className="font-bold text-sm text-[#1E1E1E]">{asset.name}</div>
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
                        Asset: <span className="text-[#1E1E1E]">{asset.name}</span> ({asset.assetId})
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
