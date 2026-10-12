import Onboarding from "../../models/onboarding/onboarding.model.js";
import Offboarding from "../../models/offboarding/offboarding.model.js";
import User from "../../models/users/user.model.js";
import Email from "../../models/emails/email.model.js";
import { emitToUser } from "../../socket/socket.js";

/**
 * Dynamic notice period calculation:
 * - Probation (< 6 months from joiningDate): 20 days
 * - Technical team (>= 6 months, "Software Development" or "Design"): 60 days
 * - Non-Technical team (>= 6 months, all other departments): 30 days
 */
export const calculateNoticePeriodDays = (employee, noticeDate = new Date()) => {
    if (!employee) return 30;
    const now = new Date(noticeDate);
    const joinDate = employee.joiningDate ? new Date(employee.joiningDate) : null;

    if (joinDate && !isNaN(joinDate.getTime())) {
        const diffDays = Math.floor((now.getTime() - joinDate.getTime()) / (1000 * 60 * 60 * 24));
        let probationDays = (employee.probationPeriod !== undefined && employee.probationPeriod !== null) ? Number(employee.probationPeriod) : 180;
        if (probationDays <= 12) probationDays = probationDays * 30;
        if (diffDays < probationDays) {
            return 20;
        }
    }

    const dept = (employee.department || "").trim().toLowerCase();
    if (dept === "software development" || dept === "design") {
        return 60;
    }

    return 30;
};

// Helper for HR visibility filtering
const getHRVisibleEmployeeIds = async (user) => {
    if (!user || user.role !== "hr") return null;
    const hrUser = await User.findById(user.id || user._id).select("visibleEmployees").lean();
    if (hrUser && hrUser.visibleEmployees && hrUser.visibleEmployees.length > 0) {
        return hrUser.visibleEmployees;
    }
    return null;
};

/* ─────────────────────────────────────────────
   GET ONBOARDING RECORDS
 ───────────────────────────────────────────── */
export const getOnboardingRecords = async (req, res) => {
    try {
        const { search, status, department } = req.query;
        const hrVisibleIds = await getHRVisibleEmployeeIds(req.user);

        const query = {};
        if (hrVisibleIds) {
            query.employee = { $in: hrVisibleIds };
        }

        if (status) {
            query.status = status;
        }

        let records = await Onboarding.find(query)
            .populate({
                path: "employee",
                select: "fullName firstName lastName employeeId department designation joiningDate probationPeriod managerId employementType workLocation status profilePicture email",
                populate: { path: "managerId", select: "fullName employeeId designation department" }
            })
            .sort({ createdAt: -1 })
            .lean();

        // Filter null employees if any deleted
        records = records.filter(r => r.employee);

        // Apply search & department filter on populated employee
        if (search) {
            const q = search.toLowerCase();
            records = records.filter(r => {
                const name = (r.employee.fullName || `${r.employee.firstName} ${r.employee.lastName}`).toLowerCase();
                const empId = (r.employee.employeeId || "").toLowerCase();
                const dept = (r.employee.department || "").toLowerCase();
                return name.includes(q) || empId.includes(q) || dept.includes(q);
            });
        }

        if (department) {
            records = records.filter(r => r.employee.department === department);
        }

        // Summary stats
        const allRecords = await Onboarding.find(hrVisibleIds ? { employee: { $in: hrVisibleIds } } : {}).lean();
        const summary = {
            total: allRecords.length,
            upcoming: allRecords.filter(r => r.status === "Upcoming").length,
            inProgress: allRecords.filter(r => r.status === "In Progress").length,
            completed: allRecords.filter(r => r.status === "Completed").length,
        };

        return res.status(200).json({
            success: true,
            summary,
            onboardingRecords: records
        });
    } catch (error) {
        console.error("Get Onboarding Records Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/* ─────────────────────────────────────────────
   CREATE ONBOARDING RECORD
 ───────────────────────────────────────────── */
export const createOnboardingRecord = async (req, res) => {
    try {
        const { employee, joiningDate, status, checklist, notes } = req.body;

        if (!employee) {
            return res.status(400).json({ success: false, message: "Employee is required for onboarding." });
        }

        const targetUser = await User.findById(employee);
        if (!targetUser) {
            return res.status(404).json({ success: false, message: "Employee not found." });
        }

        const existingRecord = await Onboarding.findOne({ employee });
        if (existingRecord) {
            return res.status(400).json({ success: false, message: "Onboarding record already exists for this employee." });
        }

        const newRecord = await Onboarding.create({
            employee,
            joiningDate: joiningDate ? new Date(joiningDate) : targetUser.joiningDate || new Date(),
            status: status || "Upcoming",
            checklist: checklist || {},
            notes: notes || ""
        });

        const populated = await Onboarding.findById(newRecord._id)
            .populate({
                path: "employee",
                select: "fullName firstName lastName employeeId department designation joiningDate probationPeriod managerId employementType workLocation status profilePicture email",
                populate: { path: "managerId", select: "fullName employeeId" }
            })
            .lean();

        return res.status(201).json({
            success: true,
            message: "Onboarding record created successfully.",
            onboardingRecord: populated
        });
    } catch (error) {
        console.error("Create Onboarding Record Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/* ─────────────────────────────────────────────
   UPDATE ONBOARDING RECORD
 ───────────────────────────────────────────── */
export const updateOnboardingRecord = async (req, res) => {
    try {
        const { id } = req.params;
        const { joiningDate, status, checklist, notes } = req.body;

        const record = await Onboarding.findById(id);
        if (!record) {
            return res.status(404).json({ success: false, message: "Onboarding record not found." });
        }

        if (joiningDate) record.joiningDate = new Date(joiningDate);
        if (status) record.status = status;
        if (checklist) record.checklist = { ...record.checklist, ...checklist };
        if (notes !== undefined) record.notes = notes;

        await record.save();

        const populated = await Onboarding.findById(id)
            .populate({
                path: "employee",
                select: "fullName firstName lastName employeeId department designation joiningDate probationPeriod managerId employementType workLocation status profilePicture email",
                populate: { path: "managerId", select: "fullName employeeId" }
            })
            .lean();

        return res.status(200).json({
            success: true,
            message: "Onboarding record updated successfully.",
            onboardingRecord: populated
        });
    } catch (error) {
        console.error("Update Onboarding Record Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/* ─────────────────────────────────────────────
   DELETE ONBOARDING RECORD
 ───────────────────────────────────────────── */
export const deleteOnboardingRecord = async (req, res) => {
    try {
        const { id } = req.params;
        const record = await Onboarding.findByIdAndDelete(id);
        if (!record) {
            return res.status(404).json({ success: false, message: "Record not found." });
        }
        return res.status(200).json({ success: true, message: "Onboarding record deleted successfully." });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/* ─────────────────────────────────────────────
   GET OFFBOARDING RECORDS
 ───────────────────────────────────────────── */
export const getOffboardingRecords = async (req, res) => {
    try {
        const { search, status, department } = req.query;
        const hrVisibleIds = await getHRVisibleEmployeeIds(req.user);

        const query = {};
        if (hrVisibleIds) {
            query.employee = { $in: hrVisibleIds };
        }

        if (status) {
            query.status = status;
        }

        let records = await Offboarding.find(query)
            .populate({
                path: "employee",
                select: "fullName firstName lastName employeeId department designation joiningDate probationPeriod managerId employementType workLocation status profilePicture email",
                populate: { path: "managerId", select: "fullName employeeId designation department" }
            })
            .sort({ createdAt: -1 })
            .lean();

        records = records.filter(r => r.employee);

        if (search) {
            const q = search.toLowerCase();
            records = records.filter(r => {
                const name = (r.employee.fullName || `${r.employee.firstName} ${r.employee.lastName}`).toLowerCase();
                const empId = (r.employee.employeeId || "").toLowerCase();
                const dept = (r.employee.department || "").toLowerCase();
                return name.includes(q) || empId.includes(q) || dept.includes(q);
            });
        }

        if (department) {
            records = records.filter(r => r.employee.department === department);
        }

        const allRecords = await Offboarding.find(hrVisibleIds ? { employee: { $in: hrVisibleIds } } : {}).lean();
        const summary = {
            total: allRecords.length,
            initiated: allRecords.filter(r => r.status === "Initiated").length,
            inProgress: allRecords.filter(r => r.status === "In Progress").length,
            clearancePending: allRecords.filter(r => r.status === "Clearance Pending").length,
            completed: allRecords.filter(r => r.status === "Completed").length,
        };

        return res.status(200).json({
            success: true,
            summary,
            offboardingRecords: records
        });
    } catch (error) {
        console.error("Get Offboarding Records Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/* ─────────────────────────────────────────────
   INITIATE OFFBOARDING
 ───────────────────────────────────────────── */
export const initiateOffboarding = async (req, res) => {
    try {
        const { employee, resignationDate, lastWorkingDay, reasonForLeaving, noticePeriod, notes } = req.body;

        if (!employee || !resignationDate || !lastWorkingDay) {
            return res.status(400).json({
                success: false,
                message: "Employee, Resignation Date, and Last Working Day are required."
            });
        }

        const targetUser = await User.findById(employee);
        if (!targetUser) {
            return res.status(404).json({ success: false, message: "Employee not found." });
        }

        const existingRecord = await Offboarding.findOne({ employee, status: { $ne: "Completed" } });
        if (existingRecord) {
            return res.status(400).json({ success: false, message: "Offboarding is already in progress for this employee." });
        }

        // Move employee status to "offboarding" (preserves employee record)
        targetUser.status = "offboarding";
        await targetUser.save();

        const newRecord = await Offboarding.create({
            employee,
            resignationDate: new Date(resignationDate),
            lastWorkingDay: new Date(lastWorkingDay),
            reasonForLeaving: reasonForLeaving || "Better Opportunity",
            noticePeriod: noticePeriod || "30 Days",
            status: "Initiated",
            clearanceActivities: {
                assetReturn: { completed: false, notes: "", clearedBy: "", date: null },
                hrClearance: { completed: false, notes: "", clearedBy: "", date: null },
                managerClearance: { completed: false, notes: "", clearedBy: "", date: null },
                financeClearance: { completed: false, notes: "", clearedBy: "", date: null },
                documentation: { completed: false, notes: "", clearedBy: "", date: null }
            },
            notes: notes || ""
        });

        const populated = await Offboarding.findById(newRecord._id)
            .populate({
                path: "employee",
                select: "fullName firstName lastName employeeId department designation joiningDate probationPeriod managerId employementType workLocation status profilePicture email",
                populate: { path: "managerId", select: "fullName employeeId" }
            })
            .lean();

        return res.status(201).json({
            success: true,
            message: `Offboarding initiated for ${targetUser.fullName || targetUser.firstName}. Employee status set to Offboarding.`,
            offboardingRecord: populated
        });
    } catch (error) {
        console.error("Initiate Offboarding Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/* ─────────────────────────────────────────────
   UPDATE OFFBOARDING RECORD & CLEARANCES
 ───────────────────────────────────────────── */
export const updateOffboardingRecord = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, resignationDate, lastWorkingDay, reasonForLeaving, noticePeriod, clearanceActivities, notes } = req.body;

        const record = await Offboarding.findById(id);
        if (!record) {
            return res.status(404).json({ success: false, message: "Offboarding record not found." });
        }

        if (resignationDate) record.resignationDate = new Date(resignationDate);
        if (lastWorkingDay) record.lastWorkingDay = new Date(lastWorkingDay);
        if (reasonForLeaving) record.reasonForLeaving = reasonForLeaving;
        if (noticePeriod) record.noticePeriod = noticePeriod;
        if (notes !== undefined) record.notes = notes;

        if (clearanceActivities) {
            ["assetReturn", "hrClearance", "managerClearance", "financeClearance", "documentation"].forEach(key => {
                if (clearanceActivities[key]) {
                    record.clearanceActivities[key] = {
                        ...record.clearanceActivities[key],
                        ...clearanceActivities[key]
                    };
                }
            });
        }

        if (status && status !== record.status) {
            record.status = status;
            // If completed, update target user status to "exited"
            if (status === "Completed") {
                const user = await User.findById(record.employee);
                if (user) {
                    user.status = "exited";
                    await user.save();
                }
            }
        }

        await record.save();

        const populated = await Offboarding.findById(id)
            .populate({
                path: "employee",
                select: "fullName firstName lastName employeeId department designation joiningDate probationPeriod managerId employementType workLocation status profilePicture email",
                populate: { path: "managerId", select: "fullName employeeId" }
            })
            .lean();

        return res.status(200).json({
            success: true,
            message: "Offboarding record updated successfully.",
            offboardingRecord: populated
        });
    } catch (error) {
        console.error("Update Offboarding Record Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/* ─────────────────────────────────────────────
   DELETE OFFBOARDING RECORD
 ───────────────────────────────────────────── */
export const deleteOffboardingRecord = async (req, res) => {
    try {
        const { id } = req.params;
        const record = await Offboarding.findByIdAndDelete(id);
        if (!record) {
            return res.status(404).json({ success: false, message: "Record not found." });
        }
        return res.status(200).json({ success: true, message: "Offboarding record deleted successfully." });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/* ─────────────────────────────────────────────
   SUBMIT EMPLOYEE RESIGNATION (By Authenticated User)
 ───────────────────────────────────────────── */
export const submitEmployeeResignation = async (req, res) => {
    try {
        const employeeId = req.user.id || req.user._id;
        const {
            hadDiscussionWithManager,
            discussionSummary,
            reasonForResignation,
            preferenceEarlyLwd,
            preferredLwd
        } = req.body;

        if (!reasonForResignation || !reasonForResignation.trim()) {
            return res.status(400).json({
                success: false,
                message: "Resignation reason is required."
            });
        }

        const employee = await User.findById(employeeId).populate("managerId", "fullName firstName lastName email").lean();
        if (!employee) {
            return res.status(404).json({ success: false, message: "Employee not found." });
        }

        const empName = employee.fullName || `${employee.firstName || ""} ${employee.lastName || ""}`.trim() || "Employee";

        // Calculate dynamic notice period days
        const noticeDays = calculateNoticePeriodDays(employee, new Date());
        
        let lastWorkingDay = new Date();
        lastWorkingDay.setDate(lastWorkingDay.getDate() + noticeDays);
        if (preferenceEarlyLwd && preferredLwd) {
            const prefDate = new Date(preferredLwd);
            if (!isNaN(prefDate.getTime())) {
                lastWorkingDay = prefDate;
            }
        }

        let offboardingRecord = await Offboarding.findOne({
            employee: employeeId,
            status: { $ne: "Completed" }
        });

        if (offboardingRecord) {
            offboardingRecord.exitType = "resignation";
            offboardingRecord.hadDiscussionWithManager = !!hadDiscussionWithManager;
            offboardingRecord.discussionSummary = discussionSummary || "";
            offboardingRecord.reasonForLeaving = reasonForResignation;
            offboardingRecord.preferenceEarlyLwd = !!preferenceEarlyLwd;
            offboardingRecord.noticePeriod = `${noticeDays} Days`;
            offboardingRecord.noticePeriodDays = noticeDays;
            offboardingRecord.lastWorkingDay = lastWorkingDay;
            offboardingRecord.status = "Initiated";
            await offboardingRecord.save();
        } else {
            offboardingRecord = await Offboarding.create({
                employee: employeeId,
                exitType: "resignation",
                initiatedBy: employeeId,
                initiatedRole: "employee",
                hadDiscussionWithManager: !!hadDiscussionWithManager,
                discussionSummary: discussionSummary || "",
                reasonForLeaving: reasonForResignation,
                resignationDate: new Date(),
                lastWorkingDay,
                preferenceEarlyLwd: !!preferenceEarlyLwd,
                noticePeriod: `${noticeDays} Days`,
                noticePeriodDays: noticeDays,
                status: "Initiated",
                notes: preferenceEarlyLwd ? "Employee requested preference for an early last working day." : ""
            });
        }

        // Update employee status to offboarding
        await User.findByIdAndUpdate(employeeId, { status: "offboarding" });

        // Notifications to Manager and Global Admins
        const globalAdmins = await User.find({ role: "global_admin" }).select("_id email fullName firstName lastName").lean();
        const recipientList = [];
        const seenEmails = new Set();

        if (employee.managerId && employee.managerId.email) {
            const mEmail = employee.managerId.email.toLowerCase();
            recipientList.push({
                id: employee.managerId._id,
                email: mEmail,
                name: employee.managerId.fullName || `${employee.managerId.firstName || ""} ${employee.managerId.lastName || ""}`.trim()
            });
            seenEmails.add(mEmail);
        }

        for (const admin of globalAdmins) {
            const aEmail = (admin.email || "").toLowerCase();
            if (aEmail && !seenEmails.has(aEmail)) {
                recipientList.push({
                    id: admin._id,
                    email: aEmail,
                    name: admin.fullName || `${admin.firstName || ""} ${admin.lastName || ""}`.trim()
                });
                seenEmails.add(aEmail);
            }
        }

        const lwdFormatted = lastWorkingDay.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });

        const subject = `Resignation Submitted: ${empName}`;
        const snippet = `${empName} has formally submitted a resignation request with reason: ${reasonForResignation}.`;

        const emailBody = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 4px;">
    <div style="background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); border: 1px solid #fca5a5; border-radius: 14px; padding: 18px 22px; margin-bottom: 20px;">
        <span style="background-color: #dc2626; color: #ffffff; font-size: 10px; font-weight: 800; padding: 3px 10px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.6px; display: inline-block; margin-bottom: 8px;">
            Resignation Notice
        </span>
        <h2 style="margin: 0; color: #991b1b; font-size: 18px; font-weight: 800;">Job Resignation Submitted</h2>
        <p style="margin: 4px 0 0 0; color: #b91c1c; font-size: 13px; font-weight: 500;">
            ${empName} has initiated their job resignation process.
        </p>
    </div>

    <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); margin-bottom: 20px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Employee Name:</td>
                <td style="padding: 8px 0; color: #0f172a; font-weight: 700;">${empName}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Department:</td>
                <td style="padding: 8px 0; color: #0f172a; font-weight: 700;">${employee.department || "General"}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Reason for Resignation:</td>
                <td style="padding: 8px 0; color: #0f172a; font-weight: 700;">${reasonForResignation}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Discussion with Manager:</td>
                <td style="padding: 8px 0; color: #0f172a; font-weight: 700;">${hadDiscussionWithManager ? "Yes" : "No"}</td>
            </tr>
            ${discussionSummary ? `
            <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Discussion Summary:</td>
                <td style="padding: 8px 0; color: #0f172a; font-weight: 600;">${discussionSummary}</td>
            </tr>` : ""}
            <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Applicable Notice Period:</td>
                <td style="padding: 8px 0; color: #0f172a; font-weight: 700;">${noticeDays} Days</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Calculated Last Working Day:</td>
                <td style="padding: 8px 0; color: #dc2626; font-weight: 800;">${lwdFormatted}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Early Last Working Day Preference:</td>
                <td style="padding: 8px 0; color: #0f172a; font-weight: 700;">${preferenceEarlyLwd ? "Yes" : "No"}</td>
            </tr>
        </table>
    </div>
</div>`;

        if (recipientList.length > 0) {
            const userStates = recipientList.map(rec => ({
                user: rec.id,
                email: rec.email,
                folder: "inbox",
                isRead: false,
                isStarred: false,
                isDeleted: false
            }));

            const newEmail = new Email({
                sender: employeeId,
                senderEmail: employee.email || "resignation@ideafueled.com",
                senderName: empName,
                senderAvatar: employee.profilePicture || "",
                senderRole: employee.role || "employee",
                to: recipientList.map(r => r.email),
                cc: [],
                bcc: [],
                subject,
                body: emailBody,
                snippet,
                attachments: [],
                priority: "high",
                labels: ["Resignation", "Offboarding", "HR"],
                userStates
            });

            newEmail.threadId = newEmail._id;
            await newEmail.save();

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
                        "resignation_alert",
                        {
                            title: `Resignation: ${empName}`,
                            message: `${empName} has submitted a resignation request.`,
                            emailId: newEmail._id,
                            unreadCount
                        }
                    );
                } catch (e) {
                    console.error("Socket error on resignation alert:", e);
                }
            }
        }

        return res.status(201).json({
            success: true,
            message: "Your resignation has been submitted successfully.",
            offboardingRecord
        });
    } catch (error) {
        console.error("Submit Resignation Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/* ─────────────────────────────────────────────
   ADMIN INITIATE EXIT / TERMINATION (Global Admin)
 ───────────────────────────────────────────── */
export const adminInitiateExit = async (req, res) => {
    try {
        const {
            employeeId,
            exitType, // "resignation" | "termination"
            hadDiscussionWithEmployee,
            discussionSummary,
            reason, // Required
            noticeDate,
            recommendedLwdType, // "original" | "other"
            customLwd,
            eligibleForRehire,
            additionalComments
        } = req.body;

        if (!employeeId) {
            return res.status(400).json({ success: false, message: "Employee is required." });
        }

        if (!reason || !reason.trim()) {
            return res.status(400).json({
                success: false,
                message: exitType === "termination" ? "Termination reason is required." : "Resignation reason is required."
            });
        }

        const employee = await User.findById(employeeId).populate("managerId", "fullName firstName lastName email").lean();
        if (!employee) {
            return res.status(404).json({ success: false, message: "Employee not found." });
        }

        const empName = employee.fullName || `${employee.firstName || ""} ${employee.lastName || ""}`.trim() || "Employee";

        const baseNoticeDate = noticeDate ? new Date(noticeDate) : new Date();
        const noticeDays = calculateNoticePeriodDays(employee, baseNoticeDate);

        let finalLwd;
        if (recommendedLwdType === "other" && customLwd) {
            finalLwd = new Date(customLwd);
        } else {
            finalLwd = new Date(baseNoticeDate);
            finalLwd.setDate(finalLwd.getDate() + noticeDays);
        }

        const newStatus = exitType === "termination" ? "terminated" : "offboarding";
        await User.findByIdAndUpdate(employeeId, { status: newStatus });

        let record = await Offboarding.findOne({ employee: employeeId, status: { $ne: "Completed" } });
        if (record) {
            record.exitType = exitType || "resignation";
            record.initiatedBy = req.user.id || req.user._id;
            record.initiatedRole = "global_admin";
            record.hadDiscussionWithEmployee = !!hadDiscussionWithEmployee;
            record.discussionSummary = discussionSummary || "";
            record.reasonForLeaving = reason;
            record.resignationDate = baseNoticeDate;
            record.lastWorkingDay = finalLwd;
            record.noticePeriod = `${noticeDays} Days`;
            record.noticePeriodDays = noticeDays;
            record.recommendedLwdType = recommendedLwdType || "original";
            record.eligibleForRehire = eligibleForRehire !== false;
            record.additionalComments = additionalComments || "";
            record.status = "Initiated";
            await record.save();
        } else {
            record = await Offboarding.create({
                employee: employeeId,
                exitType: exitType || "resignation",
                initiatedBy: req.user.id || req.user._id,
                initiatedRole: "global_admin",
                hadDiscussionWithEmployee: !!hadDiscussionWithEmployee,
                discussionSummary: discussionSummary || "",
                reasonForLeaving: reason,
                resignationDate: baseNoticeDate,
                lastWorkingDay: finalLwd,
                noticePeriod: `${noticeDays} Days`,
                noticePeriodDays: noticeDays,
                recommendedLwdType: recommendedLwdType || "original",
                eligibleForRehire: eligibleForRehire !== false,
                additionalComments: additionalComments || "",
                status: "Initiated"
            });
        }

        const globalAdmins = await User.find({ role: "global_admin" }).select("_id email fullName firstName lastName").lean();
        const recipientList = [];
        const seenEmails = new Set();

        if (employee.email) {
            const eEmail = employee.email.toLowerCase();
            recipientList.push({ id: employee._id, email: eEmail, name: empName });
            seenEmails.add(eEmail);
        }

        if (employee.managerId && employee.managerId.email) {
            const mEmail = employee.managerId.email.toLowerCase();
            if (!seenEmails.has(mEmail)) {
                recipientList.push({
                    id: employee.managerId._id,
                    email: mEmail,
                    name: employee.managerId.fullName || `${employee.managerId.firstName || ""} ${employee.managerId.lastName || ""}`.trim()
                });
                seenEmails.add(mEmail);
            }
        }

        for (const admin of globalAdmins) {
            const aEmail = (admin.email || "").toLowerCase();
            if (aEmail && !seenEmails.has(aEmail)) {
                recipientList.push({
                    id: admin._id,
                    email: aEmail,
                    name: admin.fullName || `${admin.firstName || ""} ${admin.lastName || ""}`.trim()
                });
                seenEmails.add(aEmail);
            }
        }

        const isTerm = exitType === "termination";
        const actionTitle = isTerm ? "Termination" : "Resignation";
        const subject = `Exit Process Initiated: ${actionTitle} - ${empName}`;
        const snippet = `An exit process (${actionTitle}) has been initiated for ${empName} with last working day ${finalLwd.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}.`;

        const emailBody = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 4px;">
    <div style="background: linear-gradient(135deg, ${isTerm ? '#fee2e2 0%, #fecaca 100%' : '#fef3c7 0%, #fde68a 100%'}); border: 1px solid ${isTerm ? '#fca5a5' : '#fcd34d'}; border-radius: 14px; padding: 18px 22px; margin-bottom: 20px;">
        <span style="background-color: ${isTerm ? '#dc2626' : '#d97706'}; color: #ffffff; font-size: 10px; font-weight: 800; padding: 3px 10px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.6px; display: inline-block; margin-bottom: 8px;">
            ${actionTitle} Notice
        </span>
        <h2 style="margin: 0; color: ${isTerm ? '#991b1b' : '#78350f'}; font-size: 18px; font-weight: 800;">Exit Initiated - ${empName}</h2>
        <p style="margin: 4px 0 0 0; color: ${isTerm ? '#b91c1c' : '#92400e'}; font-size: 13px; font-weight: 500;">
            Management has initiated the exit process for ${empName}.
        </p>
    </div>

    <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); margin-bottom: 20px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Employee Name:</td>
                <td style="padding: 8px 0; color: #0f172a; font-weight: 700;">${empName}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Exit Type:</td>
                <td style="padding: 8px 0; color: #0f172a; font-weight: 700;">${isTerm ? "Company Termination" : "Employee Resignation"}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Reason:</td>
                <td style="padding: 8px 0; color: #0f172a; font-weight: 700;">${reason}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Notice Date:</td>
                <td style="padding: 8px 0; color: #0f172a; font-weight: 700;">${baseNoticeDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Notice Period:</td>
                <td style="padding: 8px 0; color: #0f172a; font-weight: 700;">${noticeDays} Days</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Last Working Day:</td>
                <td style="padding: 8px 0; color: #dc2626; font-weight: 800;">${finalLwd.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Eligible for Rehire:</td>
                <td style="padding: 8px 0; color: #0f172a; font-weight: 700;">${eligibleForRehire !== false ? "Yes" : "No"}</td>
            </tr>
            ${discussionSummary ? `
            <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Discussion Summary:</td>
                <td style="padding: 8px 0; color: #0f172a; font-weight: 600;">${discussionSummary}</td>
            </tr>` : ""}
            ${additionalComments ? `
            <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Additional Comments:</td>
                <td style="padding: 8px 0; color: #0f172a; font-weight: 600;">${additionalComments}</td>
            </tr>` : ""}
        </table>
    </div>
</div>`;

        if (recipientList.length > 0) {
            const userStates = recipientList.map(rec => ({
                user: rec.id,
                email: rec.email,
                folder: "inbox",
                isRead: false,
                isStarred: false,
                isDeleted: false
            }));

            const adminUser = req.user;
            const newEmail = new Email({
                sender: adminUser.id || adminUser._id,
                senderEmail: adminUser.email || "admin@ideafueled.com",
                senderName: adminUser.fullName || "Admin",
                senderAvatar: adminUser.profilePicture || "",
                senderRole: adminUser.role || "global_admin",
                to: recipientList.map(r => r.email),
                cc: [],
                bcc: [],
                subject,
                body: emailBody,
                snippet,
                attachments: [],
                priority: "high",
                labels: ["Offboarding", actionTitle, "HR"],
                userStates
            });

            newEmail.threadId = newEmail._id;
            await newEmail.save();

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
                        "exit_alert",
                        {
                            title: `Exit Initiated: ${empName}`,
                            message: `Exit process (${actionTitle}) initiated for ${empName}.`,
                            emailId: newEmail._id,
                            unreadCount
                        }
                    );
                } catch (e) {
                    console.error("Socket error on exit alert:", e);
                }
            }
        }

        const populated = await Offboarding.findById(record._id)
            .populate({
                path: "employee",
                select: "fullName firstName lastName employeeId department designation joiningDate probationPeriod managerId employementType workLocation status profilePicture email",
                populate: { path: "managerId", select: "fullName employeeId" }
            })
            .lean();

        return res.status(201).json({
            success: true,
            message: `Exit initiated for ${empName}. Employee status updated.`,
            offboardingRecord: populated
        });
    } catch (error) {
        console.error("Admin Initiate Exit Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
