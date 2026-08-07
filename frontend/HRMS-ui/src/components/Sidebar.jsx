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
            {
                name: "Hire",
                to: "/hire",
                permissionKey: "hire",
                roles: ["global_admin", "hr"],
                icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 shrink-0">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <line x1="19" y1="8" x2="19" y2="14" />
                        <line x1="16" y1="11" x2="22" y2="11" />
                    </svg>
                ),
            },
            {
                name: "Time Attend",
                to: "/time-attendance",
                permissionKey: "timeAndAttend",
                icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 shrink-0">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                    </svg>
                ),
                subItems: [
                    {
                        name: "Payroll",
                        to: "/payroll",
                        permissionKey: "payroll",
                        icon: (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 shrink-0">
                                <path d="M6 3h12" />
                                <path d="M6 8h12" />
                                <path d="m6 13 8.5 8" />
                                <path d="M6 13h3" />
                                <path d="M9 13c6.667 0 6.667-10 0-10" />
                            </svg>
                        ),
                    }
                ]
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
        ],
    },
];

const Sidebar = ({ onClose }) => {
    const { user } = useAuth();
    const location = useLocation();
    const currentPath = location.pathname;

    const hasItemPermission = (item) => {
        if (!user) return false;

        // Workspace categories (Dashboard, Me, My Team, My Finances) are visible to everyone
        const alwaysVisibleKeys = ["dashboard", "me", "myTeam", "myFinances"];
        if (alwaysVisibleKeys.includes(item.permissionKey)) {
            return true;
        }

        const role = user.role?.toLowerCase();

        // Hire module is strictly accessible to Global Admin and HR users only
        if (item.permissionKey === "hire" || item.to === "/hire") {
            return role === "global_admin" || role === "hr";
        }

        // Global Admins & Admins see all other sidebar items
        if (role === "global_admin" || role === "admin") return true;

        if (!user.permissions) return true; // Default fallback
        const key = item.permissionKey;
        if (!key) return true;

        if (key === "documents") {
            return !!(user.permissions.documents?.companyDocuments || user.permissions.documents?.employeeDocuments);
        }

        return user.permissions[key] !== false;
    };

    // Filter categories and items based on dynamic permissions
    const visibleCategories = menuCategories
        .map(cat => ({
            ...cat,
            items: cat.items
                .map(item => {
                    if (item.subItems) {
                        return {
                            ...item,
                            subItems: item.subItems.filter(hasItemPermission)
                        };
                    }
                    return item;
                })
                .filter(item => {
                    const hasParentPermission = hasItemPermission(item);
                    if (item.subItems && item.subItems.length > 0) {
                        return hasParentPermission;
                    }
                    return hasParentPermission;
                }),
        }))
        .filter(cat => cat.items.length > 0);

    return (
        <aside className="w-[280px] h-screen bg-gradient-to-b from-[#225FA3] to-[#144277] flex flex-col border-r border-white/10 overflow-hidden select-none z-30 shadow-2xl relative">
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
                                const hasSubItems = item.subItems && item.subItems.length > 0;
                                const isAnySubActive = item.subItems?.some(sub => currentPath === sub.to);
                                const isParentActive = isActive || isAnySubActive;

                                return (
                                    <li key={item.name} className="list-none">
                                        <div className="relative group/parent">
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
                                                <span className="text-sm font-bold flex-1">{item.name}</span>
                                                {hasSubItems && (
                                                    <svg 
                                                        xmlns="http://www.w3.org/2000/svg" 
                                                        viewBox="0 0 20 20" 
                                                        fill="currentColor" 
                                                        className={`w-4 h-4 transition-transform duration-200 ${isParentActive ? 'rotate-90' : 'group-hover/parent:rotate-90'}`}
                                                    >
                                                        <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                                                    </svg>
                                                )}
                                            </Link>
                                            {hasSubItems && (
                                                <ul className={`pl-9 mt-1 space-y-1 overflow-hidden transition-all duration-300 ease-in-out ${isParentActive ? "max-h-40 opacity-100" : "max-h-0 opacity-0 group-hover/parent:max-h-40 group-hover/parent:opacity-100"}`}>
                                                    {item.subItems.map((sub) => {
                                                        const isSubActive = currentPath === sub.to;
                                                        return (
                                                            <li key={sub.name} className="list-none">
                                                                <Link
                                                                    to={sub.to}
                                                                    className={
                                                                        `flex items-center gap-3 px-4 py-2 rounded-[14px] transition-all duration-200 ${isSubActive
                                                                            ? "bg-white/20 text-white font-bold"
                                                                            : "text-white/70 hover:bg-white/10 hover:text-white"
                                                                        }`
                                                                    }
                                                                >
                                                                    {sub.icon}
                                                                    <span className="text-xs font-bold">{sub.name}</span>
                                                                </Link>
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            )}
                                        </div>
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
