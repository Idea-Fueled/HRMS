import Attendance from "../../models/attendance/attendance.model.js";
import User from "../../models/users/user.model.js";
import Email from "../../models/emails/email.model.js";
import { dispatchExternalEmail } from "../../services/email.service.js";

/**
 * Format minutes into "Xh Ym" or "0h"
 */
export const formatMinutesToHoursMins = (minutes = 0) => {
    const total = Math.max(0, Math.round(Number(minutes) || 0));
    const h = Math.floor(total / 60);
    const m = total % 60;
    if (h === 0 && m === 0) return "0h";
    if (m === 0) return `${h}h`;
    if (h === 0) return `${m}m`;
    return `${h}h ${m}m`;
};

/**
 * Format minutes into decimal hours rounded to 1 decimal place (e.g. 8.5)
 */
export const formatMinutesToDecimalHours = (minutes = 0) => {
    const total = Math.max(0, Number(minutes) || 0);
    return Number((total / 60).toFixed(1));
};

/**
 * Filter helper to strictly exclude Management users (roles: global_admin, admin OR department: Management)
 */
export const isManagementUser = (user) => {
    if (!user) return false;
    const role = (user.role || "").trim().toLowerCase();
    const dept = (user.department || "").trim().toLowerCase();
    const designation = (user.designation || "").trim().toLowerCase();
    return role === "global_admin" || role === "admin" || dept === "management" || designation === "ceo" || designation === "co-founder";
};

/**
 * Get date range for Monday - Friday of a given week.
 * If baseDate is not provided, defaults to current week.
 */
export const getWeekDays = (baseDate = new Date()) => {
    const d = new Date(baseDate);
    const day = d.getDay(); // 0 is Sunday, 1 is Monday...
    // Distance to Monday (if Sunday, -6; else 1 - day)
    const diffToMonday = day === 0 ? -6 : 1 - day;
    
    const monday = new Date(d);
    monday.setDate(d.getDate() + diffToMonday);
    monday.setHours(0, 0, 0, 0);

    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    friday.setHours(23, 59, 59, 999);

    // Days array for Mon - Fri
    const days = [];
    const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const dayKeys = ["mon", "tue", "wed", "thu", "fri"];

    for (let i = 0; i < 5; i++) {
        const cur = new Date(monday);
        cur.setDate(monday.getDate() + i);
        days.push({
            key: dayKeys[i],
            label: dayNames[i],
            shortLabel: dayNames[i].substring(0, 3),
            dateStr: cur.toISOString().split("T")[0],
            date: cur
        });
    }

    return { monday, friday, days };
};

/**
 * Helper to get weeks in a month
 */
export const getMonthWeeks = (year, month) => {
    // month is 1-indexed (1 to 12)
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0, 23, 59, 59, 999);
    const totalDays = lastDay.getDate();

    const weeks = [];
    let currentStart = 1;
    let weekIndex = 1;

    while (currentStart <= totalDays) {
        let currentEnd = currentStart + 6;
        if (currentEnd > totalDays) {
            currentEnd = totalDays;
        }

        const startD = new Date(year, month - 1, currentStart, 0, 0, 0, 0);
        const endD = new Date(year, month - 1, currentEnd, 23, 59, 59, 999);

        const startFormatted = startD.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
        const endFormatted = endD.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });

        weeks.push({
            weekNum: weekIndex,
            label: `Week ${weekIndex} (${startFormatted} - ${endFormatted})`,
            shortLabel: `W${weekIndex}`,
            startDate: startD,
            endDate: endD,
            startDay: currentStart,
            endDay: currentEnd
        });

        currentStart = currentEnd + 1;
        weekIndex++;
    }

    return { firstDay, lastDay, weeks };
};

/**
 * Calculate weekly attendance data for all active non-management employees
 */
export const computeWeeklyData = async (weekBaseDate = new Date(), departmentFilter = "") => {
    const { monday, friday, days } = getWeekDays(weekBaseDate);

    // Active employees excluding global_admin, admin and Management department
    const userQuery = {
        status: { $in: ["active", "Active"] },
        role: { $nin: ["global_admin", "admin"] },
        department: { $not: { $regex: /^management$/i } }
    };
    if (departmentFilter && departmentFilter !== "All") {
        userQuery.department = departmentFilter;
    }

    let employees = await User.find(userQuery)
        .select("_id employeeId fullName firstName lastName email department designation profilePicture role")
        .sort({ employeeId: 1 })
        .lean();

    // In-memory strict guard to guarantee no management personnel slip through
    employees = employees.filter(e => !isManagementUser(e));

    // Query attendance records for this Mon-Fri window
    const attendanceRecords = await Attendance.find({
        date: { $gte: monday, $lte: friday }
    }).lean();

    // Map: employeeId -> dateStr -> record
    const attendanceMap = new Map();
    for (const record of attendanceRecords) {
        const empIdStr = record.employeeId.toString();
        if (!attendanceMap.has(empIdStr)) {
            attendanceMap.set(empIdStr, new Map());
        }
        const recordDateStr = new Date(record.date).toISOString().split("T")[0];
        attendanceMap.get(empIdStr).set(recordDateStr, record);
    }

    let orgTotalWorkMinutes = 0;
    let orgTotalBreakMinutes = 0;
    let orgTotalOvertimeMinutes = 0;

    const employeeRows = employees.map(emp => {
        const empIdStr = emp._id.toString();
        const empAttendance = attendanceMap.get(empIdStr) || new Map();

        const dailyData = {};
        let totalWorkMins = 0;
        let totalBreakMins = 0;
        let totalOvertimeMins = 0;
        let daysPresentCount = 0;

        days.forEach(day => {
            const att = empAttendance.get(day.dateStr);
            const workMins = att ? (Number(att.totalWorkMinutes) || 0) : 0;
            const breakMins = att ? (Number(att.totalBreakMinutes) || 0) : 0;
            // Overtime: daily work hours above 8 hours (480 minutes)
            const overtimeMins = Math.max(0, workMins - 480);

            if (att && (att.status === "present" || att.status === "half_day" || workMins > 0)) {
                daysPresentCount++;
            }

            dailyData[day.key] = {
                date: day.dateStr,
                label: day.label,
                status: att?.status || "absent",
                workMinutes: workMins,
                workHours: formatMinutesToDecimalHours(workMins),
                workDisplay: formatMinutesToHoursMins(workMins),
                breakMinutes: breakMins,
                breakHours: formatMinutesToDecimalHours(breakMins),
                breakDisplay: formatMinutesToHoursMins(breakMins),
                overtimeMinutes: overtimeMins,
                overtimeHours: formatMinutesToDecimalHours(overtimeMins),
                overtimeDisplay: formatMinutesToHoursMins(overtimeMins),
                firstClockIn: att?.firstClockIn || null,
                lastClockOut: att?.lastClockOut || null
            };

            totalWorkMins += workMins;
            totalBreakMins += breakMins;
            totalOvertimeMins += overtimeMins;
        });

        orgTotalWorkMinutes += totalWorkMins;
        orgTotalBreakMinutes += totalBreakMins;
        orgTotalOvertimeMinutes += totalOvertimeMins;

        const targetMins = 2400; // 40 hours = 2400 mins
        const compliancePct = Math.min(100, Math.round((totalWorkMins / targetMins) * 100));

        return {
            _id: emp._id,
            employeeId: emp.employeeId,
            fullName: emp.fullName || `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || "Employee",
            email: emp.email,
            department: emp.department,
            designation: emp.designation,
            profilePicture: emp.profilePicture,
            days: dailyData,
            totalWorkMinutes: totalWorkMins,
            totalWorkHours: formatMinutesToDecimalHours(totalWorkMins),
            totalWorkDisplay: formatMinutesToHoursMins(totalWorkMins),
            totalBreakMinutes: totalBreakMins,
            totalBreakHours: formatMinutesToDecimalHours(totalBreakMins),
            totalBreakDisplay: formatMinutesToHoursMins(totalBreakMins),
            totalOvertimeMinutes: totalOvertimeMins,
            totalOvertimeHours: formatMinutesToDecimalHours(totalOvertimeMins),
            totalOvertimeDisplay: formatMinutesToHoursMins(totalOvertimeMins),
            daysPresent: daysPresentCount,
            targetHours: 40,
            compliancePercentage: compliancePct
        };
    });

    const totalEmployeesCount = employees.length;
    const avgWorkHours = totalEmployeesCount > 0 
        ? formatMinutesToDecimalHours(orgTotalWorkMinutes / totalEmployeesCount) 
        : 0;

    return {
        weekRange: {
            mondayStr: monday.toISOString().split("T")[0],
            fridayStr: friday.toISOString().split("T")[0],
            formatted: `${monday.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} - ${friday.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`
        },
        days,
        employees: employeeRows,
        summary: {
            totalEmployees: totalEmployeesCount,
            totalWorkHours: formatMinutesToDecimalHours(orgTotalWorkMinutes),
            totalWorkDisplay: formatMinutesToHoursMins(orgTotalWorkMinutes),
            totalBreakHours: formatMinutesToDecimalHours(orgTotalBreakMinutes),
            totalBreakDisplay: formatMinutesToHoursMins(orgTotalBreakMinutes),
            totalOvertimeHours: formatMinutesToDecimalHours(orgTotalOvertimeMinutes),
            totalOvertimeDisplay: formatMinutesToHoursMins(orgTotalOvertimeMinutes),
            avgWorkHours
        }
    };
};

/**
 * Calculate monthly attendance data for all active non-management employees
 */
export const computeMonthlyData = async (year, month, departmentFilter = "") => {
    const { firstDay, lastDay, weeks } = getMonthWeeks(Number(year), Number(month));

    const userQuery = {
        status: { $in: ["active", "Active"] },
        role: { $nin: ["global_admin", "admin"] },
        department: { $not: { $regex: /^management$/i } }
    };
    if (departmentFilter && departmentFilter !== "All") {
        userQuery.department = departmentFilter;
    }

    let employees = await User.find(userQuery)
        .select("_id employeeId fullName firstName lastName email department designation profilePicture role")
        .sort({ employeeId: 1 })
        .lean();

    employees = employees.filter(e => !isManagementUser(e));

    const attendanceRecords = await Attendance.find({
        date: { $gte: firstDay, $lte: lastDay }
    }).lean();

    // Map: employeeId -> list of records
    const attendanceMap = new Map();
    for (const record of attendanceRecords) {
        const empIdStr = record.employeeId.toString();
        if (!attendanceMap.has(empIdStr)) {
            attendanceMap.set(empIdStr, []);
        }
        attendanceMap.get(empIdStr).push(record);
    }

    let orgTotalWorkMinutes = 0;
    let orgTotalBreakMinutes = 0;
    let orgTotalOvertimeMinutes = 0;

    const employeeRows = employees.map(emp => {
        const empIdStr = emp._id.toString();
        const records = attendanceMap.get(empIdStr) || [];

        let empTotalWorkMins = 0;
        let empTotalBreakMins = 0;
        let empTotalOvertimeMins = 0;

        const weekBreakdown = weeks.map(w => {
            let weekWorkMins = 0;
            let weekBreakMins = 0;
            let weekOvertimeMins = 0;
            let weekDaysPresent = 0;

            records.forEach(rec => {
                const recDate = new Date(rec.date);
                if (recDate >= w.startDate && recDate <= w.endDate) {
                    const wMins = Number(rec.totalWorkMinutes) || 0;
                    const bMins = Number(rec.totalBreakMinutes) || 0;
                    const otMins = Math.max(0, wMins - 480);

                    weekWorkMins += wMins;
                    weekBreakMins += bMins;
                    weekOvertimeMins += otMins;
                    if (rec.status === "present" || rec.status === "half_day" || wMins > 0) {
                        weekDaysPresent++;
                    }
                }
            });

            empTotalWorkMins += weekWorkMins;
            empTotalBreakMins += weekBreakMins;
            empTotalOvertimeMins += weekOvertimeMins;

            return {
                weekNum: w.weekNum,
                label: w.label,
                shortLabel: w.shortLabel,
                workMinutes: weekWorkMins,
                workHours: formatMinutesToDecimalHours(weekWorkMins),
                workDisplay: formatMinutesToHoursMins(weekWorkMins),
                breakMinutes: weekBreakMins,
                breakHours: formatMinutesToDecimalHours(weekBreakMins),
                breakDisplay: formatMinutesToHoursMins(weekBreakMins),
                overtimeMinutes: weekOvertimeMins,
                overtimeHours: formatMinutesToDecimalHours(weekOvertimeMins),
                overtimeDisplay: formatMinutesToHoursMins(weekOvertimeMins),
                daysPresent: weekDaysPresent
            };
        });

        orgTotalWorkMinutes += empTotalWorkMins;
        orgTotalBreakMinutes += empTotalBreakMins;
        orgTotalOvertimeMinutes += empTotalOvertimeMins;

        return {
            _id: emp._id,
            employeeId: emp.employeeId,
            fullName: emp.fullName || `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || "Employee",
            email: emp.email,
            department: emp.department,
            designation: emp.designation,
            profilePicture: emp.profilePicture,
            weeks: weekBreakdown,
            totalWorkMinutes: empTotalWorkMins,
            totalWorkHours: formatMinutesToDecimalHours(empTotalWorkMins),
            totalWorkDisplay: formatMinutesToHoursMins(empTotalWorkMins),
            totalBreakMinutes: empTotalBreakMins,
            totalBreakHours: formatMinutesToDecimalHours(empTotalBreakMins),
            totalBreakDisplay: formatMinutesToHoursMins(empTotalBreakMins),
            totalOvertimeMinutes: empTotalOvertimeMins,
            totalOvertimeHours: formatMinutesToDecimalHours(empTotalOvertimeMins),
            totalOvertimeDisplay: formatMinutesToHoursMins(empTotalOvertimeMins)
        };
    });

    const totalEmployeesCount = employees.length;
    const avgWorkHours = totalEmployeesCount > 0 
        ? formatMinutesToDecimalHours(orgTotalWorkMinutes / totalEmployeesCount) 
        : 0;

    const monthName = firstDay.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

    return {
        month: Number(month),
        year: Number(year),
        monthName,
        weeks,
        employees: employeeRows,
        summary: {
            totalEmployees: totalEmployeesCount,
            totalWorkHours: formatMinutesToDecimalHours(orgTotalWorkMinutes),
            totalWorkDisplay: formatMinutesToHoursMins(orgTotalWorkMinutes),
            totalBreakHours: formatMinutesToDecimalHours(orgTotalBreakMinutes),
            totalBreakDisplay: formatMinutesToHoursMins(orgTotalBreakMinutes),
            totalOvertimeHours: formatMinutesToDecimalHours(orgTotalOvertimeMinutes),
            totalOvertimeDisplay: formatMinutesToHoursMins(orgTotalOvertimeMinutes),
            avgWorkHours
        }
    };
};

/**
 * Generate CSV content for Weekly Report
 */
export const generateWeeklyCsv = (report) => {
    const headers = [
        "Employee ID",
        "Full Name",
        "Department",
        "Designation",
        "Mon Work",
        "Tue Work",
        "Wed Work",
        "Thu Work",
        "Fri Work",
        "Total Work Hours",
        "Total Breaks",
        "Total Overtime",
        "Days Present"
    ];

    const rows = report.employees.map(e => [
        `"${e.employeeId}"`,
        `"${e.fullName}"`,
        `"${e.department || ""}"`,
        `"${e.designation || ""}"`,
        `"${e.days.mon?.workDisplay || "0h"}"`,
        `"${e.days.tue?.workDisplay || "0h"}"`,
        `"${e.days.wed?.workDisplay || "0h"}"`,
        `"${e.days.thu?.workDisplay || "0h"}"`,
        `"${e.days.fri?.workDisplay || "0h"}"`,
        `"${e.totalWorkDisplay}"`,
        `"${e.totalBreakDisplay}"`,
        `"${e.totalOvertimeDisplay}"`,
        `"${e.daysPresent}"`
    ]);

    return [headers.join(","), ...rows.map(r => r.join(","))].join("\r\n");
};

/**
 * Generate CSV content for Monthly Report
 */
export const generateMonthlyCsv = (report) => {
    const weekHeaders = report.weeks.map(w => `"${w.label.replace(/"/g, '""')}"`);
    const headers = [
        "Employee ID",
        "Full Name",
        "Department",
        "Designation",
        ...weekHeaders,
        "Total Monthly Hours",
        "Total Breaks",
        "Total Overtime"
    ];

    const rows = report.employees.map(e => {
        const weekCols = e.weeks.map(w => `"${w.workDisplay}"`);
        return [
            `"${e.employeeId}"`,
            `"${e.fullName}"`,
            `"${e.department || ""}"`,
            `"${e.designation || ""}"`,
            ...weekCols,
            `"${e.totalWorkDisplay}"`,
            `"${e.totalBreakDisplay}"`,
            `"${e.totalOvertimeDisplay}"`
        ];
    });

    return [headers.join(","), ...rows.map(r => r.join(","))].join("\r\n");
};

/**
 * Controller: Get Weekly Report JSON
 */
export const getWeeklyReport = async (req, res) => {
    try {
        const { date, department } = req.query;
        const baseDate = date ? new Date(date) : new Date();
        const report = await computeWeeklyData(baseDate, department);

        return res.status(200).json({
            success: true,
            report
        });
    } catch (error) {
        console.error("Error generating weekly report:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to generate weekly report: " + error.message
        });
    }
};

/**
 * Controller: Get Monthly Report JSON
 */
export const getMonthlyReport = async (req, res) => {
    try {
        const now = new Date();
        const year = req.query.year || now.getFullYear();
        const month = req.query.month || (now.getMonth() + 1);
        const { department } = req.query;

        const report = await computeMonthlyData(year, month, department);

        return res.status(200).json({
            success: true,
            report
        });
    } catch (error) {
        console.error("Error generating monthly report:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to generate monthly report: " + error.message
        });
    }
};

/**
 * Controller: Download Weekly CSV directly
 */
export const exportWeeklyReportCsv = async (req, res) => {
    try {
        const { date, department } = req.query;
        const baseDate = date ? new Date(date) : new Date();
        const report = await computeWeeklyData(baseDate, department);
        const csvContent = generateWeeklyCsv(report);

        const filename = `Weekly_Attendance_Report_${report.weekRange.mondayStr}_to_${report.weekRange.fridayStr}.csv`;
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        return res.status(200).send(csvContent);
    } catch (error) {
        console.error("Error exporting weekly CSV:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Controller: Download Monthly CSV directly
 */
export const exportMonthlyReportCsv = async (req, res) => {
    try {
        const now = new Date();
        const year = req.query.year || now.getFullYear();
        const month = req.query.month || (now.getMonth() + 1);
        const { department } = req.query;

        const report = await computeMonthlyData(year, month, department);
        const csvContent = generateMonthlyCsv(report);

        const filename = `Monthly_Attendance_Report_${report.monthName.replace(/\s+/g, '_')}.csv`;
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        return res.status(200).send(csvContent);
    } catch (error) {
        console.error("Error exporting monthly CSV:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * Helper to generate Weekly HTML Email (Clean Executive Summary with Excel Export Card)
 * Note: Raw full employee table is NOT embedded in the email per requirement; Excel spreadsheet is attached!
 */
export const generateWeeklyEmailHtml = (report, filename) => {
    const { weekRange, summary } = report;
    const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/+$/, "");

    // Top overtime employees if any
    const topOvertime = report.employees
        .filter(e => e.totalOvertimeMinutes > 0)
        .sort((a, b) => b.totalOvertimeMinutes - a.totalOvertimeMinutes)
        .slice(0, 3);

    const overtimeSnippet = topOvertime.length > 0 ? `
        <div style="background-color: #fefce8; border: 1px solid #fef08a; border-radius: 12px; padding: 14px 16px; margin: 16px 24px;">
            <div style="font-size: 11px; font-weight: 800; color: #854d0e; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
                ⚡ Overtime Highlights (Daily &gt; 8 Hours)
            </div>
            ${topOvertime.map(e => `
                <div style="display: flex; justify-content: space-between; font-size: 12px; padding: 3px 0; color: #713f12;">
                    <span><strong>${e.fullName}</strong> (${e.department})</span>
                    <span style="font-weight: 800; color: #b45309;">${e.totalOvertimeDisplay}</span>
                </div>
            `).join("")}
        </div>
    ` : "";

    return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 20px; background-color: #f1f5f9; color: #1e293b;">
        <div style="background-color: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); padding: 28px 32px; color: #ffffff;">
                <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.15); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 20px; padding: 4px 12px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
                    Weekly Executive Summary
                </div>
                <h1 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">Weekly Work &amp; Attendance Report</h1>
                <p style="margin: 6px 0 0; font-size: 13px; opacity: 0.9; font-weight: 500;">
                    Period: <strong>${weekRange.formatted}</strong> (Monday – Friday)
                </p>
            </div>

            <!-- KPI Cards -->
            <div style="padding: 24px 24px 12px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                        <td width="25%" style="padding: 6px;">
                            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px 10px; text-align: center;">
                                <div style="font-size: 10px; color: #64748b; font-weight: 800; text-transform: uppercase;">Total Hours</div>
                                <div style="font-size: 20px; font-weight: 900; color: #0f172a; margin-top: 4px;">${summary.totalWorkDisplay}</div>
                            </div>
                        </td>
                        <td width="25%" style="padding: 6px;">
                            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px 10px; text-align: center;">
                                <div style="font-size: 10px; color: #64748b; font-weight: 800; text-transform: uppercase;">Avg / Employee</div>
                                <div style="font-size: 20px; font-weight: 900; color: #2563eb; margin-top: 4px;">${summary.avgWorkHours}h</div>
                            </div>
                        </td>
                        <td width="25%" style="padding: 6px;">
                            <div style="background-color: #fef3c7; border: 1px solid #fde68a; border-radius: 14px; padding: 14px 10px; text-align: center;">
                                <div style="font-size: 10px; color: #92400e; font-weight: 800; text-transform: uppercase;">Overtime</div>
                                <div style="font-size: 20px; font-weight: 900; color: #b45309; margin-top: 4px;">${summary.totalOvertimeDisplay}</div>
                            </div>
                        </td>
                        <td width="25%" style="padding: 6px;">
                            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px 10px; text-align: center;">
                                <div style="font-size: 10px; color: #64748b; font-weight: 800; text-transform: uppercase;">Breaks</div>
                                <div style="font-size: 20px; font-weight: 900; color: #475569; margin-top: 4px;">${summary.totalBreakDisplay}</div>
                            </div>
                        </td>
                    </tr>
                </table>
            </div>

            ${overtimeSnippet}

            <!-- Excel Export Card Banner (Requirement: Excel sheet export option on mail) -->
            <div style="padding: 8px 24px 24px;">
                <div style="background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); border: 1.5px solid #a7f3d0; border-radius: 16px; padding: 22px; text-align: center;">
                    <div style="font-size: 28px; margin-bottom: 6px;">📊</div>
                    <h3 style="margin: 0; font-size: 16px; font-weight: 800; color: #065f46;">
                        Complete Employee Attendance Excel Sheet Attached
                    </h3>
                    <p style="margin: 6px 0 16px; font-size: 12.5px; color: #047857; line-height: 1.5;">
                        The full employee attendance report (with daily hours, breaks, and overtime) for <strong>${summary.totalEmployees} active team members</strong> has been compiled into the attached Excel spreadsheet (<strong>${filename}</strong>).
                    </p>

                    <div style="display: flex; justify-content: center; gap: 10px; flex-wrap: wrap;">
                        <a href="${frontendUrl}/reports" style="display: inline-block; background-color: #059669; color: #ffffff; text-decoration: none; padding: 11px 22px; border-radius: 10px; font-size: 12.5px; font-weight: 800; letter-spacing: 0.3px; box-shadow: 0 4px 6px rgba(5, 150, 105, 0.2);">
                            📥 View &amp; Export Excel in HRMS
                        </a>
                    </div>
                    <div style="font-size: 11px; color: #059669; margin-top: 10px; opacity: 0.9;">
                        Note: Management executives are excluded from this report per organization policy.
                    </div>
                </div>
            </div>

            <!-- Footer -->
            <div style="background-color: #f8fafc; padding: 16px 24px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #64748b;">
                Idea-Fueled HRMS Attendance Intelligence Engine · Dispatched every Saturday at 10:00 AM.
            </div>
        </div>
    </div>
    `;
};

/**
 * Helper to generate Monthly HTML Email (Clean Executive Summary with Excel Export Card)
 */
export const generateMonthlyEmailHtml = (report, filename) => {
    const { monthName, summary } = report;
    const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/+$/, "");

    return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 20px; background-color: #f1f5f9; color: #1e293b;">
        <div style="background-color: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); padding: 28px 32px; color: #ffffff;">
                <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.15); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 20px; padding: 4px 12px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
                    Monthly Executive Summary
                </div>
                <h1 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">Monthly Work &amp; Attendance Report</h1>
                <p style="margin: 6px 0 0; font-size: 13px; opacity: 0.9; font-weight: 500;">
                    Month: <strong>${monthName}</strong> (Week-by-Week Breakdown)
                </p>
            </div>

            <!-- KPI Cards -->
            <div style="padding: 24px 24px 12px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                        <td width="25%" style="padding: 6px;">
                            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px 10px; text-align: center;">
                                <div style="font-size: 10px; color: #64748b; font-weight: 800; text-transform: uppercase;">Total Hours</div>
                                <div style="font-size: 20px; font-weight: 900; color: #0f172a; margin-top: 4px;">${summary.totalWorkDisplay}</div>
                            </div>
                        </td>
                        <td width="25%" style="padding: 6px;">
                            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px 10px; text-align: center;">
                                <div style="font-size: 10px; color: #64748b; font-weight: 800; text-transform: uppercase;">Avg / Employee</div>
                                <div style="font-size: 20px; font-weight: 900; color: #2563eb; margin-top: 4px;">${summary.avgWorkHours}h</div>
                            </div>
                        </td>
                        <td width="25%" style="padding: 6px;">
                            <div style="background-color: #fef3c7; border: 1px solid #fde68a; border-radius: 14px; padding: 14px 10px; text-align: center;">
                                <div style="font-size: 10px; color: #92400e; font-weight: 800; text-transform: uppercase;">Overtime</div>
                                <div style="font-size: 20px; font-weight: 900; color: #b45309; margin-top: 4px;">${summary.totalOvertimeDisplay}</div>
                            </div>
                        </td>
                        <td width="25%" style="padding: 6px;">
                            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px 10px; text-align: center;">
                                <div style="font-size: 10px; color: #64748b; font-weight: 800; text-transform: uppercase;">Breaks</div>
                                <div style="font-size: 20px; font-weight: 900; color: #475569; margin-top: 4px;">${summary.totalBreakDisplay}</div>
                            </div>
                        </td>
                    </tr>
                </table>
            </div>

            <!-- Excel Export Card Banner -->
            <div style="padding: 8px 24px 24px;">
                <div style="background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%); border: 1.5px solid #a7f3d0; border-radius: 16px; padding: 22px; text-align: center;">
                    <div style="font-size: 28px; margin-bottom: 6px;">📊</div>
                    <h3 style="margin: 0; font-size: 16px; font-weight: 800; color: #065f46;">
                        Complete Monthly Attendance Excel Sheet Attached
                    </h3>
                    <p style="margin: 6px 0 16px; font-size: 12.5px; color: #047857; line-height: 1.5;">
                        The full month week-by-week attendance report for <strong>${summary.totalEmployees} active team members</strong> has been compiled into the attached Excel spreadsheet (<strong>${filename}</strong>).
                    </p>

                    <div style="display: flex; justify-content: center; gap: 10px; flex-wrap: wrap;">
                        <a href="${frontendUrl}/reports" style="display: inline-block; background-color: #059669; color: #ffffff; text-decoration: none; padding: 11px 22px; border-radius: 10px; font-size: 12.5px; font-weight: 800; letter-spacing: 0.3px; box-shadow: 0 4px 6px rgba(5, 150, 105, 0.2);">
                            📥 View &amp; Export Excel in HRMS
                        </a>
                    </div>
                </div>
            </div>

            <!-- Footer -->
            <div style="background-color: #f8fafc; padding: 16px 24px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 11px; color: #64748b;">
                Idea-Fueled HRMS Attendance Intelligence Engine · Dispatched on 1st of every month at 10:00 AM.
            </div>
        </div>
    </div>
    `;
};

/**
 * Dispatch Report Email to Global Admins (via SMTP and in-app Mailbox with CSV attachment)
 */
export const dispatchReportToGlobalAdmins = async ({ subject, htmlBody, snippet, reportType, csvContent, filename }) => {
    const globalAdmins = await User.find({
        role: "global_admin"
    }).select("_id email fullName firstName lastName").lean();

    if (!globalAdmins || globalAdmins.length === 0) {
        console.warn("No Global Admins found to send report email.");
        return { count: 0 };
    }

    const adminEmails = globalAdmins.map(a => a.email).filter(Boolean);

    // 1. External SMTP Email Dispatch with CSV attachment
    try {
        await dispatchExternalEmail({
            to: adminEmails,
            subject,
            body: htmlBody,
            attachments: [
                {
                    name: filename,
                    filename,
                    content: csvContent,
                    type: "text/csv"
                }
            ]
        });
    } catch (smtpErr) {
        console.error("External email dispatch error:", smtpErr.message);
    }

    // 2. Deliver into in-app Mailbox / Inbox for each Global Admin
    const dataUrl = `data:text/csv;charset=utf-8;base64,${Buffer.from(csvContent).toString("base64")}`;
    const fileSize = Buffer.byteLength(csvContent, "utf8");

    for (const admin of globalAdmins) {
        try {
            await Email.create({
                senderEmail: "system@ideafueled.com",
                senderName: "HRMS Attendance Engine",
                senderRole: "global_admin",
                subject,
                body: htmlBody,
                snippet: snippet || subject,
                recipients: [
                    {
                        user: admin._id,
                        email: admin.email,
                        name: admin.fullName || `${admin.firstName || ""} ${admin.lastName || ""}`.trim() || "Admin"
                    }
                ],
                userStates: [
                    {
                        user: admin._id,
                        email: admin.email,
                        folder: "inbox",
                        isRead: false
                    }
                ],
                labels: ["Reports", reportType === "monthly" ? "Monthly Report" : "Weekly Report"],
                attachments: [
                    {
                        name: filename,
                        url: dataUrl,
                        size: fileSize,
                        type: "text/csv"
                    }
                ]
            });
        } catch (dbErr) {
            console.error(`Failed to deliver report email into mailbox for ${admin.email}:`, dbErr.message);
        }
    }

    return { count: globalAdmins.length, recipients: adminEmails };
};

/**
 * Controller: Manually trigger Weekly Report Email
 */
export const sendWeeklyReportEmail = async (req, res) => {
    try {
        const { date, department } = req.body;
        const baseDate = date ? new Date(date) : new Date();
        const report = await computeWeeklyData(baseDate, department);

        const filename = `Weekly_Attendance_Report_${report.weekRange.mondayStr}_to_${report.weekRange.fridayStr}.csv`;
        const csvContent = generateWeeklyCsv(report);
        const subject = `Weekly Work & Attendance Report (${report.weekRange.formatted})`;
        const htmlBody = generateWeeklyEmailHtml(report, filename);
        const snippet = `Weekly report for ${report.weekRange.formatted}: Total Work Logged ${report.summary.totalWorkDisplay}, Overtime ${report.summary.totalOvertimeDisplay}. Excel sheet attached.`;

        const result = await dispatchReportToGlobalAdmins({
            subject,
            htmlBody,
            snippet,
            reportType: "weekly",
            csvContent,
            filename
        });

        return res.status(200).json({
            success: true,
            message: `Weekly report successfully emailed with Excel attachment to ${result.count} Global Admin(s).`,
            recipients: result.recipients
        });
    } catch (error) {
        console.error("Error sending weekly report email:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to send weekly report email: " + error.message
        });
    }
};

/**
 * Controller: Manually trigger Monthly Report Email
 */
export const sendMonthlyReportEmail = async (req, res) => {
    try {
        const now = new Date();
        const year = req.body.year || now.getFullYear();
        const month = req.body.month || (now.getMonth() + 1);
        const { department } = req.body;

        const report = await computeMonthlyData(year, month, department);

        const filename = `Monthly_Attendance_Report_${report.monthName.replace(/\s+/g, '_')}.csv`;
        const csvContent = generateMonthlyCsv(report);
        const subject = `Monthly Work & Attendance Summary (${report.monthName})`;
        const htmlBody = generateMonthlyEmailHtml(report, filename);
        const snippet = `Monthly summary for ${report.monthName}: Total Work Logged ${report.summary.totalWorkDisplay}, Overtime ${report.summary.totalOvertimeDisplay}. Excel sheet attached.`;

        const result = await dispatchReportToGlobalAdmins({
            subject,
            htmlBody,
            snippet,
            reportType: "monthly",
            csvContent,
            filename
        });

        return res.status(200).json({
            success: true,
            message: `Monthly report successfully emailed with Excel attachment to ${result.count} Global Admin(s).`,
            recipients: result.recipients
        });
    } catch (error) {
        console.error("Error sending monthly report email:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to send monthly report email: " + error.message
        });
    }
};
