import Leave from "../../models/leaves/leave.model.js";
import User from "../../models/users/user.model.js";

export const applyLeave = async (req, res) => {
    try {
        const {
            employeeId,
            leaveType,
            startDate,
            endDate,
            totalDays,
            reason,
        } = req.body;

        let days = totalDays;
        if (!days && startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            const diffTime = Math.abs(end - start);
            days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        }

        if (
            !employeeId ||
            !leaveType ||
            !startDate ||
            !endDate ||
            !days ||
            !reason
        ) {
            return res.status(400).json({
                success: false,
                message: "All fields are required.",
            });
        }

        const leave = await Leave.create({
            employeeId,
            leaveType,
            startDate,
            endDate,
            totalDays: days,
            reason,
        });

        let key = "";
        if (leaveType === "sick_leave") key = "sick";
        else if (leaveType === "casual_leave") key = "casual";
        else if (leaveType === "earned_leave") key = "earned";

        const updateObj = {
            pendingLeaves: days
        };

        if (key) {
            updateObj[`leaveBalance.${key}.pending`] = days;
        }

        await User.findByIdAndUpdate(employeeId, {
            $inc: updateObj,
        });

        return res.status(201).json({
            success: true,
            message: "Leave applied successfully.",
            leave,
        });
    } catch (error) {
        console.error("Apply Leave Error:", error);

        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

export const getLeaveSummary = async (req, res) => {
    try {
        const { employeeId } = req.params;

        const user = await User.findById(employeeId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found.",
            });
        }

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

        return res.status(200).json({
            success: true,
            leaveSummary: {
                totalLeaves: user.totalLeaves || 20,
                usedLeaves,
                pendingLeaves,
                availableLeaves,
                leaveBalance: balance
            },
        });
    } catch (error) {
        console.error("Leave Summary Error:", error);

        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

export const getLeaveHistory = async (req, res) => {
    try {
        const { employeeId } = req.params;
        const leaves = await Leave.find({ employeeId })
            .populate("approvedBy", "name")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            leaves,
        });
    } catch (error) {
        console.error("Leave History Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

