import Holiday from "../../models/holidays/holidays.model.js";

export const createHoliday = async (req, res, next) => {
    try {
        const { title, date, day, type, description } = req.body;
        if (!title || !date) {
            return res.status(400).json({
                success: false,
                message: "Title and Date are required!"
            })
        }

        const holiday = await Holiday.create({
            title,
            date,
            day,
            type,
            description
        })

        return res.status(201).json({
            success: true,
            message: "Holiday created successfully",
            holiday
        })
    } catch (error) {
        res.status(500).json({
            message: error.message
        })
    }
}

export const getAllHolidays = async (req, res) => {
    try {
        const holidays = await Holiday.find({
            isActive: true,
        }).sort({ date: 1 });

        return res.status(200).json({
            success: true,
            count: holidays.length,
            holidays,
        });
    } catch (error) {
        console.error("Get Holidays Error:", error);

        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

/**
 * Get Upcoming Holidays
 */
export const getUpcomingHolidays = async (req, res) => {
    try {
        const today = new Date();

        const holidays = await Holiday.find({
            isActive: true,
            date: {
                $gte: today,
            },
        })
            .sort({ date: 1 })
            .limit(5);

        return res.status(200).json({
            success: true,
            count: holidays.length,
            holidays,
        });
    } catch (error) {
        console.error("Upcoming Holidays Error:", error);

        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

/**
 * Get Single Holiday
 */
export const getHolidayById = async (req, res) => {
    try {
        const holiday = await Holiday.findById(req.params.id);

        if (!holiday) {
            return res.status(404).json({
                success: false,
                message: "Holiday not found.",
            });
        }

        return res.status(200).json({
            success: true,
            holiday,
        });
    } catch (error) {
        console.error("Get Holiday Error:", error);

        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

/**
 * Update Holiday
 */
export const updateHoliday = async (req, res) => {
    try {
        const holiday = await Holiday.findById(req.params.id);

        if (!holiday) {
            return res.status(404).json({ success: false, message: "Holiday not found." });
        }

        const { title, date, day, type, description } = req.body;
        if (title !== undefined) holiday.title = title;
        if (date !== undefined) holiday.date = date;
        if (day !== undefined) holiday.day = day;
        if (type !== undefined) holiday.type = type;
        if (description !== undefined) holiday.description = description;

        await holiday.save();

        return res.status(200).json({ success: true, message: "Holiday updated successfully.", holiday });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Delete Holiday (Soft Delete)
 */
export const deleteHoliday = async (req, res) => {
    try {
        const holiday = await Holiday.findById(req.params.id);

        if (!holiday) {
            return res.status(404).json({
                success: false,
                message: "Holiday not found.",
            });
        }

        holiday.isActive = false;
        await holiday.save();

        return res.status(200).json({
            success: true,
            message: "Holiday deleted successfully.",
        })
    }
    catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
}