import React, { useState, useEffect } from "react";
import { 
    DollarSign, FileText, Download, Plus, Trash2, Search, Filter, 
    CheckCircle2, AlertCircle, Building2, User, Calendar, CreditCard,
    FileSpreadsheet, Loader2, Sparkles, RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { getAllEmployees } from "../../services/employee.service";
import { generatePayslip, getPayslips, deletePayslip } from "../../services/payroll.service";
import { downloadPayslipPdf } from "../../utils/payslipPdfGenerator";
import { Avatar } from "../../components/SharedComponents";

const MONTHS = [
    "JAN", "FEB", "MAR", "APR", "MAY", "JUN", 
    "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"
];

const YEARS = [2025, 2026, 2027, 2028];

export default function Payroll() {
    const [employees, setEmployees] = useState([]);
    const [payslips, setPayslips] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedEntityFilter, setSelectedEntityFilter] = useState("all");
    const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);

    // Form State for Payslip Generation
    const [selectedEmpId, setSelectedEmpId] = useState("");
    const [selectedMonth, setSelectedMonth] = useState("JUN");
    const [selectedYear, setSelectedYear] = useState(2026);

    const [attendance, setAttendance] = useState({
        actualPayableDays: 30,
        totalWorkingDays: 30,
        lossOfPayDays: 0,
        daysPayable: 30
    });

    const [earnings, setEarnings] = useState({
        basic: 0,
        hra: 0,
        specialAllowance: 0,
        otherAllowances: 0
    });

    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const [empRes, payRes] = await Promise.allSettled([
                getAllEmployees(),
                getPayslips()
            ]);

            if (empRes.status === "fulfilled" && empRes.value?.data?.success) {
                const list = empRes.value.data.employees || empRes.value.data.users || [];
                setEmployees(list);
            }
            if (payRes.status === "fulfilled" && payRes.value?.data?.success) {
                setPayslips(payRes.value.data.payslips || []);
            }
        } catch (err) {
            console.error("Error loading payroll data:", err);
        } finally {
            setLoading(false);
        }
    };

    // Auto fill employee salary details on select
    const handleEmployeeSelect = (empId) => {
        setSelectedEmpId(empId);
        const emp = employees.find(e => e._id === empId);
        if (emp) {
            const str = emp.salaryStructure || {};
            setEarnings({
                basic: str.basic || 50000,
                hra: str.hra || 20000,
                specialAllowance: str.specialAllowance || 15000,
                otherAllowances: str.otherAllowances || 5000
            });
        }
    };

    const numBasic = Number(earnings.basic) || 0;
    const numHra = Number(earnings.hra) || 0;
    const numSpecial = Number(earnings.specialAllowance) || 0;
    const numOther = Number(earnings.otherAllowances) || 0;
    const totalEarnings = numBasic + numHra + numSpecial + numOther;

    const handleGenerateSubmit = async (e) => {
        e.preventDefault();
        if (!selectedEmpId) {
            toast.error("Please select an employee.");
            return;
        }

        setSaving(true);
        try {
            const payload = {
                employeeId: selectedEmpId,
                month: selectedMonth,
                year: Number(selectedYear),
                actualPayableDays: Number(attendance.actualPayableDays) || 30,
                totalWorkingDays: Number(attendance.totalWorkingDays) || 30,
                lossOfPayDays: Number(attendance.lossOfPayDays) || 0,
                daysPayable: Number(attendance.daysPayable) || 30,
                basic: numBasic,
                hra: numHra,
                specialAllowance: numSpecial,
                otherAllowances: numOther
            };

            const res = await generatePayslip(payload);
            if (res.data?.success) {
                toast.success(`Payslip for ${selectedMonth} ${selectedYear} generated & saved successfully!`);
                setIsGenerateModalOpen(false);
                fetchInitialData();
            }
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || "Failed to generate payslip.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this payslip?")) return;
        try {
            const res = await deletePayslip(id);
            if (res.data?.success) {
                toast.success("Payslip deleted successfully.");
                setPayslips(prev => prev.filter(p => p._id !== id));
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to delete payslip.");
        }
    };

    const handleDownloadPdf = async (payslip) => {
        try {
            toast.loading("Generating PDF...", { id: "pdf-gen" });
            await downloadPayslipPdf(payslip);
            toast.success("Payslip downloaded successfully!", { id: "pdf-gen" });
        } catch (err) {
            console.error(err);
            toast.error("Failed to download PDF.", { id: "pdf-gen" });
        }
    };

    const filteredPayslips = payslips.filter(p => {
        const name = p.employeeDetails?.name || p.employeeId?.fullName || "";
        const period = p.periodString || "";
        const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) || period.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesEntity = selectedEntityFilter === "all" || (p.companyEntity || "Idea Fueled") === selectedEntityFilter;
        return matchesSearch && matchesEntity;
    });

    const totalOutflow = payslips.reduce((acc, curr) => acc + (curr.netSalaryPayable || 0), 0);
    const ideaFueledCount = payslips.filter(p => (p.companyEntity || "").toLowerCase().includes("llp") === false).length;
    const ideaFueledLlpCount = payslips.filter(p => (p.companyEntity || "").toLowerCase().includes("llp")).length;

    return (
        <div className="space-y-6 pb-12 animate-fadeIn">
            {/* Clean Header Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 border border-gray-150 rounded-[20px] shadow-xs">
                <div>
                    <h1 className="text-xl sm:text-2xl font-black text-[#1E1E1E]">Payroll & Payslips</h1>
                    <p className="text-gray-500 text-xs sm:text-sm font-medium mt-0.5">
                        Generate and manage monthly payslips for Idea Fueled & Idea Fueled LLP employees.
                    </p>
                </div>

                <button
                    onClick={() => setIsGenerateModalOpen(true)}
                    className="bg-[#2D79C7] hover:bg-[#2062A7] text-white font-bold text-xs sm:text-sm px-4 sm:px-5 py-2.5 rounded-[12px] shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
                >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>Process New Salary</span>
                </button>
            </div>

            {/* Clean Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="premium-3d-card-mini p-4 bg-white border border-gray-150 rounded-[16px] flex items-center justify-between">
                    <div>
                        <span className="text-gray-400 text-[10px] font-extrabold uppercase tracking-wider block">Total Payslips Issued</span>
                        <div className="text-xl font-black text-[#1E1E1E] mt-1">{payslips.length}</div>
                    </div>
                    <div className="w-9 h-9 rounded-[10px] bg-blue-50 text-[#2D79C7] flex items-center justify-center border border-blue-100">
                        <FileText className="w-4 h-4" />
                    </div>
                </div>

                <div className="premium-3d-card-mini p-4 bg-white border border-gray-150 rounded-[16px] flex items-center justify-between">
                    <div>
                        <span className="text-gray-400 text-[10px] font-extrabold uppercase tracking-wider block">Total Payroll Outflow</span>
                        <div className="text-xl font-black text-emerald-600 mt-1">₹{totalOutflow.toLocaleString("en-IN")}</div>
                    </div>
                    <div className="w-9 h-9 rounded-[10px] bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                        <DollarSign className="w-4 h-4" />
                    </div>
                </div>

                <div className="premium-3d-card-mini p-4 bg-white border border-gray-150 rounded-[16px] flex items-center justify-between">
                    <div>
                        <span className="text-gray-400 text-[10px] font-extrabold uppercase tracking-wider block">Idea Fueled Entity</span>
                        <div className="text-xl font-black text-[#1E1E1E] mt-1">{ideaFueledCount} <span className="text-xs text-gray-400 font-medium">Records</span></div>
                    </div>
                    <div className="w-9 h-9 rounded-[10px] bg-slate-50 text-slate-600 flex items-center justify-center border border-slate-200">
                        <Building2 className="w-4 h-4" />
                    </div>
                </div>

                <div className="premium-3d-card-mini p-4 bg-white border border-gray-150 rounded-[16px] flex items-center justify-between">
                    <div>
                        <span className="text-gray-400 text-[10px] font-extrabold uppercase tracking-wider block">Idea Fueled LLP Entity</span>
                        <div className="text-xl font-black text-purple-700 mt-1">{ideaFueledLlpCount} <span className="text-xs text-gray-400 font-medium">Records</span></div>
                    </div>
                    <div className="w-9 h-9 rounded-[10px] bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-100">
                        <Building2 className="w-4 h-4" />
                    </div>
                </div>
            </div>

            {/* Filter Bar & Table Container */}
            <div className="premium-3d-card bg-white border border-gray-150 rounded-[20px] p-6 shadow-sm space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by Employee name or Period (e.g. JUN 2026)..."
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-[12px] text-xs font-medium text-gray-800 focus:outline-none focus:border-[#2D79C7]"
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-[12px]">
                            <button
                                onClick={() => setSelectedEntityFilter("all")}
                                className={`px-3 py-1.5 rounded-[9px] text-xs font-bold transition-all cursor-pointer ${selectedEntityFilter === "all" ? "bg-white text-[#2D79C7] shadow-xs" : "text-gray-600 hover:text-gray-900"}`}
                            >
                                All Entities
                            </button>
                            <button
                                onClick={() => setSelectedEntityFilter("Idea Fueled")}
                                className={`px-3 py-1.5 rounded-[9px] text-xs font-bold transition-all cursor-pointer ${selectedEntityFilter === "Idea Fueled" ? "bg-white text-[#2D79C7] shadow-xs" : "text-gray-600 hover:text-gray-900"}`}
                            >
                                Idea Fueled
                            </button>
                            <button
                                onClick={() => setSelectedEntityFilter("Idea Fueled LLP")}
                                className={`px-3 py-1.5 rounded-[9px] text-xs font-bold transition-all cursor-pointer ${selectedEntityFilter === "Idea Fueled LLP" ? "bg-white text-[#2D79C7] shadow-xs" : "text-gray-600 hover:text-gray-900"}`}
                            >
                                Idea Fueled LLP
                            </button>
                        </div>
                    </div>
                </div>

                {/* Payslips List Table */}
                {loading ? (
                    <div className="py-16 text-center text-gray-400 font-semibold flex flex-col items-center justify-center gap-3">
                        <Loader2 className="w-8 h-8 text-[#2D79C7] animate-spin" />
                        <span>Loading payroll records...</span>
                    </div>
                ) : filteredPayslips.length === 0 ? (
                    <div className="py-16 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-[16px] flex flex-col items-center justify-center gap-2">
                        <FileText className="w-10 h-10 text-gray-300" />
                        <p className="font-bold text-gray-700">No payslips found</p>
                        <p className="text-xs">Click "Process New Salary" to generate monthly payslips.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-200 text-[11px] font-extrabold uppercase tracking-wider text-gray-400 bg-gray-50/50">
                                    <th className="py-3 px-4">Employee</th>
                                    <th className="py-3 px-4">Organization Entity</th>
                                    <th className="py-3 px-4">Pay Period</th>
                                    <th className="py-3 px-4">Days Payable</th>
                                    <th className="py-3 px-4">Total Earnings</th>
                                    <th className="py-3 px-4">Net Salary Payable</th>
                                    <th className="py-3 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-xs font-semibold text-gray-700">
                                {filteredPayslips.map((p) => {
                                    const isLLP = (p.companyEntity || "").toLowerCase().includes("llp");
                                    const emp = p.employeeDetails || {};
                                    return (
                                        <tr key={p._id} className="hover:bg-gray-50/80 transition-colors">
                                            <td className="py-3.5 px-4">
                                                <div className="flex items-center gap-3">
                                                    <Avatar src={p.employeeId?.profilePicture} name={emp.name} size="w-9 h-9" textSize="text-xs font-bold" />
                                                    <div>
                                                        <span className="font-black text-gray-900 block">{emp.name}</span>
                                                        <span className="text-[10px] text-gray-400 font-bold">{emp.employeeNumber} • {emp.designation}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black border ${isLLP ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-blue-50 text-blue-700 border-blue-200"}`}>
                                                    <Building2 className="w-3 h-3" />
                                                    {p.companyEntity}
                                                </span>
                                            </td>
                                            <td className="py-3.5 px-4 font-extrabold text-gray-900">
                                                {p.periodString}
                                            </td>
                                            <td className="py-3.5 px-4">
                                                {p.attendanceDetails?.daysPayable ?? 30} Days
                                            </td>
                                            <td className="py-3.5 px-4 font-bold text-gray-800">
                                                ₹{(p.earnings?.totalEarnings || 0).toLocaleString("en-IN")}
                                            </td>
                                            <td className="py-3.5 px-4 font-black text-emerald-600 text-sm">
                                                ₹{(p.netSalaryPayable || 0).toLocaleString("en-IN")}
                                            </td>
                                            <td className="py-3.5 px-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleDownloadPdf(p)}
                                                        className="px-3 py-1.5 bg-[#2D79C7]/10 hover:bg-[#2D79C7] text-[#2D79C7] hover:text-white rounded-[8px] font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                                                        title="Download Official PDF"
                                                    >
                                                        <Download className="w-3.5 h-3.5" />
                                                        <span>Download PDF</span>
                                                    </button>

                                                    <button
                                                        onClick={() => handleDelete(p._id)}
                                                        className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-[8px] transition-colors cursor-pointer"
                                                        title="Delete Payslip Record"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Generate Salary Modal */}
            {isGenerateModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[24px] max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8 animate-scaleIn border border-gray-150">
                        <div className="flex items-center justify-between border-b border-gray-150 pb-4 mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-[12px] bg-[#2D79C7]/10 text-[#2D79C7] flex items-center justify-center">
                                    <DollarSign className="w-5 h-5 font-black" />
                                </div>
                                <div>
                                    <h3 className="font-black text-gray-900 text-lg">Process Employee Monthly Salary</h3>
                                    <p className="text-xs text-gray-500 font-medium">Select employee, month & year to compute payslip PDF.</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsGenerateModalOpen(false)}
                                className="text-gray-400 hover:text-gray-700 text-xl font-bold cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleGenerateSubmit} className="space-y-6">
                            {/* Employee & Period Select */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="sm:col-span-3">
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Select Employee *</label>
                                    <select
                                        value={selectedEmpId}
                                        onChange={(e) => handleEmployeeSelect(e.target.value)}
                                        required
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-[12px] text-xs font-bold text-gray-800 focus:border-[#2D79C7] focus:outline-none"
                                    >
                                        <option value="">-- Choose Employee --</option>
                                        {employees.map((emp) => (
                                            <option key={emp._id} value={emp._id}>
                                                {emp.fullName || `${emp.firstName} ${emp.lastName}`} ({emp.employeeId}) — {emp.companyEntity || "Idea Fueled"}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Pay Month *</label>
                                    <select
                                        value={selectedMonth}
                                        onChange={(e) => setSelectedMonth(e.target.value)}
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-[12px] text-xs font-bold text-gray-800 focus:border-[#2D79C7] focus:outline-none"
                                    >
                                        {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Pay Year *</label>
                                    <select
                                        value={selectedYear}
                                        onChange={(e) => setSelectedYear(e.target.value)}
                                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-[12px] text-xs font-bold text-gray-800 focus:border-[#2D79C7] focus:outline-none"
                                    >
                                        {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Company Entity</label>
                                    <input
                                        type="text"
                                        readOnly
                                        value={employees.find(e => e._id === selectedEmpId)?.companyEntity || "Idea Fueled"}
                                        className="w-full p-3 bg-gray-100 border border-gray-200 rounded-[12px] text-xs font-black text-blue-700"
                                    />
                                </div>
                            </div>

                            {/* Attendance Days */}
                            <div className="bg-slate-50 p-4 border border-slate-200 rounded-[16px] space-y-3">
                                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Attendance & Working Days</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Actual Payable Days</label>
                                        <input
                                            type="number"
                                            value={attendance.actualPayableDays}
                                            onChange={(e) => setAttendance(prev => ({ ...prev, actualPayableDays: e.target.value }))}
                                            className="w-full p-2.5 bg-white border border-gray-200 rounded-[10px] text-xs font-bold"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Total Working Days</label>
                                        <input
                                            type="number"
                                            value={attendance.totalWorkingDays}
                                            onChange={(e) => setAttendance(prev => ({ ...prev, totalWorkingDays: e.target.value }))}
                                            className="w-full p-2.5 bg-white border border-gray-200 rounded-[10px] text-xs font-bold"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Loss Of Pay Days</label>
                                        <input
                                            type="number"
                                            value={attendance.lossOfPayDays}
                                            onChange={(e) => setAttendance(prev => ({ ...prev, lossOfPayDays: e.target.value }))}
                                            className="w-full p-2.5 bg-white border border-gray-200 rounded-[10px] text-xs font-bold text-rose-600"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Days Payable</label>
                                        <input
                                            type="number"
                                            value={attendance.daysPayable}
                                            onChange={(e) => setAttendance(prev => ({ ...prev, daysPayable: e.target.value }))}
                                            className="w-full p-2.5 bg-white border border-gray-200 rounded-[10px] text-xs font-bold text-emerald-600"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Earnings Breakdown */}
                            <div className="bg-slate-50 p-4 border border-slate-200 rounded-[16px] space-y-3">
                                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Earnings Breakdown (Monthly ₹)</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Basic Pay (₹)</label>
                                        <input
                                            type="number"
                                            value={earnings.basic}
                                            onChange={(e) => setEarnings(prev => ({ ...prev, basic: e.target.value }))}
                                            className="w-full p-2.5 bg-white border border-gray-200 rounded-[10px] text-xs font-bold"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">HRA (₹)</label>
                                        <input
                                            type="number"
                                            value={earnings.hra}
                                            onChange={(e) => setEarnings(prev => ({ ...prev, hra: e.target.value }))}
                                            className="w-full p-2.5 bg-white border border-gray-200 rounded-[10px] text-xs font-bold"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Special Allowance (₹)</label>
                                        <input
                                            type="number"
                                            value={earnings.specialAllowance}
                                            onChange={(e) => setEarnings(prev => ({ ...prev, specialAllowance: e.target.value }))}
                                            className="w-full p-2.5 bg-white border border-gray-200 rounded-[10px] text-xs font-bold"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Other Allowances (₹)</label>
                                        <input
                                            type="number"
                                            value={earnings.otherAllowances}
                                            onChange={(e) => setEarnings(prev => ({ ...prev, otherAllowances: e.target.value }))}
                                            className="w-full p-2.5 bg-white border border-gray-200 rounded-[10px] text-xs font-bold"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Net Pay Box Summary */}
                            <div className="bg-emerald-50 border border-emerald-200 rounded-[16px] p-4 flex items-center justify-between">
                                <div>
                                    <span className="text-xs font-bold text-emerald-800 uppercase block">Calculated Net Salary Payable</span>
                                    <span className="text-xs text-emerald-600 font-medium">Auto-computed from total monthly earnings</span>
                                </div>
                                <div className="text-right">
                                    <span className="text-xl font-black text-emerald-700">₹{totalEarnings.toLocaleString("en-IN")}</span>
                                </div>
                            </div>

                            {/* Submit Buttons */}
                            <div className="flex items-center justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsGenerateModalOpen(false)}
                                    className="px-5 py-2.5 text-xs font-bold text-gray-600 hover:text-gray-800 border border-gray-200 rounded-[12px] cursor-pointer"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-6 py-2.5 text-xs font-bold text-white bg-[#2D79C7] hover:bg-[#2062A7] rounded-[12px] shadow-lg flex items-center gap-2 cursor-pointer disabled:opacity-60"
                                >
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                    <span>Save & Issue Payslip</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
