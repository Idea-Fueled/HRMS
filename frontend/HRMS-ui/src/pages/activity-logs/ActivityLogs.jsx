import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
    Activity,
    Search,
    Calendar,
    Users,
    Filter,
    RefreshCw,
    MousePointer,
    Eye,
    Clock,
    Shield,
    CheckCircle2,
    Loader2,
    Compass,
    Tag,
    ChevronDown
} from "lucide-react";
import { toast } from "sonner";
import { getActivityLogs, getLogStats } from "../../services/log.service";
import { Pagination, Avatar } from "../../components/SharedComponents";

const ACTION_TYPE_OPTIONS = [
    { value: "All", label: "All Activities" },
    { value: "PAGE_VIEW", label: "Page Visits" },
    { value: "BUTTON_CLICK", label: "Button & Link Clicks" },
    { value: "PUNCH_CLOCK", label: "Attendance Punches" },
    { value: "FORM_SUBMIT", label: "Form Submissions" },
];

const formatLogTime = (dateStr) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
    });
};

const formatLogDate = (dateStr) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
};

const getActionBadge = (type) => {
    switch (type) {
        case "PAGE_VIEW":
            return {
                bg: "bg-blue-50 text-[#2D79C7] border-blue-100",
                icon: Eye,
                label: "PAGE VISIT"
            };
        case "BUTTON_CLICK":
            return {
                bg: "bg-emerald-50 text-emerald-700 border-emerald-100",
                icon: MousePointer,
                label: "CLICK"
            };
        case "PUNCH_CLOCK":
            return {
                bg: "bg-amber-50 text-amber-700 border-amber-100",
                icon: Clock,
                label: "PUNCH"
            };
        case "FORM_SUBMIT":
            return {
                bg: "bg-purple-50 text-purple-700 border-purple-100",
                icon: CheckCircle2,
                label: "SUBMIT"
            };
        default:
            return {
                bg: "bg-slate-100 text-slate-700 border-slate-200",
                icon: Activity,
                label: type || "ACTION"
            };
    }
};

const ActivityLogs = () => {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [logs, setLogs] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [stats, setStats] = useState({ todayTotal: 0, activeEmployeesToday: 0 });

    // Filter States
    const [selectedEmployee, setSelectedEmployee] = useState("All");
    const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
    const [selectedActionType, setSelectedActionType] = useState("All");
    const [searchQuery, setSearchQuery] = useState("");
    const [page, setPage] = useState(1);
    const [limit] = useState(25);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    // Fetch Logs from Backend
    const fetchLogs = useCallback(async (isSilent = false) => {
        try {
            if (!isSilent) setLoading(true);
            else setRefreshing(true);

            const res = await getActivityLogs({
                employeeId: selectedEmployee !== "All" ? selectedEmployee : undefined,
                date: selectedDate || undefined,
                actionType: selectedActionType !== "All" ? selectedActionType : undefined,
                search: searchQuery.trim() || undefined,
                page,
                limit
            });

            if (res.data?.success) {
                setLogs(res.data.logs || []);
                setTotalPages(res.data.pagination?.totalPages || 1);
                setTotalCount(res.data.pagination?.total || 0);
                if (res.data.employees && res.data.employees.length > 0) {
                    setEmployees(res.data.employees);
                }
            }
        } catch (err) {
            console.error("Failed to load activity logs:", err);
            toast.error(err.response?.data?.message || "Failed to load activity logs.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [selectedEmployee, selectedDate, selectedActionType, searchQuery, page, limit]);

    // Fetch Quick Stats
    const fetchStats = useCallback(async () => {
        try {
            const res = await getLogStats();
            if (res.data?.success) {
                setStats(res.data.stats);
            }
        } catch {
            // Non-critical, ignore
        }
    }, []);

    // Initial and filter changes
    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    // Reset page to 1 when filters change
    const handleEmployeeChange = (val) => {
        setSelectedEmployee(val);
        setPage(1);
    };

    const handleDateChange = (val) => {
        setSelectedDate(val);
        setPage(1);
    };

    const handleActionTypeChange = (val) => {
        setSelectedActionType(val);
        setPage(1);
    };

    const handleSearchChange = (val) => {
        setSearchQuery(val);
        setPage(1);
    };

    const handleTodayClick = () => {
        setSelectedDate(new Date().toISOString().split("T")[0]);
        setPage(1);
    };

    const handleClearDate = () => {
        setSelectedDate("");
        setPage(1);
    };

    return (
        <div className="space-y-6 pb-12 select-none animate-fadeIn">
            {/* Standard Header & Controls Card */}
            <div className="premium-3d-card p-5 space-y-4">
                {/* Title & Actions Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-[10px] bg-blue-50 flex items-center justify-center border border-blue-100 text-[#2D79C7] shrink-0">
                            <Activity className="w-4.5 h-4.5" strokeWidth={2.5} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-base font-bold text-[#1E1E1E] tracking-tight">
                                    User Activity Logs
                                </h1>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    Live Tracking Active
                                </span>
                            </div>
                            <p className="text-gray-400 text-xs mt-0.5">
                                Real-time audit trail and full-day tracking of pages visited and buttons clicked across HRMS.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <button
                            type="button"
                            onClick={() => {
                                fetchLogs(true);
                                fetchStats();
                            }}
                            disabled={refreshing || loading}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-slate-700 text-xs font-bold rounded-[12px] shadow-2xs transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-[#2D79C7]" : "text-gray-400"}`} />
                            <span>{refreshing ? "Refreshing..." : "Refresh Logs"}</span>
                        </button>
                    </div>
                </div>

                {/* Filters Row */}
                <div className="pt-3 border-t border-[#F3F4F6] flex flex-wrap items-center justify-between gap-3">
                    {/* Left Filter Group */}
                    <div className="flex flex-wrap items-center gap-2.5">
                        {/* Employee Dropdown Filter */}
                        <div className="relative">
                            <select
                                value={selectedEmployee}
                                onChange={(e) => handleEmployeeChange(e.target.value)}
                                className="h-[38px] bg-white border border-gray-200 text-[#1E1E1E] text-xs font-bold rounded-[12px] pl-3 pr-8 outline-none focus:border-[#2D79C7] cursor-pointer"
                            >
                                <option value="All">All Tracked Employees</option>
                                {employees.map((emp) => (
                                    <option key={emp.employeeId} value={emp.employeeId}>
                                        {emp.fullName || emp.employeeId} ({emp.employeeId} - {emp.department})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Date Picker Filter */}
                        <div className="flex items-center gap-1.5 bg-[#F8FAFC] border border-gray-200 rounded-[12px] p-1 h-[38px]">
                            <Calendar className="w-3.5 h-3.5 text-gray-400 ml-2" />
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => handleDateChange(e.target.value)}
                                className="bg-transparent text-xs font-bold text-slate-800 outline-none pr-2 cursor-pointer"
                            />
                            <button
                                type="button"
                                onClick={handleTodayClick}
                                className={`text-[10.5px] font-bold px-2 py-0.5 rounded-[6px] transition-colors cursor-pointer border ${
                                    selectedDate === new Date().toISOString().split("T")[0]
                                        ? "bg-blue-50 text-[#2D79C7] border-blue-200"
                                        : "hover:bg-white text-gray-500 border-transparent"
                                }`}
                            >
                                Today
                            </button>
                            {selectedDate && (
                                <button
                                    type="button"
                                    onClick={handleClearDate}
                                    className="text-[10px] font-semibold text-gray-400 hover:text-gray-700 px-1 cursor-pointer"
                                    title="View All Dates"
                                >
                                    Clear
                                </button>
                            )}
                        </div>

                        {/* Action Type Filter */}
                        <div className="relative">
                            <select
                                value={selectedActionType}
                                onChange={(e) => handleActionTypeChange(e.target.value)}
                                className="h-[38px] bg-white border border-gray-200 text-[#1E1E1E] text-xs font-bold rounded-[12px] pl-3 pr-8 outline-none focus:border-[#2D79C7] cursor-pointer"
                            >
                                {ACTION_TYPE_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Right: Search Input */}
                    <div className="relative w-full sm:w-64">
                        <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            placeholder="Search action or page..."
                            className="w-full pl-9 pr-3 h-[38px] bg-white border border-gray-200 rounded-[12px] text-xs text-[#1E1E1E] focus:outline-none focus:border-[#2D79C7] transition-all placeholder-gray-400 shadow-inner"
                        />
                    </div>
                </div>
            </div>

            {/* Main Logs Table Card */}
            <div className="premium-3d-card flex flex-col overflow-hidden">
                <div className="px-5 py-4 border-b border-[#F3F4F6] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                        <h3 className="font-bold text-[#1E1E1E] text-xs tracking-wide">
                            {selectedDate 
                                ? `Chronological Activity Feed (${formatLogDate(selectedDate)})`
                                : "All-Time Chronological Activity Feed"
                            }
                        </h3>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                            Showing {totalCount} total logged events (Management personnel excluded from tracking)
                        </p>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-gray-500 font-medium">
                        <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#2D79C7]" /> Page Visit
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Click / Action
                        </span>
                    </div>
                </div>

                {loading ? (
                    <div className="p-16 flex flex-col items-center justify-center gap-3 text-gray-400">
                        <Loader2 className="w-8 h-8 animate-spin text-[#2D79C7]" />
                        <span className="text-xs font-bold">Loading activity logs...</span>
                    </div>
                ) : logs.length === 0 ? (
                    <div className="p-16 flex flex-col items-center justify-center gap-2 text-gray-400">
                        <Activity className="w-10 h-10 stroke-[1.5]" />
                        <p className="text-sm font-bold text-gray-700">No activity logs found</p>
                        <p className="text-xs">
                            {selectedDate 
                                ? `No tracked activity recorded for ${formatLogDate(selectedDate)}. Try selecting another date.`
                                : "Try adjusting your search or employee filters."
                            }
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-gray-50/80 text-gray-500 font-extrabold uppercase text-[10px] tracking-wider border-b border-[#F3F4F6]">
                                    <th className="py-3 px-4 w-40">Timestamp</th>
                                    <th className="py-3 px-4 w-60">Employee</th>
                                    <th className="py-3 px-3 w-32">Activity Type</th>
                                    <th className="py-3 px-4">Action / Event Details</th>
                                    <th className="py-3 px-4 w-48">Location / Page</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#F3F4F6] font-medium text-slate-700">
                                {logs.map((log) => {
                                    const badge = getActionBadge(log.actionType);
                                    const BadgeIcon = badge.icon;

                                    return (
                                        <tr key={log._id} className="hover:bg-slate-50/60 transition-colors">
                                            {/* Timestamp */}
                                            <td className="py-3 px-4 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span className="font-extrabold text-slate-900 font-mono text-xs">
                                                        {formatLogTime(log.timestamp)}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400 font-medium">
                                                        {formatLogDate(log.timestamp)}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Employee info */}
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-2.5">
                                                    <Avatar
                                                        name={log.userName || log.employeeId}
                                                        size="w-7 h-7"
                                                        textSize="text-[10px]"
                                                    />
                                                    <div className="min-w-0">
                                                        <span className="font-bold text-slate-900 block leading-tight text-xs truncate">
                                                            {log.userName || log.employeeId}
                                                        </span>
                                                        <span className="text-[10px] text-gray-400 block font-semibold mt-0.5 truncate">
                                                            {log.employeeId} · {log.userDepartment || "General"}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Activity Type Badge */}
                                            <td className="py-3 px-3 whitespace-nowrap">
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border ${badge.bg}`}>
                                                    <BadgeIcon className="w-2.5 h-2.5 shrink-0" />
                                                    <span>{badge.label}</span>
                                                </span>
                                            </td>

                                            {/* Action / Event Description */}
                                            <td className="py-3 px-4">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="font-bold text-slate-800 text-xs">
                                                        {log.action}
                                                    </span>
                                                    {log.details && (
                                                        <span className="text-[10.5px] text-gray-500 font-mono">
                                                            {typeof log.details === "object" 
                                                                ? JSON.stringify(log.details)
                                                                : log.details
                                                            }
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Location / Page */}
                                            <td className="py-3 px-4 whitespace-nowrap">
                                                <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-100 text-slate-700 font-mono text-[11px] border border-slate-200/60">
                                                    <Compass className="w-3 h-3 text-slate-400" />
                                                    <span>{log.page || "/"}</span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination Footer */}
                {!loading && totalCount > 0 && (
                    <Pagination
                        total={totalCount}
                        limit={limit}
                        currentPage={page}
                        onPageChange={setPage}
                    />
                )}
            </div>
        </div>
    );
};

export default ActivityLogs;
