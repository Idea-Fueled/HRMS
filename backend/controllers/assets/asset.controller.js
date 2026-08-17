import Asset from "../../models/assets/asset.model.js";
import User from "../../models/users/user.model.js";

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
            retired: allAssets.filter(a => a.status === "Retired" || a.status === "Lost").length,
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
            purchaseDate,
            warrantyInfo,
            serialNumber,
            notes
        } = req.body;

        if (!assetId || !name || !category) {
            return res.status(400).json({
                success: false,
                message: "Asset ID, Asset Name, and Category are required."
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
        let assignedDate = null;
        let finalStatus = status || "Available";

        if (assignedTo && assignedTo.trim() !== "") {
            const user = await User.findById(assignedTo);
            if (!user) {
                return res.status(400).json({
                    success: false,
                    message: "Selected assigned employee does not exist."
                });
            }
            assignedEmployeeId = user._id;
            assignedDate = new Date();
            finalStatus = "Assigned";
        }

        const newAsset = await Asset.create({
            assetId: assetId.trim(),
            name: name.trim(),
            category: category.trim(),
            brandModel: brandModel ? brandModel.trim() : "",
            condition: condition || "Excellent",
            status: finalStatus,
            assignedTo: assignedEmployeeId,
            assignedDate: assignedDate,
            purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
            warrantyInfo: warrantyInfo ? warrantyInfo.trim() : "",
            serialNumber: serialNumber ? serialNumber.trim() : "",
            notes: notes ? notes.trim() : ""
        });

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
        if (purchaseDate !== undefined) asset.purchaseDate = purchaseDate ? new Date(purchaseDate) : null;
        if (warrantyInfo !== undefined) asset.warrantyInfo = warrantyInfo.trim();
        if (serialNumber !== undefined) asset.serialNumber = serialNumber.trim();
        if (notes !== undefined) asset.notes = notes.trim();

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
            } else {
                asset.assignedTo = null;
                asset.assignedDate = null;
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
            }
        }

        await asset.save();

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

        await asset.save();

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
