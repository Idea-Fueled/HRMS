import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import simplePayslipBg from "../assets/llp_payslip_bg.jpg"; // Idea Fueled template
import llpPayslipBg from "../assets/simple_payslip_bg.jpg"; // Idea Fueled LLP template

export const renderPayslipHtml = (payslip) => {
    const period = payslip.periodString || `${payslip.month || "JUN"} ${payslip.year || 2026}`;
    const entity = payslip.companyEntity || "Idea Fueled";
    const isLLP = entity.toLowerCase().includes("llp");

    // Select exact background template image uploaded by user
    const bgImage = isLLP ? llpPayslipBg : simplePayslipBg;

    const emp = payslip.employeeDetails || {};
    const att = payslip.attendanceDetails || {};
    const earn = payslip.earnings || {};

    const basic = Number(earn.basic) || 0;
    const hra = Number(earn.hra) || 0;
    const special = Number(earn.specialAllowance) || 0;
    const other = Number(earn.otherAllowances) || 0;
    const totalEarnings = Number(earn.totalEarnings) || (basic + hra + special + other);

    const netSalary = Number(payslip.netSalaryPayable) || totalEarnings;
    const netWords = payslip.netSalaryInWords || "Rupees Zero Only";

    return `
        <div id="payslip-pdf-container" style="
            width: 794px;
            height: 1123px;
            background-image: url('${bgImage}');
            background-size: 100% 100%;
            background-repeat: no-repeat;
            position: absolute;
            top: -9999px;
            left: -9999px;
            box-sizing: border-box;
            font-family: 'Arial', sans-serif;
            color: #111827;
        ">
            <!-- Dynamic Period -->
            <div style="position: absolute; top: 58px; left: 198px; font-size: 22px; font-weight: 800; color: #1E1E1E;">
                ${period}
            </div>

            <!-- Dynamic Employee Name -->
            <div style="position: absolute; top: 178px; left: 56px; font-size: 13.5px; font-weight: 900; color: #000000; text-transform: uppercase; letter-spacing: 0.2px;">
                ${emp.name || 'EMPLOYEE NAME'}
            </div>

            <!-- Employee Details Row 1 -->
            <div style="position: absolute; top: 232px; left: 56px; font-size: 11px; font-weight: 700; color: #111827;">
                ${emp.employeeNumber || 'IF-000'}
            </div>
            <div style="position: absolute; top: 232px; left: 218px; font-size: 11px; font-weight: 700; color: #111827;">
                ${emp.dateJoined || '--'}
            </div>
            <div style="position: absolute; top: 232px; left: 382px; font-size: 11px; font-weight: 700; color: #111827;">
                ${emp.department || 'General'}
            </div>
            <div style="position: absolute; top: 232px; left: 545px; font-size: 11px; font-weight: 700; color: #111827;">
                ${emp.designation || 'Employee'}
            </div>

            <!-- Employee Details Row 2 -->
            <div style="position: absolute; top: 292px; left: 56px; font-size: 11px; font-weight: 700; color: #111827;">
                ${emp.paymentMode || 'Bank Transfer'}
            </div>
            <div style="position: absolute; top: 292px; left: 218px; font-size: 11px; font-weight: 700; color: #111827;">
                ${emp.bankName || 'HDFC Bank'}
            </div>
            <div style="position: absolute; top: 292px; left: 382px; font-size: 11px; font-weight: 700; color: #111827;">
                ${emp.bankIfsc || 'HDFC0001234'}
            </div>
            <div style="position: absolute; top: 292px; left: 545px; font-size: 11px; font-weight: 700; color: #111827;">
                ${emp.bankAccount || 'XXXXXX1234'}
            </div>

            <!-- Employee Details Row 3 (PAN) -->
            <div style="position: absolute; top: 350px; left: 56px; font-size: 11px; font-weight: 700; color: #111827;">
                ${emp.panNumber || 'ABCDE1234F'}
            </div>

            <!-- Salary Details Attendance Row -->
            <div style="position: absolute; top: 442px; left: 56px; font-size: 11px; font-weight: 700; color: #111827;">
                ${att.actualPayableDays ?? 30}
            </div>
            <div style="position: absolute; top: 442px; left: 218px; font-size: 11px; font-weight: 700; color: #111827;">
                ${att.totalWorkingDays ?? 30}
            </div>
            <div style="position: absolute; top: 442px; left: 382px; font-size: 11px; font-weight: 700; color: #111827;">
                ${att.lossOfPayDays ?? 0}
            </div>
            <div style="position: absolute; top: 442px; left: 545px; font-size: 11px; font-weight: 700; color: #111827;">
                ${att.daysPayable ?? 30}
            </div>

            <!-- Earnings Breakdown Amounts -->
            <div style="position: absolute; top: 535px; left: 338px; font-size: 11px; font-weight: 700; color: #111827; text-align: right; width: 45px;">
                ${basic.toLocaleString('en-IN')}
            </div>
            <div style="position: absolute; top: 554px; left: 338px; font-size: 11px; font-weight: 700; color: #111827; text-align: right; width: 45px;">
                ${hra.toLocaleString('en-IN')}
            </div>
            <div style="position: absolute; top: 574px; left: 338px; font-size: 11px; font-weight: 700; color: #111827; text-align: right; width: 45px;">
                ${special.toLocaleString('en-IN')}
            </div>
            <div style="position: absolute; top: 593px; left: 338px; font-size: 11px; font-weight: 700; color: #111827; text-align: right; width: 45px;">
                ${other.toLocaleString('en-IN')}
            </div>
            <div style="position: absolute; top: 614px; left: 338px; font-size: 11.5px; font-weight: 900; color: #000000; text-align: right; width: 45px;">
                ${totalEarnings.toLocaleString('en-IN')}
            </div>

            <!-- Net Salary Payable Numbers -->
            <div style="position: absolute; top: 662px; left: 678px; font-size: 15px; font-weight: 900; color: #000000; text-align: right; width: 60px;">
                ₹${netSalary.toLocaleString('en-IN')}
            </div>

            <!-- Net Salary in Words -->
            <div style="position: absolute; top: 686px; left: 184px; font-size: 11px; font-weight: 800; color: #111827;">
                ${netWords}
            </div>
        </div>
    `;
};

export const downloadPayslipPdf = async (payslip) => {
    try {
        const html = renderPayslipHtml(payslip);
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = html;
        document.body.appendChild(tempDiv);

        const targetEl = document.getElementById("payslip-pdf-container");
        targetEl.style.top = "0";
        targetEl.style.left = "0";
        targetEl.style.zIndex = "-9999";

        const canvas = await html2canvas(targetEl, {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff"
        });

        document.body.removeChild(tempDiv);

        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF("p", "mm", "a4");

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);

        const empName = (payslip.employeeDetails?.name || "Employee").replace(/\s+/g, "_");
        const period = (payslip.periodString || `${payslip.month}_${payslip.year}`).replace(/\s+/g, "_");
        pdf.save(`Payslip_${empName}_${period}.pdf`);
    } catch (err) {
        console.error("Download PDF Error:", err);
        throw err;
    }
};
