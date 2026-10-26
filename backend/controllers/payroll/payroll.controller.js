import Payslip from "../../models/payroll/payslip.model.js";
import User from "../../models/users/user.model.js";
import Email from "../../models/emails/email.model.js";
import { emitToUser } from "../../socket/socket.js";

// Helper function to convert numeric salary to Indian Rupee Words
const numberToWordsINR = (num) => {
    if (!num || isNaN(num) || num === 0) return "Rupees Zero Only";
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const inWords = (n) => {
        let strVal = Math.floor(n).toString();
        if (strVal.length > 9) return strVal;
        let n_array = ('000000000' + strVal).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
        if (!n_array) return '';
        let str = '';
        str += (Number(n_array[1]) !== 0) ? (a[Number(n_array[1])] || (b[n_array[1][0]] + ' ' + a[n_array[1][1]])) + 'Crore ' : '';
        str += (Number(n_array[2]) !== 0) ? (a[Number(n_array[2])] || (b[n_array[2][0]] + ' ' + a[n_array[2][1]])) + 'Lakh ' : '';
        str += (Number(n_array[3]) !== 0) ? (a[Number(n_array[3])] || (b[n_array[3][0]] + ' ' + a[n_array[3][1]])) + 'Thousand ' : '';
        str += (Number(n_array[4]) !== 0) ? (a[Number(n_array[4])] || (b[n_array[4][0]] + ' ' + a[n_array[4][1]])) + 'Hundred ' : '';
        str += (Number(n_array[5]) !== 0) ? ((str !== '') ? 'and ' : '') + (a[Number(n_array[5])] || (b[n_array[5][0]] + ' ' + a[n_array[5][1]])) : '';
        return str.trim();
    };

    const words = inWords(num);
    return `Rupees ${words} Only`;
};

/* ─────────────────────────────────────────────
   CREATE / GENERATE PAYSLIP (Global Admin / HR)
───────────────────────────────────────────── */
export const createPayslip = async (req, res) => {
    try {
        const adminId = req.user?.id || req.user?.userId;
        const {
            employeeId,
            month,
            year,
            actualPayableDays,
            totalWorkingDays,
            lossOfPayDays,
            daysPayable,
            basic,
            hra,
            medicalAllowance,
            conveyanceAllowance,
            specialAllowance,
            otherAllowances
        } = req.body;

        if (!employeeId || !month || !year) {
            return res.status(400).json({ success: false, message: "Employee ID, month, and year are required." });
        }

        const employee = await User.findById(employeeId);
        if (!employee) {
            return res.status(404).json({ success: false, message: "Employee not found." });
        }

        const monthClean = month.trim().toUpperCase().substring(0, 3);
        const periodString = `${monthClean} ${year}`;

        // Compute Gross Earnings & Net Payable
        const numBasic = Number(basic) || 0;
        const numHra = Number(hra) || 0;
        const numMedical = Number(medicalAllowance) || 0;
        const numConveyance = Number(conveyanceAllowance) || 0;
        const numSpecial = Number(specialAllowance) || 0;
        const numOther = Number(otherAllowances) || 0;
        const grossEarnings = numBasic + numHra + numMedical + numConveyance + numSpecial + numOther;

        // Attendance & LOP Deduction Calculation
        const numTotalDays = Number(totalWorkingDays) || 30;
        const numLopDays = parseFloat(lossOfPayDays) || 0;
        const numDaysPayable = Math.max(0, numTotalDays - numLopDays);
        const perDaySalary = numTotalDays > 0 ? (grossEarnings / numTotalDays) : 0;
        const lopDeduction = Math.round(perDaySalary * numLopDays);
        const netSalaryPayable = Math.max(0, Math.round(grossEarnings - lopDeduction));
        const netSalaryInWords = numberToWordsINR(netSalaryPayable);

        // Deduct LOP proportionately from each earnings component according to their set breakdown
        let earnedBasic = numBasic;
        let earnedHra = numHra;
        let earnedMedical = numMedical;
        let earnedConveyance = numConveyance;
        let earnedSpecial = numSpecial;
        let earnedOther = numOther;

        if (numLopDays > 0 && numTotalDays > 0 && grossEarnings > 0) {
            const ratio = numDaysPayable / numTotalDays;
            earnedBasic = Math.round(numBasic * ratio);
            earnedHra = Math.round(numHra * ratio);
            earnedMedical = Math.round(numMedical * ratio);
            earnedConveyance = Math.round(numConveyance * ratio);
            earnedSpecial = Math.round(numSpecial * ratio);
            earnedOther = Math.round(numOther * ratio);

            const earnedSum = earnedBasic + earnedHra + earnedMedical + earnedConveyance + earnedSpecial + earnedOther;
            const diff = netSalaryPayable - earnedSum;
            if (diff !== 0) {
                earnedSpecial += diff;
            }
        }

        // Employee Snapshot
        const empName = employee.fullName || `${employee.firstName} ${employee.lastName}`.trim();
        const empNumber = employee.employeeId || `EMP-${employee._id.toString().substring(0, 4).toUpperCase()}`;
        const dateJoined = employee.joiningDate ? new Date(employee.joiningDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "15 Jun 2024";

        const payslipData = {
            employeeId: employee._id,
            month: monthClean,
            year: Number(year),
            periodString,
            companyEntity: employee.companyEntity || "Idea Fueled",
            llpPin: "ACZ-5286",
            employeeDetails: {
                name: empName,
                employeeNumber: empNumber,
                dateJoined,
                department: employee.department || "Engineering",
                designation: employee.designation || "Employee",
                paymentMode: employee.paymentMode || "Bank Transfer",
                bankName: employee.bankName || "HDFC Bank",
                bankIfsc: employee.ifscCode || "HDFC0001234",
                bankAccount: employee.accountNumber || "XXXXXX1234",
                panNumber: employee.panNumber || "ABCDE1234F"
            },
            attendanceDetails: {
                actualPayableDays: Number(actualPayableDays) || numTotalDays,
                totalWorkingDays: numTotalDays,
                lossOfPayDays: numLopDays,
                daysPayable: numDaysPayable
            },
            earnings: {
                basic: earnedBasic,
                hra: earnedHra,
                medicalAllowance: earnedMedical,
                conveyanceAllowance: earnedConveyance,
                specialAllowance: earnedSpecial,
                otherAllowances: earnedOther,
                totalEarnings: netSalaryPayable
            },
            netSalaryPayable,
            netSalaryInWords,
            generatedBy: adminId
        };

        // Upsert payslip for given employee and month/year
        const payslip = await Payslip.findOneAndUpdate(
            { employeeId: employee._id, periodString },
            payslipData,
            { new: true, upsert: true, runValidators: true }
        );

        return res.status(200).json({
            success: true,
            message: `Payslip for ${periodString} saved successfully!`,
            payslip
        });
    } catch (err) {
        console.error("Create Payslip Error:", err);
        return res.status(500).json({ success: false, message: err.message });
    }
};

/* ─────────────────────────────────────────────
   GET PAYSLIPS (For Employee or Admin)
───────────────────────────────────────────── */
export const getPayslips = async (req, res) => {
    try {
        const userId = req.user?.id || req.user?.userId;
        const userRole = (req.user?.role || "").toLowerCase();
        const isGlobalAdminOrHr = userRole === "global_admin" || userRole === "admin" || userRole === "hr";

        const { employeeId, month, year, companyEntity } = req.query;
        const query = {};

        // If Global Admin or HR:
        // - If an explicit employeeId is provided (and not "all"), filter by that employee
        // - If no employeeId is provided (or "all"), return ALL issued payslips across the organization
        // If regular employee:
        // - Restrict strictly to their own payslips
        if (isGlobalAdminOrHr) {
            if (employeeId && employeeId !== "all") {
                query.employeeId = employeeId;
            }
        } else {
            query.employeeId = userId;
        }

        if (month && month !== "all") {
            const m = month.trim().toUpperCase().substring(0, 3);
            query.month = m;
        }

        if (year && year !== "all") {
            query.year = Number(year);
        }

        if (companyEntity && companyEntity !== "all") {
            query.companyEntity = companyEntity;
        }

        const payslips = await Payslip.find(query)
            .populate("employeeId", "fullName firstName lastName employeeId department designation companyEntity profilePicture")
            .sort({ year: -1, createdAt: -1 });

        return res.status(200).json({
            success: true,
            payslips
        });
    } catch (err) {
        console.error("Get Payslips Error:", err);
        return res.status(500).json({ success: false, message: err.message });
    }
};

/* ─────────────────────────────────────────────
   GET SINGLE PAYSLIP BY ID
───────────────────────────────────────────── */
export const getPayslipById = async (req, res) => {
    try {
        const { id } = req.params;
        const payslip = await Payslip.findById(id).populate("employeeId", "fullName firstName lastName employeeId companyEntity department designation");

        if (!payslip) {
            return res.status(404).json({ success: false, message: "Payslip record not found." });
        }

        return res.status(200).json({
            success: true,
            payslip
        });
    } catch (err) {
        console.error("Get Payslip By ID Error:", err);
        return res.status(500).json({ success: false, message: err.message });
    }
};

/* ─────────────────────────────────────────────
   DELETE PAYSLIP (Global Admin)
───────────────────────────────────────────── */
export const deletePayslip = async (req, res) => {
    try {
        const { id } = req.params;
        await Payslip.findByIdAndDelete(id);
        return res.status(200).json({ success: true, message: "Payslip deleted successfully." });
    } catch (err) {
        console.error("Delete Payslip Error:", err);
        return res.status(500).json({ success: false, message: err.message });
    }
};

/* ─────────────────────────────────────────────
   GET / UPDATE FINANCIAL & SALARY INFO FOR AN EMPLOYEE
───────────────────────────────────────────── */
export const updateEmployeeFinancials = async (req, res) => {
    try {
        const { employeeId } = req.params;
        const {
            companyEntity,
            paymentMode,
            bankName,
            accountHolderName,
            accountNumber,
            ifscCode,
            panNumber,
            aadhaarNumber,
            salaryStructure
        } = req.body;

        const updateData = {};
        if (companyEntity) updateData.companyEntity = companyEntity;
        if (paymentMode) updateData.paymentMode = paymentMode;
        if (bankName !== undefined) updateData.bankName = bankName;
        if (accountHolderName !== undefined) updateData.accountHolderName = accountHolderName;
        if (accountNumber !== undefined) updateData.accountNumber = accountNumber;
        if (ifscCode !== undefined) updateData.ifscCode = ifscCode;
        if (panNumber !== undefined) updateData.panNumber = panNumber;
        if (aadhaarNumber !== undefined) updateData.aadhaarNumber = aadhaarNumber;
        if (salaryStructure) updateData.salaryStructure = salaryStructure;

        const updatedUser = await User.findByIdAndUpdate(employeeId, updateData, { new: true });
        if (!updatedUser) {
            return res.status(404).json({ success: false, message: "Employee not found." });
        }

        return res.status(200).json({
            success: true,
            message: "Financial & Salary information updated successfully.",
            user: updatedUser
        });
    } catch (err) {
        console.error("Update Employee Financials Error:", err);
        return res.status(500).json({ success: false, message: err.message });
    }
};

/* ─────────────────────────────────────────────
   NOTIFY GLOBAL ADMINS ON PAYSLIP DOWNLOAD
   Triggered whenever any user other than global_admin downloads their payslip
───────────────────────────────────────────── */
export const notifyPayslipDownload = async (req, res) => {
    try {
        const currentUserId = req.user?.id || req.user?.userId;
        const currentUser = await User.findById(currentUserId);
        if (!currentUser) {
            return res.status(401).json({ success: false, message: "User not found." });
        }

        // Only send email alert if the user is NOT a global_admin
        if (currentUser.role === "global_admin") {
            return res.status(200).json({
                success: true,
                message: "Download by Global Admin, no notification needed.",
            });
        }

        const { payslipId, month, year, periodString } = req.body;

        let period = periodString;
        let payslip = null;
        if (payslipId) {
            payslip = await Payslip.findById(payslipId);
            if (payslip && payslip.periodString) {
                period = payslip.periodString;
            }
        }
        if (!period) {
            period = `${month || ""} ${year || ""}`.trim() || "Current Period";
        }

        // Find all Global Admins
        const globalAdmins = await User.find({
            role: { $in: ["global_admin", "admin"] },
        });

        if (!globalAdmins || globalAdmins.length === 0) {
            return res.status(200).json({
                success: true,
                message: "No global admins found.",
            });
        }

        const adminEmails = globalAdmins
            .map((a) => a.email.toLowerCase())
            .filter(Boolean);

        const empName =
            currentUser.fullName ||
            `${currentUser.firstName || ""} ${currentUser.lastName || ""}`.trim() ||
            "Employee";
        const empEmail = currentUser.email.toLowerCase();
        const empRole = (currentUser.role || "employee").replace(/_/g, " ");
        const empDept = currentUser.department || "General";
        const empDesig = currentUser.designation || "Team Member";

        const downloadDate = new Date().toLocaleString("en-IN", {
            timeZone: "Asia/Kolkata",
            dateStyle: "medium",
            timeStyle: "short",
        });

        const subject = `Payslip Downloaded: ${empName} - ${period}`;
        const snippet = `${empName} (${empRole}) downloaded their salary slip for ${period} on ${downloadDate}.`;

        const emailHtmlBody = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 4px;">
    <!-- Alert Header Banner -->
    <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border: 1px solid #bfdbfe; border-radius: 14px; padding: 18px 22px; margin-bottom: 22px;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
            <span style="background-color: #2563eb; color: #ffffff; font-size: 10px; font-weight: 800; padding: 3px 10px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.6px;">Payroll Audit Alert</span>
        </div>
        <h2 style="margin: 0; color: #1e3a8a; font-size: 17px; font-weight: 800; letter-spacing: -0.2px;">Payslip Downloaded</h2>
        <p style="margin: 4px 0 0 0; color: #3b82f6; font-size: 13px; font-weight: 500;">An employee has downloaded their official salary slip for <strong>${period}</strong>.</p>
    </div>

    <!-- Details Card -->
    <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); margin-bottom: 20px;">
        <h4 style="margin: 0 0 14px 0; color: #0f172a; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px;">Activity Summary</h4>

        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tbody>
                <tr style="border-bottom: 1px solid #f8fafc;">
                    <td style="padding: 9px 0; color: #64748b; font-weight: 600; width: 140px;">Employee</td>
                    <td style="padding: 9px 0; color: #0f172a; font-weight: 700;">${empName}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f8fafc;">
                    <td style="padding: 9px 0; color: #64748b; font-weight: 600;">Email</td>
                    <td style="padding: 9px 0; color: #0f172a;">${empEmail}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f8fafc;">
                    <td style="padding: 9px 0; color: #64748b; font-weight: 600;">Role</td>
                    <td style="padding: 9px 0; color: #0f172a; text-transform: capitalize;">${empRole}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f8fafc;">
                    <td style="padding: 9px 0; color: #64748b; font-weight: 600;">Department</td>
                    <td style="padding: 9px 0; color: #0f172a;">${empDept} &bull; ${empDesig}</td>
                </tr>
                <tr style="border-bottom: 1px solid #f8fafc;">
                    <td style="padding: 9px 0; color: #64748b; font-weight: 600;">Payslip Period</td>
                    <td style="padding: 9px 0; color: #2563eb; font-weight: 800; font-size: 14px;">${period}</td>
                </tr>
                <tr>
                    <td style="padding: 9px 0; color: #64748b; font-weight: 600;">Downloaded At</td>
                    <td style="padding: 9px 0; color: #0f172a; font-weight: 600;">${downloadDate} (IST)</td>
                </tr>
            </tbody>
        </table>
    </div>

    <!-- Footer Note -->
    <div style="padding: 12px 16px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 11px; color: #64748b;">
        🔒 This automated audit log was generated by the <strong>Idea Fueled HRMS System</strong> because this user downloaded their confidential salary document.
    </div>
</div>
`.trim();

        // Build userStates: Sent for employee, Inbox for every Global Admin
        const userStates = [
            {
                user: currentUser._id,
                email: empEmail,
                folder: "sent",
                isRead: true,
                isStarred: false,
                isDeleted: false,
            },
        ];

        globalAdmins.forEach((admin) => {
            if (admin.email.toLowerCase() !== empEmail) {
                userStates.push({
                    user: admin._id,
                    email: admin.email.toLowerCase(),
                    folder: "inbox",
                    isRead: false,
                    isStarred: false,
                    isDeleted: false,
                });
            }
        });

        const newEmail = new Email({
            sender: currentUser._id,
            senderEmail: empEmail,
            senderName: empName,
            senderAvatar: currentUser.profilePicture || "",
            senderRole: currentUser.role || "employee",
            to: adminEmails,
            cc: [],
            bcc: [],
            subject,
            body: emailHtmlBody,
            snippet,
            attachments: [],
            priority: "high",
            labels: ["Payroll", "Audit"],
            userStates,
        });

        newEmail.threadId = newEmail._id;
        await newEmail.save();

        // Emit real-time Socket.IO notification to all global admins
        globalAdmins.forEach(async (admin) => {
            const adminEmailClean = admin.email.toLowerCase();
            if (adminEmailClean !== empEmail) {
                try {
                    const unreadCount = await Email.countDocuments({
                        userStates: {
                            $elemMatch: {
                                email: adminEmailClean,
                                folder: "inbox",
                                isRead: false,
                                isDeleted: false,
                            },
                        },
                    });

                    emitToUser(
                        { userId: admin._id, email: adminEmailClean },
                        "new_email",
                        {
                            email: {
                                _id: newEmail._id,
                                senderName: newEmail.senderName,
                                senderEmail: newEmail.senderEmail,
                                senderAvatar: newEmail.senderAvatar,
                                subject: newEmail.subject,
                                snippet: newEmail.snippet,
                                createdAt: newEmail.createdAt,
                                priority: newEmail.priority,
                            },
                            unreadCount,
                        }
                    );
                } catch (socketErr) {
                    console.error("Socket emit to admin error:", socketErr);
                }
            }
        });

        return res.status(200).json({
            success: true,
            message: "Global Admins notified of payslip download.",
        });
    } catch (err) {
        console.error("Notify Payslip Download Error:", err);
        return res.status(500).json({ success: false, message: err.message });
    }
};

