import { useEffect, useRef, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { logoutUser } from "../services/auth.service";

/* ─────────────────────────────────────────────
   STRICT SESSION & INACTIVITY CONTROLLER
   1. 30 Minutes Inactivity -> Instant Auto Logout
   2. Laptop Closed (Sleep / Suspend) -> Instant Auto Logout
   3. Tab / Browser Closed -> Session Terminated
   4. No warning popup / modal rendered
───────────────────────────────────────────── */
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes inactivity
const SLEEP_THRESHOLD_MS    = 10 * 1000;      // 10 sec heartbeat gap means laptop lid closed / system slept

const ACTIVITY_EVENTS = [
    "mousemove", "mousedown", "keydown",
    "touchstart", "scroll", "click", "wheel"
];

const SessionTimeoutManager = () => {
    const { user, logout } = useAuth();
    const lastHeartbeatRef = useRef(Date.now());
    const isLoggingOutRef = useRef(false);

    const doLogout = useCallback(async (reason = "inactivity") => {
        if (isLoggingOutRef.current) return;
        isLoggingOutRef.current = true;

        try {
            sessionStorage.clear();
            localStorage.removeItem("user");
            localStorage.removeItem("token");
        } catch (e) {}

        try {
            await logoutUser();
        } catch (e) {}

        logout();

        if (window.location.pathname !== "/login") {
            window.location.replace("/login");
        }
    }, [logout]);

    useEffect(() => {
        if (!user) {
            isLoggingOutRef.current = false;
            return;
        }

        // Initialize timestamps
        const now = Date.now();
        lastHeartbeatRef.current = now;
        if (!sessionStorage.getItem("lastActivity")) {
            sessionStorage.setItem("lastActivity", now.toString());
        }

        // Throttled activity listener
        let lastRecorded = now;
        const recordActivity = () => {
            const cur = Date.now();
            if (cur - lastRecorded > 1000) {
                lastRecorded = cur;
                sessionStorage.setItem("lastActivity", cur.toString());
            }
        };

        ACTIVITY_EVENTS.forEach((ev) => window.addEventListener(ev, recordActivity, { passive: true }));

        // Heartbeat interval:
        // 1. Checks 30-min inactivity timeout
        // 2. Detects laptop lid closed / computer sleep
        const intervalId = setInterval(() => {
            const currentTime = Date.now();
            const timeSinceLastHeartbeat = currentTime - lastHeartbeatRef.current;
            lastHeartbeatRef.current = currentTime;

            // LAPTOP CLOSED / SLEEP DETECTED:
            // If the heartbeat gap is greater than 10 seconds (for a 2-second interval),
            // the device was put to sleep / lid closed.
            if (timeSinceLastHeartbeat > SLEEP_THRESHOLD_MS) {
                doLogout("sleep");
                return;
            }

            // 30 MIN INACTIVITY DETECTED:
            const lastActivity = parseInt(sessionStorage.getItem("lastActivity") || currentTime.toString(), 10);
            if (currentTime - lastActivity >= INACTIVITY_TIMEOUT_MS) {
                doLogout("inactivity");
                return;
            }
        }, 2000);

        // Visibilitychange check: when laptop lid is reopened or tab becomes visible
        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                const currentTime = Date.now();
                const lastActivity = parseInt(sessionStorage.getItem("lastActivity") || currentTime.toString(), 10);
                const timeSinceLastHeartbeat = currentTime - lastHeartbeatRef.current;

                if (timeSinceLastHeartbeat > SLEEP_THRESHOLD_MS || currentTime - lastActivity >= INACTIVITY_TIMEOUT_MS) {
                    doLogout("resume_from_sleep");
                }
            }
        };
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            clearInterval(intervalId);
            ACTIVITY_EVENTS.forEach((ev) => window.removeEventListener(ev, recordActivity));
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [user, doLogout]);

    return null;
};

export default SessionTimeoutManager;
