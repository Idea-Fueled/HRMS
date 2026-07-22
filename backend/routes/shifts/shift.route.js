import express from "express";
import {
    getAllShifts,
    createShift,
    updateShift,
    deleteShift,
    assignEmployeeToShift
} from "../../controllers/shifts/shift.controller.js";

const router = express.Router();

router.get("/", getAllShifts);
router.post("/create", createShift);
router.put("/:id", updateShift);
router.delete("/:id", deleteShift);
router.post("/:id/assign", assignEmployeeToShift);

export default router;
