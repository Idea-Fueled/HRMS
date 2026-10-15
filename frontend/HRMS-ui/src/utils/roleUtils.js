/**
 * Role & Management Utility Functions
 */

/**
 * Checks if a user belongs to Management.
 * Excludes HR / non-management global_admins (e.g. HR Manager).
 * Matches:
 * - role: "management"
 * - department: "Management"
 * - designation: CEO, Co-founder, Founder, Managing Director
 */
export const isManagementUser = (user) => {
    if (!user) return false;
    const role = (user.role || "").trim().toLowerCase();
    const dept = (user.department || "").trim().toLowerCase();
    const designation = (user.designation || "").trim().toLowerCase();

    return (
        role === "management" ||
        dept === "management" ||
        designation === "ceo" ||
        designation === "co-founder" ||
        designation.includes("founder") ||
        designation.includes("managing director")
    );
};
