import React from "react";
import { LayoutGrid, List, Search, ChevronLeft, ChevronRight, Inbox, ArrowUpDown, ChevronUp, ChevronDown } from "lucide-react";

/* ─────────────────────────────────────────────
   VIEW TOGGLE [ List View ] [ Card View ]
───────────────────────────────────────────── */
export const ViewToggle = ({ view, onViewChange }) => {
    return (
        <div className="inline-flex p-1 bg-gray-100 rounded-[12px] border border-gray-200/50 shadow-inner select-none shrink-0">
            <button
                type="button"
                onClick={() => onViewChange("list")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[9px] text-xs font-bold transition-all cursor-pointer ${
                    view === "list"
                        ? "bg-white text-[#2D79C7] shadow-sm"
                        : "text-gray-400 hover:text-gray-600"
                }`}
            >
                <List className="w-3.5 h-3.5" />
                <span>List View</span>
            </button>
            <button
                type="button"
                onClick={() => onViewChange("card")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[9px] text-xs font-bold transition-all cursor-pointer ${
                    view === "card"
                        ? "bg-white text-[#2D79C7] shadow-sm"
                        : "text-gray-400 hover:text-gray-600"
                }`}
            >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Card View</span>
            </button>
        </div>
    );
};

/* ─────────────────────────────────────────────
   SKELETON LOADER
───────────────────────────────────────────── */
export const SkeletonLoader = ({ type = "table", rows = 5 }) => {
    if (type === "stat") {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 animate-pulse">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-gray-100 border border-gray-200/50 rounded-[16px] p-5 h-24" />
                ))}
            </div>
        );
    }

    if (type === "card") {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-pulse">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="bg-white border border-gray-200/60 rounded-[20px] p-5 h-64 flex flex-col justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gray-150 rounded-full" />
                            <div className="space-y-2 flex-1">
                                <div className="h-3.5 bg-gray-150 rounded w-2/3" />
                                <div className="h-2.5 bg-gray-100 rounded w-1/2" />
                            </div>
                        </div>
                        <div className="space-y-2 mt-4">
                            <div className="h-2.5 bg-gray-100 rounded w-full" />
                            <div className="h-2.5 bg-gray-100 rounded w-5/6" />
                        </div>
                        <div className="h-3 bg-gray-150 rounded w-1/3 mt-4" />
                    </div>
                ))}
            </div>
        );
    }

    // Default: table row skeletons
    return (
        <div className="space-y-3.5 w-full animate-pulse p-4">
            <div className="h-8 bg-gray-150 rounded-[8px] w-full mb-4" />
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="h-6 bg-gray-100 rounded-[6px] w-full" />
            ))}
        </div>
    );
};

/* ─────────────────────────────────────────────
   EMPTY STATE CARD
───────────────────────────────────────────── */
export const EmptyState = ({ message = "No records found", description = "Try adjusting your filters or search terms." }) => {
    return (
        <div className="bg-white border border-[#E5E7EB] rounded-[20px] shadow-[0_1px_4px_rgba(0,0,0,0.01)] py-12 px-6 text-center flex flex-col items-center justify-center max-w-lg mx-auto select-none my-6 hover:shadow-[0_4px_16px_rgba(45,121,199,0.03)] transition-all duration-300">
            <div className="w-16 h-16 rounded-full bg-gray-50 border border-gray-150 flex items-center justify-center text-gray-300 shadow-inner mb-4">
                <Inbox className="w-7 h-7 stroke-[1.5]" />
            </div>
            <h4 className="text-[#1E1E1E] text-[14px] font-black">{message}</h4>
            <p className="text-gray-400 text-xs mt-1.5 leading-relaxed max-w-[280px]">
                {description}
            </p>
        </div>
    );
};

export const SearchBar = ({ value, onChange, placeholder = "Search records..." }) => {
    return (
        <div className="relative w-full md:w-72 flex items-center">
            <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
                type="text"
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="w-full pl-11 pr-10 h-[38px] bg-white border border-gray-200 rounded-[12px] text-xs text-[#1E1E1E] focus:outline-none focus:border-[#2D79C7] focus:ring-1 focus:ring-[#2D79C7] transition-all shadow-inner placeholder-gray-400 flex items-center"
            />
            {value && (
                <button
                    type="button"
                    onClick={() => onChange("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-[10px] font-bold cursor-pointer"
                >
                    Clear
                </button>
            )}
        </div>
    );
};

/* ─────────────────────────────────────────────
   PAGINATION CONTROLS
───────────────────────────────────────────── */
export const Pagination = ({ total, limit, currentPage, onPageChange }) => {
    const totalPages = Math.ceil(total / limit) || 1;
    if (totalPages <= 1) return null;

    const startIdx = (currentPage - 1) * limit + 1;
    const endIdx = Math.min(currentPage * limit, total);

    return (
        <div className="px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#F3F4F6] text-xs font-bold text-gray-500 select-none">
            <span>
                Showing <span className="text-gray-800">{startIdx}</span> to <span className="text-gray-800">{endIdx}</span> of <span className="text-gray-800">{total}</span> entries
            </span>
            <div className="flex items-center gap-1">
                <button
                    disabled={currentPage === 1}
                    onClick={() => onPageChange(currentPage - 1)}
                    className="p-1.5 border border-gray-200 rounded-[8px] hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: totalPages }).map((_, idx) => {
                    const pageNum = idx + 1;
                    return (
                        <button
                            key={pageNum}
                            onClick={() => onPageChange(pageNum)}
                            className={`w-7.5 h-7.5 rounded-[8px] border text-center transition-all cursor-pointer ${
                                currentPage === pageNum
                                    ? "bg-[#2D79C7] border-[#2D79C7] text-white"
                                    : "border-gray-200 hover:bg-gray-50 text-gray-600"
                            }`}
                        >
                            {pageNum}
                        </button>
                    );
                })}
                <button
                    disabled={currentPage === totalPages}
                    onClick={() => onPageChange(currentPage + 1)}
                    className="p-1.5 border border-gray-200 rounded-[8px] hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

/* ─────────────────────────────────────────────
   SORTABLE COLUMN HEADER
───────────────────────────────────────────── */
export const SortHeader = ({ label, field, sortField, sortDir, onSort }) => {
    const isSorted = sortField === field;
    return (
        <button
            type="button"
            onClick={() => onSort(field)}
            className="flex items-center gap-1 hover:text-gray-700 transition-colors uppercase tracking-wider text-left font-extrabold focus:outline-none whitespace-nowrap"
        >
            <span>{label}</span>
            {isSorted ? (
                sortDir === "asc" ? <ChevronUp className="w-3.5 h-3.5 text-[#2D79C7]" /> : <ChevronDown className="w-3.5 h-3.5 text-[#2D79C7]" />
            ) : (
                <ArrowUpDown className="w-3.5 h-3.5 opacity-40 hover:opacity-100" />
            )}
        </button>
    );
};

/* ─────────────────────────────────────────────
   SHARED AVATAR WITH INITIALS FALLBACK
───────────────────────────────────────────── */
export const Avatar = ({ src, name = "User", size = "w-9 h-9", textSize = "text-[10px]", className = "" }) => {
    const initials = (name || "User")
        .trim()
        .split(/\s+/)
        .map(n => n[0] || "")
        .join("")
        .substring(0, 2)
        .toUpperCase();

    const palette = [
        "bg-blue-100 text-[#2D79C7] border-blue-200",
        "bg-emerald-100 text-emerald-700 border-emerald-200",
        "bg-indigo-100 text-indigo-700 border-indigo-200",
        "bg-amber-100 text-amber-700 border-amber-200",
        "bg-rose-100 text-rose-700 border-rose-200",
        "bg-violet-100 text-violet-700 border-violet-200",
        "bg-cyan-100 text-cyan-700 border-cyan-200",
    ];

    const charCodeSum = (name || "User")
        .split("")
        .reduce((sum, char) => sum + char.charCodeAt(0), 0);
    const color = palette[charCodeSum % palette.length];

    if (src && src.trim() !== "") {
        return (
            <img 
                src={src} 
                alt={name} 
                className={`${size} rounded-full object-cover border-2 border-white shadow-sm shrink-0 ${className}`} 
            />
        );
    }

    return (
        <div className={`${size} rounded-full ${color} flex items-center justify-center font-black ${textSize} border-2 border-white shadow-sm shrink-0 select-none ${className}`}>
            {initials}
        </div>
    );
};
