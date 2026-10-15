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

        // Restrict Earned Leave for Interns & Employees in Probation (< 6 months)
        if (leaveType === "earned_leave") {
            const applicantUser = await User.findById(employeeId);
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
        else if (leaveType === "comp_off" || leaveType === "comp_off_leave") key = "compOff";

        const updateObj = {
            pendingLeaves: days
        };

        if (key) {
            updateObj[`leaveBalance.${key}.pending`] = days;
        }

        await User.findByIdAndUpdate(employeeId, {
            $inc: updateObj,
        });

        // Dispatch notification emails to Notify list, Reporting Manager, and Global Admins
        try {
            const applicant = await User.findById(employeeId).populate("managerId");
            const applicantName = applicant?.fullName || `${applicant?.firstName || ''} ${applicant?.lastName || ''}`.trim() || "Employee";

            const recipientUserIds = new Set();
            if (Array.isArray(notifyEmployees)) {
                notifyEmployees.forEach(id => { if (id) recipientUserIds.add(id.toString()); });
            }
            if (applicant?.managerId?._id) {
                recipientUserIds.add(applicant.managerId._id.toString());
            }
            const globalAdmins = await User.find({ role: "global_admin" }).select("_id email fullName");
            globalAdmins.forEach(ga => recipientUserIds.add(ga._id.toString()));

            recipientUserIds.delete(employeeId.toString());

            const recipients = await User.find({ _id: { $in: Array.from(recipientUserIds) } });
            const formattedLeaveType = isPartial ? "Partial Leave (2 Hours)" : leaveType.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
            const subject = `Leave Application: ${applicantName} - ${formattedLeaveType}`;
            const snippet = `${applicantName} has applied for ${formattedLeaveType} on ${new Date(startDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}.`;

            for (const rec of recipients) {
                const recEmail = rec.email.toLowerCase();
                const isManager = applicant?.managerId?._id && applicant.managerId._id.toString() === rec._id.toString();
                const isAdmin = rec.role === "global_admin";

                const emailDoc = new Email({
                    sender: applicant._id,
                    senderEmail: applicant.email,
                    senderName: applicantName,
                    senderAvatar: applicant.profilePicture || "",
                    senderRole: applicant.role,
                    to: [recEmail],
                    subject,
                    body: `<p>Hi <strong>${rec.fullName || 'Colleague'}</strong>,</p>
                           <p><strong>${applicantName}</strong> has applied for <strong>${formattedLeaveType}</strong>.</p>
                           <p><strong>Date:</strong> ${startDate}${!isPartial && endDate ? ` to ${endDate}` : ''}<br/>
                           <strong>Duration:</strong> ${days} Day(s)${isPartial ? ' (2 Hours Fixed)' : ''}<br/>
                           <strong>Reason:</strong> ${reason}</p>
                           ${(isManager || isAdmin) ? `<p style="margin-top: 14px;"><a href="/me" style="display: inline-block; padding: 6px 14px; background: #2D79C7; color: #fff; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 12px;">Review &amp; Approve in Leave Dashboard</a></p>` : ''}`,
                    snippet,
                    priority: "high",
                    labels: ["Leave", "Notification"],
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

        const compOffTotal = user.leaveBalance?.compOff?.total ?? 0;
        const compOffUsed = user.leaveBalance?.compOff?.used ?? 0;
        const compOffPending = user.leaveBalance?.compOff?.pending ?? 0;

        const balance = {
            sick: { total: sickTotal, accrued: sickTotal, annualQuota: accruedData.sick.annualQuota, used: 0, pending: 0 },
            casual: { total: casualTotal, accrued: casualTotal, annualQuota: accruedData.casual.annualQuota, used: 0, pending: 0 },
            earned: { total: earnedTotal, accrued: earnedTotal, annualQuota: accruedData.earned.annualQuota, used: 0, pending: 0 },
            compOff: { total: compOffTotal, accrued: compOffTotal, annualQuota: compOffTotal, used: compOffUsed, pending: compOffPending, available: Math.max(0, compOffTotal - compOffUsed - compOffPending) },
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
                else if (leave.leaveType === "comp_off" || leave.leaveType === "comp_off_leave") key = "compOff";

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

        const applicant = await User.findById(employeeId).populate("department");
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

        // Find all Global Admins
        const globalAdmins = await User.find({ role: "global_admin" });

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
                        Hello Global Admin,
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

        for (const admin of globalAdmins) {
            const adminEmail = (admin.email || "").toLowerCase();
            if (!adminEmail) continue;

            // Save in internal HRMS mailbox
            try {
                const emailDoc = new Email({
                    sender: applicant._id,
                    senderEmail: applicantEmail,
                    senderName: applicantName,
                    senderAvatar: applicant.profilePicture || "",
                    senderRole: applicant.role,
                    to: [adminEmail],
                    subject,
                    body: emailHtml,
                    snippet,
                    priority: "high",
                    labels: ["Leave", "Comp Off", "Credit Request"],
                    userStates: [{
                        user: admin._id,
                        email: adminEmail,
                        folder: "inbox",
                        isRead: false
                    }]
                });
                emailDoc.threadId = emailDoc._id;
                await emailDoc.save();

                emitToUser({ userId: admin._id, email: adminEmail }, "new_email", {
                    email: emailDoc,
                    unreadCount: 1
                });
            } catch (internalMailErr) {
                console.error("Error creating internal email doc for admin:", internalMailErr);
            }

            // Dispatch via nodemailer SMTP if configured
            try {
                await dispatchExternalEmail({
                    to: adminEmail,
                    subject,
                    body: emailHtml
                });
            } catch (externalMailErr) {
                console.warn("External email delivery to admin skipped/failed:", externalMailErr);
            }
        }

        return res.status(201).json({
            success: true,
            message: "Compensatory off credit request submitted successfully. Global Admins have been notified via email.",
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

