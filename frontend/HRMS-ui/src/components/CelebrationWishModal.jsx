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
                    badge: "Birthday Celebration",
                    badgeCls: "bg-rose-500/20 text-white border-rose-300/40",
                    headerBg: "from-[#2D79C7] via-[#2563EB] to-[#1D4ED8]",
                    title: `Send Birthday Wishes`,
                    subtitle: `Send a celebratory note directly to ${recipient.fullName}`,
                    accentColor: "#2D79C7",
                    emoji: "🎂"
                };
            case "anniversary":
                return {
                    icon: PartyPopper,
                    badge: `Work Anniversary${recipient.years ? ` (${recipient.years} Yr${recipient.years > 1 ? "s" : ""})` : ""}`,
                    badgeCls: "bg-amber-400/20 text-white border-amber-300/40",
                    headerBg: "from-[#D97706] via-[#B45309] to-[#92400E]",
                    title: `Celebrate Work Anniversary`,
                    subtitle: `Congratulate ${recipient.fullName} on completing ${recipient.years || 1} year${(recipient.years || 1) > 1 ? "s" : ""} at Idea Fueled`,
                    accentColor: "#D97706",
                    emoji: "🏆"
                };
            case "new_joinee":
            default:
                return {
                    icon: UserPlus,
                    badge: "Welcome New Joinee",
                    badgeCls: "bg-teal-500/20 text-white border-teal-300/40",
                    headerBg: "from-[#0F766E] via-[#0D9488] to-[#115E59]",
                    title: `Welcome to the Team`,
                    subtitle: `Give ${recipient.fullName} a warm welcome to Idea Fueled`,
                    accentColor: "#0D9488",
                    emoji: "🌟"
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 select-none">
            {/* Full-screen Dark Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] transition-opacity animate-fadeIn"
                onClick={onClose}
            />

            {/* Modal Dialog Box */}
            <div
                className="relative z-[10000] w-full max-w-lg bg-white rounded-[24px] shadow-2xl border border-gray-100 overflow-hidden text-left flex flex-col transform transition-all animate-fadeIn"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header Banner */}
                <div className={`relative bg-gradient-to-br ${config.headerBg} p-6 text-white overflow-hidden`}>
                    {/* Background celebratory graphic accents */}
                    <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
                    <div className="absolute left-1/2 -top-10 w-24 h-24 bg-white/10 rounded-full blur-lg pointer-events-none" />

                    {/* Close button */}
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={sending}
                        className="absolute right-4 top-4 w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 text-white flex items-center justify-center transition-all cursor-pointer"
                        title="Close"
                    >
                        <X className="w-4 h-4" />
                    </button>

                    <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase border ${config.badgeCls}`}>
                            {config.badge}
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center text-xl shrink-0">
                            {config.emoji}
                        </div>
                        <div>
                            <h3 className="text-lg font-black leading-tight text-white">{config.title}</h3>
                            <p className="text-xs text-white/80 font-medium mt-0.5">{config.subtitle}</p>
                        </div>
                    </div>
                </div>

                {/* Modal Body */}
                <div className="p-6 space-y-5">
                    {/* Recipient Card */}
                    <div className="flex items-center justify-between p-3.5 bg-gray-50/80 border border-gray-200/60 rounded-[18px]">
                        <div className="flex items-center gap-3 min-w-0">
                            <Avatar
                                name={recipient.fullName}
                                src={recipient.profilePicture || null}
                                size="w-11 h-11"
                                textSize="text-xs"
                            />
                            <div className="min-w-0">
                                <h4 className="text-sm font-extrabold text-gray-900 truncate leading-tight">
                                    {recipient.fullName}
                                </h4>
                                <p className="text-xs text-gray-400 font-medium truncate mt-0.5">
                                    {recipient.designation || "Colleague"}
                                </p>
                            </div>
                        </div>

                        {recipient.email && (
                            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-white border border-gray-200 rounded-xl text-[11px] font-mono text-gray-600 truncate max-w-[170px]" title={recipient.email}>
                                <Mail className="w-3.5 h-3.5 text-[#2D79C7] shrink-0" />
                                <span className="truncate">{recipient.email}</span>
                            </div>
                        )}
                    </div>

                    {/* Quick Suggestion Pills */}
                    <div>
                        <div className="flex items-center gap-1.5 mb-2">
                            <Sparkles className="w-3.5 h-3.5 text-[#2D79C7]" />
                            <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                                Quick Wishes (Click to insert)
                            </label>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            {suggestions.map((text, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setMessage(text)}
                                    className={`w-full text-left p-2.5 text-xs rounded-xl border transition-all cursor-pointer ${
                                        message === text
                                            ? "bg-blue-50/70 border-[#2D79C7] text-[#2D79C7] font-semibold"
                                            : "bg-white border-gray-200/70 hover:bg-gray-50 text-gray-700"
                                    }`}
                                >
                                    <p className="line-clamp-2 leading-relaxed">&ldquo;{text}&rdquo;</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Custom Message Text Area */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                                <MessageSquare className="w-3.5 h-3.5 text-gray-500" />
                                <span>Your Custom Message</span>
                                <span className="text-gray-400 font-normal lowercase">(optional)</span>
                            </label>
                            <span className="text-[10px] text-gray-400 font-mono">
                                {message.length}/500
                            </span>
                        </div>
                        <textarea
                            rows={3}
                            maxLength={500}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Type a personal note, or leave blank to send the standard warm celebration wish..."
                            className="w-full px-3.5 py-2.5 bg-gray-50/60 border border-gray-200 rounded-2xl text-xs text-gray-800 focus:outline-none focus:border-[#2D79C7] focus:bg-white transition-all resize-none leading-relaxed"
                        />
                    </div>

                    {/* Email Delivery Note */}
                    <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl flex items-start gap-2.5 text-xs text-blue-900">
                        <Mail className="w-4 h-4 text-[#2D79C7] shrink-0 mt-0.5" />
                        <p className="text-[11px] text-blue-800 leading-relaxed">
                            Clicking <strong>Send Wish</strong> will deliver an official celebration email to{" "}
                            <span className="font-bold underline">{recipient.email || recipient.fullName}</span> and post this wish to their internal HRMS inbox.
                        </p>
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="px-6 py-4 bg-gray-50/70 border-t border-gray-100 flex items-center justify-end gap-2.5">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={sending}
                        className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-all cursor-pointer disabled:opacity-50"
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        onClick={handleSend}
                        disabled={sending}
                        className="px-5 py-2.5 bg-[#2D79C7] hover:bg-[#1F5EA8] active:scale-95 text-white text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2 shadow-sm"
                    >
                        {sending ? (
                            <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Sending Email...</span>
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
