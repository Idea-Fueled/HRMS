import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
    "/time-attendance":       { title: "Time Attend", subtitle: "Track clock-ins, leaves, and work shifts." },
    "/payroll":               { title: "Payroll", subtitle: "Manage payroll processing and salary records." },
    "/recruitment":           { title: "Recruitment", subtitle: "Manage job openings and candidates." },
    "/hire":                  { title: "Hire", subtitle: "Manage candidates, job openings, and interviews." },
    "/organization":          { title: "Organization", subtitle: "Manage organizational units, structure, and hierarchy." },
    "/unauthorized":          { title: "Access Denied", subtitle: "You do not have permission to view this page." },
};

import { SEARCH_REGISTRY, filterRegistryForUser } from "../config/searchRegistry";
import {
    LayoutDashboard,
    Users,
    UserCheck,
    Clock,
    Umbrella,
    Award,
    CreditCard,
    FileText,
    Building,
    DollarSign,
    UserPlus,
    CalendarPlus,
    LogIn,
    Upload,
    Folder,
    BookOpen,
    BarChart2,
    PieChart,
    Receipt,
    FileSpreadsheet,
    Briefcase,
    Calendar,
    History,
    Sparkles,
    ArrowUpRight,
    CornerDownLeft,
    Command,
    ChevronRight,
    Search as SearchIcon
} from "lucide-react";

/* ─────────────────────────────────────────────
   TEXT HIGHLIGHT MATCH COMPONENT
───────────────────────────────────────────── */
const HighlightMatch = ({ text, query }) => {
    if (!text || !query || !query.trim()) return <>{text}</>;
    const q = query.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (!q) return <>{text}</>;
    const regex = new RegExp(`(${q})`, "gi");
    const parts = text.split(regex);
    return (
        <>
            {parts.map((part, i) =>
                part.toLowerCase() === query.trim().toLowerCase() ? (
                    <mark key={i} className="bg-amber-200 text-slate-900 rounded-[2px] font-extrabold px-0.5 shadow-2xs">
                        {part}
                    </mark>
                ) : (
                    part
                )
            )}
        </>
    );
};

/* ─────────────────────────────────────────────
   DYNAMIC REGISTRY ICON MAP
───────────────────────────────────────────── */
const ICON_MAP = {
    LayoutDashboard, User, Users, UserCheck, Clock, Umbrella, Award, CreditCard,
    FileText, Building2, Building, DollarSign, UserPlus, CalendarPlus, LogIn,
    Upload, Folder, BookOpen, BarChart2, PieChart, Receipt, FileSpreadsheet,
    Shield, Settings, Briefcase, Calendar, History, Sparkles
};

const RenderRegistryIcon = ({ iconName, className = "w-4 h-4" }) => {
    const IconComp = ICON_MAP[iconName] || FileText;
    return <IconComp className={className} />;
};

/* ─────────────────────────────────────────────
   UNIVERSAL SMART SEARCH COMPONENT
───────────────────────────────────────────── */
const GlobalSearch = () => {
    const navigate = useNavigate();
    const { user, canAccessRoute } = useAuth();

    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [allEmployees, setAllEmployees] = useState(null);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [recentSearches, setRecentSearches] = useState([]);

    const inputRef = useRef(null);
    const containerRef = useRef(null);
    const searchTimer = useRef(null);

    // Recent Searches storage key
    const recentStorageKey = `hrms_recent_searches_${user?._id || "guest"}`;

    useEffect(() => {
        try {
            const stored = localStorage.getItem(recentStorageKey);
            if (stored) setRecentSearches(JSON.parse(stored));
        } catch (e) {
            console.error("Failed to load recent searches", e);
        }
    }, [recentStorageKey]);

    const saveRecentSearch = (item) => {
        try {
            const newItem = {
                id: item.id || item._id,
                title: item.title || item.fullName || `${item.firstName || ""} ${item.lastName || ""}`.trim(),
                category: item.category || "Employees",
                route: item.route || `/profile/${item._id}`,
                state: item.state,
                iconName: item.iconName,
                type: item._id ? "employee" : "registry"
            };
            const updated = [newItem, ...recentSearches.filter(r => r.id !== newItem.id)].slice(0, 5);
            setRecentSearches(updated);
            localStorage.setItem(recentStorageKey, JSON.stringify(updated));
        } catch (e) {
            console.error("Failed to save recent search", e);
        }
    };

    const clearRecentSearches = (e) => {
        e?.stopPropagation();
        setRecentSearches([]);
        localStorage.removeItem(recentStorageKey);
    };

    // Employee Pool Cache
    const getEmployeePool = useCallback(async () => {
        if (allEmployees !== null) return allEmployees;
        try {
            const res = await getAllEmployees({ all: "true" });
            const list = res.data?.employees || [];
            setAllEmployees(list);
            return list;
        } catch (err) {
            console.error("Global search load error:", err);
            setAllEmployees([]);
            return [];
        }
    }, [allEmployees]);

    // Permitted registry items based on Role & Permissions
    const permittedRegistry = useMemo(() => {
        return filterRegistryForUser(user, canAccessRoute);
    }, [user, canAccessRoute]);

    // Frequently Used shortcuts
    const frequentlyUsed = useMemo(() => {
        const topIds = ["act_add_employee", "nav_time_attendance", "act_apply_leave", "nav_payroll", "doc_company_documents", "nav_employees"];
        return permittedRegistry.filter(item => topIds.includes(item.id)).slice(0, 5);
    }, [permittedRegistry]);

    // Search results state
    const [searchResults, setSearchResults] = useState({
        grouped: {},
        flatItems: []
    });

    useEffect(() => {
        const q = query.trim().toLowerCase();
        if (q.length < 2) {
            setSearchResults({ grouped: {}, flatItems: [] });
            setLoading(false);
            return;
        }

        setLoading(true);
        clearTimeout(searchTimer.current);

        searchTimer.current = setTimeout(async () => {
            const pool = await getEmployeePool();

            // 1. Search Registry items
            const matchedRegistry = permittedRegistry.filter(item => {
                const titleMatch = item.title.toLowerCase().includes(q);
                const descMatch = item.description.toLowerCase().includes(q);
                const kwMatch = item.keywords.some(k => k.toLowerCase().includes(q));
                return titleMatch || descMatch || kwMatch;
            });

            // 2. Search Employees
            const matchedEmployees = (pool || []).filter(e => {
                const name = e.fullName || `${e.firstName || ""} ${e.lastName || ""}`;
                return (
                    name.toLowerCase().includes(q) ||
                    (e.email || "").toLowerCase().includes(q) ||
                    (e.employeeId || "").toLowerCase().includes(q) ||
                    (e.department || "").toLowerCase().includes(q) ||
                    (e.designation || "").toLowerCase().includes(q)
                );
            }).slice(0, 5).map(e => ({
                id: e._id,
                _id: e._id,
                title: e.fullName || `${e.firstName || ""} ${e.lastName || ""}`.trim(),
                description: `${e.designation || "Employee"} · ${e.department || "Organization"} (${e.employeeId})`,
                category: "Employees",
                route: `/profile/${e._id}`,
                profilePicture: e.profilePicture,
                status: e.status,
                type: "employee",
                employeeData: e
            }));

            // Group results by category
            const grouped = {};
            const flatItems = [];
            const categoryOrder = ["Navigation", "Actions", "Employees", "Reports", "Documents", "Settings"];

            categoryOrder.forEach(cat => {
                let itemsInCat = [];
                if (cat === "Employees") {
                    itemsInCat = matchedEmployees;
                } else {
                    itemsInCat = matchedRegistry.filter(r => r.category === cat);
                }

                if (itemsInCat.length > 0) {
                    grouped[cat] = itemsInCat;
                    flatItems.push(...itemsInCat);
                }
            });

            setSearchResults({ grouped, flatItems });
            setSelectedIndex(flatItems.length > 0 ? 0 : -1);
            setLoading(false);
        }, 150);

        return () => clearTimeout(searchTimer.current);
    }, [query, permittedRegistry, getEmployeePool]);

    // Keyboard Shortcut (Ctrl+K or Cmd+K)
    useEffect(() => {
        const handleGlobalKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
                e.preventDefault();
                inputRef.current?.focus();
                setOpen(true);
            }
        };
        window.addEventListener("keydown", handleGlobalKeyDown);
        return () => window.removeEventListener("keydown", handleGlobalKeyDown);
    }, []);

    // Handle Item Selection & Navigation
    const handleSelectItem = (item) => {
        saveRecentSearch(item);
        setQuery("");
        setOpen(false);

        if (item.route) {
            navigate(item.route, { state: item.state });
        }
    };

    // Keyboard navigation handlers
    const handleKeyDownInput = (e) => {
        if (!open) {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                setOpen(true);
            }
            return;
        }

        const flat = query.trim().length >= 2 ? searchResults.flatItems : [];

        if (e.key === "ArrowDown") {
            e.preventDefault();
            if (flat.length > 0) {
                setSelectedIndex(prev => (prev + 1) % flat.length);
            }
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            if (flat.length > 0) {
                setSelectedIndex(prev => (prev - 1 + flat.length) % flat.length);
            }
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (flat.length > 0 && selectedIndex >= 0 && selectedIndex < flat.length) {
                handleSelectItem(flat[selectedIndex]);
            }
        } else if (e.key === "Escape") {
            e.preventDefault();
            setOpen(false);
            inputRef.current?.blur();
        }
    };

    // Outside click listener
    useEffect(() => {
        const handler = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    let flatIndexCounter = 0;

    return (
        <div ref={containerRef} className="relative w-full">
            {/* Input Bar */}
            <div className="relative group flex items-center">
                <SearchIcon className="w-4 h-4 text-gray-400 absolute left-4 group-focus-within:text-[#2D79C7] transition-colors duration-200 pointer-events-none" />
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={e => {
                        setQuery(e.target.value);
                        setOpen(true);
                    }}
                    onFocus={() => setOpen(true)}
                    onKeyDown={handleKeyDownInput}
                    placeholder="Search anything (pages, actions, employees, reports)..."
                    className="w-full pl-11 pr-16 py-2.5 bg-gray-50/70 hover:bg-gray-50 border border-gray-200/90 rounded-[14px] text-xs sm:text-sm text-[#1E1E1E] placeholder-gray-400 focus:outline-none focus:bg-white focus:border-[#2D79C7] focus:ring-2 focus:ring-[#2D79C7]/15 transition-all duration-200 shadow-inner"
                />
                
                {query ? (
                    <button
                        onClick={() => { setQuery(""); setSearchResults({ grouped: {}, flatItems: [] }); }}
                        className="absolute right-3 p-1 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                        title="Clear search"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                ) : (
                    <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-bold text-gray-400 bg-gray-100 border border-gray-200 rounded-md shadow-3xs pointer-events-none absolute right-3">
                        <Command className="w-2.5 h-2.5" /> K
                    </kbd>
                )}
            </div>

            {/* Dropdown Popup */}
            {open && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200/90 rounded-[20px] shadow-2xl z-50 overflow-hidden text-left select-none animate-fadeIn">
                    
                    {/* ZERO-QUERY STATE (Focus with empty query) */}
                    {query.trim().length < 2 && (
                        <div className="p-4 max-h-[75vh] overflow-y-auto">
                            {/* Recent Searches */}
                            {recentSearches.length > 0 ? (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="flex items-center gap-1.5 text-[11px] font-extrabold text-gray-400 uppercase tracking-wider">
                                            <History className="w-3.5 h-3.5 text-gray-400" />
                                            Recent Searches
                                        </span>
                                        <button
                                            type="button"
                                            onClick={clearRecentSearches}
                                            className="text-[10.5px] font-bold text-gray-400 hover:text-rose-600 cursor-pointer transition-colors"
                                        >
                                            Clear
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {recentSearches.map(item => (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onClick={() => handleSelectItem(item)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-blue-50 border border-gray-200/80 hover:border-blue-200 rounded-xl text-xs font-semibold text-slate-700 hover:text-[#2D79C7] transition-all cursor-pointer shadow-2xs group"
                                            >
                                                <span>{item.title}</span>
                                                <ChevronRight className="w-3 h-3 text-gray-300 group-hover:text-[#2D79C7] group-hover:translate-x-0.5 transition-all" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <p className="text-xs font-semibold text-gray-400 text-center py-2">
                                    Type 2 or more characters to search pages, actions, employees, or reports...
                                </p>
                            )}
                        </div>
                    )}

                    {/* SEARCH RESULTS STATE (query >= 2) */}
                    {query.trim().length >= 2 && (
                        <>
                            {loading ? (
                                <div className="flex items-center gap-2.5 px-5 py-4 text-xs font-semibold text-gray-400">
                                    <Loader2 className="w-4 h-4 animate-spin text-[#2D79C7]" />
                                    <span>Searching modules, actions & employees...</span>
                                </div>
                            ) : searchResults.flatItems.length === 0 ? (
                                <div className="p-6 text-center">
                                    <p className="text-xs font-bold text-slate-600">No results found for &ldquo;{query}&rdquo;</p>
                                    <p className="text-[11px] text-gray-400 mt-1">Try searching for pages, actions (e.g. &lsquo;Add Employee&rsquo;, &lsquo;Leave&rsquo;), or employee names</p>
                                </div>
                            ) : (
                                <div className="max-h-[65vh] overflow-y-auto divide-y divide-gray-100">
                                    {Object.entries(searchResults.grouped).map(([category, items]) => (
                                        <div key={category} className="py-1">
                                            <div className="px-4 py-1.5 bg-slate-50/80 text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                                                <span>{category}</span>
                                                <span className="text-[9px] font-bold text-slate-300">({items.length})</span>
                                            </div>
                                            <ul>
                                                {items.map(item => {
                                                    const currentIndex = flatIndexCounter++;
                                                    const isSelected = currentIndex === selectedIndex;

                                                    if (category === "Employees") {
                                                        const emp = item.employeeData || item;
                                                        const name = item.title;
                                                        const initials = name.split(" ").map(n => n[0] || "").join("").substring(0, 2).toUpperCase();
                                                        const palette = ["bg-blue-100 text-[#2D79C7]", "bg-emerald-100 text-emerald-700", "bg-indigo-100 text-indigo-700", "bg-amber-100 text-amber-700"];
                                                        const avatarColor = palette[(name.charCodeAt(0) || 0) % palette.length];

                                                        return (
                                                            <li key={item.id}>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleSelectItem(item)}
                                                                    onMouseEnter={() => setSelectedIndex(currentIndex)}
                                                                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors cursor-pointer ${
                                                                        isSelected ? "bg-blue-50/90 border-l-4 border-[#2D79C7]" : "hover:bg-gray-50"
                                                                    }`}
                                                                >
                                                                    <Avatar src={emp.profilePicture} name={name} size="w-8 h-8" />
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-xs font-bold text-slate-800 truncate">
                                                                            <HighlightMatch text={name} query={query} />
                                                                        </p>
                                                                        <p className="text-[10.5px] text-gray-400 truncate mt-0.5">
                                                                            <HighlightMatch text={item.description} query={query} />
                                                                        </p>
                                                                    </div>
                                                                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-[#2D79C7] border border-blue-100 shrink-0">
                                                                        Profile
                                                                    </span>
                                                                </button>
                                                            </li>
                                                        );
                                                    }

                                                    return (
                                                        <li key={item.id}>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleSelectItem(item)}
                                                                onMouseEnter={() => setSelectedIndex(currentIndex)}
                                                                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors cursor-pointer ${
                                                                    isSelected ? "bg-blue-50/90 border-l-4 border-[#2D79C7]" : "hover:bg-gray-50"
                                                                }`}
                                                            >
                                                                <div className="w-8 h-8 rounded-xl bg-gray-100 text-slate-600 flex items-center justify-center shrink-0 border border-gray-200/60">
                                                                    <RenderRegistryIcon iconName={item.iconName} className="w-4 h-4" />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-xs font-bold text-slate-800 truncate">
                                                                        <HighlightMatch text={item.title} query={query} />
                                                                    </p>
                                                                    <p className="text-[10.5px] text-gray-400 truncate mt-0.5">
                                                                        <HighlightMatch text={item.description} query={query} />
                                                                    </p>
                                                                </div>
                                                                <ArrowUpRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                                                            </button>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {/* Footer bar */}
                    <div className="flex items-center justify-start px-4 py-2.5 bg-slate-50/90 border-t border-slate-200/80 text-[11px] text-slate-600 font-bold select-none">
                        <div className="flex items-center gap-4 flex-wrap">
                            <span className="flex items-center gap-1.5">
                                <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded-[5px] text-slate-800 font-mono font-bold text-[11px] shadow-2xs">↑</kbd>
                                <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded-[5px] text-slate-800 font-mono font-bold text-[11px] shadow-2xs">↓</kbd>
                                <span className="text-slate-600 font-bold">navigate</span>
                            </span>
                            <span className="flex items-center gap-1.5">
                                <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded-[5px] text-slate-800 font-mono font-bold text-[11px] shadow-2xs">↵</kbd>
                                <span className="text-slate-600 font-bold">select</span>
                            </span>
                            <span className="flex items-center gap-1.5">
                                <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded-[5px] text-slate-800 font-mono font-bold text-[11px] shadow-2xs">esc</kbd>
                                <span className="text-slate-600 font-bold">close</span>
                            </span>
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
};

const ROLE_CONFIG = {
    global_admin: { label: "Global Admin", badgeCls: "bg-blue-50/90 text-[#1F5EA8] border-blue-200/80" },
    admin:        { label: "Admin",        badgeCls: "bg-indigo-50/90 text-indigo-700 border-indigo-200/80" },
    hr:           { label: "HR",           badgeCls: "bg-purple-50/90 text-purple-700 border-purple-200/80" },
    manager:      { label: "Manager",      badgeCls: "bg-amber-50/90 text-amber-700 border-amber-200/80" },
    employee:     { label: "Employee",     badgeCls: "bg-slate-100/90 text-slate-700 border-slate-200/80" },
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
                </div>
            </div>

            {/* Center — global employee search */}
            <div className="hidden md:flex flex-1 max-w-md mx-4 lg:mx-8">
                <GlobalSearch />
            </div>

            {/* Right — role badge, notifications, profile */}
            <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">

                {/* Role badge */}
                {user?.role && (
                    <div className={`h-9 px-3 rounded-[12px] border text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs ${
                        ROLE_CONFIG[user.role?.toLowerCase()]?.badgeCls || "bg-slate-100 text-slate-700 border-slate-200"
                    }`}>
                        <Shield className="w-3.5 h-3.5 shrink-0 stroke-[2.2] text-[#1F5EA8]" />
                        <span className="whitespace-nowrap font-bold text-xs">{ROLE_CONFIG[user.role?.toLowerCase()]?.label || user.role}</span>
                    </div>
                )}

                {/* Notifications */}
                <button className="relative w-9 h-9 flex items-center justify-center text-gray-500 hover:text-[#2D79C7] hover:bg-gray-100/80 rounded-[12px] border border-gray-200/60 transition-all duration-200 cursor-pointer shadow-2xs">
                    <Bell className="w-4 h-4" />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-[#FFEA00] border-2 border-white rounded-full shadow-2xs animate-pulse" />
                </button>

                <div className="h-6 w-px bg-gray-200 mx-0.5" />

                {/* Profile dropdown */}
                <div className="relative" ref={profileRef}>
                    <button
                        onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                        className="flex items-center gap-2.5 p-1 text-left hover:bg-gray-100/70 rounded-[14px] border border-transparent hover:border-gray-200/60 transition-all duration-200 cursor-pointer"
                    >
                        <Avatar src={user?.profilePicture} name={fullName} size="w-9 h-9" />
                        <div className="hidden sm:flex flex-col text-left">
                            <span className="text-[#1E1E1E] text-xs font-bold tracking-tight leading-tight">{fullName}</span>
                            <span className="text-gray-400 text-[10.5px] font-semibold leading-none mt-0.5">{designation || ROLE_CONFIG[user?.role?.toLowerCase()]?.label}</span>
                        </div>
                        <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
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
