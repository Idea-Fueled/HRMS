import cron from "node-cron";
import {
    computeWeeklyData,
    computeMonthlyData,
    generateWeeklyCsv,
    generateMonthlyCsv,
    generateWeeklyEmailHtml,
    generateMonthlyEmailHtml,
    dispatchReportToGlobalAdmins
} from "../controllers/reports/report.controller.js";

/**
 * Execute Saturday 10:00 AM Weekly Work & Attendance Email Routine
 */
export const executeWeeklyAttendanceReport = async () => {
    try {
        console.log("📊 Starting Saturday 10:00 AM Weekly Attendance Report Routine...");
        const today = new Date(); // Saturday
        const report = await computeWeeklyData(today);

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

        console.log(`✅ Weekly Attendance Report sent successfully to ${result.count} Global Admin(s).`);
    } catch (error) {
        console.error("❌ Error in Weekly Attendance Report Cron:", error);
    }
};

/**
 * Execute 1st of Month 10:00 AM Monthly Work & Attendance Email Routine
 */
export const executeMonthlyAttendanceReport = async () => {
    try {
        console.log("📅 Starting Monthly Attendance Report Routine for previous month...");
        const now = new Date();
        // Determine previous month
        let prevYear = now.getFullYear();
        let prevMonth = now.getMonth(); // 0 is Jan, 9 is Oct (which is previous month if now is Nov)
        if (prevMonth === 0) {
            prevMonth = 12;
            prevYear -= 1;
        }

        const report = await computeMonthlyData(prevYear, prevMonth);

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

        console.log(`✅ Monthly Attendance Report sent successfully to ${result.count} Global Admin(s).`);
    } catch (error) {
        console.error("❌ Error in Monthly Attendance Report Cron:", error);
    }
};

/**
 * Initialize Attendance Reports Cron Jobs
 */
export const initAttendanceReportsScheduler = () => {
    // 1. Weekly Report: Every Saturday at 10:00 AM (0 10 * * 6)
    cron.schedule("0 10 * * 6", () => {
        console.log("⏰ Saturday 10:00 AM Trigger: Generating Weekly Attendance Report...");
        executeWeeklyAttendanceReport();
    });

    // 2. Monthly Report: 1st of every month at 10:00 AM (0 10 1 * *)
    cron.schedule("0 10 1 * *", () => {
        console.log("⏰ 1st of Month 10:00 AM Trigger: Generating Monthly Attendance Report...");
        executeMonthlyAttendanceReport();
    });

    console.log("🚀 Attendance Reports Schedulers initialized (Weekly Saturday 10:00 AM & Monthly 1st 10:00 AM).");
};
