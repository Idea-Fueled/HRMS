import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import IFBlackLogo from "../assets/IF-black.png";

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
    const netWords = payslip.netSalaryInWords || "Rupees Zero Only";

    return `
        <div id="payslip-pdf-container" style="
            width: 794px;
            background: #ffffff;
            color: #1E1E1E;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            padding: 48px 56px;
            box-sizing: border-box;
            border: 1px solid #E5E7EB;
            position: absolute;
            top: -9999px;
            left: -9999px;
        ">
            <!-- HEADER SECTION -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px;">
                <div>
                    <h1 style="font-size: 24px; font-weight: 900; margin: 0; color: #000000; letter-spacing: -0.3px;">PAYSLIP ${period}</h1>
                    <h2 style="font-size: 13px; font-weight: 800; margin: 10px 0 4px 0; color: #1E1E1E; text-transform: uppercase;">${entity}</h2>
                    <p style="font-size: 10.5px; color: #4B5563; margin: 0; line-height: 1.45; font-weight: 500;">
                        UNIT NO. 805, TOWER B, BESTECH BUSINESS TOWERS, SECTOR 66<br/>
                        MOHALI PUNJAB 160066<br/>
                        ${isLLP ? '<span style="font-weight: 700; color: #111827;">LLPIN: ACZ-5286</span>' : ''}
                    </p>
                </div>
                <div>
                    <img src="${IFBlackLogo}" alt="Idea Fueled" style="height: 52px; width: auto; object-fit: contain;" />
                </div>
            </div>

            <!-- EMPLOYEE NAME BAR -->
            <div style="border-top: 2px solid #000000; padding-top: 10px; margin-bottom: 12px;">
                <h3 style="font-size: 14px; font-weight: 900; color: #000000; margin: 0; text-transform: uppercase; letter-spacing: 0.2px;">${emp.name || 'EMPLOYEE NAME'}</h3>
            </div>

            <!-- EMPLOYEE DETAILS TABLE -->
            <div style="margin-bottom: 24px;">
                <table style="width: 100%; font-size: 11px; border-collapse: collapse; text-align: left;">
                    <tr style="color: #6B7280; font-weight: 500;">
                        <td style="padding: 4px 0; width: 25%;">Employee Number</td>
                        <td style="padding: 4px 0; width: 25%;">Date Joined</td>
                        <td style="padding: 4px 0; width: 25%;">Department</td>
                        <td style="padding: 4px 0; width: 25%;">Designation</td>
                    </tr>
                    <tr style="color: #111827; font-weight: 700;">
                        <td style="padding-bottom: 14px;">${emp.employeeNumber || 'IF-000'}</td>
                        <td style="padding-bottom: 14px;">${emp.dateJoined || '--'}</td>
                        <td style="padding-bottom: 14px;">${emp.department || 'General'}</td>
                        <td style="padding-bottom: 14px;">${emp.designation || 'Employee'}</td>
                    </tr>
                    <tr style="color: #6B7280; font-weight: 500;">
                        <td style="padding: 4px 0;">Payment Mode</td>
                        <td style="padding: 4px 0;">Bank</td>
                        <td style="padding: 4px 0;">Bank IFSC</td>
                        <td style="padding: 4px 0;">Bank Account</td>
                    </tr>
                    <tr style="color: #111827; font-weight: 700;">
                        <td style="padding-bottom: 14px;">${emp.paymentMode || 'Bank Transfer'}</td>
                        <td style="padding-bottom: 14px;">${emp.bankName || 'HDFC Bank'}</td>
                        <td style="padding-bottom: 14px;">${emp.bankIfsc || 'HDFC0001234'}</td>
                        <td style="padding-bottom: 14px;">${emp.bankAccount || 'XXXXXX1234'}</td>
                    </tr>
                    <tr style="color: #6B7280; font-weight: 500;">
                        <td style="padding: 4px 0;" colspan="4">PAN Number</td>
                    </tr>
                    <tr style="color: #111827; font-weight: 700;">
                        <td colspan="4">${emp.panNumber || 'ABCDE1234F'}</td>
                    </tr>
                </table>
            </div>

            <!-- SALARY DETAILS SECTION -->
            <div style="border-top: 2px solid #000000; padding-top: 10px; margin-bottom: 12px;">
                <h3 style="font-size: 13px; font-weight: 900; color: #000000; margin: 0; text-transform: uppercase; letter-spacing: 0.2px;">SALARY DETAILS</h3>
            </div>
            <div style="margin-bottom: 24px;">
                <table style="width: 100%; font-size: 11px; border-collapse: collapse; text-align: left;">
                    <tr style="color: #6B7280; font-weight: 500;">
                        <td style="padding: 4px 0; width: 25%;">Actual Payable Days</td>
                        <td style="padding: 4px 0; width: 25%;">Total Working Days</td>
                        <td style="padding: 4px 0; width: 25%;">Loss Of Pay Days</td>
                        <td style="padding: 4px 0; width: 25%;">Days Payable</td>
                    </tr>
                    <tr style="color: #111827; font-weight: 700;">
                        <td>${att.actualPayableDays ?? 30}</td>
                        <td>${att.totalWorkingDays ?? 30}</td>
                        <td>${att.lossOfPayDays ?? 0}</td>
                        <td>${att.daysPayable ?? 30}</td>
                    </tr>
                </table>
            </div>

            <!-- EARNINGS BREAKDOWN SECTION -->
            <div style="display: flex; min-height: 160px; border-top: 1px solid #E5E7EB; border-bottom: 1px solid #E5E7EB; padding: 16px 0; margin-bottom: 24px;">
                <div style="width: 50%; padding-right: 24px;">
                    <h3 style="font-size: 13px; font-weight: 900; color: #000000; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 0.2px;">EARNINGS</h3>
                    <table style="width: 100%; font-size: 11.5px; border-collapse: collapse;">
                        <tr>
                            <td style="padding: 4px 0; color: #111827; font-weight: 700;">Basic</td>
                            <td style="padding: 4px 0; text-align: right; color: #111827; font-weight: 700;">${basic.toLocaleString('en-IN')}</td>
                        </tr>
                        <tr>
                            <td style="padding: 4px 0; color: #111827; font-weight: 700;">HRA</td>
                            <td style="padding: 4px 0; text-align: right; color: #111827; font-weight: 700;">${hra.toLocaleString('en-IN')}</td>
                        </tr>
                        <tr>
                            <td style="padding: 4px 0; color: #111827; font-weight: 700;">Special Allowance</td>
                            <td style="padding: 4px 0; text-align: right; color: #111827; font-weight: 700;">${special.toLocaleString('en-IN')}</td>
                        </tr>
                        <tr>
                            <td style="padding: 4px 0; color: #111827; font-weight: 700;">Other Allowances</td>
                            <td style="padding: 4px 0; text-align: right; color: #111827; font-weight: 700;">${other.toLocaleString('en-IN')}</td>
                        </tr>
                        <tr style="border-top: 1px solid #E5E7EB; font-weight: 900;">
                            <td style="padding: 8px 0 0 0; color: #000000; font-size: 12px;">Total Earnings</td>
                            <td style="padding: 8px 0 0 0; text-align: right; color: #000000; font-size: 12px;">${totalEarnings.toLocaleString('en-IN')}</td>
                        </tr>
                    </table>
                </div>
                <div style="width: 50%; border-left: 1px solid #E5E7EB; padding-left: 24px;"></div>
            </div>

            <!-- NET SALARY PAYABLE BOX -->
            <div style="background-color: #F8FAFC; border-radius: 8px; padding: 18px 24px; margin-bottom: 24px; border: 1px solid #F1F5F9;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <span style="font-size: 13px; font-weight: 900; color: #000000;">Net Salary Payable</span>
                    <span style="font-size: 16px; font-weight: 900; color: #000000;">₹${netSalary.toLocaleString('en-IN')}</span>
                </div>
                <div style="font-size: 11.5px; font-weight: 600; color: #374151;">
                    Net Salary in words: <span style="font-weight: 800; color: #111827;">${netWords}</span>
                </div>
            </div>

            <!-- FOOTER NOTES -->
            <div style="font-size: 10px; color: #4B5563; line-height: 1.6; font-weight: 500;">
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
