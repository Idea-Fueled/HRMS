import React, { useState, useEffect } from "react";
import { 
    FileText, Download, Plus, Trash2, Search, 
    CheckCircle2, Building2, Building,
    Loader2, IndianRupee, Calendar, X, Filter
} from "lucide-react";
import { toast } from "sonner";
import { getAllEmployees } from "../../services/employee.service";
import { generatePayslip, getPayslips, deletePayslip, notifyPayslipDownload } from "../../services/payroll.service";
import { downloadPayslipPdf } from "../../utils/payslipPdfGenerator";
import { Avatar } from "../../components/SharedComponents";
import { useAuth } from "../../context/AuthContext";
import ConfirmDialog from "../../components/ConfirmDialog";

const MONTHS = [
    "JAN", "FEB", "MAR", "APR", "MAY", "JUN", 
    "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"
];

const YEARS = [2025, 2026, 2027, 2028];

export default function Payroll() {
    const { user } = useAuth();
    const [employees, setEmployees] = useState([]);
    const [payslips, setPayslips] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedEntityFilter, setSelectedEntityFilter] = useState("all");
    const [selectedMonthFilter, setSelectedMonthFilter] = useState("all");
    const [selectedYearFilter, setSelectedYearFilter] = useState("all");
    const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
    const [deleteConfirmPayslip, setDeleteConfirmPayslip] = useState(null);
    const [deleting, setDeleting] = useState(false);

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

    const [baseEarnings, setBaseEarnings] = useState({
        basic: 0,
        hra: 0,
        medicalAllowance: 0,
        conveyanceAllowance: 0,
        specialAllowance: 0
    });

    const [earnings, setEarnings] = useState({
        basic: 0,
        hra: 0,
        medicalAllowance: 0,
        conveyanceAllowance: 0,
        specialAllowance: 0
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

    // Helper to compute proportionate earnings given base earnings and LOP days
    const computeEarningsBreakdown = (base, lopDays, totalDays) => {
        const numBaseBasic = Number(base.basic) || 0;
        const numBaseHra = Number(base.hra) || 0;
        const numBaseMed = Number(base.medicalAllowance) || 0;
        const numBaseConv = Number(base.conveyanceAllowance) || 0;
        const numBaseSpec = Number(base.specialAllowance) || 0;
        const gross = numBaseBasic + numBaseHra + numBaseMed + numBaseConv + numBaseSpec;

        if (gross <= 0) return { ...base };

        const numLop = parseFloat(lopDays) || 0;
        const numTot = Number(totalDays) || 30;

        if (numLop <= 0 || numTot <= 0) {
            return {
                basic: numBaseBasic,
                hra: numBaseHra,
                medicalAllowance: numBaseMed,
                conveyanceAllowance: numBaseConv,
                specialAllowance: numBaseSpec
            };
        }

        const perDay = gross / numTot;
        const deduction = Math.round(perDay * numLop);
        const net = Math.max(0, gross - deduction);
        const ratio = Math.max(0, (numTot - numLop) / numTot);

        let cBasic = Math.round(numBaseBasic * ratio);
        let cHra = Math.round(numBaseHra * ratio);
        let cMed = Math.round(numBaseMed * ratio);
        let cConv = Math.round(numBaseConv * ratio);
        let cSpec = Math.round(numBaseSpec * ratio);

        const currentSum = cBasic + cHra + cMed + cConv + cSpec;
        const diff = net - currentSum;
        if (diff !== 0) {
            cSpec = Math.max(0, cSpec + diff);
        }

        return {
            basic: cBasic,
            hra: cHra,
            medicalAllowance: cMed,
            conveyanceAllowance: cConv,
            specialAllowance: cSpec
        };
    };

    // Auto fill employee salary details on select
    const handleEmployeeSelect = (empId) => {
        setSelectedEmpId(empId);
        const emp = employees.find(e => e._id === empId);
        if (emp) {
            const str = emp.salaryStructure || {};
            const baseGross = Number(str.grossMonthly || str.monthlySalary) || (Number(str.basic || 0) + Number(str.hra || 0) + Number(str.specialAllowance || 0) + Number(str.otherAllowances || 0) + Number(str.medicalAllowance || 0) + Number(str.conveyanceAllowance || 0));
            const basicVal = str.basic || (baseGross > 0 ? Math.round(baseGross * 0.50) : 50000);
            const hraVal = str.hra || (baseGross > 0 ? Math.round(baseGross * 0.20) : 20000);
            const medVal = str.medicalAllowance || (baseGross > 0 ? Math.round(baseGross * 0.10) : 10000);
            const convVal = str.conveyanceAllowance || str.conveyance || (baseGross > 0 ? Math.round(baseGross * 0.10) : 10000);
            const specVal = str.specialAllowance || (baseGross > 0 ? Math.round(baseGross * 0.10) : 10000);

            const initialBase = {
                basic: basicVal,
                hra: hraVal,
                medicalAllowance: medVal,
                conveyanceAllowance: convVal,
                specialAllowance: specVal
            };

            setBaseEarnings(initialBase);
            setEarnings(initialBase);
            setAttendance({
                actualPayableDays: 30,
                totalWorkingDays: 30,
                lossOfPayDays: 0,
                daysPayable: 30
            });
        }
    };

    // Attendance and LOP change handlers with real-time recalculation of earnings breakdown
    const handleLopDaysChange = (val) => {
        const numLop = parseFloat(val) || 0;
        const totalDays = Number(attendance.totalWorkingDays) || 30;
        const payableDays = Math.max(0, +(totalDays - numLop).toFixed(2));

        setAttendance(prev => ({
            ...prev,
            lossOfPayDays: val,
            daysPayable: payableDays,
            actualPayableDays: payableDays
        }));

        const updated = computeEarningsBreakdown(baseEarnings, val, totalDays);
        setEarnings(updated);
    };

    const handleTotalWorkingDaysChange = (val) => {
        const totalDays = Number(val) || 30;
        const numLop = parseFloat(attendance.lossOfPayDays) || 0;
        const payableDays = Math.max(0, +(totalDays - numLop).toFixed(2));

        setAttendance(prev => ({
            ...prev,
            totalWorkingDays: val,
            daysPayable: payableDays,
            actualPayableDays: payableDays
        }));

        const updated = computeEarningsBreakdown(baseEarnings, numLop, val);
        setEarnings(updated);
    };

    const handleActualPayableDaysChange = (val) => {
        const totalDays = Number(attendance.totalWorkingDays) || 30;
        const payable = parseFloat(val) || 0;
        const computedLop = Math.max(0, +(totalDays - payable).toFixed(2));

        setAttendance(prev => ({
            ...prev,
            actualPayableDays: val,
            lossOfPayDays: computedLop,
            daysPayable: payable
        }));

        const updated = computeEarningsBreakdown(baseEarnings, computedLop, totalDays);
        setEarnings(updated);
    };

    const handleEarningChange = (field, val) => {
        setEarnings(prev => ({ ...prev, [field]: val }));
        const numLop = parseFloat(attendance.lossOfPayDays) || 0;
        if (numLop === 0) {
            setBaseEarnings(prev => ({ ...prev, [field]: val }));
        }
    };

    const numBaseBasic = Number(baseEarnings.basic) || 0;
    const numBaseHra = Number(baseEarnings.hra) || 0;
    const numBaseMed = Number(baseEarnings.medicalAllowance) || 0;
    const numBaseConv = Number(baseEarnings.conveyanceAllowance) || 0;
    const numBaseSpec = Number(baseEarnings.specialAllowance) || 0;
    const baseGrossEarnings = numBaseBasic + numBaseHra + numBaseMed + numBaseConv + numBaseSpec;

    const numBasic = Number(earnings.basic) || 0;
    const numHra = Number(earnings.hra) || 0;
    const numMedical = Number(earnings.medicalAllowance) || 0;
    const numConveyance = Number(earnings.conveyanceAllowance) || 0;
    const numSpecial = Number(earnings.specialAllowance) || 0;
    const currentEarningsSum = numBasic + numHra + numMedical + numConveyance + numSpecial;

    // Loss of Pay Days & Auto Deduction
    const totalWorkingDays = Number(attendance.totalWorkingDays) || 30;
    const lossOfPayDays = parseFloat(attendance.lossOfPayDays) || 0;
    const daysPayable = Math.max(0, +(totalWorkingDays - lossOfPayDays).toFixed(2));

    const effectiveGross = baseGrossEarnings > 0 ? baseGrossEarnings : currentEarningsSum;
    const perDaySalary = totalWorkingDays > 0 ? (effectiveGross / totalWorkingDays) : 0;
    const lopDeduction = Math.round(perDaySalary * lossOfPayDays);
    const totalEarnings = Math.max(0, effectiveGross - lopDeduction);

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
                actualPayableDays: Number(attendance.actualPayableDays) || totalWorkingDays,
                totalWorkingDays: totalWorkingDays,
                lossOfPayDays: lossOfPayDays,
                daysPayable: daysPayable,
                baseGross: effectiveGross,
                basic: numBasic,
                hra: numHra,
                medicalAllowance: numMedical,
                conveyanceAllowance: numConveyance,
                specialAllowance: numSpecial,
                otherAllowances: 0
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

    const handleDeleteClick = (payslip) => {
        setDeleteConfirmPayslip(payslip);
    };

    const handleConfirmDelete = async () => {
        if (!deleteConfirmPayslip) return;
        try {
            setDeleting(true);
            const res = await deletePayslip(deleteConfirmPayslip._id);
            if (res.data?.success) {
                toast.success("Payslip deleted successfully.");
                setPayslips(prev => prev.filter(p => p._id !== deleteConfirmPayslip._id));
                setDeleteConfirmPayslip(null);
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to delete payslip.");
        } finally {
            setDeleting(false);
        }
    };

    const handleDownloadPdf = async (payslip) => {
        try {
            toast.loading("Generating PDF...", { id: "pdf-gen" });
            await downloadPayslipPdf(payslip);
            toast.success("Payslip downloaded successfully!", { id: "pdf-gen" });

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
            toast.error("Failed to download PDF.", { id: "pdf-gen" });
        }
    };

    const filteredPayslips = payslips.filter(p => {
        const name = p.employeeDetails?.name || p.employeeId?.fullName || "";
        const period = p.periodString || "";
        const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) || period.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesEntity = selectedEntityFilter === "all" || (p.companyEntity || "Idea Fueled") === selectedEntityFilter;
        
        let matchesMonth = true;
        if (selectedMonthFilter !== "all") {
            const m = (p.month || "").toUpperCase();
            const pMonth = period.toUpperCase();
            matchesMonth = m.startsWith(selectedMonthFilter.toUpperCase()) || pMonth.includes(selectedMonthFilter.toUpperCase());
        }

        let matchesYear = true;
        if (selectedYearFilter !== "all") {
            matchesYear = String(p.year) === String(selectedYearFilter) || period.includes(String(selectedYearFilter));
        }

        return matchesSearch && matchesEntity && matchesMonth && matchesYear;
    });

    const totalOutflow = filteredPayslips.reduce((acc, curr) => acc + (curr.netSalaryPayable || 0), 0);
    const ideaFueledCount = filteredPayslips.filter(p => (p.companyEntity || "").toLowerCase().includes("llp") === false).length;
    const ideaFueledLlpCount = filteredPayslips.filter(p => (p.companyEntity || "").toLowerCase().includes("llp")).length;

    return (
        <div className="space-y-6 pb-12 animate-fadeIn select-none">
            {/* Header Bar */}
            <div className="bg-white border border-gray-200/80 rounded-[16px] p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 tracking-tight">Payroll & Payslips</h1>
                    <p className="text-gray-500 text-xs font-medium mt-0.5">
                        Generate and manage monthly salary processing for Idea Fueled & Idea Fueled LLP employees.
                    </p>
                </div>

                <button
                    onClick={() => {
                        setSelectedEmpId("");
                        setAttendance({
                            actualPayableDays: 30,
                            totalWorkingDays: 30,
                            lossOfPayDays: 0,
                            daysPayable: 30
                        });
                        setEarnings({
                            basic: 0,
                            hra: 0,
                            medicalAllowance: 0,
                            conveyanceAllowance: 0,
                            specialAllowance: 0
                        });
                        setBaseEarnings({
                            basic: 0,
                            hra: 0,
                            medicalAllowance: 0,
                            conveyanceAllowance: 0,
                            specialAllowance: 0
                        });
                        setIsGenerateModalOpen(true);
                    }}
                    className="bg-[#2D79C7] hover:bg-[#1D5E9E] text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shrink-0"
                >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    <span>Process New Salary</span>
                </button>
            </div>

            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-white border border-gray-200/80 rounded-[16px] p-5 shadow-sm flex items-center justify-between hover:border-gray-300 transition-all">
                    <div>
                        <span className="text-gray-400 text-[10.5px] font-bold uppercase tracking-wider block">Total Payslips Issued</span>
                        <div className="text-2xl font-black text-gray-900 mt-1">{payslips.length}</div>
                        <span className="text-[11px] font-medium text-gray-500 mt-1 block">Issued this month</span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#2D79C7] flex items-center justify-center border border-blue-100">
                        <FileText className="w-5 h-5" strokeWidth={2} />
                    </div>
                </div>

                <div className="bg-white border border-gray-200/80 rounded-[16px] p-5 shadow-sm flex items-center justify-between hover:border-gray-300 transition-all">
                    <div>
                        <span className="text-gray-400 text-[10.5px] font-bold uppercase tracking-wider block">Total Payroll Outflow</span>
                        <div className="text-2xl font-black text-gray-900 mt-1">₹{totalOutflow.toLocaleString("en-IN")}</div>
                        <span className="text-[11px] font-medium text-gray-500 mt-1 block">Net payout amount</span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                        <IndianRupee className="w-5 h-5" strokeWidth={2.2} />
                    </div>
                </div>

                <div className="bg-white border border-gray-200/80 rounded-[16px] p-5 shadow-sm flex items-center justify-between hover:border-gray-300 transition-all">
                    <div>
                        <span className="text-gray-400 text-[10.5px] font-bold uppercase tracking-wider block">Idea Fueled Entity</span>
                        <div className="text-2xl font-black text-gray-900 mt-1">{ideaFueledCount} <span className="text-xs text-gray-400 font-medium">Records</span></div>
                        <span className="text-[11px] font-medium text-gray-500 mt-1 block">Regular entity</span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center border border-slate-200">
                        <Building2 className="w-5 h-5" strokeWidth={2} />
                    </div>
                </div>

                <div className="bg-white border border-gray-200/80 rounded-[16px] p-5 shadow-sm flex items-center justify-between hover:border-gray-300 transition-all">
                    <div>
                        <span className="text-gray-400 text-[10.5px] font-bold uppercase tracking-wider block">Idea Fueled LLP Entity</span>
                        <div className="text-2xl font-black text-gray-900 mt-1">{ideaFueledLlpCount} <span className="text-xs text-gray-400 font-medium">Records</span></div>
                        <span className="text-[11px] font-medium text-gray-500 mt-1 block">LLP entity</span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-100">
                        <Building className="w-5 h-5" strokeWidth={2} />
                    </div>
                </div>
            </div>

            {/* Filter Bar & Table Container */}
            <div className="bg-white border border-gray-200/80 rounded-[16px] p-6 shadow-sm space-y-5">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by Employee name or Period (e.g. JUN 2026)..."
                            className="w-full pl-10 pr-8 py-2 bg-gray-50/80 border border-gray-200/80 rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:border-[#2D79C7]"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery("")}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        {/* Month Filter Dropdown */}
                        <div className="flex items-center gap-1.5 bg-gray-50/80 border border-gray-200/80 rounded-xl px-2.5 py-1.5 shadow-2xs">
                            <Calendar className="w-3.5 h-3.5 text-[#2D79C7]" />
                            <select
                                value={selectedMonthFilter}
                                onChange={(e) => setSelectedMonthFilter(e.target.value)}
                                className="bg-transparent border-0 text-xs text-gray-700 font-bold focus:outline-none cursor-pointer"
                            >
                                <option value="all">All Months</option>
                                <option value="JAN">January (JAN)</option>
                                <option value="FEB">February (FEB)</option>
                                <option value="MAR">March (MAR)</option>
                                <option value="APR">April (APR)</option>
                                <option value="MAY">May (MAY)</option>
                                <option value="JUN">June (JUN)</option>
                                <option value="JUL">July (JUL)</option>
                                <option value="AUG">August (AUG)</option>
                                <option value="SEP">September (SEP)</option>
                                <option value="OCT">October (OCT)</option>
                                <option value="NOV">November (NOV)</option>
                                <option value="DEC">December (DEC)</option>
                            </select>
                        </div>

                        {/* Year Filter Dropdown */}
                        <div className="flex items-center gap-1.5 bg-gray-50/80 border border-gray-200/80 rounded-xl px-2.5 py-1.5 shadow-2xs">
                            <select
                                value={selectedYearFilter}
                                onChange={(e) => setSelectedYearFilter(e.target.value)}
                                className="bg-transparent border-0 text-xs text-gray-700 font-bold focus:outline-none cursor-pointer"
                            >
                                <option value="all">All Years</option>
                                {YEARS.map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>

                        {/* Entity Filter */}
                        <div className="flex items-center gap-1 bg-gray-100/80 p-1 rounded-xl border border-gray-200/50">
                            <button
                                onClick={() => setSelectedEntityFilter("all")}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${selectedEntityFilter === "all" ? "bg-white text-[#2D79C7] shadow-xs" : "text-gray-600 hover:text-gray-900"}`}
                            >
                                All Entities
                            </button>
                            <button
                                onClick={() => setSelectedEntityFilter("Idea Fueled")}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${selectedEntityFilter === "Idea Fueled" ? "bg-white text-[#2D79C7] shadow-xs" : "text-gray-600 hover:text-gray-900"}`}
                            >
                                Idea Fueled
                            </button>
                            <button
                                onClick={() => setSelectedEntityFilter("Idea Fueled LLP")}
                                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${selectedEntityFilter === "Idea Fueled LLP" ? "bg-white text-[#2D79C7] shadow-xs" : "text-gray-600 hover:text-gray-900"}`}
                            >
                                Idea Fueled LLP
                            </button>
                        </div>

                        {/* Reset Filters */}
                        {(searchQuery || selectedMonthFilter !== "all" || selectedYearFilter !== "all" || selectedEntityFilter !== "all") && (
                            <button
                                onClick={() => {
                                    setSearchQuery("");
                                    setSelectedMonthFilter("all");
                                    setSelectedYearFilter("all");
                                    setSelectedEntityFilter("all");
                                }}
                                className="text-[#2D79C7] hover:underline text-xs font-bold cursor-pointer px-1.5 py-1"
                            >
                                Reset
                            </button>
                        )}
                    </div>
                </div>

                {/* Payslips List Table */}
                {loading ? (
                    <div className="py-16 text-center text-gray-400 font-semibold flex flex-col items-center justify-center gap-3">
                        <Loader2 className="w-8 h-8 text-[#2D79C7] animate-spin" />
                        <span>Loading payroll records...</span>
                    </div>
                ) : filteredPayslips.length === 0 ? (
                    <div className="py-16 text-center text-gray-400 border-2 border-dashed border-gray-200/80 rounded-xl flex flex-col items-center justify-center gap-2">
                        <FileText className="w-10 h-10 text-gray-300" />
                        <p className="font-bold text-gray-700 text-sm">No payslips found</p>
                        <p className="text-xs text-gray-500">
                            {payslips.length > 0
                                ? "No payslips match your active filters. Try resetting the month, entity, or search filter."
                                : "Click \"Process New Salary\" to generate monthly payslips."}
                        </p>
                        {payslips.length > 0 && (
                            <button
                                onClick={() => {
                                    setSearchQuery("");
                                    setSelectedMonthFilter("all");
                                    setSelectedYearFilter("all");
                                    setSelectedEntityFilter("all");
                                }}
                                className="mt-2 text-xs font-bold text-[#2D79C7] hover:underline cursor-pointer"
                            >
                                Reset All Filters
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-100 text-[10.5px] font-bold uppercase tracking-wider text-gray-400 bg-gray-50/70">
                                    <th className="py-3.5 px-4">Employee</th>
                                    <th className="py-3.5 px-4">Organization Entity</th>
                                    <th className="py-3.5 px-4">Pay Period</th>
                                    <th className="py-3.5 px-4">Days Payable</th>
                                    <th className="py-3.5 px-4">Total Earnings</th>
                                    <th className="py-3.5 px-4">Net Salary Payable</th>
                                    <th className="py-3.5 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-xs font-semibold text-gray-700">
                                {filteredPayslips.map((p) => {
                                    const isLLP = (p.companyEntity || "").toLowerCase().includes("llp");
                                    const emp = p.employeeDetails || {};
                                    return (
                                        <tr key={p._id} className="hover:bg-gray-50/60 transition-colors">
                                            <td className="py-4 px-4">
                                                <div className="flex items-center gap-3">
                                                    <Avatar src={p.employeeId?.profilePicture} name={emp.name} size="w-9 h-9" textSize="text-xs font-bold" />
                                                    <div>
                                                        <span className="font-bold text-gray-900 block text-xs">{emp.name}</span>
                                                        <span className="text-[10.5px] text-gray-500 font-medium">{emp.employeeNumber} • {emp.designation}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${isLLP ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-blue-50 text-blue-700 border-blue-200"}`}>
                                                    <Building2 className="w-3.5 h-3.5" />
                                                    {p.companyEntity}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4 font-bold text-gray-900">
                                                {p.periodString}
                                            </td>
                                            <td className="py-4 px-4 font-medium text-gray-600">
                                                {p.attendanceDetails?.daysPayable ?? 30} Days
                                            </td>
                                            <td className="py-4 px-4 font-bold text-gray-800">
                                                ₹{(p.earnings?.totalEarnings || 0).toLocaleString("en-IN")}
                                            </td>
                                            <td className="py-4 px-4 font-bold text-emerald-600 text-sm">
                                                ₹{(p.netSalaryPayable || 0).toLocaleString("en-IN")}
                                            </td>
                                            <td className="py-4 px-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleDownloadPdf(p)}
                                                        className="px-3.5 py-1.5 bg-[#2D79C7] hover:bg-[#1D5E9E] text-white rounded-lg font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                                                        title="Download Official PDF"
                                                    >
                                                        <Download className="w-3.5 h-3.5" />
                                                        <span>Download PDF</span>
                                                    </button>

                                                    <button
                                                        onClick={() => handleDeleteClick(p)}
                                                        className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
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
                <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[20px] max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8 animate-scaleIn border border-gray-200">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#2D79C7] flex items-center justify-center font-bold text-lg border border-blue-100">
                                    ₹
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 text-base">Process Employee Monthly Salary</h3>
                                    <p className="text-xs text-gray-500 font-medium">Select employee, month & year to compute payslip PDF.</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsGenerateModalOpen(false)}
                                className="text-gray-400 hover:text-gray-700 text-lg font-bold cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleGenerateSubmit} className="space-y-6">
                            {/* Employee & Period Select */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="sm:col-span-3">
                                    <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">Select Employee *</label>
                                    <select
                                        value={selectedEmpId}
                                        onChange={(e) => handleEmployeeSelect(e.target.value)}
                                        required
                                        className="w-full p-2.5 bg-gray-50/80 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:border-[#2D79C7] focus:outline-none"
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
                                    <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">Pay Month *</label>
                                    <select
                                        value={selectedMonth}
                                        onChange={(e) => setSelectedMonth(e.target.value)}
                                        className="w-full p-2.5 bg-gray-50/80 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:border-[#2D79C7] focus:outline-none"
                                    >
                                        {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">Pay Year *</label>
                                    <select
                                        value={selectedYear}
                                        onChange={(e) => setSelectedYear(e.target.value)}
                                        className="w-full p-2.5 bg-gray-50/80 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 focus:border-[#2D79C7] focus:outline-none"
                                    >
                                        {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">Company Entity</label>
                                    <input
                                        type="text"
                                        readOnly
                                        value={employees.find(e => e._id === selectedEmpId)?.companyEntity || "Idea Fueled"}
                                        className="w-full p-2.5 bg-gray-100 border border-gray-200 rounded-xl text-xs font-bold text-[#2D79C7]"
                                    />
                                </div>
                            </div>

                            {/* Attendance Days */}
                            <div className="bg-gray-50/80 p-4 border border-gray-200/80 rounded-xl space-y-3">
                                <h4 className="text-[11px] font-bold text-gray-800 uppercase tracking-wider">Attendance & Working Days</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Actual Payable Days</label>
                                        <input
                                            type="number"
                                            value={attendance.actualPayableDays}
                                            onChange={(e) => handleActualPayableDaysChange(e.target.value)}
                                            className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Total Working Days</label>
                                        <input
                                            type="number"
                                            value={attendance.totalWorkingDays}
                                            onChange={(e) => handleTotalWorkingDaysChange(e.target.value)}
                                            className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Loss Of Pay Days (e.g. 1.5)</label>
                                        <input
                                            type="number"
                                            step="any"
                                            value={attendance.lossOfPayDays}
                                            onChange={(e) => handleLopDaysChange(e.target.value)}
                                            className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs font-bold text-rose-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            placeholder="0"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Days Payable</label>
                                        <input
                                            type="number"
                                            step="any"
                                            readOnly
                                            value={daysPayable}
                                            className="w-full p-2 bg-gray-100 border border-gray-200 rounded-lg text-xs font-bold text-emerald-600 cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Earnings Breakdown (5 inputs) */}
                            <div className="bg-gray-50/80 p-4 border border-gray-200/80 rounded-xl space-y-3">
                                <h4 className="text-[11px] font-bold text-gray-800 uppercase tracking-wider">Earnings Breakdown (Monthly ₹)</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Basic Pay (50%)</label>
                                        <input
                                            type="number"
                                            value={earnings.basic}
                                            onChange={(e) => handleEarningChange("basic", e.target.value)}
                                            className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">HRA (20%)</label>
                                        <input
                                            type="number"
                                            value={earnings.hra}
                                            onChange={(e) => handleEarningChange("hra", e.target.value)}
                                            className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Medical Allowance (10%)</label>
                                        <input
                                            type="number"
                                            value={earnings.medicalAllowance}
                                            onChange={(e) => handleEarningChange("medicalAllowance", e.target.value)}
                                            className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Conveyance Allowance (10%)</label>
                                        <input
                                            type="number"
                                            value={earnings.conveyanceAllowance}
                                            onChange={(e) => handleEarningChange("conveyanceAllowance", e.target.value)}
                                            className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                    </div>
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">Special Allowances (10%)</label>
                                        <input
                                            type="number"
                                            value={earnings.specialAllowance}
                                            onChange={(e) => handleEarningChange("specialAllowance", e.target.value)}
                                            className="w-full p-2 bg-white border border-gray-200 rounded-lg text-xs font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                    </div>
                                </div>
                                <p className="text-[10px] text-gray-400 italic">Special allowances include telephone bill, &amp; other miscellaneous allowances.</p>
                            </div>

                            {/* Net Pay Box Summary */}
                            <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <span className="text-xs font-bold text-emerald-900 uppercase block">Calculated Net Salary Payable</span>
                                    <span className="text-xs text-emerald-700 font-medium">
                                        Gross: ₹{effectiveGross.toLocaleString("en-IN")}
                                        {lossOfPayDays > 0 && ` • LOP Deduction (${lossOfPayDays} days): -₹${lopDeduction.toLocaleString("en-IN")}`}
                                    </span>
                                </div>
                                <div className="text-right">
                                    <span className="text-xl font-bold text-emerald-700">₹{totalEarnings.toLocaleString("en-IN")}</span>
                                </div>
                            </div>

                            {/* Submit Buttons */}
                            <div className="flex items-center justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsGenerateModalOpen(false)}
                                    className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-800 border border-gray-200 rounded-xl cursor-pointer"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-5 py-2 text-xs font-bold text-white bg-[#2D79C7] hover:bg-[#1D5E9E] rounded-xl shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-60"
                                >
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                    <span>Save & Issue Payslip</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Confirm Delete Payslip Dialog */}
            {deleteConfirmPayslip && (
                <ConfirmDialog
                    isOpen={!!deleteConfirmPayslip}
                    title="Delete Payslip Record?"
                    message={`Are you sure you want to delete the payslip for ${deleteConfirmPayslip.employeeName || "this employee"} (${deleteConfirmPayslip.periodString || "selected period"})? This action cannot be undone.`}
                    confirmLabel="Delete Payslip"
                    variant="danger"
                    loading={deleting}
                    onConfirm={handleConfirmDelete}
                    onCancel={() => setDeleteConfirmPayslip(null)}
                />
            )}
        </div>
    );
}
