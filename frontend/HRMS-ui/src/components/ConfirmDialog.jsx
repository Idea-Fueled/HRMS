import React, { useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { X, AlertTriangle, Trash2, Info } from "lucide-react";

export const ConfirmDialog = ({
    isOpen,
    title = "Confirm Action",
    message = "Are you sure you want to proceed?",
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    onConfirm,
    onCancel,
    type = "danger" // 'danger' | 'warning' | 'info'
}) => {
    const backdropRef = useRef(null);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Escape") onCancel();
        };
        if (isOpen) {
            document.addEventListener("keydown", handleKeyDown);
            // Prevent body scroll when open
            document.body.style.overflow = "hidden";
        }
        return () => {
            document.removeEventListener("keydown", handleKeyDown);
            document.body.style.overflow = "unset";
        };
    }, [isOpen, onCancel]);

    if (!isOpen) return null;

    const handleBackdropClick = (e) => {
        if (e.target === backdropRef.current) {
            onCancel();
        }
    };

    // Style helper based on type
    const getTheme = () => {
        switch (type) {
            case "danger":
                return {
                    bgIcon: "bg-rose-50 border-rose-100 text-rose-600",
                    btnConfirm: "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20",
                    icon: Trash2
                };
            case "warning":
                return {
                    bgIcon: "bg-amber-50 border-amber-100 text-amber-600",
                    btnConfirm: "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20",
                    icon: AlertTriangle
                };
            case "info":
            default:
                return {
                    bgIcon: "bg-blue-50 border-blue-100 text-[#2D79C7]",
                    btnConfirm: "bg-[#2D79C7] hover:bg-[#1F5EA8] text-white shadow-blue-500/20",
                    icon: Info
                };
        }
    };

    const theme = getTheme();
    const IconComponent = theme.icon;

    return ReactDOM.createPortal(
        <div
            ref={backdropRef}
            onClick={handleBackdropClick}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-[999] flex items-center justify-center p-4 select-none animate-fadeIn"
        >
            <style>{`
                @keyframes scaleIn {
                    from { opacity: 0; transform: scale(0.95) translateY(10px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
                .animate-scaleIn {
                    animation: scaleIn 0.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                }
            `}</style>
            <div
                className="bg-white rounded-[24px] border border-gray-100 shadow-2xl max-w-sm w-full overflow-hidden animate-scaleIn"
            >
                {/* Header / Top padding */}
                <div className="flex items-start justify-between px-6 pt-6">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-[14px] border flex items-center justify-center shrink-0 ${theme.bgIcon}`}>
                            <IconComponent className="w-5 h-5" strokeWidth={2.5} />
                        </div>
                        <div className="text-left">
                            <h3 className="text-[#1E1E1E] text-[15px] font-black tracking-wide leading-tight">
                                {title}
                            </h3>
                        </div>
                    </div>
                    <button
                        onClick={onCancel}
                        className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Body message */}
                <div className="px-6 py-4 text-left">
                    <p className="text-gray-500 text-xs font-semibold leading-relaxed font-sans">
                        {message}
                    </p>
                </div>

                {/* Footer Buttons */}
                <div className="px-6 pb-6 pt-2 flex items-center gap-3">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="flex-1 py-2.5 text-xs font-bold text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-[12px] transition-all cursor-pointer text-center"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className={`flex-1 py-2.5 text-xs font-bold rounded-[12px] shadow-md transition-all active:scale-95 cursor-pointer text-center ${theme.btnConfirm}`}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ConfirmDialog;
