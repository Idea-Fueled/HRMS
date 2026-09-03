import jsPDF from "jspdf";
import html2canvas from "html2canvas";

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
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
            padding: 36px 48px 48px 48px;
            box-sizing: border-box;
            border: 1px solid #E5E7EB;
            position: absolute;
            top: -9999px;
            left: -9999px;
        ">
            <style>
                #payslip-pdf-container, #payslip-pdf-container * {
                    box-sizing: border-box !important;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
                }
                #payslip-pdf-container table {
                    width: 100% !important;
                    border-collapse: collapse !important;
                    table-layout: fixed !important;
                }
                #payslip-pdf-container .ps-label {
                    color: #4B5563 !important;
                    font-weight: 600 !important;
                    text-transform: uppercase !important;
                    font-size: 10px !important;
                    letter-spacing: 0.2px !important;
                    line-height: 1.45 !important;
                    white-space: nowrap !important;
                    padding-bottom: 4px !important;
                    vertical-align: bottom !important;
                }
                #payslip-pdf-container .ps-val {
                    color: #111827 !important;
                    font-weight: 600 !important;
                    font-size: 11.5px !important;
                    line-height: 1.45 !important;
                    white-space: nowrap !important;
                    padding-bottom: 12px !important;
                    vertical-align: top !important;
                }
                #payslip-pdf-container .ps-section-title {
                    font-size: 12px !important;
                    font-weight: 700 !important;
                    color: #000000 !important;
                    margin: 0 !important;
                    text-transform: uppercase !important;
                    letter-spacing: 0.2px !important;
                }
            </style>

            <!-- HEADER SECTION -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px;">
                <div>
                    <h1 style="font-size: 20px; font-weight: 800; margin: 0; color: #000000; letter-spacing: -0.2px; line-height: 1.2;">PAYSLIP ${period}</h1>
                    <h2 style="font-size: 11.5px; font-weight: 700; margin: 6px 0 3px 0; color: #1E1E1E; text-transform: uppercase; line-height: 1.3;">${entity}</h2>
                    <p style="font-size: 9.5px; color: #4B5563; margin: 0; line-height: 1.45; font-weight: 500;">
                        UNIT NO. 805, TOWER B, BESTECH BUSINESS TOWERS, SECTOR 66<br/>
                        MOHALI PUNJAB 160066<br/>
                        ${isLLP ? '<span style="font-weight: 700; color: #111827;">LLPIN: ACZ-5286</span>' : ''}
                    </p>
                </div>
                <div>
                    <svg width="107" height="42" viewBox="0 0 107 42" fill="none" xmlns="http://www.w3.org/2000/svg" style="height: 95px; width: auto; display: block;">
                        <path d="M4.13979 5.96127H21.7356C22.7259 5.96127 23.4169 5.96253 23.938 6.0326C24.4442 6.10068 24.7125 6.22481 24.9034 6.41575C25.0943 6.6067 25.2185 6.87493 25.2865 7.3811C25.3566 7.90228 25.3579 8.59317 25.3579 9.58355V27.1793C25.3579 28.1697 25.3566 28.8606 25.2865 29.3818C25.2185 29.8879 25.0943 30.1562 24.9034 30.3471C24.7125 30.5381 24.4442 30.6622 23.938 30.7303C23.4169 30.8003 22.7259 30.8016 21.7356 30.8016H13.7063C11.0714 30.8016 9.64659 30.7964 8.30078 31.2126C6.95497 31.6289 5.78204 32.4382 3.60718 33.926L0.517509 36.0387V9.58355C0.517509 8.59317 0.518771 7.90228 0.588844 7.3811C0.65692 6.87491 0.781046 6.6067 0.971995 6.41575C1.16294 6.2248 1.43115 6.10067 1.93734 6.0326C2.45853 5.96253 3.14941 5.96127 4.13979 5.96127Z" fill="#1D71B8" stroke="#1D1D1B" stroke-width="1.03503"/>
                        <path d="M36.3955 16.3182V26.5H34.2428V16.3182H36.3955ZM40.3408 26.6243C39.7608 26.6243 39.2355 26.4751 38.7648 26.1768C38.2975 25.8752 37.9263 25.4328 37.6512 24.8494C37.3794 24.2628 37.2435 23.5436 37.2435 22.6918C37.2435 21.8168 37.3844 21.0893 37.6661 20.5092C37.9478 19.9259 38.3224 19.4901 38.7897 19.2017C39.2603 18.91 39.7757 18.7642 40.3359 18.7642C40.7634 18.7642 41.1197 18.8371 41.4047 18.983C41.6931 19.1255 41.9251 19.3045 42.1008 19.5199C42.2797 19.732 42.4156 19.9408 42.5084 20.1463H42.5731V16.3182H44.686V26.5H42.5979V25.277H42.5084C42.409 25.4891 42.2681 25.6996 42.0859 25.9084C41.9069 26.1139 41.6732 26.2846 41.3849 26.4205C41.0998 26.5563 40.7518 26.6243 40.3408 26.6243ZM41.012 24.9389C41.3534 24.9389 41.6417 24.8461 41.877 24.6605C42.1157 24.4716 42.298 24.2081 42.4239 23.87C42.5532 23.532 42.6178 23.1359 42.6178 22.6818C42.6178 22.2277 42.5548 21.8333 42.4289 21.4986C42.3029 21.1638 42.1207 20.9053 41.882 20.723C41.6434 20.5407 41.3534 20.4496 41.012 20.4496C40.664 20.4496 40.3707 20.544 40.132 20.733C39.8934 20.9219 39.7127 21.1837 39.5901 21.5185C39.4675 21.8532 39.4062 22.241 39.4062 22.6818C39.4062 23.1259 39.4675 23.5187 39.5901 23.8601C39.7161 24.1982 39.8967 24.4633 40.132 24.6555C40.3707 24.8445 40.664 24.9389 41.012 24.9389ZM49.3074 26.6491C48.5219 26.6491 47.8458 26.4901 47.279 26.1719C46.7155 25.8504 46.2814 25.3963 45.9764 24.8097C45.6715 24.2197 45.5191 23.522 45.5191 22.7166C45.5191 21.9311 45.6715 21.2417 45.9764 20.6484C46.2814 20.0552 46.7106 19.5928 47.2641 19.2614C47.8209 18.9299 48.4738 18.7642 49.2229 18.7642C49.7267 18.7642 50.1957 18.8454 50.6298 19.0078C51.0673 19.1669 51.4485 19.4072 51.7733 19.7287C52.1014 20.0502 52.3566 20.4545 52.5389 20.9418C52.7212 21.4257 52.8124 21.9924 52.8124 22.642V23.2237H46.3642V21.9112H50.8188C50.8188 21.6063 50.7525 21.3362 50.6199 21.1009C50.4873 20.8655 50.3034 20.6816 50.0681 20.549C49.8361 20.4131 49.5659 20.3452 49.2577 20.3452C48.9362 20.3452 48.6512 20.4197 48.4026 20.5689C48.1573 20.7147 47.9651 20.9119 47.8259 21.1605C47.6867 21.4058 47.6154 21.6792 47.6121 21.9808V23.2287C47.6121 23.6065 47.6817 23.933 47.8209 24.2081C47.9634 24.4832 48.1639 24.6953 48.4225 24.8445C48.681 24.9936 48.9876 25.0682 49.3422 25.0682C49.5775 25.0682 49.793 25.035 49.9885 24.9688C50.1841 24.9025 50.3514 24.803 50.4906 24.6705C50.6298 24.5379 50.7359 24.3755 50.8088 24.1832L52.7676 24.3125C52.6682 24.7831 52.4644 25.1941 52.1561 25.5455C51.8512 25.8935 51.4568 26.1652 50.9729 26.3608C50.4923 26.553 49.9371 26.6491 49.3074 26.6491ZM55.772 26.6442C55.2848 26.6442 54.8506 26.5597 54.4695 26.3906C54.0883 26.2183 53.7867 25.9647 53.5647 25.63C53.3459 25.2919 53.2365 24.871 53.2365 24.3672C53.2365 23.9429 53.3144 23.5866 53.4702 23.2983C53.626 23.0099 53.8381 22.7779 54.1066 22.6023C54.375 22.4266 54.6799 22.294 55.0213 22.2045C55.366 22.1151 55.7273 22.0521 56.1051 22.0156C56.5493 21.9692 56.9072 21.9261 57.179 21.8864C57.4508 21.8433 57.648 21.7803 57.7706 21.6974C57.8932 21.6146 57.9546 21.492 57.9546 21.3295V21.2997C57.9546 20.9848 57.8551 20.7412 57.6563 20.5689C57.4607 20.3965 57.1823 20.3104 56.821 20.3104C56.4399 20.3104 56.1366 20.3949 55.9112 20.5639C55.6859 20.7296 55.5367 20.9384 55.4638 21.1903L53.505 21.0312C53.6044 20.5672 53.8 20.1662 54.0916 19.8281C54.3833 19.4867 54.7595 19.2249 55.2202 19.0426C55.6842 18.857 56.2211 18.7642 56.831 18.7642C57.2552 18.7642 57.6612 18.8139 58.049 18.9134C58.4401 19.0128 58.7865 19.1669 59.0881 19.3757C59.393 19.5845 59.6333 19.853 59.809 20.1811C59.9846 20.5059 60.0725 20.8954 60.0725 21.3494V26.5H58.0639V25.4411H58.0043C57.8816 25.6797 57.7176 25.8902 57.5121 26.0724C57.3066 26.2514 57.0597 26.3923 56.7713 26.495C56.483 26.5945 56.1499 26.6442 55.772 26.6442ZM56.3786 25.1825C56.6901 25.1825 56.9652 25.1212 57.2039 24.9986C57.4425 24.8726 57.6298 24.7036 57.7656 24.4915C57.9015 24.2794 57.9695 24.0391 57.9695 23.7706V22.9602C57.9032 23.0033 57.812 23.0431 57.696 23.0795C57.5834 23.1127 57.4557 23.1442 57.3132 23.174C57.1707 23.2005 57.0282 23.2254 56.8857 23.2486C56.7432 23.2685 56.6139 23.2867 56.4979 23.3033C56.2493 23.3977 56.0322 23.3977 55.8466 23.4773C55.661 23.5568 55.5168 23.6645 55.4141 23.8004C55.3113 23.933 55.26 24.0987 55.26 24.2976C55.26 24.5859 55.3644 24.8063 55.5732 24.9588C55.7853 25.108 56.0538 25.1825 56.3786 25.1825ZM63.7956 26.5V16.3182H70.5371V18.093H65.9483V20.5192H70.0896V22.294H65.9483V26.5H63.7956ZM75.7638 23.2486V18.8636H77.8817V26.5H75.8483V25.1129H75.7687C75.5964 25.5604 75.3097 25.92 74.9086 26.1918C74.5109 26.4635 74.0254 26.5994 73.452 26.5994C72.9416 26.5994 72.4925 26.4834 72.1047 26.2514C71.7169 26.0194 71.4136 25.6896 71.1949 25.2621C70.9794 24.8345 70.8701 24.3224 70.8667 23.7259V18.8636H72.9846V23.348C72.988 23.7988 73.1089 24.1551 73.3476 24.4169C73.5862 24.6787 73.906 24.8097 74.3071 24.8097C74.5623 24.8097 74.8009 24.7517 75.023 24.6357C75.2451 24.5163 75.424 24.3407 75.5599 24.1087C75.6991 23.8767 75.7671 23.59 75.7638 23.2486ZM82.4558 26.6491C81.6703 26.6491 80.9942 26.4901 80.4274 26.1719C79.864 25.8504 79.4298 25.3963 79.1249 24.8097C78.82 24.2197 78.6675 23.522 78.6675 22.7166C78.6675 21.9311 78.82 21.2417 79.1249 20.6484C79.4298 20.0552 79.859 19.5928 80.4125 19.2614C80.9693 18.9299 81.6223 18.7642 82.3713 18.7642C82.8751 18.7642 83.3441 18.8454 83.7783 19.0078C84.2158 19.1669 84.5969 19.4072 84.9218 19.7287C85.2499 20.0502 85.5051 20.4545 85.6874 20.9418C85.8697 21.4257 85.9608 21.9924 85.9608 22.642V23.2237H79.5127V21.9112H83.9672C83.9672 21.6063 83.9009 21.3362 83.7683 21.1009C83.6358 20.8655 83.4518 20.6816 83.2165 20.549C82.9845 20.4131 82.7144 20.3452 82.4061 20.3452C82.0846 20.3452 81.7996 20.4197 81.551 20.5689C81.3057 20.7147 81.1135 20.9119 80.9743 21.1605C80.8351 21.4058 80.7638 21.6792 80.7605 21.9808V23.2287C80.7605 23.6065 80.8301 23.933 80.9693 24.2081C81.1119 24.4832 81.3124 24.6953 81.5709 24.8445C81.8294 24.9936 82.136 25.0682 82.4906 25.0682C82.726 25.0682 82.9414 25.035 83.137 24.9688C83.3325 24.9025 83.4999 24.803 83.6391 24.6705C83.7783 24.5379 83.8843 24.3755 83.9573 24.1832L85.9161 24.3125C85.8166 24.7831 85.6128 25.1941 85.3046 25.5455C84.9996 25.8935 84.6052 26.1652 84.1213 26.3608C83.6407 26.553 83.0856 26.6491 82.4558 26.6491ZM88.8608 16.3182V26.5H86.7429V16.3182H88.8608ZM93.4375 26.6491C92.652 26.6491 91.9758 26.4901 91.4091 26.1719C90.8456 25.8504 90.4114 25.3963 90.1065 24.8097C89.8016 24.2197 89.6491 23.522 89.6491 22.7166C89.6491 21.9311 89.8016 21.2417 90.1065 20.6484C90.4114 20.0552 90.8407 19.5928 91.3942 19.2614C91.951 18.9299 92.6039 18.7642 93.353 18.7642C93.8568 18.7642 94.3257 18.8454 94.7599 19.0078C95.1974 19.1669 95.5786 19.4072 95.9034 19.7287C96.2315 20.0502 96.4867 20.4545 96.669 20.9418C96.8513 21.4257 96.9425 21.9924 96.9425 22.642V23.2237H90.4943V21.9112H94.9488C94.9488 21.6063 94.8826 21.3362 94.75 21.1009C94.6174 20.8655 94.4335 20.6816 94.1981 20.549C93.9661 20.4131 93.696 20.3452 93.3878 20.3452C93.0663 20.3452 92.7812 20.4197 92.5327 20.5689C92.2874 20.7147 92.0952 20.9119 91.9559 21.1605C91.8167 21.4058 91.7455 21.6792 91.7422 21.9808V23.2287C91.7422 23.6065 91.8118 23.933 91.951 24.2081C92.0935 24.4832 92.294 24.6953 92.5525 24.8445C92.8111 24.9936 93.1176 25.0682 93.4723 25.0682C93.7076 25.0682 93.923 25.035 94.1186 24.9688C94.3141 24.9025 94.4815 24.803 94.6207 24.6705C94.7599 24.5379 94.866 24.3755 94.9389 24.1832L96.8977 24.3125C96.7983 24.7831 96.5944 25.1941 96.2862 25.5455C95.9813 25.8935 95.5869 26.1652 95.103 26.3608C94.6224 26.553 94.0672 26.6491 93.4375 26.6491ZM100.538 26.6243C99.9585 26.6243 99.4331 26.4751 98.9625 26.1768C98.4952 25.8752 98.1239 25.4328 97.8488 24.8494C97.5771 24.2628 97.4412 23.5436 97.4412 22.6918C97.4412 21.8168 97.582 21.0893 97.8638 20.5092C98.1455 19.9259 98.52 19.4901 98.9873 19.2017C99.458 18.91 99.9734 18.7642 100.534 18.7642C100.961 18.7642 101.317 18.8371 101.602 18.983C101.891 19.1255 102.123 19.3045 102.298 19.5199C102.477 19.732 102.613 19.9408 102.508 20.1463H102.771V16.3182H104.884V26.5H102.796V25.277H102.706C102.607 25.4891 102.466 25.6996 102.284 25.9084C102.105 26.1139 101.871 26.2846 101.583 26.4205C101.297 26.5563 100.949 26.6243 100.538 26.6243ZM101.21 24.9389C101.551 24.9389 101.839 24.8461 102.075 24.6605C102.313 24.4716 102.496 24.2081 102.622 23.87C102.751 23.532 102.815 23.1359 102.815 22.6818C102.815 22.2277 102.752 21.8333 102.627 21.4986C102.501 21.1638 102.318 20.9053 102.08 20.723C101.841 20.5407 101.551 20.4496 101.21 20.4496C100.862 20.4496 100.568 20.544 100.33 20.733C100.091 20.9219 99.9104 21.1837 99.7878 21.5185C99.6651 21.8532 99.6038 22.241 99.6038 22.6818C99.6038 23.1259 99.6651 23.5187 99.7878 23.8601C99.9137 24.1982 100.094 24.4633 100.33 24.6555C100.568 24.8445 100.862 24.9389 101.21 24.9389Z" fill="#1D71B8"/>
                        <path d="M13.6916 10.7002C15.856 12.6056 17.0165 15.6357 16.4852 18.7671C16.3681 19.4576 16.1748 20.114 15.9168 20.729C16.7057 21.5113 17.3264 22.5259 17.674 23.7551C17.7291 23.95 17.568 24.1372 17.3756 24.1019L14.061 23.4945C13.9757 23.5795 13.8878 23.6615 13.7993 23.7425C13.9663 24.0289 14.0395 24.3764 13.9791 24.7322C13.847 25.5111 13.1323 26.0311 12.3829 25.8939L10.1279 25.4806C9.3785 25.3433 8.87803 24.6005 9.01023 23.8216C9.0601 23.5277 9.19263 23.2706 9.37904 23.0718C9.29223 22.9144 9.20983 22.7544 9.13265 22.5914L6.22363 22.0583C6.03132 22.0229 5.94146 21.7898 6.05732 21.6263C6.69329 20.729 7.47013 20.0577 8.31886 19.5987C8.25112 18.8453 8.2783 18.0696 8.41096 17.2875C8.94229 14.1558 11.0303 11.7212 13.6916 10.7002Z" fill="#FFED00"/>
                        <path d="M12.6586 17.077C13.3357 17.201 13.9814 16.7312 14.1007 16.0275C14.2201 15.3238 13.768 14.6528 13.091 14.5287C12.4139 14.4046 11.7682 14.8745 11.6489 15.5782C11.5295 16.2819 11.9816 16.9529 12.6586 17.077Z" fill="#1D71B8"/>
                    </svg>
                </div>
            </div>

            <!-- EMPLOYEE NAME HEADER -->
            <div style="margin-bottom: 6px; padding-top: 2px;">
                <h3 style="font-size: 13.5px; font-weight: 700; color: #000000; margin: 0; text-transform: uppercase; letter-spacing: 0.2px;">${emp.name || 'EMPLOYEE NAME'}</h3>
            </div>

            <!-- EMPLOYEE DETAILS TABLE -->
            <div style="border-top: 1px solid #E5E7EB; border-bottom: 1px solid #E5E7EB; padding: 10px 0 12px 0; margin-bottom: 24px;">
                <table>
                    <colgroup>
                        <col style="width: 24%;">
                        <col style="width: 20%;">
                        <col style="width: 28%;">
                        <col style="width: 28%;">
                    </colgroup>
                    <!-- ROW 1 -->
                    <tr>
                        <td class="ps-label">EMPLOYEE NUMBER</td>
                        <td class="ps-label">DATE JOINED</td>
                        <td class="ps-label">DEPARTMENT</td>
                        <td class="ps-label">DESIGNATION</td>
                    </tr>
                    <tr>
                        <td class="ps-val">${emp.employeeNumber || 'IF-000'}</td>
                        <td class="ps-val">${emp.dateJoined || '--'}</td>
                        <td class="ps-val">${emp.department || 'General'}</td>
                        <td class="ps-val">${emp.designation || 'Employee'}</td>
                    </tr>
                    <!-- ROW 2 -->
                    <tr>
                        <td class="ps-label" style="border-top: 1px solid #F3F4F6; padding-top: 10px !important;">PAYMENT MODE</td>
                        <td class="ps-label" style="border-top: 1px solid #F3F4F6; padding-top: 10px !important;">BANK</td>
                        <td class="ps-label" style="border-top: 1px solid #F3F4F6; padding-top: 10px !important;">BANK IFSC</td>
                        <td class="ps-label" style="border-top: 1px solid #F3F4F6; padding-top: 10px !important;">BANK ACCOUNT</td>
                    </tr>
                    <tr>
                        <td class="ps-val">${emp.paymentMode || 'Bank Transfer'}</td>
                        <td class="ps-val">${emp.bankName || 'HDFC Bank'}</td>
                        <td class="ps-val">${emp.bankIfsc || 'HDFC0001234'}</td>
                        <td class="ps-val">${emp.bankAccount || 'XXXXXX1234'}</td>
                    </tr>
                    <!-- ROW 3 (PAN) -->
                    <tr>
                        <td class="ps-label" style="border-top: 1px solid #F3F4F6; padding-top: 10px !important;" colspan="4">PAN NUMBER</td>
                    </tr>
                    <tr>
                        <td class="ps-val" colspan="4" style="padding-bottom: 2px !important;">${emp.panNumber || 'ABCDE1234F'}</td>
                    </tr>
                </table>
            </div>

            <!-- SALARY DETAILS SECTION -->
            <div style="margin-bottom: 6px;">
                <h3 class="ps-section-title">SALARY DETAILS</h3>
            </div>
            <div style="border-top: 1px solid #E5E7EB; border-bottom: 1px solid #E5E7EB; padding: 10px 0 12px 0; margin-bottom: 24px;">
                <table>
                    <colgroup>
                        <col style="width: 28%;">
                        <col style="width: 28%;">
                        <col style="width: 22%;">
                        <col style="width: 22%;">
                    </colgroup>
                    <tr>
                        <td class="ps-label">ACTUAL PAYABLE DAYS</td>
                        <td class="ps-label">TOTAL WORKING DAYS</td>
                        <td class="ps-label">LOSS OF PAY DAYS</td>
                        <td class="ps-label">DAYS PAYABLE</td>
                    </tr>
                    <tr>
                        <td class="ps-val" style="padding-bottom: 2px !important;">${att.actualPayableDays ?? 30}</td>
                        <td class="ps-val" style="padding-bottom: 2px !important;">${att.totalWorkingDays ?? 30}</td>
                        <td class="ps-val" style="padding-bottom: 2px !important;">${att.lossOfPayDays ?? 0}</td>
                        <td class="ps-val" style="padding-bottom: 2px !important;">${att.daysPayable ?? 30}</td>
                    </tr>
                </table>
            </div>

            <!-- EARNINGS BREAKDOWN SECTION -->
            <div style="display: flex; min-height: 150px; margin-bottom: 24px;">
                <div style="width: 50%; padding-right: 24px;">
                    <h3 class="ps-section-title" style="margin-bottom: 12px !important;">EARNINGS</h3>
                    <table style="width: 100%;">
                        <tr>
                            <td style="padding: 5px 0; color: #111827; font-weight: 500; font-size: 11px !important;">Basic</td>
                            <td style="padding: 5px 0; text-align: right; color: #111827; font-weight: 600; font-size: 11px !important;">${formatAmount(basic)}</td>
                        </tr>
                        <tr>
                            <td style="padding: 5px 0; color: #111827; font-weight: 500; font-size: 11px !important;">HRA</td>
                            <td style="padding: 5px 0; text-align: right; color: #111827; font-weight: 600; font-size: 11px !important;">${formatAmount(hra)}</td>
                        </tr>
                        <tr>
                            <td style="padding: 5px 0; color: #111827; font-weight: 500; font-size: 11px !important;">Special Allowance</td>
                            <td style="padding: 5px 0; text-align: right; color: #111827; font-weight: 600; font-size: 11px !important;">${formatAmount(special)}</td>
                        </tr>
                        <tr>
                            <td style="padding: 5px 0; color: #111827; font-weight: 500; font-size: 11px !important;">Other Allowances</td>
                            <td style="padding: 5px 0; text-align: right; color: #111827; font-weight: 600; font-size: 11px !important;">${formatAmount(other)}</td>
                        </tr>
                        <tr style="border-top: 1px solid #E5E7EB;">
                            <td style="padding: 8px 0 0 0; color: #000000; font-weight: 700; font-size: 11.5px !important;">Total Earnings (A)</td>
                            <td style="padding: 8px 0 0 0; text-align: right; color: #000000; font-weight: 700; font-size: 11.5px !important;">${formatAmount(totalEarnings)}</td>
                        </tr>
                    </table>
                </div>
                <div style="width: 50%; border-left: 1px solid #F3F4F6; padding-left: 24px;"></div>
            </div>

            <!-- NET SALARY PAYABLE BOX -->
            <div style="background-color: #F8FAFC; padding: 16px 20px; margin-bottom: 24px; border: 1px solid #F1F5F9; border-radius: 4px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <span style="font-size: 12px !important; font-weight: 700; color: #000000;">Net Salary Payable ( A )</span>
                    <span style="font-size: 14px !important; font-weight: 800; color: #000000;">${formatAmount(netSalary)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 10.5px !important;">
                    <span style="font-weight: 600; color: #4B5563; font-size: 10.5px !important;">Net Salary in words</span>
                    <span style="font-weight: 700; color: #000000; font-size: 10.5px !important;">${netWords}</span>
                </div>
            </div>

            <!-- FOOTER NOTES -->
            <div style="font-size: 9.5px !important; color: #4B5563; line-height: 1.55; font-weight: 500;">
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

        if (document.fonts?.ready) {
            await document.fonts.ready;
        }
        await new Promise((res) => setTimeout(res, 50));

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
