import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { Avatar } from "../../components/SharedComponents";
import {
    Clock,
    CalendarDays,
    Umbrella,
    CheckCircle2,
    Hourglass,
    Send,
    Cake,
    ArrowUpRight,
    AlertCircle,
    ChevronDown,
    LogIn,
    LogOut,
    Timer,
    UserPlus,
    Plus,
    PartyPopper,
    ClipboardList,
    TrendingUp,
    X,
    ListOrdered,
    Calendar,
    Home,
    FileText,
    Edit3,
    Trash2,
} from "lucide-react";
import { toast } from "sonner";
import userAvatar from "../../assets/user_avatar.png";
import independanceDayImg from "../../assets/independance_day.png";
import newYearImg from "../../assets/new_year.png";
import mahashivratriImg from "../../assets/mahashivratri_day.png";
import republicDayImg from "../../assets/republic_Day.png";
import holiImg from "../../assets/holi.png";
import rakshaBandhanImg from "../../assets/raksha_bandhan.png";
import dussehraImg from "../../assets/Dusshhera.png";
import diwaliImg from "../../assets/diwali.png";
import guruNanakImg from "../../assets/guru_nanak_Dev_ji_jayanti.png";
import christmasImg from "../../assets/christmas.png";
import janamashtamiImg from "../../assets/janamashtami.png";
import gandhiJayantiImg from "../../assets/gandhi_jayanti.png";
import { useAuth } from "../../context/AuthContext";
import HolidaysModal from "../../components/HolidaysModal";
import ConfirmDialog from "../../components/ConfirmDialog";
import {
    getDashboardData,
    clockIn,
    clockOut,
    getAwayToday,
    getPeopleEvents,
    createPoll,
    getPolls,
    voteInPoll,
    createPosts,
    getUpcomingHolidays,
    createHoliday,
    updateHoliday,
    deleteHoliday
} from "../../services/dashboard.service";



/* ─────────────────────────────────────────────
   Section Card wrapper
───────────────────────────────────────────── */
const Card = ({ children, className = "" }) => (
    <div
        className={`
            bg-white
            rounded-[28px]
            border border-slate-100
            shadow-[0_8px_20px_rgba(15,23,42,0.05),0_25px_50px_rgba(15,23,42,0.08),0_50px_100px_rgba(59,130,246,0.08)]
            hover:-translate-y-1
            hover:shadow-[0_12px_30px_rgba(15,23,42,0.08),0_35px_70px_rgba(15,23,42,0.12),0_70px_140px_rgba(59,130,246,0.12)]
            transition-all
            duration-300
            ${className}
        `}
    >
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
        {action && (
            <div className="text-gray-400 text-xs font-semibold">
                {action}
            </div>
        )}
    </div>
);

/* ─────────────────────────────────────────────
   HOLIDAYS CARD (REUSABLE COMPONENTS)
───────────────────────────────────────────── */
const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const CreateHolidayButton = ({ onClick }) => {
    return (
        <button
            onClick={onClick}
            className="flex items-center gap-1 bg-[#2D79C7]/10 hover:bg-[#2D79C7]/20 text-[#2D79C7] text-xs font-bold px-3 py-1.5 rounded-full border border-[#2D79C7]/25 shadow-sm transition-all duration-200 cursor-pointer active:scale-95 shrink-0"
        >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Create Holiday</span>
        </button>
    );
};

const CreateHolidayModal = ({ isOpen, onClose, onSuccess }) => {
    const [title, setTitle] = useState("");
    const [date, setDate] = useState("");
    const [day, setDay] = useState("");
    const [type, setType] = useState("public_holiday");
    const [description, setDescription] = useState("");
    const [submitting, setSubmitting] = useState(false);

    // Auto-calculate day when date changes
    useEffect(() => {
        if (date) {
            const daysOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
            const selectedDay = daysOfWeek[new Date(date).getDay()];
            setDay(selectedDay);
        } else {
            setDay("");
        }
    }, [date]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim() || !date) {
            toast.error("Title and Date are required!");
            return;
        }

        try {
            setSubmitting(true);
            const response = await createHoliday({
                title: title.trim(),
                date,
                day,
                type,
                description: description.trim()
            });

            if (response.data && response.data.success) {
                toast.success("Holiday created successfully.");
                onSuccess(); // Triggers refresh
                onClose();
                // Clear fields
                setTitle("");
                setDate("");
                setDay("");
                setType("public_holiday");
                setDescription("");
            } else {
                toast.error(response.data?.message || "Failed to create holiday.");
            }
        } catch (err) {
            console.error("Create holiday error:", err);
            toast.error(err.response?.data?.message || err.message || "Failed to create holiday.");
        } finally {
            setSubmitting(false);
        }
    };

    return ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black/55 backdrop-blur-sm z-[999] flex items-center justify-center p-4 select-none animate-fadeIn">
            <div className="bg-white rounded-[20px] border border-gray-100 shadow-2xl max-w-md w-full overflow-hidden transform transition-all duration-300">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-[#F3F4F6]">
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-[10px] bg-blue-50 flex items-center justify-center border border-blue-100/50">
                            <CalendarDays className="w-3.5 h-3.5 text-[#2D79C7]" strokeWidth={2.5} />
                        </div>
                        <h3 className="text-[#1E1E1E] text-[14px] font-bold tracking-wide">Create New Holiday</h3>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                    >
                        <X className="w-4.5 h-4.5" />
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">
                            Holiday Title *
                        </label>
                        <input
                            type="text"
                            required
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. Independence Day"
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-[14px] text-sm text-[#1E1E1E] placeholder-gray-400 focus:outline-none focus:bg-white focus:border-[#2D79C7] focus:ring-1 focus:ring-[#2D79C7] transition-all duration-200 shadow-inner"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">
                                Holiday Date *
                            </label>
                            <input
                                type="date"
                                required
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-[14px] text-sm text-[#1E1E1E] focus:outline-none focus:bg-white focus:border-[#2D79C7] focus:ring-1 focus:ring-[#2D79C7] transition-all duration-200 shadow-inner cursor-pointer"
                            />
                        </div>
                        <div>
                            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">
                                Day of Week
                            </label>
                            <input
                                type="text"
                                readOnly
                                value={day}
                                placeholder="Auto-calculated"
                                className="w-full px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-[14px] text-sm text-gray-500 focus:outline-none cursor-not-allowed"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">
                            Holiday Type
                        </label>
                        <select
                            value={type}
                            onChange={(e) => setType(e.target.value)}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-[14px] text-sm text-[#1E1E1E] focus:outline-none focus:bg-white focus:border-[#2D79C7] focus:ring-1 focus:ring-[#2D79C7] transition-all duration-200 cursor-pointer"
                        >
                            <option value="public_holiday">Public Holiday</option>
                            <option value="optional_holiday">Optional Holiday</option>
                            <option value="company_holiday">Company Holiday</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">
                            Description
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Add brief description..."
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-[14px] text-sm text-[#1E1E1E] placeholder-gray-400 focus:outline-none focus:bg-white focus:border-[#2D79C7] focus:ring-1 focus:ring-[#2D79C7] transition-all duration-200 h-20 resize-none shadow-inner"
                        />
                    </div>

                    {/* Footer Buttons */}
                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#F3F4F6] mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 text-xs font-bold text-gray-500 hover:bg-gray-50 border border-gray-200 rounded-[12px] transition-all cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="bg-[#2D79C7] hover:bg-[#1F5EA8] disabled:bg-gray-400 text-white font-semibold text-xs px-5 py-2.5 rounded-[12px] transition-all shadow-sm cursor-pointer"
                        >
                            {submitting ? "Creating..." : "Create Holiday"}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

const getHolidayEmoji = (title = "") => {
    const t = title.toLowerCase();
    if (t.includes("nanak") || t.includes("gurpurab")) return "🪯";
    if (t.includes("dussehra") || t.includes("dusshhera") || t.includes("dasara") || t.includes("vijayadashami")) return "🏹";
    if (t.includes("shivratri") || t.includes("mahashivratri")) return "🔱";
    if (t.includes("janamashtami") || t.includes("janmashtami") || t.includes("krishna")) return "🪶";
    if (t.includes("christmas")) return "🎄";
    if (t.includes("new year")) return "🎆";
    if (t.includes("diwali") || t.includes("deepavali")) return "🪔";
    if (t.includes("eid")) return "🌙";
    if (t.includes("holi")) return "🎨";
    if (t.includes("independence") || t.includes("republic")) return "🇮🇳";
    if (t.includes("raksha") || t.includes("rakhi")) return "🎋";
    if (t.includes("gandhi")) return "🕊️";
    if (t.includes("good friday") || t.includes("easter")) return "✝️";
    return "🌴";
};

const getHolidayImage = (h = {}) => {
    if (h.imageUrl) return h.imageUrl;
    if (h.image) return h.image;

    const title = (h.title || "").toLowerCase();

    if (title.includes("janamashtami") || title.includes("janmashtami") || title.includes("krishna")) return janamashtamiImg;
    if (title.includes("nanak") || title.includes("gurpurab") || title.includes("guru nanak")) return guruNanakImg;
    if (title.includes("diwali") || title.includes("deepavali")) return diwaliImg;
    if (title.includes("dussehra") || title.includes("dusshhera") || title.includes("dasara") || title.includes("vijayadashami")) return dussehraImg;
    if (title.includes("shivratri") || title.includes("mahashivratri")) return mahashivratriImg;
    if (title.includes("republic")) return republicDayImg;
    if (title.includes("independence") || title.includes("independance")) return independanceDayImg;
    if (title.includes("new year") || title.includes("newyear")) return newYearImg;
    if (title.includes("christmas") || title.includes("xmas")) return christmasImg;
    if (title.includes("diwali") || title.includes("deepavali")) return "https://images.unsplash.com/photo-1605888981261-26c3fa7e4663?auto=format&fit=crop&w=600&q=80";
    if (title.includes("holi")) return holiImg;
    if (title.includes("eid")) return "https://images.unsplash.com/photo-1564769625905-50e93615e769?auto=format&fit=crop&w=600&q=80";
    if (title.includes("raksha") || title.includes("rakhi") || title.includes("bandhan")) return rakshaBandhanImg;
    if (title.includes("gandhi")) return gandhiJayantiImg;
    if (title.includes("friday") || title.includes("easter")) return "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=80";

    return "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=600&q=80";
};

const HolidayList = ({ holidays, canEdit, onEdit, onDelete }) => {
    const displayType = (type) => {
        if (type === "public_holiday") return "Public Holiday";
        if (type === "company_holiday") return "Company Holiday";
        if (type === "optional_holiday") return "Optional Holiday";
        return type || "Public Holiday";
    };

    if (holidays.length === 0) {
        return (
            <div className="py-8 text-center text-gray-400 text-xs bg-slate-50 border border-dashed border-gray-200 rounded-[16px] flex items-center justify-center gap-2 select-none">
                <span>🌴</span> No upcoming holidays scheduled
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {holidays.slice(0, 2).map((h, idx) => {
                const d = h.date ? new Date(h.date) : new Date();
                const dayNum = d.getDate().toString().padStart(2, "0");
                const month = MONTH_ABBR[d.getMonth()];
                const formattedType = displayType(h.type);
                const bannerImg = getHolidayImage(h);
                const isNextImmediate = idx === 0;

                return (
                    <div
                        key={h._id || idx}
                        className={`group relative overflow-hidden rounded-[20px] transition-all duration-300 cursor-default ${
                            isNextImmediate
                                ? "ring-2 ring-[#2D79C7]/20 shadow-[0_4px_20px_rgba(45,121,199,0.18)]"
                                : "shadow-[0_4px_16px_rgba(15,23,42,0.10)] hover:shadow-[0_8px_28px_rgba(15,23,42,0.16)]"
                        }`}
                        style={{ height: "152px" }}
                    >
                        {/* Full-bleed image — object-contain so nothing is cropped */}
                        <img
                            src={bannerImg}
                            alt={h.title}
                            className="absolute inset-0 w-full h-full object-contain group-hover:scale-105 transition-transform duration-700"
                            style={{ background: "#0f172a" }}
                            onError={(e) => { e.target.src = independanceDayImg; }}
                        />

                        {/* Subtle gradient — only at bottom so image breathes */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />

                        {/* Calendar Date Tile — top left */}
                        <div className="absolute top-3 left-3 w-10 rounded-[10px] bg-white/90 backdrop-blur-md shadow-md overflow-hidden text-center z-10">
                            <div className="bg-[#2D79C7] text-white text-[8px] font-black uppercase tracking-wider py-0.5">
                                {month}
                            </div>
                            <div className="py-0.5 text-[#1E1E1E] text-[13px] font-black leading-tight">
                                {dayNum}
                            </div>
                        </div>

                        {/* Type badge — top right (hidden when canEdit actions appear) */}
                        {!canEdit && (
                            <div className="absolute top-3 right-3 z-10">
                                <span className="text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-white/80 backdrop-blur-md text-[#1E1E1E] shadow-sm">
                                    {formattedType}
                                </span>
                            </div>
                        )}

                        {/* HR Edit / Delete — top right, visible on hover */}
                        {canEdit && (
                            <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <button
                                    onClick={() => onEdit(h)}
                                    title="Edit holiday"
                                    className="p-1.5 rounded-lg bg-white/85 backdrop-blur-md text-gray-600 hover:text-[#2D79C7] shadow-sm transition-colors cursor-pointer"
                                >
                                    <Edit3 className="w-3 h-3" />
                                </button>
                                <button
                                    onClick={() => onDelete(h)}
                                    title="Delete holiday"
                                    className="p-1.5 rounded-lg bg-white/85 backdrop-blur-md text-gray-600 hover:text-rose-600 shadow-sm transition-colors cursor-pointer"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </div>
                        )}

                        {/* Bottom — title + day name overlaid on image */}
                        <div className="absolute bottom-0 left-0 right-0 px-3.5 pb-3 pt-6 z-10">
                            <h4 className="text-white text-[14px] font-extrabold leading-tight drop-shadow-md truncate">
                                {h.title || "Holiday"}
                            </h4>
                            <p className="text-white/75 text-[10.5px] font-semibold mt-0.5 flex items-center gap-1">
                                <Calendar className="w-3 h-3 shrink-0" />
                                {h.day || "Scheduled Day"}
                            </p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const ViewAllHolidaysButton = ({ onClick }) => {
    return (
        <button
            onClick={onClick}
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs font-bold rounded-[10px] transition-all border border-gray-200 cursor-pointer select-none"
        >
            <CalendarDays className="w-3.5 h-3.5 text-gray-500" />
            <span>View All</span>
        </button>
    );
};

/* Edit Holiday Modal */
const EditHolidayModal = ({ holiday, onClose, onSuccess }) => {
    const [title, setTitle] = useState(holiday.title || "");
    const [date, setDate] = useState(holiday.date ? holiday.date.split("T")[0] : "");
    const [day, setDay] = useState(holiday.day || "");
    const [type, setType] = useState(holiday.type || "public_holiday");
    const [description, setDescription] = useState(holiday.description || "");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (date) {
            const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
            setDay(days[new Date(date).getDay()]);
        }
    }, [date]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim() || !date) { toast.error("Title and Date are required."); return; }
        try {
            setSubmitting(true);
            const res = await updateHoliday(holiday._id, { title: title.trim(), date, day, type, description: description.trim() });
            if (res.data?.success) {
                toast.success("Holiday updated successfully.");
                onSuccess();
                onClose();
            } else {
                toast.error(res.data?.message || "Failed to update holiday.");
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to update holiday.");
        } finally {
            setSubmitting(false);
        }
    };

    return ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black/55 backdrop-blur-sm z-[999] flex items-center justify-center p-4 select-none">
            <div className="bg-white rounded-[20px] border border-gray-100 shadow-2xl max-w-md w-full overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-[#F3F4F6]">
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-[10px] bg-amber-50 flex items-center justify-center border border-amber-100">
                            <Edit3 className="w-3.5 h-3.5 text-amber-600" strokeWidth={2.5} />
                        </div>
                        <h3 className="text-[#1E1E1E] text-[14px] font-bold tracking-wide">Edit Holiday</h3>
                    </div>
                    <button type="button" onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
                        <X className="w-4.5 h-4.5" />
                    </button>
                </div>
                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Holiday Title *</label>
                        <input type="text" required value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Independence Day" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-[14px] text-sm text-[#1E1E1E] placeholder-gray-400 focus:outline-none focus:bg-white focus:border-[#2D79C7] focus:ring-1 focus:ring-[#2D79C7] transition-all shadow-inner" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Date *</label>
                            <input type="date" required value={date} onChange={e => setDate(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-[14px] text-sm focus:outline-none focus:bg-white focus:border-[#2D79C7] focus:ring-1 focus:ring-[#2D79C7] transition-all cursor-pointer" />
                        </div>
                        <div>
                            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Day</label>
                            <input type="text" readOnly value={day} placeholder="Auto-calculated" className="w-full px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-[14px] text-sm text-gray-500 cursor-not-allowed" />
                        </div>
                    </div>
                    <div>
                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Type</label>
                        <select value={type} onChange={e => setType(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-[14px] text-sm focus:outline-none focus:bg-white focus:border-[#2D79C7] transition-all cursor-pointer">
                            <option value="public_holiday">Public Holiday</option>
                            <option value="optional_holiday">Optional Holiday</option>
                            <option value="company_holiday">Company Holiday</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Description</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Add brief description..." className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-[14px] text-sm placeholder-gray-400 focus:outline-none focus:bg-white focus:border-[#2D79C7] transition-all h-20 resize-none shadow-inner" />
                    </div>
                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#F3F4F6] mt-4">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 text-xs font-bold text-gray-500 hover:bg-gray-50 border border-gray-200 rounded-[12px] transition-all cursor-pointer">Cancel</button>
                        <button type="submit" disabled={submitting} className="bg-[#2D79C7] hover:bg-[#1F5EA8] disabled:bg-gray-400 text-white font-semibold text-xs px-5 py-2.5 rounded-[12px] transition-all shadow-sm cursor-pointer">
                            {submitting ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

const HolidaySection = ({ initialHolidays }) => {
    const { can } = useAuth();
    const [holidays, setHolidays] = useState(initialHolidays || []);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isViewAllOpen, setIsViewAllOpen] = useState(false);
    const [editingHoliday, setEditingHoliday] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deletingId, setDeletingId] = useState(null);

    useEffect(() => {
        if (initialHolidays) setHolidays(initialHolidays);
    }, [initialHolidays]);

    const refreshHolidays = async () => {
        try {
            const res = await getUpcomingHolidays();
            if (res.data?.success) setHolidays(res.data.holidays || []);
        } catch (err) {
            console.error("Failed to refresh holidays:", err);
        }
    };

    const handleDeleteConfirm = async () => {
        if (!deleteTarget) return;
        setDeletingId(deleteTarget._id);
        try {
            const res = await deleteHoliday(deleteTarget._id);
            if (res.data?.success) {
                toast.success("Holiday deleted.");
                refreshHolidays();
            } else {
                toast.error(res.data?.message || "Failed to delete.");
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to delete holiday.");
        } finally {
            setDeletingId(null);
            setDeleteTarget(null);
        }
    };

    const canEdit = can("edit:holiday");

    return (
        <Card>
            <CardHeader
                icon={CalendarDays}
                title="Upcoming Holidays"
                action={
                    <div className="flex items-center gap-2">
                        <ViewAllHolidaysButton onClick={() => setIsViewAllOpen(true)} />
                        {can("create:holiday") && <CreateHolidayButton onClick={() => setIsCreateOpen(true)} />}
                    </div>
                }
            />
            <div className="px-5 pb-5 pt-3 relative">
                <HolidayList
                    holidays={holidays}
                    canEdit={canEdit}
                    onEdit={setEditingHoliday}
                    onDelete={setDeleteTarget}
                />
            </div>

            {can("create:holiday") && (
                <CreateHolidayModal
                    isOpen={isCreateOpen}
                    onClose={() => setIsCreateOpen(false)}
                    onSuccess={refreshHolidays}
                />
            )}

            {editingHoliday && (
                <EditHolidayModal
                    holiday={editingHoliday}
                    onClose={() => setEditingHoliday(null)}
                    onSuccess={() => { refreshHolidays(); setEditingHoliday(null); }}
                />
            )}

            <ConfirmDialog
                isOpen={!!deleteTarget}
                title="Delete Holiday"
                message={`Are you sure you want to delete "${deleteTarget?.title}"? This cannot be undone.`}
                confirmLabel="Delete"
                variant="danger"
                loading={!!deletingId}
                onConfirm={handleDeleteConfirm}
                onCancel={() => setDeleteTarget(null)}
            />

            <HolidaysModal
                isOpen={isViewAllOpen}
                onClose={() => setIsViewAllOpen(false)}
            />
        </Card>
    );
};

/* ─────────────────────────────────────────────
   ATTENDANCE LOGS MODAL
───────────────────────────────────────────── */
const AttendanceLogsModal = ({ onClose, dateStr, logs, totalWorkMinutes, totalSessions }) => {
    const fmtDur = (m) => {
        const h = Math.floor(m / 60);
        const mins = m % 60;
        return `${h.toString().padStart(2, "0")}h ${mins.toString().padStart(2, "0")}m`;
    };

    const backdropRef = useRef(null);
    const handleBackdrop = (e) => { if (e.target === backdropRef.current) onClose(); };

    useEffect(() => {
        const handler = (e) => { if (e.key === "Escape") onClose(); };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [onClose]);

    return (
        <div
            ref={backdropRef}
            onClick={handleBackdrop}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(15,23,42,0.55)", backdropFilter: "blur(6px)" }}
        >
            <div
                className="bg-white w-full max-w-md rounded-[24px] shadow-2xl overflow-hidden flex flex-col"
                style={{ maxHeight: "90vh", animation: "modalIn 0.22s cubic-bezier(0.34,1.56,0.64,1) forwards" }}
            >
                <style>{`
                    @keyframes modalIn {
                        from { opacity: 0; transform: scale(0.94) translateY(16px); }
                        to   { opacity: 1; transform: scale(1) translateY(0); }
                    }
                    .logs-scroll::-webkit-scrollbar { width: 4px; }
                    .logs-scroll::-webkit-scrollbar-track { background: transparent; }
                    .logs-scroll::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 99px; }
                `}</style>

                <div
                    className="px-6 py-5 flex items-center justify-between shrink-0"
                    style={{ background: "linear-gradient(125deg, #2D79C7 0%, #3A88D8 45%, #1F5EA8 100%)" }}
                >
                    <div>
                        <p className="text-white/65 text-[11px] font-semibold uppercase tracking-widest">Attendance Logs</p>
                        <h3 className="text-white text-[17px] font-extrabold tracking-tight mt-0.5">{dateStr}</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors duration-200"
                    >
                        <X className="w-4 h-4 text-white" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto logs-scroll px-6 py-5">
                    <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-4">Activity Timeline</p>
                    <div className="relative">
                        <div className="absolute left-[19px] top-2 bottom-2 w-px bg-gradient-to-b from-[#2D79C7]/30 via-[#E5E7EB] to-[#2D79C7]/10" />

                        <div className="space-y-0">
                            {logs.map((log, idx) => {
                                const isIn = log.type === "in";
                                const isLast = idx === logs.length - 1;
                                return (
                                    <div key={idx} className="flex items-start gap-4 relative">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 z-10 border-2 border-white shadow-md ${isIn ? "bg-emerald-500" : "bg-rose-400"}`}>
                                            {isIn ? <LogIn className="w-4 h-4 text-white" /> : <LogOut className="w-4 h-4 text-white" />}
                                        </div>

                                        <div className={`flex-1 pb-5 ${isLast ? "pb-0" : ""}`}>
                                            <div className={`rounded-[14px] px-4 py-3 border ${isIn ? "bg-emerald-50 border-emerald-100" : "bg-rose-50 border-rose-100"}`}>
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className={`text-[13px] font-bold ${isIn ? "text-emerald-700" : "text-rose-600"}`}>
                                                            {isIn ? "Clock In" : "Clock Out"}
                                                        </p>
                                                        <p className="text-gray-500 text-[11px] mt-0.5">{log.note}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[#1E1E1E] text-[15px] font-extrabold tracking-tight">{log.time}</p>
                                                        {log.duration && (
                                                            <p className="text-gray-400 text-[10px] mt-0.5 font-medium">Session: {log.duration}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-[#F3F4F6] bg-[#F8FAFC] shrink-0">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white border border-[#E5E7EB] rounded-[12px] p-3 text-center">
                            <p className="text-[#2D79C7] text-[15px] font-extrabold font-mono">{fmtDur(totalWorkMinutes)}</p>
                            <p className="text-gray-400 text-[9px] font-bold uppercase tracking-wider mt-1">Total Work</p>
                        </div>
                        <div className="bg-white border border-[#E5E7EB] rounded-[12px] p-3 text-center">
                            <p className="text-[#1E1E1E] text-[15px] font-extrabold">{totalSessions}</p>
                            <p className="text-gray-400 text-[9px] font-bold uppercase tracking-wider mt-1">Sessions</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

/* ─────────────────────────────────────────────
   TIME TODAY CARD
───────────────────────────────────────────── */
const TimeTodayCard = ({ attendance, onClockIn, onClockOut }) => {
    const [now, setNow] = useState(new Date());
    const [elapsedSec, setElapsedSec] = useState(0);
    const [otherOpen, setOtherOpen] = useState(false);
    const [logsOpen, setLogsOpen] = useState(false);
    const [wfhModalOpen, setWfhModalOpen] = useState(false);
    const [wfhMessage, setWfhMessage] = useState("");
    const [wfhSubmitting, setWfhSubmitting] = useState(false);
    const dropRef = useRef(null);

    const logs = attendance?.logs || [];
    const checkedIn = logs.length > 0 && logs[logs.length - 1].action === "clock_in";

    const fmtTime = (date) => {
        if (!date) return "—";
        return new Date(date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    };

    const checkInTime = attendance?.firstClockIn ? fmtTime(attendance.firstClockIn) : "—";
    const checkOutTime = attendance?.lastClockOut ? fmtTime(attendance.lastClockOut) : "—";

    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    useEffect(() => {
        let interval;
        const updateElapsed = () => {
            let totalSec = (attendance?.totalWorkMinutes || 0) * 60;
            if (checkedIn && logs.length > 0) {
                const lastIn = new Date(logs[logs.length - 1].timestamp);
                const diffSec = Math.floor((new Date() - lastIn) / 1000);
                if (diffSec > 0) {
                    totalSec += diffSec;
                }
            }
            setElapsedSec(totalSec);
        };
        updateElapsed();
        if (checkedIn) {
            interval = setInterval(updateElapsed, 1000);
        }
        return () => clearInterval(interval);
    }, [attendance, checkedIn, logs]);

    useEffect(() => {
        const handler = (e) => {
            if (dropRef.current && !dropRef.current.contains(e.target)) setOtherOpen(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const fmt2 = (n) => n.toString().padStart(2, "0");
    const fmtDuration = (s) => `${fmt2(Math.floor(s / 3600))}h ${fmt2(Math.floor((s % 3600) / 60))}m ${fmt2(s % 60)}s`;

    const fmtClock = (d) => {
        let h = d.getHours();
        const ampm = h >= 12 ? "PM" : "AM";
        h = h % 12 || 12;
        return { hm: `${fmt2(h)}:${fmt2(d.getMinutes())}`, sec: fmt2(d.getSeconds()), ampm };
    };
    const { hm, sec, ampm } = fmtClock(now);
    const dateStr = now.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

    const handleClockToggle = () => {
        if (checkedIn) {
            onClockOut();
        } else {
            onClockIn("Office");
        }
    };

    const attendanceLogs = logs.map((log, idx) => {
        const isIn = log.action === "clock_in";
        return {
            type: isIn ? "in" : "out",
            time: fmtTime(log.timestamp),
            note: isIn ? "Clocked In" : "Clocked Out",
            duration: !isIn && idx > 0 && logs[idx - 1].action === "clock_in"
                ? `${Math.round((new Date(log.timestamp) - new Date(logs[idx - 1].timestamp)) / (1000 * 60))} mins`
                : null
        };
    });

    return (
        <>
            {logsOpen && (
                <AttendanceLogsModal
                    onClose={() => setLogsOpen(false)}
                    dateStr={dateStr}
                    logs={attendanceLogs}
                    totalWorkMinutes={attendance?.totalWorkMinutes || 0}
                    totalSessions={attendance?.totalSessions || 0}
                />
            )}

            {/* WFH Clock-In Modal */}
            {wfhModalOpen && (
                <div className="fixed inset-0 bg-black/55 backdrop-blur-sm z-[999] flex items-center justify-center p-4 select-none animate-fadeIn">
                    <div className="bg-white rounded-[20px] border border-gray-100 shadow-2xl max-w-md w-full overflow-hidden transform transition-all duration-300">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-5 border-b border-[#F3F4F6]">
                            <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-[10px] bg-blue-50 flex items-center justify-center border border-blue-100/50">
                                    <Home className="w-3.5 h-3.5 text-[#2D79C7]" strokeWidth={2.5} />
                                </div>
                                <h3 className="text-[#1E1E1E] text-[14px] font-bold tracking-wide">Work From Home — Clock In</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setWfhModalOpen(false);
                                    setWfhMessage("");
                                }}
                                className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                            >
                                <X className="w-4.5 h-4.5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-4">
                            <div className="flex items-start gap-3 bg-amber-50/70 border border-amber-100 rounded-[12px] p-3.5">
                                <FileText className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                <p className="text-amber-800 text-[11.5px] font-medium leading-relaxed">
                                    WFH task description is <span className="font-bold">mandatory</span>. Please describe your planned tasks for today so HR and your manager can track your work.
                                </p>
                            </div>

                            <div>
                                <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">
                                    Today's Task Plan *
                                </label>
                                <textarea
                                    value={wfhMessage}
                                    onChange={(e) => setWfhMessage(e.target.value)}
                                    placeholder="e.g. Working on dashboard API integration, fixing attendance module bugs, attending team standup at 10 AM..."
                                    rows={4}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-[14px] text-sm text-[#1E1E1E] placeholder-gray-400 focus:outline-none focus:bg-white focus:border-[#2D79C7] focus:ring-1 focus:ring-[#2D79C7] transition-all duration-200 shadow-inner resize-none"
                                />
                                <div className="flex items-center justify-between mt-1.5">
                                    <span className="text-gray-400 text-[10px] font-medium">
                                        {wfhMessage.trim().length === 0 ? "Required field" : `${wfhMessage.trim().length} characters`}
                                    </span>
                                    {wfhMessage.trim().length > 0 && wfhMessage.trim().length < 10 && (
                                        <span className="text-amber-600 text-[10px] font-bold">Minimum 10 characters</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#F3F4F6] bg-[#FAFBFC]">
                            <button
                                type="button"
                                onClick={() => {
                                    setWfhModalOpen(false);
                                    setWfhMessage("");
                                }}
                                className="px-4 py-2 text-[12px] font-bold text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-[10px] transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={wfhMessage.trim().length < 10 || wfhSubmitting}
                                onClick={async () => {
                                    try {
                                        setWfhSubmitting(true);
                                        await onClockIn("Work From Home", wfhMessage.trim());
                                        setWfhModalOpen(false);
                                        setWfhMessage("");
                                    } catch (err) {
                                        // error handled by parent
                                    } finally {
                                        setWfhSubmitting(false);
                                    }
                                }}
                                className={`px-5 py-2 text-[12px] font-bold rounded-[10px] transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${wfhMessage.trim().length < 10 || wfhSubmitting
                                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                                    : "bg-[#2D79C7] hover:bg-[#1F5EA8] text-white shadow-sm active:scale-95"
                                    }`}
                            >
                                {wfhSubmitting ? (
                                    <>
                                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Clocking In...
                                    </>
                                ) : (
                                    <>
                                        <LogIn className="w-3.5 h-3.5" />
                                        Clock In — WFH
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <Card>
                <CardHeader icon={Clock} title="Time Today" />
                <div className="px-5 pb-5 pt-4">
                    <div
                        className="rounded-[16px] px-5 py-4 mb-4 relative"
                        style={{ background: "linear-gradient(125deg, #2D79C7 0%, #3A88D8 45%, #1F5EA8 100%)" }}
                    >
                        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[16px]">
                            <div className="absolute -top-6 -right-6 w-28 h-28 bg-white/5 rounded-full" />
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 relative z-10">
                            <div>
                                <span className="text-white/60 text-[10px] font-bold uppercase tracking-widest">
                                    Current Time
                                </span>
                                <div className="flex items-baseline mt-0.5">
                                    <span className="text-white text-[32px] font-extrabold tracking-tight leading-none">{hm}</span>
                                    <span className="text-white/60 text-xl font-semibold">:{sec}</span>
                                    <span className="text-white/80 text-base font-bold ml-1.5">{ampm}</span>
                                </div>
                                <span className="text-white/55 text-[11px] mt-1">{dateStr}</span>
                            </div>

                            <div className="flex items-center gap-2 relative" ref={dropRef}>
                                <button
                                    onClick={handleClockToggle}
                                    className="bg-white text-[#1F5EA8] text-[12px] font-bold px-4 py-2.5 rounded-[10px] shadow-sm hover:bg-white/90 active:scale-95 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
                                >
                                    {checkedIn ? <LogOut className="w-3.5 h-3.5" /> : <LogIn className="w-3.5 h-3.5" />}
                                    {checkedIn ? "Clock Out" : "Clock In"}
                                </button>
                                <button
                                    onClick={() => setOtherOpen((p) => !p)}
                                    className="bg-white/15 text-white border border-white/25 text-[12px] font-bold px-3.5 py-2.5 rounded-[10px] hover:bg-white/25 active:scale-95 transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                                >
                                    Other <ChevronDown className={`w-3.5 h-3.5 transition-transform ${otherOpen ? "rotate-180" : ""}`} />
                                </button>
                                {otherOpen && (
                                    <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-[#E5E7EB] rounded-[16px] shadow-xl py-1.5 z-40 overflow-hidden">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setOtherOpen(false);
                                                setWfhModalOpen(true);
                                            }}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 text-[12px] font-medium text-gray-700 hover:bg-[#F0F7FF] hover:text-[#2D79C7] transition-colors text-left cursor-pointer"
                                        >
                                            <Home className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                            Work From Home
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setOtherOpen(false);
                                                onClockIn("Partial Day");
                                            }}
                                            className="w-full flex items-center gap-3 px-4 py-2.5 text-[12px] font-medium text-gray-700 hover:bg-[#F0F7FF] hover:text-[#2D79C7] transition-colors text-left cursor-pointer"
                                        >
                                            <ClipboardList className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                            Partial Day
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                        <div className="bg-[#F8FAFC] border border-[#F0F2F5] rounded-[14px] p-3 flex flex-col gap-1">
                            <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Status</span>
                            <span className={`inline-flex items-center gap-1.5 text-[12px] font-bold ${checkedIn ? "text-emerald-600" : "text-gray-500"}`}>
                                <span className={`w-2 h-2 rounded-full ${checkedIn ? "bg-emerald-500 animate-pulse" : "bg-gray-400"}`} />
                                {checkedIn ? "Present" : "Absent"}
                            </span>
                        </div>
                        <div className="bg-[#F8FAFC] border border-[#F0F2F5] rounded-[14px] p-3 flex flex-col gap-1">
                            <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Check In</span>
                            <span className="text-[#1E1E1E] text-[12px] font-bold flex items-center gap-1">
                                <LogIn className="w-3.5 h-3.5 text-emerald-500" />
                                {checkInTime}
                            </span>
                        </div>
                        <div className="bg-[#F8FAFC] border border-[#F0F2F5] rounded-[14px] p-3 flex flex-col gap-1">
                            <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Check Out</span>
                            <span className="text-[#1E1E1E] text-[12px] font-bold flex items-center gap-1">
                                <LogOut className="w-3.5 h-3.5 text-rose-400" />
                                {checkOutTime || "—"}
                            </span>
                        </div>
                        <div className="bg-[#F8FAFC] border border-[#F0F2F5] rounded-[14px] p-3 flex flex-col gap-1">
                            <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Duration</span>
                            <span className="text-[#2D79C7] text-[11.5px] font-extrabold flex items-center gap-1">
                                <Timer className="w-3.5 h-3.5 shrink-0" />
                                {fmtDuration(elapsedSec)}
                            </span>
                        </div>
                    </div>

                    <button
                        onClick={() => setLogsOpen(true)}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-[12px] border border-[#2D79C7]/25 text-[#2D79C7] text-[12px] font-bold hover:bg-[#F0F7FF] hover:border-[#2D79C7]/50 active:scale-[0.99] transition-all cursor-pointer"
                    >
                        <ListOrdered className="w-4 h-4" />
                        View Attendance Logs
                    </button>
                </div>
            </Card>
        </>
    );
};

/* ─────────────────────────────────────────────
   WHO'S AWAY TODAY
───────────────────────────────────────────── */
const WhosAwayTodayCard = ({ leaves = [], wfh = [] }) => {
    const totalAway = leaves.length + wfh.length;

    return (
        <Card>
            <CardHeader icon={Calendar} title="Who's Away Today" action={totalAway > 0 ? `${totalAway} Away` : null} />
            <div className="px-5 pb-5 pt-3 space-y-4">
                {totalAway === 0 ? (
                    <div className="py-6 text-center text-gray-400 text-[12px] bg-gray-50 rounded-[12px] flex items-center justify-center gap-2">
                        <span>🌟</span> Everyone is present today!
                    </div>
                ) : (
                    <>
                        {leaves.length > 0 && (
                            <div>
                                <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-2">
                                    On Leave ({leaves.length})
                                </p>
                                <div className="space-y-2.5">
                                    {leaves.map((l) => (
                                        <div key={l._id} className="flex items-center justify-between py-1.5 border-b border-[#F9FAFB] last:border-0">
                                            <div className="flex items-center gap-2.5">
                                                <Avatar name={l.fullName} src={l.profilePicture || null} size="w-7 h-7" textSize="text-[9px]" />
                                                <div>
                                                    <p className="text-[#1E1E1E] text-[12px] font-bold leading-tight">{l.fullName}</p>
                                                    <p className="text-gray-400 text-[10px]">{l.designation}</p>
                                                </div>
                                            </div>
                                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-100 uppercase tracking-wide">
                                                {l.leaveType ? l.leaveType.replace("_", " ") : "Leave"}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {wfh.length > 0 && (
                            <div>
                                <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-2 mt-2">
                                    Working From Home ({wfh.length})
                                </p>
                                <div className="space-y-2.5">
                                    {wfh.map((w) => (
                                        <div key={w._id} className="flex items-center justify-between py-1.5 border-b border-[#F9FAFB] last:border-0">
                                            <div className="flex items-center gap-2.5">
                                                <Avatar name={w.fullName} src={w.profilePicture || null} size="w-7 h-7" textSize="text-[9px]" />
                                                <div>
                                                    <p className="text-[#1E1E1E] text-[12px] font-bold leading-tight">{w.fullName}</p>
                                                    <p className="text-gray-400 text-[10px]">{w.designation}</p>
                                                </div>
                                            </div>
                                            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-[#2D79C7] border border-blue-100 uppercase tracking-wide">
                                                WFH
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </Card>
    );
};

/* ─────────────────────────────────────────────
   LEAVE BALANCES (CIRCULAR)
───────────────────────────────────────────── */
const CircularProgress = ({ taken, total, color, label }) => {
    const remaining = Math.max(0, total - taken);
    const radius = 28;
    const strokeWidth = 5;
    const circumference = 2 * Math.PI * radius;
    const pct = total > 0 ? (remaining / total) * circumference : 0;
    const strokeDashoffset = circumference - pct;

    return (
        <div className="flex flex-col items-center p-4 bg-[#F8FAFC] border border-[#F0F2F5] rounded-[16px] text-center transition-all duration-200 hover:shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex-1 min-w-[130px]">
            <div className="relative w-20 h-20 flex items-center justify-center mb-2">
                <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 80 80">
                    <circle
                        cx="40"
                        cy="40"
                        r={radius}
                        className="stroke-gray-200/60 fill-none"
                        strokeWidth={strokeWidth}
                    />
                    <circle
                        cx="40"
                        cy="40"
                        r={radius}
                        fill="none"
                        stroke={color}
                        strokeWidth={strokeWidth}
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        className="transition-all duration-700 ease-out"
                    />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-[#1E1E1E] text-base font-extrabold leading-none">{remaining}</span>
                    <span className="text-gray-400 text-[9px] font-bold mt-0.5 uppercase tracking-wider">Left</span>
                </div>
            </div>
            <span className="text-[#1E1E1E] text-xs font-bold block truncate max-w-full leading-none">{label}</span>
            <span className="text-gray-400 text-[10px] mt-1.5 block leading-none font-medium">{remaining} of {total} d</span>
        </div>
    );
};

const LeaveBalancesCard = ({ leaveSummary }) => {
    const balance = leaveSummary?.leaveBalance || {
        sick: { total: 6, used: 0, pending: 0 },
        casual: { total: 8, used: 0, pending: 0 },
        earned: { total: 20, used: 0, pending: 0 }
    };

    const sickTotal = balance.sick?.total ?? 6;
    const sickTaken = (balance.sick?.used ?? 0) + (balance.sick?.pending ?? 0);

    const casualTotal = balance.casual?.total ?? 8;
    const casualTaken = (balance.casual?.used ?? 0) + (balance.casual?.pending ?? 0);

    const earnedTotal = balance.earned?.total ?? 20;
    const earnedTaken = (balance.earned?.used ?? 0) + (balance.earned?.pending ?? 0);

    return (
        <Card>
            <CardHeader icon={Umbrella} title="Leave Balances" />
            <div className="px-5 pb-5 pt-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <CircularProgress taken={sickTaken} total={sickTotal} color="#E11D48" label="Sick Leave" />
                    <CircularProgress taken={earnedTaken} total={earnedTotal} color="#10B981" label="Earned Leave" />
                    <CircularProgress taken={casualTaken} total={casualTotal} color="#38BDF8" label="Casual Leave" />
                </div>
            </div>
        </Card>
    );
};

/* ─────────────────────────────────────────────
   BUZZ FEED (UNIFIED COMPOSER + FEED)
───────────────────────────────────────────── */
const categoryBadge = {
    Announcement: "bg-blue-50 text-[#2D79C7] border-blue-100",
    Shoutout: "bg-amber-50 text-amber-700 border-amber-100",
    Question: "bg-violet-50 text-violet-700 border-violet-100",
    Idea: "bg-emerald-50 text-emerald-700 border-emerald-100",
    Update: "bg-gray-50 text-gray-600 border-gray-100",
    Post: "bg-gray-50 text-gray-600 border-gray-100",
};

const BuzzFeedCard = ({ feed = [], currentUser, onVote, onPost, onCreatePoll }) => {
    // Post / Poll creation state inside Buzz Feed
    const [tab, setTab] = useState("Post");
    const [text, setText] = useState("");
    const [pollQuestion, setPollQuestion] = useState("");
    const [pollOptions, setPollOptions] = useState(["", ""]);

    const handleAddOption = () => {
        if (pollOptions.length < 5) {
            setPollOptions([...pollOptions, ""]);
        }
    };

    const handleRemoveOption = (index) => {
        if (pollOptions.length > 2) {
            setPollOptions(pollOptions.filter((_, idx) => idx !== index));
        }
    };

    const handleOptionChange = (index, val) => {
        const newOptions = [...pollOptions];
        newOptions[index] = val;
        setPollOptions(newOptions);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (tab === "Poll") {
            if (!pollQuestion.trim()) return;
            const validOptions = pollOptions.filter(o => o.trim() !== "");
            if (validOptions.length < 2) return;
            onCreatePoll({ question: pollQuestion.trim(), options: validOptions });
            setPollQuestion("");
            setPollOptions(["", ""]);
        } else {
            if (!text.trim()) return;
            onPost({ content: text.trim(), category: tab });
            setText("");
        }
    };

    const isSubmitDisabled = () => {
        if (tab === "Poll") {
            return !pollQuestion.trim() || pollOptions.filter(o => o.trim() !== "").length < 2;
        }
        return !text.trim();
    };

    const list = feed || [];

    const formatTimestamp = (dateStr) => {
        if (!dateStr) return "Just now";
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return "Just now";
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays === 1) return "Yesterday";
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    };

    const renderPoll = (poll) => {
        const totalVotes = poll.votes?.length || 0;
        const userVote = poll.votes?.find(v => v.user.toString() === currentUser?._id.toString());
        const hasVoted = !!userVote;

        return (
            <div className="mt-3 space-y-2">
                {poll.options.map((opt, idx) => {
                    const optVotes = poll.votes?.filter(v => v.optionIndex === idx).length || 0;
                    const pct = totalVotes > 0 ? Math.round((optVotes / totalVotes) * 100) : 0;
                    const isSelected = userVote?.optionIndex === idx;

                    return (
                        <div key={idx} className="relative">
                            {hasVoted ? (
                                <div className="w-full bg-[#F8FAFC] border border-gray-100 rounded-[10px] overflow-hidden p-3 flex justify-between items-center text-[12px] font-semibold text-gray-700 select-none">
                                    <div
                                        className={`absolute left-0 top-0 bottom-0 transition-all duration-500 ${isSelected ? "bg-blue-100/50 border-r border-[#2D79C7]/20" : "bg-gray-200/20"}`}
                                        style={{ width: `${pct}%` }}
                                    />
                                    <span className="relative z-10 flex items-center gap-1.5">
                                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[#2D79C7]" />}
                                        {opt}
                                    </span>
                                    <span className="relative z-10 text-gray-500 font-semibold">{pct}% ({optVotes})</span>
                                </div>
                            ) : (
                                <button
                                    onClick={() => onVote(poll._id, idx)}
                                    className="w-full text-left p-3 border border-[#E5E7EB] hover:border-[#2D79C7] hover:bg-[#F0F7FF]/30 rounded-[10px] text-[12px] font-semibold text-gray-700 transition-all cursor-pointer"
                                >
                                    {opt}
                                </button>
                            )}
                        </div>
                    );
                })}
                <p className="text-gray-400 text-[10px] font-bold uppercase tracking-wider pt-1">{totalVotes} Total Votes</p>
            </div>
        );
    };

    return (
        <Card>
            <CardHeader icon={TrendingUp} title="Buzz Feed" />
            <div className="px-5 pb-5 pt-3 space-y-4">
                
                {/* Unified Post / Poll Composer */}
                <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-[16px] p-4 space-y-3">
                    <div className="flex gap-1.5 border-b border-[#E5E7EB] pb-2">
                        {["Post", "Announcement", "Poll"].map(t => (
                            <button
                                key={t}
                                type="button"
                                onClick={() => setTab(t)}
                                className={`px-3 py-1.5 text-[11.5px] font-bold rounded-lg transition-all cursor-pointer ${tab === t
                                    ? "bg-white text-[#2D79C7] shadow-sm border border-gray-200"
                                    : "text-gray-500 hover:text-gray-800"
                                    }`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-3">
                        {tab !== "Poll" ? (
                            <textarea
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                placeholder={
                                    tab === "Announcement"
                                        ? "Write a formal announcement for the team..."
                                        : "Share an update, question, or check-in..."
                                }
                                rows={2}
                                className="w-full p-3 bg-white border border-[#E5E7EB] rounded-[12px] text-[12.5px] text-[#1E1E1E] placeholder-gray-400 focus:outline-none focus:border-[#2D79C7] transition-all resize-none"
                            />
                        ) : (
                            <div className="space-y-2">
                                <input
                                    type="text"
                                    value={pollQuestion}
                                    onChange={(e) => setPollQuestion(e.target.value)}
                                    placeholder="Ask a question..."
                                    className="w-full px-3 py-2 bg-white border border-[#E5E7EB] rounded-[10px] text-[12px] text-[#1E1E1E] placeholder-gray-400 focus:outline-none focus:border-[#2D79C7] transition-all"
                                />
                                <div className="space-y-2">
                                    {pollOptions.map((option, idx) => (
                                        <div key={idx} className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={option}
                                                onChange={(e) => handleOptionChange(idx, e.target.value)}
                                                placeholder={`Option ${idx + 1}`}
                                                className="flex-1 px-3 py-1.5 bg-white border border-[#E5E7EB] rounded-[8px] text-[12px] text-[#1E1E1E] focus:outline-none focus:border-[#2D79C7] transition-all"
                                            />
                                            {pollOptions.length > 2 && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveOption(idx)}
                                                    className="text-gray-400 hover:text-red-500 transition-colors p-1 cursor-pointer"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                {pollOptions.length < 5 && (
                                    <button
                                        type="button"
                                        onClick={handleAddOption}
                                        className="text-[#2D79C7] text-[11px] font-bold hover:underline cursor-pointer"
                                    >
                                        + Add Option
                                    </button>
                                )}
                            </div>
                        )}

                        <div className="flex justify-end pt-1">
                            <button
                                type="submit"
                                disabled={isSubmitDisabled()}
                                className="bg-[#2D79C7] hover:bg-[#1F5EA8] disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white text-[11.5px] font-bold px-4 py-1.5 rounded-[10px] flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                            >
                                <Send className="w-3.5 h-3.5" />
                                {tab === "Poll" ? "Post Poll" : tab === "Announcement" ? "Announce" : "Post"}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Live Feed List */}
                {list.length === 0 ? (
                    <div className="py-8 text-center flex flex-col items-center gap-2">
                        <div className="w-12 h-12 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center">
                            <AlertCircle className="w-6 h-6 text-gray-300" />
                        </div>
                        <div>
                            <p className="text-[#1E1E1E] text-[13px] font-bold">No posts or polls yet</p>
                            <p className="text-gray-400 text-[11px] mt-0.5 max-w-[180px] mx-auto text-center leading-relaxed">
                                Be the first one to share an update or start a poll.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3 max-h-[380px] overflow-y-auto pr-0.5 scrollbar-thin scrollbar-thumb-gray-100">
                        {list.map((item) => {
                            const isPoll = item.feedType === "poll";
                            const authorName = isPoll
                                ? (item.creator?.fullName || "User")
                                : (typeof item.author === "object" ? (item.author?.fullName || "User") : (item.author || "User"));

                            const authorRole = isPoll
                                ? (item.creator?.designation || "Employee")
                                : (typeof item.author === "object" ? (item.author?.designation || "Employee") : (item.role || "Employee"));

                            const authorAvatarSrc = isPoll
                                ? item.creator?.profilePicture
                                : (typeof item.author === "object" ? item.author?.profilePicture : null);

                            const displayTime = item.createdAt ? formatTimestamp(item.createdAt) : "Just now";

                            return (
                                <div
                                    key={item._id || item.id}
                                    className="p-3.5 bg-[#FAFBFC] border border-[#F0F2F5] rounded-[14px] hover:border-[#E0EAFB] transition-colors duration-200"
                                >
                                    <div className="flex items-start gap-3">
                                        <Avatar
                                            name={authorName}
                                            src={authorAvatarSrc || null}
                                            size="w-8 h-8"
                                            textSize="text-[10px]"
                                        />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-[#1E1E1E] text-[12px] font-bold truncate">{authorName}</span>
                                                <span
                                                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${isPoll
                                                        ? "bg-purple-50 text-purple-700 border-purple-100"
                                                        : (categoryBadge[item.category] || categoryBadge[item.category?.charAt(0).toUpperCase() + item.category?.slice(1)] || "bg-gray-50 text-gray-500 border-gray-100")
                                                        }`}
                                                >
                                                    {isPoll ? "Poll" : (item.category ? (item.category.charAt(0).toUpperCase() + item.category.slice(1)) : "Update")}
                                                </span>
                                            </div>
                                            <p className="text-gray-400 text-[10px] mt-0.5">{authorRole} · {displayTime}</p>

                                            {isPoll ? (
                                                <div className="mt-2 text-left">
                                                    <p className="text-[#1E1E1E] text-[13px] font-bold">{item.question}</p>
                                                    {renderPoll(item)}
                                                </div>
                                            ) : (
                                                <p className="text-gray-700 text-[12px] leading-relaxed mt-2 whitespace-pre-line">{item.content}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </Card>
    );
};

/* ─────────────────────────────────────────────
   PEOPLE EVENTS (NEXT 30 DAYS)
───────────────────────────────────────────── */
const PeopleEventsCard = ({ events }) => {
    const [tab, setTab] = useState("Birthdays");
    const tabs = [
        { key: "Birthdays", icon: Cake, label: "Birthdays" },
        { key: "Work Anniversaries", icon: PartyPopper, label: "Anniversaries" },
        { key: "New Joinees", icon: UserPlus, label: "New Joinees" },
    ];

    const [wishedIds, setWishedIds] = useState([]);
    const wish = (id) => {
        setWishedIds((p) => [...p, id]);
        toast.success("Wish sent successfully! 🎉");
    };

    const bdays = events.birthdays || [];
    const annivs = events.anniversaries || [];
    const joinees = (events.newJoinees || []).filter(j => Math.abs(j.daysRemaining) <= 2);

    const renderBirthdays = () => (
        <div className="space-y-3 max-h-[280px] overflow-y-auto pr-0.5">
            {bdays.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-[12px] bg-gray-50 rounded-[12px] flex items-center justify-center gap-2">
                    🎂 No birthdays in next 30 days
                </div>
            ) : (
                bdays.map((b) => {
                    const isToday = b.daysRemaining === 0;
                    return (
                        <div key={b._id} className="flex items-center justify-between py-2 border-b border-[#F9FAFB] last:border-0">
                            <div className="flex items-center gap-2.5">
                                <Avatar name={b.fullName} src={b.profilePicture || null} size="w-8 h-8" textSize="text-[10px]" />
                                <div>
                                    <p className="text-[#1E1E1E] text-[12px] font-bold leading-tight">{b.fullName}</p>
                                    <p className="text-gray-400 text-[10px]">{b.designation}</p>
                                </div>
                            </div>
                            <div className="text-right flex items-center gap-3">
                                <div>
                                    <p className="text-[#2D79C7] text-[11px] font-bold leading-none">
                                        {b.dateOfBirth ? new Date(b.dateOfBirth).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}
                                    </p>
                                    <p className="text-gray-400 text-[10px] mt-1">{isToday ? "Today!" : `in ${b.daysRemaining}d`}</p>
                                </div>
                                <button
                                    onClick={() => wish(b._id)}
                                    disabled={wishedIds.includes(b._id)}
                                    className={`px-3 py-1.5 rounded-[10px] text-[11px] font-bold border transition-all duration-200 shrink-0 cursor-pointer ${wishedIds.includes(b._id)
                                        ? "bg-emerald-50 text-emerald-600 border-emerald-100 cursor-default"
                                        : "bg-[#2D79C7] text-white border-transparent hover:bg-[#1F5EA8] active:scale-95"
                                        }`}
                                >
                                    {wishedIds.includes(b._id) ? "Wished!" : "Wish"}
                                </button>
                            </div>
                        </div>
                    );
                })
            )}
        </div>
    );

    const renderAnniversaries = () => (
        <div className="space-y-3 max-h-[280px] overflow-y-auto pr-0.5">
            {annivs.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-[12px] bg-gray-50 rounded-[12px] flex items-center justify-center gap-2">
                    🏆 No anniversaries in next 30 days
                </div>
            ) : (
                annivs.map((a) => (
                    <div key={a._id} className="flex items-center gap-3 p-3 bg-amber-50/20 border border-amber-100/50 rounded-[12px]">
                        <Avatar name={a.fullName} src={a.profilePicture || null} size="w-9 h-9" textSize="text-xs" />
                        <div className="flex-1 min-w-0">
                            <p className="text-[#1E1E1E] text-[12px] font-bold truncate leading-tight">{a.fullName}</p>
                            <p className="text-gray-400 text-[10px] truncate mt-0.5">{a.designation}</p>
                        </div>
                        <div className="text-right shrink-0 flex items-center gap-3">
                            <div>
                                <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full leading-none">
                                    🏆 {a.years} {a.years > 1 ? "Yrs" : "Yr"}
                                </span>
                                <p className="text-gray-400 text-[9px] mt-1.5 leading-none">
                                    {a.joiningDate ? new Date(a.joiningDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""} (in {a.daysRemaining}d)
                                </p>
                            </div>
                            <button
                                onClick={() => wish(a._id)}
                                disabled={wishedIds.includes(a._id)}
                                className={`px-3 py-1.5 rounded-[10px] text-[11px] font-bold border transition-all duration-200 shrink-0 cursor-pointer ${wishedIds.includes(a._id)
                                    ? "bg-emerald-50 text-emerald-600 border-emerald-100 cursor-default"
                                    : "bg-[#2D79C7] text-white border-transparent hover:bg-[#1F5EA8] active:scale-95"
                                    }`}
                            >
                                {wishedIds.includes(a._id) ? "Wished!" : "Wish"}
                            </button>
                        </div>
                    </div>
                ))
            )}
        </div>
    );

    const renderNewJoinees = () => (
        <div className="space-y-3 max-h-[280px] overflow-y-auto pr-0.5">
            {joinees.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-[12px] bg-gray-50 rounded-[12px] flex items-center justify-center gap-2">
                    🌟 No new joinees in last 2 days
                </div>
            ) : (
                joinees.map((j) => {
                    const daysAgo = j.daysRemaining;
                    const displayDays = daysAgo < 0
                        ? `${Math.abs(daysAgo)} days ago`
                        : (daysAgo === 0 ? "Today" : `in ${daysAgo} days`);
                    return (
                        <div key={j._id} className="flex items-center gap-3 p-3 bg-blue-50/20 border border-blue-100/50 rounded-[12px]">
                            <Avatar name={j.fullName} src={j.profilePicture || null} size="w-9 h-9" textSize="text-xs" />
                            <div className="flex-1 min-w-0">
                                <p className="text-[#1E1E1E] text-[12px] font-bold truncate leading-tight">{j.fullName}</p>
                                <p className="text-gray-400 text-[10px] truncate mt-0.5">{j.designation}</p>
                            </div>
                            <div className="text-right shrink-0 flex items-center gap-3">
                                <div>
                                    <span className="bg-[#2D79C7]/10 text-[#2D79C7] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider leading-none">
                                        🌟 Joins
                                    </span>
                                    <p className="text-gray-400 text-[9px] mt-1.5 leading-none">{displayDays}</p>
                                </div>
                                <button
                                    onClick={() => wish(j._id)}
                                    disabled={wishedIds.includes(j._id)}
                                    className={`px-3 py-1.5 rounded-[10px] text-[11px] font-bold border transition-all duration-200 shrink-0 cursor-pointer ${wishedIds.includes(j._id)
                                        ? "bg-emerald-50 text-emerald-600 border-emerald-100 cursor-default"
                                        : "bg-[#2D79C7] text-white border-transparent hover:bg-[#1F5EA8] active:scale-95"
                                        }`}
                                >
                                    {wishedIds.includes(j._id) ? "Wished!" : "Wish"}
                                </button>
                            </div>
                        </div>
                    );
                })
            )}
        </div>
    );

    return (
        <Card>
            <div className="px-5 pt-4 pb-0">
                <div className="flex gap-2 border-b border-[#F3F4F6]">
                    {tabs.map(({ key, icon: Icon, label }) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => setTab(key)}
                            className={`flex items-center gap-1.5 px-3 py-2.5 text-[11px] font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${tab === key
                                ? "border-[#2D79C7] text-[#2D79C7]"
                                : "border-transparent text-gray-400 hover:text-gray-600"
                                }`}
                        >
                            <Icon className="w-3.5 h-3.5 shrink-0" />
                            {label}
                        </button>
                    ))}
                </div>
            </div>
            <div className="px-5 py-4">
                {tab === "Birthdays" && renderBirthdays()}
                {tab === "Work Anniversaries" && renderAnniversaries()}
                {tab === "New Joinees" && renderNewJoinees()}
            </div>
        </Card>
    );
};

/* ─────────────────────────────────────────────
   WELCOME BANNER
───────────────────────────────────────────── */
const WelcomeBanner = ({ user }) => {
    const [greeting, setGreeting] = useState("Good Morning");
    const [greetingIcon, setGreetingIcon] = useState("🌤️");
    const [formattedDate, setFormattedDate] = useState("");

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) {
            setGreeting("Good Morning");
            setGreetingIcon("🌤️");
        } else if (hour >= 12 && hour < 17) {
            setGreeting("Good Afternoon");
            setGreetingIcon("☀️");
        } else {
            setGreeting("Good Evening");
            setGreetingIcon("🌙");
        }
        const options = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
        setFormattedDate(new Date().toLocaleDateString("en-US", options));
    }, []);

    return (
        <section
            className="relative overflow-hidden rounded-[24px] shadow-[0_25px_70px_rgba(37,99,235,0.28)] border border-white/10 px-8 py-0 flex flex-col sm:flex-row justify-between items-center h-[130px] shadow-xl select-none border border-blue-600/20"
            style={{
                background: "linear-gradient(125deg, #2D79C7 0%, #3A88D8 40%, #1F5EA8 100%)",
            }}
        >
            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-[24px]">
                <div className="absolute -top-10 -right-10 w-52 h-52 bg-white/5 rounded-full" />
                <div className="absolute top-0 right-32 w-24 h-24 bg-white/5 rounded-full" />
                <div className="absolute -bottom-12 left-1/4 w-44 h-44 bg-white/4 rounded-full" />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent" />
            </div>

            <div className="flex flex-col text-left relative z-10 gap-1">
                <div className="flex items-center gap-2">
                    <span className="text-white/60 text-[11px] font-semibold uppercase tracking-[0.15em]">
                        {greetingIcon} {greeting},
                    </span>
                </div>
                <h1 className="text-white text-[22px] font-bold tracking-tight leading-tight">
                    {user?.fullName || ""}
                </h1>
            </div>

            <div className="mt-0 relative z-10 shrink-0">
                <div className="inline-flex items-center gap-2.5 bg-white/10 backdrop-blur-md border border-white/25 rounded-[16px] px-5 py-2.5 text-[13px] text-white font-semibold tracking-wide shadow-sm">
                    <Calendar className="w-4 h-4 text-[#FFEA00] shrink-0" />
                    <span>{formattedDate}</span>
                </div>
            </div>
        </section>
    );
};

/* ─────────────────────────────────────────────
   DASHBOARD PAGE
───────────────────────────────────────────── */
const Dashboard = () => {
    const { user, can } = useAuth();
    const [dashboardData, setDashboardData] = useState(null);
    const [awayToday, setAwayToday] = useState({ leaves: [], wfh: [] });
    const [peopleEvents, setPeopleEvents] = useState({ birthdays: [], anniversaries: [], newJoinees: [] });
    const [polls, setPolls] = useState([]);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const employeeId = user?._id;

    const fetchDashboard = async () => {
        try {
            setLoading(true);
            setError(null);

            const [dashRes, awayRes, eventsRes, pollsRes] = await Promise.all([
                getDashboardData(employeeId),
                getAwayToday(),
                getPeopleEvents(),
                getPolls()
            ]);

            if (dashRes.data && dashRes.data.success) {
                setDashboardData(dashRes.data.data);
                setPosts(dashRes.data.data.posts || []);
            }
            if (awayRes.data && awayRes.data.success) {
                setAwayToday({
                    leaves: awayRes.data.leaves || [],
                    wfh: awayRes.data.wfh || []
                });
            }
            if (eventsRes.data && eventsRes.data.success) {
                setPeopleEvents({
                    birthdays: eventsRes.data.birthdays || [],
                    anniversaries: eventsRes.data.anniversaries || [],
                    newJoinees: eventsRes.data.newJoinees || []
                });
            }
            if (pollsRes.data && pollsRes.data.success) {
                setPolls(pollsRes.data.polls || []);
            }
        } catch (err) {
            console.error("Error fetching dashboard data:", err);
            setError(err.response?.data?.message || err.message || "Failed to load dashboard data");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (employeeId) {
            fetchDashboard();
        } else {
            setError("No employee ID found. Please log in again.");
            setLoading(false);
        }
    }, [employeeId]);

    const handleClockIn = async (workMode = "Office", wfhMessage = "") => {
        try {
            const response = await clockIn(employeeId, workMode, wfhMessage);
            if (response.data && response.data.success) {
                toast.success(`Clocked In successfully (${workMode})!`);
                await fetchDashboard();
            }
        } catch (err) {
            console.error("Error clocking in:", err);
            toast.error(err.response?.data?.message || "Failed to clock in.");
        }
    };

    const handleClockOut = async () => {
        try {
            const response = await clockOut(employeeId);
            if (response.data && response.data.success) {
                toast.success("Clocked Out successfully!");
                await fetchDashboard();
            }
        } catch (err) {
            console.error("Error clocking out:", err);
            toast.error(err.response?.data?.message || "Failed to clock out.");
        }
    };

    const handleCreatePoll = async ({ question, options }) => {
        try {
            const response = await createPoll({ question, options });
            if (response.data && response.data.success) {
                setPolls(prevPolls => [response.data.poll, ...prevPolls]);
                toast.success("Poll posted successfully!");
            }
        } catch (err) {
            console.error("Error creating poll:", err);
            toast.error(err.response?.data?.message || "Failed to create poll.");
        }
    };

    const handleCreatePost = async ({ content, category }) => {
        try {
            const response = await createPosts({ author: employeeId, content, category });
            if (response.data && response.data.success) {
                const newPost = response.data.post;
                newPost.author = {
                    _id: user._id,
                    fullName: user.fullName,
                    designation: user.designation,
                    profilePicture: user.profilePicture
                };
                setPosts(prevPosts => [newPost, ...prevPosts]);
                toast.success(`${category} posted successfully!`);
            }
        } catch (err) {
            console.error("Error creating post:", err);
            toast.error(err.response?.data?.message || "Failed to post update.");
        }
    };

    const handleVote = async (pollId, optionIndex) => {
        try {
            const response = await voteInPoll(pollId, optionIndex);
            if (response.data && response.data.success) {
                setPolls(prevPolls =>
                    prevPolls.map(p => p._id === pollId ? response.data.poll : p)
                );
                toast.success("Vote cast successfully!");
            }
        } catch (err) {
            console.error("Error voting:", err);
            toast.error(err.response?.data?.message || "Failed to cast vote.");
        }
    };

    if (loading && !dashboardData) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 select-none">
                <div className="w-12 h-12 border-4 border-[#2D79C7]/20 border-t-[#2D79C7] rounded-full animate-spin" />
                <p className="text-gray-400 text-sm font-semibold tracking-wide animate-pulse">
                    Loading dashboard data...
                </p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 max-w-md mx-auto text-center select-none">
                <div className="w-14 h-14 bg-rose-50 border border-rose-100 rounded-full flex items-center justify-center text-rose-500 shadow-sm animate-bounce">
                    <AlertCircle className="w-7 h-7" />
                </div>
                <div>
                    <h3 className="text-[#1E1E1E] text-base font-bold">Failed to Load Dashboard</h3>
                    <p className="text-gray-400 text-xs mt-1.5 leading-relaxed">{error}</p>
                </div>
                <button
                    onClick={fetchDashboard}
                    className="mt-2 bg-[#2D79C7] hover:bg-[#1F5EA8] active:scale-95 text-white font-semibold text-xs px-5 py-2.5 rounded-[12px] transition-all shadow-sm cursor-pointer"
                >
                    Retry
                </button>
            </div>
        );
    }

    const combinedFeed = [
        ...posts.map(p => ({ ...p, feedType: "post" })),
        ...polls.map(p => ({ ...p, feedType: "poll" }))
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return (
        <div className="space-y-6 select-none">
            {/* Welcome Banner */}
            <WelcomeBanner user={dashboardData?.user} />

            {/* Main Grid — 65 / 35 */}
            <div className="grid grid-cols-1 lg:grid-cols-[65%_35%] gap-5">

                {/* ── LEFT COLUMN ── */}
                <div className="flex flex-col gap-5 min-w-0">
                    <HolidaySection initialHolidays={dashboardData?.upcomingHolidays} />
                    <TimeTodayCard
                        attendance={dashboardData?.attendance}
                        onClockIn={handleClockIn}
                        onClockOut={handleClockOut}
                    />
                    <WhosAwayTodayCard
                        leaves={awayToday.leaves}
                        wfh={awayToday.wfh}
                    />
                </div>

                {/* ── RIGHT COLUMN ── */}
                <div className="flex flex-col gap-5 min-w-0">
                    <BuzzFeedCard
                        feed={combinedFeed}
                        currentUser={user}
                        onVote={handleVote}
                        onPost={handleCreatePost}
                        onCreatePoll={handleCreatePoll}
                    />
                    <PeopleEventsCard events={peopleEvents} />
                </div>

            </div>
        </div>
    );
};

export default Dashboard;
