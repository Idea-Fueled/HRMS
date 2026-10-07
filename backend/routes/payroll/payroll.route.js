import express from "express";
import { isAuthenticated } from "../../middlewares/auth.middleware.js";
import {
    createPayslip,
    getPayslips,
    getPayslipById,
    deletePayslip,
    updateEmployeeFinancials,
    notifyPayslipDownload
} from "../../controllers/payroll/payroll.controller.js";

const router = express.Router();

// Apply Auth Middleware to all payroll endpoints
router.use(isAuthenticated);

// Notify Global Admins on Payslip Download
router.post("/notify-download", notifyPayslipDownload);

// Create / Process Payslip (Global Admin / HR)
router.post("/generate", createPayslip);

// Get All Payslips (For Admin or Employee)
router.get("/list", getPayslips);

// Get Single Payslip by ID
router.get("/:id", getPayslipById);

// Delete Payslip (Global Admin)
router.delete("/:id", deletePayslip);

// Update Employee Financial & Salary Info
router.put("/employee-financials/:employeeId", updateEmployeeFinancials);

export default router;
