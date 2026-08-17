import React, { useState, useEffect, useCallback } from "react";
import {
    UserCheck, UserMinus, UserPlus, Clock, CheckCircle2, AlertCircle,
    Search, ChevronDown, Plus, Edit3, Trash2, X, FileText, Check,
    Building2, Shield, Calendar, Layers, CheckSquare, RefreshCw,
    Award, ShieldAlert, ArrowRight, UserX, Loader2, Info
} from "lucide-react";
import { toast } from "sonner";
import ConfirmDialog from "../../components/ConfirmDialog";
import {
    ViewToggle, SkeletonLoader, EmptyState, SearchBar, Avatar
} from "../../components/SharedComponents";
import {
    getOnboardingRecords,
    createOnboardingRecord,
    updateOnboardingRecord,
    deleteOnboardingRecord,
    getOffboardingRecords,
    initiateOffboarding,
    updateOffboardingRecord,
    deleteOffboardingRecord
} from "../../services/offboarding-onboarding.service";
import { getManagers, getDepartments } from "../../services/employee.service";

/* ─────────────────────────────────────────────
   CONSTANTS & HELPERS
───────────────────────────────────────────── */
const ONBOARDING_STATUSES = ["Upcoming", "In Progress", "Completed"];
const OFFBOARDING_STATUSES = ["Initiated", "In Progress", "Clearance Pending", "Completed"];
const REASONS_FOR_LEAVING = [
    "Better Opportunity", "Personal Reasons", "Relocation",
    "Higher Education", "Career Change", "Health Reasons", "Performance / Mutual Agreement", "Other"
];
const NOTICE_PERIODS = ["Immediate", "15 Days", "30 Days", "60 Days", "90 Days"];

const onboardingStatusBadge = (s) => ({
    Upcoming: "bg-[#F0F7FF] text-[#1F5EA8] border-[#D0E5FC]",
    "In Progress": "bg-[#FEFCE8] text-[#A16207] border-[#FEF08A]",
    Completed: "bg-[#F0FDF4] text-[#15803D] border-[#DCFCE7]",
}[s] || "bg-gray-100 text-gray-600 border-gray-200");

const offboardingStatusBadge = (s) => ({
    Initiated: "bg-[#F0F7FF] text-[#1F5EA8] border-[#D0E5FC]",
    "In Progress": "bg-[#FEFCE8] text-[#A16207] border-[#FEF08A]",
    "Clearance Pending": "bg-[#F5F3FF] text-[#6D28D9] border-[#DDD6FE]",
    Completed: "bg-[#F0FDF4] text-[#15803D] border-[#DCFCE7]",
}[s] || "bg-gray-100 text-gray-600 border-gray-200");

const formatDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

/* ─────────────────────────────────────────────
   FORM HELPERS
───────────────────────────────────────────── */
const FormField = ({ label, required, children, error }) => (
    <div className="flex flex-col gap-1">
        <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">
            {label}{required && <span className="text-rose-500 ml-0.5">*</span>}
        </label>
        {children}
        {error && <p className="text-xs text-rose-500 font-medium mt-0.5">{error}</p>}
    </div>
);

const inputCls = "w-full px-3 py-2 bg-white border border-gray-200 rounded-[10px] text-xs text-[#1E1E1E] focus:outline-none focus:border-[#2D79C7] focus:ring-1 focus:ring-[#2D79C7] transition-all placeholder-gray-400 disabled:bg-gray-50 disabled:text-gray-400";
const selectCls = `${inputCls} cursor-pointer appearance-none`;

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
const OffboardingOnboarding = () => {
    const [activeTab, setActiveTab] = useState("onboarding"); // "onboarding" | "offboarding"
    const [viewMode, setViewMode] = useState("list");
    const [loading, setLoading] = useState(true);

    // Onboarding State
    const [onboardingRecords, setOnboardingRecords] = useState([]);
    const [onboardingSummary, setOnboardingSummary] = useState({ total: 0, upcoming: 0, inProgress: 0, completed: 0 });
    const [onboardingFilters, setOnboardingFilters] = useState({ search: "", status: "", department: "" });

    // Offboarding State
    const [offboardingRecords, setOffboardingRecords] = useState([]);
    const [offboardingSummary, setOffboardingSummary] = useState({ total: 0, initiated: 0, inProgress: 0, clearancePending: 0, completed: 0 });
    const [offboardingFilters, setOffboardingFilters] = useState({ search: "", status: "", department: "" });

    // Metadata
    const [employeesList, setEmployeesList] = useState([]);
    const [departmentsList, setDepartmentsList] = useState([]);

    // Modals
    const [showInitiateOnboardingModal, setShowInitiateOnboardingModal] = useState(false);
    const [showUpdateOnboardingModal, setShowUpdateOnboardingModal] = useState(false);
    const [selectedOnboardingRecord, setSelectedOnboardingRecord] = useState(null);

    const [showInitiateOffboardingModal, setShowInitiateOffboardingModal] = useState(false);
    const [showUpdateOffboardingModal, setShowUpdateOffboardingModal] = useState(false);
    const [selectedOffboardingRecord, setSelectedOffboardingRecord] = useState(null);

    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, type: "", record: null });

    // Fetch Onboarding & Metadata
    const fetchOnboardingData = useCallback(async () => {
        setLoading(true);
        try {
            const [onbRes, empRes, deptRes] = await Promise.all([
                getOnboardingRecords(onboardingFilters),
                getManagers(),
                getDepartments()
            ]);

            if (onbRes.data?.success) {
                setOnboardingRecords(onbRes.data.onboardingRecords || []);
                setOnboardingSummary(onbRes.data.summary || {});
            }

            if (empRes.data?.success) {
                setEmployeesList(empRes.data.managers || []);
            }

            if (deptRes.data?.success) {
                setDepartmentsList(deptRes.data.departments || []);
            }
        } catch (error) {
            console.error("Fetch Onboarding Error:", error);
            toast.error("Failed to load onboarding data.");
        } finally {
            setLoading(false);
        }
    }, [onboardingFilters]);

    // Fetch Offboarding Data
    const fetchOffboardingData = useCallback(async () => {
        setLoading(true);
        try {
            const offbRes = await getOffboardingRecords(offboardingFilters);
            if (offbRes.data?.success) {
                setOffboardingRecords(offbRes.data.offboardingRecords || []);
                setOffboardingSummary(offbRes.data.summary || {});
            }
        } catch (error) {
            console.error("Fetch Offboarding Error:", error);
            toast.error("Failed to load offboarding data.");
        } finally {
            setLoading(false);
        }
    }, [offboardingFilters]);

    useEffect(() => {
        if (activeTab === "onboarding") {
            fetchOnboardingData();
        } else {
            fetchOffboardingData();
        }
    }, [activeTab, fetchOnboardingData, fetchOffboardingData]);

    // Delete Onboarding
    const handleDeleteOnboarding = async (record) => {
        try {
            const res = await deleteOnboardingRecord(record._id);
            if (res.data?.success) {
                toast.success(res.data.message || "Record deleted.");
                fetchOnboardingData();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to delete record.");
        }
    };

    // Delete Offboarding
    const handleDeleteOffboarding = async (record) => {
        try {
            const res = await deleteOffboardingRecord(record._id);
            if (res.data?.success) {
                toast.success(res.data.message || "Record deleted.");
                fetchOffboardingData();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to delete record.");
        }
    };

    return (
        <div className="space-y-6 text-left select-none animate-fadeIn">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                <div>
                    <h2 className="text-[#1E1E1E] text-[20px] font-extrabold flex items-center gap-2">
                        <Layers className="w-6 h-6 text-[#2D79C7]" />
                        Offboarding & Onboarding
                    </h2>
                    <p className="text-gray-400 text-[12px] font-medium mt-1">
                        Track new employee joining activities and manage exit clearance processes.
                    </p>
                </div>

                {activeTab === "onboarding" ? (
                    <button
                        onClick={() => setShowInitiateOnboardingModal(true)}
                        className="bg-gradient-to-r from-[#2D79C7] to-[#1F5EA8] text-white text-xs font-bold px-4 py-2.5 rounded-[12px] hover:opacity-95 transition-all shadow-md flex items-center gap-2 cursor-pointer shrink-0"
                    >
                        <UserPlus className="w-4 h-4" />
                        <span>Initiate Onboarding</span>
                    </button>
                ) : (
                    <button
                        onClick={() => setShowInitiateOffboardingModal(true)}
                        className="bg-gradient-to-r from-[#2D79C7] to-[#1F5EA8] text-white text-xs font-bold px-4 py-2.5 rounded-[12px] hover:opacity-95 transition-all shadow-md flex items-center gap-2 cursor-pointer shrink-0"
                    >
                        <UserMinus className="w-4 h-4" />
                        <span>Initiate Offboarding</span>
                    </button>
                )}
            </div>

            {/* Sub-Tabs Navigation */}
            <div className="flex items-center justify-between border-b border-gray-200">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setActiveTab("onboarding")}
                        className={`px-5 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                            activeTab === "onboarding"
                                ? "border-[#2D79C7] text-[#2D79C7]"
                                : "border-transparent text-gray-400 hover:text-gray-600"
                        }`}
                    >
                        <UserPlus className="w-4 h-4" />
                        <span>Onboarding</span>
                        <span className={`px-2 py-0.5 text-[10px] rounded-full font-black ${activeTab === "onboarding" ? "bg-blue-50 text-[#2D79C7]" : "bg-gray-100 text-gray-500"}`}>
                            {onboardingSummary.total || 0}
                        </span>
                    </button>

                    <button
                        onClick={() => setActiveTab("offboarding")}
                        className={`px-5 py-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                            activeTab === "offboarding"
                                ? "border-[#2D79C7] text-[#2D79C7]"
                                : "border-transparent text-gray-400 hover:text-gray-600"
                        }`}
                    >
                        <UserMinus className="w-4 h-4" />
                        <span>Offboarding</span>
                        <span className={`px-2 py-0.5 text-[10px] rounded-full font-black ${activeTab === "offboarding" ? "bg-blue-50 text-[#2D79C7]" : "bg-gray-100 text-gray-500"}`}>
                            {offboardingSummary.total || 0}
                        </span>
                    </button>
                </div>

                <ViewToggle view={viewMode} onViewChange={setViewMode} />
            </div>

            {/* TAB 1: ONBOARDING */}
            {activeTab === "onboarding" && (
                <div className="space-y-4">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div className="premium-3d-card-mini p-4 flex flex-col gap-2">
                            <div className="w-8 h-8 rounded-[10px] border flex items-center justify-center bg-blue-50 text-[#2D79C7] border-blue-100">
                                <UserPlus className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-[24px] font-black text-[#1E1E1E] leading-none">{onboardingSummary.total || 0}</p>
                                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-1">Total Onboarding</p>
                            </div>
                        </div>

                        <div className="premium-3d-card-mini p-4 flex flex-col gap-2">
                            <div className="w-8 h-8 rounded-[10px] border flex items-center justify-center bg-[#F0F7FF] text-[#1F5EA8] border-[#D0E5FC]">
                                <Clock className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-[24px] font-black text-[#1E1E1E] leading-none">{onboardingSummary.upcoming || 0}</p>
                                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-1">Upcoming</p>
                            </div>
                        </div>

                        <div className="premium-3d-card-mini p-4 flex flex-col gap-2">
                            <div className="w-8 h-8 rounded-[10px] border flex items-center justify-center bg-amber-50 text-amber-700 border-amber-100">
                                <RefreshCw className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-[24px] font-black text-[#1E1E1E] leading-none">{onboardingSummary.inProgress || 0}</p>
                                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-1">In Progress</p>
                            </div>
                        </div>

                        <div className="premium-3d-card-mini p-4 flex flex-col gap-2">
                            <div className="w-8 h-8 rounded-[10px] border flex items-center justify-center bg-emerald-50 text-emerald-700 border-emerald-100">
                                <CheckCircle2 className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-[24px] font-black text-[#1E1E1E] leading-none">{onboardingSummary.completed || 0}</p>
                                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-1">Completed</p>
                            </div>
                        </div>
                    </div>

                    {/* Filter Bar */}
                    <div className="flex flex-wrap items-center gap-2 bg-white p-3 border border-gray-200/70 rounded-[16px] shadow-sm">
                        <SearchBar
                            value={onboardingFilters.search}
                            onChange={(v) => setOnboardingFilters({ ...onboardingFilters, search: v })}
                            placeholder="Search employee name, ID, department..."
                        />

                        <div className="relative">
                            <select
                                value={onboardingFilters.status}
                                onChange={(e) => setOnboardingFilters({ ...onboardingFilters, status: e.target.value })}
                                className="pl-3 pr-8 h-[38px] bg-white border border-gray-200 rounded-[12px] text-xs text-[#1E1E1E] focus:outline-none focus:border-[#2D79C7] appearance-none cursor-pointer"
                            >
                                <option value="">All Statuses</option>
                                {ONBOARDING_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <ChevronDown className="w-3 h-3 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>

                        <div className="relative">
                            <select
                                value={onboardingFilters.department}
                                onChange={(e) => setOnboardingFilters({ ...onboardingFilters, department: e.target.value })}
                                className="pl-3 pr-8 h-[38px] bg-white border border-gray-200 rounded-[12px] text-xs text-[#1E1E1E] focus:outline-none focus:border-[#2D79C7] appearance-none cursor-pointer"
                            >
                                <option value="">All Departments</option>
                                {departmentsList.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                            <ChevronDown className="w-3 h-3 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>

                        {(onboardingFilters.search || onboardingFilters.status || onboardingFilters.department) && (
                            <button
                                onClick={() => setOnboardingFilters({ search: "", status: "", department: "" })}
                                className="text-xs font-bold text-rose-600 hover:text-rose-700 px-3 py-1.5 rounded-[8px] hover:bg-rose-50 transition-colors cursor-pointer"
                            >
                                Reset Filters
                            </button>
                        )}
                    </div>

                    {/* Onboarding Records */}
                    {loading ? (
                        <SkeletonLoader type={viewMode === "card" ? "card" : "table"} rows={5} />
                    ) : onboardingRecords.length === 0 ? (
                        <EmptyState message="No onboarding records" description="No onboarding activities match your criteria or none have been created yet." />
                    ) : viewMode === "list" ? (
                        <div className="premium-3d-card overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[1050px] whitespace-nowrap">
                                    <thead>
                                        <tr className="bg-[#F9FAFB] border-b border-[#F3F4F6]">
                                            <th className="text-left px-4 py-3 text-xs text-gray-400 font-extrabold uppercase tracking-wider">Employee</th>
                                            <th className="text-left px-4 py-3 text-xs text-gray-400 font-extrabold uppercase tracking-wider">Emp ID</th>
                                            <th className="text-left px-4 py-3 text-xs text-gray-400 font-extrabold uppercase tracking-wider">Department</th>
                                            <th className="text-left px-4 py-3 text-xs text-gray-400 font-extrabold uppercase tracking-wider">Joining Date</th>
                                            <th className="text-left px-4 py-3 text-xs text-gray-400 font-extrabold uppercase tracking-wider">Reporting Manager</th>
                                            <th className="text-left px-4 py-3 text-xs text-gray-400 font-extrabold uppercase tracking-wider">Work Location</th>
                                            <th className="text-left px-4 py-3 text-xs text-gray-400 font-extrabold uppercase tracking-wider">Checklist Progress</th>
                                            <th className="text-left px-4 py-3 text-xs text-gray-400 font-extrabold uppercase tracking-wider">Status</th>
                                            <th className="text-left px-4 py-3 text-xs text-gray-400 font-extrabold uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#F3F4F6]">
                                        {onboardingRecords.map((record) => {
                                            const emp = record.employee;
                                            const name = emp ? (emp.fullName || `${emp.firstName} ${emp.lastName}`) : "N/A";
                                            const completedCount = Object.values(record.checklist || {}).filter(Boolean).length;

                                            return (
                                                <tr key={record._id} className="hover:bg-blue-50/30 transition-colors group">
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2.5">
                                                            <Avatar src={emp?.profilePicture} name={name} size="w-8 h-8" />
                                                            <div>
                                                                <p className="text-sm font-bold text-[#1E1E1E] leading-none">{name}</p>
                                                                <p className="text-xs text-gray-400 mt-0.5">{emp?.designation || "N/A"}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className="text-[11px] font-bold text-[#2D79C7] bg-blue-50 px-2 py-0.5 rounded-[6px] border border-blue-100">
                                                            {emp?.employeeId || "N/A"}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-gray-600">{emp?.department || "—"}</td>
                                                    <td className="px-4 py-3 text-xs font-semibold text-gray-700">{formatDate(record.joiningDate)}</td>
                                                    <td className="px-4 py-3 text-xs text-gray-600">{emp?.managerId?.fullName || "—"}</td>
                                                    <td className="px-4 py-3 text-xs text-gray-600">{emp?.workLocation || "Office"}</td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-24 h-1.5 bg-gray-150 rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full bg-[#2D79C7] rounded-full transition-all duration-300"
                                                                    style={{ width: `${(completedCount / 5) * 100}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-[11px] font-bold text-gray-500">{completedCount}/5</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${onboardingStatusBadge(record.status)}`}>
                                                            {record.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-1.5">
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedOnboardingRecord(record);
                                                                    setShowUpdateOnboardingModal(true);
                                                                }}
                                                                title="Update Checklist & Status"
                                                                className="p-1.5 bg-blue-50 hover:bg-blue-100 rounded-[8px] text-[#2D79C7] transition-colors cursor-pointer border border-blue-100"
                                                            >
                                                                <Edit3 className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                onClick={() => setConfirmDialog({ isOpen: true, type: "onboarding", record })}
                                                                title="Delete Onboarding Record"
                                                                className="p-1.5 bg-rose-50 hover:bg-rose-100 rounded-[8px] text-rose-600 transition-colors cursor-pointer border border-rose-100"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            {onboardingRecords.map((record) => {
                                const emp = record.employee;
                                const name = emp ? (emp.fullName || `${emp.firstName} ${emp.lastName}`) : "N/A";
                                const completedCount = Object.values(record.checklist || {}).filter(Boolean).length;

                                return (
                                    <div key={record._id} className="premium-3d-card p-5 flex flex-col justify-between gap-4">
                                        <div>
                                            <div className="flex items-start justify-between gap-2 mb-3">
                                                <div className="flex items-center gap-2.5">
                                                    <Avatar src={emp?.profilePicture} name={name} size="w-10 h-10" />
                                                    <div>
                                                        <h3 className="font-bold text-sm text-[#1E1E1E] leading-tight">{name}</h3>
                                                        <p className="text-xs text-gray-400 font-medium">{emp?.employeeId} · {emp?.designation}</p>
                                                    </div>
                                                </div>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${onboardingStatusBadge(record.status)}`}>
                                                    {record.status}
                                                </span>
                                            </div>

                                            <div className="space-y-2 text-xs border-t border-[#F3F4F6] pt-3">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-gray-400 font-bold uppercase text-[10px]">Department:</span>
                                                    <span className="font-semibold text-gray-700">{emp?.department || "N/A"}</span>
                                                </div>

                                                <div className="flex items-center justify-between">
                                                    <span className="text-gray-400 font-bold uppercase text-[10px]">Joining Date:</span>
                                                    <span className="font-semibold text-[#2D79C7]">{formatDate(record.joiningDate)}</span>
                                                </div>

                                                <div className="flex items-center justify-between">
                                                    <span className="text-gray-400 font-bold uppercase text-[10px]">Manager:</span>
                                                    <span className="font-semibold text-gray-700">{emp?.managerId?.fullName || "—"}</span>
                                                </div>

                                                <div className="pt-2">
                                                    <div className="flex justify-between text-[10px] font-bold text-gray-500 mb-1">
                                                        <span>Joining Activities</span>
                                                        <span>{completedCount}/5 Done</span>
                                                    </div>
                                                    <div className="w-full h-1.5 bg-gray-150 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-[#2D79C7] rounded-full transition-all duration-300"
                                                            style={{ width: `${(completedCount / 5) * 100}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 border-t border-[#F3F4F6] pt-3">
                                            <button
                                                onClick={() => {
                                                    setSelectedOnboardingRecord(record);
                                                    setShowUpdateOnboardingModal(true);
                                                }}
                                                className="flex-1 py-1.5 text-xs font-bold text-[#2D79C7] bg-blue-50 hover:bg-blue-100 rounded-[8px] border border-blue-100 transition-colors cursor-pointer flex items-center justify-center gap-1"
                                            >
                                                <Edit3 className="w-3.5 h-3.5" /> Update Checklist
                                            </button>
                                            <button
                                                onClick={() => setConfirmDialog({ isOpen: true, type: "onboarding", record })}
                                                className="p-1.5 bg-rose-50 hover:bg-rose-100 rounded-[8px] text-rose-600 border border-rose-100 transition-colors cursor-pointer"
                                                title="Delete Record"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* TAB 2: OFFBOARDING */}
            {activeTab === "offboarding" && (
                <div className="space-y-4">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                        <div className="premium-3d-card-mini p-4 flex flex-col gap-2">
                            <div className="w-8 h-8 rounded-[10px] border flex items-center justify-center bg-blue-50 text-[#2D79C7] border-blue-100">
                                <UserMinus className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-[24px] font-black text-[#1E1E1E] leading-none">{offboardingSummary.total || 0}</p>
                                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-1">Total Offboarding</p>
                            </div>
                        </div>

                        <div className="premium-3d-card-mini p-4 flex flex-col gap-2">
                            <div className="w-8 h-8 rounded-[10px] border flex items-center justify-center bg-[#F0F7FF] text-[#1F5EA8] border-[#D0E5FC]">
                                <Clock className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-[24px] font-black text-[#1E1E1E] leading-none">{offboardingSummary.initiated || 0}</p>
                                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-1">Initiated</p>
                            </div>
                        </div>

                        <div className="premium-3d-card-mini p-4 flex flex-col gap-2">
                            <div className="w-8 h-8 rounded-[10px] border flex items-center justify-center bg-amber-50 text-amber-700 border-amber-100">
                                <RefreshCw className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-[24px] font-black text-[#1E1E1E] leading-none">{offboardingSummary.inProgress || 0}</p>
                                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-1">In Progress</p>
                            </div>
                        </div>

                        <div className="premium-3d-card-mini p-4 flex flex-col gap-2">
                            <div className="w-8 h-8 rounded-[10px] border flex items-center justify-center bg-purple-50 text-purple-700 border-purple-100">
                                <CheckSquare className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-[24px] font-black text-[#1E1E1E] leading-none">{offboardingSummary.clearancePending || 0}</p>
                                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-1">Clearance Pending</p>
                            </div>
                        </div>

                        <div className="premium-3d-card-mini p-4 flex flex-col gap-2">
                            <div className="w-8 h-8 rounded-[10px] border flex items-center justify-center bg-emerald-50 text-emerald-700 border-emerald-100">
                                <CheckCircle2 className="w-4 h-4" />
                            </div>
                            <div>
                                <p className="text-[24px] font-black text-[#1E1E1E] leading-none">{offboardingSummary.completed || 0}</p>
                                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mt-1">Exited / Done</p>
                            </div>
                        </div>
                    </div>

                    {/* Filter Bar */}
                    <div className="flex flex-wrap items-center gap-2 bg-white p-3 border border-gray-200/70 rounded-[16px] shadow-sm">
                        <SearchBar
                            value={offboardingFilters.search}
                            onChange={(v) => setOffboardingFilters({ ...offboardingFilters, search: v })}
                            placeholder="Search employee name, ID, department..."
                        />

                        <div className="relative">
                            <select
                                value={offboardingFilters.status}
                                onChange={(e) => setOffboardingFilters({ ...offboardingFilters, status: e.target.value })}
                                className="pl-3 pr-8 h-[38px] bg-white border border-gray-200 rounded-[12px] text-xs text-[#1E1E1E] focus:outline-none focus:border-[#2D79C7] appearance-none cursor-pointer"
                            >
                                <option value="">All Statuses</option>
                                {OFFBOARDING_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <ChevronDown className="w-3 h-3 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>

                        <div className="relative">
                            <select
                                value={offboardingFilters.department}
                                onChange={(e) => setOffboardingFilters({ ...offboardingFilters, department: e.target.value })}
                                className="pl-3 pr-8 h-[38px] bg-white border border-gray-200 rounded-[12px] text-xs text-[#1E1E1E] focus:outline-none focus:border-[#2D79C7] appearance-none cursor-pointer"
                            >
                                <option value="">All Departments</option>
                                {departmentsList.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                            <ChevronDown className="w-3 h-3 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>

                        {(offboardingFilters.search || offboardingFilters.status || offboardingFilters.department) && (
                            <button
                                onClick={() => setOffboardingFilters({ search: "", status: "", department: "" })}
                                className="text-xs font-bold text-rose-600 hover:text-rose-700 px-3 py-1.5 rounded-[8px] hover:bg-rose-50 transition-colors cursor-pointer"
                            >
                                Reset Filters
                            </button>
                        )}
                    </div>

                    {/* Offboarding Records */}
                    {loading ? (
                        <SkeletonLoader type={viewMode === "card" ? "card" : "table"} rows={5} />
                    ) : offboardingRecords.length === 0 ? (
                        <EmptyState message="No offboarding records" description="No employee exits match your search criteria or none have been initiated." />
                    ) : viewMode === "list" ? (
                        <div className="premium-3d-card overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[1100px] whitespace-nowrap">
                                    <thead>
                                        <tr className="bg-[#F9FAFB] border-b border-[#F3F4F6]">
                                            <th className="text-left px-4 py-3 text-xs text-gray-400 font-extrabold uppercase tracking-wider">Employee</th>
                                            <th className="text-left px-4 py-3 text-xs text-gray-400 font-extrabold uppercase tracking-wider">Emp ID</th>
                                            <th className="text-left px-4 py-3 text-xs text-gray-400 font-extrabold uppercase tracking-wider">Department</th>
                                            <th className="text-left px-4 py-3 text-xs text-gray-400 font-extrabold uppercase tracking-wider">Resignation Date</th>
                                            <th className="text-left px-4 py-3 text-xs text-gray-400 font-extrabold uppercase tracking-wider">Last Working Day</th>
                                            <th className="text-left px-4 py-3 text-xs text-gray-400 font-extrabold uppercase tracking-wider">Reason</th>
                                            <th className="text-left px-4 py-3 text-xs text-gray-400 font-extrabold uppercase tracking-wider">Clearances</th>
                                            <th className="text-left px-4 py-3 text-xs text-gray-400 font-extrabold uppercase tracking-wider">Status</th>
                                            <th className="text-left px-4 py-3 text-xs text-gray-400 font-extrabold uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#F3F4F6]">
                                        {offboardingRecords.map((record) => {
                                            const emp = record.employee;
                                            const name = emp ? (emp.fullName || `${emp.firstName} ${emp.lastName}`) : "N/A";
                                            const clearedCount = Object.values(record.clearanceActivities || {}).filter(c => c?.completed).length;

                                            return (
                                                <tr key={record._id} className="hover:bg-blue-50/30 transition-colors group">
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2.5">
                                                            <Avatar src={emp?.profilePicture} name={name} size="w-8 h-8" />
                                                            <div>
                                                                <p className="text-sm font-bold text-[#1E1E1E] leading-none">{name}</p>
                                                                <p className="text-xs text-gray-400 mt-0.5">{emp?.designation || "N/A"}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className="text-[11px] font-bold text-[#2D79C7] bg-blue-50 px-2 py-0.5 rounded-[6px] border border-blue-100">
                                                            {emp?.employeeId || "N/A"}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-gray-600">{emp?.department || "—"}</td>
                                                    <td className="px-4 py-3 text-xs font-semibold text-gray-700">{formatDate(record.resignationDate)}</td>
                                                    <td className="px-4 py-3 text-xs font-bold text-rose-600">{formatDate(record.lastWorkingDay)}</td>
                                                    <td className="px-4 py-3 text-xs text-gray-600">{record.reasonForLeaving}</td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-20 h-1.5 bg-gray-150 rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                                                                    style={{ width: `${(clearedCount / 5) * 100}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-[11px] font-bold text-gray-500">{clearedCount}/5</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${offboardingStatusBadge(record.status)}`}>
                                                            {record.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-1.5">
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedOffboardingRecord(record);
                                                                    setShowUpdateOffboardingModal(true);
                                                                }}
                                                                title="Manage Clearances & Status"
                                                                className="p-1.5 bg-blue-50 hover:bg-blue-100 rounded-[8px] text-[#2D79C7] transition-colors cursor-pointer border border-blue-100"
                                                            >
                                                                <CheckSquare className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button
                                                                onClick={() => setConfirmDialog({ isOpen: true, type: "offboarding", record })}
                                                                title="Delete Offboarding Record"
                                                                className="p-1.5 bg-rose-50 hover:bg-rose-100 rounded-[8px] text-rose-600 transition-colors cursor-pointer border border-rose-100"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                            {offboardingRecords.map((record) => {
                                const emp = record.employee;
                                const name = emp ? (emp.fullName || `${emp.firstName} ${emp.lastName}`) : "N/A";
                                const clearedCount = Object.values(record.clearanceActivities || {}).filter(c => c?.completed).length;

                                return (
                                    <div key={record._id} className="premium-3d-card p-5 flex flex-col justify-between gap-4">
                                        <div>
                                            <div className="flex items-start justify-between gap-2 mb-3">
                                                <div className="flex items-center gap-2.5">
                                                    <Avatar src={emp?.profilePicture} name={name} size="w-10 h-10" />
                                                    <div>
                                                        <h3 className="font-bold text-sm text-[#1E1E1E] leading-tight">{name}</h3>
                                                        <p className="text-xs text-gray-400 font-medium">{emp?.employeeId} · {emp?.designation}</p>
                                                    </div>
                                                </div>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${offboardingStatusBadge(record.status)}`}>
                                                    {record.status}
                                                </span>
                                            </div>

                                            <div className="space-y-2 text-xs border-t border-[#F3F4F6] pt-3">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-gray-400 font-bold uppercase text-[10px]">Last Day:</span>
                                                    <span className="font-bold text-rose-600">{formatDate(record.lastWorkingDay)}</span>
                                                </div>

                                                <div className="flex items-center justify-between">
                                                    <span className="text-gray-400 font-bold uppercase text-[10px]">Reason:</span>
                                                    <span className="font-semibold text-gray-700 truncate max-w-[150px]">{record.reasonForLeaving}</span>
                                                </div>

                                                <div className="flex items-center justify-between">
                                                    <span className="text-gray-400 font-bold uppercase text-[10px]">Notice Period:</span>
                                                    <span className="font-semibold text-gray-700">{record.noticePeriod}</span>
                                                </div>

                                                <div className="pt-2">
                                                    <div className="flex justify-between text-[10px] font-bold text-gray-500 mb-1">
                                                        <span>Clearance Progress</span>
                                                        <span>{clearedCount}/5 Cleared</span>
                                                    </div>
                                                    <div className="w-full h-1.5 bg-gray-150 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                                                            style={{ width: `${(clearedCount / 5) * 100}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 border-t border-[#F3F4F6] pt-3">
                                            <button
                                                onClick={() => {
                                                    setSelectedOffboardingRecord(record);
                                                    setShowUpdateOffboardingModal(true);
                                                }}
                                                className="flex-1 py-1.5 text-xs font-bold text-[#2D79C7] bg-blue-50 hover:bg-blue-100 rounded-[8px] border border-blue-100 transition-colors cursor-pointer flex items-center justify-center gap-1"
                                            >
                                                <CheckSquare className="w-3.5 h-3.5" /> Clearances ({clearedCount}/5)
                                            </button>
                                            <button
                                                onClick={() => setConfirmDialog({ isOpen: true, type: "offboarding", record })}
                                                className="p-1.5 bg-rose-50 hover:bg-rose-100 rounded-[8px] text-rose-600 border border-rose-100 transition-colors cursor-pointer"
                                                title="Delete Record"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* MODALS */}
            {showInitiateOnboardingModal && (
                <InitiateOnboardingModal
                    employees={employeesList}
                    onClose={() => setShowInitiateOnboardingModal(false)}
                    onSuccess={() => {
                        setShowInitiateOnboardingModal(false);
                        fetchOnboardingData();
                    }}
                />
            )}

            {showUpdateOnboardingModal && selectedOnboardingRecord && (
                <UpdateOnboardingModal
                    record={selectedOnboardingRecord}
                    onClose={() => {
                        setShowUpdateOnboardingModal(false);
                        setSelectedOnboardingRecord(null);
                    }}
                    onSuccess={() => {
                        setShowUpdateOnboardingModal(false);
                        setSelectedOnboardingRecord(null);
                        fetchOnboardingData();
                    }}
                />
            )}

            {showInitiateOffboardingModal && (
                <InitiateOffboardingModal
                    employees={employeesList}
                    onClose={() => setShowInitiateOffboardingModal(false)}
                    onSuccess={() => {
                        setShowInitiateOffboardingModal(false);
                        fetchOffboardingData();
                    }}
                />
            )}

            {showUpdateOffboardingModal && selectedOffboardingRecord && (
                <UpdateOffboardingModal
                    record={selectedOffboardingRecord}
                    onClose={() => {
                        setShowUpdateOffboardingModal(false);
                        setSelectedOffboardingRecord(null);
                    }}
                    onSuccess={() => {
                        setShowUpdateOffboardingModal(false);
                        setSelectedOffboardingRecord(null);
                        fetchOffboardingData();
                    }}
                />
            )}

            {/* CONFIRM DELETE DIALOG */}
            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                title={confirmDialog.type === "onboarding" ? "Delete Onboarding Record" : "Delete Offboarding Record"}
                message={`Are you sure you want to delete this ${confirmDialog.type} record for ${confirmDialog.record?.employee?.fullName || "the employee"}?`}
                confirmText="Delete Record"
                type="danger"
                onConfirm={() => {
                    const target = confirmDialog.record;
                    const type = confirmDialog.type;
                    setConfirmDialog({ isOpen: false, type: "", record: null });
                    if (type === "onboarding") {
                        handleDeleteOnboarding(target);
                    } else {
                        handleDeleteOffboarding(target);
                    }
                }}
                onClose={() => setConfirmDialog({ isOpen: false, type: "", record: null })}
            />
        </div>
    );
};

/* ─────────────────────────────────────────────
   INITIATE ONBOARDING MODAL
───────────────────────────────────────────── */
const InitiateOnboardingModal = ({ employees, onClose, onSuccess }) => {
    const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
    const [joiningDate, setJoiningDate] = useState("");
    const [status, setStatus] = useState("Upcoming");
    const [notes, setNotes] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedEmployeeId) {
            toast.error("Please select an employee.");
            return;
        }

        setSubmitting(true);
        try {
            const res = await createOnboardingRecord({
                employee: selectedEmployeeId,
                joiningDate,
                status,
                notes
            });

            if (res.data?.success) {
                toast.success(res.data.message || "Onboarding initiated successfully.");
                onSuccess();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to initiate onboarding.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[20px] shadow-2xl max-w-md w-full overflow-hidden animate-fadeIn">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-[#2D79C7] to-[#1F5EA8]">
                    <h3 className="text-white text-sm font-bold flex items-center gap-2">
                        <UserPlus className="w-4 h-4" /> Initiate Employee Onboarding
                    </h3>
                    <button onClick={onClose} className="text-white/80 hover:text-white p-1 rounded-md transition-colors cursor-pointer">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 text-left">
                    <FormField label="Select Employee" required>
                        <div className="relative">
                            <select
                                value={selectedEmployeeId}
                                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                                className={selectCls}
                            >
                                <option value="">Select Employee</option>
                                {employees.map(emp => (
                                    <option key={emp._id} value={emp._id}>
                                        {emp.fullName || `${emp.firstName} ${emp.lastName}`} ({emp.employeeId} - {emp.department})
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="w-3 h-3 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                    </FormField>

                    <div className="grid grid-cols-2 gap-3">
                        <FormField label="Joining Date">
                            <input
                                type="date"
                                value={joiningDate}
                                onChange={(e) => setJoiningDate(e.target.value)}
                                className={inputCls}
                            />
                        </FormField>

                        <FormField label="Status">
                            <div className="relative">
                                <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectCls}>
                                    {ONBOARDING_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                                <ChevronDown className="w-3 h-3 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                        </FormField>
                    </div>

                    <FormField label="Notes">
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            placeholder="Initial onboarding remarks or guidelines..."
                            className={`${inputCls} resize-none`}
                        />
                    </FormField>

                    <div className="pt-3 border-t border-gray-100 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-[10px] transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-5 py-2 text-xs font-bold text-white bg-[#2D79C7] hover:bg-[#1F5EA8] rounded-[10px] shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            <span>Save Onboarding</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

/* ─────────────────────────────────────────────
   UPDATE ONBOARDING MODAL
───────────────────────────────────────────── */
const UpdateOnboardingModal = ({ record, onClose, onSuccess }) => {
    const [status, setStatus] = useState(record.status || "Upcoming");
    const [joiningDate, setJoiningDate] = useState(record.joiningDate ? record.joiningDate.split("T")[0] : "");
    const [checklist, setChecklist] = useState(record.checklist || {});
    const [notes, setNotes] = useState(record.notes || "");
    const [submitting, setSubmitting] = useState(false);

    const empName = record.employee?.fullName || `${record.employee?.firstName} ${record.employee?.lastName}`;

    const toggleChecklist = (key) => {
        setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await updateOnboardingRecord(record._id, {
                status,
                joiningDate,
                checklist,
                notes
            });

            if (res.data?.success) {
                toast.success(res.data.message || "Onboarding updated.");
                onSuccess();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to update onboarding.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[20px] shadow-2xl max-w-md w-full overflow-hidden animate-fadeIn">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-[#2D79C7] to-[#1F5EA8]">
                    <h3 className="text-white text-sm font-bold flex items-center gap-2">
                        <Edit3 className="w-4 h-4" /> Update Onboarding Progress
                    </h3>
                    <button onClick={onClose} className="text-white/80 hover:text-white p-1 rounded-md transition-colors cursor-pointer">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 text-left">
                    <div className="bg-blue-50 border border-blue-100 p-3 rounded-[12px]">
                        <span className="text-[10px] font-bold text-[#2D79C7] uppercase tracking-wider block mb-1">Employee</span>
                        <div className="font-bold text-sm text-[#1E1E1E]">{empName}</div>
                        <div className="text-xs text-gray-500">{record.employee?.employeeId} · {record.employee?.department}</div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <FormField label="Joining Date">
                            <input
                                type="date"
                                value={joiningDate}
                                onChange={(e) => setJoiningDate(e.target.value)}
                                className={inputCls}
                            />
                        </FormField>

                        <FormField label="Status">
                            <div className="relative">
                                <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectCls}>
                                    {ONBOARDING_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                                <ChevronDown className="w-3 h-3 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                        </FormField>
                    </div>

                    {/* Joining Activities Checklist */}
                    <div>
                        <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block mb-2">
                            Joining Activities Checklist
                        </label>
                        <div className="space-y-2 bg-gray-50 border border-gray-200 rounded-[12px] p-3">
                            {[
                                { key: "profileDetailsCompleted", label: "Profile Details & Contact Info" },
                                { key: "documentsUploaded", label: "Identity & Verification Documents Uploaded" },
                                { key: "assetAllocated", label: "Company Assets Allocated" },
                                { key: "welcomeEmailSent", label: "Welcome Email & Credentials Sent" },
                                { key: "orientationCompleted", label: "HR & Team Orientation Completed" }
                            ].map(item => (
                                <label key={item.key} className="flex items-center gap-2.5 text-xs text-gray-700 font-medium cursor-pointer hover:text-[#1E1E1E]">
                                    <input
                                        type="checkbox"
                                        checked={!!checklist[item.key]}
                                        onChange={() => toggleChecklist(item.key)}
                                        className="w-4 h-4 rounded text-[#2D79C7] focus:ring-[#2D79C7] cursor-pointer"
                                    />
                                    <span>{item.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <FormField label="Notes">
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={2}
                            placeholder="Additional onboarding details..."
                            className={`${inputCls} resize-none`}
                        />
                    </FormField>

                    <div className="pt-3 border-t border-gray-100 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-[10px] transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-5 py-2 text-xs font-bold text-white bg-[#2D79C7] hover:bg-[#1F5EA8] rounded-[10px] shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            <span>Update Onboarding</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

/* ─────────────────────────────────────────────
   INITIATE OFFBOARDING MODAL
───────────────────────────────────────────── */
const InitiateOffboardingModal = ({ employees, onClose, onSuccess }) => {
    const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
    const [resignationDate, setResignationDate] = useState("");
    const [lastWorkingDay, setLastWorkingDay] = useState("");
    const [reasonForLeaving, setReasonForLeaving] = useState(REASONS_FOR_LEAVING[0]);
    const [noticePeriod, setNoticePeriod] = useState(NOTICE_PERIODS[2]);
    const [notes, setNotes] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedEmployeeId || !resignationDate || !lastWorkingDay) {
            toast.error("Employee, Resignation Date, and Last Working Day are required.");
            return;
        }

        setSubmitting(true);
        try {
            const res = await initiateOffboarding({
                employee: selectedEmployeeId,
                resignationDate,
                lastWorkingDay,
                reasonForLeaving,
                noticePeriod,
                notes
            });

            if (res.data?.success) {
                toast.success(res.data.message || "Offboarding initiated successfully.");
                onSuccess();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to initiate offboarding.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[20px] shadow-2xl max-w-md w-full overflow-hidden animate-fadeIn">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-[#2D79C7] to-[#1F5EA8]">
                    <h3 className="text-white text-sm font-bold flex items-center gap-2">
                        <UserMinus className="w-4 h-4" /> Initiate Employee Exit / Offboarding
                    </h3>
                    <button onClick={onClose} className="text-white/80 hover:text-white p-1 rounded-md transition-colors cursor-pointer">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 text-left">
                    <div className="bg-amber-50 border border-amber-200/80 p-3 rounded-[12px] text-xs text-amber-800 flex items-start gap-2">
                        <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <span>
                            Initiating offboarding updates employee status to <strong>Offboarding</strong>. Employee historical data will be preserved.
                        </span>
                    </div>

                    <FormField label="Select Employee" required>
                        <div className="relative">
                            <select
                                value={selectedEmployeeId}
                                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                                className={selectCls}
                            >
                                <option value="">Select Employee</option>
                                {employees.map(emp => (
                                    <option key={emp._id} value={emp._id}>
                                        {emp.fullName || `${emp.firstName} ${emp.lastName}`} ({emp.employeeId} - {emp.department})
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="w-3 h-3 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                    </FormField>

                    <div className="grid grid-cols-2 gap-3">
                        <FormField label="Resignation Date" required>
                            <input
                                type="date"
                                value={resignationDate}
                                onChange={(e) => setResignationDate(e.target.value)}
                                className={inputCls}
                            />
                        </FormField>

                        <FormField label="Last Working Day" required>
                            <input
                                type="date"
                                value={lastWorkingDay}
                                onChange={(e) => setLastWorkingDay(e.target.value)}
                                className={inputCls}
                            />
                        </FormField>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <FormField label="Reason for Leaving">
                            <div className="relative">
                                <select value={reasonForLeaving} onChange={(e) => setReasonForLeaving(e.target.value)} className={selectCls}>
                                    {REASONS_FOR_LEAVING.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                                <ChevronDown className="w-3 h-3 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                        </FormField>

                        <FormField label="Notice Period">
                            <div className="relative">
                                <select value={noticePeriod} onChange={(e) => setNoticePeriod(e.target.value)} className={selectCls}>
                                    {NOTICE_PERIODS.map(np => <option key={np} value={np}>{np}</option>)}
                                </select>
                                <ChevronDown className="w-3 h-3 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                        </FormField>
                    </div>

                    <FormField label="Exit Notes">
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            placeholder="Additional exit feedback or remarks..."
                            className={`${inputCls} resize-none`}
                        />
                    </FormField>

                    <div className="pt-3 border-t border-gray-100 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-[10px] transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-5 py-2 text-xs font-bold text-white bg-[#2D79C7] hover:bg-[#1F5EA8] rounded-[10px] shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            <span>Initiate Offboarding</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

/* ─────────────────────────────────────────────
   UPDATE OFFBOARDING & CLEARANCES MODAL
───────────────────────────────────────────── */
const UpdateOffboardingModal = ({ record, onClose, onSuccess }) => {
    const [status, setStatus] = useState(record.status || "Initiated");
    const [resignationDate, setResignationDate] = useState(record.resignationDate ? record.resignationDate.split("T")[0] : "");
    const [lastWorkingDay, setLastWorkingDay] = useState(record.lastWorkingDay ? record.lastWorkingDay.split("T")[0] : "");
    const [reasonForLeaving, setReasonForLeaving] = useState(record.reasonForLeaving || REASONS_FOR_LEAVING[0]);
    const [noticePeriod, setNoticePeriod] = useState(record.noticePeriod || NOTICE_PERIODS[2]);
    const [clearanceActivities, setClearanceActivities] = useState(record.clearanceActivities || {});
    const [notes, setNotes] = useState(record.notes || "");
    const [submitting, setSubmitting] = useState(false);

    const empName = record.employee?.fullName || `${record.employee?.firstName} ${record.employee?.lastName}`;

    const toggleClearance = (key) => {
        setClearanceActivities(prev => ({
            ...prev,
            [key]: {
                ...prev[key],
                completed: !prev[key]?.completed
            }
        }));
    };

    const handleClearanceNotes = (key, val) => {
        setClearanceActivities(prev => ({
            ...prev,
            [key]: {
                ...prev[key],
                notes: val
            }
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await updateOffboardingRecord(record._id, {
                status,
                resignationDate,
                lastWorkingDay,
                reasonForLeaving,
                noticePeriod,
                clearanceActivities,
                notes
            });

            if (res.data?.success) {
                toast.success(res.data.message || "Offboarding clearances updated.");
                onSuccess();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to update offboarding.");
        } finally {
            setSubmitting(false);
        }
    };

    const clearanceItems = [
        { key: "assetReturn", label: "Asset Return & Hardware Recovery" },
        { key: "hrClearance", label: "HR Clearance & Handover" },
        { key: "managerClearance", label: "Reporting Manager Work Clearance" },
        { key: "financeClearance", label: "Finance & Payroll Clearance" },
        { key: "documentation", label: "Exit Interview & Relieving Documentation" }
    ];

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[20px] shadow-2xl max-w-lg w-full overflow-hidden animate-fadeIn">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-[#2D79C7] to-[#1F5EA8]">
                    <h3 className="text-white text-sm font-bold flex items-center gap-2">
                        <CheckSquare className="w-4 h-4" /> Manage Exit Clearances & Status
                    </h3>
                    <button onClick={onClose} className="text-white/80 hover:text-white p-1 rounded-md transition-colors cursor-pointer">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 text-left max-h-[80vh] overflow-y-auto">
                    <div className="bg-amber-50 border border-amber-100 p-3 rounded-[12px]">
                        <div className="font-bold text-sm text-[#1E1E1E]">{empName}</div>
                        <div className="text-xs text-gray-500">{record.employee?.employeeId} · {record.employee?.department}</div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <FormField label="Resignation Date">
                            <input
                                type="date"
                                value={resignationDate}
                                onChange={(e) => setResignationDate(e.target.value)}
                                className={inputCls}
                            />
                        </FormField>

                        <FormField label="Last Working Day">
                            <input
                                type="date"
                                value={lastWorkingDay}
                                onChange={(e) => setLastWorkingDay(e.target.value)}
                                className={inputCls}
                            />
                        </FormField>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <FormField label="Reason for Leaving">
                            <div className="relative">
                                <select value={reasonForLeaving} onChange={(e) => setReasonForLeaving(e.target.value)} className={selectCls}>
                                    {REASONS_FOR_LEAVING.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                                <ChevronDown className="w-3 h-3 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                        </FormField>

                        <FormField label="Offboarding Status">
                            <div className="relative">
                                <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectCls}>
                                    {OFFBOARDING_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                                <ChevronDown className="w-3 h-3 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                        </FormField>
                    </div>

                    {/* Clearance Items */}
                    <div>
                        <label className="text-[11px] font-bold text-gray-600 uppercase tracking-wider block mb-2">
                            Clearance Channels
                        </label>
                        <div className="space-y-3 bg-gray-50 border border-gray-200 rounded-[12px] p-3">
                            {clearanceItems.map(item => {
                                const current = clearanceActivities[item.key] || {};
                                return (
                                    <div key={item.key} className="border-b border-gray-200/60 pb-2 last:border-b-0 last:pb-0">
                                        <label className="flex items-center justify-between gap-2 text-xs font-bold text-gray-800 cursor-pointer">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    checked={!!current.completed}
                                                    onChange={() => toggleClearance(item.key)}
                                                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                                />
                                                <span>{item.label}</span>
                                            </div>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${current.completed ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-amber-50 text-amber-700 border-amber-100"}`}>
                                                {current.completed ? "Cleared" : "Pending"}
                                            </span>
                                        </label>
                                        <input
                                            type="text"
                                            value={current.notes || ""}
                                            onChange={(e) => handleClearanceNotes(item.key, e.target.value)}
                                            placeholder="Clearance remarks/notes..."
                                            className="w-full mt-1 px-2.5 py-1 bg-white border border-gray-200 rounded-[6px] text-[11px] text-[#1E1E1E]"
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <FormField label="General Notes">
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={2}
                            placeholder="Additional exit remarks..."
                            className={`${inputCls} resize-none`}
                        />
                    </FormField>

                    <div className="pt-3 border-t border-gray-100 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-[10px] transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-5 py-2 text-xs font-bold text-white bg-[#2D79C7] hover:bg-[#1F5EA8] rounded-[10px] shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                            {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            <span>Update Offboarding</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default OffboardingOnboarding;
