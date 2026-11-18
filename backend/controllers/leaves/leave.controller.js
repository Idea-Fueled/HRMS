import Leave from "../../models/leaves/leave.model.js";
import User from "../../models/users/user.model.js";
import Email from "../../models/emails/email.model.js";
import CompOffRequest from "../../models/leaves/compOffRequest.model.js";
import { emitToUser } from "../../socket/socket.js";
import { dispatchExternalEmail } from "../../services/email.service.js";

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
            notifyEmployees,
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

        const applicantUser = await User.findById(employeeId);
        if (!applicantUser) {
            return res.status(404).json({
                success: false,
                message: "Employee not found.",
            });
        }

        // Caller authorization check for applying on behalf of employee
        const callerId = req.user?.id || req.user?.userId;
        const callerRole = (req.user?.role || "").toLowerCase();

        if (callerId && employeeId && callerId.toString() !== employeeId.toString()) {
            const isGlobalOrAdmin = callerRole === "global_admin" || callerRole === "admin";
            let isAuthorizedManager = false;

            if (!isGlobalOrAdmin && (callerRole === "manager" || callerRole === "management")) {
                const caller = await User.findById(callerId).select("department").lean();
                const isDirectReport = applicantUser.managerId && (
                    String(applicantUser.managerId._id || applicantUser.managerId) === String(callerId) ||
                    String(applicantUser.dottedManagerId?._id || applicantUser.dottedManagerId) === String(callerId)
                );

                let isSkipReport = false;
                if (applicantUser.managerId) {
                    const directMgrId = applicantUser.managerId._id || applicantUser.managerId;
                    const directMgr = await User.findById(directMgrId).select("managerId").lean();
                    if (directMgr && String(directMgr.managerId) === String(callerId)) {
                        isSkipReport = true;
                    }
                }

                const isSameDept = Boolean(
                    caller?.department && applicantUser.department &&
                    caller.department.trim().toLowerCase() === applicantUser.department.trim().toLowerCase()
                );

                if (isDirectReport || isSkipReport || isSameDept) {
                    isAuthorizedManager = true;
                }
            }

            if (!isGlobalOrAdmin && !isAuthorizedManager) {
                return res.status(403).json({
                    success: false,
                    message: "Unauthorized: You can only apply leaves for yourself or your team members."
                });
            }
        }

        let key = "";
        if (leaveType === "sick_leave") key = "sick";
        else if (leaveType === "casual_leave") key = "casual";
        else if (leaveType === "earned_leave") key = "earned";
        else if (leaveType === "partial_leave") key = "partial";
        else if (leaveType === "comp_off" || leaveType === "comp_off_leave") key = "compOff";

        // Validate available leave balance before creating (cannot apply for more than available balance)
        if (key && key !== "partial") {
            const currentTotal = applicantUser.leaveBalance?.[key]?.total ?? 0;
            if (currentTotal < days) {
                const formattedType = leaveType.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
                return res.status(400).json({
                    success: false,
                    message: `Insufficient ${formattedType} balance. You have ${currentTotal} day(s) available.`,
                });
            }
        }

        // Restrict Earned Leave for Interns & Employees in Probation (< 6 months)
        if (leaveType === "earned_leave") {
            const isIntern = applicantUser?.role === "intern" || applicantUser?.employementType === "intern";
            let isProbation = false;
            if (applicantUser?.joiningDate) {
                const joinDate = new Date(applicantUser.joiningDate);
                let probationDays = (applicantUser.probationPeriod !== undefined && applicantUser.probationPeriod !== null) ? Number(applicantUser.probationPeriod) : 180;
                if (probationDays <= 12) probationDays = probationDays * 30;
                const now = new Date();
                const diffDays = (now - joinDate) / (1000 * 60 * 60 * 24);
                if (diffDays < probationDays) isProbation = true;
            }
            if (isIntern || isProbation) {
                return res.status(400).json({
                    success: false,
                    message: "You are not eligible for earned leaves while on probation or internship.",
                });
            }

            // Earned Leave must be applied at least 7 days in advance
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const [y, m, d] = String(startDate).split("T")[0].split("-").map(Number);
            const reqStart = new Date(y, m - 1, d);
            reqStart.setHours(0, 0, 0, 0);

            const diffTime = reqStart.getTime() - today.getTime();
            const advanceDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

            if (advanceDays < 7) {
                return res.status(400).json({
                    success: false,
                    message: "Earned leave must be applied at least 7 days in advance.",
                });
            }
        }

        // Validate monthly quota for Partial Leave (Only 1 allowed per calendar month)
        if (isPartial) {
            const reqStart = new Date(startDate);
            const monthStart = new Date(reqStart.getFullYear(), reqStart.getMonth(), 1);
            const monthEnd = new Date(reqStart.getFullYear(), reqStart.getMonth() + 1, 0, 23, 59, 59);

            const existingMonthPartials = await Leave.countDocuments({
                employeeId,
                leaveType: "partial_leave",
                status: { $ne: "rejected" },
                startDate: { $gte: monthStart, $lte: monthEnd }
            });

            if (existingMonthPartials >= 1) {
                return res.status(400).json({
                    success: false,
                    message: "You have already consumed your monthly quota.",
                });
            }
        }

        const caller = await User.findById(callerId).select("fullName firstName lastName").lean();
        const callerName = caller ? (caller.fullName || `${caller.firstName || ""} ${caller.lastName || ""}`.trim()) : "";
        const isAppliedOnBehalf = Boolean(callerId && employeeId && callerId.toString() !== employeeId.toString());
        const appliedByRemark = isAppliedOnBehalf ? `Applied by ${callerName} (${callerRole === "manager" ? "Manager" : "Admin"}) on behalf of employee` : "";

        const leave = await Leave.create({
            employeeId,
            leaveType,
            startDate,
            endDate: endDate || startDate,
            totalDays: days,
            partialMinutes: isPartial ? (Number(partialMinutes) || 120) : 0,
            partialTiming: isPartial ? (partialTiming || "Leaving Early") : "",
            reason: reason ? (isAppliedOnBehalf ? `${reason} [${appliedByRemark}]` : reason) : appliedByRemark,
            remarks: appliedByRemark
        });

        // Deduct specific days immediately from leaveBalance.total and track in pending
        if (key && key !== "partial") {
            if (!applicantUser.leaveBalance) applicantUser.leaveBalance = {};
            if (!applicantUser.leaveBalance[key]) applicantUser.leaveBalance[key] = { total: 0, used: 0, pending: 0 };

            applicantUser.leaveBalance[key].total = Math.max(0, parseFloat(((applicantUser.leaveBalance[key].total || 0) - days).toFixed(1)));
            applicantUser.leaveBalance[key].pending = parseFloat(((applicantUser.leaveBalance[key].pending || 0) + days).toFixed(1));
            applicantUser.pendingLeaves = parseFloat(((applicantUser.pendingLeaves || 0) + days).toFixed(1));
            applicantUser.markModified("leaveBalance");
            await applicantUser.save();
        } else if (key === "partial") {
            if (!applicantUser.leaveBalance) applicantUser.leaveBalance = {};
            if (!applicantUser.leaveBalance.partial) applicantUser.leaveBalance.partial = { total: 1, used: 0, pending: 0 };
            applicantUser.leaveBalance.partial.pending = (applicantUser.leaveBalance.partial.pending || 0) + 1;
            applicantUser.markModified("leaveBalance");
            await applicantUser.save();
        }

        // Dispatch notification emails to Notify list, Reporting Manager, and Global Admins
        try {
            const applicant = await User.findById(employeeId).populate("managerId").populate("department");
            const applicantName = applicant?.fullName || `${applicant?.firstName || ''} ${applicant?.lastName || ''}`.trim() || "Employee";
            const applicantEmpId = applicant?.employeeId || "—";
            const applicantDept = applicant?.department?.name || applicant?.department || "General";
            const applicantDesignation = applicant?.designation || "Employee";

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
            const formattedLeaveType = isPartial ? "Partial Leave (2 Hours)" : leaveType.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
            const subject = `${formattedLeaveType} Application: ${applicantName} (${applicantEmpId})`;
            const snippet = `${applicantName} has applied for ${formattedLeaveType} on ${new Date(startDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}.`;

            const emailHtml = `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
                    <div style="background: linear-gradient(135deg, #2D79C7 0%, #1F5EA8 100%); padding: 24px; color: #ffffff;">
                        <h2 style="margin: 0; font-size: 20px; font-weight: 700;">${formattedLeaveType} Application</h2>
                        <p style="margin: 6px 0 0 0; opacity: 0.85; font-size: 13px;">Employee has applied for ${isPartial ? 'partial day off' : 'leave'}.</p>
                    </div>
                    
                    <div style="padding: 24px;">
                        <p style="font-size: 14px; color: #374151; margin-top: 0;">
                            Hello,
                        </p>
                        <p style="font-size: 14px; color: #374151;">
                            <strong>${applicantName}</strong> has submitted an application for <strong>${formattedLeaveType}</strong>.
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
                                    <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Leave Type:</td>
                                    <td style="padding: 6px 0; color: #2D79C7; font-weight: 700;">${formattedLeaveType}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Dates:</td>
                                    <td style="padding: 6px 0; color: #1E293B;">${startDate}${!isPartial && endDate && endDate !== startDate ? ` to ${endDate}` : ''}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Duration:</td>
                                    <td style="padding: 6px 0; color: #1E293B; font-weight: 700;">${days} Day(s)${isPartial ? ' (2 Hours Fixed)' : ''}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 6px 0; color: #64748B; font-weight: 600; vertical-align: top;">Reason:</td>
                                    <td style="padding: 6px 0; color: #1E293B; white-space: pre-line;">${reason}</td>
                                </tr>
                            </table>
                        </div>

                        <div style="text-align: center; margin-top: 20px;">
                            <a href="${(process.env.FRONTEND_URL || 'https://hrms.ideafueled.com').replace(/\/$/, '')}/approvals?leaveId=${leave._id}" style="background: #2D79C7; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 13px; padding: 10px 20px; border-radius: 6px; display: inline-block;">
                                Review &amp; Approve in HRMS
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

                const emailDoc = new Email({
                    sender: applicant._id,
                    senderEmail: applicant.email,
                    senderName: applicantName,
                    senderAvatar: applicant.profilePicture || "",
                    senderRole: applicant.role,
                    to: [recEmail],
                    subject,
                    body: emailHtml,
                    snippet,
                    priority: "high",
                    labels: ["Leave", "Notification", "Leave-Request", `LeaveId:${leave._id}`],
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

                try {
                    await dispatchExternalEmail({
                        to: recEmail,
                        subject,
                        body: emailHtml
                    });
                } catch (extErr) {
                    console.warn("External email delivery to recipient skipped/failed:", extErr);
                }
            }
        } catch (emailErr) {
            console.error("Failed to notify leave recipients:", emailErr);
        }

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

        // Calculate dynamic accrual as fallback
        const accruedData = calculateAccruedLeaves(user.joiningDate);
        const userBal = user.leaveBalance || {};

        // Prioritize explicit quotas set by Admin in Edit Employee (representing current available balance)
        const casualTotal = userBal.casual?.total ?? accruedData.casual.accrued;
        const earnedTotal = userBal.earned?.total ?? accruedData.earned.accrued;
        const sickTotal = userBal.sick?.total ?? accruedData.sick.accrued;
        const compOffTotal = userBal.compOff?.total ?? 0;

        const casualUsed = userBal.casual?.used ?? 0;
        const earnedUsed = userBal.earned?.used ?? 0;
        const sickUsed = userBal.sick?.used ?? 0;
        const compOffUsed = userBal.compOff?.used ?? 0;

        const casualPending = userBal.casual?.pending ?? 0;
        const earnedPending = userBal.earned?.pending ?? 0;
        const sickPending = userBal.sick?.pending ?? 0;
        const compOffPending = userBal.compOff?.pending ?? 0;

        const casualAnnualQuota = userBal.casual?.annualQuota ?? parseFloat((casualTotal + casualUsed).toFixed(1));
        const earnedAnnualQuota = userBal.earned?.annualQuota ?? parseFloat((earnedTotal + earnedUsed).toFixed(1));
        const sickAnnualQuota = userBal.sick?.annualQuota ?? parseFloat((sickTotal + sickUsed).toFixed(1));

        // Current month bounds for partial leave quota tracking
        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

        const partialMonthlyQuota = userBal.partial?.total ?? 1;

        // Verify partial leaves for this calendar month
        const monthlyPartials = await Leave.find({
            employeeId,
            leaveType: "partial_leave",
            status: { $ne: "rejected" },
            startDate: { $gte: currentMonthStart, $lte: currentMonthEnd }
        });
        const partialUsed = monthlyPartials.filter(l => l.status === "approved").length;
        const partialPending = monthlyPartials.filter(l => l.status === "pending").length;
        const partialUsedMinutes = monthlyPartials.filter(l => l.status === "approved").reduce((sum, l) => sum + (l.partialMinutes || 120), 0);

        const balance = {
            sick: {
                total: parseFloat((sickTotal + sickUsed + sickPending).toFixed(1)),
                accrued: parseFloat((sickTotal + sickUsed).toFixed(1)),
                annualQuota: sickAnnualQuota,
                used: sickUsed,
                pending: sickPending,
                available: sickTotal
            },
            casual: {
                total: parseFloat((casualTotal + casualUsed + casualPending).toFixed(1)),
                accrued: parseFloat((casualTotal + casualUsed).toFixed(1)),
                annualQuota: casualAnnualQuota,
                used: casualUsed,
                pending: casualPending,
                available: casualTotal
            },
            earned: {
                total: parseFloat((earnedTotal + earnedUsed + earnedPending).toFixed(1)),
                accrued: parseFloat((earnedTotal + earnedUsed).toFixed(1)),
                annualQuota: earnedAnnualQuota,
                used: earnedUsed,
                pending: earnedPending,
                available: earnedTotal
            },
            compOff: {
                total: parseFloat((compOffTotal + compOffUsed + compOffPending).toFixed(1)),
                accrued: parseFloat((compOffTotal + compOffUsed).toFixed(1)),
                annualQuota: parseFloat((compOffTotal + compOffUsed).toFixed(1)),
                used: compOffUsed,
                pending: compOffPending,
                available: compOffTotal
            },
            partial: {
                total: partialMonthlyQuota,
                accrued: 1,
                annualQuota: 12,
                used: partialUsed,
                pending: partialPending,
                available: Math.max(0, partialMonthlyQuota - partialUsed - partialPending),
                usedMinutes: partialUsedMinutes
            }
        };

        const availableLeaves = parseFloat((balance.sick.available + balance.casual.available + balance.earned.available).toFixed(1));
        const usedLeaves = parseFloat((balance.sick.used + balance.casual.used + balance.earned.used).toFixed(1));
        const pendingLeaves = parseFloat((balance.sick.pending + balance.casual.pending + balance.earned.pending).toFixed(1));
        const totalLeaves = parseFloat((availableLeaves + usedLeaves).toFixed(1));

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
        const { casual, sick, earned, partial, compOff } = req.body;

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
        if (compOff !== undefined) {
            user.leaveBalance.compOff = { ...user.leaveBalance.compOff, total: Number(compOff) };
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

export const requestCompOffCredit = async (req, res) => {
    try {
        const { employeeId, workedDates, note, isHalfDay, attachments } = req.body;

        if (!employeeId || !workedDates || !note?.trim()) {
            return res.status(400).json({
                success: false,
                message: "Employee ID, worked dates, and note are required."
            });
        }

        const datesArray = Array.isArray(workedDates) ? workedDates : [workedDates];
        if (datesArray.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Please specify at least one worked date."
            });
        }

        const applicant = await User.findById(employeeId).populate("department").populate("managerId");
        if (!applicant) {
            return res.status(404).json({
                success: false,
                message: "Applicant user not found."
            });
        }

        const applicantName = applicant.fullName || `${applicant.firstName || ""} ${applicant.lastName || ""}`.trim() || "Employee";
        const applicantEmail = applicant.email;
        const applicantEmpId = applicant.employeeId || "N/A";
        const applicantDept = applicant.department?.name || applicant.department || "N/A";
        const applicantDesignation = applicant.designation || "N/A";

        const parsedDates = datesArray.map(d => new Date(d));
        const daysCount = isHalfDay ? 0.5 : parsedDates.length;

        // Save Comp Off Credit Request in DB
        const creditRequest = await CompOffRequest.create({
            employeeId,
            workedDates: parsedDates,
            daysCount,
            isHalfDay: !!isHalfDay,
            attachments: Array.isArray(attachments) ? attachments : [],
            note: note.trim(),
            status: "pending"
        });

        // Find all Global Admins and Specific Manager
        const globalAdmins = await User.find({ role: { $in: ["global_admin", "admin"] } });

        const recipientUserIds = new Set();
        globalAdmins.forEach(ga => recipientUserIds.add(ga._id.toString()));
        if (applicant?.managerId?._id) {
            recipientUserIds.add(applicant.managerId._id.toString());
        } else if (applicant?.managerId) {
            recipientUserIds.add(applicant.managerId.toString());
        }
        recipientUserIds.delete(applicant._id.toString());

        const recipients = await User.find({ _id: { $in: Array.from(recipientUserIds) } });

        // Format dates for display in email
        const formattedDatesList = parsedDates.map(d => {
            return d.toLocaleDateString("en-IN", {
                weekday: "short",
                day: "2-digit",
                month: "short",
                year: "numeric"
            });
        }).join(", ");

        const subject = `Compensatory Off Credit Request: ${applicantName} (${applicantEmpId})`;
        const snippet = `${applicantName} requested credit for ${daysCount} compensatory off day(s) worked on: ${formattedDatesList}.`;

        const emailHtml = `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden;">
                <div style="background: linear-gradient(135deg, #2D79C7 0%, #1F5EA8 100%); padding: 24px; color: #ffffff;">
                    <h2 style="margin: 0; font-size: 20px; font-weight: 700;">Compensatory Off Credit Request</h2>
                    <p style="margin: 6px 0 0 0; opacity: 0.85; font-size: 13px;">Employee has worked on a weekend / holiday and requested comp-off credit.</p>
                </div>
                
                <div style="padding: 24px;">
                    <p style="font-size: 14px; color: #374151; margin-top: 0;">
                        Hello,
                    </p>
                    <p style="font-size: 14px; color: #374151;">
                        <strong>${applicantName}</strong> has submitted a request for <strong>${daysCount} day(s)</strong> of Compensatory Off credit.
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
                                <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Dates Worked:</td>
                                <td style="padding: 6px 0; color: #2D79C7; font-weight: 700;">${formattedDatesList}</td>
                            </tr>
                            <tr>
                                <td style="padding: 6px 0; color: #64748B; font-weight: 600;">Days Count:</td>
                                <td style="padding: 6px 0; color: #1E293B; font-weight: 700;">${daysCount} Day(s)</td>
                            </tr>
                            <tr>
                                <td style="padding: 6px 0; color: #64748B; font-weight: 600; vertical-align: top;">Employee Note:</td>
                                <td style="padding: 6px 0; color: #1E293B; white-space: pre-line;">${note}</td>
                            </tr>
                        </table>
                    </div>

                    <p style="font-size: 13px; color: #64748B; margin-bottom: 24px;">
                        Please review the request and grant the compensatory off balance in the HRMS Leave Balances section.
                    </p>

                    <div style="text-align: center;">
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/employees" style="background: #2D79C7; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 13px; padding: 10px 20px; border-radius: 6px; display: inline-block;">
                            Manage Employee Leaves
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

            // Save in internal HRMS mailbox
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
                    labels: ["Leave", "Comp Off", "Credit Request"],
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
                console.error("Error creating internal email doc for comp-off recipient:", internalMailErr);
            }

            // Dispatch via nodemailer SMTP if configured
            try {
                await dispatchExternalEmail({
                    to: recEmail,
                    subject,
                    body: emailHtml
                });
            } catch (externalMailErr) {
                console.warn("External email delivery to comp-off recipient skipped/failed:", externalMailErr);
            }
        }

        return res.status(201).json({
            success: true,
            message: "Compensatory off credit request submitted successfully. Global Admins and Manager have been notified via email.",
            creditRequest
        });
    } catch (error) {
        console.error("Request Comp Off Credit Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/**
 * Cancel a pending leave request
 */
export const cancelLeave = async (req, res) => {
    try {
        const { id } = req.params;
        const callerId = req.user?.id || req.user?.userId;
        const callerRole = (req.user?.role || "").toLowerCase();
        const isGlobalAdmin = callerRole === "global_admin" || callerRole === "admin";

        const leave = await Leave.findById(id);

        if (!leave) {
            return res.status(404).json({
                success: false,
                message: "Leave request not found."
            });
        }

        if (leave.status === "cancelled" || leave.status === "rejected") {
            return res.status(400).json({
                success: false,
                message: `This leave request is already ${leave.status}.`
            });
        }

        // Non-admins can only cancel pending or manager_approved leaves
        if (!isGlobalAdmin && !["pending", "manager_approved"].includes(leave.status)) {
            return res.status(400).json({
                success: false,
                message: "Only pending leave requests can be cancelled by employees."
            });
        }

        const wasApproved = leave.status === "approved";

        leave.status = "cancelled";
        leave.cancelledBy = callerId || null;
        leave.cancelledAt = new Date();
        leave.cancellationReason = req.body?.remarks || (isGlobalAdmin ? "Cancelled by Global Admin" : "Cancelled by employee");
        await leave.save();

        // Refund / credit back deducted days to employee's leave balance
        const user = await User.findById(leave.employeeId);
        if (user) {
            let key = "";
            if (leave.leaveType === "sick_leave") key = "sick";
            else if (leave.leaveType === "casual_leave") key = "casual";
            else if (leave.leaveType === "earned_leave") key = "earned";
            else if (leave.leaveType === "comp_off" || leave.leaveType === "comp_off_leave") key = "compOff";
            else if (leave.leaveType === "partial_leave") key = "partial";

            const days = Number(leave.totalDays) || 1;
            if (key && user.leaveBalance && user.leaveBalance[key]) {
                if (key !== "partial") {
                    user.leaveBalance[key].total = parseFloat(((user.leaveBalance[key].total || 0) + days).toFixed(1));
                    if (wasApproved) {
                        user.leaveBalance[key].used = Math.max(0, parseFloat(((user.leaveBalance[key].used || 0) - days).toFixed(1)));
                    } else {
                        user.leaveBalance[key].pending = Math.max(0, parseFloat(((user.leaveBalance[key].pending || 0) - days).toFixed(1)));
                    }
                } else {
                    if (wasApproved) {
                        user.leaveBalance.partial.used = Math.max(0, (user.leaveBalance.partial.used || 0) - 1);
                    } else {
                        user.leaveBalance.partial.pending = Math.max(0, (user.leaveBalance.partial.pending || 0) - 1);
                    }
                }
            }
            if (wasApproved) {
                user.usedLeaves = Math.max(0, parseFloat(((user.usedLeaves || 0) - days).toFixed(1)));
            } else {
                user.pendingLeaves = Math.max(0, parseFloat(((user.pendingLeaves || 0) - days).toFixed(1)));
            }
            user.markModified("leaveBalance");
            await user.save();
        }

        return res.status(200).json({
            success: true,
            message: "Leave request cancelled successfully and days refunded.",
            leave
        });
    } catch (error) {
        console.error("Cancel Leave Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};


