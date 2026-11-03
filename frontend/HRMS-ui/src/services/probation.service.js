import API from "./api";

export const getProbationPolicies = async () => {
    return API.get("/probation/policies");
};

export const createProbationPolicy = async (data) => {
    return API.post("/probation/policies", data);
};

export const updateProbationPolicy = async (id, data) => {
    return API.put(`/probation/policies/${id}`, data);
};

export const deleteProbationPolicy = async (id) => {
    return API.delete(`/probation/policies/${id}`);
};

export const getPolicyEmployees = async (policyId) => {
    return API.get(`/probation/policies/${policyId}/employees`);
};

export const assignEmployeesToPolicy = async (policyId, employeeIds) => {
    return API.post("/probation/assign", { policyId, employeeIds });
};

export const removeEmployeeFromPolicy = async (employeeId) => {
    return API.post("/probation/remove", { employeeId });
};

export const extendEmployeeProbation = async (employeeId, additionalMonths, remarks) => {
    return API.post("/probation/extend", { employeeId, additionalMonths, remarks });
};
