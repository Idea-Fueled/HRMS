import crypto from "crypto";
import Asset from "../../models/assets/asset.model.js";
import AssetRequest from "../../models/assets/assetRequest.model.js";
import User from "../../models/users/user.model.js";
import Email from "../../models/emails/email.model.js";
import { emitToUser } from "../../socket/socket.js";
import { dispatchExternalEmail } from "../../services/email.service.js";

const PRIMARY_ADMIN_TO = "prashant.kumar@ideafueled.com";
const ADMIN_CC_LIST = ["puneet@ideafueled.com", "esha@ideafueled.com"];

/**
 * Send email to employee when an asset is assigned, with an acknowledge receipt CTA button.
 */
export const sendAssetAssignedNotification = async ({ asset, employee, assignedByUser }) => {
    try {
        if (!employee || !employee.email) return;

        const empName = employee.fullName || `${employee.firstName || ""} ${employee.lastName || ""}`.trim() || "Employee";
        const empCode = employee.employeeId || "—";
        const assignedDateStr = (asset.assignedDate ? new Date(asset.assignedDate) : new Date()).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });

        // Ensure token exists on asset
        let token = asset.acknowledgmentToken;
        if (!token) {
            token = crypto.randomBytes(24).toString("hex");
            await Asset.findByIdAndUpdate(asset._id, {
                acknowledgmentToken: token,
                acknowledgmentStatus: "Pending"
            });
        }

        const backendBaseUrl = process.env.BACKEND_URL || "http://localhost:5000";
        const ackUrl = `${backendBaseUrl}/api/assets/${asset._id}/acknowledge?token=${token}`;

        const subject = `Company Asset Assigned: ${asset.brandModel || asset.name || asset.category} (${asset.assetId})`;
        const snippet = `Corporate asset ${asset.assetId} (${asset.brandModel || asset.name}) has been assigned to you. Please acknowledge receipt.`;

        const emailHtml = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 4px;">
    <div style="background: linear-gradient(135deg, #2D79C7 0%, #1F5EA8 100%); border-radius: 14px; padding: 22px 24px; color: #ffffff; margin-bottom: 20px;">
        <span style="background: rgba(255,255,255,0.2); color: #ffffff; font-size: 10px; font-weight: 800; padding: 3px 10px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.6px; display: inline-block; margin-bottom: 8px;">
            IT Asset Allocation
        </span>
        <h2 style="margin: 0; color: #ffffff; font-size: 18px; font-weight: 800;">Corporate Asset Assigned</h2>
        <p style="margin: 4px 0 0 0; color: rgba(255,255,255,0.9); font-size: 13px;">
            Hello ${empName}, a corporate asset has been officially allocated to you.
        </p>
    </div>

    <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); margin-bottom: 20px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 600; width: 140px;">Asset ID:</td>
                <td style="padding: 8px 0; color: #2D79C7; font-weight: 800; font-family: monospace;">${asset.assetId}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Item / Model:</td>
                <td style="padding: 8px 0; color: #0f172a; font-weight: 700;">${asset.brandModel || asset.name || asset.category}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Category:</td>
                <td style="padding: 8px 0; color: #0f172a; font-weight: 600;">${asset.category}</td>
            </tr>
            ${asset.serialNumber ? `
            <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Serial Number:</td>
                <td style="padding: 8px 0; color: #0f172a; font-weight: 600; font-family: monospace;">${asset.serialNumber}</td>
            </tr>` : ''}
            <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Condition:</td>
                <td style="padding: 8px 0; color: #16a34a; font-weight: 700;">${asset.condition || 'Excellent'}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Assigned Date:</td>
                <td style="padding: 8px 0; color: #0f172a; font-weight: 600;">${assignedDateStr}</td>
            </tr>
        </table>

        <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center;">
            <p style="font-size: 12.5px; color: #475569; margin-bottom: 16px;">
                Please click the button below to confirm that you have safely received this asset in good working condition:
            </p>
            <a href="${ackUrl}" style="background: #16a34a; color: #ffffff; text-decoration: none; font-weight: 800; font-size: 14px; padding: 12px 28px; border-radius: 8px; display: inline-block; box-shadow: 0 2px 4px rgba(22,163,74,0.3);">
                ✓ Acknowledge Asset Receipt
            </a>
        </div>
    </div>

    <div style="background: #F1F5F9; padding: 12px 24px; text-align: center; font-size: 11px; color: #94A3B8; border-top: 1px solid #E2E8F0; border-radius: 0 0 14px 14px;">
        Idea-Fueled HRMS Automated Notification
    </div>
</div>`;

        const senderId = assignedByUser?._id || assignedByUser?.id;
        const senderEmail = assignedByUser?.email || "prashant.kumar@ideafueled.com";
        const senderName = assignedByUser?.fullName || "HR / Asset Admin";

        // 1. Create internal Email record
        const emailDoc = new Email({
            sender: senderId || employee._id,
            senderEmail,
            senderName,
            senderAvatar: assignedByUser?.profilePicture || "",
            senderRole: assignedByUser?.role || "global_admin",
            to: [employee.email.toLowerCase()],
            cc: [],
            bcc: [],
            subject,
            body: emailHtml,
            snippet,
            priority: "high",
            labels: ["Assets", "Notification"],
            userStates: [{
                user: employee._id,
                email: employee.email.toLowerCase(),
                folder: "inbox",
                isRead: false,
                isStarred: false,
                isDeleted: false
            }]
        });
        emailDoc.threadId = emailDoc._id;
        await emailDoc.save();

        // 2. Emit real-time socket event
        const unreadCount = await Email.countDocuments({
            userStates: {
                $elemMatch: {
                    email: employee.email.toLowerCase(),
                    folder: "inbox",
                    isRead: false,
                    isDeleted: false
                }
            }
        });
        emitToUser(
            { userId: employee._id, email: employee.email },
            "new_email",
            {
                email: emailDoc,
                unreadCount
            }
        );

        // 3. Dispatch external SMTP email
        try {
            await dispatchExternalEmail({
                to: employee.email,
                subject,
                body: emailHtml
            });
        } catch (extErr) {
            console.warn(`External asset assigned email delivery failed to ${employee.email}:`, extErr?.message || extErr);
        }
    } catch (err) {
        console.error("sendAssetAssignedNotification error:", err);
    }
};

/**
 * Process acknowledgment of an asset and send revert notification to Global Admins (To: Prashant, CC: Puneet, Esha)
 */
export const processAssetAcknowledgment = async (asset, userWhoAcknowledged = null) => {
    if (asset.acknowledgmentStatus === "Acknowledged") {
        return { alreadyAcknowledged: true, asset };
    }

    asset.acknowledgmentStatus = "Acknowledged";
    asset.acknowledgedAt = new Date();
    await asset.save();

    // Populate employee details
    const populatedAsset = await Asset.findById(asset._id)
        .populate("assignedTo", "fullName firstName lastName employeeId department designation email profilePicture")
        .lean();

    const employee = populatedAsset.assignedTo || userWhoAcknowledged;
    const empName = employee?.fullName || `${employee?.firstName || ""} ${employee?.lastName || ""}`.trim() || "Employee";
    const empCode = employee?.employeeId || "—";
    const empDept = employee?.department || "General";
    const empEmail = employee?.email || "";

    const toEmail = PRIMARY_ADMIN_TO;
    const ccEmails = ADMIN_CC_LIST;

    const subject = `Asset Acknowledged: ${asset.brandModel || asset.name || asset.category} (${asset.assetId}) - ${empName}`;
    const snippet = `${empName} (${empCode}) has confirmed receipt of corporate asset ${asset.assetId}.`;

    const emailHtml = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 4px;">
    <div style="background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); border: 1px solid #86efac; border-radius: 14px; padding: 18px 22px; margin-bottom: 20px;">
        <span style="background-color: #16a34a; color: #ffffff; font-size: 10px; font-weight: 800; padding: 3px 10px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.6px; display: inline-block; margin-bottom: 8px;">
            Receipt Confirmed
        </span>
        <h2 style="margin: 0; color: #14532d; font-size: 18px; font-weight: 800;">Asset Receipt Acknowledged</h2>
        <p style="margin: 4px 0 0 0; color: #15803d; font-size: 13px; font-weight: 500;">
            ${empName} has officially acknowledged the receipt of their assigned corporate asset.
        </p>
    </div>

    <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); margin-bottom: 20px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 600; width: 150px;">Employee Name:</td>
                <td style="padding: 8px 0; color: #0f172a; font-weight: 700;">${empName}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Employee ID:</td>
                <td style="padding: 8px 0; color: #0f172a; font-weight: 700;">${empCode}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Department:</td>
                <td style="padding: 8px 0; color: #0f172a; font-weight: 600;">${empDept}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Asset ID:</td>
                <td style="padding: 8px 0; color: #2D79C7; font-weight: 800; font-family: monospace;">${asset.assetId}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Item / Model:</td>
                <td style="padding: 8px 0; color: #0f172a; font-weight: 700;">${asset.brandModel || asset.name || asset.category}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Category:</td>
                <td style="padding: 8px 0; color: #0f172a; font-weight: 600;">${asset.category}</td>
            </tr>
            ${asset.serialNumber ? `
            <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Serial Number:</td>
                <td style="padding: 8px 0; color: #0f172a; font-weight: 600; font-family: monospace;">${asset.serialNumber}</td>
            </tr>` : ''}
            <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Acknowledged At:</td>
                <td style="padding: 8px 0; color: #16a34a; font-weight: 800;">${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</td>
            </tr>
        </table>

        <div style="text-align: center; margin-top: 20px;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/assets" style="background: #2D79C7; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 13px; padding: 10px 22px; border-radius: 6px; display: inline-block;">
                View Assets Module
            </a>
        </div>
    </div>

    <div style="background: #F1F5F9; padding: 12px 24px; text-align: center; font-size: 11px; color: #94A3B8; border-top: 1px solid #E2E8F0; border-radius: 0 0 14px 14px;">
        Idea-Fueled HRMS Automated Notification
    </div>
</div>`;

    // Find users for Prashant, Puneet, Esha
    const allEmails = [toEmail, ...ccEmails];
    const adminUsers = await User.find({
        email: { $in: allEmails.map(e => new RegExp(`^${e}$`, "i")) }
    }).select("_id email fullName firstName lastName role profilePicture").lean();

    const userStates = adminUsers.map(u => ({
        user: u._id,
        email: u.email.toLowerCase(),
        folder: "inbox",
        isRead: false,
        isStarred: false,
        isDeleted: false
    }));

    // 1. Create internal Email record
    const emailDoc = new Email({
        sender: employee?._id || null,
        senderEmail: empEmail || "system@ideafueled.com",
        senderName: empName,
        senderAvatar: employee?.profilePicture || "",
        senderRole: employee?.role || "employee",
        to: [toEmail],
        cc: ccEmails,
        bcc: [],
        subject,
        body: emailHtml,
        snippet,
        priority: "high",
        labels: ["Assets", "Acknowledgment", "HR"],
        userStates
    });
    emailDoc.threadId = emailDoc._id;
    await emailDoc.save();

    // 2. Emit real-time socket events
    for (const admin of adminUsers) {
        try {
            const unreadCount = await Email.countDocuments({
                userStates: {
                    $elemMatch: {
                        email: admin.email.toLowerCase(),
                        folder: "inbox",
                        isRead: false,
                        isDeleted: false
                    }
                }
            });
            emitToUser(
                { userId: admin._id, email: admin.email },
                "new_email",
                {
                    email: emailDoc,
                    unreadCount
                }
            );
        } catch (sErr) {
            console.error("Socket error on asset ack revert:", sErr);
        }
    }

    // 3. Dispatch external SMTP email
    try {
        await dispatchExternalEmail({
            to: toEmail,
            cc: ccEmails,
            subject,
            body: emailHtml
        });
    } catch (extErr) {
        console.warn(`External asset ack revert email delivery failed:`, extErr?.message || extErr);
    }

    return { alreadyAcknowledged: false, asset: populatedAsset };
};

/* ─────────────────────────────────────────────
   GET ALL ASSETS (with summary stats and filters)
 ───────────────────────────────────────────── */
export const getAllAssets = async (req, res) => {
    try {
        const { search, category, status, condition } = req.query;

        const query = {};

        if (search) {
            const searchRegex = new RegExp(search, "i");
            query.$or = [
                { name: searchRegex },
                { assetId: searchRegex },
                { brandModel: searchRegex },
                { serialNumber: searchRegex },
                { category: searchRegex }
            ];
        }

        if (category) {
            query.category = category;
        }

        if (status) {
            query.status = status;
        }

        if (condition) {
            query.condition = condition;
        }

        const assets = await Asset.find(query)
            .populate("assignedTo", "fullName firstName lastName employeeId department designation status profilePicture email")
            .sort({ createdAt: -1 })
            .lean();

        // Calculate summary statistics
        const allAssets = await Asset.find().lean();
        const summary = {
            total: allAssets.length,
            assigned: allAssets.filter(a => a.status === "Assigned" || a.assignedTo).length,
            available: allAssets.filter(a => a.status === "Available" && !a.assignedTo).length,
            inMaintenance: allAssets.filter(a => a.status === "In Maintenance").length,
            retired: allAssets.filter(a => a.status === "Not Assigned" || a.status === "Retired" || a.status === "Lost").length,
            damaged: allAssets.filter(a => a.condition === "Damaged" || a.condition === "Poor").length,
        };

        return res.status(200).json({
            success: true,
            summary,
            assets
        });
    } catch (error) {
        console.error("Get All Assets Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/* ─────────────────────────────────────────────
   GET ASSIGNED ASSETS (grouped by employee)
 ───────────────────────────────────────────── */
export const getAssignedAssets = async (req, res) => {
    try {
        // Fetch all assets that are assigned to an employee
        const assignedAssets = await Asset.find({ assignedTo: { $ne: null } })
            .populate("assignedTo", "fullName firstName lastName employeeId department designation status profilePicture email")
            .sort({ updatedAt: -1 })
            .lean();

        // Group assets by assigned employee
        const employeeMap = {};

        assignedAssets.forEach(asset => {
            if (asset.assignedTo && asset.assignedTo._id) {
                const empId = asset.assignedTo._id.toString();
                if (!employeeMap[empId]) {
                    employeeMap[empId] = {
                        employee: asset.assignedTo,
                        assets: []
                    };
                }
                employeeMap[empId].assets.push(asset);
            }
        });

        // Also fetch active employees without assigned assets if needed or return list of assigned groups
        const assignedGroups = Object.values(employeeMap);

        return res.status(200).json({
            success: true,
            assignedGroups,
            totalAssignedAssets: assignedAssets.length,
            totalEmployeesWithAssets: assignedGroups.length
        });
    } catch (error) {
        console.error("Get Assigned Assets Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/* ─────────────────────────────────────────────
   CREATE ASSET
 ───────────────────────────────────────────── */
export const createAsset = async (req, res) => {
    try {
        const {
            assetId,
            name,
            category,
            brandModel,
            condition,
            status,
            assignedTo,
            assignedDate,
            purchaseDate,
            warrantyInfo,
            serialNumber,
            notes
        } = req.body;

        if (!assetId || !category) {
            return res.status(400).json({
                success: false,
                message: "Asset ID and Category are required."
            });
        }

        // Unique assetId check
        const existingAsset = await Asset.findOne({ assetId: assetId.trim() });
        if (existingAsset) {
            return res.status(400).json({
                success: false,
                message: "Asset ID already exists. Please use a unique Asset ID."
            });
        }

        let assignedEmployeeId = null;
        let finalAssignedDate = assignedDate ? new Date(assignedDate) : null;
        let finalStatus = status || "Available";
        let assignedUserDoc = null;

        if (assignedTo && assignedTo.trim() !== "") {
            const user = await User.findById(assignedTo);
            if (!user) {
                return res.status(400).json({
                    success: false,
                    message: "Selected assigned employee does not exist."
                });
            }
            assignedUserDoc = user;
            assignedEmployeeId = user._id;
            if (!finalAssignedDate) {
                finalAssignedDate = new Date();
            }
            finalStatus = "Assigned";
        }

        const assetName = name ? name.trim() : (brandModel ? brandModel.trim() : category.trim());
        const ackToken = assignedEmployeeId ? crypto.randomBytes(24).toString("hex") : null;

        const newAsset = await Asset.create({
            assetId: assetId.trim(),
            name: assetName,
            category: category.trim(),
            brandModel: brandModel ? brandModel.trim() : "",
            condition: condition || "Excellent",
            status: finalStatus,
            assignedTo: assignedEmployeeId,
            assignedDate: finalAssignedDate,
            purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
            warrantyInfo: warrantyInfo ? warrantyInfo.trim() : "",
            serialNumber: serialNumber ? serialNumber.trim() : "",
            notes: notes ? notes.trim() : "",
            acknowledgmentStatus: "Pending",
            acknowledgmentToken: ackToken
        });

        if (assignedUserDoc) {
            sendAssetAssignedNotification({ asset: newAsset, employee: assignedUserDoc, assignedByUser: req.user });
        }

        const populatedAsset = await Asset.findById(newAsset._id)
            .populate("assignedTo", "fullName firstName lastName employeeId department designation status profilePicture email")
            .lean();

        return res.status(201).json({
            success: true,
            message: "Asset created successfully.",
            asset: populatedAsset
        });
    } catch (error) {
        console.error("Create Asset Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/* ─────────────────────────────────────────────
   UPDATE ASSET
 ───────────────────────────────────────────── */
export const updateAsset = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            assetId,
            name,
            category,
            brandModel,
            condition,
            status,
            assignedTo,
            assignedDate,
            purchaseDate,
            warrantyInfo,
            serialNumber,
            notes
        } = req.body;

        const asset = await Asset.findById(id);
        if (!asset) {
            return res.status(404).json({ success: false, message: "Asset not found." });
        }

        if (assetId && assetId.trim() !== asset.assetId) {
            const existingAsset = await Asset.findOne({ assetId: assetId.trim(), _id: { $ne: id } });
            if (existingAsset) {
                return res.status(400).json({ success: false, message: "Asset ID already in use by another asset." });
            }
            asset.assetId = assetId.trim();
        }

        if (name) asset.name = name.trim();
        if (category) asset.category = category.trim();
        if (brandModel !== undefined) asset.brandModel = brandModel.trim();
        if (condition) asset.condition = condition;
        if (assignedDate !== undefined) asset.assignedDate = assignedDate ? new Date(assignedDate) : null;
        if (purchaseDate !== undefined) asset.purchaseDate = purchaseDate ? new Date(purchaseDate) : null;
        if (warrantyInfo !== undefined) asset.warrantyInfo = warrantyInfo.trim();
        if (serialNumber !== undefined) asset.serialNumber = serialNumber.trim();
        if (notes !== undefined) asset.notes = notes.trim();

        const previousAssignedTo = asset.assignedTo ? asset.assignedTo.toString() : null;
        let newlyAssignedUser = null;

        // Handle assignment changes
        if (assignedTo !== undefined) {
            if (assignedTo && assignedTo.toString().trim() !== "") {
                const user = await User.findById(assignedTo);
                if (!user) {
                    return res.status(400).json({ success: false, message: "Selected employee not found." });
                }
                asset.assignedTo = user._id;
                if (!asset.assignedDate) {
                    asset.assignedDate = new Date();
                }
                asset.status = "Assigned";

                if (user._id.toString() !== previousAssignedTo) {
                    asset.acknowledgmentStatus = "Pending";
                    asset.acknowledgedAt = null;
                    asset.acknowledgmentToken = crypto.randomBytes(24).toString("hex");
                    newlyAssignedUser = user;
                }
            } else {
                asset.assignedTo = null;
                asset.assignedDate = null;
                asset.acknowledgmentStatus = "Pending";
                asset.acknowledgedAt = null;
                asset.acknowledgmentToken = null;
                if (asset.status === "Assigned") {
                    asset.status = "Available";
                }
            }
        }

        if (status && status !== asset.status) {
            asset.status = status;
            if (status === "Available") {
                asset.assignedTo = null;
                asset.assignedDate = null;
                asset.acknowledgmentStatus = "Pending";
                asset.acknowledgedAt = null;
                asset.acknowledgmentToken = null;
            }
        }

        await asset.save();

        if (newlyAssignedUser) {
            sendAssetAssignedNotification({ asset, employee: newlyAssignedUser, assignedByUser: req.user });
        }

        const updatedAsset = await Asset.findById(id)
            .populate("assignedTo", "fullName firstName lastName employeeId department designation status profilePicture email")
            .lean();

        return res.status(200).json({
            success: true,
            message: "Asset updated successfully.",
            asset: updatedAsset
        });
    } catch (error) {
        console.error("Update Asset Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/* ─────────────────────────────────────────────
   ASSIGN ASSET TO EMPLOYEE
 ───────────────────────────────────────────── */
export const assignAsset = async (req, res) => {
    try {
        const { id } = req.params;
        const { employeeId } = req.body; // User Mongo ID

        if (!employeeId) {
            return res.status(400).json({ success: false, message: "Employee ID is required to assign asset." });
        }

        const asset = await Asset.findById(id);
        if (!asset) {
            return res.status(404).json({ success: false, message: "Asset not found." });
        }

        const user = await User.findById(employeeId);
        if (!user) {
            return res.status(404).json({ success: false, message: "Employee not found." });
        }

        asset.assignedTo = user._id;
        asset.assignedDate = new Date();
        asset.status = "Assigned";
        asset.acknowledgmentStatus = "Pending";
        asset.acknowledgedAt = null;
        asset.acknowledgmentToken = crypto.randomBytes(24).toString("hex");

        await asset.save();

        // Send email to employee with acknowledge button
        sendAssetAssignedNotification({ asset, employee: user, assignedByUser: req.user });

        const updatedAsset = await Asset.findById(id)
            .populate("assignedTo", "fullName firstName lastName employeeId department designation status profilePicture email")
            .lean();

        return res.status(200).json({
            success: true,
            message: `Asset ${asset.assetId} successfully assigned to ${user.fullName || user.firstName}.`,
            asset: updatedAsset
        });
    } catch (error) {
        console.error("Assign Asset Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/* ─────────────────────────────────────────────
   UNASSIGN ASSET FROM EMPLOYEE
 ───────────────────────────────────────────── */
export const unassignAsset = async (req, res) => {
    try {
        const { id } = req.params;

        const asset = await Asset.findById(id);
        if (!asset) {
            return res.status(404).json({ success: false, message: "Asset not found." });
        }

        asset.assignedTo = null;
        asset.assignedDate = null;
        asset.status = "Available";
        asset.acknowledgmentStatus = "Pending";
        asset.acknowledgedAt = null;
        asset.acknowledgmentToken = null;

        await asset.save();

        const updatedAsset = await Asset.findById(id)
            .populate("assignedTo", "fullName firstName lastName employeeId department designation status profilePicture email")
            .lean();

        return res.status(200).json({
            success: true,
            message: `Asset ${asset.assetId} has been unassigned and marked as Available.`,
            asset: updatedAsset
        });
    } catch (error) {
        console.error("Unassign Asset Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/* ─────────────────────────────────────────────
   UPDATE STATUS & CONDITION
 ───────────────────────────────────────────── */
export const updateAssetStatusCondition = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, condition } = req.body;

        const asset = await Asset.findById(id);
        if (!asset) {
            return res.status(404).json({ success: false, message: "Asset not found." });
        }

        if (status) {
            asset.status = status;
            if (status === "Available") {
                asset.assignedTo = null;
                asset.assignedDate = null;
                asset.acknowledgmentStatus = "Pending";
                asset.acknowledgedAt = null;
                asset.acknowledgmentToken = null;
            }
        }

        if (condition) {
            asset.condition = condition;
        }

        await asset.save();

        const updatedAsset = await Asset.findById(id)
            .populate("assignedTo", "fullName firstName lastName employeeId department designation status profilePicture email")
            .lean();

        return res.status(200).json({
            success: true,
            message: "Asset status and condition updated successfully.",
            asset: updatedAsset
        });
    } catch (error) {
        console.error("Update Asset Status Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/* ─────────────────────────────────────────────
   DELETE ASSET
 ───────────────────────────────────────────── */
export const deleteAsset = async (req, res) => {
    try {
        const { id } = req.params;

        const asset = await Asset.findByIdAndDelete(id);
        if (!asset) {
            return res.status(404).json({ success: false, message: "Asset not found." });
        }

        return res.status(200).json({
            success: true,
            message: `Asset ${asset.assetId} deleted successfully.`
        });
    } catch (error) {
        console.error("Delete Asset Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/* ─────────────────────────────────────────────
   ACKNOWLEDGE ASSET (GET with token from email)
 ───────────────────────────────────────────── */
export const acknowledgeAssetByToken = async (req, res) => {
    try {
        const { id } = req.params;
        const { token } = req.query;

        const asset = await Asset.findById(id);
        if (!asset) {
            return res.status(404).send(`
                <html>
                <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center; padding: 60px 20px; background: #f8fafc; color: #1e293b;">
                    <div style="max-width: 480px; margin: 0 auto; background: #fff; padding: 32px; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                        <div style="font-size: 40px; margin-bottom: 12px;">⚠️</div>
                        <h2 style="color: #dc2626; margin: 0 0 8px;">Asset Not Found</h2>
                        <p style="color: #64748b; font-size: 14px;">The specified corporate asset record was not found.</p>
                    </div>
                </body>
                </html>
            `);
        }

        if (token && asset.acknowledgmentToken && asset.acknowledgmentToken !== token) {
            return res.status(403).send(`
                <html>
                <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center; padding: 60px 20px; background: #f8fafc; color: #1e293b;">
                    <div style="max-width: 480px; margin: 0 auto; background: #fff; padding: 32px; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                        <div style="font-size: 40px; margin-bottom: 12px;">🔒</div>
                        <h2 style="color: #dc2626; margin: 0 0 8px;">Invalid Link</h2>
                        <p style="color: #64748b; font-size: 14px;">This acknowledgment verification link is invalid or expired.</p>
                    </div>
                </body>
                </html>
            `);
        }

        await processAssetAcknowledgment(asset);

        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
        return res.redirect(`${frontendUrl}/profile?tab=Assets&acknowledged=true&assetId=${encodeURIComponent(asset.assetId)}`);
    } catch (error) {
        console.error("Acknowledge Asset By Token Error:", error);
        return res.status(500).send("An error occurred while confirming asset acknowledgment.");
    }
};

/* ─────────────────────────────────────────────
   ACKNOWLEDGE ASSET (POST from Authenticated UI)
 ───────────────────────────────────────────── */
export const acknowledgeAsset = async (req, res) => {
    try {
        const { id } = req.params;
        const asset = await Asset.findById(id);
        if (!asset) {
            return res.status(404).json({ success: false, message: "Asset not found." });
        }

        if (
            req.user &&
            req.user.role !== "global_admin" &&
            asset.assignedTo &&
            asset.assignedTo.toString() !== (req.user.id || req.user._id).toString()
        ) {
            return res.status(403).json({ success: false, message: "You can only acknowledge assets assigned to you." });
        }

        const result = await processAssetAcknowledgment(asset, req.user);

        return res.status(200).json({
            success: true,
            message: result.alreadyAcknowledged
                ? "Asset is already acknowledged."
                : "Asset acknowledged successfully and notification sent to management.",
            asset: result.asset
        });
    } catch (error) {
        console.error("Acknowledge Asset Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/* ─────────────────────────────────────────────
   REQUEST NEW ASSET (POST from Employee Profile)
 ───────────────────────────────────────────── */
export const requestNewAsset = async (req, res) => {
    try {
        const { assetType, comment } = req.body;
        const validTypes = ["Monitor", "Mouse", "Keyboard", "Earphone/Headphone", "Other"];

        if (!assetType || !validTypes.includes(assetType)) {
            return res.status(400).json({
                success: false,
                message: `Please select a valid asset type (${validTypes.join(", ")}).`
            });
        }

        if (assetType === "Other" && (!comment || !comment.trim())) {
            return res.status(400).json({
                success: false,
                message: "Please specify which asset you require in the comment box."
            });
        }

        const employeeId = req.user.id || req.user._id;
        const employee = await User.findById(employeeId).lean();
        if (!employee) {
            return res.status(404).json({ success: false, message: "Employee not found." });
        }

        const empName = employee.fullName || `${employee.firstName || ""} ${employee.lastName || ""}`.trim() || "Employee";
        const empCode = employee.employeeId || "—";
        const empDept = employee.department || "General";
        const empDesig = employee.designation || "Employee";

        // Save request record
        const requestRecord = await AssetRequest.create({
            employee: employeeId,
            assetType,
            comment: (comment || "").trim(),
            status: "Pending"
        });

        const toEmail = PRIMARY_ADMIN_TO;
        const ccEmails = ADMIN_CC_LIST;

        const subject = `New Asset Request: ${assetType} - ${empName} (${empCode})`;
        const snippet = `${empName} has requested a new asset: ${assetType}.`;

        const emailHtml = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 4px;">
    <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border: 1px solid #bfdbfe; border-radius: 14px; padding: 18px 22px; margin-bottom: 20px;">
        <span style="background-color: #2563eb; color: #ffffff; font-size: 10px; font-weight: 800; padding: 3px 10px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.6px; display: inline-block; margin-bottom: 8px;">
            Asset Request
        </span>
        <h2 style="margin: 0; color: #1e40af; font-size: 18px; font-weight: 800;">New Corporate Asset Request</h2>
        <p style="margin: 4px 0 0 0; color: #1d4ed8; font-size: 13px; font-weight: 500;">
            ${empName} has submitted a request for a new asset / peripheral.
        </p>
    </div>

    <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); margin-bottom: 20px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 600; width: 150px;">Employee Name:</td>
                <td style="padding: 8px 0; color: #0f172a; font-weight: 700;">${empName}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Employee ID:</td>
                <td style="padding: 8px 0; color: #0f172a; font-weight: 700;">${empCode}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Department:</td>
                <td style="padding: 8px 0; color: #0f172a; font-weight: 600;">${empDept}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Designation:</td>
                <td style="padding: 8px 0; color: #0f172a; font-weight: 600;">${empDesig}</td>
            </tr>
            <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Requested Asset:</td>
                <td style="padding: 8px 0; color: #2563eb; font-weight: 800; font-size: 14px;">${assetType}</td>
            </tr>
            ${comment ? `
            <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 600; vertical-align: top;">Requirement / Comment:</td>
                <td style="padding: 8px 0; color: #0f172a; font-weight: 500; white-space: pre-line;">${comment}</td>
            </tr>` : ''}
            <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Requested At:</td>
                <td style="padding: 8px 0; color: #0f172a; font-weight: 600;">${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</td>
            </tr>
        </table>

        <div style="text-align: center; margin-top: 20px;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/assets" style="background: #2563eb; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 13px; padding: 10px 22px; border-radius: 6px; display: inline-block;">
                Review in Assets Module
            </a>
        </div>
    </div>

    <div style="background: #F1F5F9; padding: 12px 24px; text-align: center; font-size: 11px; color: #94A3B8; border-top: 1px solid #E2E8F0; border-radius: 0 0 14px 14px;">
        Idea-Fueled HRMS Automated Notification
    </div>
</div>`;

        // Find users for Prashant, Puneet, Esha
        const allEmails = [toEmail, ...ccEmails];
        const adminUsers = await User.find({
            email: { $in: allEmails.map(e => new RegExp(`^${e}$`, "i")) }
        }).select("_id email fullName firstName lastName role profilePicture").lean();

        const userStates = adminUsers.map(u => ({
            user: u._id,
            email: u.email.toLowerCase(),
            folder: "inbox",
            isRead: false,
            isStarred: false,
            isDeleted: false
        }));

        // 2. Create internal Email record
        const emailDoc = new Email({
            sender: employeeId,
            senderEmail: employee.email || "employee@ideafueled.com",
            senderName: empName,
            senderAvatar: employee.profilePicture || "",
            senderRole: employee.role || "employee",
            to: [toEmail],
            cc: ccEmails,
            bcc: [],
            subject,
            body: emailHtml,
            snippet,
            priority: "high",
            labels: ["Assets", "Request", "HR"],
            userStates
        });
        emailDoc.threadId = emailDoc._id;
        await emailDoc.save();

        // 3. Emit real-time socket events
        for (const admin of adminUsers) {
            try {
                const unreadCount = await Email.countDocuments({
                    userStates: {
                        $elemMatch: {
                            email: admin.email.toLowerCase(),
                            folder: "inbox",
                            isRead: false,
                            isDeleted: false
                        }
                    }
                });
                emitToUser(
                    { userId: admin._id, email: admin.email },
                    "new_email",
                    {
                        email: emailDoc,
                        unreadCount
                    }
                );
            } catch (sErr) {
                console.error("Socket error on asset request:", sErr);
            }
        }

        // 4. Dispatch external SMTP email
        try {
            await dispatchExternalEmail({
                to: toEmail,
                cc: ccEmails,
                subject,
                body: emailHtml
            });
        } catch (extErr) {
            console.warn(`External asset request email delivery failed:`, extErr?.message || extErr);
        }

        return res.status(201).json({
            success: true,
            message: "Asset request submitted successfully and notification sent to management.",
            request: requestRecord
        });
    } catch (error) {
        console.error("Request New Asset Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
