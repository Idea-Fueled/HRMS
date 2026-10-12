import React, { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { trackActivity } from "../services/log.service";

/**
 * Strictly check if the user belongs to Management (DO NOT TRACK)
 */
export const isManagementUser = (user) => {
    if (!user) return true; // Don't track if not logged in
    const role = (user.role || "").trim().toLowerCase();
    const dept = (user.department || "").trim().toLowerCase();
    const designation = (user.designation || "").trim().toLowerCase();
    return (
        role === "global_admin" ||
        role === "admin" ||
        role === "management" ||
        dept === "management" ||
        designation === "ceo" ||
        designation === "co-founder"
    );
};

/**
 * Human-readable title mapping for routes
 */
const getPageTitle = (pathname) => {
    if (!pathname || pathname === "/") return "Dashboard";
    if (pathname.startsWith("/dashboard")) return "Dashboard";
    if (pathname.startsWith("/me")) return "My Profile & Attendance";
    if (pathname.startsWith("/inbox")) return "Mailbox & Messages";
    if (pathname.startsWith("/my-team")) return "My Team";
    if (pathname.startsWith("/my-finances")) return "My Finances & Salary";
    if (pathname.startsWith("/documents")) return "Company Documents";
    if (pathname.startsWith("/time-attendance")) return "Time & Attendance";
    if (pathname.startsWith("/employees")) return "Employee Directory";
    if (pathname.startsWith("/profile")) return "Employee Profile";
    if (pathname.startsWith("/hire")) return "Hire & Recruitment";
    if (pathname.startsWith("/assets")) return "Company Assets";
    if (pathname.startsWith("/reports")) return "Work & Attendance Reports";
    if (pathname.startsWith("/logs")) return "User Activity Logs";
    if (pathname.startsWith("/payroll")) return "Payroll Management";
    if (pathname.startsWith("/organization")) return "Organization Structure";
    return pathname.replace(/^\//, "").replace(/-/g, " ");
};

const ActivityTracker = () => {
    const { user } = useAuth();
    const location = useLocation();
    const lastPageRef = useRef("");
    const lastClickTimeRef = useRef(0);
    const lastClickLabelRef = useRef("");

    // 1. Page Navigation Tracker
    useEffect(() => {
        if (!user || isManagementUser(user)) return;

        const currentPath = location.pathname;
        if (currentPath === lastPageRef.current) return;
        lastPageRef.current = currentPath;

        const pageTitle = getPageTitle(currentPath);

        // Send page navigation log
        trackActivity({
            actionType: "PAGE_VIEW",
            page: currentPath,
            pageTitle,
            action: `Navigated to ${pageTitle}`
        }).catch(() => {
            // Silently ignore network hiccups so user experience is uninterrupted
        });
    }, [location.pathname, user]);

    // 2. Button & Action Click Tracker
    useEffect(() => {
        if (!user || isManagementUser(user)) return;

        const handleClick = (e) => {
            try {
                // Find nearest interactive element (button, anchor, or custom action element)
                const target = e.target.closest("button, a, input[type='submit'], [role='button'], [data-track]");
                if (!target) return;

                // Don't log sensitive inputs or empty elements
                if (target.type === "password") return;

                // Extract clean meaningful label
                let text = (
                    target.getAttribute("data-track") ||
                    target.getAttribute("aria-label") ||
                    target.getAttribute("title") ||
                    target.innerText ||
                    target.textContent ||
                    ""
                ).trim();

                // Clean up multi-line text to single line
                text = text.replace(/\s+/g, " ");

                // If text is overly long or empty, extract fallback
                if (!text || text.length > 50) {
                    text = target.tagName.toLowerCase();
                    if (target.id) text += `#${target.id}`;
                }

                // Throttle identical rapid clicks (within 1.5 seconds)
                const now = Date.now();
                if (text === lastClickLabelRef.current && now - lastClickTimeRef.current < 1500) {
                    return;
                }
                lastClickTimeRef.current = now;
                lastClickLabelRef.current = text;

                const currentPath = location.pathname;
                const pageTitle = getPageTitle(currentPath);

                trackActivity({
                    actionType: "BUTTON_CLICK",
                    page: currentPath,
                    pageTitle,
                    action: `Clicked "${text}"`
                }).catch(() => {});
            } catch {
                // Ignore any DOM read error
            }
        };

        window.addEventListener("click", handleClick, { passive: true, capture: true });
        return () => {
            window.removeEventListener("click", handleClick, { capture: true });
        };
    }, [location.pathname, user]);

    return null;
};

export default ActivityTracker;
