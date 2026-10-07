import React, { useState, useEffect } from "react";
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
    Activity
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
import { getEmployeeById } from "../../services/employee.service";
import { ViewEmployeeDrawer } from "../employees/Employees";
import { useAuth } from "../../context/AuthContext";

const useResponsivePageSize = (viewMode) => {
    const [windowWidth, setWindowWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1024);
    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    if (viewMode === "card") {
        if (windowWidth >= 1024) return 10;
        if (windowWidth >= 640) return 6;
        return 4;
    }
    return 10;
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

const MiniStatCard = ({ title, value, change, isPositive }) => (
    <div className="premium-3d-card-mini p-4.5 flex flex-col justify-between">
        <div className="flex justify-between items-start">
            <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider leading-none">{title}</span>
            {change && (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded leading-none ${isPositive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                    {change}
                </span>
            )}
        </div>
        <div className="mt-3.5 flex items-baseline gap-1.5">
            <span className="text-[#1E1E1E] text-[20px] font-black leading-none">{value}</span>
        </div>
    </div>
);
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
                <MiniStatCard title="Total Employees" value={summary.totalEmployees} change="Count" isPositive={true} />
                <MiniStatCard title="Active Employees" value={summary.activeEmployees} change="Active" isPositive={true} />
                <MiniStatCard title="On Leave Today" value={summary.onLeaveToday} change="Leave" isPositive={false} />
                <MiniStatCard title="WFH Today" value={summary.wfhToday} change="WFH" isPositive={true} />
                <MiniStatCard title="New Joiners" value={summary.newJoiners} change="30 Days" isPositive={true} />
                <MiniStatCard title="Pending Approvals" value={summary.pendingApprovals} change="Action" isPositive={false} />
            </div>

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
                setEmployees(res.data.members);
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

    const statusBadge = (status) => {
        if (status === "Active") return "bg-emerald-50 text-emerald-700 border-emerald-100";
        if (status === "On Notice") return "bg-amber-50 text-amber-700 border-amber-100";
        return "bg-gray-50 text-gray-500 border-gray-100";
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

    // Resolve reporting manager object if available
    const rawManager = (typeof user?.managerId === "object" && user?.managerId !== null)
        ? user.managerId
        : employees.find(e => e._id === user?.managerId || e.id === user?.managerId);

    const managerName = (
        rawManager?.name ||
        rawManager?.fullName ||
        `${rawManager?.firstName || ''} ${rawManager?.lastName || ''}`.trim() ||
        (typeof user?.managerId === "string" ? user.managerId : "") ||
        user?.managerName ||
        (userRole !== "global_admin" ? "Rishabh Loomba" : "")
    ).trim();

    const managerInfo = managerName ? {
        name: managerName,
        profilePicture: rawManager?.profilePicture || "",
        designation: rawManager?.designation || rawManager?.title || "Technical Team Lead",
        department: rawManager?.department || rawManager?.dept || "Software Development"
    } : null;

    // Filter
    const filtered = employees.filter(e => {
        // Exclude self from team members list
        if (e._id === currentUserId || e.id === user?.employeeId) {
            return false;
        }

        if (isManagerRole) {
            // Manager role: ONLY show employees reporting to this logged-in manager
            const empManagerId = typeof e.managerId === "object" ? e.managerId?._id : (e.managerId || e._id);
            const empManagerName = (e.manager || "").trim().toLowerCase();
            
            const matchesId = empManagerId && currentUserId && empManagerId.toString() === currentUserId.toString();
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
                                            <span>Manager</span>
                                            <span className="text-gray-700 font-bold">{emp.manager}</span>
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
                                        <td className="px-6 py-3.5 text-gray-700">{emp.manager}</td>
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
                    {["View Profile", "Edit Employee", "View Attendance", "View Leaves"].map((act) => (
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
   3. TEAM ATTENDANCE TAB
───────────────────────────────────────────── */
const TeamAttendanceTab = () => {
    const [loading, setLoading] = useState(true);
    const [attendanceData, setAttendanceData] = useState({ stats: null, logs: [] });
    const [error, setError] = useState(null);
    const [view, setView] = useState("list");
    const [search, setSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [sortField, setSortField] = useState("name");
    const [sortDir, setSortDir] = useState("asc");

    const itemsPerPage = useResponsivePageSize(view);
    const [expandedLogs, setExpandedLogs] = useState([]);
    const [attendanceMenuAnchor, setAttendanceMenuAnchor] = useState(null);

    const toggleLogExpand = (id) => {
        setExpandedLogs(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const statusColors = {
        "Present": "bg-emerald-50 text-emerald-700 border-emerald-100",
        "WFH": "bg-blue-50 text-[#2D79C7] border-blue-100",
        "Late": "bg-amber-50 text-amber-700 border-amber-100",
        "Half Day": "bg-violet-50 text-violet-700 border-violet-100",
        "Absent": "bg-rose-50 text-rose-700 border-rose-100",
        "On Leave": "bg-indigo-50 text-indigo-700 border-indigo-100",
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

    const filtered = attendanceData.logs.filter(a => 
        a.name.toLowerCase().includes(search.toLowerCase()) || 
        a.dept.toLowerCase().includes(search.toLowerCase())
    );

    const sorted = [...filtered].sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];
        return sortDir === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });

    const paginated = sorted.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    if (error) {
        return <ErrorAlert message={error} onRetry={fetchAttendance} />;
    }

    return (
        <div className="space-y-6">
            {/* Stats Summary - Exactly 3 columns on desktop */}
            {attendanceData.stats && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 animate-fadeIn">
                    <MiniStatCard title="Present Today" value={attendanceData.stats.present} change="Office" isPositive={true} />
                    <MiniStatCard title="Absent / Leave" value={attendanceData.stats.absent} change="Offline" isPositive={false} />
                    <MiniStatCard title="WFH Employees" value={attendanceData.stats.wfh} change="Remote" isPositive={true} />
                    <MiniStatCard title="Late Arrivals" value={attendanceData.stats.late} change="Action" isPositive={false} />
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
                                        <div className="flex items-center gap-3">
                                            <Avatar name={log.name} src={log.profilePicture} size="w-10 h-10" />
                                            <div className="flex flex-col text-left">
                                                <h4 className="text-[#1E1E1E] text-xs font-black block truncate max-w-[130px]">{log.name}</h4>
                                                <span className="text-gray-400 text-[10px] font-bold block">{log.dept}</span>
                                            </div>
                                        </div>
                                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border leading-none ${statusColors[log.status] || "bg-gray-50 text-gray-600 border-gray-100"}`}>
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
                                {/* View Logs Toggle */}
                                <button
                                    onClick={() => toggleLogExpand(log.userId || log.name)}
                                    className="mt-3 w-full flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-bold text-[#2D79C7] bg-blue-50/60 hover:bg-blue-100/60 rounded-[10px] border border-blue-100/60 transition-colors cursor-pointer"
                                >
                                    <Activity className="w-3 h-3" />
                                    {expandedLogs.includes(log.userId || log.name) ? "Hide Movement Logs" : "View Movement Logs"}
                                    {expandedLogs.includes(log.userId || log.name) ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                </button>
                                {/* Expanded Movement Logs */}
                                {expandedLogs.includes(log.userId || log.name) && (
                                    <div className="mt-2.5 py-2.5 px-3 bg-gray-50 rounded-[12px] border border-gray-100 animate-fadeIn">
                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider block mb-2">Movement Timeline</span>
                                        {(!log.movementLogs || log.movementLogs.length === 0) ? (
                                            <span className="text-[10px] text-gray-400 italic">No movement logs recorded.</span>
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
                                        <SortHeader label="Department" field="dept" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
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
                                                    <div className="flex items-center gap-3">
                                                        <Avatar name={log.name} src={log.profilePicture} size="w-8 h-8" />
                                                        <span className="text-[#1E1E1E] font-bold block">{log.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3.5">{log.dept}</td>
                                                <td className="px-6 py-3.5 font-mono text-gray-700">{log.checkIn}</td>
                                                <td className="px-6 py-3.5 font-mono text-gray-700">{log.checkOut}</td>
                                                <td className="px-6 py-3.5 font-mono text-gray-500 font-bold">{log.hours}</td>
                                                <td className="px-6 py-3.5 font-medium">{log.mode}</td>
                                                <td className="px-6 py-3.5">
                                                    <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full border ${statusColors[log.status] || "bg-gray-50 text-gray-600 border-gray-100"}`}>
                                                        {log.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-3.5 text-center">
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
                                                </td>
                                            </tr>
                                            {/* Expanded Movement Logs Row */}
                                            {isExpanded && (
                                                <tr className="bg-[#F8FAFC]">
                                                    <td colSpan={8} className="px-6 py-3">
                                                        <div className="py-2.5 px-4 bg-gray-50 rounded-[14px] border border-gray-100 animate-fadeIn">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <Activity className="w-3.5 h-3.5 text-[#2D79C7]" />
                                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Movement Timeline</span>
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
                    className="w-[180px] bg-white border border-gray-100 rounded-[12px] shadow-xl py-1 z-50 text-left animate-in fade-in slide-in-from-top-1 duration-150"
                >
                    <button
                        onClick={() => {
                            toggleLogExpand(attendanceMenuAnchor.id);
                            setAttendanceMenuAnchor(null);
                        }}
                        className="w-full px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-blue-50/50 hover:text-[#2D79C7] transition-all text-left flex items-center gap-2 focus:outline-none cursor-pointer"
                    >
                        <Activity className="w-3.5 h-3.5 text-gray-400" />
                        <span>{expandedLogs.includes(attendanceMenuAnchor.id) ? "Hide Movement Logs" : "View Movement Logs"}</span>
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
const TeamLeavesTab = () => {
    const [loading, setLoading] = useState(true);
    const [leavesData, setLeavesData] = useState({ stats: null, leaves: [] });
    const [error, setError] = useState(null);
    const [view, setView] = useState("list");
    const [search, setSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [sortField, setSortField] = useState("name");
    const [sortDir, setSortDir] = useState("asc");

    const itemsPerPage = useResponsivePageSize(view);

    const statusColors = {
        "Pending": "bg-amber-50 text-amber-700 border-amber-100",
        "Approved": "bg-emerald-50 text-emerald-700 border-emerald-100",
        "Rejected": "bg-rose-50 text-rose-700 border-rose-100"
    };

    const fetchLeaves = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await getTeamLeaves();
            if (res.data.success) {
                setLeavesData({
                    stats: res.data.stats,
                    leaves: res.data.leaves
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

    const handleAction = async (leaveId, newStatus) => {
        try {
            const loadingToast = toast.loading(`Updating leave request to ${newStatus.toLowerCase()}...`);
            const res = await updateLeaveStatus(leaveId, newStatus);
            toast.dismiss(loadingToast);
            if (res.data.success) {
                toast.success(`Leave request ${newStatus.toLowerCase()} successfully.`);
                fetchLeaves();
            } else {
                toast.error(res.data.message || `Failed to update leave to ${newStatus}.`);
            }
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || err.message || "Failed to update leave status.");
        }
    };

    const handleSort = (field) => {
        const isAsc = sortField === field && sortDir === "asc";
        setSortDir(isAsc ? "desc" : "asc");
        setSortField(field);
        setCurrentPage(1);
    };

    const filtered = leavesData.leaves.filter(l => 
        l.name.toLowerCase().includes(search.toLowerCase()) || 
        l.type.toLowerCase().includes(search.toLowerCase())
    );

    const sorted = [...filtered].sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];
        return sortDir === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });

    const paginated = sorted.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    if (error) {
        return <ErrorAlert message={error} onRetry={fetchLeaves} />;
    }

    return (
        <div className="space-y-6">
            {/* Stat Cards - Exactly 3 columns on desktop */}
            {leavesData.stats && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 animate-fadeIn">
                    <MiniStatCard title="Pending Requests" value={leavesData.stats.pending} change="Action" isPositive={false} />
                    <MiniStatCard title="Approved Leaves" value={leavesData.stats.approved} change="Approved" isPositive={true} />
                    <MiniStatCard title="Rejected Leaves" value={leavesData.stats.rejected} change="Rejected" isPositive={true} />
                    <MiniStatCard title="Employees On Leave" value={leavesData.stats.onLeave} change="Today" isPositive={false} />
                </div>
            )}

            {/* Controls */}
            <div className="premium-3d-card-mini flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between p-4.5 animate-fadeIn">
                <SearchBar value={search} onChange={(val) => { setSearch(val); setCurrentPage(1); }} placeholder="Search name or type..." />
                <ViewToggle view={view} onViewChange={setView} />
            </div>

            {loading ? (
                <SkeletonLoader type={view === "card" ? "card" : "table"} />
            ) : filtered.length === 0 ? (
                <EmptyState message="No leave requests available" description="There are no leave applications matching your query." />
            ) : view === "card" ? (
                // CARD VIEW
                <div className="space-y-6 animate-fadeIn">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {paginated.map((l) => (
                            <Card key={l._id} className="p-5 flex flex-col justify-between h-[280px]">
                                <div>
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <Avatar name={l.name} src={l.profilePicture} size="w-10 h-10" />
                                            <div className="flex flex-col text-left">
                                                <h4 className="text-[#1E1E1E] text-xs font-black block truncate max-w-[130px]">{l.name}</h4>
                                                <span className="text-[#2D79C7] text-[10px] font-bold block">{l.type}</span>
                                            </div>
                                        </div>
                                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border leading-none ${statusColors[l.status] || "bg-gray-50 text-gray-600 border-gray-100"}`}>
                                            {l.status}
                                        </span>
                                    </div>
                                    <p className="text-gray-500 text-[11px] leading-relaxed text-left mt-3.5 line-clamp-2 h-[34px]" title={l.reason}>
                                        "{l.reason}"
                                    </p>
                                    <div className="mt-4 space-y-1.5 text-left border-t border-gray-50 pt-3 text-[11px] font-semibold text-gray-500">
                                        <div className="flex justify-between">
                                            <span>Duration</span>
                                            <span className="text-gray-800 font-bold font-mono">{l.duration}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Date range</span>
                                            <span className="text-gray-800 font-bold font-mono">{l.start} to {l.end}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 pt-3 border-t border-[#F3F4F6]">
                                    {l.status === "Pending" ? (
                                        <>
                                            <button
                                                onClick={() => handleAction(l._id, "approved")}
                                                className="flex-1 py-1.5 bg-[#2E7D32]/10 hover:bg-[#2E7D32]/25 text-[#2E7D32] border border-[#2E7D32]/20 rounded-[8px] text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 focus:outline-none"
                                            >
                                                <Check className="w-3.5 h-3.5" />
                                                <span>Approve</span>
                                            </button>
                                            <button
                                                onClick={() => handleAction(l._id, "rejected")}
                                                className="flex-1 py-1.5 bg-[#C62828]/10 hover:bg-[#C62828]/25 text-[#C62828] border border-[#C62828]/20 rounded-[8px] text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 focus:outline-none"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                                <span>Reject</span>
                                            </button>
                                        </>
                                    ) : (
                                        <span className="text-[10px] font-extrabold text-gray-400 select-none text-center w-full uppercase tracking-wider">
                                            Decision logged
                                        </span>
                                    )}
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
                                        <SortHeader label="Leave Type" field="type" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                                    </th>
                                    <th className="px-6 py-4">
                                        <SortHeader label="Start Date" field="start" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                                    </th>
                                    <th className="px-6 py-4">
                                        <SortHeader label="End Date" field="end" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                                    </th>
                                    <th className="px-6 py-4">
                                        <SortHeader label="Duration" field="duration" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                                    </th>
                                    <th className="px-6 py-4">Reason description</th>
                                    <th className="px-6 py-4">
                                        <SortHeader label="Status" field="status" sortField={sortField} sortDir={sortDir} onSort={handleSort} />
                                    </th>
                                    <th className="px-6 py-4 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#F9FAFB] text-xs font-semibold text-gray-600">
                                {paginated.map((l) => (
                                    <tr key={l._id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-3.5">
                                            <div className="flex items-center gap-3">
                                                <Avatar name={l.name} src={l.profilePicture} size="w-8 h-8" />
                                                <span className="text-[#1E1E1E] font-bold block">{l.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3.5 font-bold text-[#2D79C7]">{l.type}</td>
                                        <td className="px-6 py-3.5 font-mono text-gray-700">{l.start}</td>
                                        <td className="px-6 py-3.5 font-mono text-gray-700">{l.end}</td>
                                        <td className="px-6 py-3.5 font-mono text-gray-500 font-bold">{l.duration}</td>
                                        <td className="px-6 py-3.5 max-w-xs truncate text-gray-500 font-medium" title={l.reason}>
                                            {l.reason}
                                        </td>
                                        <td className="px-6 py-3.5">
                                            <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full border ${statusColors[l.status] || "bg-gray-50 text-gray-600 border-gray-100"}`}>
                                                {l.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3.5 text-center">
                                            {l.status === "Pending" ? (
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => handleAction(l._id, "approved")}
                                                        className="p-1.5 bg-[#2E7D32]/10 hover:bg-[#2E7D32]/25 text-[#2E7D32] border border-[#2E7D32]/20 rounded-lg transition-all cursor-pointer focus:outline-none"
                                                        title="Approve"
                                                    >
                                                        <Check className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleAction(l._id, "rejected")}
                                                        className="p-1.5 bg-[#C62828]/10 hover:bg-[#C62828]/25 text-[#C62828] border border-[#C62828]/20 rounded-lg transition-all cursor-pointer focus:outline-none"
                                                        title="Reject"
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-[10px] font-extrabold text-gray-400 select-none uppercase tracking-wide">
                                                    Logged
                                                </span>
                                            )}
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
    const isManager = userRole === "manager";
    const isHr = userRole === "hr";

    const tabs = React.useMemo(() => {
        if (isGlobalAdmin || isHr) {
            return [
                { key: "Team Summary", icon: LayoutDashboard, label: "Team Summary" },
                { key: "Team Members", icon: Users, label: "Team Members" },
                { key: "Team Attendance", icon: Clock, label: "Team Attendance" },
                { key: "Team Leaves", icon: Umbrella, label: "Team Leaves" },
                { key: "Team Performance", icon: Award, label: "Team Performance" }
            ];
        }
        if (isManager) {
            return [
                { key: "Team Members", icon: Users, label: "Team Members" },
                { key: "Team Attendance", icon: Clock, label: "Team Attendance" },
                { key: "Team Leaves", icon: Umbrella, label: "Team Leaves" }
            ];
        }
        // Employee Role: Show ONLY Team Members
        return [
            { key: "Team Members", icon: Users, label: "Team Members" }
        ];
    }, [isGlobalAdmin, isHr, isManager]);

    const [activeTab, setActiveTab] = useState(tabs[0]?.key || "Team Members");

    useEffect(() => {
        if (!tabs.some(t => t.key === activeTab)) {
            setActiveTab(tabs[0]?.key || "Team Members");
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
