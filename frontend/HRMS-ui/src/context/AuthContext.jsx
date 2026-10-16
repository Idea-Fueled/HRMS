import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getCurrentUser } from "../services/auth.service";

/* ─────────────────────────────────────────────
   PERMISSION MAP
   Defines exactly what each role can do.
───────────────────────────────────────────── */
const ROLE_PERMISSIONS = {
    global_admin: [
        "view:dashboard", "view:me", "view:my-team", "view:employees",
        "view:my-finances", "view:documents", "view:time-attendance",
        "view:payroll", "view:recruitment", "view:hire", "view:offboarding-onboarding",
        "create:employee", "edit:employee", "view:all-employees",
        "create:holiday", "edit:holiday",
        "create:announcement", "create:post", "create:poll",
        "approve:leave", "reject:leave",
        "view:org-data", "access:payroll", "access:recruitment",
        "access:hire", "access:onboarding",
        "view:inbox", "create:email",
    ],
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
        "view:inbox", "create:email",
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
        "view:inbox", "create:email",
    ],
    manager: [
        "view:dashboard", "view:me", "view:my-team",
        "view:my-finances", "view:documents", "view:time-attendance",
        "view:team-members", "view:team-attendance", "view:team-leaves",
        "view:team-performance", "approve:leave", "reject:leave",
        "view:team-wfh",
        "create:post", "create:announcement", "create:poll",
        "view:inbox", "create:email",
    ],
    employee: [
        "view:dashboard", "view:me",
        "view:my-finances", "view:documents", "view:time-attendance",
        "view:own-profile", "apply:leave", "view:own-attendance",
        "clock:in-out", "submit:wfh",
        "view:announcements", "participate:poll",
        "access:own-documents", "view:own-finances",
        "create:post", "create:announcement", "create:poll",
        "view:inbox", "create:email",
    ],
    intern: [
        "view:dashboard", "view:me",
        "view:my-finances", "view:documents", "view:time-attendance",
        "view:own-profile", "apply:leave", "view:own-attendance",
        "clock:in-out", "submit:wfh",
        "view:announcements", "participate:poll",
        "access:own-documents", "view:own-finances",
        "create:post", "create:announcement", "create:poll",
        "view:inbox", "create:email",
    ],
};

/* Routes each role is allowed to visit */
export const ROLE_ALLOWED_ROUTES = {
    global_admin: ["/dashboard", "/me", "/inbox", "/my-team", "/employees", "/probation", "/my-finances", "/documents", "/time-attendance", "/payroll", "/recruitment", "/hire", "/hire/search-by-ai", "/offboarding-onboarding", "/assets", "/settings"],
    admin:        ["/dashboard", "/me", "/inbox", "/my-team", "/employees", "/probation", "/my-finances", "/documents", "/time-attendance", "/payroll", "/recruitment", "/offboarding-onboarding", "/settings"],
    hr:           ["/dashboard", "/me", "/inbox", "/my-team", "/employees", "/my-finances", "/documents", "/time-attendance", "/payroll", "/recruitment", "/hire", "/hire/search-by-ai", "/offboarding-onboarding", "/settings"],
    manager:      ["/dashboard", "/me", "/inbox", "/my-team", "/my-finances", "/documents", "/time-attendance", "/settings"],
    employee:     ["/dashboard", "/me", "/inbox", "/my-finances", "/documents", "/time-attendance", "/settings"],
    intern:       ["/dashboard", "/me", "/inbox", "/my-finances", "/documents", "/time-attendance", "/settings"],
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
                localStorage.removeItem("token");
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
        if (!user) return false;
        
        // Global Admins have all permissions unrestricted
        const userRole = user.role?.toLowerCase();
        if (userRole === "global_admin" || userRole === "admin") return true;
        
        // Handle admin/hr actions
        if (permission === "create:employee" || permission === "edit:employee" || permission === "view:all-employees") {
            return user.permissions?.employees !== false;
        }
        
        return false;
    }, [user]);

    /** Check if the current user can access a route path */
    const canAccessRoute = useCallback((path) => {
        if (!user) return false;

        const userRole = user.role?.toLowerCase();

        // normalize: strip leading slash and trailing slash
        const normalize = (p) => p.replace(/^\//, "").replace(/\/$/, "");
        const normPath = normalize(path);

        // Assets module is strictly accessible to Global Admin role only
        if (normPath === "assets") {
            return userRole === "global_admin";
        }

        // Hire module is strictly accessible to Global Admin and HR roles only
        if (normPath === "hire") {
            return userRole === "global_admin" || userRole === "hr";
        }

        // Global Admins and Admins have access to all other routes
        if (userRole === "global_admin" || userRole === "admin") return true;
        
        if (!user.permissions) return true; // Default fallback

        if (normPath === "dashboard" || normPath === "") return user.permissions.dashboard !== false;
        if (normPath === "me") return user.permissions.me !== false;
        if (normPath === "my-team") return user.permissions.myTeam !== false;
        if (normPath === "my-finances") return user.permissions.myFinances !== false;
        if (normPath === "documents") {
            return !!(user.permissions.documents?.companyDocuments || user.permissions.documents?.employeeDocuments);
        }
        if (normPath === "time-attendance") return user.permissions.timeAndAttend !== false;
        if (normPath === "employees") return user.permissions.employees !== false;
        if (normPath === "payroll") return user.permissions.payroll !== false;
        if (normPath === "recruitment") return user.permissions.recruitment !== false;
        if (normPath === "offboarding-onboarding") return user.permissions.offboardingAndOnboarding !== false;
        if (normPath === "organization") return user.permissions.organization !== false;
        if (normPath === "probation") return user.permissions?.probation === true;
        if (normPath === "settings") return true;

        return true;
    }, [user]);

    const logout = useCallback(() => {
        try {
            localStorage.removeItem("user");
            localStorage.removeItem("token");
        } catch (e) {}
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
