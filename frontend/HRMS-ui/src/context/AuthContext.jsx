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

const SESSION_DURATION_MS = 60 * 60 * 1000; // 1 hour (60 minutes) strict auto logout

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        try {
            const loginTimeStr = sessionStorage.getItem("loginTime") || localStorage.getItem("loginTime");
            if (loginTimeStr) {
                const loginTime = parseInt(loginTimeStr, 10);
                if (Date.now() - loginTime >= SESSION_DURATION_MS) {
                    sessionStorage.clear();
                    localStorage.removeItem("user");
                    localStorage.removeItem("token");
                    localStorage.removeItem("loginTime");
                    return null;
                }
            }
            // Use sessionStorage so closing browser or tab terminates session
            const stored = sessionStorage.getItem("user") || localStorage.getItem("user");
            return stored ? JSON.parse(stored) : null;
        } catch {
            return null;
        }
    });
    // If we already have a cached user in storage, we don't need to block rendering
    const [loading, setLoading] = useState(true);

    const refreshUser = useCallback(async () => {
        try {
            // Check 1 hour strict timeout
            const loginTimeStr = sessionStorage.getItem("loginTime") || localStorage.getItem("loginTime");
            if (loginTimeStr) {
                const loginTime = parseInt(loginTimeStr, 10);
                if (Date.now() - loginTime >= SESSION_DURATION_MS) {
                    sessionStorage.clear();
                    localStorage.removeItem("user");
                    localStorage.removeItem("token");
                    localStorage.removeItem("loginTime");
                    setUser(null);
                    setLoading(false);
                    return;
                }
            } else if (!sessionStorage.getItem("user") && !localStorage.getItem("user")) {
                sessionStorage.clear();
                localStorage.removeItem("user");
                localStorage.removeItem("token");
                localStorage.removeItem("loginTime");
                setUser(null);
                setLoading(false);
                return;
            }

            const res = await getCurrentUser();
            if (res.data?.success) {
                sessionStorage.setItem("user", JSON.stringify(res.data.user));
                if (!sessionStorage.getItem("loginTime") && !localStorage.getItem("loginTime")) {
                    const now = Date.now().toString();
                    sessionStorage.setItem("loginTime", now);
                    localStorage.setItem("loginTime", now);
                }
                localStorage.removeItem("user");
                setUser(res.data.user);
            } else {
                sessionStorage.clear();
                localStorage.removeItem("user");
                localStorage.removeItem("token");
                localStorage.removeItem("loginTime");
                setUser(null);
            }
        } catch {
            const cached = sessionStorage.getItem("user") || localStorage.getItem("user");
            if (!cached) setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { refreshUser(); }, [refreshUser]);

    /** Check if the current user has a specific permission */
    const can = useCallback((permission) => {
        if (!user) return false;
        
        const userRole = (user.role || "").toLowerCase();
        const userEmail = (user.email || "").toLowerCase();
        const isGlobalAdminUser = userRole === "global_admin" || userRole === "admin" || userRole === "management" ||
            ["rishabhloomba860@gmail.com", "esha@ideafueled.com", "prashant.kumar@ideafueled.com", "prashant@ideafueled.com", "puneet@ideafueled.com"].includes(userEmail);

        if (permission === "fileManager" || permission === "file-manager") {
            if (isGlobalAdminUser) return true;
            return user.permissions?.fileManager !== false;
        }

        if (isGlobalAdminUser) return true;
        
        // Handle admin/hr actions
        if (permission === "create:employee" || permission === "edit:employee" || permission === "view:all-employees") {
            return user.permissions?.employees !== false;
        }
        
        return false;
    }, [user]);

    /** Check if the current user can access a route path */
    const canAccessRoute = useCallback((path) => {
        if (!user) return false;

        const userRole = (user.role || "").toLowerCase();
        const userEmail = (user.email || "").toLowerCase();
        const normalize = (p) => (p || "").replace(/^\//, "").replace(/\/$/, "").split("?")[0];
        const normPath = normalize(path);

        const isGlobalAdminUser = userRole === "global_admin" || userRole === "admin" || userRole === "management" ||
            ["rishabhloomba860@gmail.com", "esha@ideafueled.com", "prashant.kumar@ideafueled.com", "prashant@ideafueled.com", "puneet@ideafueled.com"].includes(userEmail);

        if (isGlobalAdminUser) return true;

        if (normPath === "file-manager") {
            return user.permissions?.fileManager !== false;
        }

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
        if (normPath === "my-team") {
            const mt = user.permissions.myTeam;
            if (typeof mt === "boolean") {
                if (userRole === "manager" || userRole === "hr" || userRole === "management") return mt !== false;
                return mt === true;
            }
            if (typeof mt === "object" && mt !== null) {
                return mt.access === true;
            }
            return userRole === "manager" || userRole === "hr" || userRole === "management";
        }
        if (normPath === "my-finances") return user.permissions.myFinances !== false;
        if (normPath === "approvals" || normPath === "inbox") {
            if (userRole === "global_admin" || userRole === "admin") return true;
            if (userRole === "manager") return user.permissions?.approvals !== false;
            return user.permissions?.approvals === true;
        }
        if (normPath === "documents") {
            return !!(user.permissions.documents?.companyDocuments || user.permissions.documents?.employeeDocuments);
        }
        if (normPath === "time-attendance") return user.permissions.timeAndAttend !== false;
        if (normPath === "employees") {
            if (userRole === "hr") return user.permissions?.employees !== false;
            return user.permissions?.employees === true;
        }
        if (normPath === "payroll") return user.permissions.payroll !== false;
        if (normPath === "recruitment") return user.permissions.recruitment !== false;
        if (normPath === "offboarding-onboarding") return user.permissions.offboardingAndOnboarding !== false;
        if (normPath === "organization") return user.permissions.organization !== false;
        if (normPath === "probation") {
            if (userRole === "hr") return user.permissions?.probation !== false;
            return user.permissions?.probation === true;
        }
        if (normPath === "settings") return true;

        return true;
    }, [user]);

    const logout = useCallback(() => {
        try {
            sessionStorage.clear();
            localStorage.removeItem("user");
            localStorage.removeItem("token");
            localStorage.removeItem("loginTime");
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
