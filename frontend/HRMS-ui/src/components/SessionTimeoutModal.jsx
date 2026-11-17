import { useEffect, useRef, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { logoutUser } from "../services/auth.service";

/* ─────────────────────────────────────────────
   30-MINUTE STRICT SESSION TIMEOUT (NO POPUP)
   - Automatically logs out user after 30 minutes.
   - No "Still there?" prompt or warning modal.
───────────────────────────────────────────── */
const SESSION_DURATION_MS = 30 * 60 * 1000; // 30 minutes

const SessionTimeoutManager = () => {
    const { user, logout } = useAuth();
    const timerRef = useRef(null);

    const doLogout = useCallback(async () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        try {
            await logoutUser();
        } catch {
            /* ignore */
        }
        logout();
        if (window.location.pathname !== "/login") {
            window.location.href = "/login";
        }
    }, [logout]);

    useEffect(() => {
        if (!user) {
            if (timerRef.current) clearTimeout(timerRef.current);
            return;
        }

        // Read login timestamp from sessionStorage
        let loginTime = parseInt(sessionStorage.getItem("loginTime"), 10);
        if (!loginTime || isNaN(loginTime)) {
            loginTime = Date.now();
            sessionStorage.setItem("loginTime", loginTime.toString());
        }

        const elapsed = Date.now() - loginTime;
        const remaining = SESSION_DURATION_MS - elapsed;

        if (remaining <= 0) {
            doLogout();
            return;
        }

        // Set exact timer to log out when 30 minutes elapse
        timerRef.current = setTimeout(() => {
            doLogout();
        }, remaining);

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [user, doLogout]);

    // No warning popup/modal rendered at all
    return null;
};

export default SessionTimeoutManager;
