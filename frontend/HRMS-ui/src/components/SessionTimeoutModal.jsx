import React, { useState, useEffect, useRef, useCallback } from "react";
import ReactDOM from "react-dom";
import { ShieldAlert, LogOut, RefreshCw, Clock } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { logoutUser } from "../services/auth.service";

/* ─────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────── */
const IDLE_TIMEOUT_MS   = 25 * 60 * 1000; // 25 min → show warning
const GRACE_PERIOD_MS   = 5  * 60 * 1000; // 5  min → grace before auto-logout
const COUNTDOWN_SEC     = 5  * 60;        // 300 seconds for countdown display

/* Activity events to reset the idle timer */
const ACTIVITY_EVENTS = [
    "mousemove", "mousedown", "keydown",
    "touchstart", "scroll", "click", "wheel",
];

/* ─────────────────────────────────────────────
   SESSION TIMEOUT MODAL
───────────────────────────────────────────── */
const SessionTimeoutModal = ({ countdown, onStayLoggedIn, onLogout }) => {
    const minutes = Math.floor(countdown / 60);
    const seconds = countdown % 60;
    const pct = (countdown / COUNTDOWN_SEC) * 100;

    const radius = 28;
    const circ = 2 * Math.PI * radius;
    const strokeDash = (pct / 100) * circ;

    return ReactDOM.createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{ background: "rgba(10,16,32,0.70)", backdropFilter: "blur(8px)" }}
        >
            <div
                className="bg-white rounded-[28px] shadow-2xl w-full max-w-sm overflow-hidden"
                style={{ animation: "stModalIn 0.28s cubic-bezier(0.34,1.56,0.64,1) forwards" }}
            >
                <style>{`
                    @keyframes stModalIn {
                        from { opacity: 0; transform: scale(0.88) translateY(20px); }
                        to   { opacity: 1; transform: scale(1) translateY(0); }
                    }
                    @keyframes stPulse {
                        0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.25); }
                        50%       { box-shadow: 0 0 0 10px rgba(239,68,68,0); }
                    }
                `}</style>

                {/* Gradient Header */}
                <div
                    className="px-6 py-7 text-center"
                    style={{ background: "linear-gradient(135deg, #1e3a5f 0%, #2D79C7 60%, #1F5EA8 100%)" }}
                >
                    {/* SVG Ring Countdown */}
                    <div className="flex items-center justify-center mb-4">
                        <div className="relative w-20 h-20">
                            <svg className="w-20 h-20 -rotate-90" viewBox="0 0 72 72">
                                <circle cx="36" cy="36" r={radius} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="5" />
                                <circle
                                    cx="36" cy="36" r={radius}
                                    fill="none"
                                    stroke={countdown <= 60 ? "#f87171" : "#60a5fa"}
                                    strokeWidth="5"
                                    strokeLinecap="round"
                                    strokeDasharray={circ}
                                    strokeDashoffset={circ - strokeDash}
                                    style={{ transition: "stroke-dashoffset 1s linear, stroke 0.5s" }}
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-white text-[11px] font-bold">
                                    {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-center gap-2 mb-1">
                        <ShieldAlert className="w-4 h-4 text-amber-300" />
                        <p className="text-white/70 text-[11px] font-bold uppercase tracking-widest">Session Warning</p>
                    </div>
                    <h2 className="text-white text-[20px] font-extrabold tracking-tight">
                        Still there?
                    </h2>
                    <p className="text-white/65 text-[12px] mt-1.5 leading-relaxed max-w-[240px] mx-auto">
                        Your session will expire due to inactivity. You'll be logged out automatically.
                    </p>
                </div>

                {/* Actions */}
                <div className="px-6 py-5 flex flex-col gap-3">
                    <button
                        onClick={onStayLoggedIn}
                        className="w-full flex items-center justify-center gap-2 bg-[#2D79C7] hover:bg-[#1F5EA8] active:scale-[0.98] text-white font-bold text-[13px] py-3 rounded-[14px] transition-all duration-200 shadow-md cursor-pointer"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Stay Logged In
                    </button>
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center justify-center gap-2 bg-gray-50 hover:bg-red-50 active:scale-[0.98] text-gray-500 hover:text-red-600 font-bold text-[13px] py-3 rounded-[14px] border border-gray-200 hover:border-red-200 transition-all duration-200 cursor-pointer"
                    >
                        <LogOut className="w-3.5 h-3.5" />
                        Logout Now
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

/* ─────────────────────────────────────────────
   IDLE TIMER MANAGER (mount once in App)
───────────────────────────────────────────── */
const SessionTimeoutManager = () => {
    const { user, logout } = useAuth();
    const [showModal, setShowModal]     = useState(false);
    const [countdown, setCountdown]     = useState(COUNTDOWN_SEC);

    const idleTimerRef      = useRef(null);
    const graceTimerRef     = useRef(null);
    const countdownRef      = useRef(null);

    const clearAllTimers = useCallback(() => {
        clearTimeout(idleTimerRef.current);
        clearTimeout(graceTimerRef.current);
        clearInterval(countdownRef.current);
    }, []);

    const doLogout = useCallback(async () => {
        clearAllTimers();
        setShowModal(false);
        try { await logoutUser(); } catch { /* ignore */ }
        logout();
    }, [clearAllTimers, logout]);

    const startGraceCountdown = useCallback(() => {
        setCountdown(COUNTDOWN_SEC);
        setShowModal(true);

        // Tick countdown every second
        countdownRef.current = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(countdownRef.current);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        // Auto-logout after grace period
        graceTimerRef.current = setTimeout(() => {
            doLogout();
        }, GRACE_PERIOD_MS);
    }, [doLogout]);

    const resetIdleTimer = useCallback(() => {
        if (!user) return;
        clearAllTimers();
        setShowModal(false);
        setCountdown(COUNTDOWN_SEC);

        idleTimerRef.current = setTimeout(() => {
            startGraceCountdown();
        }, IDLE_TIMEOUT_MS);
    }, [user, clearAllTimers, startGraceCountdown]);

    /* Attach / detach activity listeners */
    useEffect(() => {
        if (!user) {
            clearAllTimers();
            setShowModal(false);
            return;
        }

        resetIdleTimer();
        ACTIVITY_EVENTS.forEach((ev) => window.addEventListener(ev, resetIdleTimer, { passive: true }));

        return () => {
            clearAllTimers();
            ACTIVITY_EVENTS.forEach((ev) => window.removeEventListener(ev, resetIdleTimer));
        };
    }, [user, resetIdleTimer, clearAllTimers]);

    const handleStayLoggedIn = useCallback(() => {
        resetIdleTimer();
    }, [resetIdleTimer]);

    if (!user || !showModal) return null;

    return (
        <SessionTimeoutModal
            countdown={countdown}
            onStayLoggedIn={handleStayLoggedIn}
            onLogout={doLogout}
        />
    );
};

export default SessionTimeoutManager;
