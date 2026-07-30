import React, { useState, useEffect, useRef } from "react";
import {
    Clock,
    Calendar,
    User,
    Users,
    Hourglass,
    LogIn,
    Home,
    FileText,
    ShieldAlert,
    Umbrella,
    Award,
    ChevronDown,
    Info,
    Plus,
    Search,
    MoreVertical,
    Trophy,
    MessageSquare,
    Heart,
    Send,
    BookOpen,
    Camera,
    Trash2,
    CheckCircle2,
    Check,
    AlertCircle,
    ArrowUpRight,
    BarChart3,
    Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { getLeaveSummary, getLeaveHistory, applyLeave } from "../../services/dashboard.service";
import { uploadProfilePicture, updateProfilePicture } from "../../services/auth.service";
import { useAuth } from "../../context/AuthContext";
import { Avatar } from "../../components/SharedComponents";

/* ──────────────────────────────────────────�/* ─────────────────────────────────────────────
   ATTENDANCE TAB COMPONENTS (ENTERPRISE THEME BLUE UI)
───────────────────────────────────────────── */

const AnalogClock = () => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        let animationFrameId;
        const updateClock = () => {
            setTime(new Date());
            animationFrameId = requestAnimationFrame(updateClock);
        };
        animationFrameId = requestAnimationFrame(updateClock);
        return () => cancelAnimationFrame(animationFrameId);
    }, []);

    const seconds = time.getSeconds() + time.getMilliseconds() / 1000;
    const minutes = time.getMinutes() + seconds / 60;
    const hours = (time.getHours() % 12) + minutes / 60;

    const secondDeg = seconds * 6;
    const minuteDeg = minutes * 6;
    const hourDeg = hours * 30;

    return (
        <div className="relative w-36 h-36 rounded-full bg-white border-2 border-[#2D79C7]/20 shadow-[0_8px_25px_rgba(45,121,199,0.12)] flex items-center justify-center shrink-0">
            {/* Clock Dial Hour Ticks */}
            {[...Array(12)].map((_, i) => (
                <div
                    key={i}
                    className="absolute w-full h-full flex justify-center pt-2"
                    style={{ transform: `rotate(${i * 30}deg)` }}
                >
                    <div className={`w-0.5 ${i % 3 === 0 ? "h-2.5 bg-[#2D79C7]" : "h-1.5 bg-blue-200"}`} />
                </div>
            ))}

            {/* Hour Hand */}
            <div
                className="absolute w-full h-full flex justify-center items-center"
                style={{ transform: `rotate(${hourDeg}deg)` }}
            >
                <div className="w-1 h-9 bg-[#2D79C7] rounded-full origin-bottom -translate-y-4 shadow-xs" />
            </div>

            {/* Minute Hand */}
            <div
                className="absolute w-full h-full flex justify-center items-center"
                style={{ transform: `rotate(${minuteDeg}deg)` }}
            >
                <div className="w-0.5 h-12 bg-[#1F5EA8] rounded-full origin-bottom -translate-y-5 shadow-xs" />
            </div>

            {/* Second Hand */}
            <div
                className="absolute w-full h-full flex justify-center items-center"
                style={{ transform: `rotate(${secondDeg}deg)` }}
            >
                <div className="w-0.5 h-14 bg-rose-500 rounded-full origin-bottom -translate-y-5" />
            </div>

            {/* Center Pin */}
            <div className="w-2.5 h-2.5 bg-[#2D79C7] border-2 border-white rounded-full z-10 shadow-xs" />
        </div>
    );
};

const AttendanceHeroBar = () => {
    const { user } = useAuth();
    const [isClockedIn, setIsClockedIn] = useState(true);

    const userName = user?.firstName || user?.fullName?.split(" ")[0] || "Employee";

    const getTimeGreeting = () => {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) return "Good Morning";
        if (hour >= 12 && hour < 17) return "Good Afternoon";
        return "Good Evening";
    };

    const handleClockToggle = () => {
        if (isClockedIn) {
            setIsClockedIn(false);
            toast.success("Clocked out successfully");
        } else {
            setIsClockedIn(true);
            toast.success("Clocked in successfully");
        }
    };

    return (
        <div className="bg-white border border-slate-200/80 rounded-[20px] p-6 sm:p-7 shadow-xs select-none">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                
                {/* Left Side: Analog Clock + User & Shift Info */}
                <div className="flex items-center gap-6">
                    <AnalogClock />
                    
                    <div className="space-y-3">
                        <div>
                            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                                {getTimeGreeting()}, {userName}
                            </h2>
                            <p className="text-xs font-semibold text-slate-500 mt-1">
                                Shift <span className="text-[#2D79C7] font-mono font-bold ml-1">10:00 AM – 07:00 PM</span>
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-slate-500">Status</span>
                            {isClockedIn ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    <span>Clocked In</span>
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                                    <span>Clocked Out</span>
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Side: Action Buttons with Theme Blue */}
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        type="button"
                        onClick={handleClockToggle}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-blue-500/20 active:scale-95 ${
                            isClockedIn
                                ? "bg-[#2D79C7] hover:bg-[#2064aa] text-white"
                                : "bg-emerald-600 hover:bg-emerald-700 text-white"
                        }`}
                    >
                        <Clock className="w-4 h-4" />
                        <span>{isClockedIn ? "Clock Out" : "Clock In"}</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => toast.info("Work From Home request")}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-white hover:bg-blue-50/60 border border-slate-200 hover:border-[#2D79C7]/40 text-slate-700 hover:text-[#2D79C7] transition-all cursor-pointer active:scale-95 shadow-2xs"
                    >
                        <Home className="w-4 h-4 text-[#2D79C7]" />
                        <span>Work From Home</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => toast.info("Partial Day request")}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-white hover:bg-blue-50/60 border border-slate-200 hover:border-[#2D79C7]/40 text-slate-700 hover:text-[#2D79C7] transition-all cursor-pointer active:scale-95 shadow-2xs"
                    >
                        <FileText className="w-4 h-4 text-[#2D79C7]" />
                        <span>Partial Day</span>
                    </button>
                </div>

            </div>
        </div>
    );
};

const AttendanceKPIStats = () => {
    const kpis = [
        {
            title: "Average Hours / Day",
            value: "8h 22m",
            badge: "Punctual"
        },
        {
            title: "On-Time Arrival Rate",
            value: "92%",
            badge: "92%"
        },
        {
            title: "Average Break Time",
            value: "38m",
            badge: "Normal"
        },
        {
            title: "Present Days (July)",
            value: "22 / 24",
            badge: "2 WFH"
        }
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 select-none">
            {kpis.map((kpi, idx) => (
                <div
                    key={idx}
                    className="bg-white border border-slate-200/80 rounded-[18px] p-5 shadow-2xs hover:border-slate-300 transition-all"
                >
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{kpi.title}</span>
                        {kpi.badge && (
                            <span className="text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                                {kpi.badge}
                            </span>
                        )}
                    </div>
                    <div className="text-2xl font-bold text-slate-900 tracking-tight font-mono">
                        {kpi.value}
                    </div>
                </div>
            ))}
        </div>
    );
};

const VisualWorkdayTimeline = () => {
    const weekDays = [
        { day: "Mon", date: "27 Jul", hours: "9h 0m", active: true },
        { day: "Tue", date: "28 Jul", hours: "10:00 - 19:00", active: false },
        { day: "Wed", date: "29 Jul", hours: "10:00 - 19:00", active: false },
        { day: "Thu", date: "30 Jul", hours: "10:00 - 19:00", active: false },
        { day: "Fri", date: "31 Jul", hours: "10:00 - 19:00", active: false },
        { day: "Sat", date: "01 Aug", hours: "Off", active: false },
        { day: "Sun", date: "02 Aug", hours: "Off", active: false }
    ];

    return (
        <div className="bg-white border border-slate-200/80 rounded-[20px] p-6 shadow-2xs space-y-6 select-none">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Weekly Schedule</h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">Shift Target: 9h / day</p>
                </div>
                <div className="flex items-center gap-4 text-xs font-semibold text-slate-600">
                    <span>Gross Logged: <strong className="text-slate-900 font-mono">5h 25m</strong></span>
                    <span>Effective: <strong className="text-[#2D79C7] font-mono">4h 48m</strong></span>
                </div>
            </div>

            {/* Shift Progress Gauge */}
            <div className="space-y-2 bg-blue-50/40 border border-blue-100/70 p-4 rounded-xl">
                <div className="flex justify-between text-xs font-semibold text-slate-700">
                    <span>Shift Completion</span>
                    <span className="font-mono text-[#2D79C7] font-bold">53% (4h 12m remaining)</span>
                </div>
                <div className="w-full h-2 bg-blue-100/80 rounded-full overflow-hidden">
                    <div className="h-full bg-[#2D79C7] rounded-full transition-all duration-300" style={{ width: "53%" }} />
                </div>
            </div>

            {/* Weekly Schedule Days */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                {weekDays.map((item, idx) => (
                    <div
                        key={idx}
                        className={`p-3 rounded-xl border text-center transition-all ${
                            item.active
                                ? "bg-[#2D79C7] text-white border-[#2D79C7] shadow-md shadow-blue-500/20"
                                : item.hours === "Off"
                                ? "bg-slate-50 border-slate-200/60 text-slate-400"
                                : "bg-white border-slate-200/80 text-slate-700 hover:border-slate-300"
                        }`}
                    >
                        <span className={`text-[10px] font-bold uppercase tracking-wider block ${item.active ? "text-blue-100" : "text-slate-400"}`}>
                            {item.day}
                        </span>
                        <span className="text-xs font-bold block my-1">{item.date}</span>
                        <span className={`text-[10px] font-medium block font-mono ${item.active ? "text-blue-50" : "text-slate-500"}`}>
                            {item.hours}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};


/* ─────────────────────────────────────────────
   LEAVE TAB — PENDING LEAVE REQUESTS
───────────────────────────────────────────── */
const PendingLeaveRequestsCard = ({ pendingRequests = [], loading = false, onRequestLeave }) => {
    const formatLeaveType = (type) => {
        switch (type) {
            case "casual_leave": return "Casual Leave";
            case "sick_leave": return "Sick Leave";
            case "earned_leave": return "Earned Leave";
            case "unpaid_leave": return "Unpaid Leave";
            default: return type;
        }
    };

    const formatLeaveDates = (startStr, endStr) => {
        if (!startStr || !endStr) return "--";
        const start = new Date(startStr);
        const end = new Date(endStr);
        const options = { day: "numeric", month: "short", year: "numeric" };
        const startFormatted = start.toLocaleDateString("en-US", options);
        const endFormatted = end.toLocaleDateString("en-US", options);
        if (startFormatted === endFormatted) {
            return startFormatted;
        }
        return `${startFormatted} - ${endFormatted}`;
    };

    const calculateDays = (startStr, endStr, totalDays) => {
        if (totalDays) return `${totalDays} Day${totalDays !== 1 ? 's' : ''}`;
        if (!startStr || !endStr) return "--";
        const start = new Date(startStr);
        const end = new Date(endStr);
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        return `${diffDays} Day${diffDays !== 1 ? 's' : ''}`;
    };

    return (
        <div className="premium-3d-card p-6 flex flex-col md:flex-row gap-6">
            {/* Left Side (80% on desktop) */}
            <div className="flex-1 md:w-[78%] flex flex-col justify-start">
                <h3 className="text-[#1E1E1E] text-[14px] font-extrabold mb-4 shrink-0 text-left">Pending Leave Requests</h3>
                
                {loading ? (
                    <div className="flex items-center justify-center py-8 flex-1">
                        <span className="text-gray-400 text-[11px] font-bold">Loading pending requests...</span>
                    </div>
                ) : pendingRequests.length === 0 ? (
                    /* Empty State Panel */
                    <div className="flex flex-col items-center justify-center py-4 text-center flex-1">
                        <div className="w-11 h-11 rounded-full bg-[#ECFDF5] border border-emerald-100 flex items-center justify-center mb-2.5">
                            <span className="text-lg">🎉</span>
                        </div>
                        <h4 className="text-[#1E1E1E] text-[13px] font-bold">Hurray! No pending leave requests</h4>
                        <p className="text-gray-500 text-[11px] font-medium mt-1">Request leave on the right!</p>
                    </div>
                ) : (
                    /* Pending Requests List */
                    <div className="flex-1 overflow-y-auto max-h-[220px] pr-1 space-y-3 scrollbar-thin">
                        {pendingRequests.map((req, idx) => (
                            <div key={req._id || idx} className="flex items-center justify-between p-3 border border-gray-150 rounded-[8px] bg-[#F8FAFC]/50 hover:bg-[#F8FAFC] transition-all duration-200">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-[#EBF3FC] text-[#2D79C7] flex items-center justify-center shrink-0">
                                        <Calendar className="w-4.5 h-4.5" />
                                    </div>
                                    <div className="text-left">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[#1E1E1E] text-[12px] font-extrabold">
                                                {formatLeaveType(req.leaveType)}
                                            </span>
                                            <span className="text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-100 px-1.5 py-0.5 rounded-[4px]">
                                                {calculateDays(req.startDate, req.endDate, req.totalDays)}
                                            </span>
                                        </div>
                                        <p className="text-gray-500 text-[11px] font-bold mt-0.5 font-mono">
                                            {formatLeaveDates(req.startDate, req.endDate)}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right max-w-[250px] md:max-w-[400px]">
                                    <span className="text-gray-400 text-[9px] font-bold uppercase tracking-wider block">Reason</span>
                                    <span className="text-gray-600 text-[11.5px] font-semibold truncate block mt-0.5" title={req.reason}>
                                        {req.reason}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Divider Line (Desktop only) */}
            <div className="hidden md:block w-[1px] bg-gray-200/80 my-1" />

            {/* Right Side (20% on desktop) */}
            <div className="md:w-[22%] shrink-0 flex flex-col justify-start gap-4 pt-1">
                {/* Leave Period Dropdown */}
                <div className="space-y-1.5">
                    <span className="text-gray-500 text-[9px] font-bold uppercase tracking-wider block">Leave Period</span>
                    <button type="button" className="w-full text-[11px] text-gray-700 hover:text-gray-900 flex items-center justify-between font-bold bg-[#F8FAFC] border border-gray-200 rounded px-2.5 py-1.5 text-left cursor-pointer">
                        <span>Apr 2026 - Mar 2027</span>
                        <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0 ml-1" />
                    </button>
                </div>

                {/* Primary CTA */}
                <div className="space-y-3">
                    <button
                        type="button"
                        onClick={onRequestLeave}
                        className="w-full bg-[#2D79C7] hover:bg-[#1F5EA8] text-white text-[12px] font-bold py-2 px-3 rounded-[8px] transition-colors duration-200 text-center shadow-sm cursor-pointer"
                    >
                        Request Leave
                    </button>
                    
                    <div className="pl-1">
                        <button
                            type="button"
                            className="flex items-center gap-1.5 text-[11px] font-bold text-[#2D79C7] hover:text-[#1F5EA8] transition-colors text-left cursor-pointer"
                        >
                            <Plus className="w-3.5 h-3.5 text-[#2D79C7]" />
                            <span>Request Credit for Compensatory Off</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

/* ─────────────────────────────────────────────
   LEAVE TAB — MY LEAVE STATS GRAPH CARDS
───────────────────────────────────────────── */
const WeeklyPatternCard = () => {
    const data = [
        { label: "Mon", val: 2 },
        { label: "Tue", val: 4 },
        { label: "Wed", val: 0 },
        { label: "Thu", val: 3 },
        { label: "Fri", val: 6 },
        { label: "Sat", val: 0 },
        { label: "Sun", val: 0 }
    ];
    const maxVal = 6;

    return (
        <div className="premium-3d-card p-4.5 flex flex-col justify-between h-[280px]">
            <h4 className="text-[#1E1E1E] text-[13px] font-bold mb-3 shrink-0">Weekly Pattern</h4>
            
            {/* Bar Chart Container */}
            <div className="flex-1 flex flex-col justify-end">
                <div className="flex items-end justify-between h-36 px-1">
                    {data.map((item, idx) => {
                        const barHeight = `${(item.val / maxVal) * 100}%`;
                        return (
                            <div key={idx} className="flex flex-col items-center flex-1 group">
                                {/* Value Label */}
                                <span className={`text-[9px] font-bold text-gray-500 mb-1.5 transition-opacity ${item.val > 0 ? "opacity-100" : "opacity-0"}`}>
                                    {item.val}
                                </span>
                                {/* Bar */}
                                <div className="w-4 bg-[#F8FAFC] border border-gray-100 rounded-t-md h-24 flex items-end">
                                    {item.val > 0 && (
                                        <div
                                            className="w-full bg-[#2D79C7] hover:bg-[#1F5EA8] rounded-t-md transition-all duration-300"
                                            style={{ height: barHeight }}
                                            title={`${item.label}: ${item.val} leaves`}
                                        />
                                    )}
                                </div>
                                {/* Day label */}
                                <span className="text-[10px] text-gray-400 font-bold mt-2">{item.label}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

const ConsumedLeaveTypesCard = ({ leaveSummary }) => {
    const [hoverText, setHoverText] = useState(null);

    const balance = leaveSummary?.leaveBalance || {
        sick: { used: 0 },
        casual: { used: 0 },
        earned: { used: 0 }
    };

    const casualUsed = balance.casual?.used ?? 0;
    const earnedUsed = balance.earned?.used ?? 0;
    const sickUsed = balance.sick?.used ?? 0;
    const totalUsed = casualUsed + earnedUsed + sickUsed;

    const casualPct = totalUsed > 0 ? (casualUsed / totalUsed) * 100 : 40;
    const earnedPct = totalUsed > 0 ? (earnedUsed / totalUsed) * 100 : 35;
    const sickPct = totalUsed > 0 ? (sickUsed / totalUsed) * 100 : 25;

    const radius = 30;
    const strokeWidth = 9;
    const circumference = 2 * Math.PI * radius; // ~188.495

    const casualDash = (casualPct / 100) * circumference;
    const earnedDash = (earnedPct / 100) * circumference;
    const sickDash = (sickPct / 100) * circumference;

    const defaultTooltip = `Casual: ${casualPct.toFixed(0)}% | Earned: ${earnedPct.toFixed(0)}% | Sick: ${sickPct.toFixed(0)}%`;

    return (
        <div className="premium-3d-card p-4.5 flex flex-col justify-between h-[280px]">
            <h4 className="text-[#1E1E1E] text-[13px] font-bold mb-3 shrink-0">Consumed Leave Types</h4>
            
            <div className="flex-1 flex items-center justify-between gap-4 py-2">
                {/* Left: Donut Chart SVG with hover triggers */}
                <div
                    className="relative w-28 h-28 flex items-center justify-center shrink-0 group cursor-pointer"
                    onMouseEnter={() => setHoverText(defaultTooltip)}
                    onMouseLeave={() => setHoverText(null)}
                >
                    {/* Tooltip Overlay */}
                    {hoverText && (
                        <div className="absolute bg-[#374151] text-white text-[9.5px] font-extrabold px-2.5 py-1.5 rounded-[4px] shadow-lg pointer-events-none select-none z-10 border border-gray-600 text-center leading-tight whitespace-nowrap">
                            {hoverText}
                        </div>
                    )}
                    
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 80 80">
                        {/* Casual Leave Segment */}
                        <circle
                            cx="40"
                            cy="40"
                            r={radius}
                            fill="none"
                            stroke="#38BDF8"
                            strokeWidth={strokeWidth}
                            strokeDasharray={`${casualDash} ${circumference}`}
                            strokeDashoffset="0"
                            className="hover:stroke-[#0EA5E9] transition-colors"
                            onMouseEnter={(e) => {
                                e.stopPropagation();
                                setHoverText(`Casual: ${casualPct.toFixed(0)}% (${casualUsed} days)`);
                            }}
                            onMouseLeave={() => setHoverText(defaultTooltip)}
                        />
                        {/* Earned Leave Segment */}
                        <circle
                            cx="40"
                            cy="40"
                            r={radius}
                            fill="none"
                            stroke="#10B981"
                            strokeWidth={strokeWidth}
                            strokeDasharray={`${earnedDash} ${circumference}`}
                            strokeDashoffset={-casualDash}
                            className="hover:stroke-[#059669] transition-colors"
                            onMouseEnter={(e) => {
                                e.stopPropagation();
                                setHoverText(`Earned: ${earnedPct.toFixed(0)}% (${earnedUsed} days)`);
                            }}
                            onMouseLeave={() => setHoverText(defaultTooltip)}
                        />
                        {/* Sick Leave Segment */}
                        <circle
                            cx="40"
                            cy="40"
                            r={radius}
                            fill="none"
                            stroke="#E11D48"
                            strokeWidth={strokeWidth}
                            strokeDasharray={`${sickDash} ${circumference}`}
                            strokeDashoffset={-(casualDash + earnedDash)}
                            className="hover:stroke-[#BE123C] transition-colors"
                            onMouseEnter={(e) => {
                                e.stopPropagation();
                                setHoverText(`Sick: ${sickPct.toFixed(0)}% (${sickUsed} days)`);
                            }}
                            onMouseLeave={() => setHoverText(defaultTooltip)}
                        />
                    </svg>
                    
                    {/* Inner Label */}
                    <div className="absolute flex flex-col items-center justify-center text-center pointer-events-none select-none">
                        <span className="text-[#1E1E1E] text-[10px] font-extrabold leading-none">Leave</span>
                        <span className="text-gray-400 text-[8px] font-bold mt-0.5 uppercase tracking-wider">Types</span>
                    </div>
                </div>

                {/* Right: Legend */}
                <div className="space-y-2 flex-1 pl-2">
                    <div className="flex items-center gap-2 text-[11px] font-semibold text-gray-600">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#38BDF8] shrink-0" />
                        <div className="flex-1 flex justify-between">
                            <span>Casual</span>
                            <span className="text-gray-800 font-extrabold font-mono">{casualPct.toFixed(0)}%</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] font-semibold text-gray-600">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#10B981] shrink-0" />
                        <div className="flex-1 flex justify-between">
                            <span>Earned</span>
                            <span className="text-gray-800 font-extrabold font-mono">{earnedPct.toFixed(0)}%</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] font-semibold text-gray-600">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#E11D48] shrink-0" />
                        <div className="flex-1 flex justify-between">
                            <span>Sick</span>
                            <span className="text-gray-800 font-extrabold font-mono">{sickPct.toFixed(0)}%</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const MonthlyStatsCard = () => {
    const data = [
        { label: "Apr", val: 3 },
        { label: "May", val: 5 },
        { label: "Jun", val: 1 },
        { label: "Jul", val: 0 },
        { label: "Aug", val: 0 },
        { label: "Sep", val: 0 },
        { label: "Oct", val: 0 },
        { label: "Nov", val: 0 },
        { label: "Dec", val: 0 },
        { label: "Jan", val: 0 },
        { label: "Feb", val: 0 },
        { label: "Mar", val: 0 }
    ];
    const maxVal = 5;

    return (
        <div className="premium-3d-card p-4.5 flex flex-col justify-between h-[280px]">
            <h4 className="text-[#1E1E1E] text-[13px] font-bold mb-3 shrink-0">Monthly Stats</h4>
            
            {/* Bar Chart Container */}
            <div className="flex-1 flex flex-col justify-end">
                <div className="flex items-end justify-between h-36 px-0.5 gap-0.5">
                    {data.map((item, idx) => {
                        const barHeight = `${(item.val / maxVal) * 100}%`;
                        return (
                            <div key={idx} className="flex flex-col items-center flex-1">
                                {/* Value Label */}
                                <span className={`text-[8px] font-bold text-gray-500 mb-1.5 transition-opacity ${item.val > 0 ? "opacity-100" : "opacity-0"}`}>
                                    {item.val}
                                </span>
                                {/* Bar */}
                                <div className="w-full bg-[#F8FAFC] border border-gray-100 rounded-t h-24 flex items-end">
                                    {item.val > 0 && (
                                        <div
                                            className="w-full bg-[#2D79C7] hover:bg-[#1F5EA8] rounded-t transition-all duration-300"
                                            style={{ height: barHeight }}
                                            title={`${item.label}: ${item.val} leaves`}
                                        />
                                    )}
                                </div>
                                {/* Day label */}
                                <span className="text-[8px] text-gray-400 font-bold mt-2 truncate max-w-full text-center leading-none select-none">{item.label}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

/* ─────────────────────────────────────────────
   LEAVE TAB — LEAVE BALANCES CARDS
───────────────────────────────────────────── */
const LeaveBalanceCard = ({
    label,
    available,
    consumed,
    accrued,
    carryOver,
    annualQuota,
    color,
    noData = false,
    isInfinity = false
}) => {
    const [hoverText, setHoverText] = useState(null);

    const radius = 66;
    const strokeWidth = 14;
    const circumference = 2 * Math.PI * radius; // ~414.69
    const pct = isInfinity ? circumference : (annualQuota > 0 ? (available / annualQuota) * circumference : 0);
    const strokeDashoffset = circumference - pct;

    const availableLabel = isInfinity ? "∞ Days" : `${available} Day${available !== 1 ? 's' : ''}`;
    const consumedLabel = `${consumed} Day${consumed !== 1 ? 's' : ''}`;

    return (
        <div className="premium-3d-card p-4.5 flex flex-col justify-between min-h-[350px] h-full">
            <div>
                {/* Title */}
                <div className="flex justify-between items-center mb-3">
                    <h4 className="text-[#1E1E1E] text-[13px] font-extrabold text-left">{label}</h4>
                    <button type="button" className="text-[#2D79C7] hover:text-[#1F5EA8] text-[10px] font-bold transition-colors">
                        View details
                    </button>
                </div>

                {/* Circular Progress Visualization */}
                <div className="flex justify-center items-center py-4 relative group cursor-pointer">
                    {noData ? (
                        <div className="w-40 h-40 flex items-center justify-center text-gray-400 text-[11px] font-bold">
                            No data to display.
                        </div>
                    ) : (
                        <>
                            {/* Hover Tooltip overlay */}
                            {hoverText && (
                                <div className="absolute bg-[#374151] text-white text-[10px] font-extrabold px-2.5 py-1.5 rounded-[4px] shadow-lg pointer-events-none select-none z-10 border border-gray-600 text-center whitespace-nowrap">
                                    {hoverText}
                                </div>
                            )}

                            <div className="relative w-40 h-40 flex items-center justify-center shrink-0">
                                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
                                    {/* Available/Remaining Stroke Segment */}
                                    <circle
                                        cx="80"
                                        cy="80"
                                        r={radius}
                                        className="stroke-gray-100 fill-none cursor-pointer hover:stroke-gray-200 transition-colors"
                                        strokeWidth={strokeWidth}
                                        onMouseEnter={() => setHoverText(`Consumed: ${consumedLabel}`)}
                                        onMouseLeave={() => setHoverText(null)}
                                    />
                                    {/* Consumed Stroke Segment */}
                                    <circle
                                        cx="80"
                                        cy="80"
                                        r={radius}
                                        fill="none"
                                        stroke={color}
                                        strokeWidth={strokeWidth}
                                        strokeDasharray={circumference}
                                        strokeDashoffset={strokeDashoffset}
                                        strokeLinecap="round"
                                        className="transition-all duration-700 ease-out cursor-pointer hover:opacity-85"
                                        onMouseEnter={() => setHoverText(`Available: ${availableLabel}`)}
                                        onMouseLeave={() => setHoverText(null)}
                                    />
                                </svg>
                                <div className="absolute flex flex-col items-center justify-center text-center pointer-events-none select-none">
                                    <span className="text-[#1E1E1E] text-[16px] font-black leading-none">
                                        {isInfinity ? "∞ Days" : `${available} Day${available !== 1 ? "s" : ""}`}
                                    </span>
                                    <span className="text-gray-400 text-[8px] font-bold mt-1 uppercase tracking-wider">
                                        Available
                                    </span>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Statistics Bottom Section */}
            <div className="mt-4 pt-3 border-t border-gray-100 grid grid-cols-2 gap-y-3 gap-x-2 text-[9px] font-extrabold text-left uppercase text-gray-400">
                {/* Available */}
                <div>
                    <span className="block mb-0.5">Available</span>
                    <span className="block text-gray-800 text-[11px] font-extrabold normal-case font-mono">
                        {isInfinity ? "∞" : `${available} day${available !== 1 ? 's' : ''}`}
                    </span>
                </div>
                
                {/* Consumed */}
                <div>
                    <span className="block mb-0.5">Consumed</span>
                    <span className="block text-gray-800 text-[11px] font-extrabold normal-case font-mono">
                        {consumed} day{consumed !== 1 ? 's' : ''}
                    </span>
                </div>
                
                {/* Accrued / Carryover */}
                {accrued !== undefined && (
                    <div>
                        <span className="block mb-0.5">Accrued So Far</span>
                        <span className="block text-gray-800 text-[11px] font-extrabold normal-case font-mono">
                            {accrued} day{accrued !== 1 ? 's' : ''}
                        </span>
                    </div>
                )}
                {carryOver !== undefined && (
                    <div>
                        <span className="block mb-0.5">Carryover</span>
                        <span className="block text-gray-800 text-[11px] font-extrabold normal-case font-mono">
                            {carryOver} day{carryOver !== 1 ? 's' : ''}
                        </span>
                    </div>
                )}
                {annualQuota !== undefined && accrued === undefined && (
                    <div>
                        <span className="block mb-0.5">Annual Quota</span>
                        <span className="block text-gray-800 text-[11px] font-extrabold normal-case font-mono">
                            {isInfinity ? "∞" : `${annualQuota} day${annualQuota !== 1 ? 's' : ''}`}
                        </span>
                    </div>
                )}

                {/* Third Row: Annual Quota if Accrued is defined */}
                {accrued !== undefined && annualQuota !== undefined && (
                    <div className="col-span-2 border-t border-gray-50 pt-1.5 mt-0.5">
                        <div className="flex justify-between items-center text-[9px]">
                            <span>Annual Quota</span>
                            <span className="text-gray-800 text-[11px] font-extrabold normal-case font-mono">
                                {annualQuota} day{annualQuota !== 1 ? 's' : ''}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

/* ─────────────────────────────────────────────
   LEAVE TAB — LEAVE HISTORY TABLE & FILTERS
───────────────────────────────────────────── */
const LeaveHistorySection = ({
    leaveHistory,
    loadingHistory,
    selectedType,
    setSelectedType,
    selectedStatus,
    setSelectedStatus,
    searchQuery,
    setSearchQuery
}) => {
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    const formatLeaveType = (type) => {
        switch (type) {
            case "casual_leave": return "Casual Leave";
            case "sick_leave": return "Sick Leave";
            case "earned_leave": return "Earned Leave";
            case "unpaid_leave": return "Unpaid Leave";
            default: return type;
        }
    };

    const formatLeaveDates = (startStr, endStr) => {
        if (!startStr || !endStr) return "--";
        const start = new Date(startStr);
        const end = new Date(endStr);
        const options = { day: "numeric", month: "short", year: "numeric" };
        const startFormatted = start.toLocaleDateString("en-US", options);
        const endFormatted = end.toLocaleDateString("en-US", options);
        if (startFormatted === endFormatted) {
            return startFormatted;
        }
        return `${startFormatted} - ${endFormatted}`;
    };

    const formatActionTakenOn = (row) => {
        if (row.status === "pending") return "--";
        const date = new Date(row.updatedAt);
        return date.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
    };

    const getStatusBadge = (status) => {
        switch (status?.toLowerCase()) {
            case "approved":
                return (
                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-bold px-2 py-0.5 rounded-[4px] inline-block">
                        Approved
                    </span>
                );
            case "pending":
                return (
                    <span className="bg-amber-50 text-amber-700 border border-amber-100 text-[10px] font-bold px-2 py-0.5 rounded-[4px] inline-block">
                        Pending
                    </span>
                );
            case "rejected":
                return (
                    <span className="bg-rose-50 text-rose-700 border border-rose-100 text-[10px] font-bold px-2 py-0.5 rounded-[4px] inline-block">
                        Rejected
                    </span>
                );
            case "cancelled":
                return (
                    <span className="bg-gray-50 text-gray-500 border border-gray-150 text-[10px] font-bold px-2 py-0.5 rounded-[4px] inline-block">
                        Cancelled
                    </span>
                );
            default:
                return (
                    <span className="bg-gray-50 text-gray-700 border border-gray-100 text-[10px] font-bold px-2 py-0.5 rounded-[4px] inline-block">
                        {status}
                    </span>
                );
        }
    };

    // Filter logic
    const filteredHistory = leaveHistory.filter(row => {
        const typeMatches = selectedType === "All Leave Types" || formatLeaveType(row.leaveType) === selectedType;
        const statusMatches = selectedStatus === "All Statuses" || row.status?.toLowerCase() === selectedStatus?.toLowerCase();
        
        const dateStr = formatLeaveDates(row.startDate, row.endDate).toLowerCase();
        const noteStr = (row.reason || "").toLowerCase();
        const searchMatches = searchQuery === "" ||
            noteStr.includes(searchQuery.toLowerCase()) ||
            dateStr.includes(searchQuery.toLowerCase());
            
        return typeMatches && statusMatches && searchMatches;
    });

    const totalPages = Math.ceil(filteredHistory.length / itemsPerPage) || 1;
    const paginatedHistory = filteredHistory.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    // Sync page range
    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(totalPages);
        }
    }, [filteredHistory.length, totalPages, currentPage]);

    const user = JSON.parse(localStorage.getItem("user") || "null");
    const requesterName = user?.fullName || "";

    return (
        <div className="space-y-3 mt-8">
            <h3 className="text-[#1E1E1E] text-[14px] font-extrabold text-left pl-1">Leave History</h3>
            
            <div className="premium-3d-card p-4.5 flex flex-col justify-between">
                
                {/* Filters Row */}
                <div className="flex flex-col md:flex-row gap-3 items-center justify-between pb-4 border-b border-gray-100">
                    <div className="flex flex-wrap gap-2.5 items-center w-full md:w-auto">
                        {/* Leave Type Dropdown */}
                        <div className="relative">
                            <select
                                value={selectedType}
                                onChange={(e) => {
                                    setSelectedType(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="appearance-none bg-[#F8FAFC] border border-gray-200 text-gray-700 text-[12px] font-bold py-1.5 pl-3 pr-8 rounded-[8px] focus:outline-none focus:border-[#2D79C7] cursor-pointer"
                            >
                                <option>All Leave Types</option>
                                <option>Casual Leave</option>
                                <option>Earned Leave</option>
                                <option>Sick Leave</option>
                                <option>Unpaid Leave</option>
                            </select>
                            <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-2.5 pointer-events-none" />
                        </div>

                        {/* Status Dropdown */}
                        <div className="relative">
                            <select
                                value={selectedStatus}
                                onChange={(e) => {
                                    setSelectedStatus(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="appearance-none bg-[#F8FAFC] border border-gray-200 text-gray-700 text-[12px] font-bold py-1.5 pl-3 pr-8 rounded-[8px] focus:outline-none focus:border-[#2D79C7] cursor-pointer"
                            >
                                <option>All Statuses</option>
                                <option>Approved</option>
                                <option>Pending</option>
                                <option>Rejected</option>
                            </select>
                            <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-2.5 pointer-events-none" />
                        </div>
                    </div>

                    {/* Search Input */}
                    <div className="relative w-full md:w-72">
                        <span className="absolute left-2.5 top-2">
                            <Search className="w-4 h-4 text-gray-400" />
                        </span>
                        <input
                            type="text"
                            placeholder="Search leave note or dates..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-full bg-[#F8FAFC] border border-gray-200 text-gray-700 text-[12px] font-medium py-1.5 pl-8 pr-3 rounded-[8px] focus:outline-none focus:border-[#2D79C7]"
                        />
                    </div>
                </div>

                {/* Table Container with horizontal overflow */}
                <div className="overflow-x-auto w-full mt-3">
                    <table className="w-full border-collapse text-left min-w-[900px] whitespace-nowrap">
                        <thead>
                            <tr className="border-b border-gray-200 bg-[#F8FAFC] text-gray-500 text-[10px] uppercase font-extrabold tracking-wider sticky top-0 z-10 select-none">
                                <th className="py-3 px-4 font-extrabold">Leave Dates</th>
                                <th className="py-3 px-4 font-extrabold">Leave Type</th>
                                <th className="py-3 px-4 font-extrabold">Status</th>
                                <th className="py-3 px-4 font-extrabold">Requested By</th>
                                <th className="py-3 px-4 font-extrabold">Action Taken On</th>
                                <th className="py-3 px-4 font-extrabold">Leave Note</th>
                                <th className="py-3 px-4 font-extrabold">Reject/Cancellation Reason</th>
                                <th className="py-3 px-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-[11.5px] font-semibold text-gray-700">
                            {loadingHistory ? (
                                <tr>
                                    <td colSpan="8" className="py-8 text-center text-gray-400 font-bold select-none">
                                        Loading leave history records...
                                    </td>
                                </tr>
                            ) : paginatedHistory.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="py-8 text-center text-gray-400 font-bold select-none">
                                        No leave history records found.
                                    </td>
                                </tr>
                            ) : (
                                paginatedHistory.map((row, idx) => (
                                    <tr key={row._id || idx} className="hover:bg-[#F8FAFC]/60 transition-colors">
                                        <td className="py-3.5 px-4 font-mono font-bold text-gray-800">
                                            {formatLeaveDates(row.startDate, row.endDate)}
                                        </td>
                                        <td className="py-3.5 px-4">{formatLeaveType(row.leaveType)}</td>
                                        <td className="py-3.5 px-4">{getStatusBadge(row.status)}</td>
                                        <td className="py-3.5 px-4 text-gray-600 font-medium">{requesterName}</td>
                                        <td className="py-3.5 px-4 font-mono font-bold text-gray-600">
                                            {formatActionTakenOn(row)}
                                        </td>
                                        <td className="py-3.5 px-4 max-w-[160px] truncate text-gray-600 font-medium" title={row.reason}>
                                            {row.reason}
                                        </td>
                                        <td className="py-3.5 px-4 max-w-[200px] truncate text-rose-600 font-medium italic" title={row.remarks}>
                                            {row.remarks || "--"}
                                        </td>
                                        <td className="py-3.5 px-4 text-center">
                                            <button type="button" className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100/50 cursor-pointer">
                                                <MoreVertical className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Section */}
                <div className="flex items-center justify-between pt-4 mt-4 border-t border-gray-100 text-[11.5px] font-bold text-gray-500 select-none">
                    <div>
                        Showing <span className="text-gray-800">
                            {filteredHistory.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}-
                            {Math.min(currentPage * itemsPerPage, filteredHistory.length)}
                        </span> of <span className="text-gray-800">{filteredHistory.length}</span>
                    </div>
                    <div className="flex gap-1.5 items-center">
                        <button
                            type="button"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            className="px-2.5 py-1 border border-gray-200 rounded-[6px] bg-[#F8FAFC] hover:bg-white text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                            Previous
                        </button>
                        
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                            <button
                                key={page}
                                type="button"
                                onClick={() => setCurrentPage(page)}
                                className={`w-6 h-6 border rounded-[6px] flex items-center justify-center font-extrabold cursor-pointer ${
                                    currentPage === page
                                        ? "bg-[#2D79C7] border-transparent text-white"
                                        : "bg-[#F8FAFC] border-gray-200 text-gray-600 hover:bg-white hover:text-gray-700"
                                }`}
                            >
                                {page}
                            </button>
                        ))}
                        
                        <button
                            type="button"
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            className="px-2.5 py-1 border border-gray-200 rounded-[6px] bg-[#F8FAFC] hover:bg-white text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                            Next
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

/* ─────────────────────────────────────────────
   LEAVE TAB CONTAINER (INTEGRATED)
───────────────────────────────────────────── */
const LeaveTab = ({
    leaveSummary,
    leaveHistory,
    loadingSummary,
    loadingHistory,
    onRequestLeave
}) => {
    // Dynamically calculate Consumed Unpaid Leaves from the live leaveHistory list
    const unpaidConsumed = leaveHistory
        .filter(l => l.leaveType === "unpaid_leave" && l.status?.toLowerCase() === "approved")
        .reduce((sum, l) => sum + (l.totalDays || 0), 0);

    const balance = leaveSummary?.leaveBalance || {
        sick: { total: 6, used: 0, pending: 0 },
        casual: { total: 8, used: 0, pending: 0 },
        earned: { total: 20, used: 0, pending: 0 }
    };

    // Casual Leave
    const casualTotal = balance.casual?.total ?? 8;
    const casualUsed = balance.casual?.used ?? 0;
    const casualPending = balance.casual?.pending ?? 0;
    const casualAvailable = Math.max(0, casualTotal - casualUsed - casualPending);

    // Sick Leave
    const sickTotal = balance.sick?.total ?? 6;
    const sickUsed = balance.sick?.used ?? 0;
    const sickPending = balance.sick?.pending ?? 0;
    const sickAvailable = Math.max(0, sickTotal - sickUsed - sickPending);

    // Earned Leave
    const earnedTotal = balance.earned?.total ?? 20;
    const earnedUsed = balance.earned?.used ?? 0;
    const earnedPending = balance.earned?.pending ?? 0;
    const earnedAvailable = Math.max(0, earnedTotal - earnedUsed - earnedPending);

    // Setup active type and status filters in history
    const [selectedType, setSelectedType] = useState("All Leave Types");
    const [selectedStatus, setSelectedStatus] = useState("All Statuses");
    const [searchQuery, setSearchQuery] = useState("");

    return (
        <div className="space-y-8 text-left select-none">
            {/* Top: Pending Leave Requests */}
            <PendingLeaveRequestsCard
                pendingRequests={leaveHistory.filter(l => l.status?.toLowerCase() === "pending")}
                loading={loadingHistory}
                onRequestLeave={onRequestLeave}
            />

            {/* Middle: My Leave Stats Section */}
            <div className="space-y-3">
                <h3 className="text-[#1E1E1E] text-[14px] font-extrabold text-left pl-1">My Leave Stats</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <WeeklyPatternCard />
                    <ConsumedLeaveTypesCard leaveSummary={leaveSummary} />
                    <MonthlyStatsCard />
                </div>
            </div>

            {/* Bottom: Leave Balances Section */}
            <div className="space-y-3">
                <h3 className="text-[#1E1E1E] text-[14px] font-extrabold text-left pl-1">Leave Balances</h3>
                
                {loadingSummary ? (
                    <div className="text-center py-10 font-bold text-gray-400">
                        Loading leave balances...
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
                        <LeaveBalanceCard
                            label="Casual Leave"
                            available={casualAvailable}
                            consumed={casualUsed}
                            accrued={casualTotal}
                            annualQuota={casualTotal}
                            color="#38BDF8"
                        />
                        <LeaveBalanceCard
                            label="Earned Leave"
                            available={earnedAvailable}
                            consumed={earnedUsed}
                            accrued={earnedTotal}
                            carryOver={0}
                            annualQuota={earnedTotal}
                            color="#10B981"
                        />
                        <LeaveBalanceCard
                            label="Sick Leave"
                            available={sickAvailable}
                            consumed={sickUsed}
                            accrued={sickTotal}
                            annualQuota={sickTotal}
                            color="#E11D48"
                        />
                        <LeaveBalanceCard
                            label="Unpaid Leave"
                            available="∞"
                            consumed={unpaidConsumed}
                            annualQuota="∞"
                            isInfinity={true}
                            color="#F59E0B"
                        />
                    </div>
                )}

                {/* Other Leave Types status line */}
                <div className="text-[11px] font-bold text-gray-500 text-left mt-6 pl-1 select-none">
                    Other Leave Types Available : <span className="text-[#2D79C7] hover:underline cursor-pointer">Paternity Leave</span>
                </div>
            </div>

            {/* Leave History Table Section */}
            <LeaveHistorySection
                leaveHistory={leaveHistory}
                loadingHistory={loadingHistory}
                selectedType={selectedType}
                setSelectedType={setSelectedType}
                selectedStatus={selectedStatus}
                setSelectedStatus={setSelectedStatus}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
            />
        </div>
    );
};

/* ─────────────────────────────────────────────
   APPLY LEAVE MODAL COMPONENT
───────────────────────────────────────────── */
const ApplyLeaveModal = ({ isOpen, onClose, onSubmitSuccess }) => {
    const [leaveType, setLeaveType] = useState("casual_leave");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [reason, setReason] = useState("");
    const [duration, setDuration] = useState(0);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            const diffTime = end.getTime() - start.getTime();
            if (diffTime >= 0) {
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                setDuration(diffDays);
            } else {
                setDuration(0);
            }
        } else {
            setDuration(0);
        }
    }, [startDate, endDate]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!startDate || !endDate || !reason || duration <= 0) {
            toast.error("Please fill in all fields with valid dates.");
            return;
        }

        setSubmitting(true);
        try {
            const user = JSON.parse(localStorage.getItem("user") || "null");
            const employeeId = user?._id || user?.id;

            const res = await applyLeave({
                employeeId,
                leaveType,
                startDate,
                endDate,
                totalDays: duration,
                reason: reason.trim()
            });

            if (res.data?.success) {
                toast.success(res.data?.message || "Leave requested successfully!");
                onSubmitSuccess();
                onClose();
                // Reset inputs
                setStartDate("");
                setEndDate("");
                setReason("");
            } else {
                toast.error(res.data?.message || "Failed to apply for leave.");
            }
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || "Failed to submit leave request.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 select-none">
            <div className="bg-white border border-[#E5E7EB] rounded-[16px] shadow-xl w-full max-w-md overflow-hidden transform scale-100 transition-all duration-300">
                {/* Modal Header */}
                <div className="bg-white px-6 py-4.5 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-[#1E1E1E] text-[15px] font-extrabold">Apply for Leave</h3>
                    <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 font-extrabold text-[16px] cursor-pointer">
                        ✕
                    </button>
                </div>

                {/* Modal Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4 text-left">
                    {/* Leave Type */}
                    <div className="space-y-1.5">
                        <label className="text-gray-500 text-[10px] font-bold uppercase tracking-wider block">Leave Type</label>
                        <div className="relative">
                            <select
                                value={leaveType}
                                onChange={(e) => setLeaveType(e.target.value)}
                                className="w-full appearance-none bg-[#F8FAFC] border border-gray-200 text-gray-700 text-[12.5px] font-bold py-2 pl-3 pr-8 rounded-[8px] focus:outline-none focus:border-[#2D79C7] cursor-pointer"
                            >
                                <option value="casual_leave">Casual Leave</option>
                                <option value="sick_leave">Sick Leave</option>
                                <option value="earned_leave">Earned Leave</option>
                                <option value="unpaid_leave">Unpaid Leave</option>
                            </select>
                            <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-2.5 pointer-events-none" />
                        </div>
                    </div>

                    {/* Date Inputs Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-gray-500 text-[10px] font-bold uppercase tracking-wider block">Start Date</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full bg-[#F8FAFC] border border-gray-200 text-gray-700 text-[12px] font-medium py-2 px-3 rounded-[8px] focus:outline-none focus:border-[#2D79C7] cursor-pointer"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-gray-500 text-[10px] font-bold uppercase tracking-wider block">End Date</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full bg-[#F8FAFC] border border-gray-200 text-gray-700 text-[12px] font-medium py-2 px-3 rounded-[8px] focus:outline-none focus:border-[#2D79C7] cursor-pointer"
                            />
                        </div>
                    </div>

                    {/* Duration Display */}
                    <div className="space-y-1.5">
                        <label className="text-gray-500 text-[10px] font-bold uppercase tracking-wider block">Duration (Days)</label>
                        <input
                            type="text"
                            readOnly
                            value={duration > 0 ? `${duration} Day${duration !== 1 ? 's' : ''}` : "Select valid dates"}
                            className="w-full bg-[#F3F4F6] border border-gray-200 text-gray-500 text-[12px] font-bold py-2 px-3 rounded-[8px] outline-none"
                        />
                    </div>

                    {/* Reason */}
                    <div className="space-y-1.5">
                        <label className="text-gray-500 text-[10px] font-bold uppercase tracking-wider block">Reason for Leave</label>
                        <textarea
                            rows="3"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Please provide details..."
                            className="w-full bg-[#F8FAFC] border border-gray-200 text-gray-700 text-[12px] font-medium py-2 px-3 rounded-[8px] focus:outline-none focus:border-[#2D79C7] resize-none"
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 justify-end pt-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-[12px] font-bold py-2 px-4 rounded-[8px] transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="bg-[#2D79C7] hover:bg-[#1F5EA8] text-white text-[12px] font-bold py-2 px-5 rounded-[8px] transition-colors shadow-sm cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {submitting ? "Submitting..." : "Submit Request"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

/* ─────────────────────────────────────────────
   PERFORMANCE TAB COMPONENTS
───────────────────────────────────────────── */
const PerformanceEmptyState = ({ heading, subtext, icon: Icon, actionText, onAction }) => {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-center select-none">
            <div className="w-16 h-16 rounded-full bg-slate-50 border border-gray-100 flex items-center justify-center mb-4 shadow-sm">
                <Icon className="w-7 h-7 text-[#2D79C7]" />
            </div>
            <h4 className="text-[#1E1E1E] text-[14.5px] font-bold">{heading}</h4>
            <p className="text-gray-500 text-[12px] font-medium mt-1.5 max-w-sm leading-relaxed">{subtext}</p>
            {actionText && (
                <button
                    type="button"
                    onClick={onAction}
                    className="mt-4 bg-[#5B63B7] hover:bg-[#484E9D] text-white text-[12px] font-bold py-2 px-5 rounded-[8px] transition-all duration-200 cursor-pointer shadow-sm"
                >
                    {actionText}
                </button>
            )}
        </div>
    );
};

const PerformanceContentCard = ({ activeSubTab }) => {
    const subTabContent = {
        "Praises Received": {
            title: "Praises Received",
            description: "This section contains the praises received by me.",
            heading: "No praises received",
            subtext: "Keep giving your best, keep working hard.",
            icon: Trophy
        },
        "Feedback Received": {
            title: "Feedback Received",
            description: "This section contains the constructive feedback received by me.",
            heading: "No feedback received",
            subtext: "Request feedback from everyone",
            icon: MessageSquare,
            actionText: "Request feedback",
            onAction: () => toast.info("Feedback request feature is coming soon!")
        },
        "Praises Given": {
            title: "Praises Given",
            description: "This section contains the praises given by me to other team members.",
            heading: "No praises given yet",
            subtext: "Appreciating colleagues builds a strong team. Share your appreciation today!",
            icon: Heart
        },
        "Feedback Given": {
            title: "Feedback Given",
            description: "This section contains the feedback given by me to other team members.",
            heading: "No feedback given",
            subtext: "Providing clear, helpful feedback helps peers succeed.",
            icon: Send
        }
    };

    const currentContent = subTabContent[activeSubTab];

    return (
        <div className="premium-3d-card p-6 min-h-[360px] flex flex-col justify-start">
            {/* Header */}
            <div className="border-b border-gray-100 pb-4 text-left">
                <h3 className="text-[#1E1E1E] text-[15px] font-extrabold">{currentContent.title}</h3>
                <p className="text-gray-500 text-[11.5px] font-semibold mt-1">{currentContent.description}</p>
            </div>
            
            {/* Empty State */}
            <div className="flex-1 flex items-center justify-center">
                <PerformanceEmptyState
                    heading={currentContent.heading}
                    subtext={currentContent.subtext}
                    icon={currentContent.icon}
                    actionText={currentContent.actionText}
                    onAction={currentContent.onAction}
                />
            </div>
        </div>
    );
};

const PerformanceTab = () => {
    const subTabs = [
        "Praises Received",
        "Feedback Received",
        "Praises Given",
        "Feedback Given"
    ];

    const [activeSubTab, setActiveSubTab] = useState("Praises Received");

    return (
        <div className="space-y-6 text-left select-none">
            {/* Performance sub-navigation tabs */}
            <div className="premium-3d-card-mini p-2">
                <nav className="flex flex-wrap gap-2">
                    {subTabs.map((tab) => {
                        const isActive = activeSubTab === tab;
                        return (
                            <button
                                key={tab}
                                type="button"
                                onClick={() => setActiveSubTab(tab)}
                                className={`px-4 py-2 text-[12.5px] font-bold rounded-[8px] transition-all cursor-pointer ${
                                    isActive
                                        ? "bg-[#2D79C7] text-white shadow-sm"
                                        : "bg-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                                }`}
                            >
                                {tab}
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* Performance Content Card */}
            <PerformanceContentCard activeSubTab={activeSubTab} />
        </div>
    );
};

/* ─────────────────────────────────────────────
   ATTENDANCE LOGS AND REQUESTS COMPONENT
───────────────────────────────────────────── */
const AttendanceLogsAndRequestsHub = () => {
    const [subTab, setSubTab] = useState("Log");
    const [is24Hour, setIs24Hour] = useState(false);
    const [activePeriod, setActivePeriod] = useState("30");
    const [searchQuery, setSearchQuery] = useState("");

    const logsData = [
        {
            date: "Wed, 01 Jul",
            isWeekend: false,
            status: "empty",
            description: "No Time Entries Logged",
            effectiveHours: "-",
            breakTaken: "-",
            grossHours: "-",
            arrival: "No Log",
            logType: "empty"
        },
        {
            date: "Tue, 30 Jun",
            isWeekend: false,
            status: "present",
            effectiveHours: "4h 48m",
            breakTaken: "0h 37m",
            grossHours: "5h 25m",
            arrival: "On Time",
            logType: "warn",
            visualPercent: 53
        },
        {
            date: "Mon, 29 Jun",
            isWeekend: false,
            status: "present",
            effectiveHours: "8h 35m",
            breakTaken: "0h 54m",
            grossHours: "9h 29m",
            arrival: "On Time",
            logType: "success",
            visualPercent: 95
        },
        {
            date: "Sun, 28 Jun",
            isWeekend: true,
            status: "week_off",
            description: "Full day Weekly-off",
            effectiveHours: "-",
            breakTaken: "-",
            grossHours: "-",
            arrival: "Off",
            logType: "empty"
        },
        {
            date: "Sat, 27 Jun",
            isWeekend: true,
            status: "week_off",
            description: "Full day Weekly-off",
            effectiveHours: "-",
            breakTaken: "-",
            grossHours: "-",
            arrival: "Off",
            logType: "empty"
        },
        {
            date: "Fri, 26 Jun",
            isWeekend: false,
            status: "present",
            effectiveHours: "8h 45m",
            breakTaken: "0h 42m",
            grossHours: "9h 27m",
            arrival: "On Time",
            logType: "success",
            visualPercent: 97
        },
        {
            date: "Thu, 25 Jun",
            isWeekend: false,
            status: "wfh",
            effectiveHours: "8h 10m",
            breakTaken: "0h 50m",
            grossHours: "9h 00m",
            arrival: "WFH Approved",
            logType: "success",
            visualPercent: 90
        }
    ];

    const periods = [
        { key: "30", label: "30 DAYS" },
        { key: "jun", label: "JUN" },
        { key: "may", label: "MAY" },
        { key: "apr", label: "APR" },
        { key: "mar", label: "MAR" },
        { key: "feb", label: "FEB" },
        { key: "jan", label: "JAN" }
    ];

    const filteredLogs = logsData.filter(log => 
        log.date.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.arrival.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="bg-white border border-slate-200/80 rounded-[24px] shadow-sm select-none overflow-hidden">
            {/* Header Tabs Navigation */}
            <div className="border-b border-slate-200/80 px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
                <div className="flex items-center gap-2 bg-slate-200/60 p-1 rounded-2xl w-fit">
                    {[
                        { key: "Log", label: "Attendance Log", icon: FileText },
                        { key: "Calendar", label: "Calendar View", icon: Calendar },
                        { key: "Requests", label: "Attendance Requests", icon: ShieldAlert }
                    ].map((tab) => {
                        const Icon = tab.icon;
                        const isActive = subTab === tab.key;
                        return (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => setSubTab(tab.key)}
                                className={`flex items-center gap-2 px-4 py-2 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${
                                    isActive
                                        ? "bg-white text-indigo-700 shadow-sm"
                                        : "text-slate-500 hover:text-slate-900"
                                }`}
                            >
                                <Icon className="w-3.5 h-3.5" />
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Right controls: 24 Hour format toggle & Search */}
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Filter log..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8 pr-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 w-36 sm:w-44"
                        />
                    </div>

                    <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                        <span>24 HOUR FORMAT</span>
                        <button
                            type="button"
                            onClick={() => setIs24Hour(!is24Hour)}
                            className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${
                                is24Hour ? "bg-indigo-600" : "bg-slate-300"
                            }`}
                        >
                            <div className={`w-4 h-4 rounded-full bg-white transition-transform ${is24Hour ? "translate-x-4" : "translate-x-0"}`} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Period Filters */}
            <div className="px-6 py-3 border-b border-slate-100 flex items-center justify-between overflow-x-auto gap-2 bg-white">
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider shrink-0">Timeframe:</span>
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                    {periods.map((p) => {
                        const isActive = activePeriod === p.key;
                        return (
                            <button
                                key={p.key}
                                type="button"
                                onClick={() => setActivePeriod(p.key)}
                                className={`px-3 py-1 text-[11px] font-extrabold rounded-lg transition-all cursor-pointer shrink-0 ${
                                    isActive
                                        ? "bg-[#2D79C7] text-white shadow-2xs"
                                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                }`}
                            >
                                {p.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Attendance Log Table */}
            {subTab === "Log" && (
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-200/80 bg-slate-50/70 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                                <th className="py-3.5 px-6">Date</th>
                                <th className="py-3.5 px-6">Status / Arrival</th>
                                <th className="py-3.5 px-6 text-center w-[25%]">Workday Visual</th>
                                <th className="py-3.5 px-6">Effective Hours</th>
                                <th className="py-3.5 px-6">Break</th>
                                <th className="py-3.5 px-6">Gross Hours</th>
                                <th className="py-3.5 px-6 text-center">Log Audit</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
                            {filteredLogs.map((row, idx) => {
                                if (row.isWeekend) {
                                    return (
                                        <tr key={idx} className="bg-slate-50/40">
                                            <td className="py-3.5 px-6 font-extrabold text-slate-600">{row.date}</td>
                                            <td className="py-3.5 px-6" colSpan={5}>
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                                                    {row.description}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-6 text-center text-slate-400 font-mono text-[11px]">-</td>
                                        </tr>
                                    );
                                }

                                if (row.status === "empty") {
                                    return (
                                        <tr key={idx} className="hover:bg-slate-50/50">
                                            <td className="py-3.5 px-6 font-extrabold text-slate-700">{row.date}</td>
                                            <td className="py-3.5 px-6" colSpan={5}>
                                                <span className="text-slate-400 text-xs italic font-medium">{row.description}</span>
                                            </td>
                                            <td className="py-3.5 px-6 text-center text-slate-400 font-mono text-[11px]">-</td>
                                        </tr>
                                    );
                                }

                                return (
                                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                                        {/* Date */}
                                        <td className="py-3.5 px-6 font-extrabold text-slate-900">{row.date}</td>
                                        
                                        {/* Status & Arrival */}
                                        <td className="py-3.5 px-6">
                                            <div className="flex items-center gap-2">
                                                {row.status === "wfh" ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                                        <Home className="w-3 h-3" />
                                                        <span>WFH</span>
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                                        <span>{row.arrival}</span>
                                                    </span>
                                                )}
                                            </div>
                                        </td>

                                        {/* Workday Progress Visual */}
                                        <td className="py-3.5 px-6 text-center">
                                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden relative">
                                                <div 
                                                    className="bg-gradient-to-r from-teal-400 to-indigo-600 h-full rounded-full" 
                                                    style={{ width: `${row.visualPercent || 80}%` }}
                                                />
                                            </div>
                                        </td>

                                        {/* Effective Hours */}
                                        <td className="py-3.5 px-6 font-mono font-extrabold text-slate-900">
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-2 h-2 rounded-full bg-teal-500" />
                                                <span>{row.effectiveHours}</span>
                                            </div>
                                        </td>

                                        {/* Break Taken */}
                                        <td className="py-3.5 px-6 font-mono text-slate-500 font-semibold">{row.breakTaken}</td>

                                        {/* Gross Hours */}
                                        <td className="py-3.5 px-6 font-mono font-black text-slate-800">{row.grossHours}</td>

                                        {/* Log Audit Icon */}
                                        <td className="py-3.5 px-6 text-center">
                                            <div className="flex justify-center items-center">
                                                {row.logType === "success" ? (
                                                    <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center" title="Verified Log">
                                                        <Check className="w-3 h-3 stroke-[3]" />
                                                    </div>
                                                ) : (
                                                    <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center font-bold text-xs" title="Missing Punch Warning">
                                                        !
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {subTab === "Calendar" && (
                <div className="p-12 text-center text-slate-400 font-semibold text-xs">
                    Calendar View - Monthly visual matrix with shift highlights.
                </div>
            )}

            {subTab === "Requests" && (
                <div className="p-12 text-center text-slate-400 font-semibold text-xs">
                    No pending attendance regularization requests.
                </div>
            )}
        </div>
    );
};

/* ─────────────────────────────────────────────
   PROFILE TAB COMPONENT
───────────────────────────────────────────── */
const ProfileTab = ({ user, refreshUser }) => {
    const fileInputRef = useRef(null);
    const [uploading, setUploading] = useState(false);

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Size validation (5 MB)
        if (file.size > 5 * 1024 * 1024) {
            toast.error("File size exceeds 5 MB limit.");
            return;
        }

        const formData = new FormData();
        formData.append("image", file);

        try {
            setUploading(true);
            const uploadRes = await uploadProfilePicture(formData);
            if (uploadRes.data?.success) {
                const imageUrl = uploadRes.data.url;
                const updateRes = await updateProfilePicture(imageUrl);
                if (updateRes.data?.success) {
                    toast.success("Profile picture updated successfully!");
                    await refreshUser();
                } else {
                    toast.error("Failed to save profile picture in profile.");
                }
            } else {
                toast.error("Failed to upload image to server.");
            }
        } catch (error) {
            console.error("Upload profile error:", error);
            toast.error(error.response?.data?.message || "Failed to upload image.");
        } finally {
            setUploading(false);
        }
    };

    const handleDeletePhoto = async (e) => {
        e.stopPropagation();
        if (!window.confirm("Are you sure you want to delete your profile picture?")) return;

        try {
            setUploading(true);
            const res = await updateProfilePicture("");
            if (res.data?.success) {
                toast.success("Profile picture deleted successfully.");
                await refreshUser();
            } else {
                toast.error("Failed to delete profile picture.");
            }
        } catch (error) {
            console.error("Delete photo error:", error);
            toast.error(error.response?.data?.message || "Failed to delete photo.");
        } finally {
            setUploading(false);
        }
    };

    const triggerFileSelect = () => {
        fileInputRef.current?.click();
    };

    const formatDate = (dateString) => {
        if (!dateString) return "—";
        return new Date(dateString).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    };

    const details = [
        { label: "Employee ID", value: user?.employeeId },
        { label: "Department", value: user?.department },
        { label: "Designation", value: user?.designation },
        { label: "Work Location", value: user?.workLocation },
        { label: "Employment Type", value: user?.employementType?.replace("_", " ") },
        { label: "Joining Date", value: formatDate(user?.joiningDate) }
    ];

    const personal = [
        { label: "Father's Name", value: user?.fatherName || "—" },
        { label: "Date of Birth", value: formatDate(user?.dateOfBirth) },
        { label: "Gender", value: user?.gender || "—" },
        { label: "Blood Group", value: user?.bloodGroup || "—" },
        { label: "Emergency Number", value: user?.emergencyContactNumber || "—" },
        { label: "Present Address", value: user?.presentAddress || "—" },
        { label: "Permanent Address", value: user?.permanentAddress || "—" }
    ];

    const name = user?.fullName || `${user?.firstName} ${user?.lastName || ""}`;

    return (
        <div className="space-y-6 animate-fadeIn">
            {/* Top Row: Left Profile Card and Right Personal Details Card */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-6 items-stretch">
                {/* Left Column Profile Card */}
                <div className="premium-3d-card p-6 text-center flex flex-col items-center justify-start select-none">
                    <div className="relative group inline-block">
                        <div className="relative cursor-pointer" onClick={triggerFileSelect}>
                            <Avatar 
                                src={user?.profilePicture} 
                                name={name} 
                                size="w-28 h-28" 
                                textSize="text-3xl"
                                className="border-4 border-white shadow-md rounded-full object-cover transition-opacity group-hover:opacity-75"
                            />
                            <div className="absolute inset-0 bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all duration-300">
                                <Camera className="w-6 h-6 mb-1" />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Change photo</span>
                            </div>
                            {uploading && (
                                <div className="absolute inset-0 bg-black/60 text-white rounded-full flex flex-col items-center justify-center z-10">
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mb-1" />
                                    <span className="text-[9px] font-bold">Uploading...</span>
                                </div>
                            )}
                        </div>
                        {user?.profilePicture && (
                            <button
                                type="button"
                                onClick={handleDeletePhoto}
                                title="Delete profile picture"
                                className="absolute -top-1 -right-1 bg-white hover:bg-rose-50 text-rose-500 hover:text-rose-600 border border-gray-150 shadow-md rounded-full p-2 transition-colors cursor-pointer z-20 flex items-center justify-center"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        accept="image/jpeg,image/jpg,image/png,image/webp" 
                        className="hidden" 
                    />

                    <h3 className="text-[#1E1E1E] text-base font-black mt-4 leading-tight">{name}</h3>

                    <div className="w-full border-t border-[#F3F4F6] my-5" />

                    <div className="w-full space-y-3.5 text-left text-xs font-semibold text-gray-500">
                        {details.map(({ label, value }) => (
                            <div key={label} className="flex justify-between items-center">
                                <span>{label}</span>
                                <span className="text-gray-800 font-bold capitalize">{value || "—"}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Column: Personal Details Card */}
                <div className="premium-3d-card p-6 flex flex-col justify-start">
                    <h3 className="text-[#1E1E1E] text-sm font-black mb-4 pb-2 border-b border-[#F3F4F6] text-left uppercase tracking-wider text-[#2D79C7] text-[11px]">Personal Details</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-left text-xs font-semibold text-gray-500 flex-1 flex flex-col justify-center">
                        {personal.map(({ label, value }) => (
                            <div key={label} className="flex flex-col gap-1">
                                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">{label}</span>
                                <span className="text-gray-800 font-bold text-sm capitalize">{value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom Row: Leaves Breakdown Preview (Full Width) */}
            <div className="premium-3d-card p-6">
                <h3 className="text-[#1E1E1E] text-sm font-black mb-4 pb-2 border-b border-[#F3F4F6] text-left uppercase tracking-wider text-[#2D79C7] text-[11px]">Leave Balances</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                        { label: "Casual Leave", total: user?.leaveBalance?.casual?.total ?? 8, used: user?.leaveBalance?.casual?.used ?? 0 },
                        { label: "Sick Leave", total: user?.leaveBalance?.sick?.total ?? 6, used: user?.leaveBalance?.sick?.used ?? 0 },
                        { label: "Earned Leave", total: user?.leaveBalance?.earned?.total ?? 20, used: user?.leaveBalance?.earned?.used ?? 0 }
                    ].map(({ label, total, used }) => (
                        <div key={label} className="bg-[#F9FAFB] border border-[#F3F4F6] rounded-[14px] p-4 text-center">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">{label}</span>
                            <span className="text-xl font-black text-[#1E1E1E] mt-2 block">
                                {total - used}<span className="text-xs font-bold text-gray-400">/{total}</span>
                            </span>
                            <span className="text-[9px] text-gray-400 mt-1 block">{used} days used</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

/* ─────────────────────────────────────────────
   Main "Me" Module Component
───────────────────────────────────────────── */
import { useLocation } from "react-router-dom";

const Me = () => {
    const { user, refreshUser } = useAuth();
    const location = useLocation();
    const [activeTab, setActiveTab] = useState("Attendance");

    // Leave Tab Integration States
    const [leaveSummary, setLeaveSummary] = useState(null);
    const [leaveHistory, setLeaveHistory] = useState([]);
    const [loadingSummary, setLoadingSummary] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);

    useEffect(() => {
        if (location.state?.activeTab) {
            setActiveTab(location.state.activeTab);
        }
        if (location.state?.openApplyLeaveModal) {
            setIsApplyModalOpen(true);
        }
    }, [location.state]);

    // Fetch user details
    const employeeId = user?._id || user?.id;

    const fetchLeaveData = async () => {
        if (!employeeId) return;
        
        setLoadingSummary(true);
        setLoadingHistory(true);
        
        try {
            // Fetch balance summary
            const summaryRes = await getLeaveSummary(employeeId);
            if (summaryRes.data?.success) {
                setLeaveSummary(summaryRes.data.leaveSummary);
            }
        } catch (err) {
            console.error("Fetch Leave Summary Error:", err);
        } finally {
            setLoadingSummary(false);
        }

        try {
            // Fetch history list
            const historyRes = await getLeaveHistory(employeeId);
            if (historyRes.data?.success) {
                setLeaveHistory(historyRes.data.leaves || []);
            }
        } catch (err) {
            console.error("Fetch Leave History Error:", err);
        } finally {
            setLoadingHistory(false);
        }
    };

    // Load leave data when user clicks the "Leave" tab
    useEffect(() => {
        if (activeTab === "Leave") {
            fetchLeaveData();
        }
    }, [activeTab, employeeId]);

    const tabs = [
        { key: "Attendance", icon: Clock, label: "Attendance" },
        { key: "Leave", icon: Umbrella, label: "Leave" },
        { key: "Performance", icon: Award, label: "Performance" }
    ];

    return (
        <div className="space-y-6 select-none">
            {/* Top tab sub-navigation bar */}
            <div className="bg-white border border-[#E5E7EB] rounded-[20px] px-6 py-1 flex items-center shadow-[0_1px_4px_rgba(0,0,0,0.02)]">
                <nav className="flex gap-4">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.key;
                        return (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => {
                                    setActiveTab(tab.key);
                                }}
                                className={`flex items-center gap-2 px-3 py-4 text-[13px] font-bold border-b-2 transition-all cursor-pointer relative ${isActive
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

            {/* Tab contents grid containing 3 independent cards side-by-side with custom widths on laptop/desktop */}
            {activeTab === "Attendance" && (
                <div className="space-y-6">
                    <AttendanceHeroBar />
                    <AttendanceKPIStats />
                    <VisualWorkdayTimeline />
                    <AttendanceLogsAndRequestsHub />
                </div>
            )}

            {/* Leave Tab Contents */}
            {activeTab === "Leave" && (
                <LeaveTab
                    leaveSummary={leaveSummary}
                    leaveHistory={leaveHistory}
                    loadingSummary={loadingSummary}
                    loadingHistory={loadingHistory}
                    onRequestLeave={() => setIsApplyModalOpen(true)}
                />
            )}

            {/* Performance Tab Contents */}
            {activeTab === "Performance" && <PerformanceTab />}

            {/* Apply Leave Modal */}
            <ApplyLeaveModal
                isOpen={isApplyModalOpen}
                onClose={() => setIsApplyModalOpen(false)}
                onSubmitSuccess={fetchLeaveData}
            />
        </div>
    );
};

export default Me;
