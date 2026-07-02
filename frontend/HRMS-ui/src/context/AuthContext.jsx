import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getCurrentUser } from "../services/auth.service";

/* ─────────────────────────────────────────────
   PERMISSION MAP
   Defines exactly what each role can do.
───────────────────────────────────────────── */
const ROLE_PERMISSIONS = {
    admin: [
        "view:dashboard", "view:me", "view:my-team", "view:employees",
        "view:my-finances", "view:documents", "view:time-attendance",
        "view:payroll", "view:recruitment", "view:hire", "view:offboarding-onboarding",
        "create:employee", "edit:employee", "view:all-employees",
        "create:holiday", "edit:holiday",
        "create:announcement", "create:post", "create:poll",
        "approve:leave", "reject:leave",
        "view:org-data", "access:payroll", "access:recruitment",
        "access:hire", "access:onboarding",
    ],
    hr: [
        "view:dashboard", "view:me", "view:my-team", "view:employees",
        "view:my-finances", "view:documents", "view:time-attendance",
        "view:payroll", "view:recruitment", "view:hire", "view:offboarding-onboarding",
        "create:employee", "edit:employee", "view:all-employees",
        "create:holiday", "edit:holiday",
        "create:announcement", "create:post", "create:poll",
        "approve:leave", "reject:leave",
        "view:org-data", "access:payroll", "access:recruitment",
        "access:hire", "access:onboarding",
    ],
    manager: [
        "view:dashboard", "view:me", "view:my-team",
        "view:my-finances", "view:documents", "view:time-attendance",
        "view:team-members", "view:team-attendance", "view:team-leaves",
        "view:team-performance", "approve:leave", "reject:leave",
        "view:team-wfh",
        "create:post", "create:announcement", "create:poll",
    ],
    employee: [
        "view:dashboard", "view:me",
        "view:my-finances", "view:documents", "view:time-attendance",
        "view:own-profile", "apply:leave", "view:own-attendance",
        "clock:in-out", "submit:wfh",
        "view:announcements", "participate:poll",
        "access:own-documents", "view:own-finances",
        "create:post", "create:announcement", "create:poll",
    ],
};

/* Routes each role is allowed to visit */
export const ROLE_ALLOWED_ROUTES = {
    admin:    ["/dashboard", "/me", "/my-team", "/employees", "/my-finances", "/documents", "/time-attendance", "/payroll", "/recruitment", "/hire", "/offboarding-onboarding"],
    hr:       ["/dashboard", "/me", "/my-team", "/employees", "/my-finances", "/documents", "/time-attendance", "/payroll", "/recruitment", "/hire", "/offboarding-onboarding"],
    manager:  ["/dashboard", "/me", "/my-team", "/my-finances", "/documents", "/time-attendance"],
    employee: ["/dashboard", "/me", "/my-finances", "/documents", "/time-attendance"],
};

/* ─────────────────────────────────────────────
   CONTEXT
───────────────────────────────────────────── */
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        try { return JSON.parse(localStorage.getItem("user") || "null"); } catch { return null; }
    });
    // If we already have a cached user, we don't need to block rendering
    const [loading, setLoading] = useState(true);

    const refreshUser = useCallback(async () => {
        try {
            const res = await getCurrentUser();
            if (res.data?.success) {
                localStorage.setItem("user", JSON.stringify(res.data.user));
                setUser(res.data.user);
            } else {
                localStorage.removeItem("user");
                setUser(null);
            }
        } catch {
            // Network error — keep the cached user if present so the app stays usable
            const cached = localStorage.getItem("user");
            if (!cached) setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { refreshUser(); }, [refreshUser]);

    /** Check if the current user has a specific permission */
    const can = useCallback((permission) => {
        if (!user?.role) return false;
        const perms = ROLE_PERMISSIONS[user.role.toLowerCase()] || [];
        return perms.includes(permission);
    }, [user]);

    /** Check if the current user can access a route path */
    const canAccessRoute = useCallback((path) => {
        if (!user?.role) return false;
        const allowed = ROLE_ALLOWED_ROUTES[user.role.toLowerCase()] || [];
        // normalize: strip leading slash for comparison
        const normalize = (p) => p.replace(/^\//, "");
        const normalizedPath = normalize(path);
        return allowed.some(r => normalize(r) === normalizedPath || normalizedPath.startsWith(normalize(r) + "/"));
    }, [user]);

    const logout = useCallback(() => {
        localStorage.removeItem("user");
        setUser(null);
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, can, canAccessRoute, refreshUser, logout, setUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
    return ctx;
};

export default AuthContext;
