import React, { useState, useEffect } from "react";
import { 
    Wallet, 
    CreditCard, 
    Building2, 
    ShieldCheck, 
    FileText, 
    Download, 
    Eye, 
    CheckCircle2, 
    Lock, 
    Calendar,
    Printer,
    ArrowUpRight,
    TrendingUp,
    Percent,
    AlertCircle
} from "lucide-react";
import { getMyFinances } from "../../services/finance.service";
import { toast } from "sonner";
import { SkeletonLoader, EmptyState } from "../../components/SharedComponents";

/* ─────────────────────────────────────────────
   REUSABLE CONTAINER CARDS
───────────────────────────────────────────── */
const Card = ({ children, className = "" }) => (
    <div className={`premium-3d-card flex flex-col overflow-hidden ${className}`}>
        {children}
    </div>
);

const CardHeader = ({ icon: Icon, title, action }) => (
    <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-[#F3F4F6]">
        <div className="flex items-center gap-2.5">
            {Icon && (
                <div className="w-7 h-7 rounded-[10px] bg-blue-50 flex items-center justify-center border border-blue-100/50">
                    <Icon className="w-3.5 h-3.5 text-[#2D79C7]" strokeWidth={2.5} />
                </div>
            )}
            <h2 className="text-[#1E1E1E] text-[14px] font-bold tracking-wide">{title}</h2>
        </div>
        {action && <div className="shrink-0">{action}</div>}
    </div>
);

const MiniStatCard = ({ title, value, change, isPositive, icon: Icon }) => (
    <div className="premium-3d-card-mini p-5 flex items-center justify-between">
        <div>
            <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider leading-none">{title}</span>
            <div className="mt-2.5 flex items-baseline gap-1.5">
                <span className="text-[#1E1E1E] text-[20px] font-black leading-none">{value}</span>
            </div>
            {change && (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded leading-none mt-2 inline-block ${isPositive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                    {change}
                </span>
            )}
        </div>
        {Icon && (
            <div className="w-10 h-10 rounded-[12px] bg-gray-50 flex items-center justify-center border border-gray-100">
                <Icon className="w-5 h-5 text-gray-400" />
            </div>
        )}
    </div>
);

const MyFinances = () => {
    const [activeTab, setActiveTab] = useState("Summary");
    const [loading, setLoading] = useState(true);
    const [financeData, setFinanceData] = useState(null);
    const [selectedPayslip, setSelectedPayslip] = useState(null);

    const fetchFinances = async () => {
        try {
            setLoading(true);
            const res = await getMyFinances();
            if (res.data.success) {
                setFinanceData(res.data);
            } else {
                toast.error(res.data.message || "Failed to load financial records.");
            }
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || "Failed to communicate with DB.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFinances();
    }, []);

    const handleDownloadPayslip = (payslip) => {
        toast.info(`Generating PDF for ${payslip.month}...`);
        
        setTimeout(() => {
            // Simulate payslip download structure
            const dummyContent = `
========================================
            PAYSLIP FOR ${payslip.month.toUpperCase()}
========================================
Gross Salary: INR ${payslip.grossSalary.toLocaleString("en-IN")}
Deductions  : INR ${payslip.deductions.toLocaleString("en-IN")}
Net Salary  : INR ${payslip.netSalary.toLocaleString("en-IN")}
Status      : ${payslip.status}
========================================
Thank you for your service!
            `;
            const element = document.createElement("a");
            const file = new Blob([dummyContent], { type: 'text/plain' });
            element.href = URL.createObjectURL(file);
            element.download = `payslip_${payslip.month.toLowerCase().replace(" ", "_")}.txt`;
            document.body.appendChild(element);
            element.click();
            document.body.removeChild(element);
            toast.success(`Payslip for ${payslip.month} downloaded successfully!`);
        }, 1200);
    };

    if (loading) {
        return (
            <div className="space-y-6">
                <SkeletonLoader type="stat" />
                <SkeletonLoader type="table" rows={6} />
            </div>
        );
    }

    if (!financeData) {
        return <EmptyState message="No financial data available" description="We could not retrieve your finance info at this time." />;
    }

    const formatCurrency = (val) => {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0
        }).format(val);
    };

    return (
        <div className="space-y-6 select-none animate-fadeIn">
            {/* Top Sub-Navigation Tabs */}
            <div className="premium-3d-card-mini px-6 py-1 flex items-center">
                <nav className="flex gap-4 overflow-x-auto scrollbar-none">
                    {[
                        { key: "Summary", icon: Wallet, label: "Summary" },
                        { key: "My Pay", icon: CreditCard, label: "My Pay" }
                    ].map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.key;
                        return (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => setActiveTab(tab.key)}
                                className={`flex items-center gap-2 px-3 py-4 text-[13px] font-bold border-b-2 transition-all cursor-pointer relative whitespace-nowrap ${
                                    isActive
                                        ? "border-[#2D79C7] text-[#2D79C7]"
                                        : "border-transparent text-gray-400 hover:text-gray-600"
                                }`}
                            >
                                <Icon className={`w-4 h-4 ${isActive ? "text-[#2D79C7]" : "text-gray-400"}`} />
                                <span>{tab.label}</span>
                                {isActive && (
                                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#2D79C7] rounded-full" />
                                )}
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* TAB: SUMMARY */}
            {activeTab === "Summary" && (
                <div className="space-y-6 animate-fadeIn">
                    {/* Stat Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <MiniStatCard 
                            title="Current Salary" 
                            value={formatCurrency(financeData.summary.currentSalary)} 
                            change="Active CTC" 
                            isPositive={true}
                            icon={Wallet}
                        />
                        <MiniStatCard 
                            title="Last Processed Payroll" 
                            value={formatCurrency(financeData.summary.lastProcessedPayroll)} 
                            change="Net Paid" 
                            isPositive={true}
                            icon={CreditCard}
                        />
                        <MiniStatCard 
                            title="Working Days" 
                            value={`${financeData.summary.workingDays} Days`} 
                            change="This Month" 
                            isPositive={true}
                            icon={Calendar}
                        />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Payment Info Card */}
                        <Card>
                            <CardHeader icon={Building2} title="Payment Information" />
                            <div className="p-5.5 space-y-4">
                                <div className="grid grid-cols-2 gap-y-4 text-xs font-semibold">
                                    <div>
                                        <span className="text-gray-400 block mb-1">Salary Payment Mode</span>
                                        <span className="text-gray-800">{financeData.paymentInfo.paymentMode}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-400 block mb-1">Bank Name</span>
                                        <span className="text-gray-800">{financeData.paymentInfo.bankName}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-400 block mb-1">Account Number</span>
                                        <span className="text-gray-800 font-mono tracking-wider">
                                            •••• •••• {financeData.paymentInfo.accountNumber.slice(-4)}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-gray-400 block mb-1">IFSC Code</span>
                                        <span className="text-gray-800 font-mono uppercase">{financeData.paymentInfo.ifscCode}</span>
                                    </div>
                                    <div className="col-span-2">
                                        <span className="text-gray-400 block mb-1">Account Holder Name</span>
                                        <span className="text-gray-800">{financeData.paymentInfo.accountHolderName}</span>
                                    </div>
                                    <div className="col-span-2">
                                        <span className="text-gray-400 block mb-1">Branch Address</span>
                                        <span className="text-gray-800">{financeData.paymentInfo.branch}</span>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {/* Identity Info Card */}
                        <Card>
                            <CardHeader icon={ShieldCheck} title="Identity Information" />
                            <div className="p-5.5 space-y-4.5">
                                <div className="space-y-4 text-xs font-semibold">
                                    <div className="flex justify-between items-center p-3.5 bg-gray-50 border border-gray-100 rounded-[14px]">
                                        <div>
                                            <span className="text-gray-400 block mb-0.5">PAN Card Details</span>
                                            <span className="text-gray-800 font-mono font-bold tracking-wider">{financeData.identityInfo.panNumber}</span>
                                        </div>
                                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                            Verified
                                        </span>
                                    </div>

                                    <div className="flex justify-between items-center p-3.5 bg-gray-50 border border-gray-100 rounded-[14px]">
                                        <div>
                                            <span className="text-gray-400 block mb-0.5">Aadhaar Card Details</span>
                                            <span className="text-gray-800 font-mono font-bold tracking-wider">{financeData.identityInfo.aadhaarNumber}</span>
                                        </div>
                                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                            Verified
                                        </span>
                                    </div>

                                    <div className="flex justify-between items-center p-3.5 bg-gray-50 border border-gray-100 rounded-[14px]">
                                        <div>
                                            <span className="text-gray-400 block mb-0.5">Address Proof Document</span>
                                            <span className="text-gray-800">{financeData.identityInfo.addressProof}</span>
                                        </div>
                                        <button 
                                            onClick={() => toast.success("Opening address proof document viewer...")}
                                            className="text-xs font-bold text-[#2D79C7] hover:underline cursor-pointer flex items-center gap-1"
                                        >
                                            <Eye className="w-3.5 h-3.5" />
                                            View Document
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>
                </div>
            )}

            {/* TAB: MY PAY */}
            {activeTab === "My Pay" && (
                <div className="space-y-6 animate-fadeIn">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                        {/* Payslip History Table */}
                        <div className="lg:col-span-2">
                            <Card>
                                <CardHeader icon={FileText} title="Payslip History Logs" />
                                <div className="overflow-x-auto w-full">
                                    <table className="w-full border-collapse text-left whitespace-nowrap">
                                        <thead>
                                            <tr className="border-b border-[#F3F4F6] text-gray-400 text-[10px] font-extrabold uppercase tracking-wider select-none">
                                                <th className="px-6 py-4">Month</th>
                                                <th className="px-6 py-4">Gross Salary</th>
                                                <th className="px-6 py-4">Deductions</th>
                                                <th className="px-6 py-4">Net Salary</th>
                                                <th className="px-6 py-4">Status</th>
                                                <th className="px-6 py-4 text-center">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#F9FAFB] text-xs font-semibold text-gray-600">
                                            {financeData.payslips.map((ps, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                                                    <td className="px-6 py-3.5 font-bold text-[#1E1E1E]">{ps.month}</td>
                                                    <td className="px-6 py-3.5 font-mono text-gray-700">{formatCurrency(ps.grossSalary)}</td>
                                                    <td className="px-6 py-3.5 font-mono text-rose-600">-{formatCurrency(ps.deductions)}</td>
                                                    <td className="px-6 py-3.5 font-mono text-[#2D79C7] font-black">{formatCurrency(ps.netSalary)}</td>
                                                    <td className="px-6 py-3.5">
                                                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[9px] font-bold px-2 py-0.5 rounded-full">
                                                            {ps.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-3.5 text-center">
                                                        <div className="flex justify-center gap-2">
                                                            <button 
                                                                onClick={() => setSelectedPayslip(ps)}
                                                                title="View Detailed Payslip"
                                                                className="p-1.5 hover:bg-blue-50 rounded-[8px] text-gray-400 hover:text-[#2D79C7] transition-colors cursor-pointer border border-transparent hover:border-blue-100"
                                                            >
                                                                <Eye className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button 
                                                                onClick={() => handleDownloadPayslip(ps)}
                                                                title="Download PDF"
                                                                className="p-1.5 hover:bg-emerald-50 rounded-[8px] text-gray-400 hover:text-emerald-700 transition-colors cursor-pointer border border-transparent hover:border-emerald-100"
                                                            >
                                                                <Download className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        </div>

                        {/* Salary Breakdown visual Card */}
                        <div className="lg:col-span-1">
                            <Card>
                                <CardHeader icon={Percent} title="Salary Structural Breakdown" />
                                <div className="p-5.5 space-y-4 text-xs font-semibold">
                                    <div className="space-y-3">
                                        <div>
                                            <div className="flex justify-between mb-1.5">
                                                <span className="text-gray-400">Basic Salary (50%)</span>
                                                <span className="text-gray-800 font-mono">{formatCurrency(financeData.salaryBreakdown.basic)}</span>
                                            </div>
                                            <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                                <div className="bg-[#2D79C7] h-full rounded-full" style={{ width: '50%' }} />
                                            </div>
                                        </div>

                                        <div>
                                            <div className="flex justify-between mb-1.5">
                                                <span className="text-gray-400">House Rent Allowance (HRA) (20%)</span>
                                                <span className="text-gray-800 font-mono">{formatCurrency(financeData.salaryBreakdown.hra)}</span>
                                            </div>
                                            <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                                <div className="bg-emerald-500 h-full rounded-full" style={{ width: '20%' }} />
                                            </div>
                                        </div>

                                        <div>
                                            <div className="flex justify-between mb-1.5">
                                                <span className="text-gray-400">Special Allowance (20%)</span>
                                                <span className="text-gray-800 font-mono">{formatCurrency(financeData.salaryBreakdown.specialAllowance)}</span>
                                            </div>
                                            <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                                <div className="bg-indigo-500 h-full rounded-full" style={{ width: '20%' }} />
                                            </div>
                                        </div>

                                        <div>
                                            <div className="flex justify-between mb-1.5">
                                                <span className="text-gray-400">Other Allowances (10%)</span>
                                                <span className="text-gray-800 font-mono">{formatCurrency(financeData.salaryBreakdown.otherAllowances)}</span>
                                            </div>
                                            <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                                <div className="bg-amber-500 h-full rounded-full" style={{ width: '10%' }} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="border-t border-[#F3F4F6] pt-4.5">
                                        <p className="text-[11px] text-gray-400 font-bold leading-normal italic text-left">
                                            *Other allowances contains conveyance like Transportations, Medical etc.
                                        </p>
                                    </div>

                                    <div className="border-t border-[#F3F4F6] pt-4 flex justify-between items-baseline">
                                        <span className="text-gray-800 font-black text-sm">Net In-hand Take-home</span>
                                        <span className="text-[#2D79C7] font-black text-base font-mono">{formatCurrency(financeData.salaryBreakdown.netSalary)}</span>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </div>
                </div>
            )}

            {/* PAYSLIP DETAIL MODAL */}
            {selectedPayslip && (
                <div className="fixed inset-0 bg-black/45 backdrop-blur-[2px] z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[24px] shadow-2xl border border-gray-150 w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-gray-100 bg-[#F8FAFC] flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100">
                                    <FileText className="w-5 h-5 text-[#2D79C7]" />
                                </div>
                                <div>
                                    <h3 className="text-[15px] font-black text-gray-800">Salary Slip - {selectedPayslip.month}</h3>
                                    <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mt-0.5">Idea Fueled Private Limited</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => handleDownloadPayslip(selectedPayslip)}
                                    className="p-2 bg-white hover:bg-gray-50 border border-gray-200 rounded-[10px] text-gray-500 hover:text-gray-800 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                    onClick={() => setSelectedPayslip(null)}
                                    className="p-2 bg-gray-50 hover:bg-gray-100 rounded-[10px] text-gray-500 hover:text-gray-800 transition-colors flex items-center justify-center cursor-pointer border border-transparent font-bold text-xs"
                                >
                                    Close
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto space-y-6 text-xs font-semibold text-gray-700">
                            {/* Company & Bank details */}
                            <div className="grid grid-cols-2 gap-6 p-4.5 bg-gray-50/50 rounded-[18px] border border-gray-100">
                                <div className="space-y-1.5">
                                    <span className="text-[10px] text-gray-400 uppercase tracking-wider block font-bold">Employer Details</span>
                                    <span className="text-[#1E1E1E] font-black text-sm block">Idea Fueled HRMS</span>
                                    <span className="text-gray-500 block">Koramangala 4th Block, Bangalore</span>
                                    <span className="text-gray-500 block">Karnataka, IN - 560034</span>
                                </div>
                                <div className="space-y-1.5">
                                    <span className="text-[10px] text-gray-400 uppercase tracking-wider block font-bold">Payment Destination</span>
                                    <span className="text-gray-500 block">Bank: <strong className="text-gray-700">{financeData.paymentInfo.bankName}</strong></span>
                                    <span className="text-gray-500 block">A/C: <strong className="text-gray-700 font-mono">•••• •••• {financeData.paymentInfo.accountNumber.slice(-4)}</strong></span>
                                    <span className="text-gray-500 block">IFSC: <strong className="text-gray-700 font-mono uppercase">{financeData.paymentInfo.ifscCode}</strong></span>
                                    <span className="text-gray-500 block">Holder: <strong className="text-gray-700">{financeData.paymentInfo.accountHolderName}</strong></span>
                                </div>
                            </div>

                            {/* Earnings & Deductions Tables */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                                {/* Earnings Card */}
                                <div className="border border-gray-100 rounded-[18px] overflow-hidden">
                                    <div className="px-4.5 py-3 bg-[#ECFDF5] border-b border-emerald-100/30 flex justify-between items-center text-emerald-800">
                                        <span className="font-bold text-[11px] uppercase tracking-wider">Earnings structure</span>
                                        <span className="font-black text-xs">Amount</span>
                                    </div>
                                    <div className="divide-y divide-gray-50 px-4.5 py-1">
                                        <div className="py-2.5 flex justify-between">
                                            <span className="text-gray-500">Basic Pay</span>
                                            <span className="font-mono text-gray-700">{formatCurrency(financeData.salaryBreakdown.basic)}</span>
                                        </div>
                                        <div className="py-2.5 flex justify-between">
                                            <span className="text-gray-500">HRA (House Rent Allowance)</span>
                                            <span className="font-mono text-gray-700">{formatCurrency(financeData.salaryBreakdown.hra)}</span>
                                        </div>
                                        <div className="py-2.5 flex justify-between">
                                            <span className="text-gray-500">Special Allowance</span>
                                            <span className="font-mono text-gray-700">{formatCurrency(financeData.salaryBreakdown.specialAllowance)}</span>
                                        </div>
                                        <div className="py-2.5 flex justify-between">
                                            <span className="text-gray-500">Other Allowances</span>
                                            <span className="font-mono text-gray-700">{formatCurrency(financeData.salaryBreakdown.otherAllowances)}</span>
                                        </div>
                                    </div>
                                    <div className="px-4.5 py-3 bg-gray-50 border-t border-gray-100 flex justify-between font-black text-gray-800 text-[13px]">
                                        <span>Total Gross Pay</span>
                                        <span className="font-mono">{formatCurrency(selectedPayslip.grossSalary)}</span>
                                    </div>
                                </div>

                                {/* Deductions Card */}
                                <div className="border border-gray-100 rounded-[18px] overflow-hidden">
                                    <div className="px-4.5 py-3 bg-[#FEF2F2] border-b border-rose-100/30 flex justify-between items-center text-rose-800">
                                        <span className="font-bold text-[11px] uppercase tracking-wider">Deductions & Taxes</span>
                                        <span className="font-black text-xs">Amount</span>
                                    </div>
                                    <div className="divide-y divide-gray-50 px-4.5 py-1">
                                        <div className="py-2.5 flex justify-between">
                                            <span className="text-gray-500">Provident Fund (PF)</span>
                                            <span className="font-mono text-gray-700">{formatCurrency(financeData.salaryBreakdown.pfDeduction)}</span>
                                        </div>
                                        <div className="py-2.5 flex justify-between">
                                            <span className="text-gray-500">Professional Tax & TDS</span>
                                            <span className="font-mono text-gray-700">{formatCurrency(financeData.salaryBreakdown.taxDeduction)}</span>
                                        </div>
                                        <div className="py-2.5 flex justify-between opacity-30 select-none">
                                            <span className="text-gray-400">Other Deductions</span>
                                            <span className="font-mono text-gray-400">₹0</span>
                                        </div>
                                        <div className="py-2.5 flex justify-between opacity-30 select-none">
                                            <span className="text-gray-400">Unpaid Leaves</span>
                                            <span className="font-mono text-gray-400">₹0</span>
                                        </div>
                                    </div>
                                    <div className="px-4.5 py-3 bg-gray-50 border-t border-gray-100 flex justify-between font-black text-gray-800 text-[13px]">
                                        <span>Total Deductions</span>
                                        <span className="font-mono text-rose-600">{formatCurrency(selectedPayslip.deductions)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Summary alert banner */}
                            <div className="p-4 bg-blue-50 border border-blue-100/50 rounded-[18px] flex items-center justify-between text-blue-800 text-xs font-bold font-mono">
                                <div className="flex items-center gap-2">
                                    <Lock className="w-4 h-4 text-[#2D79C7]" />
                                    <span>Net In-hand Take-home Salary:</span>
                                </div>
                                <span className="text-[#2D79C7] font-black text-sm">{formatCurrency(selectedPayslip.netSalary)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyFinances;
