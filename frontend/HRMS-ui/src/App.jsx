import React from "react";
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom";
import "./index.css";
import Layout from "./components/Layout";
import Dashboard from "./pages/dashboard/Dashboard";
import Login from "./pages/auth/Login";
import Me from "./pages/me/Me";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import { Toaster } from "sonner";
import {
    Hire, Payroll, Recruitment, OffboardingOnboarding, Organization
} from "./pages/placeholders/Placeholders";
import TimeAttendance from "./pages/time-attendance/TimeAttendance";
import { Documents } from "./pages/documents/Documents";
import MyFinances from "./pages/my-finances/MyFinances";
import MyTeam from "./pages/my-team/MyTeam";
import Employees from "./pages/employees/Employees";
import EmployeeProfile from "./pages/profile/EmployeeProfile";
import Unauthorized from "./pages/unauthorized/Unauthorized";
import SessionTimeoutManager from "./components/SessionTimeoutModal";

/* ─────────────────────────────────────────────
   ROLE CONSTANTS
───────────────────────────────────────────── */
const ALL_ROLES        = ["admin", "hr", "manager", "employee"];
const ADMIN_HR         = ["admin", "hr"];
const ADMIN_HR_MANAGER = ["admin", "hr", "manager"];

const router = createBrowserRouter([
    {
        path: "/login",
        element: <Login />,
    },
    {
        path: "/unauthorized",
        element: <Unauthorized />,
    },
    {
        path: "/",
        element: <Navigate to="/dashboard" replace />,
    },
    {
        path: "/",
        element: <Layout />,
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
                    <ProtectedRoute allowedRoles={ADMIN_HR}>
                        <Employees />
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
                    <ProtectedRoute allowedRoles={ADMIN_HR}>
                        <Hire />
                    </ProtectedRoute>
                ),
            },
            {
                path: "offboarding-onboarding",
                element: (
                    <ProtectedRoute allowedRoles={ADMIN_HR}>
                        <OffboardingOnboarding />
                    </ProtectedRoute>
                ),
            },
            {
                path: "organization",
                element: (
                    <ProtectedRoute allowedRoles={ALL_ROLES}>
                        <Organization />
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
