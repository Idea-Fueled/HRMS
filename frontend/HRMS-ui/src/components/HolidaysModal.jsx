import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { X, CalendarDays, Loader2, AlertCircle, Calendar } from "lucide-react";
import { toast } from "sonner";
import { getAllHolidays } from "../services/dashboard.service";

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

const HolidaysModal = ({ isOpen, onClose }) => {
    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [allHolidays, setAllHolidays] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // List of years from 5 years ago to 5 years in the future
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
            console.error("Fetch all holidays error:", err);
            const errMsg = err.response?.data?.message || err.message || "Failed to fetch holidays.";
            setError(errMsg);
            toast.error(errMsg);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchHolidays();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    // Filter holidays for the selected year and sort by date
    const filteredHolidays = allHolidays
        .filter(h => {
            if (!h.date) return false;
            return new Date(h.date).getFullYear() === selectedYear;
        })
        .sort((a, b) => new Date(a.date) - new Date(b.date));

    return ReactDOM.createPortal(
        <>
            {/* Backdrop */}
            <div 
                className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50 transition-opacity" 
                onClick={onClose} 
            />

            {/* Modal Container */}
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl mx-4 max-h-[85vh] bg-white rounded-[24px] shadow-2xl z-50 flex flex-col overflow-hidden border border-gray-150 animate-scaleIn select-none">
                
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#2D79C7] to-[#1F5EA8] text-white">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-[10px] bg-white/20 flex items-center justify-center">
                            <CalendarDays className="w-4.5 h-4.5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black leading-tight">Company Holidays</h3>
                            <p className="text-white/60 text-[11px] font-semibold mt-0.5">List of all scheduled holidays</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="text-white/80 hover:text-white p-1.5 hover:bg-white/10 rounded-[8px] transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Sub-header with Year Selector */}
                <div className="px-6 py-3 border-b border-gray-100 bg-[#F8FAFC] flex items-center justify-between gap-4">
                    <span className="text-xs font-bold text-gray-500">Filter by Year</span>
                    <div className="relative">
                        <select 
                            value={selectedYear} 
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                            className="appearance-none bg-white border border-gray-200 rounded-[10px] pl-3 pr-8 py-1.5 text-xs font-bold text-gray-700 focus:outline-none focus:border-[#2D79C7] focus:ring-1 focus:ring-[#2D79C7] transition-all cursor-pointer shadow-sm"
                        >
                            {years.map(yr => (
                                <option key={yr} value={yr}>{yr}</option>
                            ))}
                        </select>
                        <Calendar className="w-3 h-3 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-white min-h-[250px]">
                    {loading ? (
                        /* Loading state skeletons */
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
                        /* Error state */
                        <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-500 border border-rose-100 flex items-center justify-center">
                                <AlertCircle className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="text-gray-800 font-bold text-sm">Failed to load holidays</h4>
                                <p className="text-gray-400 text-xs mt-1 max-w-xs">{error}</p>
                            </div>
                            <button 
                                onClick={fetchHolidays}
                                className="px-4 py-1.5 bg-[#2D79C7] hover:bg-[#1F5EA8] text-white text-xs font-bold rounded-[10px] shadow-sm hover:shadow transition-all cursor-pointer"
                            >
                                Retry
                            </button>
                        </div>
                    ) : filteredHolidays.length === 0 ? (
                        /* Empty state */
                        <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-blue-50 text-[#2D79C7] border border-blue-100 flex items-center justify-center">
                                <CalendarDays className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="text-gray-800 font-bold text-sm">No holidays scheduled</h4>
                                <p className="text-gray-400 text-xs mt-1">There are no holidays registered for the year {selectedYear}.</p>
                            </div>
                        </div>
                    ) : (
                        /* Data state: responsive 2-column layout */
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filteredHolidays.map((h, idx) => {
                                const d = h.date ? new Date(h.date) : new Date();
                                const dayNum = d.getDate();
                                const monthName = MONTH_NAMES[d.getMonth()];
                                const monthAbbr = MONTH_ABBR[d.getMonth()];
                                const formattedType = displayType(h.type);

                                return (
                                    <div 
                                        key={h._id || idx}
                                        className="flex items-center gap-4 py-3 px-4 border border-gray-100 rounded-[14px] hover:border-blue-100 hover:bg-[#F8FAFC]/50 transition-all duration-200 shadow-sm"
                                    >
                                        <div className="w-11 h-11 rounded-[12px] bg-gradient-to-br from-[#2D79C7]/10 to-[#1F5EA8]/10 border border-[#2D79C7]/15 flex flex-col items-center justify-center shrink-0">
                                            <span className="text-[#2D79C7] text-[11px] font-bold uppercase leading-none">
                                                {monthAbbr}
                                            </span>
                                            <span className="text-[#1E1E1E] text-[15px] font-extrabold leading-tight mt-0.5">
                                                {dayNum}
                                            </span>
                                        </div>
                                        <div className="flex-1 min-w-0 text-left">
                                            <span className="text-[#1E1E1E] text-[13px] font-semibold block truncate" title={h.title}>
                                                {h.title || "Holiday"}
                                            </span>
                                            <span className="text-gray-400 text-[11px] mt-0.5 block font-medium">
                                                {h.day || ""}
                                            </span>
                                        </div>
                                        <span 
                                            className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border shrink-0 ${typeColors[formattedType] || "bg-gray-50 text-gray-600 border-gray-100"}`}
                                        >
                                            {formattedType}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </>,
        document.body
    );
};

export default HolidaysModal;
