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

const SESSION_DURATION_MS = 30 * 60 * 1000; // 30 minutes strict

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        try {
            const loginTimeStr = sessionStorage.getItem("loginTime");
            if (loginTimeStr) {
                const loginTime = parseInt(loginTimeStr, 10);
                if (Date.now() - loginTime >= SESSION_DURATION_MS) {
                    sessionStorage.clear();
                    localStorage.removeItem("user");
                    localStorage.removeItem("token");
                    return null;
                }
            }
            // Use sessionStorage so closing browser or tab immediately terminates session
            const stored = sessionStorage.getItem("user");
            return stored ? JSON.parse(stored) : null;
        } catch {
            return null;
        }
    });
    // If we already have a cached user in sessionStorage, we don't need to block rendering
    const [loading, setLoading] = useState(true);

    const refreshUser = useCallback(async () => {
        try {
            // Check 30 minute strict timeout
            const loginTimeStr = sessionStorage.getItem("loginTime");
            if (loginTimeStr) {
                const loginTime = parseInt(loginTimeStr, 10);
                if (Date.now() - loginTime >= SESSION_DURATION_MS) {
                    sessionStorage.clear();
                    localStorage.removeItem("user");
                    localStorage.removeItem("token");
                    setUser(null);
                    setLoading(false);
                    return;
                }
            } else if (!sessionStorage.getItem("user")) {
                // If tab or browser was closed, session is terminated
                sessionStorage.clear();
                localStorage.removeItem("user");
                localStorage.removeItem("token");
                setUser(null);
                setLoading(false);
                return;
            }

            const res = await getCurrentUser();
            if (res.data?.success) {
                sessionStorage.setItem("user", JSON.stringify(res.data.user));
                if (!sessionStorage.getItem("loginTime")) {
                    sessionStorage.setItem("loginTime", Date.now().toString());
                }
                localStorage.removeItem("user");
                setUser(res.data.user);
            } else {
                sessionStorage.clear();
                localStorage.removeItem("user");
                localStorage.removeItem("token");
                setUser(null);
            }
        } catch {
            const cached = sessionStorage.getItem("user");
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

        const userRole = (user.role || "").toLowerCase();
        const userDept = (user.department || "").trim().toLowerCase();
        const isHr = userRole === "hr" || userDept === "hr" || userDept.includes("human resource");

        // normalize: strip leading slash and trailing slash
        const normalize = (p) => p.replace(/^\//, "").replace(/\/$/, "");
        const normPath = normalize(path);

        // Assets & File Manager modules are strictly accessible to Global Admin / Admin / Management
        if (normPath === "assets" || normPath === "file-manager") {
            return userRole === "global_admin" || userRole === "admin" || userRole === "management";
        }

        // Hire module is accessible to Global Admin, Admin, Management, and HR
        if (normPath === "hire" || normPath.startsWith("hire/")) {
            return userRole === "global_admin" || userRole === "admin" || userRole === "management" || isHr;
        }

        // Global Admins, Admins, and Management have access to all routes
        if (userRole === "global_admin" || userRole === "admin" || userRole === "management") return true;

        // HR Department / HR role has full access to HR operations
        if (isHr) {
            if ([
                "dashboard", "me", "my-team", "employees", "organization", "approvals",
                "recruitment", "hire", "time-attendance", "probation", "payroll",
                "documents", "my-finances", "settings"
            ].includes(normPath)) {
                return true;
            }
        }
        
        if (!user.permissions) return true; // Default fallback

        if (normPath === "dashboard" || normPath === "") return user.permissions.dashboard !== false;
        if (normPath === "me") return user.permissions.me !== false;
        if (normPath === "my-team") {
            const mt = user.permissions.myTeam;
            if (typeof mt === "boolean") {
                if (userRole === "manager" || isHr || userRole === "management") return mt !== false;
                return mt === true;
            }
            if (typeof mt === "object" && mt !== null) {
                return mt.access === true;
            }
            return userRole === "manager" || isHr || userRole === "management";
        }
        if (normPath === "my-finances") return user.permissions.myFinances !== false;
        if (normPath === "approvals" || normPath === "inbox") {
            if (userRole === "global_admin" || userRole === "admin" || isHr || userRole === "management") return true;
            if (userRole === "manager") return user.permissions?.approvals !== false;
            return user.permissions?.approvals === true;
        }
        if (normPath === "documents") {
            if (isHr) return true;
            return !!(user.permissions.documents?.companyDocuments || user.permissions.documents?.employeeDocuments);
        }
        if (normPath === "time-attendance") return isHr || user.permissions.timeAndAttend !== false;
        if (normPath === "employees") {
            if (isHr) return true;
            return user.permissions?.employees === true;
        }
        if (normPath === "payroll") return isHr || user.permissions.payroll !== false;
        if (normPath === "recruitment") return isHr || user.permissions.recruitment !== false;
        if (normPath === "offboarding-onboarding") return isHr || user.permissions.offboardingAndOnboarding !== false;
        if (normPath === "organization") return isHr || user.permissions.organization !== false;
        if (normPath === "probation") {
            if (isHr) return true;
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
