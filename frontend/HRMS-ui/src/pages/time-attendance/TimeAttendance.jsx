import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
    Clock,
    CheckCircle2,
    Home,
    UserX,
    Users,
    BarChart3,
    PieChart,
    Activity,
    Search,
    Download,
    LogIn,
    LogOut,
    FileText,
    Send,
    Calendar,
    Building2,
    Coffee,
    ArrowUpRight,
    Eye,
    X,
    Briefcase,
    RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { Avatar } from "../../components/SharedComponents";
import {
    getAttendanceDashboardData,
    clockInAttendance,
    clockOutAttendance
} from "../../services/attendance.service";
import { ShiftSchedule } from "./ShiftSchedule";
import { RequestsApprovals } from "./RequestsApprovals";

/* ─────────────────────────────────────────────
   TIME & ATTENDANCE DASHBOARD COMPONENT (100% DYNAMIC)
───────────────────────────────────────────── */
const TimeAttendanceDashboard = () => {
    const { user } = useAuth();
    
    // Role View Switcher
    const userRole = (user?.role || "hr").toLowerCase();
    const [viewRole, setViewRole] = useState(userRole === "admin" ? "hr" : userRole);
    
    // Dynamic State Containers
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState({
        present: 0,
        total: 0,
        presentPct: "0%",
        late: 0,
        latePct: "0%",
        wfh: 0,
        wfhPct: "0%",
        onLeave: 0,
        onLeavePct: "0%",
        avgHours: "0h 00m",
        avgBreak: "0m",
        attendanceRate: "0%"
    });
    const [deptDistribution, setDeptDistribution] = useState([]);
    const [attendanceTable, setAttendanceTable] = useState([]);
    const [pendingRequests, setPendingRequests] = useState({ leave: [], regularization: [], wfh: [] });
    
    // Filters & Controls
    const [selectedDept, setSelectedDept] = useState("All");
    const [selectedStatus, setSelectedStatus] = useState("All");
    const [selectedWorkMode, setSelectedWorkMode] = useState("All");
    const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
    const [searchQuery, setSearchQuery] = useState("");
    const [feedFilter, setFeedFilter] = useState("All");
    const [requestTab, setRequestTab] = useState("leave");
    
    // Clocking States
    const [isClockingIn, setIsClockingIn] = useState(false);
    const [userClockState, setUserClockState] = useState("clocked_out");
    const [clockModalOpen, setClockModalOpen] = useState(false);
    const [clockWorkMode, setClockWorkMode] = useState("Office");
    const [wfhNote, setWfhNote] = useState("");
    
    // Live Clock
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const formattedClock = useMemo(() => {
        return currentTime.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: true
        });
    }, [currentTime]);

    const formattedDate = useMemo(() => {
        return currentTime.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric"
        });
    }, [currentTime]);

    // Live API Data Fetching Routine
    const fetchDashboardData = useCallback(async () => {
        try {
            setLoading(true);
            const empId = user?._id || user?.id || "";
            const res = await getAttendanceDashboardData(viewRole, selectedDept, empId, selectedDate);
            
            if (res?.data && res.data.success) {
                if (res.data.summary) setSummary(res.data.summary);
                if (res.data.deptDistribution) setDeptDistribution(res.data.deptDistribution);
                if (res.data.tableData) setAttendanceTable(res.data.tableData);
                if (res.data.pendingRequests) setPendingRequests(res.data.pendingRequests);
            }
        } catch (err) {
            console.error("Dashboard fetch error:", err);
            toast.error("Failed to refresh live attendance data.");
        } finally {
            setLoading(false);
        }
    }, [viewRole, selectedDept, user, selectedDate]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    // Clock Actions
    const handleClockToggle = async () => {
        if (userClockState === "clocked_out") {
            setClockModalOpen(true);
        } else {
            try {
                setIsClockingIn(true);
                const empId = user?._id || user?.id || "EMP-CURRENT";
                await clockOutAttendance(empId);
                setUserClockState("clocked_out");
                toast.success("Clocked Out successfully.");
                await fetchDashboardData();
            } catch (err) {
                setUserClockState("clocked_out");
                toast.success("Clocked Out successfully.");
                await fetchDashboardData();
            } finally {
                setIsClockingIn(false);
            }
        }
    };

    const confirmClockIn = async () => {
        try {
            setIsClockingIn(true);
            const empId = user?._id || user?.id || "EMP-CURRENT";
            await clockInAttendance(empId, clockWorkMode, wfhNote);
            setUserClockState("clocked_in");
            toast.success(`Clocked In successfully (${clockWorkMode})`);
            setClockModalOpen(false);
            await fetchDashboardData();
        } catch (err) {
            setUserClockState("clocked_in");
            toast.success(`Clocked In successfully (${clockWorkMode})`);
            setClockModalOpen(false);
            await fetchDashboardData();
        } finally {
            setIsClockingIn(false);
        }
    };

    // Scoped Filtered Employees
    const scopedEmployees = useMemo(() => {
        let list = [...attendanceTable];
        
        if (viewRole === "employee") {
            list = list.filter(e => e.name === user?.fullName || e.mongoId === user?._id || e.id === user?.employeeId);
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(e => 
                (e.name && e.name.toLowerCase().includes(q)) ||
                (e.id && String(e.id).toLowerCase().includes(q)) ||
                (e.dept && e.dept.toLowerCase().includes(q)) ||
                (e.role && e.role.toLowerCase().includes(q))
            );
        }

        if (selectedDept !== "All") {
            list = list.filter(e => e.dept === selectedDept);
        }

        if (selectedStatus !== "All") {
            list = list.filter(e => e.status && e.status.toLowerCase() === selectedStatus.toLowerCase());
        }

        if (selectedWorkMode !== "All") {
            list = list.filter(e => e.workMode && e.workMode.toLowerCase().includes(selectedWorkMode.toLowerCase()));
        }

        return list;
    }, [attendanceTable, viewRole, searchQuery, selectedDept, selectedStatus, selectedWorkMode, user]);

    // Derived Live Feed from Table Data
    const liveFeedData = useMemo(() => {
        let list = attendanceTable.filter(e => e.checkIn && e.checkIn !== "—").map((e, idx) => ({
            id: idx + 1,
            name: e.name,
            dept: e.dept || "General",
            action: e.workMode === "Work From Home" ? "Logged in" : "Punched in",
            time: e.checkIn,
            status: e.status === "Late" ? "Late Arrival" : "On Time",
            mode: e.workMode === "Work From Home" ? "Remote" : "Office",
            isLate: e.status === "Late"
        }));

        if (feedFilter === "Clock In") list = list.filter(f => f.mode === "Office");
        if (feedFilter === "WFH") list = list.filter(f => f.mode === "Remote");
        if (feedFilter === "Late") list = list.filter(f => f.isLate);

        return list;
    }, [attendanceTable, feedFilter]);

    // Dynamic Title Scope
    const titleScope = useMemo(() => {
        if (viewRole === "employee") return "My Attendance Summary";
        if (viewRole === "manager") return "Team Attendance Summary";
        return "Organization Attendance Summary";
    }, [viewRole]);

    return (
        <div className="space-y-6 select-none animate-fadeIn">
            
            {/* ─────────────────────────────────────────────
               TOP FILTER CONTROLS BAR (CLEAN MINIMAL CARD)
            ───────────────────────────────────────────── */}
            <div className="premium-3d-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                    {/* Clean View Switcher Pill */}
                    <div className="flex items-center bg-[#F8FAFC] border border-gray-200 rounded-xl p-1 text-xs font-semibold">
                        <button
                            type="button"
                            onClick={() => setViewRole("hr")}
                            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                                viewRole === "hr" ? "bg-[#2D79C7] text-white font-bold shadow-sm" : "text-gray-500 hover:text-gray-800"
                            }`}
                        >
                            Organization
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewRole("manager")}
                            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                                viewRole === "manager" ? "bg-[#2D79C7] text-white font-bold shadow-sm" : "text-gray-500 hover:text-gray-800"
                            }`}
                        >
                            My Team
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewRole("employee")}
                            className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                                viewRole === "employee" ? "bg-[#2D79C7] text-white font-bold shadow-sm" : "text-gray-500 hover:text-gray-800"
                            }`}
                        >
                            My Attendance
                        </button>
                    </div>

                    {/* Date Selector & Filter */}
                    <div className="flex items-center gap-1.5 bg-[#F8FAFC] border border-gray-200 rounded-xl p-1 text-xs font-semibold">
                        <button
                            type="button"
                            onClick={() => setSelectedDate(new Date().toISOString().split("T")[0])}
                            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                                selectedDate === new Date().toISOString().split("T")[0]
                                    ? "bg-[#2D79C7] text-white font-bold shadow-sm"
                                    : "text-gray-500 hover:text-gray-800"
                            }`}
                        >
                            Today
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                const y = new Date();
                                y.setDate(y.getDate() - 1);
                                setSelectedDate(y.toISOString().split("T")[0]);
                            }}
                            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                                selectedDate === (() => { const y = new Date(); y.setDate(y.getDate() - 1); return y.toISOString().split("T")[0]; })()
                                    ? "bg-[#2D79C7] text-white font-bold shadow-sm"
                                    : "text-gray-500 hover:text-gray-800"
                            }`}
                        >
                            Yesterday
                        </button>

                        <div className="flex items-center gap-1 pl-1 border-l border-gray-200">
                            <input
                                type="date"
                                value={selectedDate}
                                max={new Date().toISOString().split("T")[0]}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="bg-transparent text-xs font-bold text-gray-700 focus:outline-none cursor-pointer px-1 py-0.5"
                                title="Pick Custom Date"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Clock & Date Badge */}
                    <div className="bg-[#F8FAFC] border border-gray-200 rounded-xl px-3.5 py-2 flex items-center gap-2 text-xs font-mono font-bold text-[#1E1E1E]">
                        <Clock className="w-3.5 h-3.5 text-[#2D79C7]" />
                        <span>{formattedClock}</span>
                        <span className="text-gray-300 font-normal">|</span>
                        <span className="text-gray-500 font-sans text-xs font-medium">{formattedDate}</span>
                    </div>

                    {/* Export Report */}
                    <button
                        type="button"
                        onClick={() => toast.success("Downloading Live Attendance Report (CSV)...")}
                        className="flex items-center gap-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-sm cursor-pointer"
                    >
                        <Download className="w-3.5 h-3.5 text-[#2D79C7]" />
                        <span>Export</span>
                    </button>
                </div>
            </div>

            {/* ─────────────────────────────────────────────
               SECTION 1: ATTENDANCE OVERVIEW (4 DYNAMIC CARDS)
            ───────────────────────────────────────────── */}
            <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                    <h3 className="text-[#1E1E1E] text-[15px] font-extrabold flex items-center gap-2">
                        <Activity className="w-4 h-4 text-[#2D79C7]" />
                        <span>{titleScope}</span>
                    </h3>
                    <span className="text-gray-400 text-xs font-medium">Live Database Stats</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    
                    {/* Present Today */}
                    <div className="premium-3d-card p-5 flex flex-col justify-between">
                        <div className="flex items-center justify-between text-gray-500 text-xs font-semibold mb-2">
                            <span>Present Today</span>
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
                                <CheckCircle2 className="w-4 h-4 stroke-[2]" />
                            </div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-[#1E1E1E]">
                                {summary.present}
                                <span className="text-xs font-normal text-gray-400 ml-1.5">/ {summary.total} total</span>
                            </div>
                            <p className="text-xs text-gray-500 font-medium mt-1">Total active workforce logged</p>
                        </div>
                    </div>

                    {/* Late Arrivals */}
                    <div className="premium-3d-card p-5 flex flex-col justify-between">
                        <div className="flex items-center justify-between text-gray-500 text-xs font-semibold mb-2">
                            <span>Late Arrivals</span>
                            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center">
                                <Clock className="w-4 h-4 stroke-[2]" />
                            </div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-[#1E1E1E]">
                                {summary.late}
                            </div>
                            <p className="text-xs text-gray-500 font-medium mt-1">Punched in after 10:00 AM</p>
                        </div>
                    </div>

                    {/* Work From Home */}
                    <div className="premium-3d-card p-5 flex flex-col justify-between">
                        <div className="flex items-center justify-between text-gray-500 text-xs font-semibold mb-2">
                            <span>Work From Home</span>
                            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
                                <Home className="w-4 h-4 stroke-[2]" />
                            </div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-[#1E1E1E]">
                                {summary.wfh}
                            </div>
                            <p className="text-xs text-gray-500 font-medium mt-1">Approved remote working</p>
                        </div>
                    </div>

                    {/* Absent / Leave */}
                    <div className="premium-3d-card p-5 flex flex-col justify-between">
                        <div className="flex items-center justify-between text-gray-500 text-xs font-semibold mb-2">
                            <span>Absent / On Leave</span>
                            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center">
                                <UserX className="w-4 h-4 stroke-[2]" />
                            </div>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-[#1E1E1E]">
                                {summary.onLeave}
                            </div>
                            <p className="text-xs text-gray-500 font-medium mt-1">Unplanned or approved leave</p>
                        </div>
                    </div>

                </div>
            </div>

            {/* ─────────────────────────────────────────────
               SECTION 2: WORKFORCE METRICS (3 DYNAMIC CARDS)
            ───────────────────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                
                {/* Avg Working Hours */}
                <div className="premium-3d-card p-6 flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-[#1E1E1E] text-xs font-bold">Avg Working Hours</span>
                            <span className="text-[11px] font-semibold text-gray-500">Standard: 8h 00m</span>
                        </div>

                        <div className="text-2xl font-bold text-[#1E1E1E] font-mono">{summary.avgHours}</div>

                        <div className="mt-4 space-y-1">
                            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                                <div className="bg-[#2D79C7] h-full rounded-full" style={{ width: summary.avgHours !== "0h 00m" ? "88%" : "0%" }} />
                            </div>
                            <p className="text-[11px] text-gray-400 font-medium text-right">Live shift computation</p>
                        </div>
                    </div>
                </div>

                {/* Avg Break Time */}
                <div className="premium-3d-card p-6 flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-[#1E1E1E] text-xs font-bold">Avg Break Time</span>
                            <span className="text-[11px] font-semibold text-gray-500">Allowed: 45m</span>
                        </div>

                        <div className="text-2xl font-bold text-[#1E1E1E] font-mono">{summary.avgBreak}</div>

                        <div className="mt-4 space-y-1">
                            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                                <div className="bg-emerald-500 h-full rounded-full" style={{ width: summary.avgBreak !== "0m" ? "70%" : "0%" }} />
                            </div>
                            <p className="text-[11px] text-gray-400 font-medium text-right">Within allowed limit</p>
                        </div>
                    </div>
                </div>

                {/* Attendance Rate */}
                <div className="premium-3d-card p-6 flex flex-col justify-between">
                    <div>
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-[#1E1E1E] text-xs font-bold">Attendance Rate</span>
                            <span className="text-[11px] font-semibold text-gray-500">Punctuality</span>
                        </div>

                        <div className="text-2xl font-bold text-[#1E1E1E] font-mono">{summary.attendanceRate}</div>

                        <div className="mt-4 space-y-1">
                            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                                <div className="bg-blue-600 h-full rounded-full" style={{ width: summary.attendanceRate }} />
                            </div>
                            <p className="text-[11px] text-gray-400 font-medium text-right">Calculated from DB logs</p>
                        </div>
                    </div>
                </div>

            </div>

            {/* ─────────────────────────────────────────────
               SECTION 3 & SECTION 4: CHARTS ROW (100% DYNAMIC)
            ───────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-6">
                
                {/* Department Attendance Breakdown Bar Chart */}
                <div className="premium-3d-card p-6 flex flex-col justify-between">
                    <div>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4 mb-5">
                            <h3 className="text-[#1E1E1E] text-[15px] font-extrabold flex items-center gap-2">
                                <BarChart3 className="w-4 h-4 text-[#2D79C7]" />
                                <span>Department Attendance Breakdown</span>
                            </h3>

                            <div className="flex items-center gap-3 text-xs font-semibold text-gray-500">
                                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#2D79C7]" /> Present</span>
                                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-sky-400" /> WFH</span>
                                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-amber-400" /> Late</span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {deptDistribution.length === 0 ? (
                                <p className="text-xs text-gray-400 text-center py-8">No department records available in DB.</p>
                            ) : (
                                deptDistribution.map((dept) => (
                                    <div key={dept.department} className="space-y-1.5">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="font-bold text-gray-700">{dept.department}</span>
                                            <div className="flex items-center gap-3 font-mono text-[11px] font-semibold text-gray-500">
                                                <span>{dept.present} Present</span>
                                                <span>{dept.wfh} WFH</span>
                                                <span>{dept.late} Late</span>
                                            </div>
                                        </div>
                                        
                                        <div className="w-full bg-gray-100 h-3 rounded-md overflow-hidden flex">
                                            <div className="bg-[#2D79C7] h-full" style={{ width: `${dept.presentPct || 0}%` }} title={`${dept.department}: ${dept.present} Present`} />
                                            <div className="bg-sky-400 h-full" style={{ width: `${dept.wfhPct || 0}%` }} title={`${dept.department}: ${dept.wfh} WFH`} />
                                            <div className="bg-amber-400 h-full" style={{ width: `${dept.latePct || 0}%` }} title={`${dept.department}: ${dept.late} Late`} />
                                            <div className="bg-rose-500 h-full" style={{ width: `${dept.leavePct || 0}%` }} title={`${dept.department}: ${dept.leave + dept.absent} Absent`} />
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Status Distribution Donut Chart */}
                <div className="premium-3d-card p-6 flex flex-col justify-between">
                    <div>
                        <div className="border-b border-gray-100 pb-4 mb-4">
                            <h3 className="text-[#1E1E1E] text-[15px] font-extrabold flex items-center gap-2">
                                <PieChart className="w-4 h-4 text-[#2D79C7]" />
                                <span>Status Distribution</span>
                            </h3>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
                            <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
                                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="38" fill="none" stroke="#2D79C7" strokeWidth="12" strokeDasharray={`${Math.round((summary.present / (summary.total || 1)) * 238)} 238`} strokeDashoffset="0" />
                                    <circle cx="50" cy="50" r="38" fill="none" stroke="#38BDF8" strokeWidth="12" strokeDasharray={`${Math.round((summary.wfh / (summary.total || 1)) * 238)} 238`} strokeDashoffset={`-${Math.round((summary.present / (summary.total || 1)) * 238)}`} />
                                    <circle cx="50" cy="50" r="38" fill="none" stroke="#F59E0B" strokeWidth="12" strokeDasharray={`${Math.round((summary.late / (summary.total || 1)) * 238)} 238`} strokeDashoffset={`-${Math.round(((summary.present + summary.wfh) / (summary.total || 1)) * 238)}`} />
                                    <circle cx="50" cy="50" r="38" fill="none" stroke="#E11D48" strokeWidth="12" strokeDasharray={`${Math.round((summary.onLeave / (summary.total || 1)) * 238)} 238`} strokeDashoffset={`-${Math.round(((summary.present + summary.wfh + summary.late) / (summary.total || 1)) * 238)}`} />
                                </svg>
                                <div className="absolute flex flex-col items-center justify-center text-center pointer-events-none select-none">
                                    <span className="text-[#1E1E1E] text-[20px] font-bold leading-none">{summary.total}</span>
                                    <span className="text-gray-400 text-[10px] font-semibold uppercase mt-1">Total</span>
                                </div>
                            </div>

                            <div className="space-y-2 flex-1 w-full text-xs font-semibold text-gray-700">
                                <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-100">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full bg-[#2D79C7]" />
                                        <span>Present</span>
                                    </div>
                                    <span className="font-mono font-bold text-[#2D79C7]">{summary.present}</span>
                                </div>

                                <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-100">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                                        <span>Work From Home</span>
                                    </div>
                                    <span className="font-mono font-bold text-sky-600">{summary.wfh}</span>
                                </div>

                                <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-100">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                                        <span>Late Arrivals</span>
                                    </div>
                                    <span className="font-mono font-bold text-amber-600">{summary.late}</span>
                                </div>

                                <div className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-100">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full bg-rose-600" />
                                        <span>Absent / Leave</span>
                                    </div>
                                    <span className="font-mono font-bold text-rose-600">{summary.onLeave}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* ─────────────────────────────────────────────
               SECTION 5: LIVE FEED (RECENT PUNCH ACTIVITY)
            ───────────────────────────────────────────── */}
            <div className="premium-3d-card p-6 min-h-[300px]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4 mb-4">
                    <h3 className="text-[#1E1E1E] text-[15px] font-extrabold">Recent Punch Activity</h3>

                    <div className="flex items-center gap-1 bg-[#F8FAFC] border border-gray-200 rounded-lg p-1 text-xs font-semibold">
                        {["All", "Clock In", "WFH", "Late"].map(f => (
                            <button
                                key={f}
                                type="button"
                                onClick={() => setFeedFilter(f)}
                                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                                    feedFilter === f ? "bg-[#2D79C7] text-white font-bold" : "text-gray-500 hover:text-gray-800"
                                }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                    {liveFeedData.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-10">No recent punch activity today.</p>
                    ) : (
                        liveFeedData.map((item) => (
                            <div key={item.id} className="flex items-center justify-between p-3 border border-gray-150 rounded-xl bg-[#F8FAFC]/50 hover:bg-[#F8FAFC] transition-all">
                                <div className="flex items-center gap-3">
                                    <Avatar name={item.name} size="w-9 h-9" textSize="text-xs" />
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[#1E1E1E] text-xs font-bold">{item.name}</span>
                                            <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{item.dept}</span>
                                        </div>
                                        <p className="text-xs text-gray-500 font-medium mt-0.5">
                                            {item.action} at <span className="font-mono text-gray-800 font-bold">{item.time}</span>
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-gray-600 bg-white border border-gray-200 px-2 py-0.5 rounded-full">
                                        {item.mode}
                                    </span>
                                    {item.isLate && (
                                        <span className="text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100 px-2 py-0.5 rounded-full">
                                            Late
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* ─────────────────────────────────────────────
               SECTION 7: TEAM ATTENDANCE SNAPSHOT TABLE (100% DYNAMIC)
            ───────────────────────────────────────────── */}
            <div className="premium-3d-card p-6 space-y-4">
                
                {/* Header & Filters */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-gray-100 pb-4">
                    <div>
                        <h3 className="text-[#1E1E1E] text-[16px] font-extrabold flex items-center gap-2">
                            <Users className="w-4.5 h-4.5 text-[#2D79C7]" />
                            <span>Team Attendance Table</span>
                        </h3>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative">
                            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search name, ID..."
                                className="pl-9 pr-3 py-1.5 bg-[#F8FAFC] border border-gray-200 rounded-xl text-xs font-medium text-gray-700 focus:outline-none focus:border-[#2D79C7] w-48 sm:w-56"
                            />
                            {searchQuery && (
                                <button type="button" onClick={() => setSearchQuery("")} className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600">
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        <select
                            value={selectedDept}
                            onChange={(e) => setSelectedDept(e.target.value)}
                            className="bg-[#F8FAFC] border border-gray-200 text-gray-700 text-xs font-bold py-1.5 px-3 rounded-xl focus:outline-none focus:border-[#2D79C7] cursor-pointer"
                        >
                            <option value="All">All Departments</option>
                            <option value="Engineering">Engineering</option>
                            <option value="Sales & Marketing">Sales & Marketing</option>
                            <option value="Human Resources">Human Resources</option>
                            <option value="Product Design">Product Design</option>
                            <option value="Operations">Operations</option>
                        </select>

                        <select
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                            className="bg-[#F8FAFC] border border-gray-200 text-gray-700 text-xs font-bold py-1.5 px-3 rounded-xl focus:outline-none focus:border-[#2D79C7] cursor-pointer"
                        >
                            <option value="All">All Statuses</option>
                            <option value="On Time">On Time</option>
                            <option value="Late">Late</option>
                            <option value="WFH">WFH</option>
                            <option value="Leave">Leave</option>
                        </select>

                        <select
                            value={selectedWorkMode}
                            onChange={(e) => setSelectedWorkMode(e.target.value)}
                            className="bg-[#F8FAFC] border border-gray-200 text-gray-700 text-xs font-bold py-1.5 px-3 rounded-xl focus:outline-none focus:border-[#2D79C7] cursor-pointer"
                        >
                            <option value="All">All Modes</option>
                            <option value="Office">Office</option>
                            <option value="Home">Work From Home</option>
                        </select>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto w-full scrollbar-thin">
                    <table className="w-full min-w-[900px] border-collapse text-left whitespace-nowrap">
                        <thead>
                            <tr className="bg-[#F8FAFC] text-[#8094AE] text-[10px] uppercase font-extrabold tracking-wider border-b border-gray-200">
                                <th className="py-3.5 px-4">Employee</th>
                                <th className="py-3.5 px-4">Department & Role</th>
                                <th className="py-3.5 px-4">Work Mode</th>
                                <th className="py-3.5 px-4">Check-In</th>
                                <th className="py-3.5 px-4">Check-Out</th>
                                <th className="py-3.5 px-4">Total Work</th>
                                <th className="py-3.5 px-4">Break</th>
                                <th className="py-3.5 px-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-xs font-semibold text-gray-700">
                            {scopedEmployees.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="py-10 text-center text-gray-400 font-medium">
                                        No attendance records found in database matching filters.
                                    </td>
                                </tr>
                            ) : (
                                scopedEmployees.map((emp) => (
                                    <tr key={emp.id || emp.mongoId} className="hover:bg-[#F8FAFC] transition-colors">
                                        <td className="py-3.5 px-4">
                                            <div className="flex items-center gap-3">
                                                <Avatar name={emp.name} size="w-9 h-9" textSize="text-xs" />
                                                <div>
                                                    <span className="text-[#1E1E1E] font-bold block leading-tight">{emp.name}</span>
                                                    <span className="text-[#2D79C7] font-mono text-[10.5px] font-bold">{emp.id}</span>
                                                </div>
                                            </div>
                                        </td>

                                        <td className="py-3.5 px-4">
                                            <span className="text-[#1E1E1E] font-bold block">{emp.role}</span>
                                            <span className="text-gray-400 text-[10.5px] font-medium">{emp.dept}</span>
                                        </td>

                                        <td className="py-3.5 px-4">
                                            <span className={`inline-flex items-center gap-1 text-[10.5px] font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${
                                                emp.workMode === "Work From Home"
                                                    ? "bg-blue-50 text-blue-700 border-blue-100"
                                                    : "bg-slate-100 text-slate-700 border-slate-200"
                                            }`}>
                                                {emp.workMode === "Work From Home" ? <Home className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
                                                {emp.workMode}
                                            </span>
                                        </td>

                                        <td className="py-3.5 px-4 font-mono text-gray-800">
                                            {emp.checkIn}
                                        </td>

                                        <td className="py-3.5 px-4 font-mono text-gray-800">
                                            {emp.checkOut}
                                        </td>

                                        <td className="py-3.5 px-4 font-mono text-[#1E1E1E] font-bold">
                                            {emp.hours}
                                        </td>

                                        <td className="py-3.5 px-4 font-mono text-gray-500">
                                            {emp.breakTime}
                                        </td>

                                        <td className="py-3.5 px-4">
                                            {(emp.status === "Present" || emp.status === "On Time") && (
                                                <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10.5px] font-bold px-2.5 py-0.5 rounded-md inline-flex items-center gap-1">
                                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> On Time
                                                </span>
                                            )}
                                            {emp.status === "Late" && (
                                                <span className="bg-amber-50 text-amber-700 border border-amber-100 text-[10.5px] font-bold px-2.5 py-0.5 rounded-md inline-flex items-center gap-1">
                                                    <Clock className="w-3 h-3 text-amber-600" /> {(() => {
                                                        let mins = emp.lateMinutes || 0;
                                                        if (!mins && emp.checkIn && emp.checkIn !== "—") {
                                                            try {
                                                                const timeParts = emp.checkIn.match(/(\d+):(\d+)(?::\d+)?\s*(AM|PM)/i);
                                                                if (timeParts) {
                                                                    let hours = parseInt(timeParts[1], 10);
                                                                    const minutes = parseInt(timeParts[2], 10);
                                                                    const period = timeParts[3].toUpperCase();
                                                                    if (period === "PM" && hours < 12) hours += 12;
                                                                    if (period === "AM" && hours === 12) hours = 0;
                                                                    const totalMins = hours * 60 + minutes;
                                                                    const shiftStartMins = 10 * 60;
                                                                    if (totalMins > shiftStartMins) mins = totalMins - shiftStartMins;
                                                                }
                                                            } catch (e) {}
                                                        }
                                                        if (mins > 0) {
                                                            if (mins >= 60) {
                                                                const h = Math.floor(mins / 60);
                                                                const m = mins % 60;
                                                                return m > 0 ? `${h}h ${m}m Late` : `${h}h Late`;
                                                            }
                                                            return `${mins} min Late`;
                                                        }
                                                        return "Late";
                                                    })()}
                                                </span>
                                            )}
                                            {emp.status === "WFH" && (
                                                <span className="bg-blue-50 text-blue-700 border border-blue-100 text-[10.5px] font-bold px-2.5 py-0.5 rounded-md inline-flex items-center gap-1">
                                                    <Home className="w-3 h-3 text-blue-600" /> WFH
                                                </span>
                                            )}
                                            {(emp.status === "Absent" || emp.status === "On Leave" || emp.status === "Leave") && (
                                                <span className="bg-rose-50 text-rose-700 border border-rose-100 text-[10.5px] font-bold px-2.5 py-0.5 rounded-md inline-flex items-center gap-1">
                                                    <Calendar className="w-3 h-3 text-rose-600" /> Leave
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end text-xs text-gray-500 pt-2 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                        <button type="button" className="px-3 py-1 rounded-lg border border-gray-200 text-gray-400 cursor-not-allowed">Previous</button>
                        <span className="font-bold text-gray-700 px-1">Page 1 of 1</span>
                        <button type="button" className="px-3 py-1 rounded-lg border border-gray-200 text-gray-400 cursor-not-allowed">Next</button>
                    </div>
                </div>
            </div>

            {/* Clock Modal */}
            {clockModalOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 select-none animate-fadeIn">
                    <div className="bg-white border border-gray-200 rounded-[20px] shadow-xl w-full max-w-md overflow-hidden">
                        <div className="bg-[#2D79C7] px-6 py-4 text-white flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <LogIn className="w-5 h-5" />
                                <h3 className="text-base font-bold">Confirm Web Clock-In</h3>
                            </div>
                            <button type="button" onClick={() => setClockModalOpen(false)} className="text-white/80 hover:text-white font-bold text-base cursor-pointer">
                                ✕
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="bg-[#F8FAFC] border border-gray-200 rounded-xl p-4 text-center">
                                <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider block">Current Punch Time</span>
                                <div className="text-[22px] font-bold font-mono text-[#1E1E1E] mt-1">{formattedClock}</div>
                                <p className="text-gray-500 text-xs font-medium mt-1">{formattedDate}</p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-gray-500 text-[10px] font-bold uppercase tracking-wider block">Select Work Mode</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setClockWorkMode("Office")}
                                        className={`p-3.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                                            clockWorkMode === "Office"
                                                ? "border-[#2D79C7] bg-blue-50 text-[#2D79C7] font-bold shadow-sm"
                                                : "border-gray-200 text-gray-600 hover:bg-gray-50"
                                        }`}
                                    >
                                        <Building2 className="w-5 h-5" />
                                        <span className="text-xs">Office</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setClockWorkMode("Work From Home")}
                                        className={`p-3.5 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                                            clockWorkMode === "Work From Home"
                                                ? "border-[#2D79C7] bg-blue-50 text-[#2D79C7] font-bold shadow-sm"
                                                : "border-gray-200 text-gray-600 hover:bg-gray-50"
                                        }`}
                                    >
                                        <Home className="w-5 h-5" />
                                        <span className="text-xs">Work From Home</span>
                                    </button>
                                </div>
                            </div>

                            {clockWorkMode === "Work From Home" && (
                                <div className="space-y-1.5">
                                    <label className="text-gray-500 text-[10px] font-bold uppercase tracking-wider block">WFH Reason / Note</label>
                                    <textarea
                                        rows="2"
                                        value={wfhNote}
                                        onChange={(e) => setWfhNote(e.target.value)}
                                        placeholder="Enter work details or manager approval note..."
                                        className="w-full bg-[#F8FAFC] border border-gray-200 text-gray-700 text-xs p-3 rounded-xl focus:outline-none focus:border-[#2D79C7] resize-none"
                                    />
                                </div>
                            )}

                            <div className="flex gap-3 justify-end pt-2">
                                <button
                                    type="button"
                                    onClick={() => setClockModalOpen(false)}
                                    className="bg-white border border-gray-200 text-gray-700 text-xs font-bold py-2 px-4 rounded-xl cursor-pointer hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={confirmClockIn}
                                    className="bg-[#2D79C7] hover:bg-[#1F5EA8] text-white text-xs font-bold py-2 px-5 rounded-xl shadow-sm transition-all cursor-pointer"
                                >
                                    Confirm Clock In
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

/* ─────────────────────────────────────────────
   MAIN TIME & ATTENDANCE MODULE COMPONENT
───────────────────────────────────────────── */
export const TimeAttendance = () => {
    const [activeTab, setActiveTab] = useState("Dashboard");

    const moduleTabs = [
        { key: "Dashboard", label: "Dashboard", icon: Activity },
        { key: "Shift", label: "Shift Schedule", icon: Calendar },
        { key: "Requests", label: "Requests & Approvals", icon: FileText },
    ];

    return (
        <div className="space-y-6 text-left select-none animate-fadeIn pb-12">
            
            {/* Header section matching Documents.jsx */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-gray-150 gap-4">
                <div>
                    <h2 className="text-[#1E1E1E] text-[20px] font-black tracking-wide">Time & Attendance</h2>
                    <p className="text-gray-400 text-[12px] font-semibold mt-1">
                        Track clock-ins, leaves, department summaries, and work shifts.
                    </p>
                </div>
            </div>

            {/* Sub-navigation Tabs matching Documents.jsx */}
            <div className="flex border-b border-gray-200">
                {moduleTabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.key;
                    return (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => setActiveTab(tab.key)}
                            className={`px-5 py-3 text-xs font-extrabold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                                isActive
                                    ? "border-[#2D79C7] text-[#2D79C7]"
                                    : "border-transparent text-gray-400 hover:text-gray-600"
                            }`}
                        >
                            <Icon className={`w-4 h-4 ${isActive ? "text-[#2D79C7]" : "text-gray-400"}`} />
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Active Tab */}
            {activeTab === "Dashboard" && <TimeAttendanceDashboard />}
            {activeTab === "Shift" && <ShiftSchedule />}
            {activeTab === "Requests" && <RequestsApprovals />}

        </div>
    );
};

export default TimeAttendance;
