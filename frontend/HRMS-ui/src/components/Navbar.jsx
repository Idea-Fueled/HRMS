import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { logoutUser } from "../services/auth.service";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import {
    Search,
    Bell,
    Plus,
    User,
    Settings,
    LogOut,
    ChevronDown,
    Shield,
    Menu
} from "lucide-react";
import userAvatar from "../assets/user_avatar.png";
import { Avatar } from "./SharedComponents";

const pageMetadata = {
    "/": {
        title: "Dashboard",
        subtitle: "Welcome back! Here is your workspace summary.",
    },
    "/me": {
        title: "Me",
        subtitle: "Manage your personal profile, attendance, and details.",
    },
    "/my-team": {
        title: "My Team",
        subtitle: "View team details, directories, and schedules.",
    },
    "/employees": {
        title: "Employees",
        subtitle: "Manage employee records, profiles, and organizational data.",
    },
    "/my-finances": {
        title: "My Finances",
        subtitle: "Manage payslips, claims, and benefits.",
    },
    "/documents": {
        title: "Documents",
        subtitle: "Access your files, policy documents, and folders.",
    },
    "/time-attend": {
        title: "Time & Attend",
        subtitle: "Track clock-ins, leaves, and work shifts.",
    },
    "/hire": {
        title: "Hire",
        subtitle: "Manage candidates, job openings, and interviews.",
    },
    "/organization": {
        title: "Organization",
        subtitle: "Explore directory, departments, and structures.",
    },
};

const roles = ["Admin", "HR", "Manager", "Employee"];

const Navbar = ({ onToggleSidebar }) => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const currentPath = location.pathname;

    const fullName = user?.fullName || "";
    const designation = user?.designation || "";
    const email = user?.email || "";
    const profilePicture = user?.profilePicture || userAvatar;

    const meta = pageMetadata[currentPath] || {
        title: "Dashboard",
        subtitle: "Welcome back! Here is your workspace summary.",
    };

    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

    const profileRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (profileRef.current && !profileRef.current.contains(event.target)) {
                setIsProfileDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <header className="sticky top-0 right-0 bg-white border-b border-gray-100 h-20 px-4 sm:px-8 flex items-center justify-between z-20 select-none shadow-[0_1px_3px_rgba(0,0,0,0.02)] gap-2">
            {/* Left Section - Hamburger Menu & Title */}
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

            {/* Center Section - Global Search Bar (hidden on mobile) */}
            <div className="hidden md:flex flex-1 max-w-md mx-4 lg:mx-8">
                <div className="relative group flex items-center w-full">
                    <Search className="w-4 h-4 text-gray-400 absolute left-4 group-focus-within:text-[#2D79C7] transition-colors duration-200" />
                    <input
                        type="text"
                        placeholder="Search employees, documents, departments..."
                        className="w-full pl-11 pr-4 py-2.5 bg-gray-50/50 hover:bg-gray-50 border border-gray-200/80 rounded-[14px] text-sm text-[#1E1E1E] placeholder-gray-400 focus:outline-none focus:bg-white focus:border-[#2D79C7] focus:ring-1 focus:ring-[#2D79C7] transition-all duration-200 shadow-inner"
                    />
                </div>
            </div>

            {/* Right Section - Notifications, Quick Actions, Profile */}
            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                {/* Role badge — shows actual role from JWT/API */}
                <div className="bg-blue-50 text-[#2D79C7] text-xs font-semibold px-3 py-1.5 rounded-full border border-blue-100 shadow-sm flex items-center gap-1 uppercase tracking-wider select-none">
                    <Shield className="w-3 h-3 text-[#2D79C7]" />
                    <span>{user?.role || "—"}</span>
                </div>

                {/* Notifications with Accent Yellow Indicator */}
                <button className="relative p-2 text-gray-500 hover:text-[#2D79C7] hover:bg-gray-50 rounded-xl transition-all duration-200">
                    <Bell className="w-5.5 h-5.5" />
                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-[#FFEA00] border-2 border-white rounded-full shadow-sm animate-pulse" />
                </button>

                {/* Quick Actions (+ Create) */}
                <button className="bg-[#2D79C7] hover:bg-[#1F5EA8] text-white font-semibold text-sm px-4.5 py-2.5 rounded-[14px] flex items-center gap-1.5 shadow-md shadow-[#2D79C7]/15 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200">
                    <Plus className="w-4.5 h-4.5 stroke-[2.5]" />
                    <span>Create</span>
                </button>

                {/* Divider */}
                <div className="h-8 w-px bg-gray-200 mx-1" />

                {/* Profile menu toggle dropdown */}
                <div className="relative" ref={profileRef}>
                    <button
                        onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                        className="flex items-center gap-2.5 p-1.5 hover:bg-gray-50 rounded-2xl border border-transparent hover:border-gray-200/50 transition-all duration-200"
                    >
                        <Avatar
                            src={user?.profilePicture}
                            name={fullName}
                            size="w-9 h-9"
                        />
                        <div className="flex flex-col text-left hidden sm:flex">
                            <span className="text-[#1E1E1E] text-xs font-semibold tracking-wide">
                                {fullName}
                            </span>
                            <span className="text-gray-400 text-[10px] font-medium leading-none">
                                {designation}
                            </span>
                        </div>
                        <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                    </button>

                    {/* Profile Dropdown Options */}
                    {isProfileDropdownOpen && (
                        <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-100 rounded-[14px] shadow-xl py-1 z-30 animate-in fade-in slide-in-from-top-2 duration-200">
                            <div className="px-4 py-2 border-b border-gray-100 text-left">
                                <p className="text-xs text-gray-400 font-medium">Signed in as</p>
                                <p className="text-xs text-[#1E1E1E] font-bold truncate">{email}</p>
                            </div>

                            <a
                                href="#profile"
                                className="flex items-center gap-2 px-4 py-2.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors duration-150"
                            >
                                <User className="w-4 h-4 text-gray-400" />
                                <span>My Profile</span>
                            </a>
                            <a
                                href="#settings"
                                className="flex items-center gap-2 px-4 py-2.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors duration-150"
                            >
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
                                        console.error("Logout request failed:", err);
                                        toast.error("Logout failed, but session cleared.");
                                    } finally {
                                        logout();
                                        setIsProfileDropdownOpen(false);
                                        navigate("/login");
                                    }
                                }}
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-red-600 hover:bg-red-50 transition-colors duration-150 text-left"
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