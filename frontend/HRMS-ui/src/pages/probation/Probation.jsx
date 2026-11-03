import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
    Clock, Calendar, Users, UserCheck, UserPlus, Plus,
    Search, Edit3, Trash2, Shield, CheckCircle2, AlertCircle,
    X, ChevronRight, Sparkles, Layers, Check, Loader2, ArrowRight, CalendarPlus
} from "lucide-react";
import { toast } from "sonner";
import {
    getProbationPolicies,
    createProbationPolicy,
    updateProbationPolicy,
    deleteProbationPolicy,
    getPolicyEmployees,
    assignEmployeesToPolicy,
    removeEmployeeFromPolicy,
    extendEmployeeProbation
} from "../../services/probation.service";
import { getAllEmployees } from "../../services/employee.service";
import { Avatar } from "../../components/SharedComponents";
import ConfirmDialog from "../../components/ConfirmDialog";

const formatDate = (date) => {
    if (!date) return "—";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const Probation = () => {
    const [loading, setLoading] = useState(true);
    const [policies, setPolicies] = useState([]);
    const [stats, setStats] = useState({ totalPolicies: 0, totalEmployees: 0, onProbationEmployees: 0 });
    const [selectedPolicyId, setSelectedPolicyId] = useState("all");
    const [employees, setEmployees] = useState([]);
    const [loadingEmployees, setLoadingEmployees] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all"); // all, in_progress, completed

    // Modals
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingPolicy, setEditingPolicy] = useState(null);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [confirmDeletePolicy, setConfirmDeletePolicy] = useState(null);
    const [confirmRemoveEmp, setConfirmRemoveEmp] = useState(null);
    const [showExtendModal, setShowExtendModal] = useState(false);
    const [extendingEmp, setExtendingEmp] = useState(null);
    const [extendMonths, setExtendMonths] = useState(1);
    const [extendRemarks, setExtendRemarks] = useState("");

    // Form states
    const [policyForm, setPolicyForm] = useState({ name: "", months: 3, description: "" });
    const [editForm, setEditForm] = useState({ name: "", months: 3, description: "", syncEnrolledEmployees: true });
    const [submitting, setSubmitting] = useState(false);

    // Assign modal state
    const [allCompanyEmployees, setAllCompanyEmployees] = useState([]);
    const [loadingCompanyEmployees, setLoadingCompanyEmployees] = useState(false);
    const [assignTargetPolicyId, setAssignTargetPolicyId] = useState("");
    const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
    const [assignSearchQuery, setAssignSearchQuery] = useState("");

    // Load policies and initial stats
    const fetchPolicies = useCallback(async () => {
        try {
            setLoading(true);
            const res = await getProbationPolicies();
            if (res.data?.success) {
                setPolicies(res.data.policies || []);
                setStats(res.data.stats || { totalPolicies: 0, totalEmployees: 0, onProbationEmployees: 0 });
            }
        } catch (err) {
            console.error("Error fetching policies:", err);
            toast.error(err.response?.data?.message || "Failed to load probation policies.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPolicies();
    }, [fetchPolicies]);

    // Load employees for current selection
    const fetchEmployees = useCallback(async () => {
        try {
            setLoadingEmployees(true);
            const res = await getPolicyEmployees(selectedPolicyId);
            if (res.data?.success) {
                setEmployees(res.data.employees || []);
            }
        } catch (err) {
            console.error("Error fetching employees:", err);
            toast.error("Failed to load enrolled employees.");
        } finally {
            setLoadingEmployees(false);
        }
    }, [selectedPolicyId]);

    useEffect(() => {
        fetchEmployees();
    }, [fetchEmployees]);

    // Handle Create Policy
    const handleCreatePolicy = async (e) => {
        e.preventDefault();
        if (!policyForm.name.trim()) {
            toast.error("Policy name is required.");
            return;
        }
        try {
            setSubmitting(true);
            const res = await createProbationPolicy({
                name: policyForm.name.trim(),
                months: Number(policyForm.months) || 0,
                description: policyForm.description.trim()
            });
            if (res.data?.success) {
                toast.success(res.data.message || "Probation policy created.");
                setShowCreateModal(false);
                setPolicyForm({ name: "", months: 3, description: "" });
                await fetchPolicies();
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to create policy.");
        } finally {
            setSubmitting(false);
        }
    };

    // Handle Edit Policy
    const handleTriggerEdit = (policy) => {
        setEditingPolicy(policy);
        const curMonths = policy.months || (policy.days ? Math.round(policy.days / 30) : 0);
        setEditForm({
            name: policy.name,
            months: curMonths,
            description: policy.description || "",
            syncEnrolledEmployees: true
        });
        setShowEditModal(true);
    };

    const handleUpdatePolicy = async (e) => {
        e.preventDefault();
        if (!editingPolicy) return;
        if (!editForm.name.trim()) {
            toast.error("Policy name is required.");
            return;
        }
        try {
            setSubmitting(true);
            const res = await updateProbationPolicy(editingPolicy._id, {
                name: editForm.name.trim(),
                months: Number(editForm.months) || 0,
                description: editForm.description.trim(),
                syncEnrolledEmployees: editForm.syncEnrolledEmployees
            });
            if (res.data?.success) {
                toast.success(res.data.message || "Probation policy updated.");
                setShowEditModal(false);
                setEditingPolicy(null);
                await fetchPolicies();
                await fetchEmployees();
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to update policy.");
        } finally {
            setSubmitting(false);
        }
    };

    // Handle Delete Policy
    const handleDeletePolicy = async () => {
        if (!confirmDeletePolicy) return;
        try {
            setSubmitting(true);
            const res = await deleteProbationPolicy(confirmDeletePolicy._id);
            if (res.data?.success) {
                toast.success(res.data.message || "Policy deleted.");
                setConfirmDeletePolicy(null);
                if (selectedPolicyId === confirmDeletePolicy._id) {
                    setSelectedPolicyId("all");
                }
                await fetchPolicies();
                await fetchEmployees();
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to delete policy.");
        } finally {
            setSubmitting(false);
        }
    };

    // Open Assign Modal
    const handleOpenAssignModal = async (targetPolicyId = null) => {
        const target = targetPolicyId || (selectedPolicyId !== "all" ? selectedPolicyId : (policies[0]?._id || ""));
        setAssignTargetPolicyId(target);
        setSelectedEmployeeIds([]);
        setAssignSearchQuery("");
        setShowAssignModal(true);

        try {
            setLoadingCompanyEmployees(true);
            const res = await getAllEmployees({ all: true });
            if (res.data?.success) {
                setAllCompanyEmployees(res.data.employees || []);
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to load employee list.");
        } finally {
            setLoadingCompanyEmployees(false);
        }
    };

    // Submit Assign Employees
    const handleAssignEmployees = async () => {
        if (!assignTargetPolicyId) {
            toast.error("Please select a target probation policy.");
            return;
        }
        if (selectedEmployeeIds.length === 0) {
            toast.error("Please select at least one employee.");
            return;
        }
        try {
            setSubmitting(true);
            const res = await assignEmployeesToPolicy(assignTargetPolicyId, selectedEmployeeIds);
            if (res.data?.success) {
                toast.success(res.data.message || "Employees assigned successfully.");
                setShowAssignModal(false);
                setSelectedEmployeeIds([]);
                await fetchPolicies();
                await fetchEmployees();
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to assign employees.");
        } finally {
            setSubmitting(false);
        }
    };

    // Handle Remove Employee
    const handleRemoveEmployee = async () => {
        if (!confirmRemoveEmp) return;
        try {
            setSubmitting(true);
            const res = await removeEmployeeFromPolicy(confirmRemoveEmp._id);
            if (res.data?.success) {
                toast.success(res.data.message || "Employee unassigned from probation policy.");
                setConfirmRemoveEmp(null);
                await fetchPolicies();
                await fetchEmployees();
            }
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || "Failed to remove employee.");
        } finally {
            setSubmitting(false);
        }
    };

    // Trigger Extend Probation
    const handleTriggerExtend = (emp) => {
        setExtendingEmp(emp);
        setExtendMonths(1);
        setExtendRemarks("");
        setShowExtendModal(true);
    };

    // Handle Extend Probation Submit
    const handleExtendProbation = async (e) => {
        e.preventDefault();
        if (!extendingEmp) return;
        const months = Number(extendMonths);
        if (!months || months <= 0) {
            toast.error("Please enter a valid number of months to extend.");
            return;
        }
        try {
            setSubmitting(true);
            const res = await extendEmployeeProbation(extendingEmp._id, months, extendRemarks);
            if (res.data?.success) {
                toast.success(res.data.message || `Probation extended by ${months} month(s).`);
                setShowExtendModal(false);
                setExtendingEmp(null);
                await fetchPolicies();
                await fetchEmployees();
            }
        } catch (err) {
            console.error("Extend error:", err);
            toast.error(err.response?.data?.message || "Failed to extend probation.");
        } finally {
            setSubmitting(false);
        }
    };

    // Filter employees for table
    const filteredEmployees = useMemo(() => {
        return employees.filter(emp => {
            const matchesSearch = !searchQuery.trim() || [
                emp.displayName,
                emp.employeeId,
                emp.designation,
                emp.department,
                emp.probationPolicy?.name
            ].some(f => f && f.toLowerCase().includes(searchQuery.toLowerCase()));

            const matchesStatus =
                statusFilter === "all" ||
                (statusFilter === "completed" && emp.isCompleted) ||
                (statusFilter === "in_progress" && !emp.isCompleted);

            return matchesSearch && matchesStatus;
        });
    }, [employees, searchQuery, statusFilter]);

    // Active policy object
    const activePolicyObj = useMemo(() => {
        if (selectedPolicyId === "all") return null;
        return policies.find(p => p._id === selectedPolicyId);
    }, [selectedPolicyId, policies]);

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6 text-left select-none">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 pb-5">
                <div>
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-[#2D79C7]/10 flex items-center justify-center border border-[#2D79C7]/20">
                            <Clock className="w-5 h-5 text-[#2D79C7]" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-[#1E1E1E] tracking-tight">Probation Management</h1>
                            <p className="text-xs text-gray-500 font-medium">Configure probation policies, set duration in months, and manage employee tracks</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2.5">
                    <button
                        type="button"
                        onClick={() => handleOpenAssignModal()}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-all shadow-2xs cursor-pointer"
                    >
                        <UserPlus className="w-4 h-4 text-[#2D79C7]" />
                        <span>Add Employees</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setShowCreateModal(true)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#2D79C7] hover:bg-[#1F5EA8] text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Add Policy / Category</span>
                    </button>
                </div>
            </div>

            {/* Top Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="premium-3d-card p-4.5 flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Total Enrolled</p>
                        <h3 className="text-2xl font-black text-[#1E1E1E] mt-1 font-mono">{stats.onProbationEmployees}</h3>
                        <p className="text-[11px] text-gray-500 font-medium mt-0.5">Active on probation</p>
                    </div>
                    <div className="w-11 h-11 rounded-2xl bg-blue-50 text-[#2D79C7] flex items-center justify-center border border-blue-100">
                        <Users className="w-5 h-5" />
                    </div>
                </div>

                <div className="premium-3d-card p-4.5 flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Total Policies</p>
                        <h3 className="text-2xl font-black text-[#1E1E1E] mt-1 font-mono">{policies.length}</h3>
                        <p className="text-[11px] text-gray-500 font-medium mt-0.5">Configured categories</p>
                    </div>
                    <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
                        <Layers className="w-5 h-5" />
                    </div>
                </div>

                <div className="premium-3d-card p-4.5 flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Completed</p>
                        <h3 className="text-2xl font-black text-emerald-600 mt-1 font-mono">
                            {employees.filter(e => e.isCompleted).length}
                        </h3>
                        <p className="text-[11px] text-gray-500 font-medium mt-0.5">Passed probation timeline</p>
                    </div>
                    <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                        <CheckCircle2 className="w-5 h-5" />
                    </div>
                </div>

                <div className="premium-3d-card p-4.5 flex items-center justify-between">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">In Progress</p>
                        <h3 className="text-2xl font-black text-amber-600 mt-1 font-mono">
                            {employees.filter(e => !e.isCompleted).length}
                        </h3>
                        <p className="text-[11px] text-gray-500 font-medium mt-0.5">Currently serving timeline</p>
                    </div>
                    <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                        <Clock className="w-5 h-5" />
                    </div>
                </div>
            </div>

            {/* Policies Section Cards */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <h2 className="text-[13px] font-bold text-slate-800">Probation Policies</h2>
                        <span className="text-[11px] text-slate-400 font-medium">• Select a policy to view assigned employees</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    {/* All tab card */}
                    <div
                        onClick={() => setSelectedPolicyId("all")}
                        className={`bg-white rounded-xl p-3.5 border transition-all cursor-pointer relative group flex flex-col justify-between ${
                            selectedPolicyId === "all"
                                ? "border-[#2D79C7] ring-2 ring-[#2D79C7]/15 bg-blue-50/15 shadow-xs"
                                : "border-slate-200/80 hover:border-slate-300 hover:shadow-2xs"
                        }`}
                    >
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                    All Policies
                                </span>
                                <span className="text-[11px] font-semibold font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                                    {stats.onProbationEmployees} enrolled
                                </span>
                            </div>
                            <h3 className={`text-[13.5px] font-bold ${selectedPolicyId === "all" ? "text-[#2D79C7]" : "text-slate-800"}`}>
                                All Probation Employees
                            </h3>
                            <p className="text-[11.5px] text-slate-400 truncate mt-0.5">
                                View all employees assigned to any policy
                            </p>
                        </div>
                        <div className="pt-2.5 mt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                            <span className="text-[11.5px] font-medium text-slate-500">
                                Total: {stats.onProbationEmployees}
                            </span>
                            <span className="text-[11.5px] font-bold text-[#2D79C7] flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                                <span>View all</span>
                                <ArrowRight className="w-3 h-3" />
                            </span>
                        </div>
                    </div>

                    {/* Individual policy cards */}
                    {policies.map(policy => {
                        const isSelected = selectedPolicyId === policy._id;
                        const durationMonths = policy.months || (policy.days ? Math.round(policy.days / 30) : 0);
                        const monthsSet = durationMonths > 0;
                        return (
                            <div
                                key={policy._id}
                                onClick={() => setSelectedPolicyId(policy._id)}
                                className={`bg-white rounded-xl p-3.5 border transition-all cursor-pointer relative group flex flex-col justify-between ${
                                    isSelected
                                        ? "border-[#2D79C7] ring-2 ring-[#2D79C7]/15 bg-blue-50/15 shadow-xs"
                                        : "border-slate-200/80 hover:border-slate-300 hover:shadow-2xs"
                                }`}
                            >
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-md ${
                                            monthsSet
                                                ? "bg-blue-50 text-[#2D79C7] border border-blue-100/60"
                                                : "bg-slate-100 text-slate-500"
                                        }`}>
                                            {monthsSet ? `${durationMonths} Month${durationMonths > 1 ? "s" : ""}` : "Months not set"}
                                        </span>
                                        <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                type="button"
                                                onClick={() => handleTriggerEdit(policy)}
                                                title="Edit Policy & Duration"
                                                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                                            >
                                                <Edit3 className="w-3.5 h-3.5" />
                                            </button>
                                            {!policy.isDefault && (
                                                <button
                                                    type="button"
                                                    onClick={() => setConfirmDeletePolicy(policy)}
                                                    title="Delete Policy"
                                                    className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <h3 className={`text-[13.5px] font-bold truncate ${isSelected ? "text-[#2D79C7]" : "text-slate-800"}`} title={policy.name}>
                                        {policy.name}
                                    </h3>
                                    <p className="text-[11.5px] text-slate-400 truncate mt-0.5" title={policy.description}>
                                        {policy.description || "Standard probation timeline"}
                                    </p>
                                </div>

                                <div className="pt-2.5 mt-2.5 border-t border-slate-100 flex items-center justify-between text-xs">
                                    <span className="text-[11.5px] font-medium text-slate-500 font-mono">
                                        {policy.enrolledCount || 0} {policy.enrolledCount === 1 ? "Employee" : "Employees"}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleOpenAssignModal(policy._id);
                                        }}
                                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#2D79C7] hover:bg-blue-50 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                                    >
                                        <Plus className="w-3 h-3" />
                                        <span>Assign</span>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Enrolled Employees Section */}
            <div className="premium-3d-card overflow-hidden">
                {/* Section Header & Filters */}
                <div className="px-5 py-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-[#2D79C7]" />
                        <h3 className="text-[14px] font-bold text-[#1E1E1E]">
                            {selectedPolicyId === "all" ? "All Enrolled Employees" : `${activePolicyObj?.name || "Policy"} Employees`}
                            <span className="ml-2 text-xs font-normal text-gray-500">
                                ({filteredEmployees.length} employee{filteredEmployees.length !== 1 ? "s" : ""})
                            </span>
                        </h3>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        {/* Status Filter */}
                        <div className="flex items-center bg-gray-100 p-0.5 rounded-xl text-xs font-bold">
                            <button
                                type="button"
                                onClick={() => setStatusFilter("all")}
                                className={`px-2.5 py-1 rounded-[8px] transition-all cursor-pointer ${
                                    statusFilter === "all" ? "bg-white text-gray-800 shadow-2xs" : "text-gray-500 hover:text-gray-700"
                                }`}
                            >
                                All
                            </button>
                            <button
                                type="button"
                                onClick={() => setStatusFilter("in_progress")}
                                className={`px-2.5 py-1 rounded-[8px] transition-all cursor-pointer ${
                                    statusFilter === "in_progress" ? "bg-white text-gray-800 shadow-2xs" : "text-gray-500 hover:text-gray-700"
                                }`}
                            >
                                In Progress
                            </button>
                            <button
                                type="button"
                                onClick={() => setStatusFilter("completed")}
                                className={`px-2.5 py-1 rounded-[8px] transition-all cursor-pointer ${
                                    statusFilter === "completed" ? "bg-white text-gray-800 shadow-2xs" : "text-gray-500 hover:text-gray-700"
                                }`}
                            >
                                Completed
                            </button>
                        </div>

                        {/* Search Input */}
                        <div className="relative min-w-[220px]">
                            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                                type="text"
                                placeholder="Search employees..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:border-[#2D79C7] focus:bg-white transition-all placeholder-gray-400"
                            />
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="bg-[#F8FAFC] border-b border-gray-100 text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                                <th className="py-3 px-4">Employee</th>
                                <th className="py-3 px-4">Policy</th>
                                <th className="py-3 px-4">Department & Role</th>
                                <th className="py-3 px-4">Joining Date</th>
                                <th className="py-3 px-4">Duration</th>
                                <th className="py-3 px-4">End Date</th>
                                <th className="py-3 px-4 min-w-[150px]">Timeline / Progress</th>
                                <th className="py-3 px-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loadingEmployees ? (
                                <tr>
                                    <td colSpan="8" className="py-12 text-center text-gray-400 font-bold">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#2D79C7] mb-2" />
                                        Loading enrolled employees...
                                    </td>
                                </tr>
                            ) : filteredEmployees.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="py-12 text-center text-gray-400">
                                        <div className="flex flex-col items-center justify-center">
                                            <Users className="w-8 h-8 text-gray-300 mb-2" />
                                            <p className="font-bold text-gray-600 text-sm">No employees found</p>
                                            <p className="text-xs text-gray-400 mt-0.5">
                                                {selectedPolicyId === "all"
                                                    ? "No employees are currently enrolled in any probation policy."
                                                    : `No employees enrolled in ${activePolicyObj?.name || "this policy"}.`}
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => handleOpenAssignModal(selectedPolicyId !== "all" ? selectedPolicyId : null)}
                                                className="mt-3.5 inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#2D79C7] hover:bg-[#1F5EA8] text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs"
                                            >
                                                <UserPlus className="w-3.5 h-3.5" />
                                                <span>Add Employees to this Policy</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredEmployees.map((emp) => {
                                    return (
                                        <tr key={emp._id} className="hover:bg-gray-50/50 transition-colors">
                                            {/* Employee info */}
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-2.5">
                                                    <Avatar src={emp.profilePicture} name={emp.displayName} size="w-8 h-8" textSize="text-xs" />
                                                    <div>
                                                        <span className="font-bold text-[#1E1E1E] leading-tight block">
                                                            {emp.displayName}
                                                        </span>
                                                        <span className="text-[11px] font-mono text-gray-400">
                                                            {emp.employeeId}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Policy badge */}
                                            <td className="py-3 px-4">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-[#2D79C7] border border-blue-100">
                                                    {emp.probationPolicy?.name || "Custom"}
                                                </span>
                                            </td>

                                            {/* Dept & Designation */}
                                            <td className="py-3 px-4">
                                                <p className="font-semibold text-gray-800">{emp.designation || "—"}</p>
                                                <p className="text-[11px] text-gray-400">{emp.department || "—"}</p>
                                            </td>

                                            {/* Joining Date */}
                                            <td className="py-3 px-4 font-mono font-medium text-gray-600">
                                                {formatDate(emp.joiningDate)}
                                            </td>

                                            {/* Duration in Months */}
                                            <td className="py-3 px-4 font-mono font-bold text-gray-800">
                                                {emp.probationMonths || (emp.probationDays ? Math.round(emp.probationDays / 30) : 0)} Month{((emp.probationMonths || (emp.probationDays ? Math.round(emp.probationDays / 30) : 0)) > 1) ? "s" : ""}
                                            </td>

                                            {/* End Date */}
                                            <td className="py-3 px-4 font-mono font-bold text-gray-700">
                                                {formatDate(emp.probationEndDate)}
                                            </td>

                                            {/* Progress / Status */}
                                            <td className="py-3 px-4">
                                                {emp.isCompleted ? (
                                                    <span className="inline-flex items-center gap-1 text-[10.5px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                                        Completed
                                                    </span>
                                                ) : (
                                                    <div className="space-y-1">
                                                        <div className="flex items-center justify-between text-[10px] font-bold text-gray-600">
                                                            <span>{emp.daysRemaining !== null ? `${emp.daysRemaining} days left` : "In Progress"}</span>
                                                            <span className="font-mono text-gray-400">{emp.progress}%</span>
                                                        </div>
                                                        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                                            <div
                                                                className="bg-[#2D79C7] h-full rounded-full transition-all duration-300"
                                                                style={{ width: `${emp.progress}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </td>

                                            {/* Actions */}
                                            <td className="py-3 px-4 text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleTriggerExtend(emp)}
                                                        title="Extend Probation Period"
                                                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-[#2D79C7] hover:text-white bg-blue-50 hover:bg-[#2D79C7] rounded-[8px] transition-all cursor-pointer shadow-2xs"
                                                    >
                                                        <CalendarPlus className="w-3.5 h-3.5" />
                                                        <span>Extend</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setConfirmRemoveEmp(emp)}
                                                        title="Remove from Probation Policy"
                                                        className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-[8px] transition-colors cursor-pointer"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ─────────────────────────────────────────────
               MODAL: CREATE PROBATION POLICY
            ───────────────────────────────────────────── */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[20px] max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        <div className="px-6 py-4 bg-gradient-to-r from-[#2D79C7] to-[#1F5EA8] flex items-center justify-between">
                            <div className="flex items-center gap-2 text-white">
                                <Clock className="w-5 h-5" />
                                <h3 className="font-black text-sm">Add New Probation Category</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowCreateModal(false)}
                                className="text-white/80 hover:text-white p-1 rounded hover:bg-white/10 transition-colors cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleCreatePolicy} className="p-6 space-y-4 text-xs text-left">
                            <div>
                                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                                    Policy / Category Name <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Lateral Hire, Consultant Probation, etc."
                                    value={policyForm.name}
                                    onChange={(e) => setPolicyForm(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:border-[#2D79C7]"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                                    Probation Duration (Months) <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="36"
                                    step="1"
                                    required
                                    placeholder="e.g. 1, 3, 6"
                                    value={policyForm.months}
                                    onChange={(e) => setPolicyForm(prev => ({ ...prev, months: e.target.value }))}
                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:border-[#2D79C7]"
                                />
                                <div className="flex items-center gap-1.5 mt-2">
                                    {[1, 2, 3, 6, 9, 12].map(m => (
                                        <button
                                            key={m}
                                            type="button"
                                            onClick={() => setPolicyForm(prev => ({ ...prev, months: m }))}
                                            className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold transition-all cursor-pointer ${
                                                Number(policyForm.months) === m
                                                    ? "bg-[#2D79C7] text-white"
                                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                            }`}
                                        >
                                            {m}m
                                        </button>
                                    ))}
                                </div>
                                <p className="text-[10.5px] text-gray-400 mt-1">Admin can enter how many months this probation period lasts (e.g. 1, 3, 6 months).</p>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                                    Description (Optional)
                                </label>
                                <textarea
                                    rows="3"
                                    placeholder="Brief note about who this probation policy applies to..."
                                    value={policyForm.description}
                                    onChange={(e) => setPolicyForm(prev => ({ ...prev, description: e.target.value }))}
                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:border-[#2D79C7] resize-none"
                                />
                            </div>

                            <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-4 py-2 bg-[#2D79C7] hover:bg-[#1F5EA8] text-white text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-60"
                                >
                                    {submitting ? "Creating..." : "Create Category"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ─────────────────────────────────────────────
               MODAL: EDIT PROBATION POLICY
            ───────────────────────────────────────────── */}
            {showEditModal && editingPolicy && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[20px] max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        <div className="px-6 py-4 bg-gradient-to-r from-[#2D79C7] to-[#1F5EA8] flex items-center justify-between">
                            <div className="flex items-center gap-2 text-white">
                                <Edit3 className="w-5 h-5" />
                                <h3 className="font-black text-sm">Edit Policy: {editingPolicy.name}</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowEditModal(false)}
                                className="text-white/80 hover:text-white p-1 rounded hover:bg-white/10 transition-colors cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleUpdatePolicy} className="p-6 space-y-4 text-xs text-left">
                            <div>
                                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                                    Policy Name <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={editForm.name}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:border-[#2D79C7]"
                                />
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                                    Duration in Months <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="36"
                                    step="1"
                                    required
                                    value={editForm.months}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, months: e.target.value }))}
                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:border-[#2D79C7]"
                                />
                                <div className="flex items-center gap-1.5 mt-2">
                                    {[1, 2, 3, 6, 9, 12].map(m => (
                                        <button
                                            key={m}
                                            type="button"
                                            onClick={() => setEditForm(prev => ({ ...prev, months: m }))}
                                            className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold transition-all cursor-pointer ${
                                                Number(editForm.months) === m
                                                    ? "bg-[#2D79C7] text-white"
                                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                            }`}
                                        >
                                            {m}m
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                                    Description
                                </label>
                                <textarea
                                    rows="3"
                                    value={editForm.description}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:border-[#2D79C7] resize-none"
                                />
                            </div>

                            <div className="flex items-center gap-2 pt-1">
                                <input
                                    type="checkbox"
                                    id="syncDays"
                                    checked={editForm.syncEnrolledEmployees}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, syncEnrolledEmployees: e.target.checked }))}
                                    className="rounded border-gray-300 text-[#2D79C7] focus:ring-[#2D79C7] cursor-pointer"
                                />
                                <label htmlFor="syncDays" className="text-gray-600 font-medium select-none cursor-pointer">
                                    Sync updated duration with all currently enrolled employees
                                </label>
                            </div>

                            <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-4 py-2 bg-[#2D79C7] hover:bg-[#1F5EA8] text-white text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-60"
                                >
                                    {submitting ? "Saving..." : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ─────────────────────────────────────────────
               MODAL: ASSIGN EMPLOYEES TO POLICY
            ───────────────────────────────────────────── */}
            {showAssignModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[20px] max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
                        <div className="px-6 py-4 bg-gradient-to-r from-[#2D79C7] to-[#1F5EA8] flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-2 text-white">
                                <UserPlus className="w-5 h-5" />
                                <h3 className="font-black text-sm">Add Employees to Probation Policy</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowAssignModal(false)}
                                className="text-white/80 hover:text-white p-1 rounded hover:bg-white/10 transition-colors cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4 text-xs text-left overflow-y-auto flex-1">
                            {/* Target Policy Select */}
                            <div>
                                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                                    Target Probation Policy <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    value={assignTargetPolicyId}
                                    onChange={(e) => setAssignTargetPolicyId(e.target.value)}
                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:border-[#2D79C7] cursor-pointer"
                                >
                                    {policies.map(p => (
                                        <option key={p._id} value={p._id}>
                                            {p.name} ({p.months || (p.days ? Math.round(p.days / 30) : 0)} Months)
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Search Employees */}
                            <div>
                                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                                    Select Employees ({selectedEmployeeIds.length} selected)
                                </label>
                                <div className="relative mb-2">
                                    <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                    <input
                                        type="text"
                                        placeholder="Search by name, ID or department..."
                                        value={assignSearchQuery}
                                        onChange={(e) => setAssignSearchQuery(e.target.value)}
                                        className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:border-[#2D79C7] focus:bg-white"
                                    />
                                </div>

                                {/* Employee Checklist */}
                                <div className="border border-gray-200 rounded-xl max-h-56 overflow-y-auto divide-y divide-gray-100">
                                    {loadingCompanyEmployees ? (
                                        <div className="py-8 text-center text-gray-400">Loading employees...</div>
                                    ) : allCompanyEmployees.length === 0 ? (
                                        <div className="py-8 text-center text-gray-400">No active employees found.</div>
                                    ) : (
                                        allCompanyEmployees
                                            .filter(emp => {
                                                const q = assignSearchQuery.toLowerCase();
                                                const name = emp.fullName || `${emp.firstName || ""} ${emp.lastName || ""}`;
                                                return (
                                                    !q ||
                                                    name.toLowerCase().includes(q) ||
                                                    (emp.employeeId && emp.employeeId.toLowerCase().includes(q)) ||
                                                    (emp.department && emp.department.toLowerCase().includes(q))
                                                );
                                            })
                                            .map(emp => {
                                                const name = emp.fullName || `${emp.firstName || ""} ${emp.lastName || ""}`;
                                                const isSelected = selectedEmployeeIds.includes(emp._id);
                                                return (
                                                    <label
                                                        key={emp._id}
                                                        className={`flex items-center justify-between p-2.5 hover:bg-blue-50/50 cursor-pointer transition-colors ${
                                                            isSelected ? "bg-blue-50/70" : ""
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-2.5">
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={() => {
                                                                    if (isSelected) {
                                                                        setSelectedEmployeeIds(prev => prev.filter(id => id !== emp._id));
                                                                    } else {
                                                                        setSelectedEmployeeIds(prev => [...prev, emp._id]);
                                                                    }
                                                                }}
                                                                className="rounded border-gray-300 text-[#2D79C7] focus:ring-[#2D79C7] cursor-pointer"
                                                            />
                                                            <Avatar src={emp.profilePicture} name={name} size="w-7 h-7" textSize="text-[10px]" />
                                                            <div>
                                                                <span className="font-bold text-gray-800 leading-none block">{name}</span>
                                                                <span className="text-[10px] text-gray-400 font-mono">{emp.employeeId} • {emp.designation || emp.department}</span>
                                                            </div>
                                                        </div>

                                                        {emp.probationPolicy && (
                                                            <span className="text-[10px] text-gray-400 font-medium">
                                                                Current: {emp.probationPolicy.name || "Enrolled"}
                                                            </span>
                                                        )}
                                                    </label>
                                                );
                                            })
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 bg-gray-50/60 border-t border-gray-100 flex items-center justify-between shrink-0">
                            <span className="text-xs text-gray-500 font-medium">
                                {selectedEmployeeIds.length} employee(s) chosen
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowAssignModal(false)}
                                    className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-white cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    disabled={submitting || selectedEmployeeIds.length === 0}
                                    onClick={handleAssignEmployees}
                                    className="px-4 py-2 bg-[#2D79C7] hover:bg-[#1F5EA8] text-white text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-60"
                                >
                                    {submitting ? "Assigning..." : "Assign to Policy"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ─────────────────────────────────────────────
               MODAL: EXTEND PROBATION
            ───────────────────────────────────────────── */}
            {showExtendModal && extendingEmp && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[20px] max-w-md w-full shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        {/* Header */}
                        <div className="px-6 py-4 bg-gradient-to-r from-[#2D79C7] to-[#1F5EA8] flex items-center justify-between text-white">
                            <div className="flex items-center gap-2">
                                <CalendarPlus className="w-5 h-5" />
                                <div>
                                    <h3 className="font-black text-sm">Extend Probation Period</h3>
                                    <p className="text-[11px] text-white/80">{extendingEmp.displayName} ({extendingEmp.employeeId})</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowExtendModal(false)}
                                className="text-white/80 hover:text-white p-1 rounded hover:bg-white/10 transition-colors cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleExtendProbation} className="p-6 space-y-4 text-xs text-left">
                            {/* Current vs Projected Info Box */}
                            <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3.5 space-y-2">
                                <div className="flex items-center justify-between text-gray-600">
                                    <span className="font-medium">Current Duration:</span>
                                    <span className="font-bold font-mono text-gray-800">
                                        {extendingEmp.probationMonths || (extendingEmp.probationDays ? Math.round(extendingEmp.probationDays / 30) : 0)} Month{((extendingEmp.probationMonths || (extendingEmp.probationDays ? Math.round(extendingEmp.probationDays / 30) : 0)) > 1) ? "s" : ""}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-gray-600">
                                    <span className="font-medium">Current End Date:</span>
                                    <span className="font-bold font-mono text-gray-800">{formatDate(extendingEmp.probationEndDate)}</span>
                                </div>
                                <div className="pt-2 border-t border-blue-200/60 flex items-center justify-between text-[#2D79C7]">
                                    <span className="font-bold">Projected Total Duration:</span>
                                    <span className="font-black font-mono text-[13px]">
                                        {(extendingEmp.probationMonths || (extendingEmp.probationDays ? Math.round(extendingEmp.probationDays / 30) : 0)) + (Number(extendMonths) || 0)} Month{((extendingEmp.probationMonths || (extendingEmp.probationDays ? Math.round(extendingEmp.probationDays / 30) : 0)) + (Number(extendMonths) || 0) > 1) ? "s" : ""}
                                    </span>
                                </div>
                                {extendingEmp.probationEndDate && (
                                    <div className="flex items-center justify-between text-[#2D79C7] text-[11px]">
                                        <span className="font-semibold">New End Date:</span>
                                        <span className="font-bold font-mono">
                                            {(() => {
                                                const d = new Date(extendingEmp.probationEndDate);
                                                d.setMonth(d.getMonth() + (Number(extendMonths) || 0));
                                                return formatDate(d);
                                            })()}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Additional Months Input & Quick Chips */}
                            <div>
                                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                                    Additional Months to Extend <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="24"
                                    step="1"
                                    required
                                    value={extendMonths}
                                    onChange={(e) => setExtendMonths(e.target.value)}
                                    placeholder="e.g. 1, 3"
                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:border-[#2D79C7]"
                                />
                                
                                {/* Quick chips */}
                                <div className="flex items-center gap-1.5 mt-2">
                                    {[1, 2, 3, 6].map(m => (
                                        <button
                                            key={m}
                                            type="button"
                                            onClick={() => setExtendMonths(m)}
                                            className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold transition-all cursor-pointer ${
                                                Number(extendMonths) === m
                                                    ? "bg-[#2D79C7] text-white"
                                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                            }`}
                                        >
                                            +{m}m
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Remarks */}
                            <div>
                                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                                    Reason / Remarks (Optional)
                                </label>
                                <textarea
                                    rows="3"
                                    placeholder="Reason for extension (e.g., Performance improvement plan, skill assessment extension)..."
                                    value={extendRemarks}
                                    onChange={(e) => setExtendRemarks(e.target.value)}
                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:border-[#2D79C7] resize-none"
                                />
                            </div>

                            {/* Footer Buttons */}
                            <div className="pt-3 border-t border-gray-100 flex items-center justify-end gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => setShowExtendModal(false)}
                                    className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-4 py-2 bg-[#2D79C7] hover:bg-[#1F5EA8] text-white text-xs font-bold rounded-xl transition-all cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            <span>Extending...</span>
                                        </>
                                    ) : (
                                        <>
                                            <CalendarPlus className="w-3.5 h-3.5" />
                                            <span>Confirm Extension</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ─────────────────────────────────────────────
               CONFIRM DELETE POLICY DIALOG
            ───────────────────────────────────────────── */}
            {confirmDeletePolicy && (
                <ConfirmDialog
                    isOpen={!!confirmDeletePolicy}
                    title={`Delete "${confirmDeletePolicy.name}"?`}
                    message={`Are you sure you want to delete this probation policy? Any employees currently assigned to this policy will be unlinked.`}
                    confirmText="Delete Policy"
                    type="danger"
                    onConfirm={handleDeletePolicy}
                    onClose={() => setConfirmDeletePolicy(null)}
                />
            )}

            {/* ─────────────────────────────────────────────
               CONFIRM REMOVE EMPLOYEE DIALOG
            ───────────────────────────────────────────── */}
            {confirmRemoveEmp && (
                <ConfirmDialog
                    isOpen={!!confirmRemoveEmp}
                    title="Remove from Probation?"
                    message={`Are you sure you want to remove ${confirmRemoveEmp.displayName} from their assigned probation policy?`}
                    confirmText="Remove Employee"
                    type="danger"
                    onConfirm={handleRemoveEmployee}
                    onClose={() => setConfirmRemoveEmp(null)}
                />
            )}
        </div>
    );
};

export default Probation;
