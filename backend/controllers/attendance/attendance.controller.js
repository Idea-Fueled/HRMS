import Attendance from "../../models/attendance/attendance.model.js";
import Leave from "../../models/leaves/leave.model.js";
import User from "../../models/users/user.model.js";
import Email from "../../models/emails/email.model.js";
import { emitToUser } from "../../socket/socket.js";
import { dispatchExternalEmail } from "../../services/email.service.js";
import mongoose from "mongoose";
import XLSX from "xlsx";

/**
 * Clock In
 */
export const clockIn = async (req, res) => {
    try {
        const { employeeId, workMode, wfhMessage, dailyWorkPlan, fromDate, toDate, notifyEmployees } = req.body;

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

        // If applying for Work From Home, dispatch notifications to Global Admins and Reporting Manager
        if (workMode === "Work From Home") {
            try {
                const applicant = await User.findById(employeeId).populate("department").populate("managerId");
                if (applicant) {
                    const applicantName = applicant.fullName || `${applicant.firstName || ''} ${applicant.lastName || ''}`.trim() || "Employee";
                    const applicantEmpId = applicant.employeeId || "—";
                    const applicantDept = applicant.department?.name || applicant.department || "General";
                    const applicantDesignation = applicant.designation || "Employee";
                    const applicantEmail = applicant.email;

                    const recipientUserIds = new Set();
                    if (Array.isArray(notifyEmployees)) {
                        notifyEmployees.forEach(id => { if (id) recipientUserIds.add(id.toString()); });
                    }
                    if (applicant?.managerId?._id) {
                        recipientUserIds.add(applicant.managerId._id.toString());
                    } else if (applicant?.managerId) {
                        recipientUserIds.add(applicant.managerId.toString());
                    }
                    const globalAdmins = await User.find({ role: { $in: ["global_admin", "admin"] } }).select("_id email fullName role");
                    globalAdmins.forEach(ga => recipientUserIds.add(ga._id.toString()));

                    recipientUserIds.delete(employeeId.toString());

                    const recipients = await User.find({ _id: { $in: Array.from(recipientUserIds) } });

                    const fromStr = fromDate || new Date().toISOString().split("T")[0];
                    const toStr = toDate || fromStr;
                    const datesDisplay = fromStr === toStr ? fromStr : `${fromStr} to ${toStr}`;
                    const noteText = wfhMessage || "Work From Home Request";

                    const subject = `Work From Home Request: ${applicantName} (${applicantEmpId})`;
                    const snippet = `${applicantName} has requested Work From Home for ${datesDisplay}.`;

                    const emailHtml = `
                        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
                            <div style="background: linear-gradient(135deg, #2D79C7 0%, #1F5EA8 100%); padding: 24px; color: #ffffff;">
                                <h2 style="margin: 0; font-size: 20px; font-weight: 700;">Work From Home Request</h2>
                                <p style="margin: 6px 0 0 0; opacity: 0.85; font-size: 13px;">Employee has submitted a Work From Home notification/request.</p>
                            </div>
                            
                            <div style="padding: 24px;">
                                <p style="font-size: 14px; color: #374151; margin-top: 0;">
                                    Hello,
                                </p>
                                <p style="font-size: 14px; color: #374151;">
                                    <strong>${applicantName}</strong> has requested <strong>Work From Home</strong> for <strong>${datesDisplay}</strong>.
                                </p>

                                <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px; margin: 20px 0;">
                                    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                                        <tr>
                                            <td style="padding: 6px 0; color: #64748B; font-weight: 600; width: 140px;">Employee Name:</td>
                                            <td style="padding: 6px 0; color: #1E293B; font-weight: 700;">${applicantName}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Employee ID:</td>
                                            <td style="padding: 6px 0; color: #1E293B;">${applicantEmpId}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Department:</td>
                                            <td style="padding: 6px 0; color: #1E293B;">${applicantDept}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Designation:</td>
                                            <td style="padding: 6px 0; color: #1E293B;">${applicantDesignation}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Duration / Date:</td>
                                            <td style="padding: 6px 0; color: #2D79C7; font-weight: 700;">${datesDisplay}</td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 6px 0; color: #64748B; font-weight: 600; vertical-align: top;">Work Plan / Note:</td>
                                            <td style="padding: 6px 0; color: #1E293B; white-space: pre-line;">${noteText}</td>
                                        </tr>
                                    </table>
                                </div>

                                <div style="text-align: center; margin-top: 20px;">
                                    <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/me" style="background: #2D79C7; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 13px; padding: 10px 20px; border-radius: 6px; display: inline-block;">
                                        View in Attendance
                                    </a>
                                </div>
                            </div>

                            <div style="background: #F1F5F9; padding: 12px 24px; text-align: center; font-size: 11px; color: #94A3B8; border-top: 1px solid #E2E8F0;">
                                Idea-Fueled HRMS Automated Notification
                            </div>
                        </div>
                    `;

                    for (const rec of recipients) {
                        const recEmail = (rec.email || "").toLowerCase();
                        if (!recEmail) continue;

                        try {
                            const emailDoc = new Email({
                                sender: applicant._id,
                                senderEmail: applicantEmail,
                                senderName: applicantName,
                                senderAvatar: applicant.profilePicture || "",
                                senderRole: applicant.role,
                                to: [recEmail],
                                subject,
                                body: emailHtml,
                                snippet,
                                priority: "high",
                                labels: ["Attendance", "WFH", "Notification"],
                                userStates: [{
                                    user: rec._id,
                                    email: recEmail,
                                    folder: "inbox",
                                    isRead: false
                                }]
                            });
                            emailDoc.threadId = emailDoc._id;
                            await emailDoc.save();

                            emitToUser({ userId: rec._id, email: recEmail }, "new_email", {
                                email: emailDoc,
                                unreadCount: 1
                            });
                        } catch (internalMailErr) {
                            console.error("Error creating internal email doc for WFH:", internalMailErr);
                        }

                        try {
                            await dispatchExternalEmail({
                                to: recEmail,
                                subject,
                                body: emailHtml
                            });
                        } catch (externalMailErr) {
                            console.warn("External email delivery for WFH skipped/failed:", externalMailErr);
                        }
                    }
                }
            } catch (wfhErr) {
                console.error("Error dispatching WFH notification emails:", wfhErr);
            }
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

        const istDateStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
        const [y, m, d] = istDateStr.split("-").map(Number);
        const todayUtc = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
        const todayLocal = new Date();
        todayLocal.setHours(0, 0, 0, 0);

        const startOfDay = new Date(todayUtc.getTime() - 6 * 3600 * 1000);
        const endOfDay = new Date(todayUtc.getTime() + 24 * 3600 * 1000);

        let userObjId = employeeId;
        if (!mongoose.Types.ObjectId.isValid(employeeId)) {
            const user = await User.findOne({ employeeId });
            if (user) userObjId = user._id;
        }

        const attendance = await Attendance.findOne({
            employeeId: userObjId,
            $or: [
                { date: todayUtc },
                { date: todayLocal },
                { date: { $gte: startOfDay, $lte: endOfDay } },
                { firstClockIn: { $gte: startOfDay, $lte: endOfDay } }
            ]
        }).sort({ date: -1, updatedAt: -1 });

        return res.status(200).json({
            success: true,
            attendance: attendance || null,
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

        const istDateStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
        const [y, m, d] = istDateStr.split("-").map(Number);
        const todayUtc = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
        const todayLocal = new Date();
        todayLocal.setHours(0, 0, 0, 0);

        const startOfDay = new Date(todayUtc.getTime() - 6 * 3600 * 1000);
        const endOfDay = new Date(todayUtc.getTime() + 24 * 3600 * 1000);

        let userObjId = employeeId;
        if (!mongoose.Types.ObjectId.isValid(employeeId)) {
            const user = await User.findOne({ employeeId });
            if (user) userObjId = user._id;
        }

        const attendance = await Attendance.findOne({
            employeeId: userObjId,
            $or: [
                { date: todayUtc },
                { date: todayLocal },
                { date: { $gte: startOfDay, $lte: endOfDay } },
                { firstClockIn: { $gte: startOfDay, $lte: endOfDay } }
            ]
        }).sort({ date: -1, updatedAt: -1 });

        return res.status(200).json({
            success: true,
            data: attendance || null,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

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

        if ((role === "employee" || role === "intern") && employeeId) {
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
            users = await User.find({ status: "active" }).limit((role === "employee" || role === "intern") ? 1 : 10).select("firstName lastName fullName employeeId department designation profilePicture role managerId workLocation");
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
                    checkIn = new Date(att.firstClockIn).toLocaleTimeString("en-US", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: true });
                    const istParts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "numeric", hour12: false }).formatToParts(new Date(att.firstClockIn));
                    const clockInHour = Number(istParts.find(p => p.type === "hour")?.value || 0);
                    const clockInMin = Number(istParts.find(p => p.type === "minute")?.value || 0);
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
                    checkOut = new Date(att.lastClockOut).toLocaleTimeString("en-US", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: true });
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
        const { month, year, days } = req.query;

        let userObjId = null;
        if (mongoose.Types.ObjectId.isValid(employeeId)) {
            userObjId = new mongoose.Types.ObjectId(employeeId);
        } else {
            const user = await User.findOne({ employeeId });
            if (user) userObjId = user._id;
        }

        if (!userObjId) {
            return res.status(200).json({
                success: true,
                attendances: []
            });
        }

        // Authorization check:
        const callerId = req.user?.id || req.user?.userId;
        const callerRole = (req.user?.role || "").toLowerCase();

        if (callerId) {
            const isSelf = callerId.toString() === userObjId.toString();
            if (!isSelf) {
                if (callerRole === "global_admin" || callerRole === "admin") {
                    // Global admin / Admin has company-wide access
                } else if (callerRole === "hr") {
                    // HR can only view their assigned visible employees
                    const hrUser = await User.findById(callerId).select("visibleEmployees").lean();
                    const visible = (hrUser?.visibleEmployees || []).map(id => id.toString());
                    if (!visible.includes(userObjId.toString())) {
                        return res.status(403).json({ success: false, message: "Unauthorized: You can only view attendance for employees assigned to you" });
                    }
                } else if (callerRole === "manager" || callerRole === "management") {
                    // Manager can only view their direct reports
                    const targetUser = await User.findById(userObjId).select("managerId dottedManagerId").lean();
                    const isReport = targetUser && (
                        (targetUser.managerId && targetUser.managerId.toString() === callerId.toString()) ||
                        (targetUser.dottedManagerId && targetUser.dottedManagerId.toString() === callerId.toString())
                    );
                    if (!isReport) {
                        return res.status(403).json({ success: false, message: "Unauthorized: You can only view attendance for your own team members" });
                    }
                } else {
                    // Regular employee or intern cannot view anyone else's attendance
                    return res.status(403).json({ success: false, message: "Unauthorized: Employees can only view their own attendance history" });
                }
            }
        }

        let dateFilter = { employeeId: userObjId };

        if (days && days !== "all") {
            const d = parseInt(days, 10) || 30;
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - d);
            pastDate.setHours(0, 0, 0, 0);
            dateFilter.date = { $gte: pastDate };
        } else if (month !== undefined && year !== undefined && month !== "" && year !== "") {
            const m = parseInt(month, 10);
            const y = parseInt(year, 10);
            // 24 hour buffer to absorb all UTC vs IST timezone midnight shifts
            const startOfMonth = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0) - 24 * 3600 * 1000);
            const endOfMonth = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999) + 24 * 3600 * 1000);
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

// Helper to parse date from string, number (Excel serial), or Date object
const parseExcelDate = (val) => {
    if (!val && val !== 0) return null;
    if (val instanceof Date) {
        if (isNaN(val.getTime())) return null;
        return new Date(val.getFullYear(), val.getMonth(), val.getDate());
    }
    if (typeof val === "number") {
        const utc_days = Math.floor(val - 25569);
        const utc_value = utc_days * 86400;
        const d = new Date(utc_value * 1000);
        return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    }
    if (typeof val === "string") {
        const clean = val.trim();
        if (!clean) return null;

        // Try DD/MM/YYYY or DD-MM-YYYY
        const dmyMatch = clean.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
        if (dmyMatch) {
            const day = parseInt(dmyMatch[1], 10);
            const month = parseInt(dmyMatch[2], 10) - 1;
            const year = parseInt(dmyMatch[3], 10);
            return new Date(year, month, day);
        }

        // Try YYYY-MM-DD
        const ymdMatch = clean.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
        if (ymdMatch) {
            const year = parseInt(ymdMatch[1], 10);
            const month = parseInt(ymdMatch[2], 10) - 1;
            const day = parseInt(ymdMatch[3], 10);
            return new Date(year, month, day);
        }

        const parsed = new Date(clean);
        if (!isNaN(parsed.getTime())) {
            return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
        }
    }
    return null;
};

// Helper to parse time string or decimal to a Date on the base date
const parseTimeToDate = (timeVal, baseDate) => {
    if (!timeVal && timeVal !== 0) return null;
    if (!baseDate || isNaN(baseDate.getTime())) return null;

    const result = new Date(baseDate);

    if (timeVal instanceof Date) {
        result.setHours(timeVal.getHours(), timeVal.getMinutes(), timeVal.getSeconds(), 0);
        return result;
    }

    if (typeof timeVal === "number") {
        let fraction = timeVal;
        if (fraction > 1) {
            fraction = fraction - Math.floor(fraction);
        }
        const totalMinutes = Math.round(fraction * 24 * 60);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        result.setHours(hours, minutes, 0, 0);
        return result;
    }

    if (typeof timeVal === "string") {
        const clean = timeVal.trim();
        if (!clean || clean === "--" || clean.toLowerCase() === "null") return null;

        const timeMatch = clean.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i);
        if (timeMatch) {
            let hours = parseInt(timeMatch[1], 10);
            const minutes = parseInt(timeMatch[2], 10);
            const seconds = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;
            const ampm = timeMatch[4]?.toUpperCase();

            if (ampm === "PM" && hours < 12) hours += 12;
            if (ampm === "AM" && hours === 12) hours = 0;

            result.setHours(hours, minutes, seconds, 0);
            return result;
        }

        const parsed = new Date(clean);
        if (!isNaN(parsed.getTime())) {
            result.setHours(parsed.getHours(), parsed.getMinutes(), parsed.getSeconds(), 0);
            return result;
        }
    }

    return null;
};

/**
 * Import Attendance for an Employee from Excel / JSON
 */
export const importEmployeeAttendance = async (req, res) => {
    try {
        const { employeeId } = req.params;
        const empId = employeeId || req.body.employeeId;

        if (!empId) {
            return res.status(400).json({ success: false, message: "Employee ID is required." });
        }

        let user = null;
        if (mongoose.Types.ObjectId.isValid(empId)) {
            user = await User.findById(empId);
        }
        if (!user) {
            user = await User.findOne({ employeeId: empId });
        }
        if (!user) {
            return res.status(404).json({ success: false, message: "Target employee not found." });
        }

        let rawRows = [];

        if (req.file) {
            const workbook = XLSX.read(req.file.buffer, { type: "buffer", cellDates: true });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            rawRows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        } else if (req.body.records) {
            rawRows = typeof req.body.records === "string" ? JSON.parse(req.body.records) : req.body.records;
        }

        if (!Array.isArray(rawRows) || rawRows.length === 0) {
            return res.status(400).json({ success: false, message: "No attendance data found in uploaded file or request." });
        }

        let upsertedCount = 0;
        let skippedCount = 0;
        const errors = [];

        for (let i = 0; i < rawRows.length; i++) {
            const row = rawRows[i];

            const getValue = (patterns) => {
                const keys = Object.keys(row);
                for (const pat of patterns) {
                    const foundKey = keys.find(k => pat.test(k.trim()));
                    if (foundKey && row[foundKey] !== undefined && row[foundKey] !== "") {
                        return row[foundKey];
                    }
                }
                return null;
            };

            const rawDate = getValue([/^date$/i, /attendance.*date/i, /^day$/i, /entry.*date/i]);
            const parsedDate = parseExcelDate(rawDate);

            if (!parsedDate) {
                skippedCount++;
                errors.push(`Row ${i + 1}: Missing or invalid date (${rawDate || "Empty"}).`);
                continue;
            }

            parsedDate.setHours(0, 0, 0, 0);

            const rawClockIn = getValue([/^clock.*in/i, /^punch.*in/i, /^in.*time/i, /^first.*in/i, /^check.*in/i, /^start.*time/i]);
            const rawClockOut = getValue([/^clock.*out/i, /^punch.*out/i, /^out.*time/i, /^last.*out/i, /^check.*out/i, /^end.*time/i]);
            const rawStatus = getValue([/^status$/i, /attendance.*status/i]);
            const rawWorkMode = getValue([/^work.*mode/i, /^mode$/i]);
            const rawWorkMins = getValue([/total.*work.*min/i, /work.*min/i, /work.*hours?/i, /total.*hours?/i]);
            const rawBreakMins = getValue([/break.*min/i, /break.*time/i, /^break$/i]);
            const rawRemarks = getValue([/remarks?/i, /notes?/i, /comments?/i, /reason/i]);

            const clockInDate = parseTimeToDate(rawClockIn, parsedDate);
            let clockOutDate = parseTimeToDate(rawClockOut, parsedDate);

            if (clockInDate && clockOutDate && clockOutDate < clockInDate) {
                clockOutDate.setDate(clockOutDate.getDate() + 1);
            }

            let status = "present";
            if (rawStatus) {
                const s = String(rawStatus).toLowerCase().trim().replace(/[-\s]/g, "_");
                if (["present", "p"].includes(s)) status = "present";
                else if (["absent", "a"].includes(s)) status = "absent";
                else if (["half_day", "hd", "halfday"].includes(s)) status = "half_day";
                else if (["week_off", "wo", "weekoff", "off", "weekend"].includes(s)) status = "week_off";
                else if (["holiday", "h"].includes(s)) status = "holiday";
                else status = "present";
            } else {
                status = clockInDate ? "present" : "absent";
            }

            let workMode = "Office";
            if (rawWorkMode) {
                const wm = String(rawWorkMode).toLowerCase().trim();
                if (wm.includes("home") || wm.includes("wfh") || wm.includes("remote")) {
                    workMode = "Work From Home";
                }
            }

            let breakMinutes = 0;
            if (rawBreakMins !== null) {
                const parsedBreak = parseFloat(rawBreakMins);
                if (!isNaN(parsedBreak)) breakMinutes = Math.round(parsedBreak);
            }

            let totalWorkMinutes = 0;
            if (rawWorkMins !== null) {
                const parsedWm = parseFloat(rawWorkMins);
                if (!isNaN(parsedWm)) {
                    totalWorkMinutes = parsedWm <= 24 ? Math.round(parsedWm * 60) : Math.round(parsedWm);
                }
            } else if (clockInDate && clockOutDate) {
                const diffMs = clockOutDate.getTime() - clockInDate.getTime();
                const diffMins = Math.floor(diffMs / (1000 * 60));
                totalWorkMinutes = Math.max(0, diffMins - breakMinutes);
            } else if (status === "present" && !clockInDate) {
                totalWorkMinutes = 480;
            }

            const logs = [];
            if (clockInDate) {
                logs.push({ action: "clock_in", timestamp: clockInDate });
            }
            if (clockOutDate) {
                logs.push({ action: "clock_out", timestamp: clockOutDate });
            }

            await Attendance.findOneAndUpdate(
                { employeeId: user._id, date: parsedDate },
                {
                    $set: {
                        employeeId: user._id,
                        date: parsedDate,
                        status,
                        firstClockIn: clockInDate,
                        lastClockOut: clockOutDate,
                        totalWorkMinutes,
                        totalBreakMinutes: breakMinutes,
                        totalSessions: clockOutDate ? 1 : (clockInDate ? 1 : 0),
                        workMode,
                        remarks: rawRemarks ? String(rawRemarks).trim() : "",
                        logs
                    }
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );

            upsertedCount++;
        }

        return res.status(200).json({
            success: true,
            message: `Successfully imported ${upsertedCount} attendance records for ${user.fullName || user.firstName}!`,
            importedCount: upsertedCount,
            skippedCount,
            errors: errors.slice(0, 10),
            employee: {
                id: user._id,
                fullName: user.fullName || `${user.firstName} ${user.lastName || ""}`.trim()
            }
        });
    } catch (error) {
        console.error("Import Employee Attendance Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to import attendance data."
        });
    }
};

/**
 * Sync Biometric Punches Directly from Office Biometric Agent
 * Route: POST /api/attendance/biometric-sync
 */
export const syncBiometricPunches = async (req, res) => {
    try {
        const secretKey = req.headers["x-biometric-secret"] || req.body.apiKey;
        const expectedSecret = process.env.BIOMETRIC_SYNC_SECRET || "IdeaFueled_Biometric_Secret_2026_Secure";

        if (!secretKey || secretKey !== expectedSecret) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized: Invalid or missing biometric secret key."
            });
        }

        const rawPunches = Array.isArray(req.body.punches) ? req.body.punches : [];
        if (rawPunches.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No punches provided in request body."
            });
        }

        const users = await User.find({}).select("_id employeeId biometricEnrollNumber firstName lastName fullName").lean();
        const userMap = new Map();

        // 1. Map employeeId fallback
        users.forEach(u => {
            userMap.set(u._id.toString(), u);
            if (u.employeeId) {
                const raw = String(u.employeeId).trim();
                userMap.set(raw.toUpperCase(), u);
                const digits = raw.replace(/\D/g, "");
                if (digits) {
                    userMap.set(digits, u);
                    userMap.set(String(parseInt(digits, 10)), u);
                }
            }
        });

        // 2. Map explicit biometricEnrollNumber (PRIORITY over employeeId)
        users.forEach(u => {
            if (u.biometricEnrollNumber) {
                const rawBio = String(u.biometricEnrollNumber).trim();
                userMap.set(rawBio.toUpperCase(), u);
                const digitsBio = rawBio.replace(/\D/g, "");
                if (digitsBio) {
                    userMap.set(digitsBio, u);
                    userMap.set(String(parseInt(digitsBio, 10)), u);
                }
            }
        });

        // Group punches by user._id and date (IST: Asia/Kolkata)
        // Key format: `${userId}_${istDateStr}`
        const groupedMap = new Map();
        let skippedUnknownUsers = 0;

        for (const item of rawPunches) {
            const rawId = item.enrollNumber ?? item.userId ?? item.employeeId ?? item.employeeCode;
            if (rawId === undefined || rawId === null) continue;

            const cleanKey = String(rawId).trim();
            const digitsOnly = cleanKey.replace(/\D/g, "");
            const user = userMap.get(cleanKey.toUpperCase()) || 
                         (digitsOnly ? userMap.get(digitsOnly) : null) || 
                         (digitsOnly ? userMap.get(String(parseInt(digitsOnly, 10))) : null);

            if (!user) {
                skippedUnknownUsers++;
                continue;
            }

            const rawTimestamp = item.timestamp || item.time || item.punchTime;
            let punchDate;
            if (typeof rawTimestamp === "string") {
                let clean = rawTimestamp.trim().replace(" ", "T");
                if (!clean.includes("+") && !clean.includes("Z") && !clean.endsWith("z")) {
                    clean = `${clean}+05:30`;
                }
                punchDate = new Date(clean);
            } else {
                punchDate = new Date(rawTimestamp);
            }
            if (isNaN(punchDate.getTime())) continue;

            const istDateStr = punchDate.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }); // "YYYY-MM-DD"
            const groupKey = `${user._id.toString()}_${istDateStr}`;

            if (!groupedMap.has(groupKey)) {
                groupedMap.set(groupKey, {
                    user,
                    istDateStr,
                    punches: []
                });
            }

            groupedMap.get(groupKey).punches.push(punchDate);
        }

        let updatedDaysCount = 0;
        const employeeSummary = new Map();
        const bulkOps = [];

        for (const [, group] of groupedMap.entries()) {
            const { user, istDateStr, punches } = group;

            // Sort chronologically
            punches.sort((a, b) => a.getTime() - b.getTime());

            // Debounce: filter duplicate punches closer than 45 seconds
            const filteredPunches = [];
            for (const p of punches) {
                if (filteredPunches.length === 0) {
                    filteredPunches.push(p);
                } else {
                    const lastP = filteredPunches[filteredPunches.length - 1];
                    const diffSec = Math.abs((p.getTime() - lastP.getTime()) / 1000);
                    if (diffSec >= 45) {
                        filteredPunches.push(p);
                    }
                }
            }

            if (filteredPunches.length === 0) continue;

            const [year, month, day] = istDateStr.split("-").map(Number);
            const dateObj = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

            const firstClockIn = filteredPunches[0];
            const lastClockOut = filteredPunches.length > 1 ? filteredPunches[filteredPunches.length - 1] : null;

            // Generate logs with alternating clock_in and clock_out
            const logs = [];
            for (let i = 0; i < filteredPunches.length; i++) {
                logs.push({
                    action: i % 2 === 0 ? "clock_in" : "clock_out",
                    timestamp: filteredPunches[i]
                });
            }

            // Separate clockIns and clockOuts
            const clockIns = logs.filter(l => l.action === "clock_in");
            const clockOuts = logs.filter(l => l.action === "clock_out");

            // Calculate work and break minutes strictly within this day
            let totalWorkMinutes = 0;
            let totalBreakMinutes = 0;

            if (filteredPunches.length === 1) {
                totalWorkMinutes = 0;
                totalBreakMinutes = 0;
            } else if (filteredPunches.length === 2) {
                const spanMins = Math.round((lastClockOut.getTime() - firstClockIn.getTime()) / 60000);
                totalWorkMinutes = Math.max(0, spanMins);
                totalBreakMinutes = 0;
            } else {

                for (let i = 0; i < Math.min(clockIns.length, clockOuts.length); i++) {
                    const diff = (new Date(clockOuts[i].timestamp) - new Date(clockIns[i].timestamp)) / (1000 * 60);
                    if (diff > 0) totalWorkMinutes += diff;
                }

                for (let i = 0; i < clockOuts.length; i++) {
                    if (clockIns[i + 1]) {
                        const breakDiff = (new Date(clockIns[i + 1].timestamp) - new Date(clockOuts[i].timestamp)) / (1000 * 60);
                        if (breakDiff > 0) totalBreakMinutes += breakDiff;
                    }
                }

                totalWorkMinutes = Math.round(totalWorkMinutes);
                totalBreakMinutes = Math.round(totalBreakMinutes);

                // Sanity check: Total break cannot exceed the total day span (lastClockOut - firstClockIn)
                const totalSpan = Math.round((lastClockOut.getTime() - firstClockIn.getTime()) / 60000);
                if (totalBreakMinutes > totalSpan) {
                    totalBreakMinutes = Math.max(0, totalSpan - totalWorkMinutes);
                }
            }

            let status = "present";
            if (filteredPunches.length === 1) {
                status = "present";
            } else if (totalWorkMinutes < 240 && totalWorkMinutes > 0) {
                status = "half_day";
            }

            bulkOps.push({
                updateOne: {
                    filter: { employeeId: user._id, date: dateObj },
                    update: {
                        $set: {
                            employeeId: user._id,
                            date: dateObj,
                            status,
                            firstClockIn,
                            lastClockOut,
                            totalWorkMinutes: Math.floor(totalWorkMinutes),
                            totalBreakMinutes: Math.floor(totalBreakMinutes),
                            totalSessions: clockIns.length,
                            workMode: "Office",
                            logs
                        }
                    },
                    upsert: true
                }
            });

            updatedDaysCount++;
            employeeSummary.set(user._id.toString(), user.fullName || user.firstName);
        }

        if (bulkOps.length > 0) {
            await Attendance.bulkWrite(bulkOps, { ordered: false });
        }

        return res.status(200).json({
            success: true,
            message: `Biometric sync completed. Processed ${rawPunches.length} punches across ${updatedDaysCount} attendance records for ${employeeSummary.size} employees.`,
            stats: {
                totalPunchesReceived: rawPunches.length,
                recordsUpserted: updatedDaysCount,
                employeesCount: employeeSummary.size,
                skippedUnknownUsers
            }
        });
    } catch (error) {
        console.error("Biometric Sync Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to sync biometric punches."
        });
    }
};

/**
 * Biometric Status Check
 * Route: GET /api/attendance/biometric-status
 */
export const getBiometricStatus = async (req, res) => {
    try {
        const lastRecord = await Attendance.findOne({ workMode: "Office", "logs.0": { $exists: true } })
            .sort({ updatedAt: -1 })
            .populate("employeeId", "fullName firstName lastName employeeId");

        return res.status(200).json({
            success: true,
            status: "ready",
            lastSyncTime: lastRecord ? lastRecord.updatedAt : null,
            lastSyncedEmployee: lastRecord?.employeeId ? (lastRecord.employeeId.fullName || lastRecord.employeeId.firstName) : null
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};