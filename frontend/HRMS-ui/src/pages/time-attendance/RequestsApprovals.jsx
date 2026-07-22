import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
    FileText,
    CheckCircle2,
    XCircle,
    Clock,
    Search,
    User,
    Calendar,
    Check,
    X,
    Filter,
    AlertCircle,
    Home,
    FileCheck
} from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "../../components/SharedComponents";
import { getTeamLeaves, updateLeaveStatus } from "../../services/team.service";

export const RequestsApprovals = () => {
    const [leaves, setLeaves] = useState([]);
    const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, onLeave: 0 });
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState("All"); // 'All' | 'Pending' | 'Approved' | 'Rejected'
    const [processingId, setProcessingId] = useState(null);

    const fetchRequests = useCallback(async () => {
        try {
            setLoading(true);
            const res = await getTeamLeaves();
            if (res.data?.success) {
                setLeaves(res.data.leaves || []);
                if (res.data.stats) setStats(res.data.stats);
            }
        } catch (err) {
            console.error("Fetch requests error:", err);
            toast.error("Failed to load requests & approvals.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    const handleStatusUpdate = async (id, status) => {
        try {
            setProcessingId(id);
            const res = await updateLeaveStatus(id, status);
            if (res.data?.success) {
                toast.success(`Request ${status} successfully.`);
                await fetchRequests();
            } else {
                toast.error(res.data?.message || "Failed to update request status.");
            }
        } catch (err) {
            console.error("Status update error:", err);
            toast.error("Failed to update status.");
        } finally {
            setProcessingId(null);
        }
    };

    const filteredRequests = useMemo(() => {
        let list = leaves;

        if (filterStatus !== "All") {
            list = list.filter(l => l.status.toLowerCase() === filterStatus.toLowerCase());
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(l =>
                l.name.toLowerCase().includes(q) ||
                l.dept.toLowerCase().includes(q) ||
                l.type.toLowerCase().includes(q) ||
                (l.reason && l.reason.toLowerCase().includes(q))
            );
        }

        return list;
    }, [leaves, filterStatus, searchQuery]);

    const statusBadgeStyles = {
        Pending: "bg-amber-50 text-amber-700 border-amber-100",
        Approved: "bg-emerald-50 text-emerald-700 border-emerald-100",
        Rejected: "bg-rose-50 text-rose-700 border-rose-100"
    };

    return (
        <div className="space-y-6 text-left select-none animate-fadeIn pb-12">
            
            {/* Top Metrics Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="premium-3d-card p-5">
                    <div className="flex items-center justify-between">
                        <span className="text-gray-500 text-xs font-bold uppercase tracking-wider">Pending Requests</span>
                        <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                            <Clock className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-[#1E1E1E] text-2xl font-extrabold font-mono mt-2">{stats.pending}</div>
                    <span className="text-[11px] text-gray-400 font-medium">Awaiting manager review</span>
                </div>

                <div className="premium-3d-card p-5">
                    <div className="flex items-center justify-between">
                        <span className="text-gray-500 text-xs font-bold uppercase tracking-wider">Approved Requests</span>
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                            <CheckCircle2 className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-[#1E1E1E] text-2xl font-extrabold font-mono mt-2">{stats.approved}</div>
                    <span className="text-[11px] text-gray-400 font-medium">Successfully processed</span>
                </div>

                <div className="premium-3d-card p-5">
                    <div className="flex items-center justify-between">
                        <span className="text-gray-500 text-xs font-bold uppercase tracking-wider">Rejected Requests</span>
                        <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
                            <XCircle className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-[#1E1E1E] text-2xl font-extrabold font-mono mt-2">{stats.rejected}</div>
                    <span className="text-[11px] text-gray-400 font-medium">Declined applications</span>
                </div>

                <div className="premium-3d-card p-5">
                    <div className="flex items-center justify-between">
                        <span className="text-gray-500 text-xs font-bold uppercase tracking-wider">On Leave Today</span>
                        <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#2D79C7]">
                            <Calendar className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-[#2D79C7] text-2xl font-extrabold font-mono mt-2">{stats.onLeave}</div>
                    <span className="text-[11px] text-gray-400 font-medium">Staff out of office today</span>
                </div>
            </div>

            {/* Requests Table Card */}
            <div className="premium-3d-card p-6 space-y-4">
                
                {/* Header & Filter Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E7EB]">
                    <div>
                        <h2 className="text-[#1E1E1E] text-[17px] font-extrabold flex items-center gap-2">
                            <FileCheck className="w-5 h-5 text-[#2D79C7]" />
                            <span>Attendance & Leave Requests</span>
                        </h2>
                        <p className="text-gray-500 text-xs font-medium mt-0.5">
                            Manage leave applications, WFH requests, and regularization claims from employees.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Status Filter Tabs */}
                        <div className="flex items-center bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl p-1 text-xs font-semibold">
                            {["All", "Pending", "Approved", "Rejected"].map((st) => (
                                <button
                                    key={st}
                                    type="button"
                                    onClick={() => setFilterStatus(st)}
                                    className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                                        filterStatus === st
                                            ? "bg-[#2D79C7] text-white font-bold shadow-sm"
                                            : "text-gray-500 hover:text-gray-800"
                                    }`}
                                >
                                    {st}
                                </button>
                            ))}
                        </div>

                        {/* Search Input */}
                        <div className="relative">
                            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by name, dept, type..."
                                className="pl-9 pr-3 py-1.5 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl text-xs font-medium text-gray-700 focus:outline-none focus:border-[#2D79C7] w-56"
                            />
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto w-full">
                    <table className="w-full border-collapse text-left whitespace-nowrap">
                        <thead>
                            <tr className="bg-[#F8FAFC] text-gray-400 text-[11px] uppercase font-bold border-b border-[#E5E7EB]">
                                <th className="py-3.5 px-4">Employee</th>
                                <th className="py-3.5 px-4">Request Type</th>
                                <th className="py-3.5 px-4">Date Range</th>
                                <th className="py-3.5 px-4">Duration</th>
                                <th className="py-3.5 px-4">Reason / Notes</th>
                                <th className="py-3.5 px-4">Status</th>
                                <th className="py-3.5 px-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-xs font-semibold text-gray-700">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="py-12 text-center text-gray-400 font-medium">
                                        Loading requests from MongoDB...
                                    </td>
                                </tr>
                            ) : filteredRequests.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="py-12 text-center text-gray-400 font-medium">
                                        No requests found matching current filter criteria.
                                    </td>
                                </tr>
                            ) : (
                                filteredRequests.map((req) => (
                                    <tr key={req._id} className="hover:bg-[#F8FAFC] transition-colors">
                                        <td className="py-3.5 px-4">
                                            <div className="flex items-center gap-3">
                                                <Avatar name={req.name} size="w-8 h-8" textSize="text-xs" />
                                                <div>
                                                    <span className="text-[#1E1E1E] font-bold block">{req.name}</span>
                                                    <span className="text-gray-400 text-[10.5px] font-medium">{req.dept}</span>
                                                </div>
                                            </div>
                                        </td>

                                        <td className="py-3.5 px-4">
                                            <span className="bg-blue-50 text-[#2D79C7] border border-blue-100 px-2.5 py-1 rounded-md text-[11px] font-bold">
                                                {req.type}
                                            </span>
                                        </td>

                                        <td className="py-3.5 px-4 font-mono font-bold text-gray-800">
                                            {req.start} to {req.end}
                                        </td>

                                        <td className="py-3.5 px-4 text-gray-600 font-bold font-mono">
                                            {req.duration}
                                        </td>

                                        <td className="py-3.5 px-4 text-gray-500 font-medium max-w-xs truncate">
                                            {req.reason || "No reason specified."}
                                        </td>

                                        <td className="py-3.5 px-4">
                                            <span className={`text-[10.5px] font-bold px-2.5 py-0.5 rounded-md border ${statusBadgeStyles[req.status] || "bg-gray-100 text-gray-700"}`}>
                                                {req.status}
                                            </span>
                                        </td>

                                        <td className="py-3.5 px-4 text-right">
                                            {req.status === "Pending" ? (
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        type="button"
                                                        disabled={processingId === req._id}
                                                        onClick={() => handleStatusUpdate(req._id, "approved")}
                                                        className="flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer"
                                                    >
                                                        <Check className="w-3.5 h-3.5" />
                                                        <span>Approve</span>
                                                    </button>

                                                    <button
                                                        type="button"
                                                        disabled={processingId === req._id}
                                                        onClick={() => handleStatusUpdate(req._id, "rejected")}
                                                        className="flex items-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                        <span>Reject</span>
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 text-xs font-medium">Completed</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

            </div>

        </div>
    );
};

export default RequestsApprovals;
