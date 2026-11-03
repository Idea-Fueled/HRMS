import ProbationPolicy from "../../models/probation/probationPolicy.model.js";
import User from "../../models/users/user.model.js";

/**
 * Ensure default policies exist in DB
 */
const ensureDefaultPolicies = async (adminId) => {
    const count = await ProbationPolicy.countDocuments();
    if (count === 0) {
        const defaults = [
            { name: "Fresher", days: 0, description: "Probation policy for fresh graduates / entry level hires", isDefault: true, createdBy: adminId || null },
            { name: "Probation Policy", days: 0, description: "Standard company probation policy for general hires", isDefault: true, createdBy: adminId || null },
            { name: "Probation Period-2", days: 0, description: "Extended or secondary probation policy", isDefault: true, createdBy: adminId || null }
        ];
        await ProbationPolicy.insertMany(defaults);
    }
};

/**
 * GET /api/probation/policies
 * Returns all probation policies with enrolled employee count
 */
export const getProbationPolicies = async (req, res) => {
    try {
        await ensureDefaultPolicies(req.user?._id);

        const policies = await ProbationPolicy.find().sort({ createdAt: 1 }).lean();

        // Calculate enrolled count for each policy
        const policiesWithCounts = await Promise.all(
            policies.map(async (policy) => {
                const enrolledCount = await User.countDocuments({
                    probationPolicy: policy._id,
                    status: { $in: ["active", "Active"] }
                });
                return {
                    ...policy,
                    enrolledCount
                };
            })
        );

        // Overall probation stats
        const totalEmployees = await User.countDocuments({ status: { $in: ["active", "Active"] } });
        const onProbationEmployees = await User.countDocuments({
            probationPolicy: { $ne: null },
            status: { $in: ["active", "Active"] }
        });

        return res.status(200).json({
            success: true,
            policies: policiesWithCounts,
            stats: {
                totalPolicies: policies.length,
                totalEmployees,
                onProbationEmployees
            }
        });
    } catch (error) {
        console.error("Get Probation Policies Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * POST /api/probation/policies
 * Creates a new probation policy
 */
export const createProbationPolicy = async (req, res) => {
    try {
        const { name, months, days, description } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: "Policy name is required." });
        }

        const cleanName = name.trim();
        const existing = await ProbationPolicy.findOne({ name: { $regex: new RegExp(`^${cleanName}$`, "i") } });
        if (existing) {
            return res.status(400).json({ success: false, message: "A policy with this name already exists." });
        }

        const numMonths = months !== undefined && months !== "" ? Number(months) : (days ? Math.round(Number(days) / 30) : 0);
        const numDays = days !== undefined && days !== "" ? Number(days) : numMonths * 30;

        const policy = await ProbationPolicy.create({
            name: cleanName,
            months: numMonths,
            days: numDays,
            description: (description || "").trim(),
            createdBy: req.user?._id || null
        });

        return res.status(201).json({
            success: true,
            message: "Probation policy created successfully.",
            policy: {
                ...policy.toObject(),
                enrolledCount: 0
            }
        });
    } catch (error) {
        console.error("Create Probation Policy Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * PUT /api/probation/policies/:id
 * Updates an existing probation policy
 */
export const updateProbationPolicy = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, months, days, description, syncEnrolledEmployees } = req.body;

        const policy = await ProbationPolicy.findById(id);
        if (!policy) {
            return res.status(404).json({ success: false, message: "Policy not found." });
        }

        if (name && name.trim()) {
            const cleanName = name.trim();
            const existing = await ProbationPolicy.findOne({
                name: { $regex: new RegExp(`^${cleanName}$`, "i") },
                _id: { $ne: id }
            });
            if (existing) {
                return res.status(400).json({ success: false, message: "Another policy with this name already exists." });
            }
            policy.name = cleanName;
        }

        let daysChanged = false;
        if (months !== undefined && months !== "") {
            const numMonths = Number(months);
            const numDays = numMonths * 30;
            daysChanged = policy.days !== numDays || policy.months !== numMonths;
            policy.months = numMonths;
            policy.days = numDays;
        } else if (days !== undefined && days !== "") {
            const numDays = Number(days);
            const numMonths = Math.round(numDays / 30);
            daysChanged = policy.days !== numDays || policy.months !== numMonths;
            policy.days = numDays;
            policy.months = numMonths;
        }

        if (description !== undefined) {
            policy.description = description.trim();
        }

        await policy.save();

        // Optionally update all enrolled active employees if policy duration was updated
        if (daysChanged || syncEnrolledEmployees) {
            await User.updateMany(
                { probationPolicy: policy._id },
                { $set: { probationPeriod: policy.days } }
            );
        }

        const enrolledCount = await User.countDocuments({
            probationPolicy: policy._id,
            status: { $in: ["active", "Active"] }
        });

        return res.status(200).json({
            success: true,
            message: "Probation policy updated successfully.",
            policy: {
                ...policy.toObject(),
                enrolledCount
            }
        });
    } catch (error) {
        console.error("Update Probation Policy Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * DELETE /api/probation/policies/:id
 * Deletes a policy and unlinks any assigned employees
 */
export const deleteProbationPolicy = async (req, res) => {
    try {
        const { id } = req.params;

        const policy = await ProbationPolicy.findById(id);
        if (!policy) {
            return res.status(404).json({ success: false, message: "Policy not found." });
        }

        // Unassign employees
        await User.updateMany(
            { probationPolicy: policy._id },
            { $set: { probationPolicy: null } }
        );

        await ProbationPolicy.findByIdAndDelete(id);

        return res.status(200).json({
            success: true,
            message: "Probation policy deleted and employees unassigned."
        });
    } catch (error) {
        console.error("Delete Probation Policy Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * GET /api/probation/policies/:id/employees
 * Returns enrolled employees under this policy with probation milestone calculations
 */
export const getPolicyEmployees = async (req, res) => {
    try {
        const { id } = req.params;

        let query = {};
        if (id === "all") {
            query = {
                status: { $in: ["active", "Active"] },
                probationPolicy: { $ne: null }
            };
        } else {
            const policy = await ProbationPolicy.findById(id);
            if (!policy) {
                return res.status(404).json({ success: false, message: "Policy not found." });
            }
            query = {
                probationPolicy: policy._id,
                status: { $in: ["active", "Active"] }
            };
        }

        const employees = await User.find(query)
            .populate("probationPolicy", "name days months")
            .populate("managerId", "fullName firstName lastName employeeId designation")
            .select("fullName firstName lastName employeeId designation department joiningDate probationPeriod probationPolicy profilePicture email phoneNumber status")
            .sort({ joiningDate: -1 })
            .lean();

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const enrichedEmployees = employees.map((emp) => {
            const name = emp.fullName || `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || "Employee";
            const days = (emp.probationPeriod !== undefined && emp.probationPeriod !== null && Number(emp.probationPeriod) > 0)
                ? Number(emp.probationPeriod)
                : (emp.probationPolicy?.days || (Number(emp.probationPolicy?.months || 0) * 30) || 0);
            
            const months = emp.probationPolicy?.months || (days >= 28 ? Math.round(days / 30) : (days > 0 ? 1 : 0));
            
            let probationEndDate = null;
            let daysRemaining = null;
            let isCompleted = false;
            let progress = 0;

            if (emp.joiningDate) {
                const join = new Date(emp.joiningDate);
                join.setHours(0, 0, 0, 0);
                
                const end = new Date(join);
                end.setDate(end.getDate() + days);
                probationEndDate = end;

                const totalDurationMs = end.getTime() - join.getTime();
                const elapsedMs = today.getTime() - join.getTime();

                if (today >= end) {
                    isCompleted = true;
                    daysRemaining = 0;
                    progress = 100;
                } else {
                    isCompleted = false;
                    daysRemaining = Math.max(0, Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
                    if (totalDurationMs > 0) {
                        progress = Math.min(100, Math.max(0, Math.round((elapsedMs / totalDurationMs) * 100)));
                    }
                }
            }

            return {
                ...emp,
                displayName: name,
                probationDays: days,
                probationMonths: months,
                probationEndDate,
                daysRemaining,
                isCompleted,
                progress
            };
        });

        return res.status(200).json({
            success: true,
            employees: enrichedEmployees
        });
    } catch (error) {
        console.error("Get Policy Employees Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * POST /api/probation/assign
 * Assign one or more employees to a probation policy
 */
export const assignEmployeesToPolicy = async (req, res) => {
    try {
        const { policyId, employeeIds } = req.body;

        if (!policyId) {
            return res.status(400).json({ success: false, message: "Policy ID is required." });
        }

        if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
            return res.status(400).json({ success: false, message: "Please select at least one employee." });
        }

        const policy = await ProbationPolicy.findById(policyId);
        if (!policy) {
            return res.status(404).json({ success: false, message: "Policy not found." });
        }

        await User.updateMany(
            { _id: { $in: employeeIds } },
            {
                $set: {
                    probationPolicy: policy._id,
                    probationPeriod: policy.days
                }
            }
        );

        return res.status(200).json({
            success: true,
            message: `${employeeIds.length} employee(s) assigned to ${policy.name} successfully.`
        });
    } catch (error) {
        console.error("Assign Employees To Policy Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * POST /api/probation/remove
 * Removes an employee from their assigned probation policy
 */
export const removeEmployeeFromPolicy = async (req, res) => {
    try {
        const { employeeId } = req.body;

        if (!employeeId) {
            return res.status(400).json({ success: false, message: "Employee ID is required." });
        }

        await User.findByIdAndUpdate(employeeId, {
            $set: {
                probationPolicy: null,
                probationPeriod: 0
            }
        });

        return res.status(200).json({
            success: true,
            message: "Employee removed from probation policy."
        });
    } catch (error) {
        console.error("Remove Employee From Policy Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * POST /api/probation/extend
 * Extends probation period for an employee by additionalDays
 */
export const extendEmployeeProbation = async (req, res) => {
    try {
        const { employeeId, additionalMonths, additionalDays, remarks } = req.body;

        if (!employeeId) {
            return res.status(400).json({ success: false, message: "Employee ID is required." });
        }

        const monthsToAdd = additionalMonths !== undefined && additionalMonths !== "" ? Number(additionalMonths) : 0;
        const daysToAdd = additionalDays !== undefined && additionalDays !== "" 
            ? Number(additionalDays) 
            : (monthsToAdd > 0 ? monthsToAdd * 30 : 0);

        if (!daysToAdd || daysToAdd <= 0) {
            return res.status(400).json({ success: false, message: "Please enter a valid duration to extend." });
        }

        const employee = await User.findById(employeeId);
        if (!employee) {
            return res.status(404).json({ success: false, message: "Employee not found." });
        }

        let currentDays = (employee.probationPeriod !== undefined && employee.probationPeriod !== null && Number(employee.probationPeriod) > 0)
            ? Number(employee.probationPeriod)
            : 0;

        if (!currentDays && employee.probationPolicy) {
            const policy = await ProbationPolicy.findById(employee.probationPolicy);
            if (policy) currentDays = Number(policy.days) || (Number(policy.months || 0) * 30) || 0;
        }

        const newDays = currentDays + daysToAdd;
        employee.probationPeriod = newDays;

        if (!employee.activities) employee.activities = [];
        const durationText = monthsToAdd > 0 ? `${monthsToAdd} month(s)` : `${daysToAdd} days`;
        employee.activities.push({
            title: "Probation Extended",
            description: `Probation extended by ${durationText} (New total: ${newDays} days). Reason: ${remarks || "No remarks"}`,
            timestamp: new Date(),
            type: "general"
        });

        await employee.save();

        return res.status(200).json({
            success: true,
            message: `Probation extended by ${durationText} successfully (New total: ${newDays} days).`,
            employee: {
                _id: employee._id,
                probationPeriod: newDays
            }
        });
    } catch (error) {
        console.error("Extend Employee Probation Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
