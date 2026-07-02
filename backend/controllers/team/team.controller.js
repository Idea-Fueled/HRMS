import User from "../../models/users/user.model.js";
import Leave from "../../models/leaves/leave.model.js";
import Attendance from "../../models/attendance/attendance.model.js";
import Performance from "../../models/performance/performance.model.js";

// Helper function to seed mock team data if DB has only the logged-in user
const seedMockDataIfNeeded = async (currentUserId) => {
    try {
        const userCount = await User.countDocuments();
        // If only 1 user (the logged-in admin/hr user), seed a full mock team
        if (userCount <= 1) {
            console.log("Seeding mock team members, leaves, attendance, and reviews into MongoDB...");

            const currentUser = await User.findById(currentUserId);
            const managerId = currentUser ? currentUser._id : null;

            // Seed 6 team members
            const mockUsers = [
                {
                    employeeId: "EMP-0004",
                    firstName: "Rishabh",
                    lastName: "Loomba",
                    fullName: "Rishabh Loomba",
                    email: "rishabh.loomba@company.com",
                    phoneNumber: "9876543210",
                    role: "manager",
                    department: "Engineering",
                    designation: "Engineering Lead",
                    managerId: managerId,
                    employementType: "full_time",
                    workLocation: "Office",
                    status: "active",
                    joiningDate: new Date("2024-01-15")
                },
                {
                    employeeId: "EMP-0045",
                    firstName: "Aria",
                    lastName: "Chen",
                    fullName: "Aria Chen",
                    email: "aria.chen@company.com",
                    phoneNumber: "9876543211",
                    role: "employee",
                    department: "Marketing",
                    designation: "SEO Specialist",
                    managerId: managerId,
                    employementType: "full_time",
                    workLocation: "WFH",
                    status: "active",
                    joiningDate: new Date("2025-03-10")
                },
                {
                    employeeId: "EMP-0089",
                    firstName: "Sarah",
                    lastName: "Jenkins",
                    fullName: "Sarah Jenkins",
                    email: "sarah.j@company.com",
                    phoneNumber: "9876543212",
                    role: "hr",
                    department: "Marketing",
                    designation: "Marketing Director",
                    managerId: managerId,
                    employementType: "full_time",
                    workLocation: "Office",
                    status: "active",
                    joiningDate: new Date("2023-11-20")
                },
                {
                    employeeId: "EMP-0122",
                    firstName: "Kofi",
                    lastName: "Annan",
                    fullName: "Kofi Annan",
                    email: "kofi.annan@company.com",
                    phoneNumber: "9876543213",
                    role: "employee",
                    department: "HR",
                    designation: "HR Business Partner",
                    managerId: managerId,
                    employementType: "contract",
                    workLocation: "Office",
                    status: "on_notice",
                    joiningDate: new Date("2024-06-01")
                },
                {
                    employeeId: "EMP-0130",
                    firstName: "Tariq",
                    lastName: "Ramadan",
                    fullName: "Tariq Ramadan",
                    email: "tariq.r@company.com",
                    phoneNumber: "9876543214",
                    role: "employee",
                    department: "Sales",
                    designation: "Senior Business Developer",
                    managerId: managerId,
                    employementType: "full_time",
                    workLocation: "Office",
                    status: "active",
                    joiningDate: new Date("2025-08-15")
                },
                {
                    employeeId: "EMP-0145",
                    firstName: "Diana",
                    lastName: "Prince",
                    fullName: "Diana Prince",
                    email: "diana.p@company.com",
                    phoneNumber: "9876543215",
                    role: "employee",
                    department: "HR",
                    designation: "Talent Acquisition Associate",
                    managerId: managerId,
                    employementType: "part_time",
                    workLocation: "Office",
                    status: "inactive",
                    joiningDate: new Date("2025-09-01")
                }
            ];

            const createdUsers = [];
            for (const u of mockUsers) {
                // Check if email already exists to prevent duplicate seeding
                const exists = await User.findOne({ email: u.email });
                if (!exists) {
                    const created = await User.create({
                        ...u,
                        password: "mockedpassword123" // placeholder hashed password or string
                    });
                    createdUsers.push(created);
                }
            }

            if (createdUsers.length > 0) {
                const rishabh = createdUsers.find(cu => cu.employeeId === "EMP-0004");
                const aria = createdUsers.find(cu => cu.employeeId === "EMP-0045");
                const kofi = createdUsers.find(cu => cu.employeeId === "EMP-0122");
                const diana = createdUsers.find(cu => cu.employeeId === "EMP-0145");

                // Seed attendance records for today
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                await Attendance.create([
                    {
                        employeeId: rishabh._id,
                        date: today,
                        status: "present",
                        workMode: "Office",
                        firstClockIn: new Date(today.getTime() + 8.75 * 60 * 60 * 1000), // 8:45 AM
                        lastClockOut: new Date(today.getTime() + 17.8 * 60 * 60 * 1000), // 5:48 PM
                        totalWorkMinutes: 543,
                        totalSessions: 1
                    },
                    {
                        employeeId: aria._id,
                        date: today,
                        status: "present",
                        workMode: "Work From Home",
                        firstClockIn: new Date(today.getTime() + 9.58 * 60 * 60 * 1000), // 9:35 AM
                        lastClockOut: new Date(today.getTime() + 18.66 * 60 * 60 * 1000), // 6:40 PM
                        totalWorkMinutes: 545,
                        totalSessions: 1
                    }
                ]);

                // Seed some leave records
                await Leave.create([
                    {
                        employeeId: aria._id,
                        leaveType: "casual_leave",
                        startDate: new Date(today.getTime() + 8 * 24 * 60 * 60 * 1000),
                        endDate: new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000),
                        totalDays: 3,
                        reason: "Family event out of town",
                        status: "pending"
                    },
                    {
                        employeeId: kofi._id,
                        leaveType: "sick_leave",
                        startDate: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000),
                        endDate: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000),
                        totalDays: 1,
                        reason: "Severe fever medical consult",
                        status: "approved"
                    },
                    {
                        employeeId: diana._id,
                        leaveType: "sick_leave",
                        startDate: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000),
                        endDate: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000),
                        totalDays: 1,
                        reason: "Routine checkup request",
                        status: "rejected"
                    }
                ]);

                // Seed some performance reviews
                await Performance.create([
                    {
                        employeeId: rishabh._id,
                        quarter: "Q2 2026",
                        rating: 4.6,
                        reviewerId: managerId,
                        status: "Exceeds Expectations"
                    },
                    {
                        employeeId: aria._id,
                        quarter: "Q2 2026",
                        rating: 4.2,
                        reviewerId: managerId,
                        status: "Meets Expectations"
                    },
                    {
                        employeeId: kofi._id,
                        quarter: "Q2 2026",
                        rating: 2.9,
                        reviewerId: managerId,
                        status: "Needs Improvement"
                    }
                ]);
            }
        }
    } catch (e) {
        console.error("Seeding team mock data failed:", e);
    }
};

/* ─────────────────────────────────────────────
   TEAM SUMMARY ENDPOINT
───────────────────────────────────────────── */
export const getTeamSummary = async (req, res) => {
    try {
        const userId = req.user?.id || req.user?.userId;
        await seedMockDataIfNeeded(userId);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const [
            totalEmployees,
            activeEmployees,
            onLeaveToday,
            wfhToday,
            newJoiners,
            pendingApprovals
        ] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ status: "active" }),
            Leave.countDocuments({ status: "approved", startDate: { $lte: today }, endDate: { $gte: today } }),
            Attendance.countDocuments({ date: today, workMode: { $regex: /work from home|wfh/i } }),
            User.countDocuments({ joiningDate: { $gte: thirtyDaysAgo } }),
            Leave.countDocuments({ status: "pending" })
        ]);

        // Aggregate Department distribution
        const deptDistribution = await User.aggregate([
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

        const members = await User.find()
            .populate("managerId", "fullName email designation")
            .sort({ fullName: 1 });

        const formattedMembers = members.map(m => ({
            _id: m._id,
            id: m.employeeId || `EMP-${m._id.toString().substring(0, 4).toUpperCase()}`,
            name: m.fullName || `${m.firstName} ${m.lastName}`,
            email: m.email,
            profilePicture: m.profilePicture || "",
            dept: m.department || "General",
            title: m.designation || "Employee",
            manager: m.managerId ? m.managerId.fullName : "None",
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

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const activeUsers = await User.find({ status: "active" });
        const attendanceLogs = await Attendance.find({ date: today });
        const leavesToday = await Leave.find({ status: "approved", startDate: { $lte: today }, endDate: { $gte: today } });

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
                status = att.status === "present" ? "Present" : att.status === "half_day" ? "Half Day" : "Present";
                if (att.workMode && att.workMode.toLowerCase().includes("home")) {
                    status = "WFH";
                    wfhCount++;
                } else {
                    presentCount++;
                }

                checkIn = att.firstClockIn ? new Date(att.firstClockIn).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "-- : --";
                checkOut = att.lastClockOut ? new Date(att.lastClockOut).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "-- : --";

                if (att.totalWorkMinutes) {
                    const h = Math.floor(att.totalWorkMinutes / 60);
                    const m = att.totalWorkMinutes % 60;
                    hours = `${h}h ${m}m`;
                }
                mode = att.workMode || "Office";

                // Count late if clock-in is after 9:15 AM
                if (att.firstClockIn && new Date(att.firstClockIn).getHours() >= 9 && new Date(att.firstClockIn).getMinutes() > 15) {
                    status = "Late";
                    lateCount++;
                }
            } else if (onLeave) {
                status = "On Leave";
                absentCount++;
            } else {
                absentCount++;
            }

            return {
                name: user.fullName || `${user.firstName} ${user.lastName}`,
                dept: user.department || "Engineering",
                profilePicture: user.profilePicture || "",
                checkIn,
                checkOut,
                hours,
                mode,
                status
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

        const leaves = await Leave.find()
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
            Leave.countDocuments({ status: "pending" }),
            Leave.countDocuments({ status: "approved" }),
            Leave.countDocuments({ status: "rejected" }),
            Leave.countDocuments({ status: "approved", startDate: { $lte: today }, endDate: { $gte: today } })
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

        const reviews = await Performance.find()
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
        const outstanding = await Performance.countDocuments({ status: "Outstanding" });
        const exceeds = await Performance.countDocuments({ status: "Exceeds Expectations" });
        const meets = await Performance.countDocuments({ status: "Meets Expectations" });
        const needsImprovement = await Performance.countDocuments({ status: "Needs Improvement" });

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
