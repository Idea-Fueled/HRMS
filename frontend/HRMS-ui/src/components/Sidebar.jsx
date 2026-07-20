import React from "react";
import { Link, useLocation } from "react-router-dom";
import { X } from "lucide-react";
import ideaFueledLogo from "../assets/idea_fueled_logo.png";
import { useAuth } from "../context/AuthContext";

/* ─────────────────────────────────────────────
   NAV DEFINITION
   Each item declares which roles can see it.
   If `roles` is omitted, all authenticated
   users can see the item.
 ───────────────────────────────────────────── */
const menuCategories = [
    {
        title: "Workspace",
        items: [
            {
                name: "Dashboard",
                to: "/dashboard",
                end: true,
                permissionKey: "dashboard",
                icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 shrink-0">
                        <rect x="3" y="3" width="7" height="9" rx="1" />
                        <rect x="14" y="3" width="7" height="5" rx="1" />
                        <rect x="14" y="12" width="7" height="9" rx="1" />
                        <rect x="3" y="16" width="7" height="5" rx="1" />
                    </svg>
                ),
            },
            {
                name: "Me",
                to: "/me",
                permissionKey: "me",
                icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 shrink-0">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                    </svg>
                ),
            },
            {
                name: "My Team",
                to: "/my-team",
                permissionKey: "myTeam",
                icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 shrink-0">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                ),
            },
            {
                name: "Employees",
                to: "/employees",
                permissionKey: "employees",
                icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 shrink-0">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        <line x1="19" y1="8" x2="19" y2="14" />
                        <line x1="16" y1="11" x2="22" y2="11" />
                    </svg>
                ),
            },
            {
                name: "My Finances",
                to: "/my-finances",
                permissionKey: "myFinances",
                icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 shrink-0">
                        <rect x="2" y="4" width="20" height="16" rx="2" ry="2" />
                        <line x1="2" y1="10" x2="22" y2="10" />
                        <line x1="12" y1="14" x2="12.01" y2="14" />
                    </svg>
                ),
            },
        ],
    },
    {
        title: "Operations",
        items: [
            {
                name: "Documents",
                to: "/documents",
                permissionKey: "documents",
                icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 shrink-0">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                ),
            },
            {
                name: "Time & Attendance",
                to: "/time-attendance",
                permissionKey: "timeAndAttend",
                icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 shrink-0">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                    </svg>
                ),
            },
            {
                name: "Payroll",
                to: "/payroll",
                permissionKey: "payroll",
                icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 shrink-0">
                        <line x1="12" y1="1" x2="12" y2="23" />
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                ),
            },
            {
                name: "Recruitment",
                to: "/recruitment",
                permissionKey: "recruitment",
                icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 shrink-0">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <polyline points="16 11 18 13 22 9" />
                    </svg>
                ),
            },
            {
                name: "Hire",
                to: "/hire",
                permissionKey: "hire",
                icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 shrink-0">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <line x1="19" y1="8" x2="19" y2="14" />
                        <line x1="16" y1="11" x2="22" y2="11" />
                    </svg>
                ),
            },
            {
                name: "Offboarding & Onboarding",
                to: "/offboarding-onboarding",
                permissionKey: "offboardingAndOnboarding",
                icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 shrink-0">
                        <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                    </svg>
                ),
            },
            {
                name: "Organization",
                to: "/organization",
                permissionKey: "organization",
                icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 shrink-0">
                        <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
                        <line x1="9" y1="22" x2="9" y2="16" />
                        <line x1="15" y1="22" x2="15" y2="16" />
                        <line x1="9" y1="16" x2="15" y2="16" />
                        <path d="M8 6h.01M16 6h.01M8 10h.01M16 10h.01M12 6h.01M12 10h.01" />
                    </svg>
                ),
            },
        ],
    },
];

const Sidebar = ({ onClose }) => {
    const { user } = useAuth();
    const location = useLocation();
    const currentPath = location.pathname;

    const hasItemPermission = (item) => {
        if (!user) return false;
        
        // Admins and HR see all sidebar items
        const role = user.role?.toLowerCase();
        if (role === "admin" || role === "hr") return true;

        if (!user.permissions) return false;
        const key = item.permissionKey;
        if (!key) return true;

        if (key === "documents") {
            return !!(user.permissions.documents?.companyDocuments || user.permissions.documents?.employeeDocuments);
        }

        return !!user.permissions[key];
    };

    // Filter categories and items based on dynamic permissions
    const visibleCategories = menuCategories
        .map(cat => ({
            ...cat,
            items: cat.items.filter(hasItemPermission),
        }))
        .filter(cat => cat.items.length > 0);

    return (
        <aside className="w-[280px] h-screen bg-gradient-to-b from-[#2D79C7] to-[#1F5EA8] flex flex-col border-r border-white/10 overflow-hidden select-none z-30 shadow-2xl relative">
            <div className="absolute top-0 left-0 w-full h-40 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
            <div className="absolute top-1/4 -left-10 w-28 h-28 bg-[#FFEA00]/5 rounded-full blur-2xl pointer-events-none" />

            {/* Logo */}
            <div className="h-20 px-6 flex items-center justify-between border-b border-white/10 relative z-10">
                <img src={ideaFueledLogo} alt="Idea Fueled Logo" className="h-auto max-h-12 object-contain" />
                {onClose && (
                    <button onClick={onClose} className="lg:hidden text-white/70 hover:text-white p-1 hover:bg-white/10 rounded-[10px] transition-all cursor-pointer">
                        <X className="w-5 h-5" />
                    </button>
                )}
            </div>

            {/* Nav */}
            <nav className="flex-1 px-4 py-6 overflow-y-auto space-y-6 relative z-10">
                {visibleCategories.map((category) => (
                    <div key={category.title} className="space-y-1.5">
                        <h3 className="text-white/50 text-[10px] font-bold tracking-widest uppercase px-4 mb-1">
                            {category.title}
                        </h3>
                        <ul className="space-y-1">
                            {category.items.map((item) => {
                                const isActive = currentPath === item.to || (item.to === "/dashboard" && (currentPath === "/" || currentPath === ""));
                                return (
                                    <li key={item.name} className="list-none">
                                        <Link
                                            to={item.to}
                                            className={
                                                `group flex items-center gap-3 px-4 py-3 rounded-[18px] transition-all duration-300 ${isActive
                                                    ? "bg-white text-[#1F5EA8] shadow-lg shadow-black/10 font-bold"
                                                    : "text-white/80 hover:bg-white/10 hover:text-white"
                                                }`
                                            }
                                        >
                                            {item.icon}
                                            <span className="text-sm font-bold">{item.name}</span>
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                ))}
            </nav>
        </aside>
    );
};

export default Sidebar;
