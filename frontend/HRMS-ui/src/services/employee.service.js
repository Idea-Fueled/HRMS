import axios from "axios";

const API = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_BASE_URL || "http://localhost:8000/api",
    withCredentials: true,
});

export const getAllEmployees = async () => {
    return API.get("/employees");
};

export const getEmployeeById = async (id) => {
    return API.get(`/employees/${id}`);
};

export const createEmployee = async (data) => {
    return API.post("/employees", data);
};

export const updateEmployee = async (id, data) => {
    return API.put(`/employees/${id}`, data);
};

export const checkEmployeeId = async (employeeId) => {
    return API.get(`/employees/check-id?employeeId=${encodeURIComponent(employeeId)}`);
};

export const getDepartments = async () => {
    return API.get("/employees/departments");
};

export const createDepartment = async (name) => {
    return API.post("/employees/departments", { name });
};

export const getManagers = async () => {
    return API.get("/employees/managers/all");
};

export const deactivateEmployee = async (id) => {
    return API.put(`/employees/${id}/deactivate`);
};

export default API;
