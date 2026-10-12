import API from "./auth.service";

/**
 * Send an activity log event (skipped if user is management)
 * @param {Object} data - { actionType, page, pageTitle, action, details }
 */
export const trackActivity = (data = {}) => {
    return API.post("/logs/track", data);
};

/**
 * Fetch activity logs with filters (Global Admin only)
 * @param {Object} params - { employeeId, date, actionType, search, page, limit }
 */
export const getActivityLogs = (params = {}) => {
    return API.get("/logs", { params });
};

/**
 * Fetch quick summary stats for logs
 */
export const getLogStats = () => {
    return API.get("/logs/stats");
};
