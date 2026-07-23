import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { logoutUser } from "../services/auth.service";
import { getAllEmployees } from "../services/employee.service";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import {
    Search,
    Bell,
    User,
    Settings,
    LogOut,
    ChevronDown,
    Shield,
    Menu,
    Loader2,
    X,
    Building2,
} from "lucide-react";
import userAvatar from "../assets/user_avatar.png";
import { Avatar } from "./SharedComponents";

/* ─────────────────────────────────────────────
   PAGE METADATA
───────────────────────────────────────────── */
const pageMetadata = {
    "/dashboard": { title: "Dashboard", subtitle: "Welcome back! Here is your workspace summary." },
    "/":          { title: "Dashboard", subtitle: "Welcome back! Here is your workspace summary." },
    "/profile":   { title: "Employee Profile", subtitle: "View and manage complete employee profile records and parameters." },
    "/me":        { title: "Me", subtitle: "Manage your personal profile, attendance, and details." },
    "/my-team":   { title: "My Team", subtitle: "View team details, directories, and schedules." },
    "/employees": { title: "Employees", subtitle: "Manage employee records, profiles, and organizational data." },
    "/my-finances":           { title: "My Finances", subtitle: "Manage payslips, claims, and benefits." },
    "/documents":             { title: "Documents", subtitle: "Access your files, policy documents, and folders." },
    "/time-attendance":       { title: "Time & Attendance", subtitle: "Track clock-ins, leaves, and work shifts." },
    "/payroll":               { title: "Payroll", subtitle: "Manage payroll processing and salary records." },
    "/recruitment":           { title: "Recruitment", subtitle: "Manage job openings and candidates." },
    "/hire":                  { title: "Hire", subtitle: "Manage candidates, job openings, and interviews." },
    "/offboarding-onboarding":{ title: "Offboarding & Onboarding", subtitle: "Manage employee transitions." },
    "/organization":          { title: "Organization", subtitle: "Manage organizational units, structure, and hierarchy." },
    "/unauthorized":          { title: "Access Denied", subtitle: "You do not have permission to view this page." },
};

/* ─────────────────────────────────────────────
   GLOBAL EMPLOYEE SEARCH
───────────────────────────────────────────── */
const GlobalSearch = () => {
    const navigate = useNavigate();

    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const [allEmployees, setAllEmployees] = useState(null); // cached pool
    const containerRef = useRef(null);
    const searchTimer = useRef(null);

    // Get employee pool for searching (loads once & caches)
    const getEmployeePool = useCallback(async () => {
        if (allEmployees !== null) return allEmployees;
        try {
            const res = await getAllEmployees();
            const list = res.data?.employees || [];
            setAllEmployees(list);
            return list;
        } catch (err) {
            console.error("Global search load error:", err);
            setAllEmployees([]);
            return [];
        }
    }, [allEmployees]);

    // Search with debounce
    useEffect(() => {
        const q = query.trim();
        if (q.length < 2) { setResults([]); setOpen(false); return; }

        clearTimeout(searchTimer.current);
        setLoading(true);
        setOpen(true);

        searchTimer.current = setTimeout(async () => {
            const pool = await getEmployeePool();
            const lower = q.toLowerCase();
            const filtered = (pool || []).filter(e => {
                const name = e.fullName || `${e.firstName || ""} ${e.lastName || ""}`;
                return (
                    name.toLowerCase().includes(lower) ||
                    (e.email || "").toLowerCase().includes(lower) ||
                    (e.employeeId || "").toLowerCase().includes(lower) ||
                    (e.department || "").toLowerCase().includes(lower) ||
                    (e.designation || "").toLowerCase().includes(lower)
                );
            }).slice(0, 8);
            setResults(filtered);
            setLoading(false);
        }, 200);

        return () => clearTimeout(searchTimer.current);
    }, [query, getEmployeePool]);

    // Close on outside click
    useEffect(() => {
        const handler = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const handleSelect = (emp) => {
        setQuery("");
        setOpen(false);
        navigate(`/profile/${emp._id}`);
    };

    const clearSearch = () => { setQuery(""); setResults([]); setOpen(false); };

    return (
        <div ref={containerRef} className="relative w-full">
            <div className="relative group flex items-center">
                <Search className="w-4 h-4 text-gray-400 absolute left-4 group-focus-within:text-[#2D79C7] transition-colors duration-200 pointer-events-none" />
                <input
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onFocus={() => query.trim().length >= 3 && setOpen(true)}
                    placeholder="Search employees by name, ID, email..."
                    className="w-full pl-11 pr-9 py-2.5 bg-gray-50/50 hover:bg-gray-50 border border-gray-200/80 rounded-[14px] text-sm text-[#1E1E1E] placeholder-gray-400 focus:outline-none focus:bg-white focus:border-[#2D79C7] focus:ring-1 focus:ring-[#2D79C7] transition-all duration-200 shadow-inner"
                />
                {query && (
                    <button onClick={clearSearch} className="absolute right-3 p-0.5 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
                        <X className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>

            {/* Dropdown */}
            {open && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-[16px] shadow-xl z-50 overflow-hidden">
                    {loading ? (
                        <div className="flex items-center gap-2.5 px-4 py-3.5 text-xs text-gray-400">
                            <Loader2 className="w-4 h-4 animate-spin text-[#2D79C7]" />
                            <span>Searching employees...</span>
                        </div>
                    ) : results.length === 0 ? (
                        <div className="px-4 py-4 text-center">
                            <p className="text-xs font-bold text-gray-400">No employees match &ldquo;{query}&rdquo;</p>
                            <p className="text-[10px] text-gray-300 mt-0.5">Try a different name, ID, or department</p>
                        </div>
                    ) : (
                        <ul className="py-1.5 max-h-72 overflow-y-auto">
                            {results.map(emp => {
                                const name = emp.fullName || `${emp.firstName || ""} ${emp.lastName || ""}`.trim();
                                const initials = name.split(" ").map(n => n[0] || "").join("").substring(0, 2).toUpperCase();
                                const palette = ["bg-blue-100 text-[#2D79C7]","bg-emerald-100 text-emerald-700","bg-indigo-100 text-indigo-700","bg-amber-100 text-amber-700","bg-rose-100 text-rose-700","bg-violet-100 text-violet-700"];
                                const avatarColor = palette[(name.charCodeAt(0) || 0) % palette.length];
                                const statusColors = { active: "bg-emerald-50 text-emerald-700", inactive: "bg-gray-100 text-gray-500", on_notice: "bg-amber-50 text-amber-700", terminated: "bg-rose-50 text-rose-700" };
                                const statusLabels = { active: "Active", inactive: "Inactive", on_notice: "On Notice", terminated: "Terminated" };

                                return (
                                    <li key={emp._id}>
                                        <button
                                            onClick={() => handleSelect(emp)}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#F8FAFC] transition-colors cursor-pointer text-left"
                                        >
                                            {emp.profilePicture ? (
                                                <img src={emp.profilePicture} alt={name} className="w-8 h-8 rounded-full object-cover border border-gray-100 shrink-0" />
                                            ) : (
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-[10px] border-2 border-white shadow-sm shrink-0 ${avatarColor}`}>
                                                    {initials}
                                                </div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[13px] font-bold text-[#1E1E1E] leading-none truncate">{name}</p>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    <span className="text-[10px] text-gray-400 font-mono">{emp.employeeId}</span>
                                                    {emp.department && (
                                                        <>
                                                            <span className="text-gray-200">·</span>
                                                            <span className="text-[10px] text-gray-400">{emp.department}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${statusColors[emp.status] || "bg-gray-100 text-gray-400"}`}>
                                                {statusLabels[emp.status] || emp.status}
                                            </span>
                                        </button>
                                    </li>
                                );
                            })}
                            <li className="border-t border-gray-50 px-4 py-2">
                                <button
                                    onClick={() => { setOpen(false); navigate("/employees"); }}
                                    className="text-[11px] font-bold text-[#2D79C7] hover:underline cursor-pointer"
                                >
                                    View all employees →
                                </button>
                            </li>
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
};

/* ─────────────────────────────────────────────
   NAVBAR
───────────────────────────────────────────── */
const Navbar = ({ onToggleSidebar }) => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const currentPath = location.pathname;

    const fullName = user?.fullName || "";
    const designation = user?.designation || "";
    const email = user?.email || "";

    const meta = currentPath.startsWith("/profile")
        ? pageMetadata["/profile"]
        : (pageMetadata[currentPath] || {
            title: "Dashboard",
            subtitle: "Welcome back! Here is your workspace summary.",
        });

    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
    const profileRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (profileRef.current && !profileRef.current.contains(e.target)) {
                setIsProfileDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <header className="sticky top-0 right-0 bg-white border-b border-gray-100 h-20 px-4 sm:px-8 flex items-center justify-between z-20 select-none shadow-[0_1px_3px_rgba(0,0,0,0.02)] gap-2">

            {/* Left — hamburger + page title */}
            <div className="flex items-center gap-2.5 min-w-0">
                {onToggleSidebar && (
                    <button
                        onClick={onToggleSidebar}
                        className="lg:hidden text-gray-500 hover:text-gray-700 p-2 hover:bg-gray-50 rounded-[12px] border border-gray-200/80 transition-all cursor-pointer shrink-0"
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                )}
                <div className="flex flex-col min-w-0 text-left">
                    <h2 className="text-[#1E1E1E] text-sm sm:text-base md:text-lg font-bold tracking-wide leading-tight truncate">
                        {meta.title}
                    </h2>
                    <p className="text-gray-500 text-[10px] sm:text-xs font-normal truncate">
                        {meta.subtitle}
                    </p>
                </div>
            </div>

            {/* Center — global employee search */}
            <div className="hidden md:flex flex-1 max-w-md mx-4 lg:mx-8">
                <GlobalSearch />
            </div>

            {/* Right — role badge, notifications, profile */}
            <div className="flex items-center gap-2 sm:gap-4 shrink-0">

                {/* Role badge */}
                <div className="bg-blue-50 text-[#2D79C7] text-xs font-semibold px-3 py-1.5 rounded-full border border-blue-100 shadow-sm flex items-center gap-1 uppercase tracking-wider">
                    <Shield className="w-3 h-3 text-[#2D79C7]" />
                    <span>{user?.role || "—"}</span>
                </div>

                {/* Notifications */}
                <button className="relative p-2 text-gray-500 hover:text-[#2D79C7] hover:bg-gray-50 rounded-xl transition-all duration-200 cursor-pointer">
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-[#FFEA00] border-2 border-white rounded-full shadow-sm animate-pulse" />
                </button>

                <div className="h-8 w-px bg-gray-200 mx-1" />

                {/* Profile dropdown */}
                <div className="relative" ref={profileRef}>
                    <button
                        onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                        className="flex items-center gap-2.5 p-1.5 hover:bg-gray-50 rounded-2xl border border-transparent hover:border-gray-200/50 transition-all duration-200 cursor-pointer"
                    >
                        <Avatar src={user?.profilePicture} name={fullName} size="w-9 h-9" />
                        <div className="hidden sm:flex flex-col text-left">
                            <span className="text-[#1E1E1E] text-xs font-semibold tracking-wide leading-tight">{fullName}</span>
                            <span className="text-gray-400 text-[10px] font-medium leading-none mt-0.5">{designation}</span>
                        </div>
                        <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                    </button>

                    {isProfileDropdownOpen && (
                        <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-100 rounded-[14px] shadow-xl py-1 z-30">
                            <div className="px-4 py-2 border-b border-gray-100 text-left">
                                <p className="text-xs text-gray-400 font-medium">Signed in as</p>
                                <p className="text-xs text-[#1E1E1E] font-bold truncate">{email}</p>
                            </div>
                            <button
                                onClick={() => {
                                    setIsProfileDropdownOpen(false);
                                    navigate("/profile");
                                }}
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors text-left cursor-pointer"
                            >
                                <User className="w-4 h-4 text-gray-400" />
                                <span>My Profile</span>
                            </button>
                            <a href="#settings" className="flex items-center gap-2 px-4 py-2.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors">
                                <Settings className="w-4 h-4 text-gray-400" />
                                <span>Settings</span>
                            </a>
                            <div className="border-t border-gray-100 my-1" />
                            <button
                                onClick={async () => {
                                    try {
                                        await logoutUser();
                                        toast.success("Logged out successfully.");
                                    } catch (err) {
                                        console.error("Logout failed:", err);
                                    } finally {
                                        logout();
                                        setIsProfileDropdownOpen(false);
                                        navigate("/login");
                                    }
                                }}
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-red-600 hover:bg-red-50 transition-colors text-left cursor-pointer"
                            >
                                <LogOut className="w-4 h-4 text-red-500" />
                                <span>Logout</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Navbar;
