import React from "react";
import ReactDOM from "react-dom";
import { AlertTriangle, Trash2, X } from "lucide-react";

/**
 * ConfirmDialog — replaces all window.confirm() calls.
 *
 * Props:
 *  isOpen        — boolean
 *  title         — string
 *  message       — string
 *  confirmLabel  — string  (default "Delete")
 *  cancelLabel   — string  (default "Cancel")
 *  variant       — "danger" | "warning" | "info"  (default "danger")
 *  onConfirm     — () => void
 *  onCancel      — () => void
 */
const ConfirmDialog = ({
    isOpen,
    title = "Are you sure?",
    message = "This action cannot be undone.",
    confirmLabel,
    confirmText,
    cancelLabel = "Cancel",
    variant,
    type,
    onConfirm,
    onCancel,
    onClose,
    loading = false,
}) => {
    if (!isOpen) return null;

    const handleCancel = onCancel || onClose;
    const resolvedConfirmLabel = confirmLabel || confirmText || "Delete";
    const resolvedVariant = variant || type || "danger";

    const variantStyles = {
        danger:  { icon: Trash2,         iconBg: "bg-rose-50 border-rose-100",    iconColor: "text-rose-500",   btn: "bg-rose-600 hover:bg-rose-700 shadow-rose-200" },
        warning: { icon: AlertTriangle,   iconBg: "bg-amber-50 border-amber-100",  iconColor: "text-amber-500",  btn: "bg-amber-500 hover:bg-amber-600 shadow-amber-200" },
        info:    { icon: AlertTriangle,   iconBg: "bg-blue-50 border-blue-100",    iconColor: "text-[#2D79C7]",  btn: "bg-[#2D79C7] hover:bg-[#1F5EA8] shadow-blue-200" },
    };

    const { icon: Icon, iconBg, iconColor, btn } = variantStyles[resolvedVariant] || variantStyles.danger;

    return ReactDOM.createPortal(
        <>
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[1200]" onClick={handleCancel} />
            <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1201] w-full max-w-sm mx-4">
                <div className="bg-white rounded-[20px] border border-gray-100 shadow-2xl overflow-hidden select-none">
                    {/* Header */}
                    <div className="flex items-start justify-between px-6 pt-6 pb-0">
                        <div className={`w-11 h-11 rounded-full border flex items-center justify-center shrink-0 ${iconBg}`}>
                            <Icon className={`w-5 h-5 ${iconColor}`} strokeWidth={2} />
                        </div>
                        <button
                            onClick={handleCancel}
                            className="p-1 hover:bg-gray-100 rounded-[8px] text-gray-400 hover:text-gray-600 transition-colors cursor-pointer -mt-1"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="px-6 pt-4 pb-6">
                        <h3 className="text-[#1E1E1E] text-[15px] font-black leading-tight">{title}</h3>
                        <p className="text-gray-400 text-[13px] mt-1.5 leading-relaxed">{message}</p>
                    </div>

                    {/* Footer */}
                    <div className="px-6 pb-6 flex gap-3">
                        <button
                            onClick={handleCancel}
                            disabled={loading}
                            className="flex-1 py-2.5 text-xs font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-[12px] transition-colors cursor-pointer disabled:opacity-50"
                        >
                            {cancelLabel}
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={loading}
                            className={`flex-1 py-2.5 text-xs font-bold text-white rounded-[12px] transition-all cursor-pointer shadow-md disabled:opacity-60 disabled:cursor-not-allowed ${btn}`}
                        >
                            {loading ? "Please wait..." : resolvedConfirmLabel}
                        </button>
                    </div>
                </div>
            </div>
        </>,
        document.body
    );
};

export default ConfirmDialog;
