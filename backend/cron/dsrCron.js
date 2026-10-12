import cron from "node-cron";
import User from "../models/users/user.model.js";
import Email from "../models/emails/email.model.js";
import { emitToUser } from "../socket/socket.js";

/**
 * Sends automated DSR reminder to all active non-global_admin users.
 * - Drops a reminder email in their Inbox
 * - Emits a real-time Socket.IO event with DSR details
 */
export const executeDsrReminder = async () => {
    try {
        const now = new Date();
        const todayStr = now.toLocaleDateString("en-IN", {
            timeZone: "Asia/Kolkata",
            day: "2-digit",
            month: "short",
            year: "numeric",
        });

        // Start of today in IST to prevent duplicate emails if job is run multiple times
        const startOfDay = new Date(now);
        startOfDay.setHours(0, 0, 0, 0);

        // Find all users whose role is NOT global_admin
        const targetUsers = await User.find({
            role: { $ne: "global_admin" },
        }).select("_id fullName firstName lastName email role managerId profilePicture");

        if (!targetUsers || targetUsers.length === 0) {
            console.log("ℹ️ DSR Cron: No non-admin users found to notify.");
            return { count: 0 };
        }

        console.log(`⏰ DSR Cron: Sending 5:30 PM DSR reminder to ${targetUsers.length} users for ${todayStr}...`);

        let sentCount = 0;

        for (const user of targetUsers) {
            const userEmail = user.email.toLowerCase();
            const userName =
                user.fullName ||
                `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
                "Colleague";

            // Check if already sent today
            const alreadySent = await Email.findOne({
                "userStates.email": userEmail,
                labels: "DSR-Reminder",
                createdAt: { $gte: startOfDay },
            });

            let emailId = null;

            if (!alreadySent) {
                const subject = `Reminder: Please Submit Today's DSR (${todayStr})`;
                const snippet = `Hi ${userName}, please submit your Daily Status Report (DSR) for today before wrapping up work.`;

                const emailBody = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 4px;">
    <!-- Banner Header -->
    <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border: 1px solid #bfdbfe; border-radius: 14px; padding: 18px 22px; margin-bottom: 20px;">
        <span style="background-color: #2563eb; color: #ffffff; font-size: 10px; font-weight: 800; padding: 3px 10px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.6px; display: inline-block; margin-bottom: 8px;">
            End of Day Reminder
        </span>
        <h2 style="margin: 0; color: #1e3a8a; font-size: 18px; font-weight: 800; letter-spacing: -0.2px;">Daily Status Report (DSR) Due</h2>
        <p style="margin: 4px 0 0 0; color: #3b82f6; font-size: 13px; font-weight: 500;">Please submit your progress update for <strong>${todayStr}</strong> before closing your workday.</p>
    </div>

    <!-- Content Card -->
    <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); margin-bottom: 20px;">
        <p style="font-size: 14px; margin-top: 0; color: #334155;">
            Hi <strong>${userName}</strong>,
        </p>
        <p style="font-size: 13px; color: #475569; margin-bottom: 16px;">
            It's 5:30 PM! Please take 2 minutes to summarize your accomplishments, in-progress items, and plans for the next working day.
        </p>

        <div style="background-color: #f8fafc; border-left: 4px solid #2D79C7; padding: 12px 16px; border-radius: 0 8px 8px 0; margin-bottom: 18px;">
            <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 700; color: #1e293b; text-transform: uppercase; letter-spacing: 0.5px;">Recommended DSR Format:</p>
            <ul style="margin: 0; padding-left: 18px; font-size: 12px; color: #475569; line-height: 1.8;">
                <li><strong>1. Tasks Completed Today</strong></li>
                <li><strong>2. Work In Progress</strong></li>
                <li><strong>3. Blockers / Impediments (if any)</strong></li>
                <li><strong>4. Plan for Tomorrow</strong></li>
            </ul>
        </div>

        <p style="font-size: 12px; color: #64748b; margin-bottom: 0;">
            👉 <em>Tip: Click the button on your screen notification or open the Mailbox Compose modal to write and send your DSR directly to your reporting manager and team.</em>
        </p>
    </div>

    <!-- Footer Note -->
    <div style="padding: 10px 14px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 11px; color: #94a3b8; text-align: center;">
        Automated Daily Reminder &bull; Idea Fueled HRMS &bull; Sent at 5:30 PM (IST)
    </div>
</div>
`.trim();

                const newEmail = new Email({
                    sender: null,
                    senderEmail: "dsr-bot@ideafueled.com",
                    senderName: "HRMS Daily Status Bot",
                    senderAvatar: "",
                    senderRole: "system",
                    to: [userEmail],
                    cc: [],
                    bcc: [],
                    subject,
                    body: emailBody,
                    snippet,
                    attachments: [],
                    priority: "high",
                    labels: ["DSR", "Reminder", "DSR-Reminder"],
                    userStates: [
                        {
                            user: user._id,
                            email: userEmail,
                            folder: "inbox",
                            isRead: false,
                            isStarred: false,
                            isDeleted: false,
                        },
                    ],
                });

                newEmail.threadId = newEmail._id;
                await newEmail.save();
                emailId = newEmail._id;
                sentCount++;
            } else {
                emailId = alreadySent._id;
            }

            // Real-time Socket.IO notification to this user with special DSR event
            try {
                const unreadCount = await Email.countDocuments({
                    userStates: {
                        $elemMatch: {
                            email: userEmail,
                            folder: "inbox",
                            isRead: false,
                            isDeleted: false,
                        },
                    },
                });

                emitToUser(
                    { userId: user._id, email: userEmail },
                    "dsr_reminder",
                    {
                        title: "Daily Status Report (DSR) Due",
                        message: `Hi ${userName}, please submit your DSR report for today (${todayStr}).`,
                        date: todayStr,
                        userName,
                        emailId,
                        unreadCount,
                    }
                );
            } catch (sockErr) {
                console.error(`Socket emit error for ${userEmail}:`, sockErr);
            }
        }

        console.log(`✅ DSR Cron: Successfully dispatched reminder to ${targetUsers.length} users (${sentCount} emails created).`);
        return { count: targetUsers.length, sentCount };
    } catch (err) {
        console.error("❌ Error running DSR cron reminder:", err);
        throw err;
    }
};

/**
 * Initializes the node-cron schedule:
 * Runs Monday to Friday at 5:30 PM (17:30 IST)
 */
export const initDsrScheduler = () => {
    // 30 17 * * 1-5 = 17:30 (5:30 PM) on Monday through Friday
    const cronExpression = "30 17 * * 1-5";

    cron.schedule(
        cronExpression,
        async () => {
            console.log("⏰ [CRON TRIGGER] 5:30 PM Monday-Friday DSR reminder triggered!");
            await executeDsrReminder();
        },
        {
            scheduled: true,
            timezone: "Asia/Kolkata",
        }
    );

    console.log("🚀 DSR Scheduler registered: Runs Monday to Friday at 5:30 PM (Asia/Kolkata).");
};
