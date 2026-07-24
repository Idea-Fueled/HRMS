import express from "express";
import {
    getAllEmployees,
    getEmployeeById,
    createEmployee,
    updateEmployee,
    deactivateEmployee,
    checkEmployeeId,
    getDepartments,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    getManagers,
    getHRVisibility,
    updateHRVisibility
} from "../../controllers/employees/employee.controller.js";
import { isAuthenticated } from "../../middlewares/auth.middleware.js";

const router = express.Router();

// All routes are protected
router.get("/", isAuthenticated, getAllEmployees);
router.get("/departments", isAuthenticated, getDepartments);
router.post("/departments", isAuthenticated, createDepartment);
router.put("/departments/rename", isAuthenticated, updateDepartment);
router.post("/departments/delete", isAuthenticated, deleteDepartment);
router.get("/managers/all", isAuthenticated, getManagers);
router.get("/check-id", isAuthenticated, checkEmployeeId);
router.get("/hr-visibility/:hrId", isAuthenticated, getHRVisibility);
router.put("/hr-visibility/:hrId", isAuthenticated, updateHRVisibility);
router.get("/:id", isAuthenticated, getEmployeeById);
router.post("/", isAuthenticated, createEmployee);
router.put("/:id", isAuthenticated, updateEmployee);
router.put("/:id/deactivate", isAuthenticated, deactivateEmployee);

export default router;
