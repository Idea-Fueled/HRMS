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
    const { user, loading } = useAuth();
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

    // Role check
    if (allowedRoles && allowedRoles.length > 0) {
        const userRole = user.role?.toLowerCase();
        if (!allowedRoles.map(r => r.toLowerCase()).includes(userRole)) {
            return <Navigate to="/unauthorized" replace />;
        }
    }

    return children;
};

export default ProtectedRoute;
