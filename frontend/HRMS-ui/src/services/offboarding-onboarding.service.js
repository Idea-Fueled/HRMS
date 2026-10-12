import API from "./api";

// Onboarding Endpoints
export const getOnboardingRecords = async (params) => {
    return API.get("/offboarding-onboarding/onboarding", { params });
};

export const createOnboardingRecord = async (data) => {
    return API.post("/offboarding-onboarding/onboarding", data);
};

export const updateOnboardingRecord = async (id, data) => {
    return API.put(`/offboarding-onboarding/onboarding/${id}`, data);
};

export const deleteOnboardingRecord = async (id) => {
    return API.delete(`/offboarding-onboarding/onboarding/${id}`);
};

// Offboarding Endpoints
export const getOffboardingRecords = async (params) => {
    return API.get("/offboarding-onboarding/offboarding", { params });
};

export const initiateOffboarding = async (data) => {
    return API.post("/offboarding-onboarding/offboarding", data);
};

export const updateOffboardingRecord = async (id, data) => {
    return API.put(`/offboarding-onboarding/offboarding/${id}`, data);
};

export const deleteOffboardingRecord = async (id) => {
    return API.delete(`/offboarding-onboarding/offboarding/${id}`);
};

export const submitResignation = async (data) => {
    return API.post("/offboarding-onboarding/offboarding/resign", data);
};

export const adminInitiateExit = async (data) => {
    return API.post("/offboarding-onboarding/offboarding/admin-initiate", data);
};

export default API;
