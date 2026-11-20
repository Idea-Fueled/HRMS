import React, { useState, useEffect } from "react";
import {
    FileSpreadsheet, Plus, Trash2, Download, Save, X, Loader2,
    CornerDownRight, Check, RefreshCw, Undo, Columns, Rows
} from "lucide-react";
import { toast } from "sonner";
import { updateDocumentContent } from "../../services/file.service";

// Helper to convert column index to Excel-like letter (0 -> A, 1 -> B, ..., 26 -> AA)
const getColLetter = (index) => {
    let letter = "";
    let temp = index;
    while (temp >= 0) {
        letter = String.fromCharCode((temp % 26) + 65) + letter;
        temp = Math.floor(temp / 26) - 1;
    }
    return letter;
};

const SpreadsheetEditorModal = ({ file, isOpen, onClose, onSaveSuccess }) => {
    const [data, setData] = useState([
        ["Title", "Category", "Amount", "Notes"],
        ["Sample Item 1", "Operations", "500", "Paid"],
        ["Sample Item 2", "Marketing", "1200", "Pending invoice"],
        ["", "", "", ""],
        ["", "", "", ""]
    ]);
    const [saving, setSaving] = useState(false);
    const [activeCell, setActiveCell] = useState({ r: 0, c: 0 });

    useEffect(() => {
        if (!isOpen || !file) return;

        if (file.documentContent && Array.isArray(file.documentContent) && file.documentContent.length > 0) {
            setData(file.documentContent);
        } else {
            setData([
                ["Title", "Category", "Amount", "Notes"],
                ["", "", "", ""],
                ["", "", "", ""],
                ["", "", "", ""],
                ["", "", "", ""]
            ]);
        }
    }, [isOpen, file]);

    if (!isOpen || !file) return null;

    const rowCount = data.length;
    const colCount = Math.max(...data.map((r) => (Array.isArray(r) ? r.length : 0)), 4);

    const handleCellChange = (r, c, value) => {
        setData((prev) => {
            const next = prev.map((row) => [...row]);
            while (next.length <= r) {
                next.push(new Array(colCount).fill(""));
            }
            while (next[r].length <= c) {
                next[r].push("");
            }
            next[r][c] = value;
            return next;
        });
    };

    const addRow = () => {
        setData((prev) => [...prev, new Array(colCount).fill("")]);
    };

    const deleteRow = (rowIndex) => {
        if (data.length <= 1) {
            toast.error("Spreadsheet must have at least one row.");
            return;
        }
        setData((prev) => prev.filter((_, idx) => idx !== rowIndex));
    };

    const addColumn = () => {
        setData((prev) => prev.map((row) => [...row, ""]));
    };

    const deleteColumn = (colIndex) => {
        if (colCount <= 1) {
            toast.error("Spreadsheet must have at least one column.");
            return;
        }
        setData((prev) => prev.map((row) => row.filter((_, idx) => idx !== colIndex)));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await updateDocumentContent(file._id, data);
            if (res.data?.success) {
                toast.success("Excel Spreadsheet saved successfully!");
                if (onSaveSuccess) onSaveSuccess(res.data.file);
            } else {
                toast.error(res.data?.message || "Failed to save spreadsheet.");
            }
        } catch (err) {
            console.error("Save Spreadsheet Error:", err);
            toast.error(err.response?.data?.message || "Failed to save spreadsheet.");
        } finally {
            setSaving(false);
        }
    };

    const handleDownloadCSV = () => {
        const csvContent =
            "data:text/csv;charset=utf-8," +
            data.map((row) => row.map((cell) => `"${(cell || "").toString().replace(/"/g, '""')}"`).join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", file.name?.replace(/\.[^/.]+$/, "") + ".csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-2 sm:p-4 animate-fadeIn select-none">
            <div className="bg-white border border-gray-150 rounded-[22px] shadow-2xl w-full max-w-6xl h-[92vh] flex flex-col overflow-hidden">
                {/* Ribbon Header */}
                <div className="px-6 py-3.5 border-b border-gray-200 bg-white flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3 min-w-0 pr-4">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-600 flex items-center justify-center shrink-0 shadow-2xs">
                            <FileSpreadsheet className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-black text-slate-800 truncate">
                                    {file.name}
                                </h3>
                                <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider font-mono">
                                    Excel Sheet
                                </span>
                            </div>
                            <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                                Interactive in-app spreadsheet • Auto-synced to Cloud
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            type="button"
                            onClick={handleDownloadCSV}
                            title="Export as CSV"
                            className="px-3 py-2 rounded-xl text-xs font-bold text-slate-700 border border-gray-200 bg-white hover:bg-gray-50 flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                        >
                            <Download className="w-3.5 h-3.5 text-slate-500" />
                            <span className="hidden sm:inline">Export CSV</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm shadow-emerald-600/30 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>Saving...</span>
                                </>
                            ) : (
                                <>
                                    <Save className="w-3.5 h-3.5" />
                                    <span>Save Sheet</span>
                                </>
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-gray-100 cursor-pointer ml-1"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Spreadsheet Toolbar */}
                <div className="px-6 py-2.5 bg-slate-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={addRow}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-gray-200 hover:border-gray-300 rounded-lg font-bold text-slate-700 shadow-2xs cursor-pointer"
                        >
                            <Plus className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Add Row</span>
                        </button>

                        <button
                            type="button"
                            onClick={addColumn}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-gray-200 hover:border-gray-300 rounded-lg font-bold text-slate-700 shadow-2xs cursor-pointer"
                        >
                            <Columns className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Add Column</span>
                        </button>

                        <span className="text-gray-300">|</span>

                        <span className="text-[11px] font-semibold text-slate-500">
                            Cell: <span className="font-mono font-bold text-slate-800">{getColLetter(activeCell.c)}{activeCell.r + 1}</span>
                        </span>
                    </div>

                    <div className="text-[11px] font-medium text-slate-400">
                        {rowCount} rows • {colCount} columns
                    </div>
                </div>

                {/* Grid Table Container */}
                <div className="flex-1 overflow-auto bg-slate-100/50 p-4">
                    <div className="inline-block min-w-full bg-white rounded-lg border border-gray-200 shadow-xs overflow-hidden">
                        <table className="border-collapse table-fixed w-full text-xs">
                            {/* Header row with column letters */}
                            <thead>
                                <tr className="bg-slate-100/80 border-b border-gray-200 text-slate-600 font-mono font-bold select-none">
                                    <th className="w-12 py-1.5 px-2 border-r border-gray-200 text-center text-[10px] bg-slate-200/60">
                                        #
                                    </th>
                                    {Array.from({ length: colCount }).map((_, cIdx) => (
                                        <th
                                            key={cIdx}
                                            className="w-40 py-1.5 px-2 border-r border-gray-200 text-center text-xs tracking-wider relative group"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="w-full text-center">{getColLetter(cIdx)}</span>
                                                {colCount > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => deleteColumn(cIdx)}
                                                        title={`Delete column ${getColLetter(cIdx)}`}
                                                        className="opacity-0 group-hover:opacity-100 text-rose-500 hover:bg-rose-50 p-0.5 rounded cursor-pointer"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>

                            {/* Data rows */}
                            <tbody>
                                {Array.from({ length: rowCount }).map((_, rIdx) => (
                                    <tr key={rIdx} className="hover:bg-blue-50/20 border-b border-gray-150">
                                        {/* Row number + delete */}
                                        <td className="w-12 py-1 px-1 bg-slate-100/80 border-r border-gray-200 text-center font-mono font-bold text-slate-500 text-[10.5px] select-none group">
                                            <div className="flex items-center justify-between">
                                                <span>{rIdx + 1}</span>
                                                {rowCount > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => deleteRow(rIdx)}
                                                        title={`Delete row ${rIdx + 1}`}
                                                        className="opacity-0 group-hover:opacity-100 text-rose-500 hover:bg-rose-50 p-0.5 rounded cursor-pointer"
                                                    >
                                                        <Trash2 className="w-2.5 h-2.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>

                                        {/* Row cells */}
                                        {Array.from({ length: colCount }).map((_, cIdx) => {
                                            const cellVal = (data[rIdx] && data[rIdx][cIdx]) || "";
                                            const isSelected = activeCell.r === rIdx && activeCell.c === cIdx;
                                            return (
                                                <td
                                                    key={cIdx}
                                                    className={`border-r border-gray-150 p-0 relative ${
                                                        isSelected ? "ring-2 ring-[#2D79C7] z-10" : ""
                                                    }`}
                                                >
                                                    <input
                                                        type="text"
                                                        value={cellVal}
                                                        onFocus={() => setActiveCell({ r: rIdx, c: cIdx })}
                                                        onChange={(e) => handleCellChange(rIdx, cIdx, e.target.value)}
                                                        className={`w-full py-2 px-2.5 bg-transparent text-xs text-slate-800 font-medium focus:outline-none ${
                                                            rIdx === 0 ? "font-bold text-slate-900 bg-slate-50/50" : ""
                                                        }`}
                                                    />
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SpreadsheetEditorModal;
