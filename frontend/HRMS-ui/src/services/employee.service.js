import API from "./api";

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

export const updateDepartment = async (oldName, newName) => {
    return API.put("/employees/departments/rename", { oldName, newName });
};

export const deleteDepartment = async (name) => {
    return API.post("/employees/departments/delete", { name });
};

export const getManagers = async () => {
    return API.get("/employees/managers/all");
};

export const deactivateEmployee = async (id) => {
    return API.put(`/employees/${id}/deactivate`);
};

export const getHRVisibility = async (hrId) => {
    return API.get(`/employees/hr-visibility/${hrId}`);
};

export const updateHRVisibility = async (hrId, employeeIds) => {
    return API.put(`/employees/hr-visibility/${hrId}`, { employeeIds });
};

export default API;
