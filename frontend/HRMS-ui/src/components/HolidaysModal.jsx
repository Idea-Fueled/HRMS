import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { X, CalendarDays, Loader2, AlertCircle, Calendar, Edit3, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getAllHolidays, updateHoliday, deleteHoliday } from "../services/dashboard.service";
import { useAuth } from "../context/AuthContext";
import independanceDayImg from "../assets/independance_day.jpg";
import newYearImg from "../assets/new_year.jpg";
import mahashivratriImg from "../assets/mahashivratri_day.jpg";
import holiImg from "../assets/holi.jpg";

const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

const MONTH_ABBR = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const displayType = (type) => {
    if (type === "public_holiday") return "Public Holiday";
    if (type === "company_holiday") return "Company Holiday";
    if (type === "optional_holiday") return "Optional Holiday";
    return type || "Public Holiday";
};

const getHolidayEmoji = (title = "") => {
    const t = title.toLowerCase();
    if (t.includes("shivratri") || t.includes("mahashivratri")) return "🔱";
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

    if (title.includes("shivratri") || title.includes("mahashivratri")) return mahashivratriImg;
    if (title.includes("independence") || title.includes("republic") || title.includes("independance")) return independanceDayImg;
    if (title.includes("new year") || title.includes("newyear")) return newYearImg;
    if (title.includes("diwali") || title.includes("deepavali")) return "https://images.unsplash.com/photo-1605888981261-26c3fa7e4663?auto=format&fit=crop&w=600&q=80";
    if (title.includes("holi")) return holiImg;
    if (title.includes("eid")) return "https://images.unsplash.com/photo-1564769625905-50e93615e769?auto=format&fit=crop&w=600&q=80";
    if (title.includes("raksha") || title.includes("rakhi")) return "https://images.unsplash.com/photo-1627885233158-750d0322b270?auto=format&fit=crop&w=600&q=80";
    if (title.includes("gandhi")) return "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=600&q=80";
    if (title.includes("friday") || title.includes("easter")) return "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=600&q=80";

    return "https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=600&q=80";
};

/* ─────────────────────────────────────────────
   INLINE EDIT MODAL (nested portal)
───────────────────────────────────────────── */
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1100] flex items-center justify-center p-4 select-none">
            <div className="bg-white rounded-[20px] border border-gray-100 shadow-2xl max-w-md w-full overflow-hidden">
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
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Holiday Title *</label>
                        <input type="text" required value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Independence Day"
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-[14px] text-sm text-[#1E1E1E] placeholder-gray-400 focus:outline-none focus:bg-white focus:border-[#2D79C7] focus:ring-1 focus:ring-[#2D79C7] transition-all shadow-inner" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Date *</label>
                            <input type="date" required value={date} onChange={e => setDate(e.target.value)}
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-[14px] text-sm focus:outline-none focus:bg-white focus:border-[#2D79C7] focus:ring-1 focus:ring-[#2D79C7] transition-all cursor-pointer" />
                        </div>
                        <div>
                            <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Day</label>
                            <input type="text" readOnly value={day} placeholder="Auto-calculated"
                                className="w-full px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-[14px] text-sm text-gray-500 cursor-not-allowed" />
                        </div>
                    </div>
                    <div>
                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Type</label>
                        <select value={type} onChange={e => setType(e.target.value)}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-[14px] text-sm focus:outline-none focus:bg-white focus:border-[#2D79C7] transition-all cursor-pointer">
                            <option value="public_holiday">Public Holiday</option>
                            <option value="optional_holiday">Optional Holiday</option>
                            <option value="company_holiday">Company Holiday</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5 block">Description</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Add brief description..."
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-[14px] text-sm placeholder-gray-400 focus:outline-none focus:bg-white focus:border-[#2D79C7] transition-all h-20 resize-none shadow-inner" />
                    </div>
                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#F3F4F6]">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 text-xs font-bold text-gray-500 hover:bg-gray-50 border border-gray-200 rounded-[12px] transition-all cursor-pointer">
                            Cancel
                        </button>
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

/* ─────────────────────────────────────────────
   MAIN HOLIDAYS MODAL
───────────────────────────────────────────── */
const HolidaysModal = ({ isOpen, onClose }) => {
    const { can } = useAuth();
    const canEdit = can("edit:holiday");

    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [allHolidays, setAllHolidays] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [editingHoliday, setEditingHoliday] = useState(null);
    const [deletingId, setDeletingId] = useState(null);

    const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

    const fetchHolidays = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await getAllHolidays();
            if (res.data && res.data.success) {
                setAllHolidays(res.data.holidays || []);
            } else {
                throw new Error(res.data?.message || "Failed to load holidays.");
            }
        } catch (err) {
            const errMsg = err.response?.data?.message || err.message || "Failed to fetch holidays.";
            setError(errMsg);
            toast.error(errMsg);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) fetchHolidays();
    }, [isOpen]);

    const handleDelete = async (holiday) => {
        if (!window.confirm(`Delete "${holiday.title}"? This cannot be undone.`)) return;
        setDeletingId(holiday._id);
        try {
            const res = await deleteHoliday(holiday._id);
            if (res.data?.success) {
                toast.success("Holiday deleted.");
                fetchHolidays();
            } else {
                toast.error(res.data?.message || "Failed to delete.");
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to delete holiday.");
        } finally {
            setDeletingId(null);
        }
    };

    if (!isOpen) return null;

    const filteredHolidays = allHolidays
        .filter(h => h.date && new Date(h.date).getFullYear() === selectedYear)
        .sort((a, b) => new Date(a.date) - new Date(b.date));

    const janToAugHolidays = filteredHolidays.filter(h => {
        const d = h.date ? new Date(h.date) : new Date();
        return d.getMonth() < 8; // Jan-Aug (months 0 to 7)
    });

    const septToDecHolidays = filteredHolidays.filter(h => {
        const d = h.date ? new Date(h.date) : new Date();
        return d.getMonth() >= 8; // Sep-Dec (months 8 to 11)
    });

    const renderHolidayCard = (h, idx) => {
        const d = h.date ? new Date(h.date) : new Date();
        const dayNum = d.getDate().toString().padStart(2, "0");
        const monthAbbr = MONTH_ABBR[d.getMonth()];
        const formattedType = displayType(h.type);
        const emoji = getHolidayEmoji(h.title);
        const bannerImg = getHolidayImage(h);
        const isDeleting = deletingId === h._id;

        return (
            <div
                key={h._id || idx}
                className="group relative overflow-hidden rounded-[20px] transition-all duration-300 border shadow-xs hover:shadow-lg bg-white border-gray-200/90 hover:border-[#2D79C7]/40"
            >
                {/* Top Image Banner */}
                <div className="h-28 sm:h-36 w-full relative overflow-hidden bg-slate-900 flex items-center justify-center">
                    <img
                        src={bannerImg}
                        alt={h.title}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                            e.target.src = independanceDayImg;
                        }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />

                    {/* Calendar Date Tile (Top-Left Floating) */}
                    <div className="absolute top-3 left-3 w-11 rounded-xl bg-white/95 backdrop-blur-md border border-white/40 shadow-md overflow-hidden text-center z-10">
                        <div className="bg-[#2D79C7] text-white text-[9px] font-black uppercase tracking-wider py-0.5">
                            {monthAbbr}
                        </div>
                        <div className="py-0.5 text-[#1E1E1E] text-sm font-black leading-tight">
                            {dayNum}
                        </div>
                    </div>

                    {/* Type Badge (Top-Right Floating) */}
                    <div className="absolute top-3 right-3 z-10">
                        <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-md text-[#1E1E1E] shadow-sm border border-white/50">
                            {formattedType}
                        </span>
                    </div>

                    {/* Holiday Title over Banner */}
                    <div className="absolute bottom-2.5 left-3.5 right-3.5 text-white z-10">
                        <h4 className="text-white text-sm sm:text-[15px] font-extrabold flex items-center gap-1.5 leading-snug drop-shadow-md truncate">
                            <span className="text-base leading-none">{emoji}</span>
                            <span>{h.title || "Holiday"}</span>
                        </h4>
                    </div>
                </div>

                {/* Bottom Details Footer */}
                <div className="p-3.5 flex items-center justify-between bg-white relative">
                    <p className="text-gray-500 text-[11.5px] font-semibold flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#2D79C7] shrink-0" />
                        <span>{h.day || "Scheduled Day"}</span>
                    </p>

                    {/* Edit / Delete — only for admin/hr */}
                    {canEdit && (
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setEditingHoliday(h)}
                                title="Edit"
                                className="p-1.5 rounded-lg text-gray-400 hover:text-[#2D79C7] hover:bg-blue-50 transition-colors cursor-pointer"
                            >
                                <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => handleDelete(h)}
                                disabled={isDeleting}
                                title="Delete"
                                className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-50"
                            >
                                {isDeleting
                                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    : <Trash2 className="w-3.5 h-3.5" />
                                }
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return ReactDOM.createPortal(
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50 transition-opacity" onClick={onClose} />

            {/* Modal */}
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl mx-4 max-h-[85vh] bg-white rounded-[24px] shadow-2xl z-50 flex flex-col overflow-hidden border border-gray-150 select-none">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#2D79C7] to-[#1F5EA8] text-white shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-[10px] bg-white/20 flex items-center justify-center">
                            <CalendarDays className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black leading-tight">Company Holidays</h3>
                            <p className="text-white/60 text-[11px] font-semibold mt-0.5">List of all scheduled holidays</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-white/80 hover:text-white p-1.5 hover:bg-white/10 rounded-[8px] transition-colors cursor-pointer">
                        <X className="w-4.5 h-4.5" />
                    </button>
                </div>

                {/* Body Content */}
                <div className="p-6 overflow-y-auto space-y-6 flex-1 scrollbar-thin">
                    {/* Filter bar */}
                    <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                        <div className="flex items-center gap-3">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Select Year:</label>
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(Number(e.target.value))}
                                className="px-3.5 py-1.5 bg-gray-50 border border-gray-200 rounded-[12px] text-xs font-bold text-[#1E1E1E] focus:outline-none focus:border-[#2D79C7] cursor-pointer"
                            >
                                {years.map((y) => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>

                        <span className="text-xs font-bold text-gray-400 bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
                            {filteredHolidays.length} Holidays Found
                        </span>
                    </div>

                    {loading ? (
                        <div className="py-16 text-center text-gray-400 text-xs flex flex-col items-center gap-2">
                            <Loader2 className="w-5 h-5 animate-spin text-[#2D79C7]" />
                            <span>Loading holidays schedule...</span>
                        </div>
                    ) : error ? (
                        <div className="py-12 text-center text-rose-500 text-xs font-semibold flex items-center justify-center gap-2 bg-rose-50 border border-rose-100 rounded-[16px]">
                            <AlertCircle className="w-4 h-4" />
                            <span>{error}</span>
                        </div>
                    ) : filteredHolidays.length === 0 ? (
                        <div className="py-16 text-center text-gray-400 text-xs flex flex-col items-center gap-1.5 bg-gray-50/50 rounded-[18px] border border-dashed border-gray-200">
                            <CalendarDays className="w-8 h-8 text-gray-300 stroke-[1.5]" />
                            <span className="font-bold text-gray-600">No Holidays Scheduled for {selectedYear}</span>
                            <span className="text-gray-400 text-[11px]">Pick another year or add new holidays</span>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Jan - Aug Section */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                                    <span className="text-[11px] font-black uppercase tracking-wider text-[#2D79C7]">
                                        Jan – Aug {selectedYear}
                                    </span>
                                    <div className="h-px bg-gray-100 flex-1" />
                                    <span className="text-[10.5px] font-bold text-gray-400">
                                        {janToAugHolidays.length} events
                                    </span>
                                </div>

                                {janToAugHolidays.length === 0 ? (
                                    <div className="text-center py-6 border border-dashed border-gray-100 rounded-[14px] text-gray-400 text-[11px] font-semibold italic bg-gray-50/30">
                                        No holidays in this period
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {janToAugHolidays.map((h, idx) => renderHolidayCard(h, idx))}
                                    </div>
                                )}
                            </div>

                            {/* Sep - Dec Section */}
                            <div className="space-y-3 pt-2">
                                <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                                    <span className="text-[11px] font-black uppercase tracking-wider text-[#2D79C7]">
                                        Sep – Dec {selectedYear}
                                    </span>
                                    <div className="h-px bg-gray-100 flex-1" />
                                    <span className="text-[10.5px] font-bold text-gray-400">
                                        {septToDecHolidays.length} events
                                    </span>
                                </div>

                                {septToDecHolidays.length === 0 ? (
                                    <div className="text-center py-6 border border-dashed border-gray-100 rounded-[14px] text-gray-400 text-[11px] font-semibold italic bg-gray-50/30">
                                        No holidays in this period
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {septToDecHolidays.map((h, idx) => renderHolidayCard(h, idx))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Edit modal rendered on top */}
            {editingHoliday && (
                <EditHolidayModal
                    holiday={editingHoliday}
                    onClose={() => setEditingHoliday(null)}
                    onSuccess={() => { fetchHolidays(); setEditingHoliday(null); }}
                />
            )}
        </>,
        document.body
    );
};

export default HolidaysModal;
