import ActivityLog from "../../models/logs/activityLog.model.js";
import User from "../../models/users/user.model.js";

/**
 * Filter helper to strictly exclude Management users
 */
export const isManagementUser = (user) => {
    if (!user) return false;
    const role = (user.role || "").trim().toLowerCase();
    const dept = (user.department || "").trim().toLowerCase();
    const designation = (user.designation || "").trim().toLowerCase();
    return (
        role === "global_admin" ||
        role === "admin" ||
        role === "management" ||
        dept === "management" ||
        designation === "ceo" ||
        designation === "co-founder"
    );
};

/**
 * Record a single activity log
 * If user has role/department 'management' or is global_admin/admin, DO NOT TRACK.
 */
export const trackActivity = async (req, res) => {
    try {
        const userId = req.user?.userId || req.user?._id;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const user = await User.findById(userId)
            .select("_id employeeId fullName firstName lastName email role department designation")
            .lean();

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Strict guard: Do not track management users
        if (isManagementUser(user)) {
            return res.status(200).json({
                success: true,
                tracked: false,
                message: "Management activity tracking is disabled."
            });
        }

        const {
            actionType = "PAGE_VIEW",
            page = "/",
            pageTitle = "",
            action,
            details = null
        } = req.body;

        if (!action) {
            return res.status(400).json({ success: false, message: "Action description is required." });
        }

        const ipAddress = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "";
        const userAgent = req.headers["user-agent"] || "";

        const log = await ActivityLog.create({
            user: user._id,
            employeeId: user.employeeId,
            userName: user.fullName || `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.employeeId,
            userEmail: user.email,
            userRole: user.role,
            userDepartment: user.department,
            actionType,
            page,
            pageTitle,
            action,
            details,
            ipAddress: typeof ipAddress === "string" ? ipAddress.split(",")[0].trim() : "",
            userAgent,
            timestamp: new Date()
        });

        return res.status(201).json({
            success: true,
            tracked: true,
            logId: log._id
        });
    } catch (error) {
        console.error("Error logging activity:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to record activity log: " + error.message
        });
    }
};

/**
 * Fetch Activity Logs with filters & pagination (Global Admin only)
 */
export const getActivityLogs = async (req, res) => {
    try {
        const {
            employeeId,
            date,
            actionType,
            search,
            page = 1,
            limit = 25
        } = req.query;

        const pageNum = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));
        const skip = (pageNum - 1) * limitNum;

        const filter = {};

        // 1. Employee Filter
        if (employeeId && employeeId !== "All") {
            filter.employeeId = employeeId;
        }

        // 2. Date Filter (Full day tracking from 00:00:00 to 23:59:59)
        if (date) {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);

            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);

            filter.timestamp = {
                $gte: startOfDay,
                $lte: endOfDay
            };
        }

        // 3. Action Type Filter
        if (actionType && actionType !== "All") {
            filter.actionType = actionType;
        }

        // 4. Search Filter
        if (search && search.trim()) {
            const searchRegex = new RegExp(search.trim(), "i");
            filter.$or = [
                { userName: searchRegex },
                { employeeId: searchRegex },
                { action: searchRegex },
                { page: searchRegex },
                { pageTitle: searchRegex },
                { userDepartment: searchRegex }
            ];
        }

        const [logs, totalCount, rawEmployees] = await Promise.all([
            ActivityLog.find(filter)
                .sort({ timestamp: -1 })
                .skip(skip)
                .limit(limitNum)
                .lean(),
            ActivityLog.countDocuments(filter),
            User.find({
                status: { $in: ["active", "Active"] },
                role: { $nin: ["global_admin", "admin"] },
                department: { $not: { $regex: /^management$/i } }
            })
                .select("_id employeeId fullName firstName lastName department designation profilePicture role")
                .sort({ employeeId: 1 })
                .lean()
        ]);

        // Filter out any lingering management users
        const trackableEmployees = rawEmployees.filter(e => !isManagementUser(e));

        return res.status(200).json({
            success: true,
            logs,
            pagination: {
                total: totalCount,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(totalCount / limitNum) || 1
            },
            employees: trackableEmployees
        });
    } catch (error) {
        console.error("Error retrieving activity logs:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve activity logs: " + error.message
        });
    }
};

/**
 * Get distinct active stats / summary for logs (optional quick metrics for Global Admin)
 */
export const getLogStats = async (req, res) => {
    try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const [todayTotal, uniqueActiveUsersToday] = await Promise.all([
            ActivityLog.countDocuments({ timestamp: { $gte: todayStart } }),
            ActivityLog.distinct("employeeId", { timestamp: { $gte: todayStart } })
        ]);

        return res.status(200).json({
            success: true,
            stats: {
                todayTotal,
                activeEmployeesToday: uniqueActiveUsersToday.length
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
