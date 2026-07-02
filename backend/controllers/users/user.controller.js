import User from "../../models/users/user.model.js";
import Leave from "../../models/leaves/leave.model.js";
import Attendance from "../../models/attendance/attendance.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { uploadToCloudinary, deleteFromCloudinary } from "../../services/cloudinary.service.js";

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
            emergencyContactName,
            emergencyContactNumber,
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

        // Create User
        const user = await User.create({
            employeeId,
            firstName,
            lastName: lastName || "",
            fullName: lastName ? `${firstName} ${lastName}` : firstName,
            email: email.toLowerCase(),
            password: hashedPassword,
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
            emergencyContactName,
            emergencyContactNumber,
        });

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
        }).select("+password");

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
            user,
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
        const user = await User.findById(userId).select("-password");
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }
        return res.status(200).json({
            success: true,
            user
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

        // Find active leaves overlapping with today
        const activeLeaves = await Leave.find({
            status: "approved",
            startDate: { $lte: today },
            endDate: { $gte: today }
        }).populate("employeeId", "fullName designation profilePicture department");

        // Find today's attendance with WFH status
        const wfhAttendance = await Attendance.find({
            date: today,
            workMode: { $regex: /work from home|home/i }
        }).populate("employeeId", "fullName designation profilePicture department");

        return res.status(200).json({
            success: true,
            leaves: activeLeaves.map(l => ({
                _id: l.employeeId?._id,
                fullName: l.employeeId?.fullName,
                designation: l.employeeId?.designation,
                profilePicture: l.employeeId?.profilePicture,
                department: l.employeeId?.department,
                leaveType: l.leaveType
            })).filter(l => l._id),
            wfh: wfhAttendance.map(a => ({
                _id: a.employeeId?._id,
                fullName: a.employeeId?.fullName,
                designation: a.employeeId?.designation,
                profilePicture: a.employeeId?.profilePicture,
                department: a.employeeId?.department,
                workMode: a.workMode
            })).filter(w => w._id)
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
                        designation: u.designation,
                        profilePicture: u.profilePicture,
                        joiningDate: u.joiningDate,
                        nextAnniversary: nextAnniv,
                        daysRemaining,
                        years
                    });
                }
            }

            // New Joinees (Next 30 Days or joined in last 30 days)
            if (u.joiningDate) {
                const join = new Date(u.joiningDate);
                const diffMs = join - today;
                const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                if (diffDays >= -30 && diffDays <= 30) {
                    newJoinees.push({
                        _id: u._id,
                        fullName: u.fullName,
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