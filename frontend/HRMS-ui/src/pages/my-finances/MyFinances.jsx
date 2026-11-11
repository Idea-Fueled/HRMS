import React, { useState, useEffect } from "react";
import { 
    Wallet, 
    CreditCard, 
    Building2, 
    ShieldCheck, 
    FileText, 
    Download, 
    CheckCircle2, 
    Calendar,
    Percent,
    Building
} from "lucide-react";
import { toast } from "sonner";
import { getPayslips, notifyPayslipDownload } from "../../services/payroll.service";
import { useAuth } from "../../context/AuthContext";
import { downloadPayslipPdf } from "../../utils/payslipPdfGenerator";
import { SkeletonLoader } from "../../components/SharedComponents";

const Card = ({ children, className = "" }) => (
    <div className={`bg-white border border-gray-200/80 rounded-[16px] shadow-sm flex flex-col overflow-hidden ${className}`}>
        {children}
    </div>
);

const CardHeader = ({ icon: Icon, title, action }) => (
    <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-gray-100 bg-gray-50/40">
        <div className="flex items-center gap-2.5 min-w-0">
            {Icon && (
                <div className="w-8 h-8 rounded-lg bg-blue-50/80 flex items-center justify-center border border-blue-100/60 shrink-0">
                    <Icon className="w-4 h-4 text-[#2D79C7]" strokeWidth={2.2} />
                </div>
            )}
            <h2 className="text-gray-900 text-xs sm:text-sm font-bold tracking-tight truncate">{title}</h2>
        </div>
        {action && <div className="shrink-0">{action}</div>}
    </div>
);

const MiniStatCard = ({ title, value, subtext, icon: Icon, iconBg = "bg-blue-50 text-[#2D79C7] border-blue-100" }) => (
    <div className="bg-white border border-gray-200/80 rounded-[16px] p-4 sm:p-5 flex items-center justify-between shadow-sm hover:border-gray-300 transition-all gap-3">
        <div className="min-w-0 flex-1">
            <span className="text-gray-400 text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider block truncate">{title}</span>
            <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-gray-900 text-xl sm:text-2xl font-black tracking-tight truncate">{value}</span>
            </div>
            {subtext && (
                <span className="text-[10.5px] sm:text-[11px] font-medium text-gray-500 mt-1 block truncate">
                    {subtext}
                </span>
            )}
        </div>
        {Icon && (
            <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center border shrink-0 ${iconBg}`}>
                <Icon className="w-5 h-5 sm:w-5.5 sm:h-5.5" strokeWidth={2} />
            </div>
        )}
    </div>
);

const MyFinances = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState("My Pay");
    const [loading, setLoading] = useState(true);
    const [payslips, setPayslips] = useState([]);

    useEffect(() => {
        if (user) {
            fetchUserPayslips();
        }
    }, [user]);

    const fetchUserPayslips = async () => {
        setLoading(true);
        try {
            const empId = user?._id || user?.id;
            const res = await getPayslips(empId ? { employeeId: empId } : {});
            if (res.data?.success) {
                setPayslips(res.data.payslips || []);
            }
        } catch (err) {
            console.error("Error loading payslips:", err);
            toast.error("Failed to load payslips.");
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadPdf = async (payslip) => {
        try {
            toast.loading("Generating PDF...", { id: "pdf-down" });
            await downloadPayslipPdf(payslip);
            toast.success("Payslip PDF downloaded!", { id: "pdf-down" });

            // Notify Global Admins if current user is not a global_admin
            if (user?.role !== "global_admin") {
                notifyPayslipDownload({
                    payslipId: payslip._id,
                    periodString: payslip.periodString || `${payslip.month || ""} ${payslip.year || ""}`.trim(),
                    month: payslip.month,
                    year: payslip.year,
                }).catch((err) => console.warn("Failed to notify global admins of payslip download:", err));
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to generate PDF download.", { id: "pdf-down" });
        }
    };

    const companyEntity = user?.companyEntity || "Idea Fueled";
    const isLLP = companyEntity.toLowerCase().includes("llp");

    const salaryStructure = user?.salaryStructure || {};
    const basic = Number(salaryStructure.basic) || 0;
    const hra = Number(salaryStructure.hra) || 0;
    const medicalAllowance = Number(salaryStructure.medicalAllowance) || 0;
    const conveyanceAllowance = Number(salaryStructure.conveyanceAllowance || salaryStructure.conveyance) || 0;
    const specialAllowance = Number(salaryStructure.specialAllowance) || 0;
    const otherAllowances = Number(salaryStructure.otherAllowances) || 0;

    // Default 50% Basic, 20% HRA, 10% Medical, 10% Conveyance, 10% Special
    const baseGross = Number(salaryStructure.grossMonthly || salaryStructure.monthlySalary) || (basic + hra + specialAllowance + otherAllowances + medicalAllowance + conveyanceAllowance);
    const displayBasic = basic || (baseGross > 0 ? Math.round(baseGross * 0.50) : 0);
    const displayHra = hra || (baseGross > 0 ? Math.round(baseGross * 0.20) : 0);
    const displayMedical = medicalAllowance || (baseGross > 0 ? Math.round(baseGross * 0.10) : 0);
    const displayConveyance = conveyanceAllowance || (baseGross > 0 ? Math.round(baseGross * 0.10) : 0);
    const displaySpecial = specialAllowance || (baseGross > 0 ? Math.round(baseGross * 0.10) : 0);
    const totalEarnings = displayBasic + displayHra + displayMedical + displayConveyance + displaySpecial;
    const annualCtc = Number(salaryStructure.ctc) || (totalEarnings > 0 ? totalEarnings * 12 : 0);

    const lastPayslip = payslips.length > 0 ? payslips[0] : null;

    if (loading) {
        return (
            <div className="space-y-6 py-6">
                <SkeletonLoader type="stat" />
                <SkeletonLoader type="table" rows={5} />
            </div>
        );
    }

    return (
        <div className="space-y-4 sm:space-y-6 select-none animate-fadeIn pb-10">
            {/* Header & Tabs */}
            <div className="bg-white border border-gray-200/80 rounded-[16px] px-3.5 sm:px-6 py-1.5 sm:py-2 flex items-center justify-between shadow-sm overflow-hidden">
                <nav className="flex gap-4 sm:gap-6 overflow-x-auto scrollbar-none shrink-0 w-full sm:w-auto">
                    {[
                        { key: "My Pay", icon: CreditCard, label: "My Pay & Payslips" },
                        { key: "Summary", icon: Wallet, label: "Bank & Identity Info" }
                    ].map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.key;
                        return (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => setActiveTab(tab.key)}
                                className={`flex items-center gap-2 py-2.5 sm:py-3 text-xs font-bold transition-all relative cursor-pointer whitespace-nowrap shrink-0 ${
                                    isActive ? "text-[#2D79C7]" : "text-gray-500 hover:text-gray-800"
                                }`}
                            >
                                <Icon className={`w-4 h-4 ${isActive ? "text-[#2D79C7]" : "text-gray-400"}`} />
                                <span>{tab.label}</span>
                                {isActive && (
                                    <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#2D79C7] rounded-full" />
                                )}
                            </button>
                        );
                    })}
                </nav>

                <div className="hidden sm:flex items-center gap-2 shrink-0">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${isLLP ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-blue-50 text-blue-700 border-blue-200"}`}>
                        <Building className="w-3.5 h-3.5" />
                        {companyEntity}
                    </span>
                </div>
            </div>

            {/* TAB 1: MY PAY & PAYSLIPS */}
            {activeTab === "My Pay" && (
                <div className="space-y-4 sm:space-y-6 animate-fadeIn">
                    {/* Top Stat Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-5">
                        <MiniStatCard 
                            title="Annual CTC / Salary" 
                            value={annualCtc ? `₹${annualCtc.toLocaleString("en-IN")}` : "Not Configured"} 
                            subtext="Yearly total compensation"
                            icon={Wallet}
                            iconBg="bg-blue-50 text-[#2D79C7] border-blue-100"
                        />
                        <MiniStatCard 
                            title="Monthly Salary" 
                            value={totalEarnings ? `₹${totalEarnings.toLocaleString("en-IN")}` : "Not Configured"} 
                            subtext="Gross monthly earnings" 
                            icon={CreditCard}
                            iconBg="bg-indigo-50 text-indigo-600 border-indigo-100"
                        />
                        <MiniStatCard 
                            title="Latest Issued Payslip" 
                            value={lastPayslip ? lastPayslip.periodString : "None"} 
                            subtext={lastPayslip ? `Net Salary: ₹${(lastPayslip.netSalaryPayable || 0).toLocaleString("en-IN")}` : "Pending HR processing"} 
                            icon={Calendar}
                            iconBg="bg-emerald-50 text-emerald-600 border-emerald-100"
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6 items-start">
                        {/* Payslips History Table */}
                        <div className="lg:col-span-2">
                            <Card>
                                <CardHeader icon={FileText} title="Generated Payslips" />
                                {payslips.length === 0 ? (
                                    <div className="p-8 sm:p-12 text-center text-gray-400 flex flex-col items-center justify-center gap-2">
                                        <FileText className="w-10 h-10 text-gray-300" />
                                        <p className="font-bold text-gray-700 text-sm">No Payslips Issued Yet</p>
                                        <p className="text-xs text-gray-500 max-w-sm">Your monthly payslip PDFs will appear here once processed by HR / Global Admin.</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto w-full">
                                        <table className="w-full border-collapse text-left whitespace-nowrap min-w-[500px]">
                                            <thead>
                                                <tr className="border-b border-gray-100 text-gray-400 text-[10px] sm:text-[10.5px] font-bold uppercase tracking-wider bg-gray-50/70">
                                                    <th className="px-4 sm:px-6 py-3.5">Pay Period</th>
                                                    <th className="px-4 sm:px-6 py-3.5">Organization</th>
                                                    <th className="px-4 sm:px-6 py-3.5">Days Payable</th>
                                                    <th className="px-4 sm:px-6 py-3.5">Net Salary</th>
                                                    <th className="px-4 sm:px-6 py-3.5 text-right">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 text-xs font-semibold text-gray-700">
                                                {payslips.map((ps) => (
                                                    <tr key={ps._id} className="hover:bg-gray-50/60 transition-colors">
                                                        <td className="px-4 sm:px-6 py-3.5 sm:py-4 font-bold text-gray-900">{ps.periodString}</td>
                                                        <td className="px-4 sm:px-6 py-3.5 sm:py-4">
                                                            <span className="text-[11px] font-semibold text-gray-700 bg-gray-100 border border-gray-200/60 px-2.5 py-1 rounded-md">
                                                                {ps.companyEntity}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 sm:px-6 py-3.5 sm:py-4 font-medium text-gray-600">
                                                            {ps.attendanceDetails?.daysPayable ?? 30} Days
                                                        </td>
                                                        <td className="px-4 sm:px-6 py-3.5 sm:py-4 font-bold text-emerald-600 text-xs sm:text-sm">
                                                            ₹{(ps.netSalaryPayable || 0).toLocaleString("en-IN")}
                                                        </td>
                                                        <td className="px-4 sm:px-6 py-3.5 sm:py-4 text-right">
                                                            <button 
                                                                onClick={() => handleDownloadPdf(ps)}
                                                                className="px-2.5 sm:px-3.5 py-1.5 bg-[#2D79C7] hover:bg-[#1D5E9E] text-white rounded-lg font-bold text-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                                                            >
                                                                <Download className="w-3.5 h-3.5" />
                                                                <span className="hidden sm:inline">Download PDF</span>
                                                                <span className="sm:hidden">PDF</span>
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </Card>
                        </div>

                        {/* Salary Structure Breakdown */}
                        <div className="lg:col-span-1">
                            <Card>
                                <CardHeader icon={Percent} title="Salary Structure Breakdown" />
                                <div className="p-4 sm:p-6">
                                    <div className="divide-y divide-gray-100 text-xs font-medium">
                                        <div className="py-2.5 sm:py-3 flex justify-between items-center">
                                            <span className="text-gray-600">Basic Pay (50%)</span>
                                            <span className="text-gray-900 font-bold text-xs sm:text-sm">₹{displayBasic.toLocaleString("en-IN")}</span>
                                        </div>
                                        <div className="py-2.5 sm:py-3 flex justify-between items-center">
                                            <span className="text-gray-600">House Rent Allowance (20%)</span>
                                            <span className="text-gray-900 font-bold text-xs sm:text-sm">₹{displayHra.toLocaleString("en-IN")}</span>
                                        </div>
                                        <div className="py-2.5 sm:py-3 flex justify-between items-center">
                                            <span className="text-gray-600">Medical Allowance (10%)</span>
                                            <span className="text-gray-900 font-bold text-xs sm:text-sm">₹{displayMedical.toLocaleString("en-IN")}</span>
                                        </div>
                                        <div className="py-2.5 sm:py-3 flex justify-between items-center">
                                            <span className="text-gray-600">Conveyance (10%)</span>
                                            <span className="text-gray-900 font-bold text-xs sm:text-sm">₹{displayConveyance.toLocaleString("en-IN")}</span>
                                        </div>
                                        <div className="py-2.5 sm:py-3 flex justify-between items-center">
                                            <span className="text-gray-600">Special Allowances (10%)</span>
                                            <span className="text-gray-900 font-bold text-xs sm:text-sm">₹{displaySpecial.toLocaleString("en-IN")}</span>
                                        </div>
                                    </div>

                                    <p className="mt-3 text-[10px] sm:text-[10.5px] text-gray-500 font-medium leading-relaxed italic bg-gray-50/80 p-2.5 rounded-lg border border-gray-100">
                                        <strong className="text-gray-700 not-italic font-bold">*Note:</strong> Special allowances include telephone bill, &amp; other miscellaneous allowances.
                                    </p>

                                    <div className="mt-4 pt-4 border-t border-gray-200/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 sm:gap-0 bg-blue-50/50 p-3 sm:p-4 rounded-xl border border-blue-100/60">
                                        <span className="text-gray-900 font-bold text-xs">Monthly Total Salary</span>
                                        <span className="text-[#2D79C7] font-black text-sm sm:text-base">₹{totalEarnings.toLocaleString("en-IN")}</span>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: BANK & IDENTITY INFO */}
            {activeTab === "Summary" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 animate-fadeIn">
                    {/* Bank Info Card */}
                    <Card>
                        <CardHeader icon={Building2} title="Payment & Bank Information" />
                        <div className="p-4 sm:p-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 sm:gap-y-5 gap-x-4 text-xs font-medium">
                                <div>
                                    <span className="text-gray-400 block mb-1 text-[10px] sm:text-[10.5px] uppercase font-bold tracking-wider">Company Entity</span>
                                    <span className="text-gray-900 font-bold text-xs sm:text-sm">{companyEntity}</span>
                                </div>
                                <div>
                                    <span className="text-gray-400 block mb-1 text-[10px] sm:text-[10.5px] uppercase font-bold tracking-wider">Payment Mode</span>
                                    <span className="text-gray-900 font-bold text-xs sm:text-sm">{user?.paymentMode || "Bank Transfer"}</span>
                                </div>
                                <div>
                                    <span className="text-gray-400 block mb-1 text-[10px] sm:text-[10.5px] uppercase font-bold tracking-wider">Bank Name</span>
                                    <span className="text-gray-900 font-bold text-xs sm:text-sm">{user?.bankName || "Not Configured"}</span>
                                </div>
                                <div>
                                    <span className="text-gray-400 block mb-1 text-[10px] sm:text-[10.5px] uppercase font-bold tracking-wider">Bank Account Number</span>
                                    <span className="text-gray-900 font-mono tracking-wider font-bold text-xs sm:text-sm">
                                        {user?.accountNumber ? `•••• •••• ${user.accountNumber.slice(-4)}` : "Not Configured"}
                                    </span>
                                </div>
                                <div className="sm:col-span-2">
                                    <span className="text-gray-400 block mb-1 text-[10px] sm:text-[10.5px] uppercase font-bold tracking-wider">IFSC Code</span>
                                    <span className="text-gray-900 font-mono uppercase font-bold text-xs sm:text-sm">{user?.ifscCode || "Not Configured"}</span>
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Identity Information Card */}
                    <Card>
                        <CardHeader icon={ShieldCheck} title="Identity & Tax Records" />
                        <div className="p-4 sm:p-6 space-y-4">
                            <div className="space-y-3.5 text-xs font-semibold">
                                <div className="flex justify-between items-center p-3 sm:p-4 bg-gray-50/80 border border-gray-200/80 rounded-xl gap-2">
                                    <div className="min-w-0">
                                        <span className="text-gray-400 block mb-0.5 text-[9.5px] sm:text-[10px] uppercase font-bold tracking-wider">PAN Card Number</span>
                                        <span className="text-gray-900 font-mono font-bold tracking-wider text-xs sm:text-sm truncate block">{user?.panNumber || "Not Configured"}</span>
                                    </div>
                                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] sm:text-[10.5px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                        {user?.panNumber ? "Verified" : "Pending"}
                                    </span>
                                </div>

                                <div className="flex justify-between items-center p-3 sm:p-4 bg-gray-50/80 border border-gray-200/80 rounded-xl gap-2">
                                    <div className="min-w-0">
                                        <span className="text-gray-400 block mb-0.5 text-[9.5px] sm:text-[10px] uppercase font-bold tracking-wider">Aadhaar Card Number</span>
                                        <span className="text-gray-900 font-mono font-bold tracking-wider text-xs sm:text-sm truncate block">{user?.aadhaarNumber || "Not Configured"}</span>
                                    </div>
                                    <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] sm:text-[10.5px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                        {user?.aadhaarNumber ? "Verified" : "Pending"}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default MyFinances;
