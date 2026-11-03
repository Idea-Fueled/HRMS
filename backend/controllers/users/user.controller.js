import User from "../../models/users/user.model.js";
import Leave from "../../models/leaves/leave.model.js";
import Attendance from "../../models/attendance/attendance.model.js";
import Email from "../../models/emails/email.model.js";
import ActivityLog from "../../models/logs/activityLog.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { uploadToCloudinary, deleteFromCloudinary } from "../../services/cloudinary.service.js";
import { dispatchExternalEmail, sendPasswordResetEmail, sendAccountWelcomeEmail, sendAdminPasswordResetNotification } from "../../services/email.service.js";
import { emitToUser } from "../../socket/socket.js";

const resolveUserPermissions = (user) => {
    if (!user) return null;
    const userObj = typeof user.toObject === "function" ? user.toObject() : user;
    if (userObj.role === "admin") {
        userObj.role = "global_admin";
    }
    if (!userObj.permissions) {
        const isHrOrAdmin = userObj.role === "global_admin" || userObj.role === "admin" || userObj.role === "hr";
        userObj.permissions = {
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
            organization: isHrOrAdmin,
            probation: isHrOrAdmin
        };
    }
    return userObj;
};


export const registerUser = async (req, res) => {
    try {
        const {
            employeeId,
            firstName,
            lastName,
            email,
            password,
            phoneNumber,
            role,
            department,
            designation,
            managerId,
            employementType,
            workLocation,
            dateOfBirth,
            gender,
            bloodGroup,
            fatherName,
            emergencyContactNumber,
            presentAddress,
            permanentAddress,
        } = req.body;

        // Required Fields Validation
        if (
            !employeeId ||
            !firstName ||
            !email ||
            !password ||
            !department ||
            !designation
        ) {
            return res.status(400).json({
                success: false,
                message:
                    "Employee ID, First Name, Email, Password, Department and Designation are required.",
            });
        }

        // Email Validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: "Invalid email format.",
            });
        }

        // Password Validation
        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters long.",
            });
        }

        // Existing User Check
        const existingUser = await User.findOne({
            $or: [
                { email: email.toLowerCase() },
                { employeeId }
            ],
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message:
                    existingUser.email === email.toLowerCase()
                        ? "Email already registered."
                        : "Employee ID already exists.",
            });
        }

        // Hash Password
        const hashedPassword = await bcrypt.hash(password, 10);

        const isHrOrAdmin = role === "global_admin" || role === "hr";

        // Create User
        const user = await User.create({
            employeeId,
            firstName,
            lastName: lastName || "",
            fullName: lastName ? `${firstName} ${lastName}` : firstName,
            email: email.toLowerCase(),
            password: hashedPassword,
            phoneNumber,
            role: role === "admin" ? "global_admin" : (role || "employee"),
            department,
            designation,
            managerId,
            employementType,
            workLocation,
            dateOfBirth,
            gender,
            bloodGroup,
            fatherName: fatherName || "",
            emergencyContactNumber,
            presentAddress: presentAddress || "",
            permanentAddress: permanentAddress || "",
            permissions: {
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
            }
        });

        // Send Welcome & Password Setup Email
        try {
            const resetToken = crypto.randomBytes(32).toString("hex");
            const tokenExpiry = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

            await User.findByIdAndUpdate(user._id, {
                resetPasswordToken: resetToken,
                resetPasswordExpires: tokenExpiry
            });

            const frontendBase = process.env.FRONTEND_URL || "https://hrms-lyart-three-62.vercel.app";
            const resetUrl = `${frontendBase.replace(/\/+$/, "")}/reset-password?token=${resetToken}&email=${encodeURIComponent(user.email)}`;

            sendAccountWelcomeEmail({
                to: user.email,
                name: user.fullName || user.firstName,
                employeeId: user.employeeId,
                email: user.email,
                role: user.role,
                department: user.department,
                resetUrl
            }).catch(err => console.warn("Welcome email async dispatch failed:", err.message));
        } catch (mailErr) {
            console.warn("Failed to generate welcome email token:", mailErr.message);
        }

        return res.status(201).json({
            success: true,
            message: "User registered successfully.",
            user,
        });
    } catch (error) {
        console.error("Register User Error:", error);

        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and Password are required.",
            });
        }

        // Find User
        const user = await User.findOne({
            email: email.toLowerCase(),
        }).select("+password")
          .populate("managerId", "fullName firstName lastName email designation department profilePicture employeeId")
          .populate("dottedManagerId", "fullName firstName lastName email designation department profilePicture employeeId");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found.",
            });
        }

        // Compare Password
        const isPasswordCorrect = await bcrypt.compare(
            password,
            user.password
        );

        if (!isPasswordCorrect) {
            return res.status(401).json({
                success: false,
                message: "Invalid credentials.",
            });
        }

        // Auto-upgrade legacy 'admin' role to 'global_admin'
        if (user.role === "admin") {
            user.role = "global_admin";
        }

        // Generate JWT
        const token = jwt.sign(
            {
                id: user._id,
                userId: user._id,
                role: user.role,
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "7d",
            }
        );

        // Update Last Login
        user.lastLogin = new Date();
        await user.save();

        // Record Login Activity in System Logs with Client IP
        const clientIp = (req.headers["x-forwarded-for"] || "")
            .split(",")[0]
            .trim() || req.socket?.remoteAddress || req.ip || "";
        const userAgent = req.headers["user-agent"] || "";

        try {
            await ActivityLog.create({
                user: user._id,
                employeeId: user.employeeId || "N/A",
                userName: user.fullName || `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email,
                userEmail: user.email,
                userRole: user.role,
                userDepartment: user.department || "General",
                actionType: "CUSTOM_ACTION",
                page: "/login",
                pageTitle: "User Authentication",
                action: `User logged in successfully (IP: ${clientIp || "N/A"})`,
                details: {
                    loginTime: new Date(),
                    ipAddress: clientIp,
                    userAgent: userAgent
                },
                ipAddress: clientIp,
                userAgent: userAgent,
                timestamp: new Date()
            });
        } catch (logErr) {
            console.warn("Failed to record login activity log:", logErr.message);
        }

        // Remove Password
        user.password = undefined;

        // Set Cookie — sameSite "none" required for cross-domain (Vercel ↔ Render)
        const isProduction = process.env.NODE_ENV === "production";
        res.cookie("token", token, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "none" : "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        return res.status(200).json({
            success: true,
            message: "Login successful.",
            token,
            user: resolveUserPermissions(user),
        });
    } catch (error) {
        console.error("Login User Error:", error);

        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

export const getUpcomingBirthdays = async (req, res) => {
    try {
        const today = new Date();

        const users = await User.find({
            dateOfBirth: { $exists: true, $ne: null },
            status: "active",
        }).select(
            "fullName firstName lastName designation profilePicture dateOfBirth"
        );

        const upcomingBirthdays = users
            .map((user) => {
                const dob = new Date(user.dateOfBirth);

                const nextBirthday = new Date(
                    today.getFullYear(),
                    dob.getMonth(),
                    dob.getDate()
                );

                if (nextBirthday < today) {
                    nextBirthday.setFullYear(today.getFullYear() + 1);
                }

                const daysRemaining = Math.ceil(
                    (nextBirthday - today) / (1000 * 60 * 60 * 24)
                );

                return {
                    _id: user._id,
                    fullName: user.fullName,
                    designation: user.designation,
                    profilePicture: user.profilePicture,
                    dateOfBirth: user.dateOfBirth,
                    nextBirthday,
                    daysRemaining,
                };
            })
            .sort((a, b) => a.daysRemaining - b.daysRemaining)
            .slice(0, 5);

        return res.status(200).json({
            success: true,
            birthdays: upcomingBirthdays,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

export const getCurrentUser = async (req, res, next) => {
    try {
        const userId = req.user.userId || req.user.id;
        const user = await User.findById(userId)
            .select("-password")
            .populate("managerId", "fullName firstName lastName email designation department profilePicture employeeId")
            .populate("dottedManagerId", "fullName firstName lastName email designation department profilePicture employeeId");
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }
        return res.status(200).json({
            success: true,
            user: resolveUserPermissions(user)
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const logoutUser = async (req, res) => {
    const isProduction = process.env.NODE_ENV === "production";
    res.cookie("token", "", {
        expires: new Date(0),
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax",
    });

    return res.status(200).json({
        success: true,
        message: "Logged out successfully",
    });
};

export const getAwayToday = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const currentUserId = req.user?.id || req.user?.userId;
        const currentUser = await User.findById(currentUserId);

        const isHrOrAdmin = currentUser?.role === "global_admin" || currentUser?.role === "hr";
        const isManager = currentUser?.role === "manager";
        const userDept = currentUser?.department;

        // Find active leaves overlapping with today
        const activeLeaves = await Leave.find({
            status: "approved",
            startDate: { $lte: today },
            endDate: { $gte: today }
        }).populate("employeeId", "fullName designation profilePicture department role reportingManager");

        // Find today's attendance with WFH status
        const wfhAttendance = await Attendance.find({
            date: today,
            workMode: { $regex: /work from home|home/i }
        }).populate("employeeId", "fullName designation profilePicture department role reportingManager");

        const mapLeaveUser = (l) => {
            const emp = l.employeeId;
            if (!emp) return null;
            return {
                _id: emp._id,
                fullName: emp.fullName,
                designation: emp.designation,
                profilePicture: emp.profilePicture,
                department: emp.department,
                role: emp.role,
                reportingManager: emp.reportingManager,
                leaveType: l.leaveType
            };
        };

        const mapWfhUser = (a) => {
            const emp = a.employeeId;
            if (!emp) return null;
            return {
                _id: emp._id,
                fullName: emp.fullName,
                designation: emp.designation,
                profilePicture: emp.profilePicture,
                department: emp.department,
                role: emp.role,
                reportingManager: emp.reportingManager,
                workMode: a.workMode
            };
        };

        let leavesList = activeLeaves.map(mapLeaveUser).filter(Boolean);
        let wfhList = wfhAttendance.map(mapWfhUser).filter(Boolean);

        if (!isHrOrAdmin) {
            if (isManager) {
                // Manager sees their team/department members
                leavesList = leavesList.filter(item => 
                    item.department === userDept || item.reportingManager?.toString() === currentUserId?.toString()
                );
                wfhList = wfhList.filter(item => 
                    item.department === userDept || item.reportingManager?.toString() === currentUserId?.toString()
                );
            } else {
                // Regular Employee sees team/department peers ONLY (excluding managers, leads, HR, and Admin)
                const isManagerOrAdminUser = (item) => {
                    const r = (item.role || "").toLowerCase();
                    const d = (item.designation || "").toLowerCase();
                    return r === "global_admin" || r === "hr" || r === "manager" ||
                           d.includes("manager") || d.includes("director") || d.includes("head") || d.includes("lead");
                };

                leavesList = leavesList.filter(item => 
                    (item.department === userDept || !userDept) && !isManagerOrAdminUser(item)
                );
                wfhList = wfhList.filter(item => 
                    (item.department === userDept || !userDept) && !isManagerOrAdminUser(item)
                );
            }
        }

        return res.status(200).json({
            success: true,
            leaves: leavesList,
            wfh: wfhList
        });
    } catch (error) {
        console.error("Get Away Today Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const getPeopleEvents = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const users = await User.find({ status: "active" });

        const birthdays = [];
        const anniversaries = [];
        const newJoinees = [];

        users.forEach(u => {
            // Birthdays (Next 30 Days)
            if (u.dateOfBirth) {
                const dob = new Date(u.dateOfBirth);
                const nextBday = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
                if (nextBday < today) {
                    nextBday.setFullYear(today.getFullYear() + 1);
                }
                const daysRemaining = Math.ceil((nextBday - today) / (1000 * 60 * 60 * 24));
                if (daysRemaining >= 0 && daysRemaining <= 30) {
                    birthdays.push({
                        _id: u._id,
                        fullName: u.fullName,
                        email: u.email,
                        designation: u.designation,
                        profilePicture: u.profilePicture,
                        dateOfBirth: u.dateOfBirth,
                        nextBirthday: nextBday,
                        daysRemaining
                    });
                }
            }

            // Work Anniversaries (Next 30 Days)
            if (u.joiningDate) {
                const join = new Date(u.joiningDate);
                const nextAnniv = new Date(today.getFullYear(), join.getMonth(), join.getDate());
                if (nextAnniv < today) {
                    nextAnniv.setFullYear(today.getFullYear() + 1);
                }
                const daysRemaining = Math.ceil((nextAnniv - today) / (1000 * 60 * 60 * 24));
                const years = nextAnniv.getFullYear() - join.getFullYear();
                if (daysRemaining >= 0 && daysRemaining <= 30 && years > 0) {
                    anniversaries.push({
                        _id: u._id,
                        fullName: u.fullName,
                        email: u.email,
                        designation: u.designation,
                        profilePicture: u.profilePicture,
                        joiningDate: u.joiningDate,
                        nextAnniversary: nextAnniv,
                        daysRemaining,
                        years
                    });
                }
            }

            // New Joinees (Joined in last 2 days or joining in next 2 days)
            if (u.joiningDate) {
                const join = new Date(u.joiningDate);
                const diffMs = join - today;
                const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                if (diffDays >= -2 && diffDays <= 2) {
                    newJoinees.push({
                        _id: u._id,
                        fullName: u.fullName,
                        email: u.email,
                        designation: u.designation,
                        profilePicture: u.profilePicture,
                        joiningDate: u.joiningDate,
                        daysRemaining: diffDays
                    });
                }
            }
        });

        // Sort
        birthdays.sort((a, b) => a.daysRemaining - b.daysRemaining);
        anniversaries.sort((a, b) => a.daysRemaining - b.daysRemaining);
        newJoinees.sort((a, b) => Math.abs(a.daysRemaining) - Math.abs(b.daysRemaining));

        return res.status(200).json({
            success: true,
            birthdays,
            anniversaries,
            newJoinees
        });
    } catch (error) {
        console.error("Get People Events Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/* ─────────────────────────────────────────────
   UPLOAD PROFILE PICTURE TO CLOUDINARY
 ───────────────────────────────────────────── */
export const uploadProfilePicture = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "Please upload an image file." });
        }
        
        // Upload buffer to Cloudinary
        const result = await uploadToCloudinary(req.file.buffer);
        
        return res.status(200).json({
            success: true,
            message: "Image uploaded to Cloudinary successfully.",
            url: result.secure_url
        });
    } catch (error) {
        console.error("Upload profile picture controller error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/* ─────────────────────────────────────────────
   UPDATE PROFILE PICTURE IN DATABASE
 ───────────────────────────────────────────── */
export const updateProfilePicture = async (req, res) => {
    try {
        const userId = req.user?.id || req.user?.userId;
        const { profilePicture } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        // Delete old picture if exists
        if (user.profilePicture && user.profilePicture !== profilePicture) {
            await deleteFromCloudinary(user.profilePicture);
        }

        user.profilePicture = profilePicture || "";
        await user.save();

        // Return updated user (excluding password)
        const updatedUser = await User.findById(userId).select("-password").lean();

        return res.status(200).json({
            success: true,
            message: profilePicture ? "Profile picture updated successfully." : "Profile picture deleted successfully.",
            user: updatedUser
        });
    } catch (error) {
        console.error("Update profile picture controller error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/* ─────────────────────────────────────────────
   GET USER FINANCES
 ───────────────────────────────────────────── */
export const getUserFinances = async (req, res) => {
    try {
        const userId = req.user?.id || req.user?.userId;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        // Determine Gross Salary based on designation
        const designation = user.designation || "Associate";
        let grossSalary = 65000; // Default
        if (designation.includes("Senior")) grossSalary = 120000;
        else if (designation.includes("Lead") || designation.includes("Director")) grossSalary = 180000;
        else if (designation.includes("Engineer")) grossSalary = 85000;
        else if (designation.includes("Manager")) grossSalary = 110000;
        else if (designation.includes("Designer")) grossSalary = 75000;

        // Breakdown calculations
        const basic = Math.round(grossSalary * 0.50);
        const hra = Math.round(grossSalary * 0.20);
        const specialAllowance = Math.round(grossSalary * 0.20);
        const otherAllowances = Math.round(grossSalary * 0.10);
        const pfDeduction = Math.round(basic * 0.12);
        const taxDeduction = Math.round(grossSalary * 0.10);
        const netSalary = grossSalary - pfDeduction - taxDeduction;

        // Payment Info (ensure defaults if not set in User doc)
        const paymentInfo = {
            paymentMode: "Bank Transfer",
            bankName: user.bankName || "HDFC Bank Ltd",
            accountNumber: user.accountNumber || "50100432890123",
            ifscCode: user.ifscCode || "HDFC0000124",
            accountHolderName: user.accountHolderName || user.fullName || `${user.firstName} ${user.lastName}`,
            branch: "Koramangala, Bangalore",
        };

        // Identity Info
        const identityInfo = {
            panNumber: user.panNumber || "ABCDE1234F",
            aadhaarNumber: user.aadhaarNumber || "3829 4810 5928",
            addressProof: "Aadhaar Card",
            verificationStatus: "Verified",
            documentUrl: "#",
        };

        // Summary details
        const summary = {
            currentSalary: grossSalary,
            lastProcessedPayroll: netSalary,
            workingDays: 22,
        };

        // Generate past 6 months of payslips
        const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const payslips = [];
        const currentDate = new Date();
        for (let i = 1; i <= 6; i++) {
            const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
            const monthName = months[d.getMonth()];
            const yearVal = d.getFullYear();
            payslips.push({
                month: `${monthName} ${yearVal}`,
                grossSalary,
                deductions: pfDeduction + taxDeduction,
                netSalary,
                status: "Paid",
                payslipUrl: `/api/users/me/finances/payslip/${monthName.toLowerCase()}-${yearVal}`
            });
        }

        return res.status(200).json({
            success: true,
            summary,
            paymentInfo,
            identityInfo,
            salaryBreakdown: {
                basic,
                hra,
                specialAllowance,
                otherAllowances,
                pfDeduction,
                taxDeduction,
                netSalary,
                grossSalary
            },
            payslips
        });
    } catch (error) {
        console.error("Get user finances controller error:", error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

/* ─────────────────────────────────────────────
   UPLOAD DOCUMENT (PDF OR IMAGE) TO CLOUDINARY
 ───────────────────────────────────────────── */
export const uploadDocument = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "Please upload a file." });
        }
        
        // Upload buffer to Cloudinary with resourceType = "auto" to handle PDFs and images
        const result = await uploadToCloudinary(req.file.buffer, "employee_documents", "auto");
        
        return res.status(200).json({
            success: true,
            message: "File uploaded successfully.",
            url: result.secure_url
        });
    } catch (error) {
        console.error("Upload document controller error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/* ─────────────────────────────────────────────
   CHANGE PASSWORD (ACCOUNT SETTINGS)
 ───────────────────────────────────────────── */
export const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;
        const userId = req.user?.userId || req.user?.id || req.user?._id;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: "Please provide both current and new password." });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ success: false, message: "New password must be at least 8 characters long." });
        }

        if (confirmPassword && newPassword !== confirmPassword) {
            return res.status(400).json({ success: false, message: "New passwords do not match." });
        }

        const user = await User.findById(userId).select("+password");
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: "Current password is incorrect." });
        }

        const isSame = await bcrypt.compare(newPassword, user.password);
        if (isSame) {
            return res.status(400).json({ success: false, message: "New password cannot be the same as your current password." });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();

        return res.status(200).json({
            success: true,
            message: "Password changed successfully."
        });
    } catch (error) {
        console.error("Change password error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/* ─────────────────────────────────────────────
   UPDATE USER PREFERENCES (ACCOUNT SETTINGS)
 ───────────────────────────────────────────── */
export const updateUserPreferences = async (req, res) => {
    try {
        const { preferences } = req.body;
        const userId = req.user?.userId || req.user?.id || req.user?._id;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        user.preferences = {
            ...(user.preferences?.toObject ? user.preferences.toObject() : (user.preferences || {})),
            ...preferences
        };

        await user.save();

        return res.status(200).json({
            success: true,
            message: "Preferences updated successfully.",
            preferences: user.preferences
        });
    } catch (error) {
        console.error("Update preferences error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/* ─────────────────────────────────────────────
   SEND CELEBRATION WISH (BIRTHDAY, ANNIVERSARY, NEW JOINEE)
 ───────────────────────────────────────────── */
export const sendCelebrationWish = async (req, res) => {
    try {
        const senderId = req.user?.userId || req.user?.id || req.user?._id;
        const { recipientId, eventType, message, meta } = req.body;

        if (!recipientId) {
            return res.status(400).json({ success: false, message: "Recipient ID is required." });
        }

        const sender = await User.findById(senderId);
        if (!sender) {
            return res.status(404).json({ success: false, message: "Sender not found." });
        }

        const recipient = await User.findById(recipientId);
        if (!recipient) {
            return res.status(404).json({ success: false, message: "Recipient not found." });
        }

        if (!recipient.email) {
            return res.status(400).json({ success: false, message: "Recipient does not have a registered email address." });
        }

        const senderName = sender.fullName || [sender.firstName, sender.lastName].filter(Boolean).join(" ") || "A Colleague";
        const recipientName = recipient.fullName || [recipient.firstName, recipient.lastName].filter(Boolean).join(" ") || "Colleague";
        const senderRoleOrDesig = sender.designation || sender.department || "Idea Fueled Team";

        let defaultMessage = "";
        let eventSubject = "";
        let eventTitle = "";
        let eventIcon = "";
        let eventBadge = "";
        let eventLabel = "";

        if (eventType === "birthday") {
            eventIcon = "🎂";
            eventLabel = "Birthday";
            eventBadge = "Birthday Celebration";
            eventSubject = `🎉 Happy Birthday from ${senderName}!`;
            eventTitle = `Happy Birthday, ${recipientName}! 🎂`;
            defaultMessage = `Wishing you a very Happy Birthday! May your special day and the year ahead be packed with good health, happiness, and tremendous success! 🎂🎉`;
        } else if (eventType === "anniversary") {
            eventIcon = "🏆";
            eventLabel = "Work Anniversary";
            const yearsStr = meta?.years ? `${meta.years} Year${meta.years > 1 ? "s" : ""}` : "Work Anniversary";
            eventBadge = `Work Anniversary Milestone (${yearsStr})`;
            eventSubject = `🏆 Happy Work Anniversary from ${senderName}!`;
            eventTitle = `Congratulations on your Work Anniversary, ${recipientName}! 🏆`;
            defaultMessage = `Congratulations on completing ${meta?.years ? `${meta.years} year${meta.years > 1 ? "s" : ""}` : "another great milestone"} at Idea Fueled! Thank you for your continued dedication, energy, and commitment to excellence. Cheers to many more milestones together! 🏆🎉`;
        } else if (eventType === "new_joinee") {
            eventIcon = "🌟";
            eventLabel = "New Joinee Welcome";
            eventBadge = "Warm Welcome to the Team";
            eventSubject = `🌟 Welcome to Idea Fueled from ${senderName}!`;
            eventTitle = `Welcome to the Team, ${recipientName}! 🌟`;
            defaultMessage = `A very warm welcome to Idea Fueled! We are thrilled to have you join our team and can't wait to collaborate and celebrate big milestones together! 🚀🌟`;
        } else {
            eventIcon = "🎉";
            eventLabel = "Celebration";
            eventBadge = "Team Celebration";
            eventSubject = `🎉 Best Wishes from ${senderName}!`;
            eventTitle = `Warm Wishes from ${senderName}! 🎉`;
            defaultMessage = `Sending you the best wishes on this special occasion! 🌟🎉`;
        }

        const finalMessage = message && message.trim().length > 0 ? message.trim() : defaultMessage;
        const portalUrl = process.env.FRONTEND_URL || "http://localhost:5173";

        // HTML Email Template
        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${eventSubject}</title>
</head>
<body style="margin: 0; padding: 24px 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 18px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
    <!-- Header -->
    <tr>
      <td style="background: linear-gradient(135deg, #2D79C7 0%, #1F5EA8 100%); padding: 36px 30px; text-align: center; color: #ffffff;">
        <div style="font-size: 46px; line-height: 1; margin-bottom: 12px;">${eventIcon}</div>
        <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.2); border: 1px solid rgba(255, 255, 255, 0.35); padding: 4px 14px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #ffffff; margin-bottom: 10px;">
          ${eventBadge}
        </div>
        <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
          ${eventTitle}
        </h1>
      </td>
    </tr>
    <!-- Content -->
    <tr>
      <td style="padding: 36px 32px 28px;">
        <p style="margin: 0 0 16px; font-size: 16px; font-weight: 700; color: #0f172a;">
          Hi ${recipientName},
        </p>
        <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #475569;">
          Your colleague <strong>${senderName}</strong> (<span style="color: #2D79C7;">${senderRoleOrDesig}</span>) has sent you a special celebration wish:
        </p>
        
        <!-- Wish Box -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background: #f8fafc; border-left: 4px solid #2D79C7; border-radius: 0 12px 12px 0; margin: 0 0 28px;">
          <tr>
            <td style="padding: 20px 22px;">
              <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #1e3a8a; font-style: italic;">
                "${finalMessage}"
              </p>
              <p style="margin: 12px 0 0; font-size: 12px; font-weight: 700; color: #64748b; font-style: normal;">
                &mdash; ${senderName}
              </p>
            </td>
          </tr>
        </table>

        <!-- Portal Link -->
        <div style="text-align: center; margin: 32px 0 10px;">
          <a href="${portalUrl}/dashboard" style="display: inline-block; background-color: #2D79C7; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 12px; font-size: 13px; font-weight: 700; box-shadow: 0 2px 8px rgba(45,121,199,0.3);">
            Open HRMS Portal &rarr;
          </a>
        </div>
      </td>
    </tr>
    <!-- Footer -->
    <tr>
      <td style="background-color: #f8fafc; padding: 22px 30px; text-align: center; border-top: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8; line-height: 1.5;">
        <strong style="color: #64748b;">Idea Fueled HRMS</strong> &bull; People & Culture Experience<br>
        Celebrating team milestones together.
      </td>
    </tr>
  </table>
</body>
</html>
        `;

        // 1. Create Internal Email Document
        let emailDoc = null;
        try {
            emailDoc = await Email.create({
                sender: sender._id,
                senderEmail: sender.email.toLowerCase(),
                senderName,
                senderAvatar: sender.profilePicture || "",
                senderRole: sender.role || "employee",
                to: [recipient.email.toLowerCase()],
                subject: eventSubject,
                body: emailHtml,
                snippet: finalMessage.slice(0, 120),
                priority: "normal",
                labels: ["Celebration", eventLabel],
                userStates: [
                    {
                        user: sender._id,
                        email: sender.email.toLowerCase(),
                        folder: "sent",
                        isRead: true,
                    },
                    {
                        user: recipient._id,
                        email: recipient.email.toLowerCase(),
                        folder: "inbox",
                        isRead: false,
                    }
                ]
            });
        } catch (emailDocErr) {
            console.error("Error creating internal celebration email document:", emailDocErr);
        }

        // 2. Dispatch External SMTP Email
        let deliveryResult = null;
        try {
            deliveryResult = await dispatchExternalEmail({
                to: recipient.email,
                subject: eventSubject,
                body: emailHtml
            });
        } catch (mailErr) {
            console.warn("External wish email dispatch warning:", mailErr.message);
        }

        // 3. Emit Real-time Socket Notification
        if (emailDoc) {
            try {
                emitToUser({ userId: recipient._id, email: recipient.email }, "new_email", {
                    email: emailDoc,
                    unreadCount: 1
                });
            } catch (sockErr) {
                console.warn("Socket notification warning:", sockErr.message);
            }
        }

        return res.status(200).json({
            success: true,
            message: `Wish sent to ${recipientName} successfully! 🎉`,
            wish: {
                recipientId: recipient._id,
                recipientName,
                recipientEmail: recipient.email,
                eventType,
                message: finalMessage,
                deliveredExternally: deliveryResult?.delivered || false
            }
        });
    } catch (error) {
        console.error("Send celebration wish error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Initiates Forgot Password flow by generating a token and sending a reset email
 */
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: "Please enter your email address." });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "No user account was found with that email address."
            });
        }

        // Generate 32-byte hex token (64 characters)
        const resetToken = crypto.randomBytes(32).toString("hex");
        const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        user.resetPasswordToken = resetToken;
        user.resetPasswordExpires = tokenExpiry;
        await user.save();

        const frontendBase = process.env.FRONTEND_URL || "https://hrms-lyart-three-62.vercel.app";
        const resetUrl = `${frontendBase.replace(/\/+$/, "")}/reset-password?token=${resetToken}&email=${encodeURIComponent(user.email)}`;

        const mailResult = await sendPasswordResetEmail({
            to: user.email,
            name: user.fullName || user.firstName,
            resetUrl
        });

        if (!mailResult.delivered) {
            console.warn("Forgot password email delivery warning:", mailResult.error || mailResult.reason);
        }

        return res.status(200).json({
            success: true,
            message: `Password reset link sent to ${user.email}. Please check your inbox.`,
            delivered: mailResult.delivered
        });
    } catch (error) {
        console.error("Forgot Password Error:", error);
        return res.status(500).json({ success: false, message: error.message || "Failed to process forgot password request." });
    }
};

/**
 * Validates a reset token and email before showing the reset form
 */
export const verifyResetToken = async (req, res) => {
    try {
        const { token, email } = req.query;
        if (!token || !email) {
            return res.status(400).json({ success: false, message: "Missing reset token or email address." });
        }

        const user = await User.findOne({
            email: email.toLowerCase().trim(),
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: new Date() }
        }).select("+resetPasswordToken +resetPasswordExpires");

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "This password reset link is invalid or has expired. Please request a new one."
            });
        }

        return res.status(200).json({
            success: true,
            message: "Token is valid.",
            user: {
                email: user.email,
                name: user.fullName || user.firstName
            }
        });
    } catch (error) {
        console.error("Verify Reset Token Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Resets user password using the token
 */
export const resetPassword = async (req, res) => {
    try {
        const { token, email, password } = req.body;
        if (!token || !email || !password) {
            return res.status(400).json({ success: false, message: "Token, email, and new password are required." });
        }

        if (password.length < 8) {
            return res.status(400).json({ success: false, message: "Password must be at least 8 characters long." });
        }

        const user = await User.findOne({
            email: email.toLowerCase().trim(),
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: new Date() }
        }).select("+password +resetPasswordToken +resetPasswordExpires");

        if (!user) {
            return res.status(400).json({
                success: false,
                message: "This reset link is invalid or has expired. Please request a new link."
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        user.password = hashedPassword;
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;
        await user.save();

        const clientIp = (req.headers["x-forwarded-for"] || "")
            .split(",")[0]
            .trim() || req.socket?.remoteAddress || req.ip || "";
        const userAgent = req.headers["user-agent"] || "";

        // 1. Record activity in system logs
        try {
            await ActivityLog.create({
                user: user._id,
                employeeId: user.employeeId || "N/A",
                userName: user.fullName || `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email,
                userEmail: user.email,
                userRole: user.role,
                userDepartment: user.department || "General",
                actionType: "CUSTOM_ACTION",
                page: "/reset-password",
                pageTitle: "Password Reset",
                action: `User successfully reset account password (IP: ${clientIp || "N/A"})`,
                details: {
                    ipAddress: clientIp,
                    userAgent: userAgent,
                    resetAt: new Date()
                },
                ipAddress: clientIp,
                userAgent: userAgent,
                timestamp: new Date()
            });
        } catch (logErr) {
            console.warn("ActivityLog creation failed on resetPassword:", logErr.message);
        }

        // 2. Notify all global admins via email
        try {
            const globalAdmins = await User.find({
                role: { $in: ["global_admin", "admin"] }
            }).select("email");
            const adminEmails = globalAdmins.map(a => a.email).filter(Boolean);

            if (adminEmails.length > 0) {
                sendAdminPasswordResetNotification({
                    adminEmails,
                    user,
                    clientIp,
                    userAgent,
                    resetTime: new Date()
                }).catch(err => console.warn("Admin reset notification email failed:", err.message));
            }
        } catch (adminErr) {
            console.warn("Failed to notify admins of password reset:", adminErr.message);
        }

        return res.status(200).json({
            success: true,
            message: "Password has been successfully updated! You can now log in."
        });
    } catch (error) {
        console.error("Reset Password Error:", error);
        return res.status(500).json({ success: false, message: error.message || "Failed to reset password." });
    }
};