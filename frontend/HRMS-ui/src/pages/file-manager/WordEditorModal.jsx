import React, { useState, useEffect, useRef } from "react";
import {
    FileText, Save, Download, X, Loader2, Bold, Italic, Underline,
    Heading1, Heading2, Heading3, List, ListOrdered, AlignLeft,
    AlignCenter, AlignRight, AlignJustify, Undo, Redo, Table, Quote
} from "lucide-react";
import { toast } from "sonner";
import { updateDocumentContent } from "../../services/file.service";

const WordEditorModal = ({ file, isOpen, onClose, onSaveSuccess }) => {
    const editorRef = useRef(null);
    const [saving, setSaving] = useState(false);
    const [wordCount, setWordCount] = useState(0);

    useEffect(() => {
        if (!isOpen || !file) return;

        const initialContent =
            typeof file.documentContent === "string" && file.documentContent.trim()
                ? file.documentContent
                : `<h2>${file.name?.replace(/\.[^/.]+$/, "")}</h2><p>Start drafting your document here...</p>`;

        if (editorRef.current) {
            editorRef.current.innerHTML = initialContent;
            updateMetrics();
        }
    }, [isOpen, file]);

    if (!isOpen || !file) return null;

    const updateMetrics = () => {
        if (!editorRef.current) return;
        const text = editorRef.current.innerText || "";
        const words = text.trim().split(/\s+/).filter(Boolean).length;
        setWordCount(words);
    };

    const executeCommand = (command, value = null) => {
        document.execCommand(command, false, value);
        if (editorRef.current) {
            editorRef.current.focus();
            updateMetrics();
        }
    };

    const handleInsertTable = () => {
        const tableHtml = `
            <table style="width:100%; border-collapse: collapse; margin: 16px 0;" border="1">
                <thead>
                    <tr style="background:#f1f5f9;">
                        <th style="padding: 8px; border: 1px solid #cbd5e1;">Header 1</th>
                        <th style="padding: 8px; border: 1px solid #cbd5e1;">Header 2</th>
                        <th style="padding: 8px; border: 1px solid #cbd5e1;">Header 3</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="padding: 8px; border: 1px solid #cbd5e1;">Item</td>
                        <td style="padding: 8px; border: 1px solid #cbd5e1;">Description</td>
                        <td style="padding: 8px; border: 1px solid #cbd5e1;">Status</td>
                    </tr>
                </tbody>
            </table>
            <p><br></p>
        `;
        document.execCommand("insertHTML", false, tableHtml);
        updateMetrics();
    };

    const handleSave = async () => {
        if (!editorRef.current) return;
        setSaving(true);
        const htmlContent = editorRef.current.innerHTML;

        try {
            const res = await updateDocumentContent(file._id, htmlContent);
            if (res.data?.success) {
                toast.success("Word Document saved successfully!");
                if (onSaveSuccess) onSaveSuccess(res.data.file);
            } else {
                toast.error(res.data?.message || "Failed to save document.");
            }
        } catch (err) {
            console.error("Save Document Error:", err);
            toast.error(err.response?.data?.message || "Failed to save document.");
        } finally {
            setSaving(false);
        }
    };

    const handleDownloadDoc = () => {
        if (!editorRef.current) return;
        const content = editorRef.current.innerHTML;
        const header =
            "<html xmlns:o='urn:schemas-microsoft-com:office:office' " +
            "xmlns:w='urn:schemas-microsoft-com:office:word' " +
            "xmlns='http://www.w3.org/TR/REC-html40'>" +
            "<head><meta charset='utf-8'><title>" + file.name + "</title>" +
            "<style>body{font-family:Arial,sans-serif;font-size:12pt;line-height:1.6;color:#1e293b;}table{border-collapse:collapse;width:100%;}td,th{border:1px solid #94a3b8;padding:8px;}</style>" +
            "</head><body>" + content + "</body></html>";

        const blob = new Blob(["\ufeff", header], { type: "application/msword" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name?.replace(/\.[^/.]+$/, "") + ".doc";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-2 sm:p-4 animate-fadeIn select-none">
            <div className="bg-white border border-gray-150 rounded-[22px] shadow-2xl w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden">
                {/* Ribbon Header */}
                <div className="px-6 py-3.5 border-b border-gray-200 bg-white flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3 min-w-0 pr-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200/80 text-[#2D79C7] flex items-center justify-center shrink-0 shadow-2xs">
                            <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm font-black text-slate-800 truncate">
                                    {file.name}
                                </h3>
                                <span className="px-2 py-0.5 rounded-md bg-blue-100 text-[#2D79C7] text-[10px] font-bold uppercase tracking-wider font-mono">
                                    Word Doc
                                </span>
                            </div>
                            <p className="text-[11px] font-semibold text-slate-400 mt-0.5">
                                Rich Document Editor • {wordCount} words
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            type="button"
                            onClick={handleDownloadDoc}
                            title="Export as Word document"
                            className="px-3 py-2 rounded-xl text-xs font-bold text-slate-700 border border-gray-200 bg-white hover:bg-gray-50 flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                        >
                            <Download className="w-3.5 h-3.5 text-slate-500" />
                            <span className="hidden sm:inline">Export Doc</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#2D79C7] hover:bg-[#1F5EA8] shadow-sm shadow-[#2D79C7]/30 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>Saving...</span>
                                </>
                            ) : (
                                <>
                                    <Save className="w-3.5 h-3.5" />
                                    <span>Save Document</span>
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

                {/* Formatting Toolbar */}
                <div className="px-6 py-2 bg-slate-50 border-b border-gray-200 flex flex-wrap items-center gap-1.5 text-xs shrink-0 select-none">
                    <button
                        type="button"
                        onClick={() => executeCommand("formatBlock", "<h1>")}
                        title="Heading 1"
                        className="p-1.5 hover:bg-white border border-transparent hover:border-gray-200 rounded-lg text-slate-700 font-bold cursor-pointer"
                    >
                        <Heading1 className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => executeCommand("formatBlock", "<h2>")}
                        title="Heading 2"
                        className="p-1.5 hover:bg-white border border-transparent hover:border-gray-200 rounded-lg text-slate-700 font-bold cursor-pointer"
                    >
                        <Heading2 className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => executeCommand("formatBlock", "<p>")}
                        title="Normal Paragraph"
                        className="px-2 py-1 hover:bg-white border border-transparent hover:border-gray-200 rounded-lg text-slate-700 font-bold text-[11px] cursor-pointer"
                    >
                        Paragraph
                    </button>

                    <span className="text-gray-300 mx-1">|</span>

                    <button
                        type="button"
                        onClick={() => executeCommand("bold")}
                        title="Bold (Ctrl+B)"
                        className="p-1.5 hover:bg-white border border-transparent hover:border-gray-200 rounded-lg text-slate-700 font-bold cursor-pointer"
                    >
                        <Bold className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => executeCommand("italic")}
                        title="Italic (Ctrl+I)"
                        className="p-1.5 hover:bg-white border border-transparent hover:border-gray-200 rounded-lg text-slate-700 font-bold cursor-pointer"
                    >
                        <Italic className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => executeCommand("underline")}
                        title="Underline (Ctrl+U)"
                        className="p-1.5 hover:bg-white border border-transparent hover:border-gray-200 rounded-lg text-slate-700 font-bold cursor-pointer"
                    >
                        <Underline className="w-4 h-4" />
                    </button>

                    <span className="text-gray-300 mx-1">|</span>

                    <button
                        type="button"
                        onClick={() => executeCommand("insertUnorderedList")}
                        title="Bullet List"
                        className="p-1.5 hover:bg-white border border-transparent hover:border-gray-200 rounded-lg text-slate-700 font-bold cursor-pointer"
                    >
                        <List className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => executeCommand("insertOrderedList")}
                        title="Numbered List"
                        className="p-1.5 hover:bg-white border border-transparent hover:border-gray-200 rounded-lg text-slate-700 font-bold cursor-pointer"
                    >
                        <ListOrdered className="w-4 h-4" />
                    </button>

                    <span className="text-gray-300 mx-1">|</span>

                    <button
                        type="button"
                        onClick={() => executeCommand("justifyLeft")}
                        title="Align Left"
                        className="p-1.5 hover:bg-white border border-transparent hover:border-gray-200 rounded-lg text-slate-700 font-bold cursor-pointer"
                    >
                        <AlignLeft className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => executeCommand("justifyCenter")}
                        title="Align Center"
                        className="p-1.5 hover:bg-white border border-transparent hover:border-gray-200 rounded-lg text-slate-700 font-bold cursor-pointer"
                    >
                        <AlignCenter className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => executeCommand("justifyRight")}
                        title="Align Right"
                        className="p-1.5 hover:bg-white border border-transparent hover:border-gray-200 rounded-lg text-slate-700 font-bold cursor-pointer"
                    >
                        <AlignRight className="w-4 h-4" />
                    </button>

                    <span className="text-gray-300 mx-1">|</span>

                    <button
                        type="button"
                        onClick={handleInsertTable}
                        title="Insert Table"
                        className="flex items-center gap-1 px-2 py-1 bg-white border border-gray-200 hover:border-gray-300 rounded-lg text-slate-700 font-bold text-[11px] cursor-pointer"
                    >
                        <Table className="w-3.5 h-3.5 text-[#2D79C7]" />
                        <span>Table</span>
                    </button>
                </div>

                {/* Document Canvas (Paper View) */}
                <div className="flex-1 overflow-auto bg-slate-100/60 p-4 sm:p-8 flex justify-center">
                    <div
                        ref={editorRef}
                        contentEditable
                        onInput={updateMetrics}
                        className="w-full max-w-3xl min-h-[700px] bg-white rounded-lg border border-gray-200 shadow-md p-8 sm:p-12 text-slate-800 text-[13.5px] leading-relaxed focus:outline-none focus:ring-1 focus:ring-blue-200"
                        style={{ fontFamily: "'Google Sans', 'Calibri', Arial, sans-serif" }}
                    />
                </div>
            </div>
        </div>
    );
};

export default WordEditorModal;
