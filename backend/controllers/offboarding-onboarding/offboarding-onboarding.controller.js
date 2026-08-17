import Onboarding from "../../models/onboarding/onboarding.model.js";
import Offboarding from "../../models/offboarding/offboarding.model.js";
import User from "../../models/users/user.model.js";

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
                select: "fullName firstName lastName employeeId department designation joiningDate managerId employementType workLocation status profilePicture email",
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
                select: "fullName firstName lastName employeeId department designation joiningDate managerId employementType workLocation status profilePicture email",
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
                select: "fullName firstName lastName employeeId department designation joiningDate managerId employementType workLocation status profilePicture email",
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
                select: "fullName firstName lastName employeeId department designation joiningDate managerId employementType workLocation status profilePicture email",
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
                select: "fullName firstName lastName employeeId department designation joiningDate managerId employementType workLocation status profilePicture email",
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
                select: "fullName firstName lastName employeeId department designation joiningDate managerId employementType workLocation status profilePicture email",
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
