import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * ProtectedRoute
 *
 * Props:
 *  - children      — the page to render if access is granted
 *  - allowedRoles  — optional string[] of roles that may access this route.
 *                    If omitted, any authenticated user is allowed.
 *
 * Logic:
 *  - If we have a cached user, render immediately (no flicker).
 *  - Only show the spinner when loading=true AND no cached user exists yet
 *    (i.e. a hard refresh with no localStorage entry).
 *  - If not authenticated, redirect to /login.
 *  - If authenticated but wrong role, redirect to /unauthorized.
 */
const ProtectedRoute = ({ children, allowedRoles }) => {
    const { user, loading, canAccessRoute } = useAuth();
    const location = useLocation();

    // Only block rendering when we have no user at all and are still fetching
    if (loading && !user) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[#F8FAFC] select-none">
                <div className="w-10 h-10 border-4 border-[#2D79C7]/20 border-t-[#2D79C7] rounded-full animate-spin" />
            </div>
        );
    }

    // Not authenticated
    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    const userRole = (user.role || "").toLowerCase();
    const userDept = (user.department || "").trim().toLowerCase();
    const isSuperRole = ["global_admin", "admin", "management"].includes(userRole);
    const isHr = userRole === "hr" || userDept === "hr" || userDept.includes("human resource");

    // Super roles (Global Admin, Admin, Management) have universal access to all routes
    if (isSuperRole) {
        return children;
    }

    // Common routes (Dashboard, Me, My Finances, Settings) are accessible to all authenticated users
    const norm = location.pathname.replace(/^\//, "").replace(/\/$/, "");
    if (norm === "dashboard" || norm === "" || norm === "me" || norm === "my-finances" || norm === "settings") {
        return children;
    }

    // HR users have access to all operational HR modules
    if (isHr) {
        const hrRoutes = [
            "my-team", "employees", "organization", "approvals", "recruitment",
            "hire", "time-attendance", "probation", "payroll", "documents"
        ];
        if (hrRoutes.includes(norm) || norm.startsWith("hire/") || norm.startsWith("profile/")) {
            return children;
        }
    }

    // Permission check
    if (!canAccessRoute(location.pathname)) {
        return <Navigate to="/unauthorized" replace />;
    }

    // Role check
    if (allowedRoles && allowedRoles.length > 0) {
        const allowed = allowedRoles.map(r => r.toLowerCase());
        if (!allowed.includes(userRole) && !(isHr && allowed.includes("hr"))) {
            return <Navigate to="/unauthorized" replace />;
        }
    }

    return children;
};

export default ProtectedRoute;
