import React from "react";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import "./index.css";
import Layout from "./components/Layout";
import Dashboard from "./pages/dashboard/Dashboard";
import Login from "./pages/auth/Login";
import ResetPassword from "./pages/auth/ResetPassword";
import SetPasswordInvite from "./pages/auth/SetPasswordInvite";
import Me from "./pages/me/Me";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import { Toaster } from "sonner";
import { Recruitment } from "./pages/placeholders/Placeholders";
import Organization from "./pages/organization/Organization";
import Payroll from "./pages/payroll/Payroll";
import TimeAttendance from "./pages/time-attendance/TimeAttendance";
import { Documents } from "./pages/documents/Documents";
import MyFinances from "./pages/my-finances/MyFinances";
import MyTeam from "./pages/my-team/MyTeam";
import Employees from "./pages/employees/Employees";
import EmployeeProfile from "./pages/profile/EmployeeProfile";
import Unauthorized from "./pages/unauthorized/Unauthorized";
import SessionTimeoutManager from "./components/SessionTimeoutModal";
import Hire from "./pages/hire/Hire";
import Assets from "./pages/assets/Assets";
import Inbox from "./pages/inbox/Inbox";
import Approvals from "./pages/approvals/Approvals";
import Reports from "./pages/reports/Reports";
import ActivityLogs from "./pages/activity-logs/ActivityLogs";
import FileManager from "./pages/file-manager/FileManager";
import Probation from "./pages/probation/Probation";
import Settings from "./pages/settings/Settings";

/* ─────────────────────────────────────────────
   ROLE CONSTANTS
───────────────────────────────────────────── */
const ALL_ROLES        = ["global_admin", "admin", "hr", "manager", "management", "employee", "intern"];
const ADMIN_HR         = ["global_admin", "admin", "hr", "management"];
const GLOBAL_ADMIN_HR  = ["global_admin", "admin", "hr", "management"];
const ADMIN_HR_MANAGER = ["global_admin", "admin", "hr", "manager", "management"];
const GLOBAL_ADMIN_ONLY = ["global_admin", "admin", "management"];

function RouteErrorBoundary() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-slate-100 text-center">
                <div className="w-14 h-14 mx-auto mb-4 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center font-bold text-2xl">
                    !
                </div>
                <h2 className="text-xl font-black text-slate-800 mb-2">Something went wrong</h2>
                <p className="text-xs text-slate-500 mb-6">
                    An unexpected application error occurred. Please refresh or return to dashboard.
                </p>
                <div className="flex gap-3 justify-center">
                    <button
                        onClick={() => window.location.reload()}
                        className="px-5 py-2.5 bg-[#2D79C7] hover:bg-[#1f63a8] text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
                    >
                        Refresh Page
                    </button>
                    <button
                        onClick={() => { window.location.href = "/dashboard"; }}
                        className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                    >
                        Go to Dashboard
                    </button>
                </div>
            </div>
        </div>
    );
}

const router = createBrowserRouter([
    {
        path: "/login",
        element: <Login />,
        errorElement: <RouteErrorBoundary />,
    },
    {
        path: "/reset-password",
        element: <ResetPassword />,
        errorElement: <RouteErrorBoundary />,
    },
    {
        path: "/set-password",
        element: <SetPasswordInvite />,
        errorElement: <RouteErrorBoundary />,
    },
    {
        path: "/unauthorized",
        element: <Unauthorized />,
        errorElement: <RouteErrorBoundary />,
    },
    {
        path: "/",
        element: <Navigate to="/dashboard" replace />,
    },
    {
        path: "/",
        element: <Layout />,
        errorElement: <RouteErrorBoundary />,
        children: [
            {
                path: "dashboard",
                element: (
                    <ProtectedRoute allowedRoles={ALL_ROLES}>
                        <Dashboard />
                    </ProtectedRoute>
                ),
            },
            {
                path: "me",
                element: (
                    <ProtectedRoute allowedRoles={ALL_ROLES}>
                        <Me />
                    </ProtectedRoute>
                ),
            },
            {
                path: "inbox",
                element: <Navigate to="/approvals" replace />,
            },
            {
                path: "approvals",
                element: (
                    <ProtectedRoute allowedRoles={ALL_ROLES}>
                        <Approvals />
                    </ProtectedRoute>
                ),
            },
            {
                path: "profile",
                element: (
                    <ProtectedRoute allowedRoles={ALL_ROLES}>
                        <EmployeeProfile />
                    </ProtectedRoute>
                ),
            },
            {
                path: "profile/:id",
                element: (
                    <ProtectedRoute allowedRoles={ALL_ROLES}>
                        <EmployeeProfile />
                    </ProtectedRoute>
                ),
            },
            {
                path: "my-team",
                element: (
                    <ProtectedRoute allowedRoles={ALL_ROLES}>
                        <MyTeam />
                    </ProtectedRoute>
                ),
            },
            {
                path: "employees",
                element: (
                    <ProtectedRoute allowedRoles={ALL_ROLES}>
                        <Employees />
                    </ProtectedRoute>
                ),
            },
            {
                path: "probation",
                element: (
                    <ProtectedRoute allowedRoles={ALL_ROLES}>
                        <Probation />
                    </ProtectedRoute>
                ),
            },
            {
                path: "my-finances",
                element: (
                    <ProtectedRoute allowedRoles={ALL_ROLES}>
                        <MyFinances />
                    </ProtectedRoute>
                ),
            },
            {
                path: "documents",
                element: (
                    <ProtectedRoute allowedRoles={ALL_ROLES}>
                        <Documents />
                    </ProtectedRoute>
                ),
            },
            {
                path: "time-attendance",
                element: (
                    <ProtectedRoute allowedRoles={ALL_ROLES}>
                        <TimeAttendance />
                    </ProtectedRoute>
                ),
            },
            {
                path: "payroll",
                element: (
                    <ProtectedRoute allowedRoles={ADMIN_HR}>
                        <Payroll />
                    </ProtectedRoute>
                ),
            },
            {
                path: "recruitment",
                element: (
                    <ProtectedRoute allowedRoles={ADMIN_HR}>
                        <Recruitment />
                    </ProtectedRoute>
                ),
            },
            {
                path: "hire",
                element: (
                    <ProtectedRoute allowedRoles={GLOBAL_ADMIN_HR}>
                        <Hire />
                    </ProtectedRoute>
                ),
            },
            {
                path: "hire/search-by-ai",
                element: (
                    <ProtectedRoute allowedRoles={GLOBAL_ADMIN_HR}>
                        <Hire initialTab="search-by-ai" />
                    </ProtectedRoute>
                ),
            },
            {
                path: "assets",
                element: (
                    <ProtectedRoute allowedRoles={GLOBAL_ADMIN_ONLY}>
                        <Assets />
                    </ProtectedRoute>
                ),
            },
            {
                path: "reports",
                element: (
                    <ProtectedRoute allowedRoles={GLOBAL_ADMIN_ONLY}>
                        <Reports />
                    </ProtectedRoute>
                ),
            },
            {
                path: "logs",
                element: (
                    <ProtectedRoute allowedRoles={GLOBAL_ADMIN_ONLY}>
                        <ActivityLogs />
                    </ProtectedRoute>
                ),
            },
            {
                path: "file-manager",
                element: (
                    <ProtectedRoute allowedRoles={GLOBAL_ADMIN_ONLY}>
                        <FileManager />
                    </ProtectedRoute>
                ),
            },
            {
                path: "offboarding-onboarding",
                element: <Navigate to="/organization" replace />,
            },
            {
                path: "organization",
                element: (
                    <ProtectedRoute allowedRoles={ALL_ROLES}>
                        <Organization />
                    </ProtectedRoute>
                ),
            },
            {
                path: "settings",
                element: (
                    <ProtectedRoute allowedRoles={ALL_ROLES}>
                        <Settings />
                    </ProtectedRoute>
                ),
            },
        ],
    },
]);

const App = () => {
    return (
        <AuthProvider>
            <SessionTimeoutManager />
            <Toaster position="top-right" richColors />
            <RouterProvider router={router} />
        </AuthProvider>
    );
};

export default App;
