import cron from "node-cron";
import User from "../models/users/user.model.js";
import Email from "../models/emails/email.model.js";
import { emitToUser } from "../socket/socket.js";

/**
 * Checks for employees approaching the end of their 6-month probation period.
 * Triggers alerts at exactly 15 days, 7 days, and 3 days before probation ends.
 * Recipients: Employee's Reporting Manager + All Global Admins.
 */
export const executeProbationReminder = async () => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayStr = today.toLocaleDateString("en-IN", {
            timeZone: "Asia/Kolkata",
            day: "2-digit",
            month: "short",
            year: "numeric"
        });

        // Find all active employees who have a joiningDate
        const employees = await User.find({
            status: { $in: ["active", "Active"] },
            joiningDate: { $exists: true, $ne: null }
        }).populate("managerId", "fullName firstName lastName email").lean();

        // Find all global admins
        const globalAdmins = await User.find({
            role: "global_admin"
        }).select("_id email fullName firstName lastName").lean();

        let alertCount = 0;

        for (const emp of employees) {
            const joinDate = new Date(emp.joiningDate);
            if (isNaN(joinDate.getTime())) continue;

            let probationDays = (emp.probationPeriod !== undefined && emp.probationPeriod !== null) ? Number(emp.probationPeriod) : 180;
            if (probationDays <= 12) probationDays = probationDays * 30; // backward compatibility if stored as months

            // Probation end date = DOJ + probationDays
            const probationEndDate = new Date(joinDate);
            probationEndDate.setDate(probationEndDate.getDate() + probationDays);
            probationEndDate.setHours(0, 0, 0, 0);

            // Difference in calendar days
            const diffMs = probationEndDate.getTime() - today.getTime();
            const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

            // Check target milestones: 15 days, 7 days, 3 days
            if (diffDays === 15 || diffDays === 7 || diffDays === 3) {
                const empName = emp.fullName || `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || "Employee";
                const probationEndDateStr = probationEndDate.toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric"
                });

                // Target recipients: Manager + Global Admins
                const recipientList = [];
                const seenEmails = new Set();

                // 1. Manager
                if (emp.managerId && emp.managerId.email) {
                    const mgrEmail = emp.managerId.email.toLowerCase();
                    recipientList.push({
                        id: emp.managerId._id,
                        email: mgrEmail,
                        name: emp.managerId.fullName || `${emp.managerId.firstName || ""} ${emp.managerId.lastName || ""}`.trim()
                    });
                    seenEmails.add(mgrEmail);
                }

                // 2. Global Admins
                for (const admin of globalAdmins) {
                    const adminEmail = (admin.email || "").toLowerCase();
                    if (adminEmail && !seenEmails.has(adminEmail)) {
                        recipientList.push({
                            id: admin._id,
                            email: adminEmail,
                            name: admin.fullName || `${admin.firstName || ""} ${admin.lastName || ""}`.trim()
                        });
                        seenEmails.add(adminEmail);
                    }
                }

                if (recipientList.length === 0) continue;

                // Check if already sent today for this employee & milestone
                const milestoneLabel = `Probation-${diffDays}Days`;
                const alreadySent = await Email.findOne({
                    labels: milestoneLabel,
                    subject: { $regex: empName, $options: "i" },
                    createdAt: { $gte: today }
                });

                if (alreadySent) {
                    continue;
                }

                const subject = `Probation Ending Reminder: ${empName} (${diffDays} Days Remaining)`;
                const snippet = `${empName}'s ${probationDays}-day probation period is concluding in ${diffDays} days on ${probationEndDateStr}.`;

                const emailBody = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 4px;">
    <!-- Banner Header -->
    <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 1px solid #fcd34d; border-radius: 14px; padding: 18px 22px; margin-bottom: 20px;">
        <span style="background-color: #d97706; color: #ffffff; font-size: 10px; font-weight: 800; padding: 3px 10px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.6px; display: inline-block; margin-bottom: 8px;">
            Probation Milestone Alert
        </span>
        <h2 style="margin: 0; color: #78350f; font-size: 18px; font-weight: 800; letter-spacing: -0.2px;">Probation Ending in ${diffDays} Days</h2>
        <p style="margin: 4px 0 0 0; color: #92400e; font-size: 13px; font-weight: 500;">
            Probation period ends on <strong>${probationEndDateStr}</strong>.
        </p>
    </div>

    <!-- Employee Details Card -->
    <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); margin-bottom: 20px;">
        <p style="font-size: 14px; margin-top: 0; color: #334155;">
            This is an automated reminder regarding <strong>${empName}</strong> (${emp.designation || "Staff"}, ${emp.department || "General"}).
        </p>

        <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px;">
            <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Employee ID:</td>
                <td style="padding: 8px 0; color: #0f172a; font-weight: 700;">${emp.employeeId || "N/A"}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Date of Joining:</td>
                <td style="padding: 8px 0; color: #0f172a; font-weight: 700;">${joinDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Probation End Date:</td>
                <td style="padding: 8px 0; color: #0f172a; font-weight: 700;">${probationEndDateStr}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Days Remaining:</td>
                <td style="padding: 8px 0; color: #d97706; font-weight: 800;">${diffDays} Days</td>
            </tr>
        </table>

        <div style="background-color: #f8fafc; border-left: 4px solid #2D79C7; padding: 12px 16px; border-radius: 0 8px 8px 0; margin-top: 16px;">
            <p style="margin: 0; font-size: 12.5px; color: #334155; line-height: 1.5;">
                <strong>Action Required:</strong> Please conduct the formal probation review meeting, evaluate overall performance, and complete the probation confirmation or extension workflow.
            </p>
        </div>
    </div>
</div>
`;

                const userStates = recipientList.map(rec => ({
                    user: rec.id,
                    email: rec.email,
                    folder: "inbox",
                    isRead: false,
                    isStarred: false,
                    isDeleted: false
                }));

                const newEmail = new Email({
                    sender: null,
                    senderEmail: "hr-system@ideafueled.com",
                    senderName: "HRMS Probation Monitor",
                    senderAvatar: "",
                    senderRole: "system",
                    to: recipientList.map(r => r.email),
                    cc: [],
                    bcc: [],
                    subject,
                    body: emailBody,
                    snippet,
                    attachments: [],
                    priority: "high",
                    labels: ["Probation", "Reminder", milestoneLabel],
                    userStates
                });

                newEmail.threadId = newEmail._id;
                await newEmail.save();
                alertCount++;

                // Real-time socket notification to all recipients
                for (const rec of recipientList) {
                    try {
                        const unreadCount = await Email.countDocuments({
                            userStates: {
                                $elemMatch: {
                                    email: rec.email,
                                    folder: "inbox",
                                    isRead: false,
                                    isDeleted: false
                                }
                            }
                        });

                        emitToUser(
                            { userId: rec.id, email: rec.email },
                            "probation_reminder",
                            {
                                title: `Probation Ending: ${empName}`,
                                message: `${empName}'s probation ends in ${diffDays} days (${probationEndDateStr}).`,
                                diffDays,
                                employeeName: empName,
                                emailId: newEmail._id,
                                unreadCount
                            }
                        );
                    } catch (sockErr) {
                        console.error("Socket error emitting probation reminder:", sockErr);
                    }
                }
            }
        }

        console.log(`✅ Probation Cron: Completed daily check. Sent ${alertCount} alerts for ${todayStr}.`);
        return { count: alertCount };
    } catch (error) {
        console.error("❌ Probation Cron Error:", error);
        return { count: 0, error: error.message };
    }
};

/**
 * Initializes cron schedule: Runs every morning at 9:00 AM IST (0 9 * * *).
 */
export const initProbationScheduler = () => {
    // Schedule at 9:00 AM every day
    cron.schedule("0 9 * * *", () => {
        console.log("⏰ Running daily 9:00 AM Probation Ending Cron...");
        executeProbationReminder();
    });

    console.log("🚀 Probation End Reminder scheduler initialized (runs daily at 9:00 AM).");
};
