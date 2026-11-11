import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
    CheckSquare,
    Check,
    X,
    Search,
    RefreshCw,
    Calendar,
    Clock,
    AlertCircle,
    CheckCircle2,
    XCircle,
    Filter,
    FileText,
    Users,
    MessageSquare,
    ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getTeamLeaves, updateLeaveStatus } from "../../services/team.service";
import { Avatar } from "../../components/SharedComponents";

export default function Approvals() {
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();

    // Leaves state
    const [leaves, setLeaves] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [processingId, setProcessingId] = useState(null);

    // Filters and search
    const [statusFilter, setStatusFilter] = useState("pending"); // "pending" | "approved" | "rejected" | "all"
    const [searchQuery, setSearchQuery] = useState("");

    // Optional Reject Modal with remarks
    const [rejectModalData, setRejectModalData] = useState(null);
    const [rejectRemarks, setRejectRemarks] = useState("");
    const [submittingReject, setSubmittingReject] = useState(false);

    // Target leave highlighting from query params (?leaveId=...)
    const targetLeaveId = searchParams.get("leaveId");
    const targetCardRef = useRef(null);

    // Fetch team leaves
    const fetchLeaves = useCallback(async (isSilent = false) => {
        try {
            if (!isSilent) setLoading(true);
            else setRefreshing(true);

            const res = await getTeamLeaves();
            if (res.data?.success) {
                const list = res.data.leaves || [];
                setLeaves(list);
            } else {
                toast.error(res.data?.message || "Failed to load leave requests.");
            }
        } catch (err) {
            console.error("Fetch leaves error:", err);
            toast.error(err.response?.data?.message || "Failed to communicate with DB.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchLeaves();
    }, [fetchLeaves]);

    // Calculate dynamic stats
    const stats = useMemo(() => {
        let pending = 0;
        let approved = 0;
        let rejected = 0;

        leaves.forEach((l) => {
            const st = (l.rawStatus || l.status || "").toLowerCase();
            if (st === "pending") pending++;
            else if (st === "approved") approved++;
            else if (st === "rejected") rejected++;
        });

        return {
            pending,
            approved,
            rejected,
            total: leaves.length,
        };
    }, [leaves]);

    // If targetLeaveId is in query param, auto-switch to "all" if not visible in default pending tab
    useEffect(() => {
        if (targetLeaveId && leaves.length > 0) {
            const targetLeave = leaves.find((l) => l._id === targetLeaveId);
            if (targetLeave) {
                const targetStatus = (targetLeave.rawStatus || targetLeave.status || "").toLowerCase();
                if (targetStatus !== "pending" && statusFilter === "pending") {
                    setStatusFilter(targetStatus);
                }
                // Scroll to target card smoothly
                setTimeout(() => {
                    if (targetCardRef.current) {
                        targetCardRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
                    }
                }, 300);
            }
        }
    }, [targetLeaveId, leaves]);

    // Handle Approve / Reject actions
    const handleAction = async (leaveId, status, remarks = "") => {
        try {
            setProcessingId(leaveId);
            const res = await updateLeaveStatus(leaveId, status, remarks);
            if (res.data?.success) {
                toast.success(
                    status === "approved"
                        ? "🟢 Leave request approved successfully!"
                        : "🔴 Leave request marked as rejected."
                );

                // Update local state optimistically
                setLeaves((prev) =>
                    prev.map((item) =>
                        item._id === leaveId
                            ? {
                                  ...item,
                                  status: status.charAt(0).toUpperCase() + status.slice(1).toLowerCase(),
                                  rawStatus: status.toLowerCase(),
                                  remarks: remarks || item.remarks,
                              }
                            : item
                    )
                );

                // Notify any listeners across the app (like Sidebar badges)
                window.dispatchEvent(new CustomEvent("hrms:leave_status_updated"));
            } else {
                toast.error(res.data?.message || `Failed to update status to ${status}.`);
            }
        } catch (err) {
            console.error("Action error:", err);
            toast.error(err.response?.data?.message || "Failed to update leave status.");
        } finally {
            setProcessingId(null);
            if (rejectModalData) {
                setRejectModalData(null);
                setRejectRemarks("");
                setSubmittingReject(false);
            }
        }
    };

    // Filtered leave applications
    const filteredLeaves = useMemo(() => {
        return leaves.filter((req) => {
            const raw = (req.rawStatus || req.status || "").toLowerCase();

            // Status filter
            if (statusFilter !== "all" && raw !== statusFilter) {
                return false;
            }

            // Search query filter
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const name = (req.name || "").toLowerCase();
                const code = (req.code || "").toLowerCase();
                const dept = (req.dept || "").toLowerCase();
                const desig = (req.designation || "").toLowerCase();
                const reason = (req.reason || "").toLowerCase();
                const type = (req.type || req.leaveType || "").toLowerCase();

                return (
                    name.includes(q) ||
                    code.includes(q) ||
                    dept.includes(q) ||
                    desig.includes(q) ||
                    reason.includes(q) ||
                    type.includes(q)
                );
            }

            return true;
        });
    }, [leaves, statusFilter, searchQuery]);

    return (
        <div className="min-h-full flex flex-col bg-[#F8FAFC] select-none">
            {/* ─────────────────────────────────────────────
               TOP HEADER
            ───────────────────────────────────────────── */}
            <div className="bg-white border-b border-slate-200/80 px-4 sm:px-8 py-4 sm:py-6">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3 sm:gap-3.5">
                        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-[#2D79C7] to-[#1F5EA8] flex items-center justify-center text-white shadow-md shadow-blue-500/10 shrink-0">
                            <CheckSquare className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
                                <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">Leaves / Approvals Hub</h1>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-blue-50 text-[#2D79C7] border border-blue-100">
                                    Direct Management
                                </span>
                            </div>
                            <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5">
                                Review, approve, or reject employee leave requests with one-click instant sync
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5 self-start md:self-auto">
                        <button
                            type="button"
                            onClick={() => fetchLeaves(true)}
                            disabled={refreshing || loading}
                            className="flex items-center gap-2 px-3.5 sm:px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 shadow-2xs transition-all cursor-pointer disabled:opacity-60"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${refreshing ? "animate-spin text-[#2D79C7]" : ""}`} />
                            <span>{refreshing ? "Syncing..." : "Refresh"}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* ─────────────────────────────────────────────
               METRIC SUMMARY CARDS
            ───────────────────────────────────────────── */}
            <div className="max-w-7xl mx-auto w-full px-3.5 sm:px-8 pt-4 sm:pt-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    {/* Pending Card */}
                    <div
                        onClick={() => setStatusFilter("pending")}
                        className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                            statusFilter === "pending"
                                ? "bg-amber-50/80 border-amber-300 ring-2 ring-amber-400/30 shadow-sm"
                                : "bg-white border-slate-200 hover:border-slate-300 shadow-2xs"
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-500">Pending Review</span>
                            <span className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                                <Clock className="w-4 h-4" />
                            </span>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-black text-amber-700 tabular-nums">{stats.pending}</span>
                            <span className="text-[11px] font-semibold text-slate-400">Applications</span>
                        </div>
                        <p className="text-[11px] text-amber-600/90 font-medium mt-1">Requires manager action</p>
                    </div>

                    {/* Approved Card */}
                    <div
                        onClick={() => setStatusFilter("approved")}
                        className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                            statusFilter === "approved"
                                ? "bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-400/30 shadow-sm"
                                : "bg-white border-slate-200 hover:border-slate-300 shadow-2xs"
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-500">Approved Leaves</span>
                            <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                                <CheckCircle2 className="w-4 h-4" />
                            </span>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-black text-emerald-700 tabular-nums">{stats.approved}</span>
                            <span className="text-[11px] font-semibold text-slate-400">Approved</span>
                        </div>
                        <p className="text-[11px] text-emerald-600/90 font-medium mt-1">Granted leaves</p>
                    </div>

                    {/* Rejected Card */}
                    <div
                        onClick={() => setStatusFilter("rejected")}
                        className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                            statusFilter === "rejected"
                                ? "bg-rose-50/80 border-rose-300 ring-2 ring-rose-400/30 shadow-sm"
                                : "bg-white border-slate-200 hover:border-slate-300 shadow-2xs"
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-500">Rejected</span>
                            <span className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                                <XCircle className="w-4 h-4" />
                            </span>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-black text-rose-700 tabular-nums">{stats.rejected}</span>
                            <span className="text-[11px] font-semibold text-slate-400">Applications</span>
                        </div>
                        <p className="text-[11px] text-rose-600/90 font-medium mt-1">Declined requests</p>
                    </div>

                    {/* Total Applications Card */}
                    <div
                        onClick={() => setStatusFilter("all")}
                        className={`p-5 rounded-2xl border transition-all cursor-pointer ${
                            statusFilter === "all"
                                ? "bg-blue-50/80 border-blue-300 ring-2 ring-blue-400/30 shadow-sm"
                                : "bg-white border-slate-200 hover:border-slate-300 shadow-2xs"
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-500">Total Applications</span>
                            <span className="w-7 h-7 rounded-lg bg-blue-100 text-[#2D79C7] flex items-center justify-center font-bold">
                                <FileText className="w-4 h-4" />
                            </span>
                        </div>
                        <div className="mt-3 flex items-baseline gap-2">
                            <span className="text-2xl font-black text-slate-800 tabular-nums">{stats.total}</span>
                            <span className="text-[11px] font-semibold text-slate-400">Total Records</span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-medium mt-1">All time applications</p>
                    </div>
                </div>
            </div>

            {/* ─────────────────────────────────────────────
               CONTROLS (TABS & SEARCH)
            ───────────────────────────────────────────── */}
            <div className="max-w-7xl mx-auto w-full px-3.5 sm:px-8 pt-4 sm:pt-6 pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200 shadow-2xs">
                    {/* Status Tabs */}
                    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 sm:pb-0 shrink-0">
                        <button
                            type="button"
                            onClick={() => setStatusFilter("pending")}
                            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                                statusFilter === "pending"
                                    ? "bg-[#2D79C7] text-white shadow-xs"
                                    : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                            }`}
                        >
                            <span>Pending</span>
                            <span
                                className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                                    statusFilter === "pending"
                                        ? "bg-white text-[#2D79C7]"
                                        : "bg-amber-100 text-amber-800"
                                }`}
                            >
                                {stats.pending}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setStatusFilter("approved")}
                            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                                statusFilter === "approved"
                                    ? "bg-[#2D79C7] text-white shadow-xs"
                                    : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                            }`}
                        >
                            <span>Approved</span>
                            <span
                                className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                                    statusFilter === "approved"
                                        ? "bg-white text-[#2D79C7]"
                                        : "bg-emerald-100 text-emerald-800"
                                }`}
                            >
                                {stats.approved}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setStatusFilter("rejected")}
                            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                                statusFilter === "rejected"
                                    ? "bg-[#2D79C7] text-white shadow-xs"
                                    : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                            }`}
                        >
                            <span>Rejected</span>
                            <span
                                className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                                    statusFilter === "rejected"
                                        ? "bg-white text-[#2D79C7]"
                                        : "bg-rose-100 text-rose-800"
                                }`}
                            >
                                {stats.rejected}
                            </span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setStatusFilter("all")}
                            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                                statusFilter === "all"
                                    ? "bg-[#2D79C7] text-white shadow-xs"
                                    : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                            }`}
                        >
                            <span>All Records</span>
                            <span
                                className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                                    statusFilter === "all"
                                        ? "bg-white text-[#2D79C7]"
                                        : "bg-slate-200 text-slate-700"
                                }`}
                            >
                                {stats.total}
                            </span>
                        </button>
                    </div>

                    {/* Search Input */}
                    <div className="relative w-full sm:w-80">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by employee, dept, reason..."
                            className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2D79C7]/20 focus:border-[#2D79C7] transition-all"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery("")}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* ─────────────────────────────────────────────
               LEAVES GRID
            ───────────────────────────────────────────── */}
            <div className="max-w-7xl mx-auto w-full px-3.5 sm:px-8 pb-12 flex-1">
                {loading ? (
                    <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center text-slate-400 shadow-2xs">
                        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#2D79C7] mb-3" />
                        <h3 className="text-sm font-bold text-slate-700">Loading leave applications...</h3>
                        <p className="text-xs text-slate-400 mt-1">Please wait while we sync with the database.</p>
                    </div>
                ) : filteredLeaves.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center text-slate-400 shadow-2xs">
                        <CheckSquare className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                        <h3 className="text-base font-bold text-slate-800">No leave requests found</h3>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                            {searchQuery
                                ? `No applications matched "${searchQuery}". Try searching with another keyword.`
                                : `There are currently no leave requests in the "${statusFilter}" category.`}
                        </p>
                        {(searchQuery || statusFilter !== "all") && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchQuery("");
                                    setStatusFilter("all");
                                }}
                                className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                            >
                                Reset Filters
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4.5">
                        {filteredLeaves.map((req) => {
                            const rawStatus = (req.rawStatus || req.status || "").toLowerCase();
                            const isPending = rawStatus === "pending";
                            const isApproved = rawStatus === "approved";
                            const isRejected = rawStatus === "rejected";
                            const isTarget = targetLeaveId === req._id;

                            return (
                                <div
                                    key={req._id}
                                    ref={isTarget ? targetCardRef : null}
                                    className={`bg-white rounded-2xl p-5 border transition-all flex flex-col justify-between ${
                                        isTarget
                                            ? "border-amber-400 ring-4 ring-amber-300/40 shadow-lg shadow-amber-500/10"
                                            : "border-slate-200/90 hover:border-slate-300 shadow-2xs hover:shadow-sm"
                                    }`}
                                >
                                    <div className="space-y-3.5">
                                        {/* Employee Header */}
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <Avatar
                                                    src={req.profilePicture}
                                                    name={req.name}
                                                    size="w-10 h-10 text-xs font-bold"
                                                />
                                                <div>
                                                    <h3 className="text-sm font-bold text-slate-900 leading-tight">
                                                        {req.name}
                                                    </h3>
                                                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                                                        {req.designation ? `${req.designation} • ` : ""}
                                                        {req.dept || "General"}
                                                        {req.code ? ` • ${req.code}` : ""}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Status Badge */}
                                            {isPending ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                                    Pending Review
                                                </span>
                                            ) : isApproved ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                                                    <Check className="w-3 h-3 text-emerald-600" />
                                                    Approved
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
                                                    <X className="w-3 h-3 text-rose-600" />
                                                    Rejected
                                                </span>
                                            )}
                                        </div>

                                        {/* Metadata Row */}
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-blue-50 text-[#2D79C7] border border-blue-100">
                                                {req.type || req.leaveType || "Leave Application"}
                                            </span>

                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                                <Calendar className="w-3 h-3 text-slate-400" />
                                                <span>
                                                    {req.start}
                                                    {req.end && req.end !== req.start ? ` → ${req.end}` : ""}
                                                </span>
                                            </span>

                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-slate-100 text-slate-800 border border-slate-200">
                                                <Clock className="w-3 h-3 text-slate-400" />
                                                <span>{req.duration || `${req.totalDays} Day(s)`}</span>
                                            </span>
                                        </div>

                                        {/* Reason Container */}
                                        <div className="p-3 bg-slate-50/90 border border-slate-200/80 rounded-xl">
                                            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                                                Reason for leave
                                            </span>
                                            <p className="text-xs text-slate-700 font-medium leading-relaxed italic">
                                                "{req.reason || "No detailed reason provided."}"
                                            </p>
                                        </div>

                                        {/* Optional Remarks if already evaluated */}
                                        {req.remarks && (
                                            <div className="p-2.5 bg-amber-50/50 border border-amber-200/60 rounded-xl text-[11px] text-amber-900">
                                                <span className="font-bold">Manager Remarks: </span>
                                                <span>{req.remarks}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Footer Actions */}
                                    <div className="mt-4 pt-3.5 border-t border-slate-150 flex items-center justify-between gap-3">
                                        <span className="text-[10px] text-slate-400 font-medium">
                                            Applied: {req.appliedDate || "Recently"}
                                        </span>

                                        {isPending ? (
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    disabled={processingId === req._id}
                                                    onClick={() => handleAction(req._id, "approved")}
                                                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
                                                >
                                                    <Check className="w-3.5 h-3.5" />
                                                    <span>{processingId === req._id ? "Processing..." : "Approve 🟢"}</span>
                                                </button>

                                                <button
                                                    type="button"
                                                    disabled={processingId === req._id}
                                                    onClick={() => {
                                                        setRejectModalData(req);
                                                        setRejectRemarks("");
                                                    }}
                                                    className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                    <span>Reject 🔴</span>
                                                </button>
                                            </div>
                                        ) : (
                                            <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                                                {isApproved ? (
                                                    <>
                                                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                                                        <span>Decision: Approved</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <X className="w-3.5 h-3.5 text-rose-600" />
                                                        <span>Decision: Rejected</span>
                                                    </>
                                                )}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ─────────────────────────────────────────────
               REJECT MODAL WITH OPTIONAL REMARKS
            ───────────────────────────────────────────── */}
            {rejectModalData && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-fadeIn"
                    onClick={() => {
                        if (!submittingReject) setRejectModalData(null);
                    }}
                >
                    <div
                        className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden p-6 space-y-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center font-bold">
                                    <X className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900">Reject Leave Application</h3>
                                    <p className="text-[11px] text-slate-500 font-medium">
                                        For {rejectModalData.name} ({rejectModalData.type})
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setRejectModalData(null)}
                                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1.5">
                                Reason for Rejection / Remarks (Optional)
                            </label>
                            <textarea
                                rows={3}
                                value={rejectRemarks}
                                onChange={(e) => setRejectRemarks(e.target.value)}
                                placeholder="E.g., Peak project delivery week, insufficient team coverage, etc..."
                                className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400"
                            />
                        </div>

                        <div className="flex items-center justify-end gap-2.5 pt-2">
                            <button
                                type="button"
                                disabled={submittingReject}
                                onClick={() => setRejectModalData(null)}
                                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200 cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={submittingReject}
                                onClick={() => {
                                    setSubmittingReject(true);
                                    handleAction(rejectModalData._id, "rejected", rejectRemarks);
                                }}
                                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
                            >
                                {submittingReject ? "Rejecting..." : "Confirm Rejection"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
