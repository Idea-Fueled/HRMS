import API from "./auth.service";

/**
 * Fetch Weekly Attendance & Work Report
 * @param {Object} params - { date, department }
 */
export const getWeeklyReport = (params = {}) => {
    return API.get("/reports/weekly", { params });
};

/**
 * Fetch Monthly Attendance & Work Report
 * @param {Object} params - { year, month, department }
 */
export const getMonthlyReport = (params = {}) => {
    return API.get("/reports/monthly", { params });
};

/**
 * Manually trigger sending the Weekly Report email to Global Admins
 * @param {Object} data - { date, department }
 */
export const sendWeeklyReportEmail = (data = {}) => {
    return API.post("/reports/send-weekly-email", data);
};

/**
 * Manually trigger sending the Monthly Report email to Global Admins
 * @param {Object} data - { year, month, department }
 */
export const sendMonthlyReportEmail = (data = {}) => {
    return API.post("/reports/send-monthly-email", data);
};
