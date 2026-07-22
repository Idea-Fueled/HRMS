import API from "./api";

export const getAllShifts = async () => {
    return API.get("/shifts");
};

export const createShift = async (shiftData) => {
    return API.post("/shifts/create", shiftData);
};

export const updateShift = async (id, shiftData) => {
    return API.put(`/shifts/${id}`, shiftData);
};

export const deleteShift = async (id) => {
    return API.delete(`/shifts/${id}`);
};

export const assignEmployeeToShift = async (id, employeeIds) => {
    return API.post(`/shifts/${id}/assign`, { employeeIds });
};
