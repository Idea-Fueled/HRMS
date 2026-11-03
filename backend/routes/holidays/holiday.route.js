import express from "express";
import { createHoliday, deleteHoliday, getAllHolidays, getHolidayById, getUpcomingHolidays, updateHoliday } from "../../controllers/holidays/holiday.controller.js";
import { upload } from "../../middlewares/upload.middleware.js";

const router = express.Router();

router.post("/create", upload.single("image"), createHoliday);
router.get("/", getAllHolidays);
router.get('/upcoming', getUpcomingHolidays);
router.get("/:id", getHolidayById);
router.put("/:id", upload.single("image"), updateHoliday);
router.delete("/:id", deleteHoliday);

export default router;