import Leave from "../../models/leaves/leave.model.js";
import User from "../../models/users/user.model.js";

/**
 * Calculates accrued leave quota for a financial year (1st April to 31st March)
 * - Casual Leave: 0.5 per month accrued automatically on current date/month (Max 6/yr)
 * - Earned Leave: 1.0 per month accrued automatically on current date/month (Max 12/yr)
 * - Sick Leave: 6.0 credited upfront on 1st April (Max 6/yr)
 * - Partial Leave: 1 per month quota (Max 12/yr)
 */
export const calculateAccruedLeaves = (joiningDate = null, referenceDate = new Date()) => {
    const today = new Date(referenceDate);
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); // 0 = Jan, 3 = April

    // Financial Year starts April 1st
    let fyStartYear = currentYear;
    if (currentMonth < 3) {
        fyStartYear = currentYear - 1;
    }
    const fyStartDate = new Date(fyStartYear, 3, 1); // 1st April

    let calcStartDate = fyStartDate;
    if (joiningDate) {
        const jDate = new Date(joiningDate);
        if (!isNaN(jDate.getTime()) && jDate > fyStartDate) {
            calcStartDate = jDate;
        }
    }

    let elapsedMonths = 0;
    if (today >= calcStartDate) {
        const yearDiff = today.getFullYear() - calcStartDate.getFullYear();
        const monthDiff = today.getMonth() - calcStartDate.getMonth();
        elapsedMonths = yearDiff * 12 + monthDiff + 1; // Includes current month
    }
    elapsedMonths = Math.min(12, Math.max(0, elapsedMonths));

    const casualAccrued = parseFloat((elapsedMonths * 0.5).toFixed(1));
    const earnedAccrued = parseFloat((elapsedMonths * 1.0).toFixed(1));
    const sickAccrued = 6.0;
    const partialAccrued = 1.0; // 1 per month quota

    return {
        casual: { accrued: casualAccrued, annualQuota: 6 },
        earned: { accrued: earnedAccrued, annualQuota: 12 },
        sick: { accrued: sickAccrued, annualQuota: 6 },
        partial: { accrued: partialAccrued, annualQuota: 12 },
        elapsedMonths,
        fyStartYear
    };
};

export const applyLeave = async (req, res) => {
    try {
        const {
            employeeId,
            leaveType,
            startDate,
            endDate,
            totalDays,
            partialMinutes,
            partialTiming,
            reason,
        } = req.body;

        const isPartial = leaveType === "partial_leave";
        let days = isPartial ? (totalDays || 0.25) : Number(totalDays);

        if (!isPartial && (!days || isNaN(days)) && startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            const diffTime = Math.abs(end - start);
            days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        }

        if (
            !employeeId ||
            !leaveType ||
            !startDate ||
            (!isPartial && !endDate) ||
            !reason
        ) {
            return res.status(400).json({
                success: false,
                message: "All required fields must be provided.",
            });
        }

        // Validate monthly quota for Partial Leave
        if (isPartial) {
            const user = await User.findById(employeeId);
            const monthlyQuota = user?.leaveBalance?.partial?.total ?? 1;

            // Start & End of current calendar month
            const reqStart = new Date(startDate);
            const monthStart = new Date(reqStart.getFullYear(), reqStart.getMonth(), 1);
            const monthEnd = new Date(reqStart.getFullYear(), reqStart.getMonth() + 1, 0, 23, 59, 59);

            const existingMonthPartials = await Leave.countDocuments({
                employeeId,
                leaveType: "partial_leave",
                status: { $ne: "rejected" },
                startDate: { $gte: monthStart, $lte: monthEnd }
            });

            if (existingMonthPartials >= monthlyQuota) {
                return res.status(400).json({
                    success: false,
                    message: `Monthly Partial Leave quota reached (${monthlyQuota} allowed per month). You can apply again next month.`,
                });
            }
        }

        const leave = await Leave.create({
            employeeId,
            leaveType,
            startDate,
            endDate: endDate || startDate,
            totalDays: days,
            partialMinutes: isPartial ? (Number(partialMinutes) || 120) : 0,
            partialTiming: isPartial ? (partialTiming || "Leaving Early") : "",
            reason,
        });

        let key = "";
        if (leaveType === "sick_leave") key = "sick";
        else if (leaveType === "casual_leave") key = "casual";
        else if (leaveType === "earned_leave") key = "earned";
        else if (leaveType === "partial_leave") key = "partial";

        const updateObj = {
            pendingLeaves: days
        };

        if (key) {
            updateObj[`leaveBalance.${key}.pending`] = 1;
        }

        await User.findByIdAndUpdate(employeeId, {
            $inc: updateObj,
        });

        return res.status(201).json({
            success: true,
            message: isPartial ? "Partial leave applied successfully." : "Leave applied successfully.",
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

        // Calculate dynamic accrual for current financial year
        const accruedData = calculateAccruedLeaves(user.joiningDate);

        const casualTotal = accruedData.casual.accrued;
        const earnedTotal = accruedData.earned.accrued;
        const sickTotal = accruedData.sick.accrued;

        // Current month bounds for partial leave quota tracking
        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        const partialMonthlyQuota = user.leaveBalance?.partial?.total ?? 1;

        const leaves = await Leave.find({ employeeId });

        const balance = {
            sick: { total: sickTotal, accrued: sickTotal, annualQuota: accruedData.sick.annualQuota, used: 0, pending: 0 },
            casual: { total: casualTotal, accrued: casualTotal, annualQuota: accruedData.casual.annualQuota, used: 0, pending: 0 },
            earned: { total: earnedTotal, accrued: earnedTotal, annualQuota: accruedData.earned.annualQuota, used: 0, pending: 0 },
            partial: { total: partialMonthlyQuota, accrued: 1, annualQuota: 12, used: 0, pending: 0, available: partialMonthlyQuota, usedMinutes: 0 }
        };

        leaves.forEach(leave => {
            if (leave.leaveType === "partial_leave") {
                const leaveDate = new Date(leave.startDate);
                if (leaveDate >= currentMonthStart && leaveDate <= currentMonthEnd) {
                    if (leave.status === "approved") {
                        balance.partial.used += 1;
                        balance.partial.usedMinutes += (leave.partialMinutes || 120);
                    } else if (leave.status === "pending") {
                        balance.partial.pending += 1;
                    }
                }
            } else {
                let key = "";
                if (leave.leaveType === "sick_leave") key = "sick";
                else if (leave.leaveType === "casual_leave") key = "casual";
                else if (leave.leaveType === "earned_leave") key = "earned";

                if (key) {
                    let days = Number(leave.totalDays);
                    if (isNaN(days) || days === undefined || days === null) {
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
            }
        });

        // Round all numbers cleanly to 1 decimal place
        balance.sick.used = parseFloat(balance.sick.used.toFixed(1));
        balance.sick.pending = parseFloat(balance.sick.pending.toFixed(1));
        balance.casual.used = parseFloat(balance.casual.used.toFixed(1));
        balance.casual.pending = parseFloat(balance.casual.pending.toFixed(1));
        balance.earned.used = parseFloat(balance.earned.used.toFixed(1));
        balance.earned.pending = parseFloat(balance.earned.pending.toFixed(1));

        balance.partial.available = Math.max(0, balance.partial.total - balance.partial.used - balance.partial.pending);

        const usedLeaves = parseFloat((balance.sick.used + balance.casual.used + balance.earned.used).toFixed(1));
        const pendingLeaves = parseFloat((balance.sick.pending + balance.casual.pending + balance.earned.pending).toFixed(1));
        const totalLeaves = parseFloat((balance.sick.total + balance.casual.total + balance.earned.total).toFixed(1));
        const availableLeaves = parseFloat((totalLeaves - usedLeaves - pendingLeaves).toFixed(1));

        return res.status(200).json({
            success: true,
            leaveSummary: {
                totalLeaves,
                usedLeaves,
                pendingLeaves,
                availableLeaves,
                leaveBalance: balance,
                accruedDetails: accruedData
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

export const updateLeaveBalance = async (req, res) => {
    try {
        const { employeeId } = req.params;
        const { casual, sick, earned, partial } = req.body;

        const user = await User.findById(employeeId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        if (!user.leaveBalance) user.leaveBalance = {};
        if (casual !== undefined) {
            user.leaveBalance.casual = { ...user.leaveBalance.casual, total: Number(casual) };
        }
        if (sick !== undefined) {
            user.leaveBalance.sick = { ...user.leaveBalance.sick, total: Number(sick) };
        }
        if (earned !== undefined) {
            user.leaveBalance.earned = { ...user.leaveBalance.earned, total: Number(earned) };
        }
        if (partial !== undefined) {
            user.leaveBalance.partial = { ...user.leaveBalance.partial, total: Number(partial) };
        }

        user.markModified("leaveBalance");
        await user.save();

        return res.status(200).json({
            success: true,
            message: "Leave balance updated successfully.",
            leaveBalance: user.leaveBalance
        });
    } catch (error) {
        console.error("Update Leave Balance Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

