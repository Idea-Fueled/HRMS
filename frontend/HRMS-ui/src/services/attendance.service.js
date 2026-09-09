import API from "./api";

export const getAttendanceDashboardData = async (role = "hr", department = "All", employeeId = "", date = "") => {
    try {
        const response = await API.get("/attendance/dashboard-summary", {
            params: { role, department, employeeId, date }
        });
        return response;
    } catch (error) {
        console.warn("Backend attendance summary API unavailable, utilizing fallback provider:", error);
        return { data: { success: false } };
    }
};

export const clockInAttendance = async (employeeId, workMode = "Office", wfhMessage = "") => {
    return API.post("/attendance/clock-in", { employeeId, workMode, wfhMessage });
};

export const clockOutAttendance = async (employeeId) => {
    return API.post("/attendance/clock-out", { employeeId });
};

export const getTodayAttendanceStatus = async (employeeId) => {
    return API.get(`/attendance/today/${employeeId}`);
};

export const getEmployeeAttendanceHistory = async (employeeId, month = "", year = "") => {
    try {
        const response = await API.get(`/attendance/history/${employeeId}`, {
            params: { month, year }
        });
        return response;
    } catch (error) {
        console.warn("Backend attendance history API unavailable:", error);
        return { data: { success: false, attendances: [] } };
    }
};

