import Email from "../../models/emails/email.model.js";
import User from "../../models/users/user.model.js";
import { uploadToCloudinary } from "../../services/cloudinary.service.js";
import { dispatchExternalEmail } from "../../services/email.service.js";
import mongoose from "mongoose";

/**
 * Strips HTML tags for quick preview snippets
 */
const createSnippet = (htmlString) => {
    if (!htmlString) return "";
    const clean = htmlString.replace(/<[^>]*>?/gm, "").trim();
    return clean.length > 140 ? clean.substring(0, 140) + "..." : clean;
};

/**
 * Normalizes email list input (JSON stringified array, raw array, or delimited string)
 */
const parseEmailList = (input) => {
    if (!input) return [];

    let list = [];
    if (Array.isArray(input)) {
        list = input;
    } else if (typeof input === "string") {
        const trimmed = input.trim();
        try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
                list = parsed;
            } else if (typeof parsed === "string") {
                list = parsed.split(/[,;]+/);
            }
        } catch (_) {
            list = trimmed.split(/[,;]+/);
        }
    }

    return list
        .map((e) => String(e).replace(/[\[\]"']/g, "").trim().toLowerCase())
        .filter((e) => e.length > 0 && e.includes("@"));
};

/**
 * Seed initial realistic welcome & HR announcement emails if user inbox is completely empty
 */
const seedInitialEmailsIfEmpty = async (user) => {
    try {
        const userEmail = user.email.toLowerCase();
        const existingCount = await Email.countDocuments({
            "userStates.email": userEmail,
        });

        if (existingCount > 0) return;

        // Find Admin or HR user to serve as realistic senders
        const puneet = await User.findOne({ email: "puneet@ideafueled.com" });
        const diksha = await User.findOne({ email: "diksha.dhiman@ideafueled.com" });

        const welcomeEmails = [
            {
                sender: puneet?._id || user._id,
                senderEmail: puneet?.email || "puneet@ideafueled.com",
                senderName: puneet?.fullName || "Puneet Chopra (Leadership)",
                senderAvatar: puneet?.profilePicture || "",
                senderRole: "global_admin",
                to: [userEmail],
                subject: `Welcome to the Idea-Fueled Team, ${user.firstName || user.fullName}!`,
                snippet: "Welcome aboard! We are thrilled to have you as part of the Idea-Fueled family. Here is what to expect in your journey ahead...",
                body: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b;">
                    <h2 style="color: #2D79C7; margin-bottom: 8px;">Welcome to Idea-Fueled!</h2>
                    <p>Dear ${user.fullName},</p>
                    <p>We are delighted to welcome you to our high-performing team. At Idea-Fueled, we empower every team member to innovate, take ownership, and build remarkable solutions.</p>
                    <div style="background-color: #f1f5f9; border-left: 4px solid #2D79C7; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
                        <strong>Key Workspace Highlights:</strong>
                        <ul style="margin: 8px 0 0 16px; padding: 0;">
                            <li>Access your personalized profile & attendance under the <b>Me</b> tab.</li>
                            <li>View direct company announcements and celebrate wins on the <b>Dashboard</b>.</li>
                            <li>Use this integrated <b>Inbox</b> for secure, direct team communications.</li>
                        </ul>
                    </div>
                    <p>Feel free to reach out to HR or your manager whenever you need any support. Wishing you immense growth and success with us!</p>
                    <br/>
                    <p style="margin-bottom: 2px;">Warm regards,</p>
                    <p><strong>Puneet Chopra</strong><br/><span style="color: #64748b;">Idea-Fueled Leadership</span></p>
                </div>`,
                priority: "high",
                labels: ["Company", "Welcome"],
                isDraft: false,
                userStates: [
                    {
                        user: user._id,
                        email: userEmail,
                        folder: "inbox",
                        isRead: false,
                        isStarred: true,
                        isDeleted: false,
                    },
                ],
                createdAt: new Date(Date.now() - 3600 * 1000 * 4), // 4 hours ago
            },
            {
                sender: diksha?._id || user._id,
                senderEmail: diksha?.email || "diksha.dhiman@ideafueled.com",
                senderName: diksha?.fullName || "Diksha (Human Resources)",
                senderAvatar: diksha?.profilePicture || "",
                senderRole: "hr",
                to: [userEmail],
                subject: "HR Guidelines: Attendance, Working Hours & Leave Policies",
                snippet: "Please review the updated HR workplace policy covering daily check-ins, remote work requests, and leaves...",
                body: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b;">
                    <h3 style="color: #0f172a;">Workplace & Attendance Policy Reminder</h3>
                    <p>Hello ${user.firstName || user.fullName},</p>
                    <p>To ensure smooth collaboration across all departments, please make sure you are familiar with our standard attendance and leave guidelines:</p>
                    <ol style="margin-left: 18px; padding: 0;">
                        <li><b>Daily Clock-in:</b> Record your clock-in and clock-out daily from the <b>Time Attend</b> tab or your profile.</li>
                        <li><b>Leave Requests:</b> Submit any planned leave requests at least 48 hours in advance for manager approval.</li>
                        <li><b>Remote / WFH:</b> Mention your working status on the dashboard so team members stay aligned.</li>
                    </ol>
                    <p>If you have any questions regarding your payroll, insurance, or documentation, reply directly to this thread or reach out to HR.</p>
                    <br/>
                    <p>Best regards,<br/><strong>Diksha</strong><br/><span style="color: #64748b;">Human Resources | Idea-Fueled</span></p>
                </div>`,
                priority: "normal",
                labels: ["HR & Admin", "Policy"],
                isDraft: false,
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
                createdAt: new Date(Date.now() - 3600 * 1000 * 24), // 1 day ago
            },
        ];

        for (const item of welcomeEmails) {
            const created = new Email(item);
            created.threadId = created._id;
            await created.save();
        }
    } catch (err) {
        console.warn("[Email Seed] Seed failed gracefully:", err.message);
    }
};

/**
 * GET /api/emails
 * Fetch emails with folder filtering, search, pagination, and statistics
 */
export const getEmails = async (req, res) => {
    try {
        const currentUser = await User.findById(req.user.id);
        if (!currentUser) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        const userEmail = currentUser.email.toLowerCase();

        // Seed welcome emails if empty
        await seedInitialEmailsIfEmpty(currentUser);

        const { folder = "inbox", label, search, page = 1, limit = 25 } = req.query;
        const pageNum = Math.max(1, parseInt(page, 10));
        const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
        const skip = (pageNum - 1) * limitNum;

        let query = {};

        // Base user state condition depending on folder
        if (folder === "starred") {
            query = {
                userStates: {
                    $elemMatch: {
                        email: userEmail,
                        isStarred: true,
                        isDeleted: false,
                    },
                },
            };
        } else if (folder === "all") {
            query = {
                userStates: {
                    $elemMatch: {
                        email: userEmail,
                        isDeleted: false,
                    },
                },
            };
        } else if (folder === "trash") {
            query = {
                userStates: {
                    $elemMatch: {
                        email: userEmail,
                        folder: "trash",
                        isDeleted: false,
                    },
                },
            };
        } else if (folder === "sent") {
            query = {
                userStates: {
                    $elemMatch: {
                        email: userEmail,
                        folder: "sent",
                        isDeleted: false,
                    },
                },
            };
        } else if (folder === "drafts" || folder === "draft") {
            query = {
                userStates: {
                    $elemMatch: {
                        email: userEmail,
                        folder: "draft",
                        isDeleted: false,
                    },
                },
            };
        } else {
            // Default: "inbox"
            query = {
                userStates: {
                    $elemMatch: {
                        email: userEmail,
                        folder: "inbox",
                        isDeleted: false,
                    },
                },
            };
        }

        // Label filter
        if (label && label.trim() && label !== "All") {
            query.labels = label.trim();
        }

        // Text search
        if (search && search.trim()) {
            const regex = new RegExp(search.trim(), "i");
            query.$or = [
                { subject: regex },
                { snippet: regex },
                { body: regex },
                { senderName: regex },
                { senderEmail: regex },
                { to: regex },
            ];
        }

        // Fetch emails with pagination
        const [rawEmails, total] = await Promise.all([
            Email.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            Email.countDocuments(query),
        ]);

        // Transform emails to include user's specific state at top level
        const emails = rawEmails.map((item) => {
            const userState = item.userStates?.find((s) => s.email === userEmail) || {
                isRead: false,
                isStarred: false,
                folder: "inbox",
            };
            return {
                ...item,
                isRead: userState.isRead,
                isStarred: userState.isStarred,
                folder: userState.folder,
            };
        });

        // Calculate folder counts & unread count
        const [unreadInbox, totalInbox, totalSent, totalStarred, totalDrafts, totalTrash] = await Promise.all([
            Email.countDocuments({
                userStates: {
                    $elemMatch: {
                        email: userEmail,
                        folder: "inbox",
                        isRead: false,
                        isDeleted: false,
                    },
                },
            }),
            Email.countDocuments({
                userStates: {
                    $elemMatch: {
                        email: userEmail,
                        folder: "inbox",
                        isDeleted: false,
                    },
                },
            }),
            Email.countDocuments({
                userStates: {
                    $elemMatch: {
                        email: userEmail,
                        folder: "sent",
                        isDeleted: false,
                    },
                },
            }),
            Email.countDocuments({
                userStates: {
                    $elemMatch: {
                        email: userEmail,
                        isStarred: true,
                        isDeleted: false,
                    },
                },
            }),
            Email.countDocuments({
                userStates: {
                    $elemMatch: {
                        email: userEmail,
                        folder: "draft",
                        isDeleted: false,
                    },
                },
            }),
            Email.countDocuments({
                userStates: {
                    $elemMatch: {
                        email: userEmail,
                        folder: "trash",
                        isDeleted: false,
                    },
                },
            }),
        ]);

        return res.status(200).json({
            success: true,
            emails,
            stats: {
                unreadInbox,
                totalInbox,
                totalSent,
                totalStarred,
                totalDrafts,
                totalTrash,
            },
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum) || 1,
            },
        });
    } catch (error) {
        console.error("Error in getEmails:", error);
        return res.status(500).json({ success: false, message: "Failed to retrieve emails.", error: error.message });
    }
};

/**
 * GET /api/emails/:id
 * Retrieve a single email and thread replies, automatically marking as read
 */
export const getEmailById = async (req, res) => {
    try {
        const { id } = req.params;
        const currentUser = await User.findById(req.user.id);
        if (!currentUser) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        const userEmail = currentUser.email.toLowerCase();

        const email = await Email.findById(id).lean();
        if (!email) {
            return res.status(404).json({ success: false, message: "Email not found." });
        }

        // Mark as read for this user if currently unread
        await Email.updateOne(
            { _id: id, "userStates.email": userEmail },
            { $set: { "userStates.$.isRead": true } }
        );

        // Fetch replies in the same thread
        const threadId = email.threadId || email._id;
        const threadReplies = await Email.find({
            threadId,
            _id: { $ne: email._id },
            userStates: {
                $elemMatch: {
                    email: userEmail,
                    isDeleted: false,
                },
            },
        })
            .sort({ createdAt: 1 })
            .lean();

        const userState = email.userStates?.find((s) => s.email === userEmail) || {};

        return res.status(200).json({
            success: true,
            email: {
                ...email,
                isRead: true,
                isStarred: userState.isStarred || false,
                folder: userState.folder || "inbox",
            },
            thread: threadReplies.map((r) => {
                const s = r.userStates?.find((st) => st.email === userEmail) || {};
                return {
                    ...r,
                    isRead: s.isRead || false,
                    isStarred: s.isStarred || false,
                    folder: s.folder || "inbox",
                };
            }),
        });
    } catch (error) {
        console.error("Error in getEmailById:", error);
        return res.status(500).json({ success: false, message: "Failed to retrieve email details." });
    }
};

/**
 * POST /api/emails/send
 * Compose and send an email with optional attachments & Cloudinary upload
 */
export const sendEmail = async (req, res) => {
    try {
        const currentUser = await User.findById(req.user.id);
        if (!currentUser) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        const { to, cc, bcc, subject, body, priority = "normal", labels, replyTo } = req.body;

        const toList = parseEmailList(to);
        const ccList = parseEmailList(cc);
        const bccList = parseEmailList(bcc);

        if (toList.length === 0) {
            return res.status(400).json({ success: false, message: "Please specify at least one valid recipient in 'To'." });
        }

        const allRecipients = Array.from(new Set([...toList, ...ccList, ...bccList]));
        const senderEmail = currentUser.email.toLowerCase();

        // Process attachments (if uploaded via multer)
        const attachments = [];
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                try {
                    const uploadResult = await uploadToCloudinary(file.buffer, "hrms_emails", "auto");
                    attachments.push({
                        name: file.originalname,
                        url: uploadResult.secure_url,
                        size: file.size,
                        type: file.mimetype,
                        publicId: uploadResult.public_id,
                    });
                } catch (uploadErr) {
                    console.error("Failed to upload email attachment to Cloudinary:", uploadErr);
                }
            }
        }

        // Build recipient userStates
        const userStates = [
            {
                user: currentUser._id,
                email: senderEmail,
                folder: "sent",
                isRead: true,
                isStarred: false,
                isDeleted: false,
            },
        ];

        // Find internal users matching recipient emails
        const recipientUsers = await User.find({ email: { $in: allRecipients } });
        const userMap = new Map();
        recipientUsers.forEach((u) => userMap.set(u.email.toLowerCase(), u._id));

        allRecipients.forEach((recEmail) => {
            // Avoid duplicate if sending to self
            if (recEmail !== senderEmail) {
                userStates.push({
                    user: userMap.get(recEmail) || null,
                    email: recEmail,
                    folder: "inbox",
                    isRead: false,
                    isStarred: false,
                    isDeleted: false,
                });
            }
        });

        // Determine threadId
        let threadId = null;
        if (replyTo) {
            const parentEmail = await Email.findById(replyTo);
            if (parentEmail) {
                threadId = parentEmail.threadId || parentEmail._id;
            }
        }

        const parsedLabels = Array.isArray(labels)
            ? labels
            : typeof labels === "string"
            ? labels.split(",").map((l) => l.trim()).filter(Boolean)
            : [];

        const newEmail = new Email({
            sender: currentUser._id,
            senderEmail,
            senderName: currentUser.fullName || `${currentUser.firstName} ${currentUser.lastName}`.trim(),
            senderAvatar: currentUser.profilePicture || "",
            senderRole: currentUser.role || "employee",
            to: toList,
            cc: ccList,
            bcc: bccList,
            subject: subject?.trim() || "(No Subject)",
            body: body || "",
            snippet: createSnippet(body || subject || ""),
            attachments,
            priority,
            labels: parsedLabels,
            replyTo: replyTo || null,
            threadId,
            isDraft: false,
            userStates,
        });

        if (!newEmail.threadId) {
            newEmail.threadId = newEmail._id;
        }

        await newEmail.save();

        // Optional dispatch via SMTP to external emails
        dispatchExternalEmail({
            to: toList,
            cc: ccList,
            bcc: bccList,
            subject: newEmail.subject,
            body: newEmail.body,
            attachments,
        }).catch((e) => console.warn("External email dispatch note:", e.message));

        return res.status(201).json({
            success: true,
            message: "Email sent successfully.",
            email: newEmail,
        });
    } catch (error) {
        console.error("Error in sendEmail:", error);
        return res.status(500).json({ success: false, message: "Failed to send email.", error: error.message });
    }
};

/**
 * POST /api/emails/draft
 * Save an email as draft
 */
export const saveDraft = async (req, res) => {
    try {
        const currentUser = await User.findById(req.user.id);
        if (!currentUser) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        const { draftId, to, subject, body, priority = "normal" } = req.body;
        const senderEmail = currentUser.email.toLowerCase();
        const toList = parseEmailList(to);

        let emailDoc;
        if (draftId && mongoose.isValidObjectId(draftId)) {
            emailDoc = await Email.findById(draftId);
        }

        if (emailDoc) {
            emailDoc.to = toList;
            emailDoc.subject = subject || "(Draft)";
            emailDoc.body = body || "";
            emailDoc.snippet = createSnippet(body || "");
            emailDoc.priority = priority;
            emailDoc.isDraft = true;
            await emailDoc.save();
        } else {
            emailDoc = new Email({
                sender: currentUser._id,
                senderEmail,
                senderName: currentUser.fullName,
                senderAvatar: currentUser.profilePicture || "",
                senderRole: currentUser.role,
                to: toList,
                subject: subject || "(Draft)",
                body: body || "",
                snippet: createSnippet(body || ""),
                priority,
                isDraft: true,
                userStates: [
                    {
                        user: currentUser._id,
                        email: senderEmail,
                        folder: "draft",
                        isRead: true,
                        isStarred: false,
                        isDeleted: false,
                    },
                ],
            });
            emailDoc.threadId = emailDoc._id;
            await emailDoc.save();
        }

        return res.status(200).json({
            success: true,
            message: "Draft saved.",
            draft: emailDoc,
        });
    } catch (error) {
        console.error("Error in saveDraft:", error);
        return res.status(500).json({ success: false, message: "Failed to save draft." });
    }
};

/**
 * PATCH /api/emails/:id/status
 * Update user-specific email state (isRead, isStarred, folder, isDeleted)
 */
export const updateEmailStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const currentUser = await User.findById(req.user.id);
        if (!currentUser) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        const userEmail = currentUser.email.toLowerCase();
        const { isRead, isStarred, folder, isDeleted } = req.body;

        const email = await Email.findById(id);
        if (!email) {
            return res.status(404).json({ success: false, message: "Email not found." });
        }

        let stateIndex = email.userStates.findIndex((s) => s.email === userEmail);
        if (stateIndex === -1) {
            // Add state if missing
            email.userStates.push({
                user: currentUser._id,
                email: userEmail,
                folder: folder || "inbox",
                isRead: isRead !== undefined ? isRead : true,
                isStarred: isStarred !== undefined ? isStarred : false,
                isDeleted: isDeleted !== undefined ? isDeleted : false,
            });
        } else {
            if (isRead !== undefined) email.userStates[stateIndex].isRead = isRead;
            if (isStarred !== undefined) email.userStates[stateIndex].isStarred = isStarred;
            if (folder !== undefined) email.userStates[stateIndex].folder = folder;
            if (isDeleted !== undefined) email.userStates[stateIndex].isDeleted = isDeleted;
        }

        await email.save();

        const updatedState = email.userStates.find((s) => s.email === userEmail);

        return res.status(200).json({
            success: true,
            message: "Email status updated.",
            emailState: updatedState,
        });
    } catch (error) {
        console.error("Error in updateEmailStatus:", error);
        return res.status(500).json({ success: false, message: "Failed to update email status." });
    }
};

/**
 * DELETE /api/emails/:id
 * Move to trash or permanently delete
 */
export const deleteEmail = async (req, res) => {
    try {
        const { id } = req.params;
        const currentUser = await User.findById(req.user.id);
        if (!currentUser) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        const userEmail = currentUser.email.toLowerCase();
        const email = await Email.findById(id);
        if (!email) {
            return res.status(404).json({ success: false, message: "Email not found." });
        }

        const userState = email.userStates.find((s) => s.email === userEmail);

        if (!userState) {
            return res.status(404).json({ success: false, message: "Email state not found." });
        }

        if (userState.folder === "trash") {
            // Already in trash -> permanently hide for this user
            userState.isDeleted = true;
        } else {
            // Move to trash
            userState.folder = "trash";
        }

        await email.save();

        return res.status(200).json({
            success: true,
            message: userState.isDeleted ? "Email deleted permanently." : "Moved to Trash.",
        });
    } catch (error) {
        console.error("Error in deleteEmail:", error);
        return res.status(500).json({ success: false, message: "Failed to delete email." });
    }
};

/**
 * POST /api/emails/batch
 * Batch operations (markRead, markUnread, trash, star, unstar, deletePermanent)
 */
export const batchAction = async (req, res) => {
    try {
        const currentUser = await User.findById(req.user.id);
        if (!currentUser) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        const userEmail = currentUser.email.toLowerCase();
        const { emailIds, action } = req.body;

        if (!Array.isArray(emailIds) || emailIds.length === 0) {
            return res.status(400).json({ success: false, message: "No emails specified." });
        }

        for (const id of emailIds) {
            const email = await Email.findById(id);
            if (!email) continue;

            const userState = email.userStates.find((s) => s.email === userEmail);
            if (!userState) continue;

            switch (action) {
                case "markRead":
                    userState.isRead = true;
                    break;
                case "markUnread":
                    userState.isRead = false;
                    break;
                case "star":
                    userState.isStarred = true;
                    break;
                case "unstar":
                    userState.isStarred = false;
                    break;
                case "trash":
                    userState.folder = "trash";
                    break;
                case "restore":
                    userState.folder = "inbox";
                    break;
                case "deletePermanent":
                    userState.isDeleted = true;
                    break;
                default:
                    break;
            }
            await email.save();
        }

        return res.status(200).json({
            success: true,
            message: `Batch action '${action}' applied successfully to ${emailIds.length} emails.`,
        });
    } catch (error) {
        console.error("Error in batchAction:", error);
        return res.status(500).json({ success: false, message: "Failed to perform batch action." });
    }
};

/**
 * GET /api/emails/unread-count
 * Quick lightweight query for sidebar and topbar badges
 */
export const getUnreadCount = async (req, res) => {
    try {
        const currentUser = await User.findById(req.user.id);
        if (!currentUser) {
            return res.status(200).json({ success: true, unreadCount: 0 });
        }

        const unreadCount = await Email.countDocuments({
            userStates: {
                $elemMatch: {
                    email: currentUser.email.toLowerCase(),
                    folder: "inbox",
                    isRead: false,
                    isDeleted: false,
                },
            },
        });

        return res.status(200).json({ success: true, unreadCount });
    } catch (error) {
        return res.status(200).json({ success: true, unreadCount: 0 });
    }
};

/**
 * GET /api/emails/contacts
 * Returns team members directory for recipient chip autocompletion
 */
export const getCompanyContacts = async (req, res) => {
    try {
        const contacts = await User.find(
            { status: "active" },
            "fullName firstName lastName email designation department profilePicture role"
        ).sort({ fullName: 1 });

        return res.status(200).json({ success: true, contacts });
    } catch (error) {
        console.error("Error in getCompanyContacts:", error);
        return res.status(500).json({ success: false, message: "Failed to retrieve contacts." });
    }
};
