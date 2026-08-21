import API from "./auth.service";

// Generate / Save Payslip (Global Admin / HR)
export const generatePayslip = (data) => {
    return API.post("/payroll/generate", data);
};

// Get Payslips List
export const getPayslips = (params = {}) => {
    return API.get("/payroll/list", { params });
};

// Get Single Payslip by ID
export const getPayslipById = (id) => {
    return API.get(`/payroll/${id}`);
};

// Delete Payslip
export const deletePayslip = (id) => {
    return API.delete(`/payroll/${id}`);
};

// Update Employee Financials & Salary Breakdown
export const updateEmployeeFinancials = (employeeId, data) => {
    return API.put(`/payroll/employee-financials/${employeeId}`, data);
};
