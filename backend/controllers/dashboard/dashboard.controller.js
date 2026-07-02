import User from "../../models/users/user.model.js";
import Attendance from "../../models/attendance/attendance.model.js";
import Holiday from "../../models/holidays/holidays.model.js";
import Leave from "../../models/leaves/leave.model.js";
import Post from "../../models/posts/post.model.js";

export const getDashboardData = async (req, res) => {
    try {
        const { employeeId } = req.params;

        // User Details
        const user = await User.findById(employeeId).select(
            "-password"
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        // Today's Attendance
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const attendance = await Attendance.findOne({
            employeeId,
            date: today,
        });

        const leaves = await Leave.find({ employeeId });

        const balance = {
            sick: { total: 6, used: 0, pending: 0 },
            casual: { total: 8, used: 0, pending: 0 },
            earned: { total: 20, used: 0, pending: 0 }
        };

        leaves.forEach(leave => {
            let key = "";
            if (leave.leaveType === "sick_leave") key = "sick";
            else if (leave.leaveType === "casual_leave") key = "casual";
            else if (leave.leaveType === "earned_leave") key = "earned";

            if (key) {
                let days = leave.totalDays;
                if (days === undefined || days === null) {
                    const start = new Date(leave.startDate);
                    const end = new Date(leave.endDate);
                    const diffTime = Math.abs(end - start);
                    days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                }

                if (leave.status === "approved") {
                    balance[key].used += days;
                } else if (leave.status === "pending") {
                    balance[key].pending += days;
                }
            }
        });

        const usedLeaves = balance.sick.used + balance.casual.used + balance.earned.used;
        const pendingLeaves = balance.sick.pending + balance.casual.pending + balance.earned.pending;
        const availableLeaves = (user.totalLeaves || 20) - usedLeaves - pendingLeaves;

        // Leave Summary
        const leaveSummary = {
            totalLeaves: user.totalLeaves || 20,
            usedLeaves,
            pendingLeaves,
            availableLeaves,
            leaveBalance: balance
        };

        // Upcoming Holidays
        const upcomingHolidays = await Holiday.find({
            isActive: true,
            date: {
                $gte: new Date(),
            },
        })
            .sort({ date: 1 })
            .limit(5);

        // Latest Posts
        const posts = await Post.find({
            isActive: true,
        })
            .populate(
                "author",
                "fullName designation profilePicture"
            )
            .sort({ createdAt: -1 })
            .limit(10);

        // Upcoming Birthdays
        const users = await User.find({
            dateOfBirth: {
                $exists: true,
                $ne: null,
            },
            status: "active",
        }).select(
            "fullName designation profilePicture dateOfBirth"
        );

        const upcomingBirthdays = users
            .map((user) => {
                const dob = new Date(user.dateOfBirth);

                const nextBirthday = new Date(
                    today.getFullYear(),
                    dob.getMonth(),
                    dob.getDate()
                );

                if (nextBirthday < today) {
                    nextBirthday.setFullYear(
                        today.getFullYear() + 1
                    );
                }

                const daysRemaining = Math.ceil(
                    (nextBirthday - today) /
                    (1000 * 60 * 60 * 24)
                );

                return {
                    _id: user._id,
                    fullName: user.fullName,
                    designation: user.designation,
                    profilePicture: user.profilePicture,
                    dateOfBirth: user.dateOfBirth,
                    daysRemaining,
                };
            })
            .sort(
                (a, b) =>
                    a.daysRemaining - b.daysRemaining
            )
            .slice(0, 5);

        return res.status(200).json({
            success: true,

            data: {
                user,
                attendance,
                leaveSummary,
                upcomingHolidays,
                posts,
                upcomingBirthdays,
            },
        });
    } catch (error) {
        console.error("Dashboard Error:", error);

        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};