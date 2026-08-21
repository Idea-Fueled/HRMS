import express from "express";
import { authenticateToken, authorizeRoles } from "../../middleware/auth.middleware.js";
import {
    createPayslip,
    getPayslips,
    getPayslipById,
    deletePayslip,
    updateEmployeeFinancials
} from "../../controllers/payroll/payroll.controller.js";

const router = express.Router();

// Apply Auth Middleware to all payroll endpoints
router.use(authenticateToken);

// Create / Process Payslip (Global Admin / HR)
router.post("/generate", authorizeRoles("global_admin", "hr", "admin"), createPayslip);

// Get All Payslips (For Admin or Employee)
router.get("/list", getPayslips);

// Get Single Payslip by ID
router.get("/:id", getPayslipById);

// Delete Payslip (Global Admin)
router.delete("/:id", authorizeRoles("global_admin", "hr", "admin"), deletePayslip);

// Update Employee Financial & Salary Info
router.put("/employee-financials/:employeeId", authorizeRoles("global_admin", "hr", "admin"), updateEmployeeFinancials);

export default router;
