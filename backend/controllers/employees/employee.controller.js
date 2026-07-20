import User from "../../models/users/user.model.js";
import bcrypt from "bcryptjs";
import Department from "../../models/departments/department.model.js";

/* ─────────────────────────────────────────────
   GET ALL EMPLOYEES (with summary stats)
 ───────────────────────────────────────────── */
export const getAllEmployees = async (req, res) => {
    try {
        const { search, department, designation, employementType, status, role } = req.query;

        // Build query
        const query = {};

        if (search) {
            const searchRegex = new RegExp(search, "i");
            query.$or = [
                { firstName: searchRegex },
                { lastName: searchRegex },
                { fullName: searchRegex },
                { email: searchRegex },
                { employeeId: searchRegex }
            ];
        }

        if (department) {
            query.department = department;
        }

        if (designation) {
            query.designation = designation;
        }

        if (employementType) {
            query.employementType = employementType;
        }

        if (status) {
            query.status = status;
        }

        if (role) {
            query.role = role;
        }

        // Fetch employees
        const employees = await User.find(query)
            .populate("managerId", "fullName employeeId designation department")
            .populate("dottedManagerId", "fullName employeeId designation department")
            .select("-password")
            .sort({ createdAt: -1 })
            .lean();

        // Compute stats from ALL active employees, not just the filtered ones, to keep stats cards accurate
        const allUsers = await User.find().lean();
        const total = allUsers.length;
        const active = allUsers.filter(e => e.status === "active").length;
        const inactive = allUsers.filter(e => e.status === "inactive" || e.status === "terminated").length;

        // New joiners in last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const newJoiners = allUsers.filter(e => e.joiningDate && new Date(e.joiningDate) >= thirtyDaysAgo).length;

        const fullTime = allUsers.filter(e => e.employementType === "full_time").length;
        const intern = allUsers.filter(e => e.employementType === "intern").length;

        return res.status(200).json({
            success: true,
            summary: {
                total,
                active,
                inactive,
                newJoiners,
                fullTime,
                intern
            },
            employees
        });
    } catch (error) {
        console.error("Get All Employees Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/* ─────────────────────────────────────────────
   GET SINGLE EMPLOYEE
 ───────────────────────────────────────────── */
export const getEmployeeById = async (req, res) => {
    try {
        const { id } = req.params;
        const employee = await User.findById(id)
            .populate("managerId", "fullName employeeId designation department email")
            .populate("dottedManagerId", "fullName employeeId designation department email")
            .select("-password")
            .lean();

        if (!employee) {
            return res.status(404).json({ success: false, message: "Employee not found." });
        }

        return res.status(200).json({ success: true, employee });
    } catch (error) {
        console.error("Get Employee By ID Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/* ─────────────────────────────────────────────
   CREATE EMPLOYEE
 ───────────────────────────────────────────── */
export const createEmployee = async (req, res) => {
    try {
        const {
            employeeId,
            firstName,
            lastName,
            email,
            phoneNumber,
            profilePicture,
            role,
            department,
            designation,
            managerId,
            dottedManagerId,
            employementType,
            workLocation,
            joiningDate,
            dateOfBirth,
            gender,
            bloodGroup,
            fatherName,
            emergencyContactNumber,
            presentAddress,
            permanentAddress,
            casualLeave,
            sickLeave,
            earnedLeave,
            password,
            status,
            permissions
        } = req.body;

        // Required fields (excluding lastName)
        if (!employeeId || !firstName || !email || !password || !role || !department || !designation || !employementType || !workLocation || !joiningDate) {
            return res.status(400).json({
                success: false,
                message: "Employee ID, First Name, Email, Password, Role, Department, Designation, Employment Type, Work Location, and Joining Date are required."
            });
        }

        // Email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ success: false, message: "Invalid email format." });
        }

        // Password length
        if (password.length < 8) {
            return res.status(400).json({ success: false, message: "Password must be at least 8 characters." });
        }

        // Duplicate check
        const existing = await User.findOne({ $or: [{ email: email.toLowerCase() }, { employeeId }] });
        if (existing) {
            return res.status(400).json({
                success: false,
                message: existing.email === email.toLowerCase() ? "Email already registered." : "Employee ID already exists."
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const isHrOrAdmin = role === "admin" || role === "hr";
        const defaultPermissions = {
            dashboard: true,
            me: true,
            myTeam: true,
            myFinances: true,
            documents: {
                companyDocuments: true,
                employeeDocuments: isHrOrAdmin
            },
            timeAndAttend: isHrOrAdmin,
            employees: isHrOrAdmin,
            payroll: isHrOrAdmin,
            recruitment: isHrOrAdmin,
            hire: isHrOrAdmin,
            offboardingAndOnboarding: isHrOrAdmin,
            organization: isHrOrAdmin
        };

        const resolvedPermissions = permissions 
            ? (typeof permissions === "string" ? JSON.parse(permissions) : permissions)
            : defaultPermissions;

        const employee = await User.create({
            employeeId,
            firstName,
            lastName: lastName || "",
            fullName: lastName ? `${firstName} ${lastName}` : firstName,
            email: email.toLowerCase(),
            password: hashedPassword,
            phoneNumber: phoneNumber || "",
            profilePicture: profilePicture || "",
            role,
            department,
            designation,
            managerId: managerId || null,
            dottedManagerId: dottedManagerId || null,
            employementType,
            workLocation,
            joiningDate,
            dateOfBirth: dateOfBirth || null,
            gender: gender || undefined,
            bloodGroup: bloodGroup || undefined,
            fatherName: fatherName || "",
            emergencyContactNumber: emergencyContactNumber || undefined,
            presentAddress: presentAddress || "",
            permanentAddress: permanentAddress || "",
            leaveBalance: {
                casual: { total: casualLeave !== undefined ? Number(casualLeave) : 8, used: 0, pending: 0 },
                sick: { total: sickLeave !== undefined ? Number(sickLeave) : 6, used: 0, pending: 0 },
                earned: { total: earnedLeave !== undefined ? Number(earnedLeave) : 20, used: 0, pending: 0 }
            },
            status: status || "active",
            permissions: resolvedPermissions
        });

        const populated = await User.findById(employee._id)
            .populate("managerId", "fullName employeeId")
            .populate("dottedManagerId", "fullName employeeId")
            .select("-password")
            .lean();

        return res.status(201).json({ success: true, message: "Employee created successfully.", employee: populated });
    } catch (error) {
        console.error("Create Employee Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/* ─────────────────────────────────────────────
   UPDATE EMPLOYEE
 ───────────────────────────────────────────── */
export const updateEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            employeeId,
            firstName,
            lastName,
            email,
            phoneNumber,
            profilePicture,
            role,
            department,
            designation,
            managerId,
            dottedManagerId,
            employementType,
            workLocation,
            joiningDate,
            dateOfBirth,
            gender,
            bloodGroup,
            fatherName,
            emergencyContactNumber,
            presentAddress,
            permanentAddress,
            casualLeave,
            sickLeave,
            earnedLeave,
            status,
            password,
            permissions
        } = req.body;

        const employee = await User.findById(id);
        if (!employee) {
            return res.status(404).json({ success: false, message: "Employee not found." });
        }

        // Check employeeId uniqueness if changed
        if (employeeId && employeeId.trim() !== employee.employeeId) {
            const employeeIdExists = await User.findOne({ employeeId: employeeId.trim(), _id: { $ne: id } });
            if (employeeIdExists) {
                return res.status(400).json({ success: false, message: "Employee ID already exists." });
            }
            employee.employeeId = employeeId.trim();
        }

        // Check email uniqueness if changed
        if (email && email.toLowerCase() !== employee.email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({ success: false, message: "Invalid email format." });
            }
            const emailExists = await User.findOne({ email: email.toLowerCase(), _id: { $ne: id } });
            if (emailExists) {
                return res.status(400).json({ success: false, message: "Email already in use." });
            }
            employee.email = email.toLowerCase();
        }

        if (firstName) employee.firstName = firstName;
        if (lastName !== undefined) employee.lastName = lastName || "";
        
        // Recompute fullName
        const currentFirst = firstName || employee.firstName;
        const currentLast = lastName !== undefined ? lastName : employee.lastName;
        employee.fullName = currentLast ? `${currentFirst} ${currentLast}` : currentFirst;

        if (phoneNumber !== undefined) employee.phoneNumber = phoneNumber;
        if (profilePicture !== undefined) employee.profilePicture = profilePicture;
        if (role) employee.role = role;
        if (department) employee.department = department;
        if (designation) employee.designation = designation;
        
        if (managerId !== undefined) employee.managerId = managerId || null;
        if (dottedManagerId !== undefined) employee.dottedManagerId = dottedManagerId || null;
        
        if (employementType) employee.employementType = employementType;
        if (workLocation) employee.workLocation = workLocation;
        if (joiningDate) employee.joiningDate = joiningDate;
        if (dateOfBirth !== undefined) employee.dateOfBirth = dateOfBirth || null;
        if (gender) employee.gender = gender;
        if (bloodGroup !== undefined) employee.bloodGroup = bloodGroup;
        if (fatherName !== undefined) employee.fatherName = fatherName;
        if (emergencyContactNumber !== undefined) employee.emergencyContactNumber = emergencyContactNumber;
        if (presentAddress !== undefined) employee.presentAddress = presentAddress;
        if (permanentAddress !== undefined) employee.permanentAddress = permanentAddress;
        if (status) employee.status = status;

        if (permissions !== undefined) {
            employee.permissions = typeof permissions === "string" ? JSON.parse(permissions) : permissions;
        }

        // Update leave balances if provided
        if (casualLeave !== undefined) employee.leaveBalance.casual.total = Number(casualLeave);
        if (sickLeave !== undefined) employee.leaveBalance.sick.total = Number(sickLeave);
        if (earnedLeave !== undefined) employee.leaveBalance.earned.total = Number(earnedLeave);

        // Update password if provided
        if (password && password.length >= 8) {
            employee.password = await bcrypt.hash(password, 10);
        }

        await employee.save();

        const updated = await User.findById(id)
            .populate("managerId", "fullName employeeId")
            .populate("dottedManagerId", "fullName employeeId")
            .select("-password")
            .lean();

        return res.status(200).json({ success: true, message: "Employee updated successfully.", employee: updated });
    } catch (error) {
        console.error("Update Employee Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/* ─────────────────────────────────────────────
   DEACTIVATE EMPLOYEE
 ───────────────────────────────────────────── */
export const deactivateEmployee = async (req, res) => {
    try {
        const { id } = req.params;
        const employee = await User.findById(id);
        if (!employee) {
            return res.status(404).json({ success: false, message: "Employee not found." });
        }

        employee.status = "inactive";
        await employee.save();

        return res.status(200).json({
            success: true,
            message: "Employee deactivated successfully.",
            employee: { _id: employee._id, status: employee.status }
        });
    } catch (error) {
        console.error("Deactivate Employee Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/* ─────────────────────────────────────────────
   CHECK EMPLOYEE ID UNIQUENESS
 ───────────────────────────────────────────── */
export const checkEmployeeId = async (req, res) => {
    try {
        const { employeeId } = req.query;
        if (!employeeId) {
            return res.status(400).json({ success: false, message: "Employee ID is required." });
        }
        const existing = await User.findOne({ employeeId });
        return res.status(200).json({ success: true, available: !existing });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/* ─────────────────────────────────────────────
   GET DEPARTMENTS
 ───────────────────────────────────────────── */
export const getDepartments = async (req, res) => {
    try {
        // Query distinct names from Department collection
        const customDepts = await Department.distinct("name");
        let uniqueDepts = customDepts;
        
        // If collection is empty, initialize with default departments
        if (uniqueDepts.length === 0) {
            const defaultDepts = ["Engineering", "HR", "Marketing", "Sales", "Finance", "Operations"];
            await Department.insertMany(defaultDepts.map(name => ({ name })));
            uniqueDepts = defaultDepts;
        }

        // Also merge any other unique departments currently assigned to Users just in case
        const userDepts = await User.distinct("department");
        uniqueDepts = Array.from(new Set([...uniqueDepts, ...userDepts].filter(Boolean))).sort();

        return res.status(200).json({
            success: true,
            departments: uniqueDepts
        });
    } catch (error) {
        console.error("Get Departments Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/* ─────────────────────────────────────────────
   CREATE DEPARTMENT
 ───────────────────────────────────────────── */
export const createDepartment = async (req, res) => {
    try {
        const { name } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ success: false, message: "Department name is required." });
        }

        const existing = await Department.findOne({ name: { $regex: new RegExp(`^${name.trim()}$`, "i") } });
        if (existing) {
            return res.status(400).json({ success: false, message: "Department already exists." });
        }

        const newDept = new Department({ name: name.trim() });
        await newDept.save();

        return res.status(201).json({
            success: true,
            message: "Department created successfully.",
            department: newDept
        });
    } catch (error) {
        console.error("Create Department Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/* ─────────────────────────────────────────────
   UPDATE DEPARTMENT
 ───────────────────────────────────────────── */
export const updateDepartment = async (req, res) => {
    try {
        const { oldName, newName } = req.body;
        if (!oldName || !newName || !newName.trim()) {
            return res.status(400).json({ success: false, message: "Old name and new name are required." });
        }

        const trimmedNewName = newName.trim();
        if (oldName.toLowerCase() === trimmedNewName.toLowerCase()) {
            return res.status(200).json({ success: true, message: "Department renamed successfully." });
        }

        // Check if new name already exists
        const exists = await Department.findOne({ name: { $regex: new RegExp(`^${trimmedNewName}$`, "i") } });
        if (exists) {
            return res.status(400).json({ success: false, message: "Department with new name already exists." });
        }

        // Update the department in the Department collection or create it if missing
        await Department.findOneAndUpdate(
            { name: oldName },
            { name: trimmedNewName },
            { new: true, upsert: true }
        );

        // Update all users belonging to this department
        await User.updateMany({ department: oldName }, { department: trimmedNewName });

        return res.status(200).json({
            success: true,
            message: "Department updated successfully."
        });
    } catch (error) {
        console.error("Update Department Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/* ─────────────────────────────────────────────
   DELETE DEPARTMENT
 ───────────────────────────────────────────── */
export const deleteDepartment = async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ success: false, message: "Department name is required." });
        }

        // Delete from collection
        await Department.deleteOne({ name });

        // Set department of all users in this department to ""
        await User.updateMany({ department: name }, { department: "" });

        return res.status(200).json({
            success: true,
            message: "Department deleted successfully."
        });
    } catch (error) {
        console.error("Delete Department Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/* ─────────────────────────────────────────────
   GET ALL MANAGERS / EMPLOYEES FOR SELECTION
 ───────────────────────────────────────────── */
export const getManagers = async (req, res) => {
    try {
        const managers = await User.find({ status: "active" })
            .select("fullName firstName lastName employeeId designation department")
            .sort({ fullName: 1 })
            .lean();

        return res.status(200).json({
            success: true,
            managers
        });
    } catch (error) {
        console.error("Get Managers Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
