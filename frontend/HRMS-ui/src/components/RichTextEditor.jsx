import React, { useRef, useEffect, useState, useCallback } from "react";
import {
    Bold,
    Italic,
    Underline,
    Strikethrough,
    List,
    ListOrdered,
    Link2,
    Unlink,
    Quote,
    Heading1,
    Heading2,
    RemoveFormatting,
    Undo2,
    Redo2,
    Code,
    X,
    ExternalLink,
} from "lucide-react";

/**
 * RichTextEditor - Modern, elegant, zero-dependency rich text editor for HRMS emails.
 * Supports bold, italic, underline, strikethrough, headings, lists, blockquotes,
 * inline links, code blocks, clean undo/redo, and active formatting indicator.
 */
const RichTextEditor = ({
    value = "",
    onChange,
    placeholder = "Write your email here...",
    minHeight = "160px",
    maxHeight = "360px",
    className = "",
}) => {
    const editorRef = useRef(null);
    const isInternalUpdate = useRef(false);
    const [activeFormats, setActiveFormats] = useState({
        bold: false,
        italic: false,
        underline: false,
        strikeThrough: false,
        insertUnorderedList: false,
        insertOrderedList: false,
        blockquote: false,
        h1: false,
        h2: false,
    });

    // Link insertion modal state
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
    const [linkUrl, setLinkUrl] = useState("");
    const [linkText, setLinkText] = useState("");
    const savedRangeRef = useRef(null);

    // Sync external value to innerHTML when not actively typing
    useEffect(() => {
        if (!editorRef.current) return;
        if (isInternalUpdate.current) {
            isInternalUpdate.current = false;
            return;
        }

        const currentHtml = editorRef.current.innerHTML;
        const normalizedExternal = value || "";
        if (currentHtml !== normalizedExternal) {
            editorRef.current.innerHTML = normalizedExternal;
        }
    }, [value]);

    // Check active format states under caret
    const checkActiveFormats = useCallback(() => {
        if (!editorRef.current || typeof document === "undefined") return;
        try {
            const isBold = document.queryCommandState("bold");
            const isItalic = document.queryCommandState("italic");
            const isUnderline = document.queryCommandState("underline");
            const isStrike = document.queryCommandState("strikeThrough");
            const isUl = document.queryCommandState("insertUnorderedList");
            const isOl = document.queryCommandState("insertOrderedList");

            // Check if selection is within H1, H2, or blockquote
            let isH1 = false;
            let isH2 = false;
            let isQuote = false;
            const sel = window.getSelection();
            if (sel && sel.anchorNode) {
                let node = sel.anchorNode;
                while (node && node !== editorRef.current) {
                    const tag = node.nodeName?.toLowerCase();
                    if (tag === "h1") isH1 = true;
                    if (tag === "h2") isH2 = true;
                    if (tag === "blockquote") isQuote = true;
                    node = node.parentNode;
                }
            }

            setActiveFormats({
                bold: isBold,
                italic: isItalic,
                underline: isUnderline,
                strikeThrough: isStrike,
                insertUnorderedList: isUl,
                insertOrderedList: isOl,
                h1: isH1,
                h2: isH2,
                blockquote: isQuote,
            });
        } catch (e) {}
    }, []);

    // Handle typing and content updates
    const handleInput = () => {
        if (!editorRef.current) return;
        isInternalUpdate.current = true;
        const html = editorRef.current.innerHTML;
        // Clean empty tags to empty string
        const cleanHtml =
            html === "<p><br></p>" || html === "<br>" || html === "<p></p>" || html === "<div><br></div>"
                ? ""
                : html;
        if (onChange) {
            onChange(cleanHtml);
        }
        checkActiveFormats();
    };

    const execCommand = (command, val = null) => {
        if (!editorRef.current) return;
        editorRef.current.focus();
        document.execCommand(command, false, val);
        handleInput();
        checkActiveFormats();
    };

    // Toggle Heading (H1 / H2 / Paragraph)
    const toggleHeading = (tag) => {
        if (!editorRef.current) return;
        editorRef.current.focus();
        const currentTag = document.queryCommandValue("formatBlock")?.toLowerCase();
        if (currentTag === tag || (tag === "h1" && activeFormats.h1) || (tag === "h2" && activeFormats.h2)) {
            document.execCommand("formatBlock", false, "<p>");
        } else {
            document.execCommand("formatBlock", false, `<${tag}>`);
        }
        handleInput();
        checkActiveFormats();
    };

    // Toggle Blockquote
    const toggleBlockquote = () => {
        if (!editorRef.current) return;
        editorRef.current.focus();
        if (activeFormats.blockquote) {
            document.execCommand("formatBlock", false, "<p>");
        } else {
            document.execCommand("formatBlock", false, "<blockquote>");
        }
        handleInput();
        checkActiveFormats();
    };

    // Toggle Inline Code
    const formatCode = () => {
        if (!editorRef.current) return;
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return;
        const range = sel.getRangeAt(0);
        const selectedText = range.toString();

        if (selectedText) {
            const codeEl = document.createElement("code");
            codeEl.className = "px-1.5 py-0.5 text-[11px] font-mono bg-slate-200/80 text-rose-700 rounded border border-slate-300";
            codeEl.textContent = selectedText;
            range.deleteContents();
            range.insertNode(codeEl);
            // Move cursor after the inserted code
            range.setStartAfter(codeEl);
            range.setEndAfter(codeEl);
            sel.removeAllRanges();
            sel.addRange(range);
            handleInput();
        } else {
            execCommand("fontName", "monospace");
        }
    };

    // Open Link Insertion Dialog
    const openLinkModal = () => {
        if (!editorRef.current) return;
        editorRef.current.focus();
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
            savedRangeRef.current = sel.getRangeAt(0).cloneRange();
            const text = sel.toString().trim();
            setLinkText(text);
        } else {
            savedRangeRef.current = null;
            setLinkText("");
        }
        setLinkUrl("");
        setIsLinkModalOpen(true);
    };

    // Apply inserted link
    const handleInsertLink = (e) => {
        e.preventDefault();
        if (!linkUrl.trim()) return;

        let formattedUrl = linkUrl.trim();
        if (!/^https?:\/\//i.test(formattedUrl) && !/^mailto:/i.test(formattedUrl)) {
            formattedUrl = "https://" + formattedUrl;
        }

        if (editorRef.current) {
            editorRef.current.focus();
            const sel = window.getSelection();

            if (savedRangeRef.current) {
                sel.removeAllRanges();
                sel.addRange(savedRangeRef.current);

                const displayText = linkText.trim() || savedRangeRef.current.toString().trim() || formattedUrl;

                const link = document.createElement("a");
                link.href = formattedUrl;
                link.target = "_blank";
                link.rel = "noopener noreferrer";
                link.className = "text-[#2D79C7] underline font-medium hover:text-[#1E60A8] cursor-pointer";
                link.textContent = displayText;

                savedRangeRef.current.deleteContents();
                savedRangeRef.current.insertNode(link);

                // Place caret immediately after the inserted link
                const newRange = document.createRange();
                newRange.setStartAfter(link);
                newRange.collapse(true);
                sel.removeAllRanges();
                sel.addRange(newRange);
            } else {
                document.execCommand("createLink", false, formattedUrl);
            }

            handleInput();
        }

        setIsLinkModalOpen(false);
        setLinkUrl("");
        setLinkText("");
        savedRangeRef.current = null;
    };

    const handleUnlink = () => {
        execCommand("unlink");
    };

    // Handle keyboard shortcuts (Ctrl+B, Ctrl+I, Ctrl+U, Ctrl+K)
    const handleKeyDown = (e) => {
        if (e.ctrlKey || e.metaKey) {
            if (e.key === "b" || e.key === "B") {
                e.preventDefault();
                execCommand("bold");
            } else if (e.key === "i" || e.key === "I") {
                e.preventDefault();
                execCommand("italic");
            } else if (e.key === "u" || e.key === "U") {
                e.preventDefault();
                execCommand("underline");
            } else if (e.key === "k" || e.key === "K") {
                e.preventDefault();
                openLinkModal();
            }
        }
    };

    // Check if editor is currently empty for displaying placeholder
    const isEditorEmpty = !value || value.trim() === "" || value === "<p><br></p>" || value === "<br>";

    return (
        <div
            className={`border border-slate-200 rounded-xl bg-white shadow-2xs focus-within:ring-2 focus-within:ring-[#2D79C7]/20 focus-within:border-[#2D79C7] transition-all flex flex-col relative ${className}`}
        >
            {/* Rich Text Toolbar */}
            <div className="flex items-center flex-wrap gap-1 px-3 py-2 bg-slate-50/90 border-b border-slate-200 text-slate-700 select-none rounded-t-xl">
                {/* Undo / Redo */}
                <div className="flex items-center gap-0.5">
                    <button
                        type="button"
                        onClick={() => execCommand("undo")}
                        title="Undo (Ctrl+Z)"
                        className="p-1.5 rounded-lg hover:bg-slate-200/80 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                    >
                        <Undo2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={() => execCommand("redo")}
                        title="Redo (Ctrl+Y)"
                        className="p-1.5 rounded-lg hover:bg-slate-200/80 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                    >
                        <Redo2 className="w-3.5 h-3.5" />
                    </button>
                </div>

                <div className="w-[1px] h-4 bg-slate-300 mx-1" />

                {/* Headings */}
                <div className="flex items-center gap-0.5">
                    <button
                        type="button"
                        onClick={() => toggleHeading("h1")}
                        title="Large Heading (H1)"
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            activeFormats.h1
                                ? "bg-blue-100 text-[#2D79C7] font-bold"
                                : "hover:bg-slate-200/80 text-slate-600 hover:text-slate-900"
                        }`}
                    >
                        <Heading1 className="w-3.5 h-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={() => toggleHeading("h2")}
                        title="Medium Heading (H2)"
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            activeFormats.h2
                                ? "bg-blue-100 text-[#2D79C7] font-bold"
                                : "hover:bg-slate-200/80 text-slate-600 hover:text-slate-900"
                        }`}
                    >
                        <Heading2 className="w-3.5 h-3.5" />
                    </button>
                </div>

                <div className="w-[1px] h-4 bg-slate-300 mx-1" />

                {/* Text Styling: Bold, Italic, Underline, Strikethrough */}
                <div className="flex items-center gap-0.5">
                    <button
                        type="button"
                        onClick={() => execCommand("bold")}
                        title="Bold (Ctrl+B)"
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            activeFormats.bold
                                ? "bg-blue-100 text-[#2D79C7] font-bold"
                                : "hover:bg-slate-200/80 text-slate-600 hover:text-slate-900"
                        }`}
                    >
                        <Bold className="w-3.5 h-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={() => execCommand("italic")}
                        title="Italic (Ctrl+I)"
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            activeFormats.italic
                                ? "bg-blue-100 text-[#2D79C7] font-bold"
                                : "hover:bg-slate-200/80 text-slate-600 hover:text-slate-900"
                        }`}
                    >
                        <Italic className="w-3.5 h-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={() => execCommand("underline")}
                        title="Underline (Ctrl+U)"
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            activeFormats.underline
                                ? "bg-blue-100 text-[#2D79C7] font-bold"
                                : "hover:bg-slate-200/80 text-slate-600 hover:text-slate-900"
                        }`}
                    >
                        <Underline className="w-3.5 h-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={() => execCommand("strikeThrough")}
                        title="Strikethrough"
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            activeFormats.strikeThrough
                                ? "bg-blue-100 text-[#2D79C7] font-bold"
                                : "hover:bg-slate-200/80 text-slate-600 hover:text-slate-900"
                        }`}
                    >
                        <Strikethrough className="w-3.5 h-3.5" />
                    </button>
                </div>

                <div className="w-[1px] h-4 bg-slate-300 mx-1" />

                {/* Lists & Quotes */}
                <div className="flex items-center gap-0.5">
                    <button
                        type="button"
                        onClick={() => execCommand("insertUnorderedList")}
                        title="Bullet List"
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            activeFormats.insertUnorderedList
                                ? "bg-blue-100 text-[#2D79C7] font-bold"
                                : "hover:bg-slate-200/80 text-slate-600 hover:text-slate-900"
                        }`}
                    >
                        <List className="w-3.5 h-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={() => execCommand("insertOrderedList")}
                        title="Numbered List"
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            activeFormats.insertOrderedList
                                ? "bg-blue-100 text-[#2D79C7] font-bold"
                                : "hover:bg-slate-200/80 text-slate-600 hover:text-slate-900"
                        }`}
                    >
                        <ListOrdered className="w-3.5 h-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={toggleBlockquote}
                        title="Quote Block"
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            activeFormats.blockquote
                                ? "bg-blue-100 text-[#2D79C7] font-bold"
                                : "hover:bg-slate-200/80 text-slate-600 hover:text-slate-900"
                        }`}
                    >
                        <Quote className="w-3.5 h-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={formatCode}
                        title="Inline Code / Monospace"
                        className="p-1.5 rounded-lg hover:bg-slate-200/80 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                    >
                        <Code className="w-3.5 h-3.5" />
                    </button>
                </div>

                <div className="w-[1px] h-4 bg-slate-300 mx-1" />

                {/* Links */}
                <div className="flex items-center gap-0.5">
                    <button
                        type="button"
                        onClick={openLinkModal}
                        title="Insert Link (Ctrl+K)"
                        className="p-1.5 rounded-lg hover:bg-slate-200/80 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                    >
                        <Link2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={handleUnlink}
                        title="Remove Link"
                        className="p-1.5 rounded-lg hover:bg-slate-200/80 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                    >
                        <Unlink className="w-3.5 h-3.5" />
                    </button>
                </div>

                <div className="w-[1px] h-4 bg-slate-300 mx-1" />

                {/* Clear Formatting */}
                <button
                    type="button"
                    onClick={() => execCommand("removeFormat")}
                    title="Clear Formatting"
                    className="p-1.5 rounded-lg hover:bg-slate-200/80 text-slate-600 hover:text-slate-900 transition-colors cursor-pointer ml-auto"
                >
                    <RemoveFormatting className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* Editable Content Area */}
            <div className="relative flex-1 cursor-text" onClick={() => editorRef.current?.focus()}>
                {/* Floating Placeholder */}
                {isEditorEmpty && (
                    <div className="absolute top-3.5 left-4 text-xs sm:text-sm text-slate-400 pointer-events-none select-none font-sans">
                        {placeholder}
                    </div>
                )}

                <div
                    ref={editorRef}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={handleInput}
                    onKeyUp={checkActiveFormats}
                    onMouseUp={checkActiveFormats}
                    onKeyDown={handleKeyDown}
                    style={{ minHeight, maxHeight }}
                    className="p-4 text-xs sm:text-sm text-slate-800 focus:outline-none overflow-y-auto leading-relaxed font-sans [&>h1]:text-lg [&>h1]:font-bold [&>h1]:my-2 [&>h1]:text-slate-900 [&>h2]:text-base [&>h2]:font-bold [&>h2]:my-1.5 [&>h2]:text-slate-800 [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:my-1.5 [&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:my-1.5 [&>blockquote]:border-l-4 [&>blockquote]:border-[#2D79C7] [&>blockquote]:pl-3 [&>blockquote]:my-2 [&>blockquote]:italic [&>blockquote]:text-slate-600 [&>blockquote]:bg-slate-50 [&>blockquote]:py-1 [&>a]:text-[#2D79C7] [&>a]:underline [&>a]:font-medium hover:[&>a]:text-[#1E60A8]"
                />
            </div>

            {/* Inline Insert Link Modal */}
            {isLinkModalOpen && (
                <div className="absolute z-30 inset-0 bg-black/20 backdrop-blur-2xs flex items-center justify-center p-3 rounded-xl">
                    <form
                        onSubmit={handleInsertLink}
                        className="bg-white rounded-xl shadow-xl border border-slate-200 p-4 w-full max-w-sm space-y-3 animate-in fade-in zoom-in-95 duration-150"
                    >
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                                <Link2 className="w-3.5 h-3.5 text-[#2D79C7]" />
                                <span>Insert Link</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsLinkModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        <div className="space-y-2 text-xs">
                            <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                    Display Text (optional)
                                </label>
                                <input
                                    type="text"
                                    placeholder="Text to display..."
                                    value={linkText}
                                    onChange={(e) => setLinkText(e.target.value)}
                                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2D79C7]/20 focus:border-[#2D79C7]"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                    Link URL <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    autoFocus
                                    placeholder="https://example.com or mailto:user@site.com"
                                    value={linkUrl}
                                    onChange={(e) => setLinkUrl(e.target.value)}
                                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2D79C7]/20 focus:border-[#2D79C7]"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                                type="button"
                                onClick={() => setIsLinkModalOpen(false)}
                                className="px-3 py-1.5 rounded-lg text-slate-500 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={!linkUrl.trim()}
                                className="flex items-center gap-1.5 px-4 py-1.5 bg-[#2D79C7] hover:bg-[#2263a6] disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer transition-all"
                            >
                                <ExternalLink className="w-3 h-3" />
                                <span>Add Link</span>
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default RichTextEditor;
