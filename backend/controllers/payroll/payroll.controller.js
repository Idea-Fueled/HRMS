import Payslip from "../../models/payroll/payslip.model.js";
import User from "../../models/users/user.model.js";

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

        // Compute Earnings & Net Payable
        const numBasic = Number(basic) || 0;
        const numHra = Number(hra) || 0;
        const numSpecial = Number(specialAllowance) || 0;
        const numOther = Number(otherAllowances) || 0;
        const totalEarnings = numBasic + numHra + numSpecial + numOther;

        const netSalaryPayable = totalEarnings;
        const netSalaryInWords = numberToWordsINR(netSalaryPayable);

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
                actualPayableDays: Number(actualPayableDays) || 30,
                totalWorkingDays: Number(totalWorkingDays) || 30,
                lossOfPayDays: Number(lossOfPayDays) || 0,
                daysPayable: Number(daysPayable) || 30
            },
            earnings: {
                basic: numBasic,
                hra: numHra,
                specialAllowance: numSpecial,
                otherAllowances: numOther,
                totalEarnings
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
        const { employeeId } = req.query;

        // If employeeId is explicitly requested in query, use it. Otherwise default to logged-in user's own payslips
        const targetEmpId = employeeId ? employeeId : userId;
        const query = { employeeId: targetEmpId };

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
