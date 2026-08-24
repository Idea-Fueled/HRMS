import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import IFBlackLogo from "../assets/IF-black.png";

// Helper function to format currency with 2 decimal places (e.g., 7,500.00)
const formatAmount = (num) => {
    return (Number(num) || 0).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
};

export const renderPayslipHtml = (payslip) => {
    const period = payslip.periodString || `${payslip.month || "AUG"} ${payslip.year || 2026}`;
    const entity = payslip.companyEntity || "Idea Fueled";
    const isLLP = entity.toLowerCase().includes("llp");

    const emp = payslip.employeeDetails || {};
    const att = payslip.attendanceDetails || {};
    const earn = payslip.earnings || {};

    const basic = Number(earn.basic) || 0;
    const hra = Number(earn.hra) || 0;
    const special = Number(earn.specialAllowance) || 0;
    const other = Number(earn.otherAllowances) || 0;
    const totalEarnings = Number(earn.totalEarnings) || (basic + hra + special + other);

    const netSalary = Number(payslip.netSalaryPayable) || totalEarnings;
    
    // Format net salary in words to "X Rupees Only" (e.g., Ninety Thousand Rupees Only)
    let netWords = payslip.netSalaryInWords || "Zero Rupees Only";
    if (netWords.startsWith("Rupees ")) {
        netWords = netWords.replace(/^Rupees\s+/, "").replace(/\s+Only$/, "") + " Rupees Only";
    }

    return `
        <div id="payslip-pdf-container" style="
            width: 794px;
            background: #ffffff;
            color: #111827;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            padding: 48px 56px;
            box-sizing: border-box;
            border: 1px solid #E5E7EB;
            position: absolute;
            top: -9999px;
            left: -9999px;
        ">
            <!-- HEADER SECTION -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px;">
                <div>
                    <h1 style="font-size: 22px; font-weight: 800; margin: 0; color: #000000; letter-spacing: -0.3px;">PAYSLIP ${period}</h1>
                    <h2 style="font-size: 12px; font-weight: 700; margin: 8px 0 4px 0; color: #1E1E1E; text-transform: uppercase;">${entity}</h2>
                    <p style="font-size: 10px; color: #4B5563; margin: 0; line-height: 1.45; font-weight: 500;">
                        UNIT NO. 805, TOWER B, BESTECH BUSINESS TOWERS, SECTOR 66<br/>
                        MOHALI PUNJAB 160066<br/>
                        ${isLLP ? '<span style="font-weight: 700; color: #111827;">LLPIN: ACZ-5286</span>' : ''}
                    </p>
                </div>
                <div>
                    <img src="${IFBlackLogo}" alt="Idea Fueled" style="height: 46px; width: auto; object-fit: contain;" />
                </div>
            </div>

            <!-- EMPLOYEE NAME HEADER -->
            <div style="margin-bottom: 8px; padding-top: 4px;">
                <h3 style="font-size: 13.5px; font-weight: 700; color: #000000; margin: 0; text-transform: uppercase; letter-spacing: 0.2px;">${emp.name || 'EMPLOYEE NAME'}</h3>
            </div>

            <!-- EMPLOYEE DETAILS TABLE -->
            <div style="border-top: 1px solid #E5E7EB; border-bottom: 1px solid #E5E7EB; padding: 12px 0 16px 0; margin-bottom: 28px;">
                <table style="width: 100%; font-size: 10.5px; border-collapse: collapse; text-align: left;">
                    <!-- ROW 1 -->
                    <tr style="color: #6B7280; font-weight: 500; text-transform: uppercase; font-size: 9.5px; letter-spacing: 0.3px;">
                        <td style="padding: 4px 0; width: 25%;">EMPLOYEE NUMBER</td>
                        <td style="padding: 4px 0; width: 25%;">DATE JOINED</td>
                        <td style="padding: 4px 0; width: 25%;">DEPARTMENT</td>
                        <td style="padding: 4px 0; width: 25%;">DESIGNATION</td>
                    </tr>
                    <tr style="color: #111827; font-weight: 500; font-size: 11px;">
                        <td style="padding-bottom: 14px;">${emp.employeeNumber || 'IF-000'}</td>
                        <td style="padding-bottom: 14px;">${emp.dateJoined || '--'}</td>
                        <td style="padding-bottom: 14px;">${emp.department || 'General'}</td>
                        <td style="padding-bottom: 14px;">${emp.designation || 'Employee'}</td>
                    </tr>
                    <!-- ROW 2 -->
                    <tr style="color: #6B7280; font-weight: 500; text-transform: uppercase; font-size: 9.5px; letter-spacing: 0.3px;">
                        <td style="padding: 4px 0; border-top: 1px solid #F3F4F6; padding-top: 10px;">PAYMENT MODE</td>
                        <td style="padding: 4px 0; border-top: 1px solid #F3F4F6; padding-top: 10px;">BANK</td>
                        <td style="padding: 4px 0; border-top: 1px solid #F3F4F6; padding-top: 10px;">BANK IFSC</td>
                        <td style="padding: 4px 0; border-top: 1px solid #F3F4F6; padding-top: 10px;">BANK ACCOUNT</td>
                    </tr>
                    <tr style="color: #111827; font-weight: 500; font-size: 11px;">
                        <td style="padding-bottom: 14px;">${emp.paymentMode || 'Bank Transfer'}</td>
                        <td style="padding-bottom: 14px;">${emp.bankName || 'HDFC Bank'}</td>
                        <td style="padding-bottom: 14px;">${emp.bankIfsc || 'HDFC0001234'}</td>
                        <td style="padding-bottom: 14px;">${emp.bankAccount || 'XXXXXX1234'}</td>
                    </tr>
                    <!-- ROW 3 (PAN) -->
                    <tr style="color: #6B7280; font-weight: 500; text-transform: uppercase; font-size: 9.5px; letter-spacing: 0.3px;">
                        <td style="padding: 4px 0; border-top: 1px solid #F3F4F6; padding-top: 10px;" colspan="4">PAN NUMBER</td>
                    </tr>
                    <tr style="color: #111827; font-weight: 500; font-size: 11px;">
                        <td colspan="4">${emp.panNumber || 'ABCDE1234F'}</td>
                    </tr>
                </table>
            </div>

            <!-- SALARY DETAILS SECTION -->
            <div style="margin-bottom: 6px;">
                <h3 style="font-size: 12.5px; font-weight: 700; color: #000000; margin: 0; uppercase; letter-spacing: 0.1px;">SALARY DETAILS</h3>
            </div>
            <div style="border-top: 1px solid #E5E7EB; border-bottom: 1px solid #E5E7EB; padding: 12px 0 16px 0; margin-bottom: 28px;">
                <table style="width: 100%; font-size: 10.5px; border-collapse: collapse; text-align: left;">
                    <tr style="color: #6B7280; font-weight: 500; text-transform: uppercase; font-size: 9.5px; letter-spacing: 0.3px;">
                        <td style="padding: 4px 0; width: 25%;">ACTUAL PAYABLE DAYS</td>
                        <td style="padding: 4px 0; width: 25%;">TOTAL WORKING DAYS</td>
                        <td style="padding: 4px 0; width: 25%;">LOSS OF PAY DAYS</td>
                        <td style="padding: 4px 0; width: 25%;">DAYS PAYABLE</td>
                    </tr>
                    <tr style="color: #111827; font-weight: 500; font-size: 11px;">
                        <td>${att.actualPayableDays ?? 30}</td>
                        <td>${att.totalWorkingDays ?? 30}</td>
                        <td>${att.lossOfPayDays ?? 0}</td>
                        <td>${att.daysPayable ?? 30}</td>
                    </tr>
                </table>
            </div>

            <!-- EARNINGS BREAKDOWN SECTION -->
            <div style="display: flex; min-height: 160px; margin-bottom: 28px;">
                <div style="width: 50%; padding-right: 24px;">
                    <h3 style="font-size: 12.5px; font-weight: 700; color: #000000; margin: 0 0 14px 0; text-transform: uppercase; letter-spacing: 0.1px;">EARNINGS</h3>
                    <table style="width: 100%; font-size: 11px; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 6px 0; color: #111827; font-weight: 500;">Basic</td>
                            <td style="padding: 6px 0; text-align: right; color: #111827; font-weight: 500;">${formatAmount(basic)}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0; color: #111827; font-weight: 500;">HRA</td>
                            <td style="padding: 6px 0; text-align: right; color: #111827; font-weight: 500;">${formatAmount(hra)}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0; color: #111827; font-weight: 500;">Special Allowance</td>
                            <td style="padding: 6px 0; text-align: right; color: #111827; font-weight: 500;">${formatAmount(special)}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px 0; color: #111827; font-weight: 500;">Other Allowances</td>
                            <td style="padding: 6px 0; text-align: right; color: #111827; font-weight: 500;">${formatAmount(other)}</td>
                        </tr>
                        <tr style="border-top: 1px solid #E5E7EB;">
                            <td style="padding: 10px 0 0 0; color: #000000; font-weight: 700; font-size: 11.5px;">Total Earnings (A)</td>
                            <td style="padding: 10px 0 0 0; text-align: right; color: #000000; font-weight: 700; font-size: 11.5px;">${formatAmount(totalEarnings)}</td>
                        </tr>
                    </table>
                </div>
                <div style="width: 50%; border-left: 1px solid #F3F4F6; padding-left: 24px;"></div>
            </div>

            <!-- NET SALARY PAYABLE BOX -->
            <div style="background-color: #F8FAFC; padding: 18px 24px; margin-bottom: 28px; border: 1px solid #F1F5F9;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="font-size: 12.5px; font-weight: 700; color: #000000;">Net Salary Payable ( A )</span>
                    <span style="font-size: 14px; font-weight: 700; color: #000000;">${formatAmount(netSalary)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px;">
                    <span style="font-weight: 600; color: #374151;">Net Salary in words</span>
                    <span style="font-weight: 700; color: #000000;">${netWords}</span>
                </div>
            </div>

            <!-- FOOTER NOTES -->
            <div style="font-size: 9.5px; color: #4B5563; line-height: 1.6; font-weight: 500;">
                <strong style="color: #111827; font-weight: 700;">*Note:</strong><br/>
                Other Allowances include transportation, medical, and other miscellaneous allowances.<br/>
                All amounts displayed in this payslip are in <strong style="color: #111827; font-weight: 700;">INR</strong>.<br/>
                This is computer generated statement, does not require signature.
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
