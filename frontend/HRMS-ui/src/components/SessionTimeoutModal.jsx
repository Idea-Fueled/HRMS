import { useEffect, useRef, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { logoutUser } from "../services/auth.service";

/* ─────────────────────────────────────────────
   1-HOUR STRICT AUTO LOGOUT CONTROLLER
   - Exactly 60 Minutes (1 Hour) from Login Time
   - Logs out automatically after 1 hour, whether active or inactive
   - Safe in background tabs (no sleep detection, tab switching will NOT log out)
───────────────────────────────────────────── */
const SESSION_DURATION_MS = 60 * 60 * 1000; // 1 hour (60 minutes)

const SessionTimeoutManager = () => {
    const { user, logout } = useAuth();
    const isLoggingOutRef = useRef(false);

    const doLogout = useCallback(async (reason = "1_hour_timeout") => {
        if (isLoggingOutRef.current) return;
        isLoggingOutRef.current = true;

        try {
            sessionStorage.clear();
            localStorage.removeItem("user");
            localStorage.removeItem("token");
            localStorage.removeItem("loginTime");
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

        // Ensure loginTime is set and synchronized
        let loginTimeStr = sessionStorage.getItem("loginTime") || localStorage.getItem("loginTime");
        if (!loginTimeStr) {
            loginTimeStr = Date.now().toString();
            sessionStorage.setItem("loginTime", loginTimeStr);
            localStorage.setItem("loginTime", loginTimeStr);
        }

        const checkTimeout = () => {
            const currentLoginTime = parseInt(
                sessionStorage.getItem("loginTime") || localStorage.getItem("loginTime") || "0",
                10
            );
            if (!currentLoginTime) return;

            const elapsed = Date.now() - currentLoginTime;
            if (elapsed >= SESSION_DURATION_MS) {
                doLogout("session_expired_1hr");
            }
        };

        // Immediate check on mount
        checkTimeout();

        // Check periodically every 15 seconds
        const intervalId = setInterval(checkTimeout, 15000);

        // When user switches back to this tab, check if 1 hour has elapsed
        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                checkTimeout();
            }
        };
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            clearInterval(intervalId);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [user, doLogout]);

    return null;
};

export default SessionTimeoutManager;
