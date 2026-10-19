import API from "./api";

export const getAllAssets = async (params) => {
    return API.get("/assets", { params });
};

export const getAssignedAssets = async () => {
    return API.get("/assets/assigned");
};

export const createAsset = async (data) => {
    return API.post("/assets", data);
};

export const updateAsset = async (id, data) => {
    return API.put(`/assets/${id}`, data);
};

export const assignAsset = async (id, employeeId) => {
    return API.post(`/assets/${id}/assign`, { employeeId });
};

export const unassignAsset = async (id) => {
    return API.post(`/assets/${id}/unassign`);
};

export const updateAssetStatus = async (id, status, condition) => {
    return API.patch(`/assets/${id}/status`, { status, condition });
};

export const deleteAsset = async (id) => {
    return API.delete(`/assets/${id}`);
};

export const acknowledgeAsset = async (id) => {
    return API.post(`/assets/${id}/acknowledge`);
};

export const requestNewAsset = async (data) => {
    return API.post("/assets/request", data);
};

export default API;

