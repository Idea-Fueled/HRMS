import axios from "axios";

const API = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_BASE_URL || "http://localhost:8000/api",
    withCredentials: true
});

export const getTeamSummary = async () => {
    return API.get("/team/summary");
};

export const getTeamMembers = async () => {
    return API.get("/team/members");
};

export const getTeamAttendance = async () => {
    return API.get("/team/attendance");
};

export const getTeamLeaves = async () => {
    return API.get("/team/leaves");
};

export const getTeamPerformance = async () => {
    return API.get("/team/performance");
};

export const updateLeaveStatus = async (id, status, remarks = "") => {
    return API.put(`/team/leaves/${id}/status`, { status, remarks });
};

export default API;
