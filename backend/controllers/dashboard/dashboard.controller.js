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

        // Today's Date & Attendance (aligned with IST timezone matching attendance controller)
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const istDateStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
        const [y, m, d] = istDateStr.split("-").map(Number);
        const todayUtc = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
        const istDayStart = new Date(Date.UTC(y, m - 1, d, 0, 0, 0) - (5.5 * 3600 * 1000));
        const istDayEnd = new Date(istDayStart.getTime() + 24 * 3600 * 1000 - 1);

        const attendance = await Attendance.findOne({
            employeeId,
            $or: [
                { date: todayUtc },
                { date: { $gte: istDayStart, $lte: istDayEnd } }
            ]
        }).sort({ date: -1, updatedAt: -1 });

        const leaves = await Leave.find({ employeeId });

        const userBal = user.leaveBalance || {};
        const sickTotal = userBal.sick?.total ?? 6;
        const casualTotal = userBal.casual?.total ?? 8;
        const earnedTotal = userBal.earned?.total ?? 20;

        const sickUsed = userBal.sick?.used ?? 0;
        const casualUsed = userBal.casual?.used ?? 0;
        const earnedUsed = userBal.earned?.used ?? 0;

        const sickPending = userBal.sick?.pending ?? 0;
        const casualPending = userBal.casual?.pending ?? 0;
        const earnedPending = userBal.earned?.pending ?? 0;

        const balance = {
            sick: { total: sickTotal, used: sickUsed, pending: sickPending, available: sickTotal },
            casual: { total: casualTotal, used: casualUsed, pending: casualPending, available: casualTotal },
            earned: { total: earnedTotal, used: earnedUsed, pending: earnedPending, available: earnedTotal }
        };

        const availableLeaves = parseFloat((sickTotal + casualTotal + earnedTotal).toFixed(1));
        const usedLeaves = parseFloat((sickUsed + casualUsed + earnedUsed).toFixed(1));
        const pendingLeaves = parseFloat((sickPending + casualPending + earnedPending).toFixed(1));
        const totalLeaves = parseFloat((availableLeaves + usedLeaves).toFixed(1));

        // Leave Summary
        const leaveSummary = {
            totalLeaves,
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