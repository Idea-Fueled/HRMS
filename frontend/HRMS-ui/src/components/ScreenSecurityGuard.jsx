import React, { useState, useEffect, useRef, useMemo } from "react";
import ReactDOM from "react-dom";
import { ShieldAlert, Lock } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";

/**
 * Enterprise Screen Security Guard
 * TOGGLE: Set ENABLE_SCREEN_SECURITY = true to re-enable anytime.
 */
const ENABLE_SCREEN_SECURITY = false;

export const ScreenSecurityGuard = () => {
    if (!ENABLE_SCREEN_SECURITY) {
        return null; // Disabled as requested
    }

    const { user } = useAuth();
    const [isCaptureBlocked, setIsCaptureBlocked] = useState(false);
    const lastToastRef = useRef(0);
    const blockTimeoutRef = useRef(null);

    const triggerScreenshotBlock = (msg = "Screen capture is restricted on Idea Fueled HRMS.") => {
        setIsCaptureBlocked(true);

        // Wipe clipboard
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText("").catch(() => {});
        }

        const now = Date.now();
        if (now - lastToastRef.current > 2500) {
            lastToastRef.current = now;
            toast.error(msg);
        }

        // Auto-dismiss after 2.5 seconds or on click
        clearTimeout(blockTimeoutRef.current);
        blockTimeoutRef.current = setTimeout(() => {
            setIsCaptureBlocked(false);
        }, 2500);
    };

    // Watermark text composed of user info
    const watermarkText = useMemo(() => {
        if (!user) return "Idea Fueled HRMS • CONFIDENTIAL";
        const name = user.fullName || `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Idea Fueled User";
        const empId = user.employeeId ? `[${user.employeeId}]` : "";
        const email = user.email || "";
        return `${name} ${empId} • ${email} • CONFIDENTIAL`;
    }, [user]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            const isCtrlOrMeta = e.ctrlKey || e.metaKey;
            const keyLower = e.key ? e.key.toLowerCase() : "";

            // 1. Detect PrintScreen
            if (e.key === "PrintScreen" || e.keyCode === 44 || e.code === "PrintScreen") {
                e.preventDefault();
                triggerScreenshotBlock();
                return;
            }

            // 2. Windows Snipping Tool (Win + Shift + S) or Mac Snipping (Cmd + Shift + S / 3 / 4 / 5)
            if ((e.metaKey || e.ctrlKey) && e.shiftKey && (keyLower === "s" || keyLower === "3" || keyLower === "4" || keyLower === "5")) {
                e.preventDefault();
                e.stopPropagation();
                triggerScreenshotBlock();
                return;
            }

            // 3. Block Print: Ctrl+P / Cmd+P
            if (isCtrlOrMeta && keyLower === "p") {
                e.preventDefault();
                e.stopPropagation();
                triggerScreenshotBlock("Printing and document export is disabled for security.");
                return;
            }

            // 4. Block Save Webpage: Ctrl+S / Cmd+S
            if (isCtrlOrMeta && !e.shiftKey && keyLower === "s") {
                e.preventDefault();
                e.stopPropagation();
                return;
            }

            // 5. Block View Source: Ctrl+U
            if (isCtrlOrMeta && keyLower === "u") {
                e.preventDefault();
                e.stopPropagation();
                return;
            }

            // 6. Block DevTools: F12
            if (e.key === "F12") {
                e.preventDefault();
                e.stopPropagation();
                return;
            }

            // 7. Block DevTools: Ctrl+Shift+I / J / C
            if (isCtrlOrMeta && e.shiftKey && ["i", "j", "c"].includes(keyLower)) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }
        };

        const handleKeyUp = (e) => {
            if (e.key === "PrintScreen" || e.keyCode === 44 || e.code === "PrintScreen") {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText("").catch(() => {});
                }
                triggerScreenshotBlock();
            }
        };

        // Right-Click (Context Menu) Protection
        const handleContextMenu = (e) => {
            const isInput = e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.isContentEditable);
            if (!isInput) {
                e.preventDefault();
            }
        };

        // Prevent Dragging Images
        const handleDragStart = (e) => {
            if (e.target && e.target.tagName === "IMG") {
                e.preventDefault();
            }
        };

        window.addEventListener("keydown", handleKeyDown, true);
        window.addEventListener("keyup", handleKeyUp, true);
        window.addEventListener("contextmenu", handleContextMenu);
        window.addEventListener("dragstart", handleDragStart);

        return () => {
            clearTimeout(blockTimeoutRef.current);
            window.removeEventListener("keydown", handleKeyDown, true);
            window.removeEventListener("keyup", handleKeyUp, true);
            window.removeEventListener("contextmenu", handleContextMenu);
            window.removeEventListener("dragstart", handleDragStart);
        };
    }, []);

    // SVG Repeating Watermark Pattern
    const watermarkSvg = useMemo(() => {
        const escaped = watermarkText.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        return `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='380' height='220'>
            <text x='20' y='120' transform='rotate(-22 190 110)' fill='%2364748b' opacity='0.055' font-family='sans-serif' font-size='12.5' font-weight='700' letter-spacing='0.5'>
                ${escaped}
            </text>
        </svg>`;
    }, [watermarkText]);

    return (
        <>
            {/* 1. Subtle Enterprise Watermark Pattern (Non-blocking, spans the viewport) */}
            <div
                className="fixed inset-0 pointer-events-none select-none z-[9990]"
                style={{
                    backgroundImage: `url("${watermarkSvg}")`,
                    backgroundRepeat: "repeat",
                }}
                aria-hidden="true"
            />

            {/* 2. Screenshot Protection Shield (Triggers ONLY when screenshot is taken) */}
            {isCaptureBlocked &&
                ReactDOM.createPortal(
                    <div
                        onClick={() => setIsCaptureBlocked(false)}
                        className="fixed inset-0 z-[9999999] bg-[#0A1020]/98 backdrop-blur-3xl text-white flex flex-col items-center justify-center p-6 text-center select-none cursor-pointer"
                        style={{ animation: "shieldIn 0.15s ease-out forwards" }}
                    >
                        <style>{`
                            @keyframes shieldIn {
                                from { opacity: 0; transform: scale(0.98); }
                                to   { opacity: 1; transform: scale(1); }
                            }
                        `}</style>
                        <div className="w-18 h-18 rounded-3xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-5 text-rose-500 shadow-xl shadow-rose-500/10">
                            <ShieldAlert className="w-9 h-9" />
                        </div>
                        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mb-2">
                            Screenshot Restricted
                        </h2>
                        <p className="text-xs sm:text-sm text-slate-400 max-w-md font-medium leading-relaxed mb-6">
                            Screenshots and screen capture shortcuts are disabled on this portal for data protection.
                        </p>
                        <div className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/15 rounded-xl text-xs font-bold text-white border border-white/10 transition-all shadow-sm">
                            <Lock className="w-3.5 h-3.5 text-blue-400" />
                            <span>Click anywhere to close</span>
                        </div>
                    </div>,
                    document.body
                )}
        </>
    );
};

export default ScreenSecurityGuard;
