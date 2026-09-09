import Attendance from "../../models/attendance/attendance.model.js";

/**
 * Clock In
 */
export const clockIn = async (req, res) => {
    try {
        const { employeeId, workMode, wfhMessage, dailyWorkPlan } = req.body;

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
                dailyWorkPlan: dailyWorkPlan || "",
                logs: [
                    {
                        action: "clock_in",
                        timestamp: currentTime,
                    },
                ],
            });
        } else {
            // Calculate break time if there was a previous clock_out
            if (attendance.lastClockOut) {
                const breakDiff = (currentTime - new Date(attendance.lastClockOut)) / (1000 * 60);
                if (breakDiff > 0) {
                    attendance.totalBreakMinutes = (attendance.totalBreakMinutes || 0) + Math.floor(breakDiff);
                }
            }

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

            if (dailyWorkPlan) {
                attendance.dailyWorkPlan = dailyWorkPlan;
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

import Leave from "../../models/leaves/leave.model.js";
import User from "../../models/users/user.model.js";

/**
 * Get Attendance Dashboard Summary & Analytics (100% Dynamic MongoDB Engine)
 */
export const getAttendanceDashboardSummary = async (req, res) => {
    try {
        const { role = "hr", department = "All", employeeId, date } = req.query;

        let targetDate = new Date();
        if (date) {
            const parsed = new Date(date);
            if (!isNaN(parsed.getTime())) {
                targetDate = parsed;
            }
        }

        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);

        let userFilter = { status: "active" };

        if (role === "employee" && employeeId) {
            userFilter = { status: "active", $or: [{ _id: employeeId }, { employeeId: employeeId }] };
        } else if (role === "manager" && employeeId) {
            const mgr = await User.findById(employeeId).catch(() => null);
            if (mgr && mgr.department) {
                userFilter = { status: "active", department: mgr.department };
            } else if (department !== "All") {
                userFilter.department = department;
            }
        } else if (department !== "All") {
            userFilter.department = department;
        }

        let users = await User.find(userFilter).select("firstName lastName fullName employeeId department designation profilePicture role managerId workLocation");

        // Fallback if specific employee query returns 0 (e.g. dummy ID passed)
        if (users.length === 0) {
            users = await User.find({ status: "active" }).limit(role === "employee" ? 1 : 10).select("firstName lastName fullName employeeId department designation profilePicture role managerId workLocation");
        }

        const attendances = await Attendance.find({
            date: { $gte: startOfDay, $lte: endOfDay }
        }).populate("employeeId", "firstName lastName fullName employeeId department designation profilePicture role");

        const leaves = await Leave.find({
            status: "approved",
            startDate: { $lte: endOfDay },
            endDate: { $gte: startOfDay }
        }).populate("employeeId", "firstName lastName fullName employeeId department designation profilePicture role");

        const pendingLeaves = await Leave.find({ status: "pending" })
            .populate("employeeId", "firstName lastName fullName employeeId department designation profilePicture role")
            .sort({ createdAt: -1 });

        const attendanceMap = new Map();
        attendances.forEach(att => {
            if (att.employeeId && att.employeeId._id) {
                attendanceMap.set(att.employeeId._id.toString(), att);
            }
        });

        const leaveMap = new Map();
        leaves.forEach(l => {
            if (l.employeeId && l.employeeId._id) {
                leaveMap.set(l.employeeId._id.toString(), l);
            }
        });

        let presentCount = 0;
        let lateCount = 0;
        let wfhCount = 0;
        let onLeaveCount = 0;
        let absentCount = 0;
        let totalWorkMinutes = 0;
        let totalBreakMinutes = 0;
        let clockedCount = 0;

        const tableData = users.map(user => {
            const userIdStr = user._id.toString();
            const att = attendanceMap.get(userIdStr);
            const leave = leaveMap.get(userIdStr);

            let status = "Absent";
            let workMode = user.workLocation || "Office";
            let checkIn = "—";
            let checkOut = "—";
            let hoursStr = "0h 00m";
            let breakStr = "0m";
            let lateMinutes = 0;

            if (att) {
                if (att.workMode) workMode = att.workMode;
                if (att.firstClockIn) {
                    checkIn = new Date(att.firstClockIn).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
                    const clockInHour = new Date(att.firstClockIn).getHours();
                    const clockInMin = new Date(att.firstClockIn).getMinutes();
                    const clockInTotalMin = clockInHour * 60 + clockInMin;
                    const shiftStartMin = 10 * 60; // 10:00 AM

                    if (clockInTotalMin > shiftStartMin) {
                        status = "Late";
                        lateMinutes = clockInTotalMin - shiftStartMin;
                        lateCount++;
                    } else if (att.workMode === "Work From Home") {
                        status = "WFH";
                        wfhCount++;
                    } else {
                        status = "Present";
                        presentCount++;
                    }
                } else {
                    status = "Absent";
                    absentCount++;
                }

                if (att.lastClockOut) {
                    checkOut = new Date(att.lastClockOut).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
                }

                if (att.totalWorkMinutes) {
                    const hrs = Math.floor(att.totalWorkMinutes / 60);
                    const mins = att.totalWorkMinutes % 60;
                    hoursStr = `${hrs}h ${mins.toString().padStart(2, "0")}m`;
                    totalWorkMinutes += att.totalWorkMinutes;
                    clockedCount++;
                }

                if (att.totalBreakMinutes) {
                    breakStr = `${att.totalBreakMinutes}m`;
                    totalBreakMinutes += att.totalBreakMinutes;
                }
            } else if (leave) {
                status = "On Leave";
                onLeaveCount++;
            } else {
                status = "Absent";
                absentCount++;
            }

            const name = user.fullName || `${user.firstName} ${user.lastName || ""}`.trim();

            return {
                id: user.employeeId || user._id,
                mongoId: user._id,
                name,
                role: user.designation || user.role,
                dept: user.department,
                workMode,
                checkIn,
                checkOut,
                hours: hoursStr,
                breakTime: breakStr,
                status,
                lateMinutes
            };
        });

        const deptMap = new Map();
        tableData.forEach(row => {
            const deptName = row.dept || "General";
            if (!deptMap.has(deptName)) {
                deptMap.set(deptName, { department: deptName, present: 0, wfh: 0, late: 0, leave: 0, absent: 0, total: 0 });
            }
            const stat = deptMap.get(deptName);
            stat.total++;
            if (row.status === "Present") stat.present++;
            if (row.status === "WFH") stat.wfh++;
            if (row.status === "Late") stat.late++;
            if (row.status === "On Leave") stat.leave++;
            if (row.status === "Absent") stat.absent++;
        });

        const deptDistribution = Array.from(deptMap.values()).map(d => ({
            ...d,
            presentPct: d.total > 0 ? Math.round((d.present / d.total) * 100) : 0,
            wfhPct: d.total > 0 ? Math.round((d.wfh / d.total) * 100) : 0,
            latePct: d.total > 0 ? Math.round((d.late / d.total) * 100) : 0,
            leavePct: d.total > 0 ? Math.round(((d.leave + d.absent) / d.total) * 100) : 0
        }));

        const totalHeadcount = users.length || 1;
        const avgWorkMin = clockedCount > 0 ? Math.round(totalWorkMinutes / clockedCount) : 0;
        const avgBreakMin = clockedCount > 0 ? Math.round(totalBreakMinutes / clockedCount) : 0;

        const avgHours = clockedCount > 0 ? `${Math.floor(avgWorkMin / 60)}h ${(avgWorkMin % 60).toString().padStart(2, "0")}m` : "0h 00m";
        const avgBreak = clockedCount > 0 ? `${avgBreakMin}m` : "0m";

        const attendanceRate = `${Math.round(((presentCount + wfhCount + lateCount) / totalHeadcount) * 100)}%`;

        const formattedPendingLeaves = pendingLeaves.map(l => {
            const empName = l.employeeId ? (l.employeeId.fullName || `${l.employeeId.firstName} ${l.employeeId.lastName || ""}`.trim()) : "Employee";
            const empDept = l.employeeId ? l.employeeId.department : "General";
            const startDateStr = new Date(l.startDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
            const endDateStr = new Date(l.endDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

            return {
                id: l._id,
                name: empName,
                dept: empDept,
                type: l.leaveType ? l.leaveType.replace("_", " ").toUpperCase() : "Leave Request",
                dates: `${startDateStr} - ${endDateStr}`,
                duration: `${l.totalDays} Day${l.totalDays > 1 ? "s" : ""}`,
                reason: l.reason
            };
        });

        return res.status(200).json({
            success: true,
            roleView: role,
            summary: {
                present: presentCount,
                total: totalHeadcount,
                presentPct: `${Math.round((presentCount / totalHeadcount) * 100)}%`,
                late: lateCount,
                latePct: `${Math.round((lateCount / totalHeadcount) * 100)}%`,
                wfh: wfhCount,
                wfhPct: `${Math.round((wfhCount / totalHeadcount) * 100)}%`,
                onLeave: onLeaveCount + absentCount,
                onLeavePct: `${Math.round(((onLeaveCount + absentCount) / totalHeadcount) * 100)}%`,
                avgHours,
                avgBreak,
                attendanceRate
            },
            deptDistribution,
            tableData,
            pendingRequests: {
                leave: formattedPendingLeaves,
                regularization: [],
                wfh: []
            }
        });
    } catch (error) {
        console.error("Attendance Summary Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

/**
 * Get Specific Employee Attendance History (by month/year or all)
 */
export const getEmployeeAttendanceHistory = async (req, res) => {
    try {
        const { employeeId } = req.params;
        const { month, year } = req.query;

        let dateFilter = { employeeId };

        if (month !== undefined && year !== undefined && month !== "" && year !== "") {
            const m = parseInt(month);
            const y = parseInt(year);
            const startOfMonth = new Date(y, m, 1);
            const endOfMonth = new Date(y, m + 1, 0, 23, 59, 59, 999);
            dateFilter.date = { $gte: startOfMonth, $lte: endOfMonth };
        }

        const attendances = await Attendance.find(dateFilter)
            .sort({ date: -1 });

        return res.status(200).json({
            success: true,
            attendances
        });
    } catch (error) {
        console.error("Get Employee Attendance History Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};