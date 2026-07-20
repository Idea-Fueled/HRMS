import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { X, CalendarDays, Loader2, AlertCircle, Calendar, Edit3, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getAllHolidays, updateHoliday, deleteHoliday } from "../services/dashboard.service";
import { useAuth } from "../context/AuthContext";

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

const typeColors = {
    "Public Holiday": "bg-blue-50 text-[#2D79C7] border-blue-100",
    "Company Holiday": "bg-violet-50 text-violet-700 border-violet-100",
    "Optional Holiday": "bg-amber-50 text-amber-700 border-amber-100",
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
        const dayNum = d.getDate();
        const monthAbbr = MONTH_ABBR[d.getMonth()];
        const formattedType = displayType(h.type);
        const isDeleting = deletingId === h._id;

        return (
            <div
                key={h._id || idx}
                className="group relative flex items-center gap-4 py-3 px-4 border border-gray-150 rounded-[14px] hover:border-blue-100 hover:bg-[#F8FAFC]/50 transition-all duration-200 shadow-sm bg-white"
            >
                {/* Date badge */}
                <div className="w-11 h-11 rounded-[12px] bg-gradient-to-br from-[#2D79C7]/10 to-[#1F5EA8]/10 border border-[#2D79C7]/15 flex flex-col items-center justify-center shrink-0">
                    <span className="text-[#2D79C7] text-[11px] font-bold uppercase leading-none">{monthAbbr}</span>
                    <span className="text-[#1E1E1E] text-[15px] font-extrabold leading-tight mt-0.5">{dayNum}</span>
                </div>

                {/* Title + day */}
                <div className="flex-1 min-w-0 text-left">
                    <span className="text-[#1E1E1E] text-[13px] font-semibold block truncate" title={h.title}>
                        {h.title || "Holiday"}
                    </span>
                    <span className="text-gray-400 text-[11px] mt-0.5 block font-medium">{h.day || ""}</span>
                </div>

                {/* Type badge */}
                <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border shrink-0 ${typeColors[formattedType] || "bg-gray-50 text-gray-600 border-gray-100"}`}>
                    {formattedType}
                </span>

                {/* Edit / Delete — only for admin/hr */}
                {canEdit && (
                    <div className="flex items-center gap-1 shrink-0">
                        <button
                            onClick={() => setEditingHoliday(h)}
                            title="Edit"
                            className="p-1.5 rounded-[8px] text-gray-400 hover:text-[#2D79C7] hover:bg-blue-50 transition-colors cursor-pointer"
                        >
                            <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={() => handleDelete(h)}
                            disabled={isDeleting}
                            title="Delete"
                            className="p-1.5 rounded-[8px] text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer disabled:opacity-50"
                        >
                            {isDeleting
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <Trash2 className="w-3.5 h-3.5" />
                            }
                        </button>
                    </div>
                )}
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
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Year filter sub-header */}
                <div className="px-6 py-3 border-b border-gray-100 bg-[#F8FAFC] flex items-center justify-between gap-4 shrink-0">
                    <span className="text-xs font-bold text-gray-500">Filter by Year</span>
                    <div className="relative">
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            className="appearance-none bg-white border border-gray-200 rounded-[10px] pl-3 pr-8 py-1.5 text-xs font-bold text-gray-700 focus:outline-none focus:border-[#2D79C7] focus:ring-1 focus:ring-[#2D79C7] transition-all cursor-pointer shadow-sm"
                        >
                            {years.map(yr => <option key={yr} value={yr}>{yr}</option>)}
                        </select>
                        <Calendar className="w-3 h-3 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 bg-white min-h-[250px]">
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {Array.from({ length: 6 }).map((_, idx) => (
                                <div key={idx} className="flex items-center gap-4 py-3 px-4 border border-gray-100 rounded-[14px] bg-[#F8FAFC] animate-pulse">
                                    <div className="w-11 h-11 rounded-[12px] bg-gray-200 shrink-0" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-3.5 bg-gray-200 rounded w-3/4" />
                                        <div className="h-2.5 bg-gray-200 rounded w-1/2" />
                                    </div>
                                    <div className="h-5 bg-gray-200 rounded-full w-16 shrink-0" />
                                </div>
                            ))}
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-500 border border-rose-100 flex items-center justify-center">
                                <AlertCircle className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="text-gray-800 font-bold text-sm">Failed to load holidays</h4>
                                <p className="text-gray-400 text-xs mt-1 max-w-xs">{error}</p>
                            </div>
                            <button onClick={fetchHolidays} className="px-4 py-1.5 bg-[#2D79C7] hover:bg-[#1F5EA8] text-white text-xs font-bold rounded-[10px] shadow-sm transition-all cursor-pointer">
                                Retry
                            </button>
                        </div>
                    ) : filteredHolidays.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-blue-50 text-[#2D79C7] border border-blue-100 flex items-center justify-center">
                                <CalendarDays className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="text-gray-800 font-bold text-sm">No holidays scheduled</h4>
                                <p className="text-gray-400 text-xs mt-1">There are no holidays registered for {selectedYear}.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                            {/* Left Column (Jan - Aug) */}
                            <div className="space-y-3.5">
                                <h4 className="text-[#2D79C7] text-[11px] font-black uppercase tracking-wider pb-2 border-b border-gray-100 mb-2 flex items-center gap-1.5">
                                    <span>🌸</span> January - August
                                </h4>
                                {janToAugHolidays.length === 0 ? (
                                    <div className="text-center py-6 border border-dashed border-gray-100 rounded-[14px] text-gray-400 text-[11px] font-semibold italic bg-gray-50/30">
                                        No holidays in this period
                                    </div>
                                ) : (
                                    janToAugHolidays.map((h, idx) => renderHolidayCard(h, idx))
                                )}
                            </div>

                            {/* Right Column (Sep - Dec) */}
                            <div className="space-y-3.5">
                                <h4 className="text-violet-700 text-[11px] font-black uppercase tracking-wider pb-2 border-b border-gray-100 mb-2 flex items-center gap-1.5">
                                    <span>🍁</span> September - December
                                </h4>
                                {septToDecHolidays.length === 0 ? (
                                    <div className="text-center py-6 border border-dashed border-gray-100 rounded-[14px] text-gray-400 text-[11px] font-semibold italic bg-gray-50/30">
                                        No holidays in this period
                                    </div>
                                ) : (
                                    septToDecHolidays.map((h, idx) => renderHolidayCard(h, idx))
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
