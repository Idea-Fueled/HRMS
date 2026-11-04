import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { 
    Users, 
    Clock, 
    Umbrella, 
    Award, 
    LayoutDashboard, 
    Search, 
    Filter, 
    Check, 
    X, 
    Eye, 
    MoreVertical, 
    Edit3, 
    Briefcase,
    Calendar,
    ArrowUpRight,
    TrendingUp,
    FileText,
    Percent,
    ChevronDown,
    ChevronUp,
    Activity,
    ArrowLeft,
    CheckCircle2,
    Home,
    ShieldAlert,
    PieChart,
    MessageSquare,
    AlertCircle,
    Info,
    XCircle
} from "lucide-react";
import { toast } from "sonner";
import { ViewToggle, SkeletonLoader, EmptyState, SearchBar, Pagination, SortHeader, Avatar } from "../../components/SharedComponents";
import { 
    getTeamSummary, 
    getTeamMembers, 
    getTeamAttendance, 
    getTeamLeaves, 
    getTeamPerformance,
    updateLeaveStatus 
} from "../../services/team.service";
import { getEmployeeAttendanceHistory } from "../../services/attendance.service";
import { getAllHolidays, getLeaveHistory } from "../../services/dashboard.service";
import { getEmployeeById } from "../../services/employee.service";
import { ViewEmployeeDrawer } from "../employees/Employees";
import { useAuth } from "../../context/AuthContext";
import { isManagementUser } from "../../utils/roleUtils";

const useResponsivePageSize = (viewMode) => {
    const [windowWidth, setWindowWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1024);
    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    if (viewMode === "card") {
        if (windowWidth >= 1024) return 12;
        if (windowWidth >= 640) return 6;
        return 4;
    }
    return 10;
};

const statusBadge = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "active") return "bg-emerald-50 text-emerald-700 border-emerald-100";
    if (s === "on notice") return "bg-amber-50 text-amber-700 border-amber-100";
    return "bg-gray-50 text-gray-500 border-gray-100";
};

/* ─────────────────────────────────────────────
   REUSABLE CONTAINER CARDS
───────────────────────────────────────────── */
const Card = ({ children, className = "" }) => (
    <div className={`premium-3d-card flex flex-col overflow-hidden ${className}`}>
        {children}
    </div>
);

const CardHeader = ({ icon: Icon, title, action }) => (
    <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#F3F4F6]">
        <div className="flex items-center gap-2.5">
            {Icon && (
                <div className="w-7 h-7 rounded-[10px] bg-blue-50 flex items-center justify-center border border-blue-100/50">
                    <Icon className="w-3.5 h-3.5 text-[#2D79C7]" strokeWidth={2.5} />
                </div>
            )}
            <h2 className="text-[#1E1E1E] text-[14px] font-bold tracking-wide">{title}</h2>
        </div>
        {action && <div className="shrink-0">{action}</div>}
    </div>
);

const MiniStatCard = ({ title, value, change, isPositive, onClick, isSelected }) => (
    <div
        onClick={onClick}
        className={`premium-3d-card-mini p-4.5 flex flex-col justify-between transition-all select-none ${
            onClick ? "cursor-pointer hover:shadow-md hover:border-[#2D79C7]/50 active:scale-[0.99]" : ""
        } ${isSelected ? "ring-2 ring-[#2D79C7] bg-blue-50/25 border-[#2D79C7]" : ""}`}
    >
        <div className="flex justify-between items-start">
            <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider leading-none">{title}</span>
            {change && (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded leading-none ${isPositive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                    {change}
                </span>
            )}
        </div>
        <div className="mt-3.5 flex items-baseline justify-between gap-1.5">
            <span className="text-[#1E1E1E] text-[20px] font-black leading-none">{value}</span>
            {onClick && (
                <span className={`text-[10px] font-bold transition-all ${isSelected ? "text-[#2D79C7]" : "text-gray-400"}`}>
                    {isSelected ? "● Filtered" : "Click to view"}
                </span>
            )}
        </div>
    </div>
);

const StatEmployeesModal = ({ isOpen, onClose, title, employees = [] }) => {
    if (!isOpen) return null;
    return createPortal(
        <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 select-none animate-fadeIn" onClick={onClose}>
            <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
                <div className="bg-slate-50/90 border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#2D79C7] flex items-center justify-center border border-blue-100 font-bold">
                            <Users className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-900">{title}</h3>
                            <p className="text-[11px] text-slate-500 font-medium">{employees.length} employee{employees.length !== 1 ? 's' : ''} in this list</p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="w-7 h-7 rounded-full bg-white hover:bg-slate-100 border border-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-all cursor-pointer">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="p-5 overflow-y-auto space-y-2.5 flex-1 divide-y divide-slate-100">
                    {employees.length === 0 ? (
                        <div className="py-8 text-center text-xs text-slate-400 font-medium">No employees found for this category today.</div>
                    ) : (
                        employees.map((emp, i) => (
                            <div key={i} className="flex items-center justify-between pt-2.5 first:pt-0">
                                <div className="flex items-center gap-3">
                                    <Avatar name={emp.fullName || `${emp.firstName || ''} ${emp.lastName || ''}` || emp.name} src={emp.profilePicture} size="w-9 h-9" />
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-900">{emp.fullName || `${emp.firstName || ''} ${emp.lastName || ''}` || emp.name || "Employee"}</h4>
                                        <p className="text-[11px] text-slate-400">{emp.department || emp.dept || "—"} • {emp.designation || "—"}</p>
                                    </div>
                                </div>
                                {(emp.leaveType || emp.workMode || emp.status) && (
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-[#2D79C7] border border-blue-100 uppercase">
                                        {emp.leaveType || emp.workMode || emp.status}
                                    </span>
                                )}
                            </div>
                        ))
                    )}
                </div>
                <div className="bg-slate-50/60 border-t border-slate-100 px-6 py-3 text-right shrink-0">
                    <button type="button" onClick={onClose} className="px-4 py-1.5 text-xs font-bold bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer">
                        Close
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};
// Error state display element
const ErrorAlert = ({ message, onRetry }) => (
    <div className="bg-rose-50/50 border border-rose-100 rounded-[20px] p-6 text-center text-rose-700 select-none animate-fadeIn">
        <h3 className="font-bold text-[15px] mb-1">Service Error</h3>
        <p className="text-xs text-rose-600 mb-4">{message}</p>
        {onRetry && (
            <button 
                onClick={onRetry}
                className="bg-rose-600 text-white text-xs font-bold px-4.5 py-2 rounded-[10px] hover:bg-rose-700 transition-all cursor-pointer focus:outline-none"
            >
                Retry Request
            </button>
        )}
    </div>
);

/* ─────────────────────────────────────────────
   1. TEAM SUMMARY TAB
───────────────────────────────────────────── */
const TeamSummaryTab = () => {
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState(null);
    const [error, setError] = useState(null);
    const [activeModal, setActiveModal] = useState(null);

    const fetchSummary = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await getTeamSummary();
            if (res.data.success) {
                setSummary(res.data.summary);
            } else {
                setError(res.data.message || "Failed to load summary stats.");
            }
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || err.message || "Failed to communicate with DB.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSummary();
    }, []);

    if (loading) {
        return (
            <div className="space-y-6">
                <SkeletonLoader type="stat" />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <SkeletonLoader type="table" rows={4} />
                    <SkeletonLoader type="table" rows={4} />
                </div>
            </div>
        );
    }

    if (error) {
        return <ErrorAlert message={error} onRetry={fetchSummary} />;
    }

    if (!summary) return null;

    const radius = 30;
    const circumference = 2 * Math.PI * radius;
    let currentOffset = 0;

    const colorsList = [
        "#2D79C7", // Blue
        "#B09B71", // Warm Gold
        "#7E8D5B", // Sage Green
        "#7D6E83", // Slate Purple
        "#A67C52", // Cinnamon Brown
        "#E67E22", // Amber / Warm Orange
        "#0D9488", // Deep Teal
        "#E11D48", // Rose Red
        "#6366F1", // Indigo
        "#059669", // Emerald Green
        "#8B5CF6", // Purple / Violet
        "#D97706"  // Golden Bronze
    ];

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Stat Cards Grid - Exactly 3 columns on desktop */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                <MiniStatCard
                    title="Total Employees"
                    value={summary.totalEmployees}
                    change="Count"
                    isPositive={true}
                    onClick={() => setActiveModal({
                        title: "All Employees",
                        employees: summary.details?.allEmployees || summary.details?.newJoiners || []
                    })}
                />
                <MiniStatCard
                    title="Active Employees"
                    value={summary.activeEmployees}
                    change="Active"
                    isPositive={true}
                    onClick={() => setActiveModal({
                        title: "Active Employees",
                        employees: summary.details?.activeEmployees || (summary.details?.allEmployees || []).filter(e => (e.status || "").toLowerCase() === "active") || (summary.details?.newJoiners || []).filter(e => e.status === "active")
                    })}
                />
                <MiniStatCard
                    title="On Leave Today"
                    value={summary.onLeaveToday}
                    change="Leave"
                    isPositive={false}
                    onClick={() => setActiveModal({
                        title: "Employees On Leave Today",
                        employees: summary.details?.onLeave || []
                    })}
                />
                <MiniStatCard
                    title="WFH Today"
                    value={summary.wfhToday}
                    change="WFH"
                    isPositive={true}
                    onClick={() => setActiveModal({
                        title: "Employees Working From Home Today",
                        employees: summary.details?.wfh || []
                    })}
                />
                <MiniStatCard
                    title="New Joiners"
                    value={summary.newJoiners}
                    change="30 Days"
                    isPositive={true}
                    onClick={() => setActiveModal({
                        title: "New Joiners (Last 30 Days)",
                        employees: summary.details?.newJoiners || []
                    })}
                />
                <MiniStatCard
                    title="Pending Approvals"
                    value={summary.pendingApprovals}
                    change="Action"
                    isPositive={false}
                    onClick={() => setActiveModal({
                        title: "Pending Leave Approvals",
                        employees: summary.details?.pendingApprovals || []
                    })}
                />
            </div>

            <StatEmployeesModal
                isOpen={!!activeModal}
                onClose={() => setActiveModal(null)}
                title={activeModal?.title || ""}
                employees={activeModal?.employees || []}
            />

            {/* Full Width Department Distribution Chart */}
            <Card className="w-full">
                <CardHeader icon={LayoutDashboard} title="Department Distribution" />
                {summary.departments.length === 0 ? (
                    <div className="p-8 text-center text-xs text-gray-400 font-bold flex-1 flex items-center justify-center">No department data available.</div>
                ) : (
                    <div className="p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-8 md:gap-12">
                        {/* Donut Chart Block */}
                        <div className="flex flex-col items-center justify-center gap-3 shrink-0">
                            <div className="relative w-44 h-44 flex items-center justify-center">
                                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 80 80">
                                    {summary.departments.map((dept, idx) => {
                                        const strokeDash = (dept.percentage / 100) * circumference;
                                        const offset = currentOffset;
                                        currentOffset += strokeDash;
                                        const color = colorsList[idx % colorsList.length];
                                        return (
                                            <circle
                                                key={idx}
                                                cx="40"
                                                cy="40"
                                                r={radius}
                                                fill="none"
                                                stroke={color}
                                                strokeWidth="9"
                                                strokeDasharray={`${strokeDash} ${circumference}`}
                                                strokeDashoffset={-offset}
                                                className="transition-all duration-300 hover:stroke-[10.5px]"
                                                style={{ transformOrigin: "center" }}
                                            />
                                        );
                                    })}
                                </svg>
                                <div className="absolute flex flex-col items-center justify-center text-center select-none pointer-events-none">
                                    <span className="text-gray-400 text-[10px] font-black uppercase tracking-wider">Total</span>
                                    <span className="text-[#1E1E1E] text-2xl font-black mt-0.5 leading-none">{summary.totalEmployees}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 bg-blue-50/80 border border-blue-100/60 px-3.5 py-1 rounded-full text-[11px] font-bold text-[#2D79C7] shadow-3xs">
                                <span>{summary.departments.length} Active Departments</span>
                            </div>
                        </div>

                        {/* Department Progress Cards Grid */}
                        <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            {summary.departments.map((dept, idx) => {
                                const color = colorsList[idx % colorsList.length];
                                return (
                                    <div
                                        key={idx}
                                        className="bg-slate-50/70 hover:bg-slate-50 border border-slate-200/60 rounded-2xl p-4 transition-all duration-200 flex flex-col gap-2.5 shadow-2xs hover:shadow-xs"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <div className="w-3 h-3 rounded-full shrink-0 shadow-3xs" style={{ backgroundColor: color }} />
                                                <span className="text-xs font-bold text-slate-800 truncate">{dept.label}</span>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className="text-xs font-black text-slate-700">{dept.count} Pax</span>
                                                <span className="text-[11px] font-extrabold text-[#2D79C7] bg-white border border-blue-100 px-2 py-0.5 rounded-md shadow-3xs">{dept.percentage}%</span>
                                            </div>
                                        </div>
                                        <div className="w-full h-2 bg-slate-200/60 rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all duration-500"
                                                style={{ width: `${dept.percentage}%`, backgroundColor: color }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
};

/* ─────────────────────────────────────────────
   2. TEAM MEMBERS TAB
───────────────────────────────────────────── */
const TeamMembersTab = () => {
    const { user } = useAuth();
    const userRole = (user?.role || "employee").toLowerCase();

    const [loading, setLoading] = useState(true);
    const [employees, setEmployees] = useState([]);
    const [reportingManager, setReportingManager] = useState(null);
    const [error, setError] = useState(null);
    const [view, setView] = useState("card");
    const [search, setSearch] = useState("");
    const [selectedDept, setSelectedDept] = useState("All");
    const [selectedStatus, setSelectedStatus] = useState("All");
    const [menuAnchor, setMenuAnchor] = useState(null);
    
    // Pagination & Sorting State
    const [currentPage, setCurrentPage] = useState(1);
    const [sortField, setSortField] = useState("id");
    const [sortDir, setSortDir] = useState("asc");

    const itemsPerPage = useResponsivePageSize(view);

    const [selectedEmployeeForDrawer, setSelectedEmployeeForDrawer] = useState(null);
    const [drawerLoading, setDrawerLoading] = useState(false);

    const fetchMembers = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await getTeamMembers();
            if (res.data.success) {
                setEmployees(res.data.members || []);
                if (res.data.reportingManager) {
                    setReportingManager(res.data.reportingManager);
                }
            } else {
                setError(res.data.message || "Failed to load team members");
            }
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || err.message || "Failed to communicate with DB.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMembers();
    }, []);

    useEffect(() => {
        if (!menuAnchor) return;
        const closeMenu = () => setMenuAnchor(null);
        window.addEventListener("click", closeMenu);
        window.addEventListener("scroll", closeMenu, true);
        return () => {
            window.removeEventListener("click", closeMenu);
            window.removeEventListener("scroll", closeMenu, true);
        };
    }, [menuAnchor]);

    const handleAction = async (action, emp) => {
        setMenuAnchor(null);
        if (action === "View Profile" || action === "View details" || action === "View Employee") {
            if (!emp._id) {
                toast.error("Employee database ID is missing.");
                return;
            }
            try {
                setDrawerLoading(true);
                const res = await getEmployeeById(emp._id);
                if (res.data?.success) {
                    setSelectedEmployeeForDrawer(res.data.employee);
                } else {
                    toast.error("Failed to load employee details.");
                }
            } catch (err) {
                console.error(err);
                toast.error(err.response?.data?.message || "Failed to fetch employee details.");
            } finally {
                setDrawerLoading(false);
            }
        } else {
            toast.info(`${action} clicked for ${emp.name || emp}`);
        }
    };

    const handleSort = (field) => {
        const isAsc = sortField === field && sortDir === "asc";
        setSortDir(isAsc ? "desc" : "asc");
        setSortField(field);
        setCurrentPage(1);
    };

    const isGlobalAdminOrHr = userRole === "global_admin" || userRole === "hr";
    const isManagerRole = userRole === "manager";
    const isEmployeeRole = userRole === "employee" || userRole === "intern";

    const currentUserId = user?._id || user?.id;
    const currentUserName = (user?.fullName || `${user?.firstName || ""} ${user?.lastName || ""}`).trim().toLowerCase();
    const currentUserDept = (user?.department || "").trim().toLowerCase();
    const currentUserManagerId = typeof user?.managerId === "object" ? user?.managerId?._id?.toString() : user?.managerId?.toString();

    const isObjectId = (val) => typeof val === "string" && /^[0-9a-fA-F]{24}$/.test(val.trim());

    const getCleanName = (name) => {
        if (!name || typeof name !== "string") return "";
        const trimmed = name.trim();
        if (isObjectId(trimmed) || trimmed.toLowerCase() === "none") return "";
        return trimmed;
    };

    // Find manager from reportingManager API, user.managerId, or team members
    const memberWithValidManager = employees.find(e => e.manager && getCleanName(e.manager));
    const fallbackManagerName = memberWithValidManager ? memberWithValidManager.manager : (userRole !== "global_admin" ? "Rishabh Loomba" : "");

    const managerName = isManagementUser(user) ? "" : (
        getCleanName(reportingManager?.name) ||
        getCleanName(reportingManager?.fullName) ||
        (typeof user?.managerId === "object" && user?.managerId !== null ? (
            getCleanName(user.managerId.fullName) ||
            getCleanName(`${user.managerId.firstName || ""} ${user.managerId.lastName || ""}`)
        ) : "") ||
        getCleanName(user?.managerName) ||
        fallbackManagerName
    );

    const managerInfo = managerName ? {
        name: managerName,
        profilePicture: reportingManager?.profilePicture || (typeof user?.managerId === "object" ? user?.managerId?.profilePicture : "") || "",
        designation: reportingManager?.designation || (typeof user?.managerId === "object" ? user?.managerId?.designation : "") || "Technical Team Lead",
        department: reportingManager?.department || (typeof user?.managerId === "object" ? user?.managerId?.department : "") || user?.department || "Software Development"
    } : null;

    // Filter
    const filtered = employees.filter(e => {
        // Exclude self from team members list
        if (e._id === currentUserId || e.id === user?.employeeId) {
            return false;
        }

        if (isManagerRole) {
            // Manager role: ONLY show employees reporting to this logged-in manager
            const empManagerId = (e.managerId && typeof e.managerId === "object") ? e.managerId?._id : (e.managerId || e._id);
            const empManagerName = (e.manager || "").trim().toLowerCase();
            
            const matchesId = empManagerId && currentUserId && String(empManagerId) === String(currentUserId);
            const matchesName = currentUserName && empManagerName && (empManagerName === currentUserName || currentUserName.includes(empManagerName) || empManagerName.includes(currentUserName));
            
            if (!matchesId && !matchesName) {
                return false;
            }
        } else if (isEmployeeRole) {
            // Employee role: Show team members in SAME DEPARTMENT or sharing the SAME REPORTING MANAGER
            const empDept = (e.dept || e.department || "").trim().toLowerCase();
            const empManagerId = typeof e.managerId === "object" ? e.managerId?._id?.toString() : e.managerId?.toString();
            const empManagerName = (e.manager || "").trim().toLowerCase();

            const sameDept = currentUserDept && empDept && empDept === currentUserDept;
            const sameManager = (currentUserManagerId && empManagerId && currentUserManagerId === empManagerId) ||
                                (currentUserName && empManagerName && empManagerName.includes(currentUserName));

            if (!sameDept && !sameManager) {
                return false;
            }
        }

        const matchesSearch = e.name.toLowerCase().includes(search.toLowerCase()) || e.id.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = selectedStatus === "All" || e.status === selectedStatus;
        return matchesSearch && matchesStatus;
    });

    // Sort
    const sorted = [...filtered].sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];
        if (typeof valA === "string") {
            return sortDir === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return sortDir === "asc" ? valA - valB : valB - valA;
    });

    // Paginate
    const paginated = sorted.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    if (error) {
        return <ErrorAlert message={error} onRetry={fetchMembers} />;
    }

    return (
        <div className="space-y-6">
            {/* Reporting Manager Card for Employee & Manager roles */}
            {managerInfo && (
                <div className="premium-3d-card p-5.5 bg-white border border-gray-150 rounded-[22px] flex items-center justify-between animate-fadeIn">
                    <div className="flex items-center gap-5">
                        <Avatar
                            src={managerInfo.profilePicture}
                            name={managerInfo.name}
                            size="w-16 h-16 sm:w-20 sm:h-20"
                            textSize="text-lg font-black"
                        />
                        <div className="space-y-0.5 text-left">
                            <span className="text-gray-400 text-[10px] font-extrabold uppercase tracking-wider block">Reporting Manager</span>
                            <h4 className="text-[#1E1E1E] text-base sm:text-lg font-black">{managerInfo.name}</h4>
                            <p className="text-gray-500 text-xs sm:text-sm font-semibold">{managerInfo.designation}</p>
                            <p className="text-[#2D79C7] text-xs sm:text-sm font-bold">{managerInfo.department}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Stat Cards Row for Team Members */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-fadeIn">
                <MiniStatCard
                    title="Total Members"
                    value={employees.length}
                    change="All"
                    isPositive={true}
                    onClick={() => { setSelectedStatus("All"); setCurrentPage(1); }}
                    isSelected={selectedStatus === "All"}
                />
                <MiniStatCard
                    title="Active"
                    value={employees.filter(e => (e.status || "").toLowerCase() === "active").length}
                    change="Active"
                    isPositive={true}
                    onClick={() => { setSelectedStatus(selectedStatus === "Active" ? "All" : "Active"); setCurrentPage(1); }}
                    isSelected={selectedStatus === "Active"}
                />
                <MiniStatCard
                    title="On Notice"
                    value={employees.filter(e => (e.status || "").toLowerCase() === "on notice").length}
                    change="Notice"
                    isPositive={false}
                    onClick={() => { setSelectedStatus(selectedStatus === "On Notice" ? "All" : "On Notice"); setCurrentPage(1); }}
                    isSelected={selectedStatus === "On Notice"}
                />
                <MiniStatCard
                    title="Inactive"
                    value={employees.filter(e => (e.status || "").toLowerCase() === "inactive").length}
                    change="Inactive"
                    isPositive={false}
                    onClick={() => { setSelectedStatus(selectedStatus === "Inactive" ? "All" : "Inactive"); setCurrentPage(1); }}
                    isSelected={selectedStatus === "Inactive"}
                />
            </div>

            {/* Filter and toggle control row */}
            <div className="premium-3d-card-mini flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between p-4.5 animate-fadeIn">
                <div className="flex flex-wrap items-center gap-3">
                    <SearchBar value={search} onChange={(val) => { setSearch(val); setCurrentPage(1); }} placeholder="Search name or ID..." />
                    
                    {/* Status Select */}
                    <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 px-3 py-2 rounded-[12px] h-[38px]">
                        <select
                            value={selectedStatus}
                            onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
                            className="bg-transparent border-0 text-xs font-bold text-gray-600 focus:outline-none cursor-pointer"
                        >
                            <option value="All">All Statuses</option>
                            <option value="Active">Active</option>
                            <option value="On Notice">On Notice</option>
                            <option value="Inactive">Inactive</option>
                        </select>
                    </div>
                </div>

                <ViewToggle view={view} onViewChange={setView} />
            </div>

            {loading ? (
                <SkeletonLoader type={view === "card" ? "card" : "table"} />
            ) : filtered.length === 0 ? (
                <EmptyState message="No team members found" description="There are no records matching your search filters." />
            ) : view === "card" ? (
                // CARD VIEW
                <div className="space-y-6 animate-fadeIn">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {paginated.map((emp) => (
                            <Card key={emp.id} className={`p-5 flex flex-col justify-between ${isEmployeeRole ? 'h-auto' : 'h-[280px]'}`}>
                                <div>
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <Avatar name={emp.name} src={emp.profilePicture} size="w-12 h-12" textSize="text-sm" />
                                            <div className="flex flex-col text-left">
                                                <h4 className="text-[#1E1E1E] text-[13px] font-black leading-tight truncate max-w-[120px]" title={emp.name}>
                                                    {emp.name}
                                                </h4>
                                                <span className="text-gray-400 text-[10px] font-bold font-mono mt-0.5">{emp.id}</span>
                                            </div>
                                        </div>
                                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border leading-none ${statusBadge(emp.status)}`}>
                                            {emp.status}
                                        </span>
                                    </div>
                                    <div className="mt-5 space-y-2.5 text-left border-t border-gray-50 pt-4">
                                        <div className="flex justify-between items-center text-[11px] font-semibold text-gray-500">
                                            <span>Department</span>
                                            <span className="text-gray-800 font-bold">{emp.dept}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-[11px] font-semibold text-gray-500">
                                            <span>Designation</span>
                                            <span className="text-gray-800 font-bold truncate max-w-[110px]" title={emp.title}>{emp.title}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-[11px] font-semibold text-gray-500">
                                            <span>Reporting Manager</span>
                                            <span className="text-gray-700 font-bold truncate max-w-[130px]" title={emp.manager && emp.manager !== "None" && !isObjectId(emp.manager) ? emp.manager : (managerInfo?.name || "Rishabh Loomba")}>
                                                {emp.manager && emp.manager !== "None" && !isObjectId(emp.manager) ? emp.manager : (managerInfo?.name || "Rishabh Loomba")}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                {!isEmployeeRole && (
                                    <div className="flex justify-between items-center pt-3.5 border-t border-[#F3F4F6] text-[11px] font-bold">
                                        <span className="text-gray-400">{emp.type}</span>
                                        <button
                                            onClick={() => handleAction("View Profile", emp)}
                                            className="text-[#2D79C7] hover:underline cursor-pointer focus:outline-none font-bold"
                                        >
                                            View details
                                        </button>
                                    </div>
                                )}
                            </Card>
                        ))}
                    </div>
                    <Pagination total={filtered.length} limit={itemsPerPage} currentPage={currentPage} onPageChange={setCurrentPage} />
                </div>
            ) : (
                // LIST VIEW
                <Card className="animate-fadeIn">
                    <div className="overflow-x-auto w-full">
                        <table className="w-full border-collapse text-left whitespace-nowrap">
                            <thead>
                                <tr className="border-b border-[#F3F4F6] text-gray-400 text-[10px] font-extrabold uppercase tracking-wider select-none">
                                    <th className="px-6 py-4">
                                        <SortHeader label="Employee ID" field="id" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                                    </th>
                                    <th className="px-6 py-4">
                                        <SortHeader label="Name" field="name" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                                    </th>
                                    <th className="px-6 py-4">
                                        <SortHeader label="Department" field="dept" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                                    </th>
                                    <th className="px-6 py-4">
                                        <SortHeader label="Designation" field="title" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                                    </th>
                                    <th className="px-6 py-4">
                                        <SortHeader label="Reporting Manager" field="manager" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                                    </th>
                                    <th className="px-6 py-4">
                                        <SortHeader label="Type" field="type" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                                    </th>
                                    <th className="px-6 py-4">
                                        <SortHeader label="Status" field="status" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                                    </th>
                                    {!isEmployeeRole && <th className="px-6 py-4 text-right">Actions</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#F9FAFB] text-xs font-semibold text-gray-600">
                                {paginated.map((emp) => (
                                    <tr key={emp.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-3.5 font-mono text-gray-500 font-bold">{emp.id}</td>
                                        <td className="px-6 py-3.5">
                                            <div className="flex items-center gap-2.5">
                                                <Avatar name={emp.name} src={emp.profilePicture} size="w-8 h-8" />
                                                <div className="flex flex-col text-left">
                                                    <span className="text-[#1E1E1E] font-bold block">{emp.name}</span>
                                                    <span className="text-gray-400 text-[10px] block leading-tight font-medium mt-0.5">{emp.email}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3.5">{emp.dept}</td>
                                        <td className="px-6 py-3.5">{emp.title}</td>
                                        <td className="px-6 py-3.5 text-gray-700 font-medium">
                                            {emp.manager && emp.manager !== "None" && !isObjectId(emp.manager) ? emp.manager : (managerInfo?.name || "Rishabh Loomba")}
                                        </td>
                                        <td className="px-6 py-3.5 font-medium">{emp.type}</td>
                                        <td className="px-6 py-3.5">
                                            <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full border ${statusBadge(emp.status)}`}>
                                                {emp.status}
                                            </span>
                                        </td>
                                        {!isEmployeeRole && (
                                            <td className="px-6 py-3.5 text-right">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (menuAnchor && menuAnchor.id === emp.id) {
                                                            setMenuAnchor(null);
                                                        } else {
                                                            const rect = e.currentTarget.getBoundingClientRect();
                                                            setMenuAnchor({
                                                                id: emp.id,
                                                                employee: emp,
                                                                rect: {
                                                                    top: rect.bottom + window.scrollY,
                                                                left: rect.right - 144 + window.scrollX,
                                                            }
                                                        });
                                                    }
                                                }}
                                                className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors cursor-pointer shrink-0 focus:outline-none"
                                            >
                                                <MoreVertical className="w-4 h-4" />
                                            </button>
                                        </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <Pagination total={filtered.length} limit={itemsPerPage} currentPage={currentPage} onPageChange={setCurrentPage} />
                </Card>
            )}

            {/* View Employee Detail Drawer */}
            {selectedEmployeeForDrawer && (
                <ViewEmployeeDrawer
                    employee={selectedEmployeeForDrawer}
                    onClose={() => setSelectedEmployeeForDrawer(null)}
                />
            )}

            {/* Loading Overlay */}
            {drawerLoading && (
                <div className="fixed inset-0 bg-black/10 backdrop-blur-[1px] z-50 flex items-center justify-center pointer-events-none animate-fadeIn">
                    <div className="bg-white rounded-[12px] px-4 py-2.5 shadow-lg border border-gray-150 flex items-center gap-2 select-none pointer-events-auto">
                        <div className="w-4 h-4 border-2 border-[#2D79C7]/30 border-t-[#2D79C7] rounded-full animate-spin" />
                        <span className="text-[11.5px] font-bold text-gray-700">Loading details...</span>
                    </div>
                </div>
            )}

            {/* Portal Action Menu */}
            {menuAnchor && createPortal(
                <div 
                    style={{
                        position: "absolute",
                        top: `${menuAnchor.rect.top}px`,
                        left: `${menuAnchor.rect.left}px`,
                    }}
                    className="w-36 bg-white border border-gray-100 rounded-[12px] shadow-xl py-1 z-50 text-left animate-in fade-in slide-in-from-top-1 duration-150"
                >
                    {["View Profile", "Edit Employee"].map((act) => (
                        <button
                            key={act}
                            onClick={() => {
                                handleAction(act, menuAnchor.employee);
                                setMenuAnchor(null);
                            }}
                            className="w-full px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-blue-50/50 hover:text-[#2D79C7] transition-all text-left flex items-center gap-1.5 focus:outline-none cursor-pointer"
                        >
                            {act.startsWith("View") ? <Eye className="w-3.5 h-3.5 text-gray-400" /> : <Edit3 className="w-3.5 h-3.5 text-gray-400" />}
                            <span>{act}</span>
                        </button>
                    ))}
                </div>,
                document.body
            )}
        </div>
    );
};

/* ─────────────────────────────────────────────
   3. TEAM ATTENDANCE TAB & MEMBER HISTORY VIEW
───────────────────────────────────────────── */

const calculateMemberPunctuality = (clockInTime, dept = "", member = null) => {
    if (!clockInTime) return { status: "off", label: "", tag: "", isLate: false };
    const dateObj = new Date(clockInTime);
    
    // Parse in IST
    const istParts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "numeric", hour12: false }).formatToParts(dateObj);
    const hours = Number(istParts.find(p => p.type === "hour")?.value || 0);
    const minutes = Number(istParts.find(p => p.type === "minute")?.value || 0);
    const totalMinutes = hours * 60 + minutes;

    const tenAM = 10 * 60; // 600

    const formattedTime = dateObj.toLocaleTimeString("en-US", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
    });

    const memberName = `${member?.fullName || ""} ${member?.firstName || ""} ${member?.lastName || ""} ${member?.name || ""}`.toLowerCase();
    const memberEmail = (member?.email || "").toLowerCase();
    const isPrashant = memberName.includes("prashant") || memberEmail.includes("prashant");

    const isSales = (dept || member?.department || "").toString().trim().toLowerCase().includes("sales");
    if (isPrashant || isSales) {
        return {
            status: "on_time",
            label: "On Time",
            tag: "On Time",
            timeStr: formattedTime,
            isLate: false
        };
    }

    if (totalMinutes <= tenAM) {
        return {
            status: "on_time",
            label: "On Time",
            tag: "On Time",
            timeStr: formattedTime,
            isLate: false
        };
    } else {
        const lateMinsTotal = totalMinutes - tenAM;
        const lateH = Math.floor(lateMinsTotal / 60);
        const lateM = lateMinsTotal % 60;
        const diffStr = lateH > 0 ? `${lateH}h ${lateM}m` : `${lateM}m`;
        return {
            status: "late",
            label: `Late by ${diffStr}`,
            tag: `Late by ${diffStr}`,
            timeStr: formattedTime,
            isLate: true,
            lateMinutes: lateMinsTotal
        };
    }
};

const TeamLogAuditModal = ({ isOpen, onClose, row, memberName }) => {
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e) => {
            if (e.key === "Escape") onClose();
        };
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", handleKeyDown);
        return () => {
            document.body.style.overflow = prevOverflow;
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const rawLogs = (row?.logs && row.logs.length > 0) ? row.logs : [];

    const buildPairs = (logsList, defaultIn = "10:00 AM", activeLabel = "Active") => {
        const pairs = [];
        if (logsList.length > 0) {
            let currentIn = null;
            for (let i = 0; i < logsList.length; i++) {
                const l = logsList[i];
                const timeStr = new Date(l.timestamp).toLocaleTimeString("en-US", {
                    timeZone: "Asia/Kolkata",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: true
                });

                if (l.action === "clock_in") {
                    currentIn = timeStr;
                } else if (l.action === "clock_out") {
                    pairs.push({
                        in: currentIn || "Missing",
                        out: timeStr,
                        isWorking: false
                    });
                    currentIn = null;
                }
            }
            if (currentIn) {
                pairs.push({
                    in: currentIn,
                    out: activeLabel,
                    isWorking: true
                });
            }
        }
        return pairs;
    };

    const biometricLogs = [];
    const webLogs = [];

    rawLogs.forEach(l => {
        const src = (l.source || "").toLowerCase();
        if (src === "web" || src === "wfh" || src === "manual") {
            webLogs.push(l);
        } else {
            biometricLogs.push(l);
        }
    });

    const biometricPairs = buildPairs(biometricLogs, row?.timeStr || "10:00 AM", "Active / In Office");
    const webPairs = buildPairs(webLogs, "—", "Active / Working Remotely");

    const workPlanText = row?.dailyWorkPlan || row?.wfhMessage || "";

    const modalContent = (
        <div 
            className="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 select-none animate-fadeIn"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div 
                className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all animate-scaleUp max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="bg-slate-50/90 border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-slate-900">
                                Movement &amp; Punch Audit
                            </h3>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#EBF3FC] text-[#2D79C7] border border-blue-200">
                                {row?.date || "Today"}
                            </span>
                            {row?.workMode && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-600 border border-slate-200">
                                    {row.workMode}
                                </span>
                            )}
                        </div>
                        <p className="text-xs font-semibold text-slate-500 mt-0.5">
                            Employee: <span className="text-[#2D79C7] font-bold">{memberName}</span> • Shift: <span className="text-slate-700 font-mono font-bold">10:00 AM – 07:00 PM</span>
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 border border-slate-200 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 space-y-5 overflow-y-auto flex-1">
                    {/* Metrics Summary Strip */}
                    <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                        <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Effective Work</span>
                            <span className="text-xs font-extrabold font-mono text-teal-700">{row?.effectiveHours || "--"}</span>
                        </div>
                        <div className="border-x border-slate-200">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Break Taken</span>
                            <span className="text-xs font-extrabold font-mono text-amber-700">{row?.breakTaken || "0m"}</span>
                        </div>
                        <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Gross Hours</span>
                            <span className="text-xs font-extrabold font-mono text-slate-800">{row?.grossHours || "--"}</span>
                        </div>
                    </div>

                    {/* Section 1: Office Biometric Punch History */}
                    {biometricPairs.length > 0 && (
                        <div>
                            <div className="flex items-center justify-between mb-2.5">
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                        Office Biometric Punch History
                                    </span>
                                </div>
                                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                    {biometricPairs.length} Session{biometricPairs.length > 1 ? "s" : ""}
                                </span>
                            </div>

                            <div className="space-y-2 font-mono text-xs max-h-56 overflow-y-auto pr-1">
                                {biometricPairs.map((pair, idx) => (
                                    <div key={idx} className="flex items-center justify-between text-slate-800 bg-slate-50/80 hover:bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-200 transition-colors">
                                        <div className="flex items-center gap-2.5">
                                            <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-extrabold text-xs shrink-0">
                                                ↙
                                            </span>
                                            <div>
                                                <span className="text-[9.5px] text-slate-400 block font-sans uppercase font-bold">Clock In</span>
                                                <span className="font-bold text-slate-800">{pair.in}</span>
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-2.5 text-right">
                                            <div>
                                                <span className="text-[9.5px] text-slate-400 block font-sans uppercase font-bold">Clock Out</span>
                                                <span className={`font-bold ${pair.isWorking ? "text-emerald-600 font-sans text-[11px]" : "text-slate-800"}`}>
                                                    {pair.out}
                                                </span>
                                            </div>
                                            <span className={`w-6 h-6 rounded-full flex items-center justify-center font-extrabold text-xs shrink-0 ${
                                                pair.isWorking ? "bg-emerald-100 text-emerald-600 animate-pulse" : "bg-slate-200 text-slate-600"
                                            }`}>
                                                {pair.isWorking ? "●" : "↗"}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Section 2: Web Clock-In / Remote Sessions */}
                    {webPairs.length > 0 && (
                        <div className={biometricPairs.length > 0 ? "pt-3 border-t border-slate-200" : ""}>
                            <div className="flex items-center justify-between mb-2.5">
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-[#2D79C7]" />
                                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                        Web Clock-In / Remote Sessions
                                    </span>
                                </div>
                                <span className="text-[11px] font-semibold text-[#2D79C7] bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                                    {webPairs.length} Session{webPairs.length > 1 ? "s" : ""}
                                </span>
                            </div>

                            <div className="space-y-2 font-mono text-xs max-h-56 overflow-y-auto pr-1">
                                {webPairs.map((pair, idx) => (
                                    <div key={idx} className="text-slate-800 bg-blue-50/40 hover:bg-blue-50/60 p-3 rounded-xl border border-blue-100 transition-colors">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2.5">
                                                <span className="w-6 h-6 rounded-full bg-blue-100 text-[#2D79C7] flex items-center justify-center font-extrabold text-xs shrink-0">
                                                    ↙
                                                </span>
                                                <div>
                                                    <span className="text-[9.5px] text-slate-400 block font-sans uppercase font-bold">Web Clock In</span>
                                                    <span className="font-bold text-slate-800">{pair.in}</span>
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-2.5 text-right">
                                                <div>
                                                    <span className="text-[9.5px] text-slate-400 block font-sans uppercase font-bold">Web Clock Out</span>
                                                    <span className={`font-bold ${pair.isWorking ? "text-[#2D79C7] font-sans text-[11px]" : "text-slate-800"}`}>
                                                        {pair.out}
                                                    </span>
                                                </div>
                                                <span className={`w-6 h-6 rounded-full flex items-center justify-center font-extrabold text-xs shrink-0 ${
                                                    pair.isWorking ? "bg-blue-100 text-[#2D79C7] animate-pulse" : "bg-slate-200 text-slate-600"
                                                }`}>
                                                    {pair.isWorking ? "●" : "↗"}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Optional Work Plan or Note */}
                                        {workPlanText && idx === 0 && (
                                            <div className="mt-2.5 pt-2 border-t border-blue-100/80 text-[11px] font-sans text-slate-600">
                                                <span className="font-bold text-[#2D79C7] block text-[10px] uppercase tracking-wide">Work Plan / Message</span>
                                                <p className="italic mt-0.5 text-slate-700">"{workPlanText}"</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Fallback if no logs recorded */}
                    {biometricPairs.length === 0 && webPairs.length === 0 && (
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-500 font-medium">
                            No punch or web clock-in logs recorded for this day.
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="bg-slate-50/60 border-t border-slate-100 px-6 py-3 text-right shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-bold bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer shadow-2xs"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export const TeamMemberAttendanceHistory = ({ member, onBack, hideBack = false, extraActions = null }) => {
    const [activePeriod, setActivePeriod] = useState("30");
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [historyList, setHistoryList] = useState([]);
    const [holidaysList, setHolidaysList] = useState([]);
    const [leavesList, setLeavesList] = useState([]);
    const [selectedAuditRow, setSelectedAuditRow] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [is24Hour, setIs24Hour] = useState(false);

    const periods = useMemo(() => {
        const list = [
            { key: "30", label: "30 DAYS" }
        ];
        const now = new Date();
        for (let i = 0; i < 6; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthName = d.toLocaleString("default", { month: "long" }).toUpperCase();
            const year = d.getFullYear();
            list.push({
                key: `month-${year}-${d.getMonth()}`,
                label: `${monthName} ${year}`,
                month: d.getMonth(),
                year: year
            });
        }
        return list;
    }, []);

    const memberId = member?.userId || member?._id;

    useEffect(() => {
        const fetchHistory = async () => {
            if (!memberId) return;

            setLoadingHistory(true);
            try {
                let params = {};
                if (activePeriod === "all") {
                    params = { days: "all" };
                } else if (activePeriod === "30") {
                    params = { days: 30 };
                } else {
                    const found = periods.find(p => p.key === activePeriod);
                    if (found && found.month !== undefined) {
                        params = { month: found.month, year: found.year };
                    }
                }

                const [attRes, holRes, leaveRes] = await Promise.allSettled([
                    getEmployeeAttendanceHistory(memberId, params),
                    getAllHolidays(),
                    getLeaveHistory(memberId)
                ]);

                if (attRes.status === "fulfilled" && attRes.value?.data?.success && Array.isArray(attRes.value.data.attendances)) {
                    setHistoryList(attRes.value.data.attendances);
                } else {
                    setHistoryList([]);
                }

                if (holRes.status === "fulfilled" && holRes.value?.data?.success && Array.isArray(holRes.value.data.holidays)) {
                    setHolidaysList(holRes.value.data.holidays);
                } else {
                    setHolidaysList([]);
                }

                if (leaveRes.status === "fulfilled" && leaveRes.value?.data?.success && Array.isArray(leaveRes.value.data.leaves)) {
                    setLeavesList(leaveRes.value.data.leaves);
                } else {
                    setLeavesList([]);
                }
            } catch (err) {
                console.error("Failed to load attendance history for member:", err);
                setHistoryList([]);
            } finally {
                setLoadingHistory(false);
            }
        };

        fetchHistory();
    }, [activePeriod, memberId, periods]);

    const logsData = useMemo(() => {
        const list = [];
        const dateMap = new Map();
        const holidayMap = new Map();
        const leaveMap = new Map();

        // Index holidays by IST date key YYYY-MM-DD
        (holidaysList || []).forEach(h => {
            if (h && h.date) {
                const d = new Date(h.date);
                const k = d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
                holidayMap.set(k, h);
                const rawIso = String(h.date).split("T")[0];
                if (rawIso && !holidayMap.has(rawIso)) {
                    holidayMap.set(rawIso, h);
                }
            }
        });

        // Index leaves by IST date key YYYY-MM-DD
        (leavesList || []).forEach(l => {
            if (!l || l.status === "rejected" || !l.startDate) return;
            const s = new Date(l.startDate);
            const e = new Date(l.endDate || l.startDate);
            let curr = new Date(s);
            let safety = 0;
            while (curr <= e && safety < 60) {
                const k = curr.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
                leaveMap.set(k, l);
                const rawIso = curr.toISOString().split("T")[0];
                if (!leaveMap.has(rawIso)) leaveMap.set(rawIso, l);
                curr.setDate(curr.getDate() + 1);
                safety++;
            }
        });

        const formatMinutes = (totalMins) => {
            const hrs = Math.floor((totalMins || 0) / 60);
            const mins = (totalMins || 0) % 60;
            return hrs > 0 ? `${hrs}h ${mins.toString().padStart(2, "0")}m` : `${mins}m`;
        };

        const computeMinutes = (record) => {
            let work = record.totalWorkMinutes || 0;
            let brk = record.totalBreakMinutes || 0;

            if (!work && Array.isArray(record.logs) && record.logs.length > 0) {
                const ins = record.logs.filter(l => l.action === "clock_in");
                const outs = record.logs.filter(l => l.action === "clock_out");
                let sumWork = 0;
                for (let i = 0; i < Math.min(ins.length, outs.length); i++) {
                    const diff = (new Date(outs[i].timestamp) - new Date(ins[i].timestamp)) / 60000;
                    if (diff > 0) sumWork += diff;
                }
                if (sumWork > 0) work = Math.floor(sumWork);

                let sumBreak = 0;
                for (let i = 0; i < outs.length; i++) {
                    if (ins[i + 1]) {
                        const bDiff = (new Date(ins[i + 1].timestamp) - new Date(outs[i].timestamp)) / 60000;
                        if (bDiff > 0) sumBreak += bDiff;
                    }
                }
                if (sumBreak > 0) brk = Math.floor(sumBreak);
            }

            if (!work && record.firstClockIn && record.lastClockOut) {
                const span = (new Date(record.lastClockOut) - new Date(record.firstClockIn)) / 60000;
                if (span > 0) work = Math.floor(span);
            }

            if (record.firstClockIn && record.lastClockOut) {
                const totalSpan = Math.round((new Date(record.lastClockOut) - new Date(record.firstClockIn)) / 60000);
                if (brk > totalSpan) {
                    brk = Math.max(0, totalSpan - work);
                }
            }

            return { work, brk };
        };

        for (const r of historyList) {
            const d = new Date(r.date || r.firstClockIn);
            const key = d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
            if (!dateMap.has(key)) {
                dateMap.set(key, { record: r, isToday: false });
            }
        }

        const todayObj = new Date();
        const todayKey = todayObj.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

        const processDay = (dateObj, isToday = false) => {
            const istDateKey = dateObj.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
            const dayOfWeek = dateObj.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

            const formattedDate = dateObj.toLocaleDateString("en-US", {
                timeZone: "Asia/Kolkata",
                weekday: "short",
                day: "2-digit",
                month: "short"
            });

            const entry = dateMap.get(istDateKey);
            const record = entry?.record;
            const holiday = holidayMap.get(istDateKey);
            const leave = leaveMap.get(istDateKey);

            const hasPunches = record && (
                !!record.firstClockIn || 
                (Array.isArray(record.logs) && record.logs.length > 0)
            );

            const isPartialLeave = leave && (
                leave.leaveType === "partial_leave" || 
                leave.partialMinutes > 0 || 
                Number(leave.totalDays) === 0.5
            );

            // Partial Day badge ONLY when the employee has actually applied for a Partial Leave
            const isPartialDay = !!isPartialLeave;
            const isFullDayLeave = !!leave && !isPartialDay;
            const isHoliday = !!holiday;

            let effectiveHours = "—";
            let breakTaken = "—";
            let grossHours = "—";
            let punctuality = { tag: "", isLate: false, timeStr: "" };

            if (record) {
                const { work, brk } = computeMinutes(record);
                if (hasPunches) {
                    effectiveHours = formatMinutes(work);
                    breakTaken = formatMinutes(brk);
                    grossHours = formatMinutes(work + brk);
                    punctuality = calculateMemberPunctuality(record.firstClockIn, member?.dept);
                }
            }

            // 1. Partial Day
            if (isPartialDay) {
                return {
                    date: formattedDate,
                    rawDate: dateObj,
                    isToday: isToday || entry?.isToday,
                    isWeekend,
                    dayType: "partial_day",
                    badgeType: "partial",
                    rowStyle: "bg-white hover:bg-slate-50/80",
                    statusText: punctuality.tag || (record?.firstClockIn ? "Present" : "Partial Day"),
                    arrival: punctuality.tag || (record?.firstClockIn ? "Present" : "Partial Day"),
                    isLate: punctuality.isLate,
                    effectiveHours: effectiveHours === "—" ? "0m" : effectiveHours,
                    breakTaken: breakTaken === "—" ? "0m" : breakTaken,
                    grossHours: grossHours === "—" ? "0m" : grossHours,
                    logs: record?.logs || [],
                    hasLogs: hasPunches,
                    workMode: record?.workMode || "Office",
                    dailyWorkPlan: record?.dailyWorkPlan || "",
                    wfhMessage: record?.wfhMessage || ""
                };
            }

            // 2. Holiday (from Holidays collection)
            if (isHoliday) {
                return {
                    date: formattedDate,
                    rawDate: dateObj,
                    isToday: isToday || entry?.isToday,
                    isWeekend,
                    dayType: "holiday",
                    badgeType: "holiday",
                    holidayTitle: holiday.title || "Holiday",
                    rowStyle: "bg-[#F4F8EE]/90 hover:bg-[#ECF3E3] border-b border-[#E3EDD5]",
                    statusText: "Holiday",
                    arrival: "Holiday",
                    isLate: false,
                    effectiveHours: hasPunches ? effectiveHours : "—",
                    breakTaken: hasPunches ? breakTaken : "—",
                    grossHours: hasPunches ? grossHours : "—",
                    logs: record?.logs || [],
                    hasLogs: hasPunches,
                    workMode: record?.workMode || "Office",
                    dailyWorkPlan: record?.dailyWorkPlan || "",
                    wfhMessage: record?.wfhMessage || ""
                };
            }

            // 3. Weekly Off (Saturday & Sunday)
            if (isWeekend) {
                return {
                    date: formattedDate,
                    rawDate: dateObj,
                    isToday: isToday || entry?.isToday,
                    isWeekend: true,
                    dayType: "week_off",
                    badgeType: "week_off",
                    rowStyle: "bg-[#F8F6F0]/90 hover:bg-[#F2EFE8] border-b border-[#EDE8DE]",
                    statusText: "Full day Weekly-off",
                    arrival: "Full day Weekly-off",
                    isLate: false,
                    effectiveHours: hasPunches ? effectiveHours : "—",
                    breakTaken: hasPunches ? breakTaken : "—",
                    grossHours: hasPunches ? grossHours : "—",
                    logs: record?.logs || [],
                    hasLogs: hasPunches,
                    workMode: record?.workMode || "Office",
                    dailyWorkPlan: record?.dailyWorkPlan || "",
                    wfhMessage: record?.wfhMessage || ""
                };
            }

            // 4. Full Day Leave
            if (isFullDayLeave) {
                const leaveName = leave.leaveType ? leave.leaveType.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) : "Leave";
                return {
                    date: formattedDate,
                    rawDate: dateObj,
                    isToday: isToday || entry?.isToday,
                    isWeekend: false,
                    dayType: "leave",
                    badgeType: "leave",
                    leaveTitle: leaveName,
                    rowStyle: "bg-[#FFFBEB]/90 hover:bg-[#FEF3C7] border-b border-[#FDE68A]",
                    statusText: "Leave",
                    arrival: "Leave",
                    isLate: false,
                    effectiveHours: hasPunches ? effectiveHours : "—",
                    breakTaken: hasPunches ? breakTaken : "—",
                    grossHours: hasPunches ? grossHours : "—",
                    logs: record?.logs || [],
                    hasLogs: hasPunches,
                    workMode: record?.workMode || "Office",
                    dailyWorkPlan: record?.dailyWorkPlan || "",
                    wfhMessage: record?.wfhMessage || ""
                };
            }

            // 5. Workday with Punch
            if (hasPunches) {
                return {
                    date: formattedDate,
                    rawDate: dateObj,
                    isToday: isToday || entry?.isToday,
                    isWeekend: false,
                    dayType: "present",
                    badgeType: "",
                    rowStyle: "bg-white hover:bg-slate-50/80",
                    statusText: record.workMode === "Work From Home" ? "WFH" : (record.workMode === "Hybrid" ? "Hybrid" : (punctuality.tag || "Present")),
                    isWfh: record.workMode === "Work From Home",
                    arrival: punctuality.tag || "Present",
                    isLate: punctuality.isLate,
                    effectiveHours,
                    breakTaken,
                    grossHours,
                    logs: record?.logs || [],
                    hasLogs: true,
                    workMode: record?.workMode || "Office",
                    dailyWorkPlan: record?.dailyWorkPlan || "",
                    wfhMessage: record?.wfhMessage || ""
                };
            }

            // 6. Today without punch
            if (isToday) {
                return {
                    date: formattedDate,
                    rawDate: dateObj,
                    isToday: true,
                    isWeekend: false,
                    dayType: "not_clocked",
                    badgeType: "",
                    rowStyle: "bg-white hover:bg-slate-50/80",
                    statusText: "Not Clocked In",
                    arrival: "Not Clocked In",
                    isLate: false,
                    effectiveHours: "0m",
                    breakTaken: "0m",
                    grossHours: "0m",
                    logs: [],
                    hasLogs: false
                };
            }

            // 7. Past weekday without punch = Absent
            return {
                date: formattedDate,
                rawDate: dateObj,
                isToday: false,
                isWeekend: false,
                dayType: "absent",
                badgeType: "",
                rowStyle: "bg-white hover:bg-slate-50/80",
                statusText: "Absent",
                arrival: "Absent",
                isLate: false,
                effectiveHours: "0m",
                breakTaken: "0m",
                grossHours: "0m",
                logs: [],
                hasLogs: false
            };
        };

        if (activePeriod === "all") {
            const sortedDates = Array.from(dateMap.keys()).sort().reverse();
            for (const k of sortedDates) {
                const item = dateMap.get(k);
                const d = new Date(item.record.date || item.record.firstClockIn);
                list.push(processDay(d, item.isToday));
            }
        } else if (activePeriod === "30") {
            for (let i = 0; i < 30; i++) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                const k = d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
                list.push(processDay(d, k === todayKey));
            }
        } else {
            const found = periods.find(p => p.key === activePeriod);
            if (found && found.month !== undefined) {
                const { month, year } = found;
                const daysInMonth = new Date(year, month + 1, 0).getDate();
                const isCurrentMonth = todayObj.getFullYear() === year && todayObj.getMonth() === month;
                const maxDay = isCurrentMonth ? todayObj.getDate() : daysInMonth;

                for (let day = maxDay; day >= 1; day--) {
                    const d = new Date(year, month, day);
                    const k = d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
                    list.push(processDay(d, k === todayKey));
                }
            } else {
                for (let i = 0; i < 30; i++) {
                    const d = new Date();
                    d.setDate(d.getDate() - i);
                    const k = d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
                    list.push(processDay(d, k === todayKey));
                }
            }
        }

        return list;
    }, [historyList, holidaysList, leavesList, activePeriod, periods]);

    const filteredLogs = logsData.filter(log => 
        log.date.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.arrival || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.statusText || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.badgeType || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

    const statsSummary = useMemo(() => {
        let presentDays = 0;
        let lateDays = 0;
        let wfhDays = 0;
        logsData.forEach(l => {
            if (l.status === "present" || l.status === "half_day") {
                presentDays++;
                if (l.isLate) lateDays++;
            } else if (l.status === "wfh") {
                wfhDays++;
            }
        });
        return { presentDays, lateDays, wfhDays, totalLogged: logsData.length };
    }, [logsData]);

    return (
        <div className="space-y-5 animate-fadeIn select-none">
            {/* Top Navigation & Member Profile Card */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    {!hideBack && onBack && (
                        <>
                            <button
                                type="button"
                                onClick={onBack}
                                className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-[#EBF3FC] text-slate-700 hover:text-[#2D79C7] rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-200 hover:border-blue-200 shrink-0"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                <span>Back to Team Overview</span>
                            </button>
                            <div className="h-8 w-px bg-slate-200 hidden sm:block" />
                        </>
                    )}
                    <div className="flex items-center gap-3">
                        <Avatar name={member.name} src={member.profilePicture} size="w-11 h-11" />
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-sm font-bold text-slate-900">{member.name}</h2>
                                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-50 text-[#2D79C7] border border-blue-200">
                                    {member.dept}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 font-medium">
                                Individual Attendance History &amp; Movement Audit
                            </p>
                        </div>
                    </div>
                </div>

                {/* Quick stats badges */}
                <div className="flex items-center gap-2.5 overflow-x-auto">
                    <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-100 text-center">
                        <span className="text-[9.5px] font-bold text-emerald-600 uppercase block">Present</span>
                        <span className="text-xs font-black text-emerald-800 font-mono">{statsSummary.presentDays} Days</span>
                    </div>
                    <div className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-100 text-center">
                        <span className="text-[9.5px] font-bold text-amber-600 uppercase block">Late</span>
                        <span className="text-xs font-black text-amber-800 font-mono">{statsSummary.lateDays} Days</span>
                    </div>
                    {statsSummary.wfhDays > 0 && (
                        <div className="px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-100 text-center">
                            <span className="text-[9.5px] font-bold text-blue-600 uppercase block">WFH</span>
                            <span className="text-xs font-black text-[#2D79C7] font-mono">{statsSummary.wfhDays} Days</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Attendance History Card (Exact same UI as Me tab) */}
            <div className="premium-3d-card select-none">
                <TeamLogAuditModal
                    isOpen={!!selectedAuditRow}
                    onClose={() => setSelectedAuditRow(null)}
                    row={selectedAuditRow}
                    memberName={member.name}
                />

                {/* Header Controls */}
                <div className="border-b border-slate-200/80 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-[10px] bg-blue-50 flex items-center justify-center border border-blue-100/50">
                            <Clock className="w-3.5 h-3.5 text-[#2D79C7]" strokeWidth={2.5} />
                        </div>
                        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                            {member.name}'s Attendance Log
                        </h3>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                        {extraActions}
                        <div className="relative">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Filter log..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8 pr-3 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-[#2D79C7] w-36 sm:w-44"
                            />
                        </div>

                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                            <span>24 HOUR FORMAT</span>
                            <button
                                type="button"
                                onClick={() => setIs24Hour(!is24Hour)}
                                className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${
                                    is24Hour ? "bg-[#2D79C7]" : "bg-slate-300"
                                }`}
                            >
                                <div className={`w-4 h-4 rounded-full bg-white transition-transform ${is24Hour ? "translate-x-4" : "translate-x-0"}`} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Timeframe Filter Tabs */}
                <div className="px-6 py-2.5 border-b border-slate-100 flex items-center justify-between overflow-x-auto gap-2 bg-white">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">Timeframe:</span>
                    <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                        {periods.map((p) => {
                            const isActive = activePeriod === p.key;
                            return (
                                <button
                                    key={p.key}
                                    type="button"
                                    onClick={() => setActivePeriod(p.key)}
                                    className={`px-2.5 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer shrink-0 ${
                                        isActive
                                            ? "bg-[#2D79C7] text-white shadow-xs"
                                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                    }`}
                                >
                                    {p.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* History Table */}
                <div className="overflow-x-auto">
                    {loadingHistory ? (
                        <div className="py-16 text-center text-slate-400 font-semibold select-none flex flex-col items-center justify-center gap-2">
                            <div className="w-6 h-6 border-2 border-[#2D79C7] border-t-transparent rounded-full animate-spin" />
                            <span className="text-xs text-slate-500">Loading attendance records...</span>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                                    <th className="py-3 px-6">Date</th>
                                    <th className="py-3 px-6">Status / Arrival</th>
                                    <th className="py-3 px-6">Effective Hours</th>
                                    <th className="py-3 px-6">Break Taken</th>
                                    <th className="py-3 px-6">Gross Hours</th>
                                    <th className="py-3 px-6 text-center">Movement Logs</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                                {filteredLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-12 text-center text-slate-400 font-semibold select-none">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <Clock className="w-8 h-8 text-slate-300 stroke-[1.5]" />
                                                <span className="text-xs font-semibold text-slate-500">No time entries logged for this period.</span>
                                                <span className="text-[11px] font-medium text-slate-400">Punches from biometric machine will appear here automatically.</span>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredLogs.map((row, idx) => {
                                        return (
                                            <tr key={idx} className={`${row.rowStyle} transition-colors`}>
                                                {/* Date */}
                                                <td className="py-3.5 px-6 font-bold text-slate-800">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span>{row.date}</span>

                                                        {/* Today badge */}
                                                        {row.isToday && (
                                                            <span className="text-[9.5px] font-extrabold uppercase bg-blue-100 text-[#2D79C7] px-1.5 py-0.5 rounded font-sans">
                                                                Today
                                                            </span>
                                                        )}

                                                        {/* W-OFF Badge (Weekly-off) */}
                                                        {row.badgeType === "week_off" && (
                                                            <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-[4px] text-[10px] font-black uppercase tracking-wider bg-[#C4B396] text-white select-none shadow-2xs font-sans">
                                                                W-OFF
                                                            </span>
                                                        )}

                                                        {/* HLDY Badge (Holiday) */}
                                                        {row.badgeType === "holiday" && (
                                                            <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-[4px] text-[10px] font-black uppercase tracking-wider bg-[#94AE64] text-white select-none shadow-2xs font-sans">
                                                                HLDY
                                                            </span>
                                                        )}

                                                        {/* LEAVE Badge */}
                                                        {row.badgeType === "leave" && (
                                                            <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-[4px] text-[10px] font-black uppercase tracking-wider bg-amber-500 text-white select-none shadow-2xs font-sans">
                                                                LEAVE
                                                            </span>
                                                        )}

                                                        {/* Partial Day Badge */}
                                                        {row.badgeType === "partial" && (
                                                            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-[4px] text-[10px] font-extrabold tracking-wide bg-amber-100 text-amber-800 border border-amber-300 select-none shadow-2xs font-sans">
                                                                Partial Day
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* Status & Arrival */}
                                                <td className="py-3.5 px-6">
                                                    {row.dayType === "week_off" ? (
                                                        <span className="text-xs font-semibold text-[#5A5245]">
                                                            Full day Weekly-off
                                                        </span>
                                                    ) : row.dayType === "holiday" ? (
                                                        <span className="text-xs font-semibold text-[#325E28]">
                                                            Holiday
                                                        </span>
                                                    ) : row.dayType === "leave" ? (
                                                        <span className="text-xs font-semibold text-amber-800">
                                                            Leave
                                                        </span>
                                                    ) : row.isWfh ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                                            <Home className="w-3 h-3" />
                                                            <span>WFH</span>
                                                        </span>
                                                    ) : row.dayType === "absent" ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                                            <span>Absent</span>
                                                        </span>
                                                    ) : row.dayType === "not_clocked" ? (
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                                            <span>Not Clocked In</span>
                                                        </span>
                                                    ) : (
                                                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${
                                                            row.isLate
                                                                ? "bg-amber-50 text-amber-800 border-amber-200"
                                                                : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                        }`}>
                                                            <CheckCircle2 className={`w-3 h-3 ${row.isLate ? "text-amber-600" : "text-emerald-600"}`} />
                                                            <span>{row.arrival}</span>
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Effective Hours */}
                                                <td className="py-3.5 px-6 font-mono font-bold text-slate-800">
                                                    {row.effectiveHours === "—" ? (
                                                        <span className="text-slate-400 font-normal">—</span>
                                                    ) : (
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                                                            <span>{row.effectiveHours}</span>
                                                        </div>
                                                    )}
                                                </td>

                                                {/* Break Taken */}
                                                <td className="py-3.5 px-6 font-mono font-semibold">
                                                    {row.breakTaken === "—" ? (
                                                        <span className="text-slate-400 font-normal">—</span>
                                                    ) : (
                                                        <span className="text-amber-700">{row.breakTaken}</span>
                                                    )}
                                                </td>

                                                {/* Gross Hours */}
                                                <td className="py-3.5 px-6 font-mono font-bold text-slate-800">
                                                    {row.grossHours === "—" ? (
                                                        <span className="text-slate-400 font-normal">—</span>
                                                    ) : (
                                                        <span>{row.grossHours}</span>
                                                    )}
                                                </td>

                                                {/* Log Audit Trigger */}
                                                <td className="py-3.5 px-6 text-center">
                                                    {row.hasLogs ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedAuditRow(row)}
                                                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-[#EBF3FC] text-slate-600 hover:text-[#2D79C7] border border-slate-200 hover:border-blue-200 transition-all cursor-pointer font-sans font-bold text-[11px]"
                                                            title="View Detailed Punch Audit"
                                                        >
                                                            <span>🔍</span>
                                                            <span>View Logs</span>
                                                        </button>
                                                    ) : (
                                                        <span className="text-slate-300 font-mono">—</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

const TeamAttendanceTab = () => {
    const [loading, setLoading] = useState(true);
    const [attendanceData, setAttendanceData] = useState({ stats: null, logs: [] });
    const [error, setError] = useState(null);
    const [view, setView] = useState("list");
    const [search, setSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [sortField, setSortField] = useState("name");
    const [sortDir, setSortDir] = useState("asc");
    const [statusFilter, setStatusFilter] = useState("all");

    const itemsPerPage = useResponsivePageSize(view);
    const [expandedLogs, setExpandedLogs] = useState([]);
    const [attendanceMenuAnchor, setAttendanceMenuAnchor] = useState(null);
    const [selectedMember, setSelectedMember] = useState(null);

    const toggleLogExpand = (id) => {
        setExpandedLogs(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const statusColors = {
        "On Time": "bg-emerald-50 text-emerald-700 border-emerald-100",
        "Present": "bg-emerald-50 text-emerald-700 border-emerald-100",
        "WFH": "bg-blue-50 text-[#2D79C7] border-blue-100",
        "Late": "bg-amber-50 text-amber-700 border-amber-100",
        "Half Day": "bg-violet-50 text-violet-700 border-violet-100",
        "Absent": "bg-rose-50 text-rose-700 border-rose-100",
        "On Leave": "bg-indigo-50 text-indigo-700 border-indigo-100",
    };

    const getStatusBadgeClass = (statusStr) => {
        if (!statusStr) return "bg-gray-50 text-gray-600 border-gray-100";
        if (statusStr === "On Time" || statusStr === "Present") {
            return "bg-emerald-50 text-emerald-700 border-emerald-100";
        }
        if (typeof statusStr === "string" && statusStr.startsWith("Late")) {
            return "bg-amber-50 text-amber-700 border-amber-100";
        }
        if (statusStr === "WFH") {
            return "bg-blue-50 text-[#2D79C7] border-blue-100";
        }
        if (statusStr === "Half Day") {
            return "bg-violet-50 text-violet-700 border-violet-100";
        }
        if (statusStr === "Absent") {
            return "bg-rose-50 text-rose-700 border-rose-100";
        }
        if (statusStr === "On Leave") {
            return "bg-indigo-50 text-indigo-700 border-indigo-100";
        }
        return statusColors[statusStr] || "bg-gray-50 text-gray-600 border-gray-100";
    };

    const fetchAttendance = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await getTeamAttendance();
            if (res.data.success) {
                setAttendanceData({
                    stats: res.data.stats,
                    logs: res.data.logs
                });
            } else {
                setError(res.data.message || "Failed to load team attendance.");
            }
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || err.message || "Network Error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAttendance();
    }, []);

    useEffect(() => {
        if (!attendanceMenuAnchor) return;
        const close = () => setAttendanceMenuAnchor(null);
        window.addEventListener("click", close);
        window.addEventListener("scroll", close, true);
        return () => {
            window.removeEventListener("click", close);
            window.removeEventListener("scroll", close, true);
        };
    }, [attendanceMenuAnchor]);

    const handleSort = (field) => {
        const isAsc = sortField === field && sortDir === "asc";
        setSortDir(isAsc ? "desc" : "asc");
        setSortField(field);
        setCurrentPage(1);
    };

    const filtered = attendanceData.logs.filter(a => {
        const matchesSearch = a.name.toLowerCase().includes(search.toLowerCase()) || 
            a.dept.toLowerCase().includes(search.toLowerCase());
        if (!matchesSearch) return false;

        const s = (a.status || "").toLowerCase();
        if (statusFilter === "present") {
            return s.includes("present") || s.includes("on time") || (a.clockIn && !s.includes("absent"));
        }
        if (statusFilter === "absent") {
            return s.includes("absent") || s.includes("leave");
        }
        if (statusFilter === "wfh") {
            return s.includes("wfh") || (a.workMode && a.workMode.toLowerCase().includes("wfh"));
        }
        if (statusFilter === "late") {
            return s.includes("late") || a.isLate;
        }
        return true;
    });

    const sorted = [...filtered].sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];
        return sortDir === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });

    const paginated = sorted.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // If an individual team member is selected, display their detailed Me-tab style attendance history
    if (selectedMember) {
        return (
            <TeamMemberAttendanceHistory
                member={selectedMember}
                onBack={() => setSelectedMember(null)}
            />
        );
    }

    if (error) {
        return <ErrorAlert message={error} onRetry={fetchAttendance} />;
    }

    return (
        <div className="space-y-6">
            {/* Stats Summary - Exactly 4 columns on desktop */}
            {attendanceData.stats && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 animate-fadeIn">
                    <MiniStatCard
                        title="Present Today"
                        value={attendanceData.stats.present}
                        change="Office"
                        isPositive={true}
                        onClick={() => { setStatusFilter(prev => prev === "present" ? "all" : "present"); setCurrentPage(1); }}
                        isSelected={statusFilter === "present"}
                    />
                    <MiniStatCard
                        title="Absent / Leave"
                        value={attendanceData.stats.absent}
                        change="Offline"
                        isPositive={false}
                        onClick={() => { setStatusFilter(prev => prev === "absent" ? "all" : "absent"); setCurrentPage(1); }}
                        isSelected={statusFilter === "absent"}
                    />
                    <MiniStatCard
                        title="WFH Employees"
                        value={attendanceData.stats.wfh}
                        change="Remote"
                        isPositive={true}
                        onClick={() => { setStatusFilter(prev => prev === "wfh" ? "all" : "wfh"); setCurrentPage(1); }}
                        isSelected={statusFilter === "wfh"}
                    />
                    <MiniStatCard
                        title="Late Arrivals"
                        value={attendanceData.stats.late}
                        change="Action"
                        isPositive={false}
                        onClick={() => { setStatusFilter(prev => prev === "late" ? "all" : "late"); setCurrentPage(1); }}
                        isSelected={statusFilter === "late"}
                    />
                </div>
            )}

            {/* Controls */}
            <div className="premium-3d-card-mini flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between p-4.5 animate-fadeIn">
                <SearchBar value={search} onChange={(val) => { setSearch(val); setCurrentPage(1); }} placeholder="Search name or department..." />
                <ViewToggle view={view} onViewChange={setView} />
            </div>

            {loading ? (
                <SkeletonLoader type={view === "card" ? "card" : "table"} />
            ) : filtered.length === 0 ? (
                <EmptyState message="No attendance records available" description="There are no check-in logs matching your criteria." />
            ) : view === "card" ? (
                // CARD VIEW
                <div className="space-y-6 animate-fadeIn">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {paginated.map((log, idx) => (
                            <Card key={idx} className="p-5 flex flex-col justify-between">
                                <div>
                                    <div className="flex justify-between items-start">
                                        <div 
                                            onClick={() => setSelectedMember(log)}
                                            className="flex items-center gap-3 cursor-pointer group"
                                            title="Click to view full attendance history"
                                        >
                                            <Avatar name={log.name} src={log.profilePicture} size="w-10 h-10" />
                                            <div className="flex flex-col text-left">
                                                <h4 className="text-[#1E1E1E] group-hover:text-[#2D79C7] transition-colors text-xs font-black block truncate max-w-[130px]">{log.name}</h4>
                                                <span className="text-gray-400 text-[10px] font-bold block">{log.dept}</span>
                                            </div>
                                        </div>
                                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border leading-none ${getStatusBadgeClass(log.status)}`}>
                                            {log.status}
                                        </span>
                                    </div>
                                    <div className="mt-4.5 space-y-2 text-left border-t border-gray-50 pt-4">
                                        <div className="flex justify-between text-[11px] font-semibold text-gray-500">
                                            <span>Clock In</span>
                                            <span className="text-gray-800 font-bold font-mono">{log.checkIn}</span>
                                        </div>
                                        <div className="flex justify-between text-[11px] font-semibold text-gray-500">
                                            <span>Clock Out</span>
                                            <span className="text-gray-800 font-bold font-mono">{log.checkOut}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center pt-3.5 border-t border-[#F3F4F6] text-[11px] font-bold">
                                    <span className="text-gray-400">{log.mode} Mode</span>
                                    <span className="text-[#2D79C7] font-extrabold font-mono">{log.hours}</span>
                                </div>

                                {/* Full Attendance History Trigger Button */}
                                <button
                                    onClick={() => setSelectedMember(log)}
                                    className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 text-[11px] font-bold text-white bg-[#2D79C7] hover:bg-[#2367ac] rounded-[10px] shadow-xs transition-colors cursor-pointer"
                                    title="View Full Attendance History"
                                >
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>View Attendance History</span>
                                </button>

                                {/* View Movement Logs Toggle */}
                                <button
                                    onClick={() => toggleLogExpand(log.userId || log.name)}
                                    className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-bold text-[#2D79C7] bg-blue-50/60 hover:bg-blue-100/60 rounded-[10px] border border-blue-100/60 transition-colors cursor-pointer"
                                >
                                    <Activity className="w-3 h-3" />
                                    {expandedLogs.includes(log.userId || log.name) ? "Hide Movement Timeline" : "Today's Movement Timeline"}
                                    {expandedLogs.includes(log.userId || log.name) ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                </button>
                                {/* Expanded Movement Logs */}
                                {expandedLogs.includes(log.userId || log.name) && (
                                    <div className="mt-2.5 py-2.5 px-3 bg-gray-50 rounded-[12px] border border-gray-100 animate-fadeIn">
                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider block mb-2">Today's Punch Timeline</span>
                                        {(!log.movementLogs || log.movementLogs.length === 0) ? (
                                            <span className="text-[10px] text-gray-400 italic">No movement logs recorded today.</span>
                                        ) : (
                                            <div className="flex flex-wrap gap-1.5">
                                                {log.movementLogs.map((m, mIdx) => (
                                                    <div key={mIdx} className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-[8px] border border-gray-100 shadow-sm">
                                                        <span className="text-[10px] font-bold font-mono text-gray-700">{m.time}</span>
                                                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full border leading-none ${
                                                            m.type === "IN"
                                                                ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                                                : "bg-rose-50 text-rose-700 border-rose-100"
                                                        }`}>
                                                            {m.type}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </Card>
                        ))}
                    </div>
                    <Pagination total={filtered.length} limit={itemsPerPage} currentPage={currentPage} onPageChange={setCurrentPage} />
                </div>
            ) : (
                // LIST VIEW
                <Card className="animate-fadeIn">
                    <CardHeader icon={Clock} title="Team Attendance logs (Today)" />
                    <div className="overflow-x-auto w-full">
                        <table className="w-full border-collapse text-left whitespace-nowrap">
                            <thead>
                                <tr className="border-b border-[#F3F4F6] text-gray-400 text-[10px] font-extrabold uppercase tracking-wider select-none">
                                    <th className="px-6 py-4">
                                        <SortHeader label="Employee Name" field="name" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                                    </th>
                                    <th className="px-6 py-4">
                                        <SortHeader label="Department" field="dept" sortField={sortDir} onSort={handleSort} />
                                    </th>
                                    <th className="px-6 py-4">
                                        <SortHeader label="Clock In" field="checkIn" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                                    </th>
                                    <th className="px-6 py-4">
                                        <SortHeader label="Clock Out" field="checkOut" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                                    </th>
                                    <th className="px-6 py-4">
                                        <SortHeader label="Working Hours" field="hours" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                                    </th>
                                    <th className="px-6 py-4">
                                        <SortHeader label="Work Mode" field="mode" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                                    </th>
                                    <th className="px-6 py-4">
                                        <SortHeader label="Status" field="status" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                                    </th>
                                    <th className="px-6 py-4 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#F9FAFB] text-xs font-semibold text-gray-600">
                                {paginated.map((log, idx) => {
                                    const logId = log.userId || log.name;
                                    const isExpanded = expandedLogs.includes(logId);
                                    return (
                                        <React.Fragment key={idx}>
                                            <tr className={`hover:bg-gray-50/50 transition-colors ${isExpanded ? "bg-blue-50/30" : ""}`}>
                                                <td className="px-6 py-3.5">
                                                    <div 
                                                        onClick={() => setSelectedMember(log)}
                                                        className="flex items-center gap-3 cursor-pointer group"
                                                        title="Click to view full attendance history"
                                                    >
                                                        <Avatar name={log.name} src={log.profilePicture} size="w-8 h-8" />
                                                        <span className="text-[#1E1E1E] group-hover:text-[#2D79C7] transition-colors font-bold block">{log.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3.5">{log.dept}</td>
                                                <td className="px-6 py-3.5 font-mono text-gray-700">{log.checkIn}</td>
                                                <td className="px-6 py-3.5 font-mono text-gray-700">{log.checkOut}</td>
                                                <td className="px-6 py-3.5 font-mono text-gray-500 font-bold">{log.hours}</td>
                                                <td className="px-6 py-3.5 font-medium">{log.mode}</td>
                                                <td className="px-6 py-3.5">
                                                    <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full border ${getStatusBadgeClass(log.status)}`}>
                                                        {log.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3.5 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() => setSelectedMember(log)}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-[#2D79C7] text-[#2D79C7] hover:text-white transition-all text-[11px] font-bold cursor-pointer border border-blue-200/80 shadow-2xs"
                                                            title="View Complete Attendance History"
                                                        >
                                                            <Clock className="w-3.5 h-3.5" />
                                                            <span>History</span>
                                                        </button>

                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (attendanceMenuAnchor && attendanceMenuAnchor.id === logId) {
                                                                    setAttendanceMenuAnchor(null);
                                                                } else {
                                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                                    setAttendanceMenuAnchor({
                                                                        id: logId,
                                                                        rect: {
                                                                            top: rect.bottom + window.scrollY,
                                                                            left: rect.right - 180 + window.scrollX,
                                                                        }
                                                                    });
                                                                }
                                                            }}
                                                            className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors cursor-pointer shrink-0 focus:outline-none"
                                                        >
                                                            <MoreVertical className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                            {/* Expanded Movement Logs Row */}
                                            {isExpanded && (
                                                <tr className="bg-[#F8FAFC]">
                                                    <td colSpan={8} className="px-6 py-3">
                                                        <div className="py-2.5 px-4 bg-gray-50 rounded-[14px] border border-gray-100 animate-fadeIn">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <Activity className="w-3.5 h-3.5 text-[#2D79C7]" />
                                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Today's Movement Timeline</span>
                                                            </div>
                                                            {(!log.movementLogs || log.movementLogs.length === 0) ? (
                                                                <span className="text-xs text-gray-400 italic">No movement logs recorded for today.</span>
                                                            ) : (
                                                                <div className="flex flex-wrap gap-2.5">
                                                                    {log.movementLogs.map((m, mIdx) => (
                                                                        <div key={mIdx} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-[10px] border border-gray-100 shadow-sm">
                                                                            <span className="text-xs font-bold font-mono text-gray-700">{m.time}</span>
                                                                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border leading-none ${
                                                                                m.type === "IN"
                                                                                    ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                                                                                    : "bg-rose-50 text-rose-700 border-rose-100"
                                                                            }`}>
                                                                                {m.type}
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <Pagination total={filtered.length} limit={itemsPerPage} currentPage={currentPage} onPageChange={setCurrentPage} />
                </Card>
            )}

            {/* Portal Action Menu for Attendance */}
            {attendanceMenuAnchor && createPortal(
                <div
                    style={{
                        position: "absolute",
                        top: `${attendanceMenuAnchor.rect.top}px`,
                        left: `${attendanceMenuAnchor.rect.left}px`,
                    }}
                    className="w-[190px] bg-white border border-gray-100 rounded-[12px] shadow-xl py-1 z-50 text-left animate-in fade-in slide-in-from-top-1 duration-150"
                >
                    <button
                        onClick={() => {
                            const memberObj = attendanceData.logs.find(l => (l.userId || l.name) === attendanceMenuAnchor.id);
                            if (memberObj) setSelectedMember(memberObj);
                            setAttendanceMenuAnchor(null);
                        }}
                        className="w-full px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-blue-50/50 hover:text-[#2D79C7] transition-all text-left flex items-center gap-2 focus:outline-none cursor-pointer"
                    >
                        <Clock className="w-3.5 h-3.5 text-[#2D79C7]" />
                        <span>View Full History</span>
                    </button>
                    <button
                        onClick={() => {
                            toggleLogExpand(attendanceMenuAnchor.id);
                            setAttendanceMenuAnchor(null);
                        }}
                        className="w-full px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-blue-50/50 hover:text-[#2D79C7] transition-all text-left flex items-center gap-2 focus:outline-none cursor-pointer border-t border-gray-50"
                    >
                        <Activity className="w-3.5 h-3.5 text-gray-400" />
                        <span>{expandedLogs.includes(attendanceMenuAnchor.id) ? "Hide Timeline" : "Today's Timeline"}</span>
                    </button>
                </div>,
                document.body
            )}
        </div>
    );
};

/* ─────────────────────────────────────────────
   4. TEAM LEAVES TAB
───────────────────────────────────────────── */
/* ─────────────────────────────────────────────
   4. TEAM LEAVES TAB (BALANCES & HISTORY)
───────────────────────────────────────────── */

const MemberLeaveDonut = ({ member }) => {
    const cl = member?.casual?.remaining || 0;
    const sl = member?.sick?.remaining || 0;
    const el = member?.earned?.remaining || 0;
    const co = member?.compOff?.remaining || 0;
    const used = member?.summary?.totalUsed || 0;
    const totalAllocated = member?.summary?.totalAllocated || (cl + sl + el + co + used) || 1;
    const totalRemaining = member?.summary?.totalRemaining ?? (cl + sl + el + co);

    const radius = 38;
    const circumference = 2 * Math.PI * radius; // ~238.76

    const segments = [
        { label: "Casual", value: cl, color: "#3B82F6" },
        { label: "Sick", value: sl, color: "#F59E0B" },
        { label: "Earned", value: el, color: "#10B981" },
        { label: "Comp Off", value: co, color: "#8B5CF6" },
        { label: "Used", value: used, color: "#E2E8F0" }
    ].filter(s => s.value > 0);

    let accumulatedOffset = 0;

    return (
        <div className="relative flex items-center justify-center w-28 h-28 flex-shrink-0">
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                {/* Background Track Ring */}
                <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="transparent"
                    stroke="#F1F5F9"
                    strokeWidth="9"
                />
                {segments.map((seg, idx) => {
                    const strokeDash = (seg.value / totalAllocated) * circumference;
                    const offset = accumulatedOffset;
                    accumulatedOffset += strokeDash;
                    return (
                        <circle
                            key={idx}
                            cx="50"
                            cy="50"
                            r={radius}
                            fill="transparent"
                            stroke={seg.color}
                            strokeWidth="9"
                            strokeDasharray={`${strokeDash} ${circumference}`}
                            strokeDashoffset={-offset}
                            strokeLinecap="round"
                            className="transition-all duration-500 ease-out"
                        />
                    );
                })}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                <span className="text-[17px] font-black font-mono text-[#1E1E1E] leading-none">
                    {totalRemaining}
                </span>
                <span className="text-[8px] font-extrabold uppercase tracking-wider text-gray-400 mt-0.5">
                    Days Left
                </span>
            </div>
        </div>
    );
};

const TeamLeavesTab = () => {
    const [loading, setLoading] = useState(true);
    const [leavesData, setLeavesData] = useState({ stats: null, teamBalances: [], leaves: [] });
    const [error, setError] = useState(null);

    // Member Balances Search
    const [memberSearch, setMemberSearch] = useState("");

    // Leave History Controls
    const [historySearch, setHistorySearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [typeFilter, setTypeFilter] = useState("all");
    const [view, setView] = useState("list");
    const [currentPage, setCurrentPage] = useState(1);
    const [sortField, setSortField] = useState("appliedDate");
    const [sortDir, setSortDir] = useState("desc");

    // Modal state for Approve/Reject with remarks
    const [actionModal, setActionModal] = useState({
        isOpen: false,
        leave: null,
        status: "",
        remarks: "",
        isSubmitting: false
    });

    const itemsPerPage = useResponsivePageSize(view);

    const statusColors = {
        "Pending": "bg-amber-50 text-amber-700 border-amber-200",
        "Approved": "bg-emerald-50 text-emerald-700 border-emerald-200",
        "Rejected": "bg-rose-50 text-rose-700 border-rose-200"
    };

    const fetchLeaves = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await getTeamLeaves();
            if (res.data.success) {
                setLeavesData({
                    stats: res.data.stats || null,
                    teamBalances: res.data.teamBalances || [],
                    leaves: res.data.leaves || []
                });
            } else {
                setError(res.data.message || "Failed to load team leave requests.");
            }
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || err.message || "Network Error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeaves();
    }, []);

    const openActionDialog = (leave, status) => {
        setActionModal({
            isOpen: true,
            leave,
            status,
            remarks: "",
            isSubmitting: false
        });
    };

    const handleConfirmAction = async () => {
        if (!actionModal.leave) return;
        try {
            setActionModal(prev => ({ ...prev, isSubmitting: true }));
            const res = await updateLeaveStatus(actionModal.leave._id, actionModal.status, actionModal.remarks);
            if (res.data?.success) {
                toast.success(`Leave request ${actionModal.status} successfully.`);
                setActionModal({ isOpen: false, leave: null, status: "", remarks: "", isSubmitting: false });
                fetchLeaves();
            } else {
                toast.error(res.data?.message || `Failed to update leave to ${actionModal.status}.`);
                setActionModal(prev => ({ ...prev, isSubmitting: false }));
            }
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || err.message || "Failed to update leave status.");
            setActionModal(prev => ({ ...prev, isSubmitting: false }));
        }
    };

    const handleSort = (field) => {
        const isAsc = sortField === field && sortDir === "asc";
        setSortDir(isAsc ? "desc" : "asc");
        setSortField(field);
        setCurrentPage(1);
    };

    // Filtered Balances
    const filteredBalances = useMemo(() => {
        if (!leavesData.teamBalances) return [];
        if (!memberSearch.trim()) return leavesData.teamBalances;
        const q = memberSearch.toLowerCase();
        return leavesData.teamBalances.filter(m =>
            m.name.toLowerCase().includes(q) ||
            (m.id && m.id.toLowerCase().includes(q)) ||
            (m.department && m.department.toLowerCase().includes(q)) ||
            (m.designation && m.designation.toLowerCase().includes(q))
        );
    }, [leavesData.teamBalances, memberSearch]);

    // Filtered Leave History
    const filteredLeaves = useMemo(() => {
        if (!leavesData.leaves) return [];
        return leavesData.leaves.filter(l => {
            const q = historySearch.toLowerCase();
            const matchesSearch = !historySearch.trim() || 
                l.name.toLowerCase().includes(q) ||
                (l.code && l.code.toLowerCase().includes(q)) ||
                l.type.toLowerCase().includes(q) ||
                (l.reason && l.reason.toLowerCase().includes(q));

            const matchesStatus = statusFilter === "all" || l.status.toLowerCase() === statusFilter.toLowerCase();
            const matchesType = typeFilter === "all" || l.type.toLowerCase() === typeFilter.toLowerCase();
            return matchesSearch && matchesStatus && matchesType;
        });
    }, [leavesData.leaves, historySearch, statusFilter, typeFilter]);

    const sortedLeaves = useMemo(() => {
        return [...filteredLeaves].sort((a, b) => {
            let valA = a[sortField] || "";
            let valB = b[sortField] || "";
            if (sortField === "appliedDate" || sortField === "createdAt") {
                valA = new Date(a.createdAt || a.startDate || 0).getTime();
                valB = new Date(b.createdAt || b.startDate || 0).getTime();
                return sortDir === "asc" ? valA - valB : valB - valA;
            }
            if (typeof valA === "string") {
                return sortDir === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
            }
            return sortDir === "asc" ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
        });
    }, [filteredLeaves, sortField, sortDir]);

    const paginatedLeaves = useMemo(() => {
        return sortedLeaves.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    }, [sortedLeaves, currentPage, itemsPerPage]);

    if (error) {
        return <ErrorAlert message={error} onRetry={fetchLeaves} />;
    }

    return (
        <div className="space-y-8 animate-fadeIn">
            {/* Stat Cards Overview */}
            {leavesData.stats && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4.5">
                    <MiniStatCard title="Pending Requests" value={leavesData.stats.pending} change="Requires Action" isPositive={false} />
                    <MiniStatCard title="Approved Leaves" value={leavesData.stats.approved} change="Approved Total" isPositive={true} />
                    <MiniStatCard title="Rejected Leaves" value={leavesData.stats.rejected} change="Declined Total" isPositive={false} />
                    <MiniStatCard title="Employees On Leave" value={leavesData.stats.onLeave} change="Currently Away" isPositive={false} />
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                SECTION 1: TEAM LEAVE BALANCES (PIE / DONUT PER MEMBER)
            ═══════════════════════════════════════════════════════════════ */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2">
                            <PieChart className="w-4 h-4 text-[#2D79C7]" />
                            <h3 className="text-[#1E1E1E] text-base font-black tracking-tight">Team Leave Balances</h3>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-[#2D79C7] border border-blue-100">
                                {filteredBalances.length} Member{filteredBalances.length !== 1 ? 's' : ''}
                            </span>
                        </div>
                        <p className="text-gray-400 text-xs font-medium mt-0.5">
                            Visual breakdown of remaining versus allocated leave balances for each team member
                        </p>
                    </div>

                    <div className="w-full sm:w-64">
                        <SearchBar
                            value={memberSearch}
                            onChange={(val) => setMemberSearch(val)}
                            placeholder="Search member, ID, dept..."
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <SkeletonLoader type="card" />
                        <SkeletonLoader type="card" />
                    </div>
                ) : filteredBalances.length === 0 ? (
                    <Card className="p-8 text-center bg-gray-50/50">
                        <p className="text-gray-400 text-xs font-semibold">No team members match your balance search.</p>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4.5">
                        {filteredBalances.map((m) => {
                            const totCL = m.casual?.total ?? 2.5;
                            const remCL = m.casual?.remaining ?? 2.5;
                            const totSL = m.sick?.total ?? 6;
                            const remSL = m.sick?.remaining ?? 6;
                            const totEL = m.earned?.total ?? 5;
                            const remEL = m.earned?.remaining ?? 5;
                            const totCO = m.compOff?.total ?? 0;
                            const remCO = m.compOff?.remaining ?? 0;

                            return (
                                <Card key={m._id} className="p-5 border border-gray-100 hover:border-blue-200/70 transition-all hover:shadow-md">
                                    {/* Member Header */}
                                    <div className="flex items-start justify-between pb-4 border-b border-gray-100/80">
                                        <div className="flex items-center gap-3">
                                            <Avatar name={m.name} src={m.profilePicture} size="w-11 h-11" textSize="text-xs" />
                                            <div className="flex flex-col text-left">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="text-[#1E1E1E] text-sm font-black tracking-tight">{m.name}</h4>
                                                    <span className="font-mono text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                                                        {m.id}
                                                    </span>
                                                </div>
                                                <span className="text-gray-400 text-xs font-semibold mt-0.5">
                                                    {m.designation || "Staff"} • <span className="text-gray-500">{m.department || "General"}</span>
                                                </span>
                                            </div>
                                        </div>
                                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${statusBadge(m.status)}`}>
                                            {m.status || "Active"}
                                        </span>
                                    </div>

                                    {/* Donut Chart & Quota Breakdown */}
                                    <div className="flex flex-col sm:flex-row items-center gap-5 pt-4">
                                        {/* Donut Chart */}
                                        <div className="flex flex-col items-center">
                                            <MemberLeaveDonut member={m} />
                                            <span className="text-[10px] font-bold text-gray-500 mt-1.5">
                                                {m.summary?.totalUsed || 0} Days Consumed
                                            </span>
                                        </div>

                                        {/* Detailed Quotas Grid */}
                                        <div className="flex-1 w-full space-y-2 text-left">
                                            {/* Casual Leave */}
                                            <div className="p-2 rounded-lg bg-blue-50/40 border border-blue-100/60 flex items-center justify-between text-xs">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full bg-[#3B82F6]" />
                                                    <span className="font-bold text-gray-700">Casual Leave (CL)</span>
                                                </div>
                                                <div className="flex items-center gap-2 font-mono">
                                                    <span className="font-extrabold text-[#1E1E1E]">{remCL}</span>
                                                    <span className="text-gray-400 text-[10px]">/ {totCL}</span>
                                                    {m.casual?.used > 0 && (
                                                        <span className="text-[9px] font-semibold text-gray-400">({m.casual.used} used)</span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Sick Leave */}
                                            <div className="p-2 rounded-lg bg-amber-50/40 border border-amber-100/60 flex items-center justify-between text-xs">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                                                    <span className="font-bold text-gray-700">Sick Leave (SL)</span>
                                                </div>
                                                <div className="flex items-center gap-2 font-mono">
                                                    <span className="font-extrabold text-[#1E1E1E]">{remSL}</span>
                                                    <span className="text-gray-400 text-[10px]">/ {totSL}</span>
                                                    {m.sick?.used > 0 && (
                                                        <span className="text-[9px] font-semibold text-gray-400">({m.sick.used} used)</span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Earned Leave */}
                                            <div className="p-2 rounded-lg bg-emerald-50/40 border border-emerald-100/60 flex items-center justify-between text-xs">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                                                    <span className="font-bold text-gray-700">Earned Leave (EL)</span>
                                                </div>
                                                <div className="flex items-center gap-2 font-mono">
                                                    <span className="font-extrabold text-[#1E1E1E]">{remEL}</span>
                                                    <span className="text-gray-400 text-[10px]">/ {totEL}</span>
                                                    {m.earned?.used > 0 && (
                                                        <span className="text-[9px] font-semibold text-gray-400">({m.earned.used} used)</span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Comp Off */}
                                            <div className="p-2 rounded-lg bg-violet-50/40 border border-violet-100/60 flex items-center justify-between text-xs">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full bg-[#8B5CF6]" />
                                                    <span className="font-bold text-gray-700">Comp Off (CO)</span>
                                                </div>
                                                <div className="flex items-center gap-2 font-mono">
                                                    <span className="font-extrabold text-[#1E1E1E]">{remCO}</span>
                                                    <span className="text-gray-400 text-[10px]">/ {totCO}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Member Footer Summary */}
                                    <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] font-semibold text-gray-500">
                                        <span>Total Quota: <strong className="text-gray-800 font-mono">{m.summary?.totalAllocated || 0}</strong></span>
                                        <span>Remaining: <strong className="text-[#2D79C7] font-mono">{m.summary?.totalRemaining || 0}</strong></span>
                                        <span>Used: <strong className="text-rose-600 font-mono">{m.summary?.totalUsed || 0}</strong></span>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                SECTION 2: LEAVES HISTORY & REQUESTS (TABLE VIEW)
            ═══════════════════════════════════════════════════════════════ */}
            <div className="space-y-4 pt-4 border-t border-gray-200/80">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-[#2D79C7]" />
                            <h3 className="text-[#1E1E1E] text-base font-black tracking-tight">Team Leave Requests & History</h3>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                                {filteredLeaves.length} Application{filteredLeaves.length !== 1 ? 's' : ''}
                            </span>
                        </div>
                        <p className="text-gray-400 text-xs font-medium mt-0.5">
                            Manage leave requests, review applicant details, reason, date duration, and approve or reject
                        </p>
                    </div>

                    <ViewToggle view={view} onViewChange={setView} />
                </div>

                {/* Filter and Search Bar */}
                <div className="premium-3d-card-mini flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between p-3.5">
                    <div className="flex-1 min-w-[200px]">
                        <SearchBar
                            value={historySearch}
                            onChange={(val) => { setHistorySearch(val); setCurrentPage(1); }}
                            placeholder="Search applicant name, employee ID, reason..."
                        />
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Status Filter */}
                        <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl border border-gray-200/60 text-xs font-bold text-gray-600">
                            {["all", "pending", "approved", "rejected"].map((st) => (
                                <button
                                    key={st}
                                    onClick={() => { setStatusFilter(st); setCurrentPage(1); }}
                                    className={`px-2.5 py-1 rounded-lg capitalize transition-all cursor-pointer ${
                                        statusFilter === st 
                                            ? "bg-white text-[#2D79C7] shadow-sm font-extrabold" 
                                            : "hover:text-gray-900"
                                    }`}
                                >
                                    {st}
                                </button>
                            ))}
                        </div>

                        {/* Leave Type Filter */}
                        <select
                            value={typeFilter}
                            onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
                            className="bg-white border border-gray-200/80 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#2D79C7]/20"
                        >
                            <option value="all">All Leave Types</option>
                            <option value="Casual Leave">Casual Leave</option>
                            <option value="Sick Leave">Sick Leave</option>
                            <option value="Earned Leave">Earned Leave</option>
                            <option value="Partial Day">Partial Day</option>
                            <option value="Comp Off">Comp Off</option>
                            <option value="Unpaid Leave">Unpaid Leave</option>
                        </select>
                    </div>
                </div>

                {loading ? (
                    <SkeletonLoader type={view === "card" ? "card" : "table"} />
                ) : filteredLeaves.length === 0 ? (
                    <EmptyState
                        message="No leave applications found"
                        description="There are no leave requests matching your current filter criteria."
                    />
                ) : view === "card" ? (
                    // CARD VIEW
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                            {paginatedLeaves.map((l) => (
                                <Card key={l._id} className="p-4.5 flex flex-col justify-between h-[320px] border border-gray-100 hover:shadow-md transition-all">
                                    <div>
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-2.5">
                                                <Avatar name={l.name} src={l.profilePicture} size="w-9 h-9" />
                                                <div className="flex flex-col text-left">
                                                    <h4 className="text-[#1E1E1E] text-xs font-black truncate max-w-[130px]">{l.name}</h4>
                                                    <span className="text-gray-400 text-[10px] font-mono">{l.code || "EMP"}</span>
                                                </div>
                                            </div>
                                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border leading-none ${statusColors[l.status] || "bg-gray-50 text-gray-600"}`}>
                                                {l.status}
                                            </span>
                                        </div>

                                        <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-[#2D79C7]">
                                                {l.type}
                                            </span>
                                            {l.partialTiming && (
                                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">
                                                    {l.partialTiming}
                                                </span>
                                            )}
                                        </div>

                                        <p className="text-gray-600 text-[11px] leading-relaxed text-left mt-2.5 line-clamp-2 h-[34px] italic" title={l.reason}>
                                            "{l.reason}"
                                        </p>

                                        <div className="mt-3 space-y-1.5 text-left border-t border-gray-50 pt-2.5 text-[11px] font-semibold text-gray-500">
                                            <div className="flex justify-between">
                                                <span>Duration</span>
                                                <span className="text-gray-800 font-bold font-mono">{l.duration}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Dates</span>
                                                <span className="text-gray-800 font-bold font-mono">{l.start} → {l.end}</span>
                                            </div>
                                            <div className="flex justify-between text-[10px]">
                                                <span className="text-gray-400">Applied On</span>
                                                <span className="text-gray-600 font-medium">{l.appliedDate || "—"}</span>
                                            </div>
                                            {l.remarks && (
                                                <div className="text-[10px] text-gray-500 truncate pt-1 border-t border-gray-50" title={l.remarks}>
                                                    <span className="font-bold">Remarks:</span> {l.remarks}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="pt-3 border-t border-gray-100">
                                        {l.status === "Pending" ? (
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => openActionDialog(l, "approved")}
                                                    className="flex-1 py-1.5 bg-[#2E7D32]/10 hover:bg-[#2E7D32]/25 text-[#2E7D32] border border-[#2E7D32]/20 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
                                                >
                                                    <Check className="w-3.5 h-3.5" />
                                                    <span>Approve</span>
                                                </button>
                                                <button
                                                    onClick={() => openActionDialog(l, "rejected")}
                                                    className="flex-1 py-1.5 bg-[#C62828]/10 hover:bg-[#C62828]/25 text-[#C62828] border border-[#C62828]/20 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                    <span>Reject</span>
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="text-center py-1">
                                                <span className={`text-[10px] font-extrabold uppercase tracking-wider ${l.status === "Approved" ? "text-emerald-600" : "text-rose-600"}`}>
                                                    {l.status}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </Card>
                            ))}
                        </div>
                        <Pagination total={filteredLeaves.length} limit={itemsPerPage} currentPage={currentPage} onPageChange={setCurrentPage} />
                    </div>
                ) : (
                    // LIST / TABLE VIEW (All applied leave columns except notify)
                    <Card className="animate-fadeIn border border-gray-100">
                        <div className="overflow-x-auto w-full">
                            <table className="w-full border-collapse text-left whitespace-nowrap">
                                <thead>
                                    <tr className="border-b border-[#F3F4F6] text-gray-400 text-[10px] font-extrabold uppercase tracking-wider select-none bg-gray-50/50">
                                        <th className="px-5 py-3.5">
                                            <SortHeader label="Applicant Employee" field="name" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                                        </th>
                                        <th className="px-5 py-3.5">
                                            <SortHeader label="Leave Type" field="type" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                                        </th>
                                        <th className="px-5 py-3.5">
                                            <SortHeader label="Dates (Start → End)" field="start" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                                        </th>
                                        <th className="px-5 py-3.5">
                                            <SortHeader label="Duration" field="totalDays" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                                        </th>
                                        <th className="px-5 py-3.5">
                                            <SortHeader label="Applied On" field="appliedDate" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                                        </th>
                                        <th className="px-5 py-3.5">Reason for Leave</th>
                                        <th className="px-5 py-3.5">
                                            <SortHeader label="Status" field="status" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                                        </th>
                                        <th className="px-5 py-3.5">Manager Remarks</th>
                                        <th className="px-5 py-3.5 text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#F9FAFB] text-xs font-semibold text-gray-600">
                                    {paginatedLeaves.map((l) => (
                                        <tr key={l._id} className="hover:bg-blue-50/20 transition-colors">
                                            {/* Employee info */}
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-2.5">
                                                    <Avatar name={l.name} src={l.profilePicture} size="w-8 h-8" />
                                                    <div className="flex flex-col text-left">
                                                        <span className="text-[#1E1E1E] font-bold block">{l.name}</span>
                                                        <span className="text-gray-400 text-[10px] font-mono font-bold mt-0.5">
                                                            {l.code || "EMP"} {l.designation ? `• ${l.designation}` : ""}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Leave type */}
                                            <td className="px-5 py-3.5">
                                                <div className="flex flex-col items-start gap-1">
                                                    <span className="font-bold text-[#2D79C7]">{l.type}</span>
                                                    {l.partialTiming && (
                                                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-100">
                                                            {l.partialTiming}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Start and End date */}
                                            <td className="px-5 py-3.5 font-mono text-gray-700">
                                                {l.start === l.end ? (
                                                    <span>{l.start}</span>
                                                ) : (
                                                    <span>{l.start} <span className="text-gray-400">→</span> {l.end}</span>
                                                )}
                                            </td>

                                            {/* Duration */}
                                            <td className="px-5 py-3.5 font-mono text-gray-800 font-bold">
                                                <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-800 text-[11px]">
                                                    {l.duration}
                                                </span>
                                            </td>

                                            {/* Applied Date */}
                                            <td className="px-5 py-3.5 text-gray-500 font-medium">
                                                {l.appliedDate || "—"}
                                            </td>

                                            {/* Reason */}
                                            <td className="px-5 py-3.5 max-w-[220px] truncate text-gray-600 font-medium" title={l.reason}>
                                                "{l.reason}"
                                            </td>

                                            {/* Status */}
                                            <td className="px-5 py-3.5">
                                                <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full border ${statusColors[l.status] || "bg-gray-50 text-gray-600"}`}>
                                                    {l.status}
                                                </span>
                                            </td>

                                            {/* Remarks */}
                                            <td className="px-5 py-3.5 max-w-[150px] truncate text-gray-400 italic text-[11px]" title={l.remarks || ""}>
                                                {l.remarks || "—"}
                                            </td>

                                            {/* Actions */}
                                            <td className="px-5 py-3.5 text-center">
                                                {l.status === "Pending" ? (
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        <button
                                                            onClick={() => openActionDialog(l, "approved")}
                                                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 focus:outline-none"
                                                            title="Approve leave request"
                                                        >
                                                            <Check className="w-3.5 h-3.5" />
                                                            <span>Approve</span>
                                                        </button>
                                                        <button
                                                            onClick={() => openActionDialog(l, "rejected")}
                                                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 focus:outline-none"
                                                            title="Reject leave request"
                                                        >
                                                            <X className="w-3.5 h-3.5" />
                                                            <span>Reject</span>
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] font-extrabold text-gray-400 select-none uppercase tracking-wide">
                                                        {l.status}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <Pagination total={filteredLeaves.length} limit={itemsPerPage} currentPage={currentPage} onPageChange={setCurrentPage} />
                    </Card>
                )}
            </div>

            {/* Manager Approve / Reject Confirmation Modal */}
            {actionModal.isOpen && actionModal.leave && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
                    <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gray-100 p-6 space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                            <div className="flex items-center gap-2">
                                {actionModal.status === "approved" ? (
                                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                        <Check className="w-4 h-4" />
                                    </div>
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
                                        <X className="w-4 h-4" />
                                    </div>
                                )}
                                <div>
                                    <h3 className="text-sm font-black text-[#1E1E1E] capitalize">
                                        {actionModal.status} Leave Request
                                    </h3>
                                    <span className="text-[11px] text-gray-400 font-medium">
                                        Applicant: {actionModal.leave.name} ({actionModal.leave.code || "EMP"})
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => setActionModal({ isOpen: false, leave: null, status: "", remarks: "", isSubmitting: false })}
                                className="text-gray-400 hover:text-gray-600 p-1"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Leave Details Brief */}
                        <div className="p-3 bg-gray-50 rounded-xl space-y-1.5 text-xs text-gray-600 font-medium">
                            <div className="flex justify-between">
                                <span className="text-gray-400">Leave Type:</span>
                                <span className="font-bold text-[#1E1E1E]">{actionModal.leave.type}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Dates:</span>
                                <span className="font-bold text-[#1E1E1E] font-mono">{actionModal.leave.start} → {actionModal.leave.end}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Duration:</span>
                                <span className="font-bold text-[#1E1E1E] font-mono">{actionModal.leave.duration}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Reason:</span>
                                <span className="font-semibold text-gray-700 italic max-w-[240px] truncate">"{actionModal.leave.reason}"</span>
                            </div>
                        </div>

                        {/* Optional Remarks */}
                        <div className="space-y-1 text-left">
                            <label className="text-xs font-bold text-gray-700">
                                Manager Remarks / Comments <span className="text-gray-400 font-normal">(Optional)</span>
                            </label>
                            <textarea
                                value={actionModal.remarks}
                                onChange={(e) => setActionModal(prev => ({ ...prev, remarks: e.target.value }))}
                                placeholder={actionModal.status === "rejected" ? "Provide reason for rejection..." : "Add any notes or approval comments..."}
                                rows={3}
                                className="w-full text-xs p-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#2D79C7]/20 text-gray-800 resize-none"
                            />
                        </div>

                        {/* Modal Action Buttons */}
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                            <button
                                type="button"
                                disabled={actionModal.isSubmitting}
                                onClick={() => setActionModal({ isOpen: false, leave: null, status: "", remarks: "", isSubmitting: false })}
                                className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={actionModal.isSubmitting}
                                onClick={handleConfirmAction}
                                className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-all cursor-pointer flex items-center gap-1.5 shadow-sm ${
                                    actionModal.status === "approved"
                                        ? "bg-emerald-600 hover:bg-emerald-700"
                                        : "bg-rose-600 hover:bg-rose-700"
                                }`}
                            >
                                {actionModal.isSubmitting ? (
                                    <span>Processing...</span>
                                ) : (
                                    <>
                                        {actionModal.status === "approved" ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                                        <span className="capitalize">Confirm {actionModal.status}</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

/* ─────────────────────────────────────────────
   5. TEAM PERFORMANCE TAB
───────────────────────────────────────────── */
const TeamPerformanceTab = () => {
    const [loading, setLoading] = useState(true);
    const [performanceData, setPerformanceData] = useState({ stats: null, reviews: [], departments: [] });
    const [error, setError] = useState(null);
    const [view, setView] = useState("list");
    const [search, setSearch] = useState("");
    const [selectedQuarter, setSelectedQuarter] = useState("All");
    const [currentPage, setCurrentPage] = useState(1);
    const [sortField, setSortField] = useState("name");
    const [sortDir, setSortDir] = useState("asc");

    const itemsPerPage = useResponsivePageSize(view);

    const ratingColors = {
        "Outstanding": "bg-emerald-50 text-emerald-700 border-emerald-100",
        "Exceeds Expectations": "bg-blue-50 text-[#2D79C7] border-blue-100",
        "Meets Expectations": "bg-[#FEEC41]/10 text-amber-700 border-[#FEEC41]/20",
        "Needs Improvement": "bg-rose-50 text-rose-700 border-rose-100"
    };

    const fetchPerformance = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await getTeamPerformance();
            if (res.data.success) {
                setPerformanceData({
                    stats: res.data.stats,
                    reviews: res.data.reviews,
                    departments: res.data.departments
                });
            } else {
                setError(res.data.message || "Failed to load team performance logs.");
            }
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || err.message || "Network Error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPerformance();
    }, []);

    const handleSort = (field) => {
        const isAsc = sortField === field && sortDir === "asc";
        setSortDir(isAsc ? "desc" : "asc");
        setSortField(field);
        setCurrentPage(1);
    };

    const filtered = performanceData.reviews.filter(r => {
        const matchesSearch = r.name.toLowerCase().includes(search.toLowerCase()) || r.dept.toLowerCase().includes(search.toLowerCase());
        const matchesQuarter = selectedQuarter === "All" || r.quarter === selectedQuarter;
        return matchesSearch && matchesQuarter;
    });

    const sorted = [...filtered].sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];
        return sortDir === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });

    const paginated = sorted.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    if (error) {
        return <ErrorAlert message={error} onRetry={fetchPerformance} />;
    }

    return (
        <div className="space-y-6">
            {/* Top Stats - Exactly 3 columns on desktop */}
            {performanceData.stats && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 animate-fadeIn">
                    <MiniStatCard title="Outstanding" value={performanceData.stats.outstanding} change="Outstanding" isPositive={true} />
                    <MiniStatCard title="Exceeds Expectations" value={performanceData.stats.exceeds} change="Exceeds" isPositive={true} />
                    <MiniStatCard title="Meets Expectations" value={performanceData.stats.meets} change="Meets" isPositive={true} />
                    <MiniStatCard title="Needs Improvement" value={performanceData.stats.needsImprovement} change="Needs Attention" isPositive={false} />
                </div>
            )}

            {/* Controls */}
            <div className="premium-3d-card-mini flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between p-4.5 animate-fadeIn">
                <div className="flex flex-wrap items-center gap-3">
                    <SearchBar value={search} onChange={(val) => { setSearch(val); setCurrentPage(1); }} placeholder="Search employee or department..." />
                    
                    {/* Quarter select */}
                    <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 px-3 py-2 rounded-[12px] h-[38px]">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        <select
                            value={selectedQuarter}
                            onChange={(e) => { setSelectedQuarter(e.target.value); setCurrentPage(1); }}
                            className="bg-transparent border-0 text-xs font-bold text-gray-600 focus:outline-none cursor-pointer"
                        >
                            <option value="All">All Quarters</option>
                            <option value="Q2 2026">Q2 2026</option>
                            <option value="Q1 2026">Q1 2026</option>
                        </select>
                    </div>
                </div>

                <ViewToggle view={view} onViewChange={setView} />
            </div>

            {loading ? (
                <SkeletonLoader type={view === "card" ? "card" : "table"} />
            ) : filtered.length === 0 ? (
                <EmptyState message="No performance reviews found" description="There are no review records matching your filter criteria." />
            ) : view === "card" ? (
                // CARD VIEW
                <div className="space-y-6 animate-fadeIn">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {paginated.map((review, idx) => (
                            <Card key={idx} className="p-5 flex flex-col justify-between h-[280px]">
                                <div>
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <Avatar name={review.name} src={review.profilePicture} size="w-10 h-10" />
                                            <div className="flex flex-col text-left">
                                                <h4 className="text-[#1E1E1E] text-xs font-black block truncate max-w-[130px]">{review.name}</h4>
                                                <span className="text-gray-400 text-[10px] font-bold block">{review.dept}</span>
                                            </div>
                                        </div>
                                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border leading-none ${ratingColors[review.status] || "bg-gray-50 text-gray-600 border-gray-100"}`}>
                                            {review.status}
                                        </span>
                                    </div>
                                    <div className="mt-6 space-y-2.5 text-left border-t border-gray-50 pt-4 text-[11px] font-semibold text-gray-500">
                                        <div className="flex justify-between">
                                            <span>Rating score</span>
                                            <span className="text-[#2D79C7] font-extrabold font-mono">{review.rating}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Review period</span>
                                            <span className="text-gray-800 font-bold font-mono">{review.quarter}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Evaluated by</span>
                                            <span className="text-gray-700 font-bold">{review.reviewer}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="pt-3.5 border-t border-[#F3F4F6] text-[10px] font-bold text-gray-400 font-mono text-left">
                                    Last Review Date: {review.date}
                                </div>
                            </Card>
                        ))}
                    </div>
                    <Pagination total={filtered.length} limit={itemsPerPage} currentPage={currentPage} onPageChange={setCurrentPage} />
                </div>
            ) : (
                // LIST VIEW
                <Card className="animate-fadeIn">
                    <div className="overflow-x-auto w-full">
                        <table className="w-full border-collapse text-left whitespace-nowrap">
                            <thead>
                                <tr className="border-b border-[#F3F4F6] text-gray-400 text-[10px] font-extrabold uppercase tracking-wider select-none">
                                    <th className="px-6 py-4">
                                        <SortHeader label="Employee" field="name" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                                    </th>
                                    <th className="px-6 py-4">
                                        <SortHeader label="Department" field="dept" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                                    </th>
                                    <th className="px-6 py-4">
                                        <SortHeader label="Quarter" field="quarter" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                                    </th>
                                    <th className="px-6 py-4">
                                        <SortHeader label="Performance Rating" field="rating" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                                    </th>
                                    <th className="px-6 py-4">Reviewer</th>
                                    <th className="px-6 py-4">
                                        <SortHeader label="Review Date" field="date" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                                    </th>
                                    <th className="px-6 py-4">Performance Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#F9FAFB] text-xs font-semibold text-gray-600">
                                {paginated.map((review, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-3.5">
                                            <div className="flex items-center gap-3">
                                                <Avatar name={review.name} src={review.profilePicture} size="w-8 h-8" />
                                                <span className="text-[#1E1E1E] font-bold block">{review.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3.5">{review.dept}</td>
                                        <td className="px-6 py-3.5 font-bold text-gray-500">{review.quarter}</td>
                                        <td className="px-6 py-3.5 font-black text-[#2D79C7] font-mono">{review.rating}</td>
                                        <td className="px-6 py-3.5 text-gray-700">{review.reviewer}</td>
                                        <td className="px-6 py-3.5 font-mono text-gray-500">{review.date}</td>
                                        <td className="px-6 py-3.5">
                                            <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full border shrink-0 ${ratingColors[review.status] || "bg-gray-50 text-gray-600 border-gray-100"}`}>
                                                {review.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <Pagination total={filtered.length} limit={itemsPerPage} currentPage={currentPage} onPageChange={setCurrentPage} />
                </Card>
            )}
        </div>
    );
};

/* ─────────────────────────────────────────────
   MAIN PAGE: MY TEAM PAGE
───────────────────────────────────────────── */
const MyTeam = () => {
    const { user } = useAuth();
    const userRole = (user?.role || "employee").toLowerCase();
    const isGlobalAdmin = userRole === "global_admin" || userRole === "admin";
    const isManager = userRole === "manager" || userRole === "management";
    const isHr = userRole === "hr";

    const mt = user?.permissions?.myTeam;
    const hasMyTeamAccess = useMemo(() => {
        if (isGlobalAdmin) return true;
        if (typeof mt === "boolean") {
            if (isManager || isHr) return mt !== false;
            return mt === true;
        }
        if (typeof mt === "object" && mt !== null) {
            return mt.access === true;
        }
        return isManager || isHr;
    }, [isGlobalAdmin, isManager, isHr, mt]);

    // Regular employee / intern protection if access is not granted
    if (!hasMyTeamAccess) {
        return (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm max-w-xl mx-auto mt-8 select-none animate-fadeIn">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#2D79C7] mx-auto flex items-center justify-center mb-4 border border-blue-100">
                    <Clock className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1.5">Team Access is Restricted</h3>
                <p className="text-xs text-slate-500 leading-relaxed mb-5">
                    Team management modules are accessible only to authorized personnel. You can view your personal profile and attendance in the <strong>Me</strong> tab.
                </p>
                <a
                    href="/me"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#2D79C7] hover:bg-[#2367ac] text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                >
                    View My Profile
                </a>
            </div>
        );
    }

    const tabs = React.useMemo(() => {
        const allTabs = [
            { key: "Team Summary", permKey: "teamSummary", icon: LayoutDashboard, label: "Team Summary" },
            { key: "Team Members", permKey: "teamMembers", icon: Users, label: "Team Members" },
            { key: "Team Attendance", permKey: "teamAttendance", icon: Clock, label: "Team Attendance" },
            { key: "Team Leaves", permKey: "teamLeaves", icon: Umbrella, label: "Team Leaves" },
            { key: "Team Performance", permKey: "teamPerformance", icon: Award, label: "Team Performance" }
        ];

        if (isGlobalAdmin) {
            return allTabs;
        }

        if (typeof mt === "object" && mt !== null) {
            const filtered = allTabs.filter(tab => mt[tab.permKey] === true);
            return filtered.length > 0 ? filtered : allTabs;
        }

        return allTabs;
    }, [isGlobalAdmin, mt]);

    const [activeTab, setActiveTab] = useState(tabs[0]?.key || "Team Attendance");

    useEffect(() => {
        if (tabs.length > 0 && !tabs.some(t => t.key === activeTab)) {
            setActiveTab(tabs[0].key);
        }
    }, [tabs, activeTab]);

    return (
        <div className="space-y-6 select-none animate-fadeIn">
            {/* Top tab sub-navigation bar */}
            <div className="premium-3d-card-mini px-6 py-1 flex items-center">
                <nav className="flex gap-4 overflow-x-auto scrollbar-none">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.key;
                        return (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => setActiveTab(tab.key)}
                                className={`flex items-center gap-2 px-3 py-4 text-[13px] font-bold border-b-2 transition-all cursor-pointer relative whitespace-nowrap ${isActive
                                    ? "border-[#2D79C7] text-[#2D79C7]"
                                    : "border-transparent text-gray-400 hover:text-gray-600"
                                    }`}
                            >
                                <Icon className={`w-4 h-4 ${isActive ? "text-[#2D79C7]" : "text-gray-400"}`} />
                                <span>{tab.label}</span>
                                {isActive && (
                                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#2D79C7] rounded-full" />
                                )}
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* Render Active Tab */}
            {activeTab === "Team Summary" && <TeamSummaryTab />}
            {activeTab === "Team Members" && <TeamMembersTab />}
            {activeTab === "Team Attendance" && <TeamAttendanceTab />}
            {activeTab === "Team Leaves" && <TeamLeavesTab />}
            {activeTab === "Team Performance" && <TeamPerformanceTab />}
        </div>
    );
};

export default MyTeam;
