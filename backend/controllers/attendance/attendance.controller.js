import Attendance from "../../models/attendance/attendance.model.js";

/**
 * Clock In
 */
export const clockIn = async (req, res) => {
    try {
        const { employeeId, workMode, wfhMessage } = req.body;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let attendance = await Attendance.findOne({
            employeeId,
            date: today,
        });

        const currentTime = new Date();

        if (!attendance) {
            attendance = await Attendance.create({
                employeeId,
                date: today,
                status: "present",
                firstClockIn: currentTime,
                workMode: workMode || "Office",
                wfhMessage: workMode === "Work From Home" ? (wfhMessage || "") : "",
                logs: [
                    {
                        action: "clock_in",
                        timestamp: currentTime,
                    },
                ],
            });
        } else {
            attendance.logs.push({
                action: "clock_in",
                timestamp: currentTime,
            });
            
            if (workMode) {
                attendance.workMode = workMode;
            }

            if (workMode === "Work From Home" && wfhMessage) {
                attendance.wfhMessage = wfhMessage;
            }

            await attendance.save();
        }

        return res.status(200).json({
            success: true,
            message: "Clocked in successfully",
            attendance,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

/**
 * Clock Out
 */
export const clockOut = async (req, res) => {
    try {
        const { employeeId } = req.body;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const attendance = await Attendance.findOne({
            employeeId,
            date: today,
        });

        if (!attendance) {
            return res.status(404).json({
                success: false,
                message: "Attendance record not found",
            });
        }

        const currentTime = new Date();

        attendance.logs.push({
            action: "clock_out",
            timestamp: currentTime,
        });

        attendance.lastClockOut = currentTime;

        const clockIns = attendance.logs.filter(
            (log) => log.action === "clock_in"
        );

        const clockOuts = attendance.logs.filter(
            (log) => log.action === "clock_out"
        );

        let totalMinutes = 0;

        for (
            let i = 0;
            i < Math.min(clockIns.length, clockOuts.length);
            i++
        ) {
            const diff =
                (new Date(clockOuts[i].timestamp) -
                    new Date(clockIns[i].timestamp)) /
                (1000 * 60);

            totalMinutes += diff;
        }

        attendance.totalWorkMinutes = Math.floor(totalMinutes);
        attendance.totalSessions = clockOuts.length;

        console.log("Clock Ins:", clockIns);
        console.log("Clock Outs:", clockOuts);
        console.log("Total Minutes:", totalMinutes);

        await attendance.save();

        return res.status(200).json({
            success: true,
            message: "Clocked out successfully",
            attendance,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

/**
 * Get Today's Attendance
 */
export const getTodayAttendance = async (req, res) => {
    try {
        const { employeeId } = req.params;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const attendance = await Attendance.findOne({
            employeeId,
            date: today,
        });

        if (!attendance) {
            return res.status(200).json({
                success: true,
                attendance: null,
            });
        }

        return res.status(200).json({
            success: true,
            attendance,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

/**
 * Get Today's Logs
 */
export const getTodayLogs = async (req, res) => {
    try {
        const { employeeId } = req.params;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const attendance = await Attendance.findOne({
            employeeId,
            date: today,
        }).select("logs totalWorkMinutes totalBreakMinutes totalSessions");

        return res.status(200).json({
            success: true,
            data: attendance,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};