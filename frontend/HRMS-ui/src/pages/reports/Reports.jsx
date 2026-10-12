import React, { useState, useEffect, useMemo } from "react";
import {
    Calendar,
    BarChart3,
    Clock,
    Zap,
    Users,
    Mail,
    Download,
    ChevronLeft,
    ChevronRight,
    Search,
    Loader2
} from "lucide-react";
import { toast } from "sonner";
import {
    getWeeklyReport,
    getMonthlyReport,
    sendWeeklyReportEmail,
    sendMonthlyReportEmail
} from "../../services/report.service.js";
import { Pagination, Avatar } from "../../components/SharedComponents";

const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

const PAGE_SIZE = 10;

const Reports = () => {
    const [viewMode, setViewMode] = useState("weekly"); // "weekly" | "monthly"
    const [loading, setLoading] = useState(false);
    const [sendingEmail, setSendingEmail] = useState(false);

    // Filters & Navigation State
    const [selectedDate, setSelectedDate] = useState(() => new Date());
    const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth() + 1); // 1-12
    const [selectedDepartment, setSelectedDepartment] = useState("All");
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);

    // Data State
    const [weeklyData, setWeeklyData] = useState(null);
    const [monthlyData, setMonthlyData] = useState(null);

    // Fetch Weekly Report
    const fetchWeekly = async (dateParam, deptParam) => {
        try {
            setLoading(true);
            const dateStr = dateParam instanceof Date ? dateParam.toISOString().split("T")[0] : dateParam;
            const res = await getWeeklyReport({
                date: dateStr,
                department: deptParam !== "All" ? deptParam : undefined
            });
            if (res.data?.success) {
                setWeeklyData(res.data.report);
            }
        } catch (err) {
            console.error("Error fetching weekly report:", err);
            toast.error(err.response?.data?.message || "Failed to load weekly report.");
        } finally {
            setLoading(false);
        }
    };

    // Fetch Monthly Report
    const fetchMonthly = async (yr, mo, deptParam) => {
        try {
            setLoading(true);
            const res = await getMonthlyReport({
                year: yr,
                month: mo,
                department: deptParam !== "All" ? deptParam : undefined
            });
            if (res.data?.success) {
                setMonthlyData(res.data.report);
            }
        } catch (err) {
            console.error("Error fetching monthly report:", err);
            toast.error(err.response?.data?.message || "Failed to load monthly report.");
        } finally {
            setLoading(false);
        }
    };

    // Initial and reactive load
    useEffect(() => {
        if (viewMode === "weekly") {
            fetchWeekly(selectedDate, selectedDepartment);
        } else {
            fetchMonthly(selectedYear, selectedMonth, selectedDepartment);
        }
    }, [viewMode, selectedDate, selectedYear, selectedMonth, selectedDepartment]);

    // Reset pagination when mode or filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [viewMode, selectedDepartment, searchQuery, selectedDate, selectedMonth, selectedYear]);

    // Navigate Weeks
    const handlePrevWeek = () => {
        setSelectedDate(prev => {
            const next = new Date(prev);
            next.setDate(next.getDate() - 7);
            return next;
        });
    };

    const handleNextWeek = () => {
        setSelectedDate(prev => {
            const next = new Date(prev);
            next.setDate(next.getDate() + 7);
            return next;
        });
    };

    const handleCurrentWeek = () => {
        setSelectedDate(new Date());
    };

    // Trigger Email Dispatch
    const handleSendEmail = async () => {
        try {
            setSendingEmail(true);
            if (viewMode === "weekly") {
                const dateStr = selectedDate.toISOString().split("T")[0];
                const res = await sendWeeklyReportEmail({
                    date: dateStr,
                    department: selectedDepartment !== "All" ? selectedDepartment : undefined
                });
                if (res.data?.success) {
                    toast.success(res.data.message || "Weekly report emailed to Global Admins!");
                }
            } else {
                const res = await sendMonthlyReportEmail({
                    year: selectedYear,
                    month: selectedMonth,
                    department: selectedDepartment !== "All" ? selectedDepartment : undefined
                });
                if (res.data?.success) {
                    toast.success(res.data.message || "Monthly report emailed to Global Admins!");
                }
            }
        } catch (err) {
            console.error("Error triggering report email:", err);
            toast.error(err.response?.data?.message || "Failed to dispatch report email.");
        } finally {
            setSendingEmail(false);
        }
    };

    // Filter employees by search query
    const filteredEmployees = useMemo(() => {
        const list = viewMode === "weekly" 
            ? (weeklyData?.employees || [])
            : (monthlyData?.employees || []);

        if (!searchQuery.trim()) return list;
        const q = searchQuery.toLowerCase().trim();
        return list.filter(e => 
            e.fullName?.toLowerCase().includes(q) ||
            e.employeeId?.toLowerCase().includes(q) ||
            e.department?.toLowerCase().includes(q)
        );
    }, [viewMode, weeklyData, monthlyData, searchQuery]);

    // Paginated slice
    const paginatedEmployees = useMemo(() => {
        const startIndex = (currentPage - 1) * PAGE_SIZE;
        return filteredEmployees.slice(startIndex, startIndex + PAGE_SIZE);
    }, [filteredEmployees, currentPage]);

    // Export to CSV
    const handleExportCSV = () => {
        if (viewMode === "weekly" && weeklyData) {
            const headers = ["Employee ID,Name,Department,Designation,Mon Work,Tue Work,Wed Work,Thu Work,Fri Work,Total Work Hours,Total Breaks,Total Overtime,Days Present"];
            const rows = filteredEmployees.map(e => [
                `"${e.employeeId}"`,
                `"${e.fullName}"`,
                `"${e.department || ''}"`,
                `"${e.designation || ''}"`,
                `"${e.days.mon?.workDisplay || '0h'}"`,
                `"${e.days.tue?.workDisplay || '0h'}"`,
                `"${e.days.wed?.workDisplay || '0h'}"`,
                `"${e.days.thu?.workDisplay || '0h'}"`,
                `"${e.days.fri?.workDisplay || '0h'}"`,
                `"${e.totalWorkDisplay}"`,
                `"${e.totalBreakDisplay}"`,
                `"${e.totalOvertimeDisplay}"`,
                `"${e.daysPresent}"`
            ].join(","));

            const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `Weekly_Report_${weeklyData.weekRange.mondayStr}_to_${weeklyData.weekRange.fridayStr}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success("Weekly report downloaded as CSV.");
        } else if (viewMode === "monthly" && monthlyData) {
            const weekHeaders = monthlyData.weeks.map(w => w.shortLabel).join(",");
            const headers = [`Employee ID,Name,Department,Designation,${weekHeaders},Total Work Hours,Total Breaks,Total Overtime`];
            const rows = filteredEmployees.map(e => {
                const weekCols = e.weeks.map(w => `"${w.workDisplay}"`).join(",");
                return [
                    `"${e.employeeId}"`,
                    `"${e.fullName}"`,
                    `"${e.department || ''}"`,
                    `"${e.designation || ''}"`,
                    weekCols,
                    `"${e.totalWorkDisplay}"`,
                    `"${e.totalBreakDisplay}"`,
                    `"${e.totalOvertimeDisplay}"`
                ].join(",");
            });

            const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `Monthly_Report_${monthlyData.monthName.replace(/\s+/g, '_')}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success("Monthly report downloaded as CSV.");
        }
    };

    // Active departments for filter dropdown
    const availableDepartments = useMemo(() => {
        const list = viewMode === "weekly"
            ? (weeklyData?.employees || [])
            : (monthlyData?.employees || []);
        const depts = new Set(list.map(e => e.department).filter(Boolean));
        return ["All", ...Array.from(depts)];
    }, [viewMode, weeklyData, monthlyData]);

    return (
        <div className="space-y-6 pb-12 select-none animate-fadeIn">
            {/* Standard Header & Controls Card (Matching other pages) */}
            <div className="premium-3d-card p-5 space-y-4">
                {/* Top Title & Actions Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-[10px] bg-blue-50 flex items-center justify-center border border-blue-100 text-[#2D79C7] shrink-0">
                            <BarChart3 className="w-4.5 h-4.5" strokeWidth={2.5} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-base font-bold text-[#1E1E1E] tracking-tight">
                                    Work &amp; Attendance Reports
                                </h1>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-[#1F5EA8] border border-blue-100">
                                    Global Admin
                                </span>
                            </div>
                            <p className="text-gray-400 text-xs mt-0.5">
                                Weekly breakdown of daily logged hours, breaks, and overtime (40h standard) &amp; monthly summaries.
                            </p>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2.5 flex-wrap">
                        <button
                            type="button"
                            onClick={handleSendEmail}
                            disabled={sendingEmail || loading}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-slate-900 text-xs font-bold rounded-[12px] shadow-sm transition-all cursor-pointer hover:shadow active:scale-95 disabled:opacity-50"
                        >
                            {sendingEmail ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-900" />
                            ) : (
                                <Mail className="w-3.5 h-3.5 text-slate-900" />
                            )}
                            <span>{sendingEmail ? "Sending..." : "Send Report via Email"}</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleExportCSV}
                            disabled={loading || filteredEmployees.length === 0}
                            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#2D79C7] hover:bg-[#1F5EA8] text-white text-xs font-bold rounded-[12px] shadow-sm shadow-[#2D79C7]/20 transition-all cursor-pointer hover:shadow active:scale-95 disabled:opacity-50"
                        >
                            <Download className="w-3.5 h-3.5" />
                            <span>Export Excel (CSV)</span>
                        </button>
                    </div>
                </div>

                {/* Filters & Navigation Controls Row */}
                <div className="pt-3 border-t border-[#F3F4F6] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    {/* View Mode Tabs */}
                    <div className="inline-flex p-1 bg-gray-100 rounded-[12px] border border-gray-200/50 shadow-inner select-none shrink-0">
                        <button
                            type="button"
                            onClick={() => setViewMode("weekly")}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[9px] text-xs font-bold transition-all cursor-pointer ${
                                viewMode === "weekly"
                                    ? "bg-white text-[#2D79C7] shadow-sm"
                                    : "text-gray-500 hover:text-gray-800"
                            }`}
                        >
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Weekly Breakdown (Mon - Fri)</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode("monthly")}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[9px] text-xs font-bold transition-all cursor-pointer ${
                                viewMode === "monthly"
                                    ? "bg-white text-[#2D79C7] shadow-sm"
                                    : "text-gray-500 hover:text-gray-800"
                            }`}
                        >
                            <BarChart3 className="w-3.5 h-3.5" />
                            <span>Monthly Summary (Weeks 1-5)</span>
                        </button>
                    </div>

                    {/* Date Navigation, Department, Search */}
                    <div className="flex items-center gap-2.5 flex-wrap">
                        {viewMode === "weekly" ? (
                            <div className="flex items-center bg-[#F8FAFC] border border-gray-200 rounded-[12px] p-1 h-[38px]">
                                <button
                                    type="button"
                                    onClick={handlePrevWeek}
                                    className="p-1 text-gray-500 hover:text-gray-800 hover:bg-white rounded-[8px] transition-colors cursor-pointer"
                                    title="Previous Week"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <span className="text-xs font-bold text-slate-800 px-2 select-none">
                                    {weeklyData?.weekRange?.formatted || "Loading week..."}
                                </span>
                                <button
                                    type="button"
                                    onClick={handleNextWeek}
                                    className="p-1 text-gray-500 hover:text-gray-800 hover:bg-white rounded-[8px] transition-colors cursor-pointer"
                                    title="Next Week"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCurrentWeek}
                                    className="text-[11px] font-bold text-[#2D79C7] hover:bg-blue-50 px-2 py-0.5 rounded-[6px] transition-colors cursor-pointer border border-blue-100 ml-1"
                                >
                                    Current
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <select
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                                    className="h-[38px] bg-white border border-gray-200 text-[#1E1E1E] text-xs font-bold rounded-[12px] px-3 outline-none focus:border-[#2D79C7] cursor-pointer"
                                >
                                    {MONTH_NAMES.map((name, i) => (
                                        <option key={name} value={i + 1}>{name}</option>
                                    ))}
                                </select>
                                <select
                                    value={selectedYear}
                                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                                    className="h-[38px] bg-white border border-gray-200 text-[#1E1E1E] text-xs font-bold rounded-[12px] px-3 outline-none focus:border-[#2D79C7] cursor-pointer"
                                >
                                    {[2024, 2025, 2026, 2027].map(yr => (
                                        <option key={yr} value={yr}>{yr}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Department Filter */}
                        <select
                            value={selectedDepartment}
                            onChange={(e) => setSelectedDepartment(e.target.value)}
                            className="h-[38px] bg-white border border-gray-200 text-[#1E1E1E] text-xs font-bold rounded-[12px] px-3 outline-none focus:border-[#2D79C7] cursor-pointer"
                        >
                            {availableDepartments.map(d => (
                                <option key={d} value={d}>
                                    {d === "All" ? "All Departments" : d}
                                </option>
                            ))}
                        </select>

                        {/* Search Input */}
                        <div className="relative w-full sm:w-56">
                            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search employee..."
                                className="w-full pl-9 pr-3 h-[38px] bg-white border border-gray-200 rounded-[12px] text-xs text-[#1E1E1E] focus:outline-none focus:border-[#2D79C7] transition-all placeholder-gray-400 shadow-inner"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Data Table Card */}
            <div className="premium-3d-card flex flex-col overflow-hidden">
                <div className="px-5 py-4 border-b border-[#F3F4F6] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                        <h3 className="font-bold text-[#1E1E1E] text-xs tracking-wide">
                            {viewMode === "weekly" 
                                ? `Weekly Attendance Breakdown (${weeklyData?.weekRange?.formatted || ""})`
                                : `Monthly Attendance Summary (${monthlyData?.monthName || ""})`
                            }
                        </h3>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                            Showing {filteredEmployees.length} active employee records (management excluded)
                        </p>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-gray-500 font-medium">
                        <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#2D79C7]" /> Standard Work
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Overtime (&gt; 8h)
                        </span>
                    </div>
                </div>

                {loading ? (
                    <div className="p-16 flex flex-col items-center justify-center gap-3 text-gray-400">
                        <Loader2 className="w-8 h-8 animate-spin text-[#2D79C7]" />
                        <span className="text-xs font-bold">Calculating attendance reports...</span>
                    </div>
                ) : filteredEmployees.length === 0 ? (
                    <div className="p-16 flex flex-col items-center justify-center gap-2 text-gray-400">
                        <Users className="w-10 h-10 stroke-[1.5]" />
                        <p className="text-sm font-bold text-gray-700">No employee records found</p>
                        <p className="text-xs">Try adjusting your department or search filters.</p>
                    </div>
                ) : viewMode === "weekly" ? (
                    /* WEEKLY TABLE */
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-gray-50/80 text-gray-500 font-extrabold uppercase text-[10px] tracking-wider border-b border-[#F3F4F6]">
                                    <th className="py-3 px-4 sticky left-0 bg-gray-50/90 z-10">Employee</th>
                                    <th className="py-3 px-3 text-center">Mon</th>
                                    <th className="py-3 px-3 text-center">Tue</th>
                                    <th className="py-3 px-3 text-center">Wed</th>
                                    <th className="py-3 px-3 text-center">Thu</th>
                                    <th className="py-3 px-3 text-center">Fri</th>
                                    <th className="py-3 px-4 text-center bg-blue-50/40 text-[#1F5EA8]">Total (40h)</th>
                                    <th className="py-3 px-3 text-center">Breaks</th>
                                    <th className="py-3 px-3 text-center">Overtime</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#F3F4F6] font-medium text-slate-700">
                                {paginatedEmployees.map((emp) => {
                                    const isTargetMet = emp.totalWorkMinutes >= 2400;
                                    return (
                                        <tr key={emp._id} className="hover:bg-slate-50/60 transition-colors">
                                            {/* Employee info */}
                                            <td className="py-3 px-4 sticky left-0 bg-white z-10 shadow-2xs">
                                                <div className="flex items-center gap-3">
                                                    <Avatar 
                                                        src={emp.profilePicture} 
                                                        name={emp.fullName} 
                                                        size="w-8 h-8" 
                                                        textSize="text-xs" 
                                                    />
                                                    <div>
                                                        <span className="font-bold text-slate-900 block leading-tight text-xs">
                                                            {emp.fullName}
                                                        </span>
                                                        <span className="text-[10px] text-gray-400 block font-semibold mt-0.5">
                                                            {emp.employeeId} · {emp.department || "General"}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Mon - Fri columns */}
                                            {["mon", "tue", "wed", "thu", "fri"].map(key => {
                                                const day = emp.days[key];
                                                const hasWork = day && day.workMinutes > 0;
                                                const hasOvertime = day && day.overtimeMinutes > 0;
                                                return (
                                                    <td key={key} className="py-3 px-3 text-center">
                                                        {hasWork ? (
                                                            <div>
                                                                <span className="font-bold text-slate-900 block">
                                                                    {day.workDisplay}
                                                                </span>
                                                                {hasOvertime && (
                                                                    <span className="inline-block px-1.5 py-0.2 text-[9px] font-black rounded bg-amber-100 text-amber-800 mt-0.5">
                                                                        +{day.overtimeDisplay} OT
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-300 font-bold">—</span>
                                                        )}
                                                    </td>
                                                );
                                            })}

                                            {/* Total Work Hours (40h target) */}
                                            <td className="py-3 px-4 text-center bg-blue-50/20">
                                                <span className={`font-black text-xs ${isTargetMet ? "text-emerald-600" : "text-[#2D79C7]"}`}>
                                                    {emp.totalWorkDisplay}
                                                </span>
                                                <div className="text-[10px] text-gray-400 font-semibold mt-0.5">
                                                    {Math.round((emp.totalWorkMinutes / 2400) * 100)}% of 40h
                                                </div>
                                            </td>

                                            {/* Total Breaks */}
                                            <td className="py-3 px-3 text-center text-gray-500 font-semibold">
                                                {emp.totalBreakDisplay || "0h"}
                                            </td>

                                            {/* Total Overtime */}
                                            <td className="py-3 px-3 text-center">
                                                {emp.totalOvertimeMinutes > 0 ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-black text-xs border border-amber-200">
                                                        <Zap className="w-3 h-3 text-amber-500" />
                                                        {emp.totalOvertimeDisplay}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400 font-medium">0h</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    /* MONTHLY TABLE */
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-gray-50/80 text-gray-500 font-extrabold uppercase text-[10px] tracking-wider border-b border-[#F3F4F6]">
                                    <th className="py-3 px-4 sticky left-0 bg-gray-50/90 z-10">Employee</th>
                                    {(monthlyData?.weeks || []).map(w => (
                                        <th key={w.weekNum} className="py-3 px-3 text-center">
                                            {w.shortLabel}
                                            <div className="text-[9px] font-medium text-gray-400 lowercase">{w.label.split("(")[1]?.replace(")", "")}</div>
                                        </th>
                                    ))}
                                    <th className="py-3 px-4 text-center bg-blue-50/40 text-[#1F5EA8]">Total Work</th>
                                    <th className="py-3 px-3 text-center">Total Breaks</th>
                                    <th className="py-3 px-3 text-center">Total Overtime</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#F3F4F6] font-medium text-slate-700">
                                {paginatedEmployees.map((emp) => (
                                    <tr key={emp._id} className="hover:bg-slate-50/60 transition-colors">
                                        {/* Employee info */}
                                        <td className="py-3 px-4 sticky left-0 bg-white z-10 shadow-2xs">
                                            <div className="flex items-center gap-3">
                                                <Avatar 
                                                    src={emp.profilePicture} 
                                                    name={emp.fullName} 
                                                    size="w-8 h-8" 
                                                    textSize="text-xs" 
                                                />
                                                <div>
                                                    <span className="font-bold text-slate-900 block leading-tight text-xs">
                                                        {emp.fullName}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400 block font-semibold mt-0.5">
                                                        {emp.employeeId} · {emp.department || "General"}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Weeks 1 - 5 */}
                                        {(emp.weeks || []).map(w => (
                                            <td key={w.weekNum} className="py-3 px-3 text-center">
                                                <span className="font-bold text-slate-900 block">
                                                    {w.workDisplay}
                                                </span>
                                                {w.overtimeMinutes > 0 && (
                                                    <span className="inline-block px-1.5 py-0.2 text-[9px] font-black rounded bg-amber-100 text-amber-800 mt-0.5">
                                                        +{w.overtimeDisplay} OT
                                                    </span>
                                                )}
                                            </td>
                                        ))}

                                        {/* Total Monthly Work */}
                                        <td className="py-3 px-4 text-center bg-blue-50/20 font-black text-xs text-[#2D79C7]">
                                            {emp.totalWorkDisplay}
                                        </td>

                                        {/* Total Breaks */}
                                        <td className="py-3 px-3 text-center text-gray-500 font-semibold">
                                            {emp.totalBreakDisplay || "0h"}
                                        </td>

                                        {/* Total Overtime */}
                                        <td className="py-3 px-3 text-center">
                                            {emp.totalOvertimeMinutes > 0 ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-black text-xs border border-amber-200">
                                                    <Zap className="w-3 h-3 text-amber-500" />
                                                    {emp.totalOvertimeDisplay}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400 font-medium">0h</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination Controls Footer */}
                {!loading && filteredEmployees.length > 0 && (
                    <Pagination
                        total={filteredEmployees.length}
                        limit={PAGE_SIZE}
                        currentPage={currentPage}
                        onPageChange={setCurrentPage}
                    />
                )}
            </div>
        </div>
    );
};

export default Reports;
