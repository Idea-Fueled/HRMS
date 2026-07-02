import express from "express"
import { createHoliday, deleteHoliday, getAllHolidays, getHolidayById, getUpcomingHolidays } from "../../controllers/holidays/holiday.controller.js";

const router = express.Router();

router.post("/create", createHoliday)
router.get("/", getAllHolidays)
router.get('/upcoming', getUpcomingHolidays)
router.get("/:id", getHolidayById);
router.delete("/:id", deleteHoliday);

export default router;