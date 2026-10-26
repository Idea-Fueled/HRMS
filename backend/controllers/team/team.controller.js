import User from "../../models/users/user.model.js";
import Leave from "../../models/leaves/leave.model.js";
import Attendance from "../../models/attendance/attendance.model.js";
import Performance from "../../models/performance/performance.model.js";

// Helper function to seed mock team data if DB has only the logged-in user
const seedMockDataIfNeeded = async (currentUserId) => {
    return;
};

// Helper function to get caller's assigned visible/team employee IDs
const getHrVisibleFilter = async (currentUserId) => {
    if (!currentUserId) return [];
    const currentUser = await User.findById(currentUserId).select("role visibleEmployees").lean();
    if (!currentUser) return [];

    // Global Admin / Admin has full company-wide visibility
    if (currentUser.role === "global_admin" || currentUser.role === "admin") {
        return null;
    }

    // HR user: ONLY see their assigned visible employees (if none assigned, see 0 employees)
    if (currentUser.role === "hr") {
        if (currentUser.visibleEmployees && currentUser.visibleEmployees.length > 0) {
            return currentUser.visibleEmployees.map(id => id.toString());
        }
        return [];
    }

    // Regular Employee or Intern: CANNOT see team attendance
    if (currentUser.role === "employee" || currentUser.role === "intern") {
        return [];
    }

    // Manager / Management / Team Lead: ONLY see their direct reports
    const directReports = await User.find({
        $or: [
            { managerId: currentUser._id },
            { dottedManagerId: currentUser._id }
        ]
    }).select("_id").lean();

    return directReports.map(d => d._id.toString());
};

/* ─────────────────────────────────────────────
   TEAM SUMMARY ENDPOINT
───────────────────────────────────────────── */
export const getTeamSummary = async (req, res) => {
    try {
        const userId = req.user?.id || req.user?.userId;
        await seedMockDataIfNeeded(userId);

        const hrVisibleIds = await getHrVisibleFilter(userId);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const userFilter = hrVisibleIds ? { _id: { $in: hrVisibleIds } } : {};
        const activeUserFilter = hrVisibleIds ? { status: "active", _id: { $in: hrVisibleIds } } : { status: "active" };

        const [
            totalEmployees,
            activeEmployees,
            onLeaveToday,
            wfhToday,
            newJoiners,
            pendingApprovals
        ] = await Promise.all([
            User.countDocuments(userFilter),
            User.countDocuments(activeUserFilter),
            Leave.countDocuments({ status: "approved", startDate: { $lte: today }, endDate: { $gte: today }, ...(hrVisibleIds ? { employeeId: { $in: hrVisibleIds } } : {}) }),
            Attendance.countDocuments({ date: today, workMode: { $regex: /work from home|wfh/i }, ...(hrVisibleIds ? { employeeId: { $in: hrVisibleIds } } : {}) }),
            User.countDocuments({ joiningDate: { $gte: thirtyDaysAgo }, ...userFilter }),
            Leave.countDocuments({ status: "pending", ...(hrVisibleIds ? { employeeId: { $in: hrVisibleIds } } : {}) })
        ]);

        // Aggregate Department distribution
        const deptDistribution = await User.aggregate([
            ...(hrVisibleIds ? [{ $match: { _id: { $in: hrVisibleIds.map(id => User.mongoose?.Types?.ObjectId?.createFromHexString ? User.mongoose.Types.ObjectId.createFromHexString(id) : id) } } }] : []),
            { $group: { _id: "$department", count: { $sum: 1 } } }
        ]);

        const totalForDept = totalEmployees || 1;
        const formattedDepts = deptDistribution.map(d => ({
            label: d._id || "Other",
            count: d.count,
            percentage: Math.round((d.count / totalForDept) * 100)
        })).sort((a, b) => b.count - a.count);

        // Aggregate Statuses
        const statusDistribution = await User.aggregate([
            ...(hrVisibleIds ? [{ $match: { _id: { $in: hrVisibleIds.map(id => User.mongoose?.Types?.ObjectId?.createFromHexString ? User.mongoose.Types.ObjectId.createFromHexString(id) : id) } } }] : []),
            { $group: { _id: "$status", count: { $sum: 1 } } }
        ]);

        const formattedStatuses = statusDistribution.map(s => {
            let label = "Active";
            let color = "bg-[#A5CF83]";
            if (s._id === "inactive") {
                label = "Inactive";
                color = "bg-[#E89951]";
            } else if (s._id === "on_notice") {
                label = "On Notice";
                color = "bg-[#FEEC41]";
            }
            return {
                label,
                count: s.count,
                pct: Math.round((s.count / totalForDept) * 100),
                color
            };
        }).sort((a, b) => b.count - a.count);

        return res.status(200).json({
            success: true,
            summary: {
                totalEmployees,
                activeEmployees,
                onLeaveToday,
                wfhToday,
                newJoiners,
                pendingApprovals,
                departments: formattedDepts,
                statuses: formattedStatuses
            }
        });
    } catch (err) {
        console.error("Get Team Summary Error:", err);
        return res.status(500).json({ success: false, message: err.message });
    }
};

/* ─────────────────────────────────────────────
   TEAM MEMBERS ENDPOINT
───────────────────────────────────────────── */
export const getTeamMembers = async (req, res) => {
    try {
        const userId = req.user?.id || req.user?.userId;
        await seedMockDataIfNeeded(userId);

        const hrVisibleIds = await getHrVisibleFilter(userId);
        const query = hrVisibleIds ? { _id: { $in: hrVisibleIds } } : {};

        const members = await User.find(query)
            .populate("managerId", "fullName email designation department profilePicture")
            .sort({ fullName: 1 });

        const formattedMembers = members.map(m => ({
            _id: m._id,
            id: m.employeeId || `EMP-${m._id.toString().substring(0, 4).toUpperCase()}`,
            name: m.fullName || `${m.firstName} ${m.lastName}`,
            email: m.email,
            profilePicture: m.profilePicture || "",
            dept: m.department || "General",
            title: m.designation || "Employee",
            managerId: m.managerId ? (m.managerId._id || m.managerId) : null,
            manager: m.managerId ? (m.managerId.fullName || `${m.managerId.firstName || ""} ${m.managerId.lastName || ""}`) : "None",
            type: m.employementType === "full_time" ? "Full Time" : m.employementType === "intern" ? "Intern" : m.employementType === "contract" ? "Contract" : "Part Time",
            status: m.status === "active" ? "Active" : m.status === "on_notice" ? "On Notice" : "Inactive"
        }));

        return res.status(200).json({
            success: true,
            members: formattedMembers
        });
    } catch (err) {
        console.error("Get Team Members Error:", err);
        return res.status(500).json({ success: false, message: err.message });
    }
};

/* ─────────────────────────────────────────────
   TEAM ATTENDANCE ENDPOINT
───────────────────────────────────────────── */
export const getTeamAttendance = async (req, res) => {
    try {
        const userId = req.user?.id || req.user?.userId;
        await seedMockDataIfNeeded(userId);

        const hrVisibleIds = await getHrVisibleFilter(userId);

        if (Array.isArray(hrVisibleIds) && hrVisibleIds.length === 0) {
            return res.status(200).json({
                success: true,
                stats: {
                    present: 0,
                    absent: 0,
                    wfh: 0,
                    late: 0
                },
                logs: []
            });
        }

        const istDateStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
        const [y, m, d] = istDateStr.split("-").map(Number);
        const todayUtc = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
        const todayLocal = new Date();
        todayLocal.setHours(0, 0, 0, 0);

        const startOfDay = new Date(todayUtc.getTime() - 6 * 3600 * 1000);
        const endOfDay = new Date(todayUtc.getTime() + 24 * 3600 * 1000);

        const userQuery = hrVisibleIds ? { status: "active", _id: { $in: hrVisibleIds } } : { status: "active" };

        const activeUsers = await User.find(userQuery);
        const activeUserIds = activeUsers.map(u => u._id);

        const attendanceLogs = await Attendance.find({
            employeeId: { $in: activeUserIds },
            $or: [
                { date: todayUtc },
                { date: todayLocal },
                { date: { $gte: startOfDay, $lte: endOfDay } },
                { firstClockIn: { $gte: startOfDay, $lte: endOfDay } }
            ]
        });
        const leavesToday = await Leave.find({
            status: "approved",
            startDate: { $lte: endOfDay },
            endDate: { $gte: startOfDay },
            employeeId: { $in: activeUserIds }
        });

        let presentCount = 0;
        let absentCount = 0;
        let wfhCount = 0;
        let lateCount = 0;

        const formattedLogs = activeUsers.map(user => {
            const att = attendanceLogs.find(a => a.employeeId.toString() === user._id.toString());
            const onLeave = leavesToday.find(l => l.employeeId.toString() === user._id.toString());

            let status = "Absent";
            let checkIn = "-- : --";
            let checkOut = "-- : --";
            let hours = "00h 00m";
            let mode = "--";

            if (att) {
                const deptLower = (user.department || "").trim().toLowerCase();
                const isSales = deptLower.includes("sales");

                if (att.workMode && att.workMode.toLowerCase().includes("home")) {
                    status = "WFH";
                    wfhCount++;
                } else {
                    status = "On Time";
                    presentCount++;
                }

                checkIn = att.firstClockIn ? new Date(att.firstClockIn).toLocaleTimeString("en-US", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" }) : "-- : --";
                checkOut = att.lastClockOut ? new Date(att.lastClockOut).toLocaleTimeString("en-US", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" }) : "-- : --";

                if (att.totalWorkMinutes) {
                    const h = Math.floor(att.totalWorkMinutes / 60);
                    const m = att.totalWorkMinutes % 60;
                    hours = `${h}h ${m}m`;
                }
                mode = att.workMode || "Office";

                // Punctuality check:
                // 1. Sales team employees NEVER show as Late (always On Time)
                // 2. Others: Late ONLY if clock-in is strictly after 10:00 AM IST
                if (att.firstClockIn) {
                    if (isSales) {
                        status = "On Time";
                    } else {
                        const istParts = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "numeric", hour12: false }).formatToParts(new Date(att.firstClockIn));
                        const istHour = Number(istParts.find(p => p.type === "hour")?.value || 0);
                        const istMin = Number(istParts.find(p => p.type === "minute")?.value || 0);
                        const totalMins = istHour * 60 + istMin;
                        const tenAM = 10 * 60; // 600 mins

                        if (totalMins > tenAM) {
                            const lateDiff = totalMins - tenAM;
                            const lateH = Math.floor(lateDiff / 60);
                            const lateM = lateDiff % 60;
                            const lateStr = lateH > 0 ? `${lateH}h ${lateM}m` : `${lateM}m`;
                            status = `Late by ${lateStr}`;
                            lateCount++;
                        } else {
                            status = "On Time";
                        }
                    }
                }
            } else if (onLeave) {
                status = "On Leave";
                absentCount++;
            } else {
                absentCount++;
            }

            return {
                userId: user._id.toString(),
                name: user.fullName || `${user.firstName} ${user.lastName}`,
                dept: user.department || "Engineering",
                profilePicture: user.profilePicture || "",
                checkIn,
                checkOut,
                hours,
                mode,
                status,
                movementLogs: att ? att.logs.map(l => ({
                    time: new Date(l.timestamp).toLocaleTimeString("en-US", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" }),
                    type: l.action === "clock_in" ? "IN" : "OUT"
                })) : []
            };
        });

        return res.status(200).json({
            success: true,
            stats: {
                present: presentCount,
                absent: absentCount,
                wfh: wfhCount,
                late: lateCount
            },
            logs: formattedLogs
        });
    } catch (err) {
        console.error("Get Team Attendance Error:", err);
        return res.status(500).json({ success: false, message: err.message });
    }
};

/* ─────────────────────────────────────────────
   TEAM LEAVES ENDPOINT
───────────────────────────────────────────── */
export const getTeamLeaves = async (req, res) => {
    try {
        const userId = req.user?.id || req.user?.userId;
        await seedMockDataIfNeeded(userId);

        const hrVisibleIds = await getHrVisibleFilter(userId);
        const leaveQuery = hrVisibleIds ? { employeeId: { $in: hrVisibleIds } } : {};

        const leaves = await Leave.find(leaveQuery)
            .populate("employeeId", "fullName department profilePicture")
            .sort({ createdAt: -1 });

        const formattedLeaves = leaves.map(l => {
            const name = l.employeeId ? l.employeeId.fullName : "Unknown Employee";
            const dept = l.employeeId ? l.employeeId.department : "General";
            
            let displayType = "Casual Leave";
            if (l.leaveType === "sick_leave") displayType = "Sick Leave";
            else if (l.leaveType === "earned_leave") displayType = "Earned Leave";
            else if (l.leaveType === "unpaid_leave") displayType = "Unpaid Leave";

            const startStr = new Date(l.startDate).toISOString().split("T")[0];
            const endStr = new Date(l.endDate).toISOString().split("T")[0];

            const start = new Date(l.startDate);
            const end = new Date(l.endDate);
            const diffTime = Math.abs(end - start);
            const days = l.totalDays !== undefined && l.totalDays !== null && !isNaN(l.totalDays)
                ? l.totalDays
                : Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

            return {
                _id: l._id,
                name,
                dept,
                profilePicture: l.employeeId ? l.employeeId.profilePicture : "",
                type: displayType,
                start: startStr,
                end: endStr,
                duration: `${days} Day${days !== 1 ? 's' : ''}`,
                status: l.status.charAt(0).toUpperCase() + l.status.slice(1),
                reason: l.reason
            };
        });

        // Count summaries
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [pending, approved, rejected, onLeave] = await Promise.all([
            Leave.countDocuments({ status: "pending", ...(hrVisibleIds ? { employeeId: { $in: hrVisibleIds } } : {}) }),
            Leave.countDocuments({ status: "approved", ...(hrVisibleIds ? { employeeId: { $in: hrVisibleIds } } : {}) }),
            Leave.countDocuments({ status: "rejected", ...(hrVisibleIds ? { employeeId: { $in: hrVisibleIds } } : {}) }),
            Leave.countDocuments({ status: "approved", startDate: { $lte: today }, endDate: { $gte: today }, ...(hrVisibleIds ? { employeeId: { $in: hrVisibleIds } } : {}) })
        ]);

        return res.status(200).json({
            success: true,
            stats: { pending, approved, rejected, onLeave },
            leaves: formattedLeaves
        });
    } catch (err) {
        console.error("Get Team Leaves Error:", err);
        return res.status(500).json({ success: false, message: err.message });
    }
};

/* ─────────────────────────────────────────────
   TEAM PERFORMANCE ENDPOINT
───────────────────────────────────────────── */
export const getTeamPerformance = async (req, res) => {
    try {
        const userId = req.user?.id || req.user?.userId;
        await seedMockDataIfNeeded(userId);

        const hrVisibleIds = await getHrVisibleFilter(userId);
        const perfQuery = hrVisibleIds ? { employeeId: { $in: hrVisibleIds } } : {};

        const reviews = await Performance.find(perfQuery)
            .populate("employeeId", "fullName department profilePicture")
            .populate("reviewerId", "fullName")
            .sort({ createdAt: -1 });

        const formattedPerformance = reviews.map(r => ({
            name: r.employeeId ? r.employeeId.fullName : "Unknown Employee",
            dept: r.employeeId ? r.employeeId.department : "General",
            profilePicture: r.employeeId ? r.employeeId.profilePicture : "",
            quarter: r.quarter,
            rating: `${r.rating}/5`,
            reviewer: r.reviewerId ? r.reviewerId.fullName : "System",
            date: new Date(r.reviewDate).toISOString().split("T")[0],
            status: r.status
        }));

        // Stat metrics
        const outstanding = await Performance.countDocuments({ status: "Outstanding", ...(hrVisibleIds ? { employeeId: { $in: hrVisibleIds } } : {}) });
        const exceeds = await Performance.countDocuments({ status: "Exceeds Expectations", ...(hrVisibleIds ? { employeeId: { $in: hrVisibleIds } } : {}) });
        const meets = await Performance.countDocuments({ status: "Meets Expectations", ...(hrVisibleIds ? { employeeId: { $in: hrVisibleIds } } : {}) });
        const needsImprovement = await Performance.countDocuments({ status: "Needs Improvement", ...(hrVisibleIds ? { employeeId: { $in: hrVisibleIds } } : {}) });

        // Department distributions
        const deptPerformance = await Performance.aggregate([
            {
                $lookup: {
                    from: "users",
                    localField: "employeeId",
                    foreignField: "_id",
                    as: "employee"
                }
            },
            { $unwind: "$employee" },
            {
                $group: {
                    _id: "$employee.department",
                    avgRating: { $avg: "$rating" },
                    count: { $sum: 1 }
                }
            }
        ]);

        const formattedDepts = deptPerformance.map(d => ({
            label: d._id || "Other",
            avg: Math.round(d.avgRating * 10) / 10,
            count: d.count
        })).sort((a, b) => b.avg - a.avg);

        return res.status(200).json({
            success: true,
            stats: {
                outstanding,
                exceeds,
                meets,
                needsImprovement
            },
            reviews: formattedPerformance,
            departments: formattedDepts
        });
    } catch (err) {
        console.error("Get Team Performance Error:", err);
        return res.status(500).json({ success: false, message: err.message });
    }
};

/* ─────────────────────────────────────────────
   UPDATE LEAVE STATUS ENDPOINT
───────────────────────────────────────────── */
export const updateLeaveStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, remarks } = req.body;
        const managerId = req.user?.id || req.user?.userId;

        const normalizedStatus = status.toLowerCase();

        if (!["approved", "rejected"].includes(normalizedStatus)) {
            return res.status(400).json({ success: false, message: "Invalid status option. Choose approved or rejected." });
        }

        const leave = await Leave.findById(id);
        if (!leave) {
            return res.status(404).json({ success: false, message: "Leave request not found." });
        }

        // Adjust counts on user object if transitioning from pending
        if (leave.status === "pending") {
            const user = await User.findById(leave.employeeId);
            if (user) {
                let key = "";
                if (leave.leaveType === "sick_leave") key = "sick";
                else if (leave.leaveType === "casual_leave") key = "casual";
                else if (leave.leaveType === "earned_leave") key = "earned";
                else if (leave.leaveType === "comp_off" || leave.leaveType === "comp_off_leave") key = "compOff";

                const start = new Date(leave.startDate);
                const end = new Date(leave.endDate);
                const diffTime = Math.abs(end - start);
                const days = leave.totalDays !== undefined && leave.totalDays !== null && !isNaN(leave.totalDays)
                    ? leave.totalDays
                    : Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

                const decPendingObj = {
                    pendingLeaves: -days
                };
                if (key) {
                    decPendingObj[`leaveBalance.${key}.pending`] = -days;
                }

                if (normalizedStatus === "approved") {
                    const incUsedObj = {
                        usedLeaves: days
                    };
                    if (key) {
                        incUsedObj[`leaveBalance.${key}.used`] = days;
                    }
                    await User.findByIdAndUpdate(leave.employeeId, {
                        $inc: { ...decPendingObj, ...incUsedObj }
                    });
                } else {
                    await User.findByIdAndUpdate(leave.employeeId, {
                        $inc: decPendingObj
                    });
                }
            }
        }

        if (leave.totalDays === undefined || leave.totalDays === null || isNaN(leave.totalDays)) {
            const start = new Date(leave.startDate);
            const end = new Date(leave.endDate);
            const diffTime = Math.abs(end - start);
            leave.totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        }

        leave.status = normalizedStatus;
        leave.approvedBy = managerId;
        leave.remarks = remarks || "";
        await leave.save();

        return res.status(200).json({
            success: true,
            message: `Leave request ${normalizedStatus} successfully.`,
            leave
        });
    } catch (err) {
        console.error("Update Leave Status Error:", err);
        return res.status(500).json({ success: false, message: err.message });
    }
};
