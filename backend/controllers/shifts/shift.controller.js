import Shift from "../../models/shifts/shift.model.js";
import User from "../../models/users/user.model.js";

/**
 * Get all shifts (auto-seeds defaults if DB empty)
 */
export const getAllShifts = async (req, res) => {
    try {
        let shifts = await Shift.find().populate("assignedEmployees", "firstName lastName fullName employeeId department designation profilePicture");
        
        if (shifts.length === 0) {
            const defaultUsers = await User.find({ status: "active" }).limit(4);
            const defaultUserIds = defaultUsers.map(u => u._id);

            await Shift.insertMany([
                {
                    name: "General Day Shift",
                    code: "GEN-01",
                    startTime: "09:30 AM",
                    endTime: "06:30 PM",
                    breakMinutes: 45,
                    workingDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
                    description: "Standard daytime shift for engineering & product teams.",
                    assignedEmployees: defaultUserIds
                },
                {
                    name: "Morning Flex Shift",
                    code: "FLEX-AM",
                    startTime: "08:00 AM",
                    endTime: "05:00 PM",
                    breakMinutes: 60,
                    workingDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
                    description: "Early flex shift for operations and support leads.",
                    assignedEmployees: []
                },
                {
                    name: "Night Operations Shift",
                    code: "NGT-02",
                    startTime: "08:00 PM",
                    endTime: "05:00 AM",
                    breakMinutes: 45,
                    workingDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
                    description: "Overnight shift for server infrastructure & maintenance.",
                    assignedEmployees: []
                }
            ]);

            shifts = await Shift.find().populate("assignedEmployees", "firstName lastName fullName employeeId department designation profilePicture");
        }

        return res.status(200).json({ success: true, data: shifts });
    } catch (error) {
        console.error("Get Shifts Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Create Shift
 */
export const createShift = async (req, res) => {
    try {
        const { name, code, startTime, endTime, breakMinutes, workingDays, description, assignedEmployees } = req.body;
        
        if (!name || !code || !startTime || !endTime) {
            return res.status(400).json({ success: false, message: "Shift name, code, start time, and end time are required." });
        }

        const newShift = await Shift.create({
            name,
            code: code.toUpperCase(),
            startTime,
            endTime,
            breakMinutes: breakMinutes ? Number(breakMinutes) : 45,
            workingDays: workingDays || ["Mon", "Tue", "Wed", "Thu", "Fri"],
            description: description || "",
            assignedEmployees: assignedEmployees || []
        });

        const populated = await Shift.findById(newShift._id).populate("assignedEmployees", "firstName lastName fullName employeeId department designation profilePicture");

        return res.status(201).json({ success: true, data: populated });
    } catch (error) {
        console.error("Create Shift Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Update Shift
 */
export const updateShift = async (req, res) => {
    try {
        const { id } = req.params;
        const updated = await Shift.findByIdAndUpdate(id, req.body, { new: true }).populate("assignedEmployees", "firstName lastName fullName employeeId department designation profilePicture");
        
        return res.status(200).json({ success: true, data: updated });
    } catch (error) {
        console.error("Update Shift Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Delete Shift
 */
export const deleteShift = async (req, res) => {
    try {
        const { id } = req.params;
        await Shift.findByIdAndDelete(id);
        return res.status(200).json({ success: true, message: "Shift deleted successfully" });
    } catch (error) {
        console.error("Delete Shift Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Assign Employees to Shift
 */
export const assignEmployeeToShift = async (req, res) => {
    try {
        const { id } = req.params;
        const { employeeIds } = req.body;

        const shift = await Shift.findByIdAndUpdate(
            id,
            { assignedEmployees: employeeIds },
            { new: true }
        ).populate("assignedEmployees", "firstName lastName fullName employeeId department designation profilePicture");

        return res.status(200).json({ success: true, data: shift });
    } catch (error) {
        console.error("Assign Employee Shift Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
