import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import {
    X, Cake, PartyPopper, UserPlus, Send,
    Sparkles, Mail, Loader2, CheckCircle2, MessageSquare
} from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "./SharedComponents";
import { sendCelebrationWish } from "../services/dashboard.service";

const SUGGESTIONS = {
    birthday: [
        "Wishing you a very Happy Birthday! Have a fantastic day and a wonderful year ahead! 🎂🎉",
        "Happy Birthday! May your year be filled with success, laughter, and great memories! 🥳✨",
        "Warmest birthday wishes! Wishing you happiness, good health, and big achievements! 🎈🌟"
    ],
    anniversary: [
        "Happy Work Anniversary! Thank you for your incredible energy, dedication, and contributions! 🏆🎉",
        "Congratulations on reaching this milestone! Truly proud to work alongside you! 🚀👏",
        "Happy Anniversary! Cheers to all your accomplishments and many more to come! 🥂✨"
    ],
    new_joinee: [
        "A very warm welcome to Idea Fueled! We are thrilled to have you join our team! 🚀🌟",
        "Welcome aboard! Wishing you an awesome, fulfilling, and rewarding journey with us! 🎉🤝",
        "Welcome to the team! Looking forward to collaborating and achieving great things together! ✨👏"
    ]
};

const CelebrationWishModal = ({ isOpen, onClose, data, onWishSent }) => {
    const [message, setMessage] = useState("");
    const [sending, setSending] = useState(false);

    const recipient = data?.recipient;
    const eventType = data?.eventType || "birthday";

    useEffect(() => {
        if (isOpen) {
            setMessage("");
            setSending(false);
        }
    }, [isOpen, recipient]);

    if (!isOpen || !recipient) return null;

    const suggestions = SUGGESTIONS[eventType] || SUGGESTIONS.birthday;

    const getConfig = () => {
        switch (eventType) {
            case "birthday":
                return {
                    icon: Cake,
                    iconColor: "text-[#2D79C7]",
                    iconBg: "bg-blue-50 border-blue-100",
                    title: "Send Birthday Wish",
                    subtitle: `To ${recipient.fullName}`
                };
            case "anniversary":
                return {
                    icon: PartyPopper,
                    iconColor: "text-amber-600",
                    iconBg: "bg-amber-50 border-amber-100",
                    title: `Work Anniversary${recipient.years ? ` (${recipient.years} Yr${recipient.years > 1 ? "s" : ""})` : ""}`,
                    subtitle: `To ${recipient.fullName}`
                };
            case "new_joinee":
            default:
                return {
                    icon: UserPlus,
                    iconColor: "text-teal-600",
                    iconBg: "bg-teal-50 border-teal-100",
                    title: "Welcome to the Team",
                    subtitle: `To ${recipient.fullName}`
                };
        }
    };

    const config = getConfig();
    const HeaderIcon = config.icon;

    const handleSend = async (e) => {
        e?.preventDefault();
        try {
            setSending(true);
            const res = await sendCelebrationWish({
                recipientId: recipient._id,
                eventType,
                message: message.trim(),
                meta: { years: recipient.years }
            });

            if (res.data?.success) {
                toast.success(res.data.message || `Wish sent to ${recipient.fullName}! 🎉`);
                if (onWishSent) {
                    onWishSent(recipient._id);
                }
                onClose();
            } else {
                toast.error(res.data?.message || "Failed to send wish.");
            }
        } catch (err) {
            console.error("Failed to send wish:", err);
            toast.error(err.response?.data?.message || "Failed to send wish. Please try again.");
        } finally {
            setSending(false);
        }
    };

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 select-none">
            {/* Full-screen Dark Backdrop */}
            <div
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[9999] transition-opacity animate-fadeIn"
                onClick={onClose}
            />

            {/* Modal Dialog Box */}
            <div
                className="relative z-[10000] w-full max-w-md bg-white rounded-[16px] shadow-2xl border border-slate-200 overflow-hidden text-left flex flex-col transform transition-all animate-fadeIn"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Clean Header */}
                <div className="px-4 sm:px-5 py-3.5 sm:py-4 border-b border-slate-150 flex items-center justify-between bg-white">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-lg ${config.iconBg} ${config.iconColor} border flex items-center justify-center shrink-0`}>
                            <HeaderIcon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-sm font-bold text-slate-800 tracking-tight truncate">{config.title}</h3>
                            <p className="text-[11px] text-slate-400 font-medium truncate">{config.subtitle}</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={sending}
                        className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Close"
                    >
                        <X className="w-4.5 h-4.5 stroke-[2.2]" />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-4 sm:p-5 space-y-4">
                    {/* Recipient Snippet */}
                    <div className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200/70 rounded-xl">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <Avatar
                                name={recipient.fullName}
                                src={recipient.profilePicture || null}
                                size="w-8 h-8"
                                textSize="text-[10px]"
                            />
                            <div className="min-w-0">
                                <h4 className="text-xs font-bold text-slate-800 truncate leading-tight">
                                    {recipient.fullName}
                                </h4>
                                <p className="text-[10.5px] text-slate-400 font-medium truncate">
                                    {recipient.designation || "Colleague"}
                                </p>
                            </div>
                        </div>

                        {recipient.email && (
                            <span className="hidden sm:inline-block text-[10.5px] font-mono text-slate-400 truncate max-w-[160px]" title={recipient.email}>
                                {recipient.email}
                            </span>
                        )}
                    </div>

                    {/* Quick Suggestion Pills */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                <Sparkles className="w-3 h-3 text-[#2D79C7]" />
                                <span>Quick Suggestions</span>
                            </label>
                            <span className="text-[10px] text-slate-400">Click to insert</span>
                        </div>
                        <div className="space-y-1.5">
                            {suggestions.map((text, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setMessage(text)}
                                    className={`w-full text-left px-3 py-2 text-[11.5px] rounded-lg border transition-all cursor-pointer ${
                                        message === text
                                            ? "bg-blue-50/80 border-[#2D79C7] text-[#2D79C7] font-semibold shadow-2xs"
                                            : "bg-white border-slate-200 hover:bg-slate-50/80 text-slate-600"
                                    }`}
                                >
                                    <p className="truncate leading-normal">&ldquo;{text}&rdquo;</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Custom Message Text Area */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
                                Message
                            </label>
                            <span className="text-[10px] text-slate-400 font-mono">
                                {message.length} / 500
                            </span>
                        </div>
                        <textarea
                            rows={3}
                            maxLength={500}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Write a personal wish, or choose a suggestion above..."
                            className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#2D79C7] focus:ring-1 focus:ring-[#2D79C7] transition-all resize-none shadow-2xs leading-relaxed"
                        />
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="px-5 py-3.5 bg-slate-50/70 border-t border-slate-150 flex items-center justify-end gap-2.5">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={sending}
                        className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        onClick={handleSend}
                        disabled={sending}
                        className="px-5 py-2 bg-[#2D79C7] hover:bg-[#1F5EA8] active:scale-95 text-white text-xs font-bold rounded-lg transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                    >
                        {sending ? (
                            <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Sending...</span>
                            </>
                        ) : (
                            <>
                                <Send className="w-3.5 h-3.5" />
                                <span>Send Wish</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default CelebrationWishModal;
