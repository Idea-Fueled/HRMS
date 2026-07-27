import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
    Users, UserCheck, UserX, UserPlus, Briefcase, FileText,
    Plus, Eye, EyeOff, Edit3, X, ChevronDown, Trash2,
    Phone, Mail, Calendar, Building2, Shield, Upload,
    Check, Loader2, Lock, User as UserIcon, Search
} from "lucide-react";
import { toast } from "sonner";
import ConfirmDialog from "../../components/ConfirmDialog";
import {
    ViewToggle, SkeletonLoader, EmptyState, SearchBar,
    Pagination, SortHeader, Avatar
} from "../../components/SharedComponents";
import {
    getAllEmployees,
    createEmployee,
    updateEmployee,
    checkEmployeeId,
    getDepartments,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    getManagers,
    deactivateEmployee,
    getHRVisibility,
    updateHRVisibility
} from "../../services/employee.service";
import { useAuth } from "../../context/AuthContext";
import { uploadProfilePicture } from "../../services/auth.service";

const useResponsivePageSize = (viewMode) => {
    const [windowWidth, setWindowWidth] = React.useState(typeof window !== "undefined" ? window.innerWidth : 1024);
    React.useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    if (viewMode === "card") {
        if (windowWidth >= 1024) return 10;
        if (windowWidth >= 640) return 6;
        return 4;
    }
    return 10;
};

/* ─────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────── */
const DEPARTMENTS = ["Engineering", "Marketing", "HR", "Sales", "Finance", "Operations", "Design", "Product"];
const DESIGNATIONS = [
    "Software Engineer", "Senior Software Engineer", "Engineering Lead",
    "Product Manager", "HR Manager", "HR Business Partner", "Marketing Manager",
    "SEO Specialist", "Sales Executive", "Senior Business Developer",
    "Marketing Director", "UI/UX Designer", "Data Analyst", "DevOps Engineer",
    "QA Engineer", "Business Analyst", "Finance Manager", "Operations Manager", "Consultant"
];
const EMPLOYMENT_TYPES = [
    { value: "full_time", label: "Full Time" },
    { value: "part_time", label: "Part Time" },
    { value: "contract", label: "Contract" },
    { value: "intern", label: "Intern" },
    { value: "consultant", label: "Consultant" },
];
const ROLES = [
    { value: "global_admin", label: "Global Admin" },
    { value: "hr", label: "HR" },
    { value: "manager", label: "Manager" },
    { value: "employee", label: "Employee" },
];
const STATUSES = [
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
    { value: "on_notice", label: "On Notice" },
    { value: "terminated", label: "Terminated" },
];
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const GENDERS = ["Male", "Female", "Other"];
const WORK_LOCATIONS = ["Office", "WFH", "Hybrid"];

const DEFAULT_PERMISSIONS = {
    dashboard: true,
    me: true,
    myTeam: true,
    myFinances: true,
    documents: {
        companyDocuments: true,
        employeeDocuments: false
    },
    timeAndAttend: false,
    employees: false,
    payroll: false,
    recruitment: false,
    hire: false,
    offboardingAndOnboarding: false,
    organization: false
};

const EMPTY_FORM = {
    employeeId: "", firstName: "", lastName: "", email: "",
    phoneNumber: "", profilePicture: "",
    role: "employee", department: "", designation: "", managerId: "", dottedManagerId: "",
    employementType: "full_time", workLocation: "Office", joiningDate: "",
    dateOfBirth: "", gender: "", bloodGroup: "",
    fatherName: "", emergencyContactNumber: "",
    presentAddress: "", permanentAddress: "",
    casualLeave: 8, sickLeave: 6, earnedLeave: 20,
    password: "", confirmPassword: "", status: "active",
    permissions: { ...DEFAULT_PERMISSIONS }
};



const statusBadge = (s) => ({
    active: "bg-emerald-50 text-emerald-700 border-emerald-100",
    inactive: "bg-gray-100 text-gray-500 border-gray-200",
    on_notice: "bg-amber-50 text-amber-700 border-amber-100",
    terminated: "bg-rose-50 text-rose-700 border-rose-100",
}[s] || "bg-gray-100 text-gray-500 border-gray-200");

const statusLabel = (s) => ({ active: "Active", inactive: "Inactive", on_notice: "On Notice", terminated: "Terminated" }[s] || s);
const empTypeLabel = (t) => EMPLOYMENT_TYPES.find(x => x.value === t)?.label || t;
const roleLabel = (r) => ROLES.find(x => x.value === r)?.label || r;
const formatDate = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

/* ─────────────────────────────────────────────
   LAYOUT COMPONENTS
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

const ErrorAlert = ({ message, onRetry }) => (
    <div className="bg-rose-50/50 border border-rose-100 rounded-[20px] p-6 text-center text-rose-700 select-none">
        <h3 className="font-bold text-[15px] mb-1">Error Loading Employees</h3>
        <p className="text-xs text-rose-600 mb-4">{message}</p>
        {onRetry && (
            <button onClick={onRetry} className="bg-rose-600 text-white text-xs font-bold px-4 py-2 rounded-[10px] hover:bg-rose-700 transition-all cursor-pointer">
                Retry
            </button>
        )}
    </div>
);

/* ─────────────────────────────────────────────
   FORM PRIMITIVES
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

const SectionTitle = ({ children }) => (
    <div className="flex items-center gap-2 mt-1 mb-1">
        <h3 className="text-[11px] font-black text-[#2D79C7] uppercase tracking-widest whitespace-nowrap">{children}</h3>
        <div className="flex-1 h-px bg-blue-100" />
    </div>
);

const SelectField = ({ value, onChange, children, error }) => (
    <div className="relative">
        <select value={value} onChange={onChange} className={`${selectCls} ${error ? "border-rose-300" : ""}`}>
            {children}
        </select>
        <ChevronDown className="w-3 h-3 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
    </div>
);

const DepartmentSelectField = ({ value, onChange, departments, onEdit, onDelete, onAddNew, error }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={containerRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`${selectCls} text-left flex items-center justify-between min-h-[38px] ${error ? "border-rose-300" : ""}`}
            >
                <span className="truncate">{value || "Select department"}</span>
                <ChevronDown className="w-3 h-3 text-gray-400 shrink-0 pointer-events-none" />
            </button>

            {isOpen && (
                <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-[14px] shadow-lg max-h-56 overflow-y-auto z-[100] animate-fadeIn p-1">
                    {/* Default Option */}
                    <div
                        onClick={() => { onChange(""); setIsOpen(false); }}
                        className="px-3 py-2 text-xs font-semibold text-slate-500 rounded-[8px] hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                        Select department
                    </div>

                    {/* Departments List */}
                    {(departments || []).map((dept) => (
                        <div
                            key={dept}
                            className="group flex items-center justify-between px-3 py-2 text-xs font-semibold text-[#1E1E1E] rounded-[8px] hover:bg-slate-50 cursor-pointer transition-colors"
                        >
                            <span 
                                className="flex-1 truncate py-0.5 text-left"
                                onClick={() => { onChange(dept); setIsOpen(false); }}
                            >
                                {dept}
                            </span>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onEdit(dept);
                                    }}
                                    className="p-1 hover:bg-blue-50 text-blue-600 rounded-[6px] transition-colors"
                                    title="Rename Department"
                                >
                                    <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDelete(dept);
                                    }}
                                    className="p-1 hover:bg-rose-50 text-rose-600 rounded-[6px] transition-colors"
                                    title="Delete Department"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    ))}

                    <div className="h-px bg-slate-100 my-1" />

                    {/* Add New Department */}
                    <div
                        onClick={() => { onAddNew(); setIsOpen(false); }}
                        className="px-3 py-2 text-xs font-bold text-blue-600 rounded-[8px] hover:bg-blue-50 cursor-pointer transition-colors flex items-center gap-1.5"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add New Department</span>
                    </div>
                </div>
            )}
        </div>
    );
};

/* ─────────────────────────────────────────────
   SUMMARY CARDS
───────────────────────────────────────────── */
const SummaryCards = ({ summary, loading }) => {
    const cards = [
        { label: "Total Employees", value: summary?.total ?? 0, icon: Users, color: "bg-blue-50 text-[#2D79C7] border-blue-100" },
        { label: "Active Employees", value: summary?.active ?? 0, icon: UserCheck, color: "bg-emerald-50 text-emerald-700 border-emerald-100" },
        { label: "Inactive Employees", value: summary?.inactive ?? 0, icon: UserX, color: "bg-gray-100 text-gray-500 border-gray-200" },
        { label: "New Joiners", value: summary?.newJoiners ?? 0, icon: UserPlus, color: "bg-violet-50 text-violet-700 border-violet-100" },
        { label: "Full Time", value: summary?.fullTime ?? 0, icon: Briefcase, color: "bg-indigo-50 text-indigo-700 border-indigo-100" },
        { label: "Intern", value: summary?.intern ?? 0, icon: FileText, color: "bg-amber-50 text-amber-700 border-amber-100" },
    ];

    if (loading) return <SkeletonLoader type="stat" />;

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
            {cards.map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="premium-3d-card-mini p-4 flex flex-col gap-3">
                    <div className={`w-8 h-8 rounded-[10px] border flex items-center justify-center ${color}`}>
                        <Icon className="w-4 h-4" strokeWidth={2} />
                    </div>
                    <div>
                        <p className="text-[26px] font-black text-[#1E1E1E] leading-none">{value}</p>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mt-1">{label}</p>
                    </div>
                </div>
            ))}
        </div>
    );
};

/* ─────────────────────────────────────────────
   FILTER BAR
───────────────────────────────────────────── */
const FilterBar = ({ filters, onChange, employees, departments }) => {
    const designations = [...new Set(employees.map(e => e.designation).filter(Boolean))];
    const sel = (field) => (e) => onChange({ ...filters, [field]: e.target.value });

    return (
        <div className="flex flex-wrap items-center gap-2">
            <SearchBar
                value={filters.search}
                onChange={(v) => onChange({ ...filters, search: v })}
                placeholder="Search by name, email, ID..."
            />
            <div className="relative">
                <select value={filters.department} onChange={sel("department")} className="pl-3 pr-8 h-[38px] bg-white border border-gray-200 rounded-[12px] text-xs text-[#1E1E1E] focus:outline-none focus:border-[#2D79C7] appearance-none cursor-pointer shadow-inner">
                    <option value="">All Departments</option>
                    {departments.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <ChevronDown className="w-3 h-3 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <div className="relative">
                <select value={filters.designation} onChange={sel("designation")} className="pl-3 pr-8 h-[38px] bg-white border border-gray-200 rounded-[12px] text-xs text-[#1E1E1E] focus:outline-none focus:border-[#2D79C7] appearance-none cursor-pointer shadow-inner">
                    <option value="">All Designations</option>
                    {designations.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <ChevronDown className="w-3 h-3 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <div className="relative">
                <select value={filters.employementType} onChange={sel("employementType")} className="pl-3 pr-8 h-[38px] bg-white border border-gray-200 rounded-[12px] text-xs text-[#1E1E1E] focus:outline-none focus:border-[#2D79C7] appearance-none cursor-pointer shadow-inner">
                    <option value="">All Types</option>
                    {EMPLOYMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <ChevronDown className="w-3 h-3 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <div className="relative">
                <select value={filters.status} onChange={sel("status")} className="pl-3 pr-8 h-[38px] bg-white border border-gray-200 rounded-[12px] text-xs text-[#1E1E1E] focus:outline-none focus:border-[#2D79C7] appearance-none cursor-pointer shadow-inner">
                    <option value="">All Statuses</option>
                    {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
                <ChevronDown className="w-3 h-3 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <div className="relative">
                <select value={filters.role} onChange={sel("role")} className="pl-3 pr-8 h-[38px] bg-white border border-gray-200 rounded-[12px] text-xs text-[#1E1E1E] focus:outline-none focus:border-[#2D79C7] appearance-none cursor-pointer shadow-inner">
                    <option value="">All Roles</option>
                    {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
                <ChevronDown className="w-3 h-3 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
        </div>
    );
};

/* ─────────────────────────────────────────────
   LIST VIEW
───────────────────────────────────────────── */
const EmployeeListView = ({ employees, onView, onEdit, onDeactivate, sortField, sortDir, onSort }) => {
    const { user } = useAuth();
    const isHrOrAdmin = (user?.role || "").toLowerCase() === "global_admin" || (user?.role || "").toLowerCase() === "admin" || (user?.role || "").toLowerCase() === "hr";

    if (!employees.length) return <EmptyState message="No employees found" description="Try adjusting your filters or add a new employee." />;

    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] whitespace-nowrap">
                <thead>
                    <tr className="bg-[#F9FAFB] border-b border-[#F3F4F6]">
                        {[
                            { label: "Emp ID", field: "employeeId" },
                            { label: "Name", field: "fullName" },
                            { label: "Email", field: "email" },
                            { label: "Department", field: "department" },
                            { label: "Designation", field: "designation" },
                        ].map(({ label, field }) => (
                            <th key={field} className="text-left px-4 py-3 text-xs text-gray-400">
                                <SortHeader label={label} field={field} sortField={sortField} sortDir={sortDir} onSort={onSort} />
                            </th>
                        ))}
                        {["Manager", "Type", "Status", "Joining Date", "Actions"].map(h => (
                            <th key={h} className="text-left px-4 py-3 text-xs text-gray-400 font-extrabold uppercase tracking-wider">{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-[#F3F4F6]">
                    {employees.map((emp) => (
                        <tr 
                            key={emp._id} 
                            onClick={(e) => {
                                if (!e.target.closest("button")) {
                                    onView(emp);
                                }
                            }}
                            className="hover:bg-blue-50/30 transition-colors group cursor-pointer"
                        >
                            <td className="px-4 py-3">
                                <span className="text-[11px] font-bold text-[#2D79C7] bg-blue-50 px-2 py-0.5 rounded-[6px] border border-blue-100">{emp.employeeId}</span>
                            </td>
                            <td className="px-4 py-3">
                                <div className="flex items-center gap-2.5">
                                    <Avatar src={emp.profilePicture} name={emp.fullName || `${emp.firstName} ${emp.lastName}`} size="w-8 h-8" />
                                    <div>
                                        <p className="text-sm font-bold text-[#1E1E1E] leading-none group-hover:text-[#2D79C7] transition-colors">{emp.fullName || `${emp.firstName} ${emp.lastName}`}</p>
                                        <p className="text-xs text-gray-400 mt-0.5">{roleLabel(emp.role)}</p>
                                    </div>
                                </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{emp.email}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{emp.department || "—"}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{emp.designation || "—"}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{emp.managerId?.fullName || "—"}</td>
                            <td className="px-4 py-3">
                                <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-[6px]">{empTypeLabel(emp.employementType)}</span>
                            </td>
                            <td className="px-4 py-3">
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${statusBadge(emp.status)}`}>{statusLabel(emp.status)}</span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-500">{formatDate(emp.joiningDate)}</td>
                            <td className="px-4 py-3">
                                <div className="flex items-center gap-1.5">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); onView(emp); }} 
                                        title="View Profile" 
                                        className="p-1.5 bg-blue-50 hover:bg-blue-100 rounded-[8px] text-[#2D79C7] transition-colors cursor-pointer border border-blue-100"
                                    >
                                        <Eye className="w-4 h-4" />
                                    </button>
                                    {isHrOrAdmin && (
                                        <>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); onEdit(emp); }} 
                                                title="Edit Employee" 
                                                className="p-1.5 bg-amber-50 hover:bg-amber-100 rounded-[8px] text-amber-700 transition-colors cursor-pointer border border-amber-100"
                                            >
                                                <Edit3 className="w-4 h-4" />
                                            </button>
                                            {emp.status !== "inactive" && emp.status !== "terminated" && (
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); onDeactivate(emp); }} 
                                                    title="Deactivate Employee" 
                                                    className="p-1.5 bg-rose-50 hover:bg-rose-100 rounded-[8px] text-rose-600 transition-colors cursor-pointer border border-rose-100"
                                                >
                                                    <UserX className="w-4 h-4" />
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

/* ─────────────────────────────────────────────
   CARD VIEW
───────────────────────────────────────────── */
const EmployeeCardView = ({ employees, onView, onEdit }) => {
    const { user } = useAuth();
    const isHrOrAdmin = (user?.role || "").toLowerCase() === "global_admin" || (user?.role || "").toLowerCase() === "admin" || (user?.role || "").toLowerCase() === "hr";

    if (!employees.length) return <EmptyState message="No employees found" description="Try adjusting your filters or add a new employee." />;

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 p-5">
            {employees.map((emp) => {
                const name = emp.fullName || `${emp.firstName} ${emp.lastName}`;
                return (
                    <div 
                        key={emp._id} 
                        onClick={(e) => {
                            if (!e.target.closest("button")) {
                                onView(emp);
                            }
                        }}
                        className="premium-3d-card p-5 flex flex-col gap-4 relative cursor-pointer hover:border-blue-300 transition-all"
                    >
                        <span className={`absolute top-4 right-4 text-xs font-black px-2 py-0.5 rounded-full border ${statusBadge(emp.status)}`}>{statusLabel(emp.status)}</span>
                        <div className="flex flex-col items-center text-center gap-2">
                            <Avatar src={emp.profilePicture} name={name} size="w-14 h-14" textSize="text-sm" />
                            <div>
                                <span className="text-sm font-bold text-[#1E1E1E] leading-tight block truncate max-w-[140px]" title={name}>{name}</span>
                                <p className="text-xs font-bold text-[#2D79C7] mt-0.5">{emp.employeeId}</p>
                            </div>
                        </div>
                        <div className="space-y-2 text-xs text-gray-500 border-t border-[#F3F4F6] pt-3">
                            <div className="flex items-center gap-2"><Building2 className="w-3 h-3 text-gray-300 shrink-0" /><span className="truncate font-medium">{emp.designation || "—"}</span></div>
                            <div className="flex items-center gap-2"><Shield className="w-3 h-3 text-gray-300 shrink-0" /><span className="font-medium">{emp.department || "—"}</span></div>
                            <div className="flex items-center gap-2"><Mail className="w-3 h-3 text-gray-300 shrink-0" /><span className="truncate">{emp.email}</span></div>
                            <div className="flex items-center gap-2"><Phone className="w-3 h-3 text-gray-300 shrink-0" /><span>{emp.phoneNumber || "—"}</span></div>
                        </div>
                        <div className="flex gap-2 mt-auto pt-1 border-t border-[#F3F4F6]">
                            <button 
                                onClick={(e) => { e.stopPropagation(); onView(emp); }} 
                                className="flex-1 py-1.5 text-xs font-bold text-[#2D79C7] bg-blue-50 hover:bg-blue-100 rounded-[8px] border border-blue-100 transition-colors cursor-pointer flex items-center justify-center gap-1"
                            >
                                <Eye className="w-3.5 h-3.5" /> View
                            </button>
                            {isHrOrAdmin && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onEdit(emp); }} 
                                    className="flex-1 py-1.5 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-[8px] border border-amber-100 transition-colors cursor-pointer flex items-center justify-center gap-1"
                                >
                                    <Edit3 className="w-3.5 h-3.5" /> Edit
                                </button>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

/* ─────────────────────────────────────────────
   VIEW EMPLOYEE DRAWER
───────────────────────────────────────────── */
export const ViewEmployeeDrawer = ({ employee, onClose, onEdit }) => {
    const navigate = useNavigate();
    if (!employee) return null;
    const name = employee.fullName || `${employee.firstName} ${employee.lastName}`;

    const InfoRow = ({ icon: Icon, label, value, className = "" }) => (
        <div className={`flex flex-col gap-1 ${className}`}>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-100 px-3 py-2.5 rounded-[12px] min-h-[40px] shadow-xs transition-all hover:bg-slate-50/80">
                {Icon && <Icon className="w-3.5 h-3.5 text-[#2D79C7] shrink-0" />}
                <span className="break-all whitespace-pre-wrap leading-relaxed">{value || "—"}</span>
            </div>
        </div>
    );

    const LeaveCard = ({ label, total, used }) => {
        const remaining = total - used;
        const percentage = total > 0 ? Math.max(0, (remaining / total) * 100) : 0;
        
        let theme = {
            bg: "bg-blue-50/30 border-blue-100/50 hover:bg-blue-50/50",
            badge: "bg-blue-100 text-blue-700",
            bar: "bg-gradient-to-r from-blue-500 to-indigo-500",
            text: "text-blue-900"
        };
        if (label.toLowerCase() === "sick") {
            theme = {
                bg: "bg-amber-50/30 border-amber-100/50 hover:bg-amber-50/50",
                badge: "bg-amber-100 text-amber-700",
                bar: "bg-gradient-to-r from-amber-500 to-orange-500",
                text: "text-amber-900"
            };
        } else if (label.toLowerCase() === "earned") {
            theme = {
                bg: "bg-emerald-50/30 border-emerald-100/50 hover:bg-emerald-50/50",
                badge: "bg-emerald-100 text-emerald-700",
                bar: "bg-gradient-to-r from-emerald-500 to-teal-500",
                text: "text-emerald-900"
            };
        }

        return (
            <div className={`border rounded-[16px] p-3.5 shadow-2xs flex flex-col gap-2.5 transition-all duration-300 hover:shadow-xs hover:-translate-y-0.5 ${theme.bg}`}>
                <div className="flex justify-between items-center gap-2">
                    <span className={`text-[10px] font-black uppercase tracking-wider ${theme.text}`}>{label}</span>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full whitespace-nowrap shadow-3xs ${theme.badge}`}>
                        {remaining} Left
                    </span>
                </div>
                <div className="flex items-baseline gap-0.5 mt-0.5">
                    <span className={`text-xl font-black leading-none ${theme.text}`}>{remaining}</span>
                    <span className="text-[9px] text-slate-400 font-bold">/ {total} Days</span>
                </div>
                <div className="w-full h-1.5 bg-slate-200/70 rounded-full overflow-hidden mt-0.5">
                    <div className={`h-full rounded-full transition-all duration-500 ${theme.bar}`} style={{ width: `${percentage}%` }} />
                </div>
                <span className="text-[9px] text-slate-400 font-bold leading-none">{used} used</span>
            </div>
        );
    };

    return (
        <>
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={onClose} />
            <div className="fixed top-0 right-0 h-full w-full max-w-[540px] bg-white z-50 shadow-2xl flex flex-col overflow-hidden">
                <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 bg-gradient-to-r from-[#2D79C7] to-[#1F5EA8] shadow-md">
                    <div className="flex items-center gap-3">
                        <Avatar src={employee.profilePicture} name={name} size="w-12 h-12" textSize="text-base" className="ring-2 ring-white/20" />
                        <div>
                            <h4 className="text-white text-base font-black leading-tight tracking-wide">{name}</h4>
                            <p className="text-white/70 text-xs font-semibold mt-0.5">{employee.designation} · {employee.employeeId}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                onClose();
                                navigate(`/profile/${employee._id}`);
                            }}
                            className="bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-3.5 py-2 rounded-[10px] flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                        >
                            <UserIcon className="w-3.5 h-3.5" /> Full Profile
                        </button>
                        {onEdit && (
                            <button onClick={() => { onClose(); onEdit(employee); }} className="bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-3.5 py-2 rounded-[10px] flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs">
                                <Edit3 className="w-3.5 h-3.5" /> Edit
                            </button>
                        )}
                        <button onClick={onClose} className="text-white/80 hover:text-white p-2 hover:bg-white/10 rounded-[10px] transition-colors cursor-pointer">
                            <X className="w-4.5 h-4.5" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/10">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-black px-3 py-1 rounded-full border shadow-xs ${statusBadge(employee.status)}`}>{statusLabel(employee.status)}</span>
                        <span className="text-xs font-bold text-slate-500 bg-white border border-slate-200 px-3 py-1 rounded-full shadow-2xs">{empTypeLabel(employee.employementType)}</span>
                        <span className="text-xs font-bold text-[#2D79C7] bg-blue-50 border border-blue-100 px-3 py-1 rounded-full shadow-2xs">{roleLabel(employee.role)}</span>
                    </div>

                    {/* Basic Info Container */}
                    <div className="bg-white border border-slate-200/60 rounded-[20px] p-5 shadow-xs space-y-4">
                        <SectionTitle>Basic Information</SectionTitle>
                        <div className="grid grid-cols-2 gap-4 mt-2">
                            <InfoRow label="Employee ID" value={employee.employeeId} />
                            <InfoRow label="Full Name" value={name} />
                            <InfoRow icon={Mail} label="Email" value={employee.email} className="col-span-2" />
                            <InfoRow icon={Phone} label="Phone" value={employee.phoneNumber} className="col-span-2" />
                        </div>
                    </div>

                    {/* Organizational Info Container */}
                    <div className="bg-white border border-slate-200/60 rounded-[20px] p-5 shadow-xs space-y-4">
                        <SectionTitle>Organizational Information</SectionTitle>
                        <div className="grid grid-cols-2 gap-4 mt-2">
                            <InfoRow icon={Building2} label="Department" value={employee.department} />
                            <InfoRow icon={Shield} label="Designation" value={employee.designation} />
                            <InfoRow label="Role" value={roleLabel(employee.role)} />
                            <InfoRow label="Reporting Manager" value={employee.managerId?.fullName} />
                            <InfoRow label="Dotted Line Manager" value={employee.dottedManagerId?.fullName} />
                            <InfoRow label="Employment Type" value={empTypeLabel(employee.employementType)} />
                            <InfoRow label="Work Location" value={employee.workLocation} />
                            <InfoRow icon={Calendar} label="Joining Date" value={formatDate(employee.joiningDate)} />
                        </div>
                    </div>

                    {/* Personal Info Container */}
                    <div className="bg-white border border-slate-200/60 rounded-[20px] p-5 shadow-xs space-y-4">
                        <SectionTitle>Personal Information</SectionTitle>
                        <div className="grid grid-cols-2 gap-4 mt-2">
                            <InfoRow label="Father's Name" value={employee.fatherName} />
                            <InfoRow icon={Calendar} label="Date of Birth" value={formatDate(employee.dateOfBirth)} />
                            <InfoRow label="Gender" value={employee.gender} />
                            <InfoRow label="Blood Group" value={employee.bloodGroup} />
                            <InfoRow icon={Phone} label="Emergency Phone" value={employee.emergencyContactNumber} className="col-span-2" />
                            <InfoRow label="Present Address" value={employee.presentAddress} className="col-span-2" />
                            <InfoRow label="Permanent Address" value={employee.permanentAddress} className="col-span-2" />
                        </div>
                    </div>

                    {/* Leave Balance Container */}
                    <div className="bg-white border border-slate-200/60 rounded-[20px] p-5 shadow-xs space-y-4">
                        <SectionTitle>Leave Balance</SectionTitle>
                        <div className="grid grid-cols-3 gap-3 mt-2">
                            <LeaveCard 
                                label="Casual" 
                                total={employee.leaveBalance?.casual?.total ?? 8} 
                                used={employee.leaveBalance?.casual?.used ?? 0} 
                            />
                            <LeaveCard 
                                label="Sick" 
                                total={employee.leaveBalance?.sick?.total ?? 6} 
                                used={employee.leaveBalance?.sick?.used ?? 0} 
                            />
                            <LeaveCard 
                                label="Earned" 
                                total={employee.leaveBalance?.earned?.total ?? 20} 
                                used={employee.leaveBalance?.earned?.used ?? 0} 
                            />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

/* ─────────────────────────────────────────────
   ADD / EDIT EMPLOYEE DRAWER
───────────────────────────────────────────── */
const EmployeeDrawer = ({ mode, employee, departments, managersList, onClose, onSuccess, refreshDepartments }) => {
    const isEdit = mode === "edit";

    const [form, setForm] = useState(() => {
        if (isEdit && employee) {
            return {
                employeeId: employee.employeeId || "",
                firstName: employee.firstName || "",
                lastName: employee.lastName || "",
                email: employee.email || "",
                phoneNumber: employee.phoneNumber || "",
                profilePicture: employee.profilePicture || "",
                role: employee.role || "employee",
                department: employee.department || "",
                designation: employee.designation || "",
                managerId: employee.managerId?._id || employee.managerId || "",
                dottedManagerId: employee.dottedManagerId?._id || employee.dottedManagerId || "",
                employementType: employee.employementType || "full_time",
                workLocation: employee.workLocation || "Office",
                joiningDate: employee.joiningDate ? employee.joiningDate.split("T")[0] : "",
                dateOfBirth: employee.dateOfBirth ? employee.dateOfBirth.split("T")[0] : "",
                gender: employee.gender || "",
                bloodGroup: employee.bloodGroup || "",
                fatherName: employee.fatherName || "",
                emergencyContactNumber: employee.emergencyContactNumber || "",
                presentAddress: employee.presentAddress || "",
                permanentAddress: employee.permanentAddress || "",
                casualLeave: employee.leaveBalance?.casual?.total ?? 8,
                sickLeave: employee.leaveBalance?.sick?.total ?? 6,
                earnedLeave: employee.leaveBalance?.earned?.total ?? 20,
                password: "",
                confirmPassword: "",
                status: employee.status || "active",
                permissions: employee.permissions || { ...DEFAULT_PERMISSIONS }
            };
        }
        return { ...EMPTY_FORM, permissions: { ...DEFAULT_PERMISSIONS } };
    });

    const [errors, setErrors] = useState({});
    const [idStatus, setIdStatus] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const idTimer = useRef(null);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);
    const [showNewDeptModal, setShowNewDeptModal] = useState(false);
    const [newDeptName, setNewDeptName] = useState("");
    const [showRenameDeptModal, setShowRenameDeptModal] = useState(false);
    const [renameDeptOldName, setRenameDeptOldName] = useState("");
    const [renameDeptNewName, setRenameDeptNewName] = useState("");
    const [showDeleteDeptModal, setShowDeleteDeptModal] = useState(false);
    const [deleteDeptTarget, setDeleteDeptTarget] = useState("");

    const { user: currentUser } = useAuth();
    const isGlobalAdminLoggedIn = (currentUser?.role || "").toLowerCase() === "global_admin" || (currentUser?.role || "").toLowerCase() === "admin";

    const [hrVisibleEmployees, setHrVisibleEmployees] = useState([]);
    const [hrSearchQuery, setHrSearchQuery] = useState("");

    useEffect(() => {
        if (isEdit && employee?._id && form.role === "hr") {
            getHRVisibility(employee._id)
                .then(res => {
                    if (res.data?.success) {
                        setHrVisibleEmployees(res.data.visibleEmployees || []);
                    }
                })
                .catch(err => console.error("Error loading HR visibility:", err));
        }
    }, [isEdit, employee?._id, form.role]);

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast.error("File size must be less than 5 MB.");
            return;
        }

        const formData = new FormData();
        formData.append("image", file);

        try {
            setUploading(true);
            const res = await uploadProfilePicture(formData);
            if (res.data?.success) {
                setForm(prev => ({ ...prev, profilePicture: res.data.url }));
                toast.success("Profile picture uploaded successfully.");
            } else {
                toast.error("Profile picture upload failed.");
            }
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || "Failed to upload profile picture.");
        } finally {
            setUploading(false);
        }
    };

    const handleCreateDepartment = async (deptName) => {
        try {
            const res = await createDepartment(deptName);
            if (res.data?.success) {
                toast.success("Department created successfully.");
                if (refreshDepartments) {
                    await refreshDepartments();
                }
                setForm(prev => ({ ...prev, department: deptName }));
            }
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || "Failed to create department.");
        }
    };

    const handleTriggerRenameDepartment = (deptName) => {
        setRenameDeptOldName(deptName);
        setRenameDeptNewName(deptName);
        setShowRenameDeptModal(true);
    };

    const handleRenameDepartment = async () => {
        if (!renameDeptNewName.trim() || renameDeptOldName === renameDeptNewName.trim()) {
            setShowRenameDeptModal(false);
            return;
        }
        try {
            const res = await updateDepartment(renameDeptOldName, renameDeptNewName.trim());
            if (res.data?.success) {
                toast.success("Department renamed successfully.");
                if (refreshDepartments) {
                    await refreshDepartments();
                }
                if (form.department === renameDeptOldName) {
                    setForm(prev => ({ ...prev, department: renameDeptNewName.trim() }));
                }
            }
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || "Failed to rename department.");
        } finally {
            setShowRenameDeptModal(false);
        }
    };

    const handleDeleteDepartment = (deptName) => {
        setDeleteDeptTarget(deptName);
        setShowDeleteDeptModal(true);
    };

    const handleDeleteConfirm = async () => {
        try {
            const res = await deleteDepartment(deleteDeptTarget);
            if (res.data?.success) {
                toast.success("Department deleted successfully.");
                if (refreshDepartments) {
                    await refreshDepartments();
                }
                if (form.department === deleteDeptTarget) {
                    setForm(prev => ({ ...prev, department: "" }));
                }
            }
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || "Failed to delete department.");
        } finally {
            setShowDeleteDeptModal(false);
            setDeleteDeptTarget("");
        }
    };

    const set = (field) => (e) => {
        const val = e.target.type === "number" ? Number(e.target.value) : e.target.value;
        if (field === "department" && val === "ADD_NEW_DEPT") {
            setShowNewDeptModal(true);
            return;
        }
        if (field === "role") {
            const isHrOrAdmin = val === "global_admin" || val === "admin" || val === "hr";
            setForm(prev => ({ 
                ...prev, 
                role: val,
                permissions: {
                    dashboard: true,
                    me: true,
                    myTeam: true,
                    myFinances: true,
                    documents: {
                        companyDocuments: true,
                        employeeDocuments: isHrOrAdmin
                    },
                    timeAndAttend: isHrOrAdmin,
                    employees: isHrOrAdmin,
                    payroll: isHrOrAdmin,
                    recruitment: isHrOrAdmin,
                    hire: isHrOrAdmin,
                    offboardingAndOnboarding: isHrOrAdmin,
                    organization: isHrOrAdmin
                }
            }));
            if (errors[field]) setErrors(prev => ({ ...prev, [field]: "" }));
            return;
        }
        setForm(prev => ({ ...prev, [field]: val }));
        if (errors[field]) setErrors(prev => ({ ...prev, [field]: "" }));
    };

    useEffect(() => {
        if (!form.employeeId.trim()) { setIdStatus(null); return; }
        if (isEdit && employee && form.employeeId.trim() === employee.employeeId) { setIdStatus("available"); return; }
        setIdStatus("checking");
        clearTimeout(idTimer.current);
        idTimer.current = setTimeout(async () => {
            try {
                const res = await checkEmployeeId(form.employeeId.trim());
                setIdStatus(res.data.available ? "available" : "taken");
            } catch { setIdStatus(null); }
        }, 500);
        return () => clearTimeout(idTimer.current);
    }, [form.employeeId, isEdit, employee]);

    const validate = () => {
        const e = {};
        if (!form.employeeId.trim()) e.employeeId = "Employee ID is required";
        if (idStatus === "taken") e.employeeId = "Employee ID already exists";
        if (!form.firstName.trim()) e.firstName = "First name is required";
        if (!form.email.trim()) e.email = "Email is required";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Invalid email format";
        if (!form.phoneNumber.trim()) e.phoneNumber = "Phone number is required";
        if (!form.role) e.role = "Role is required";
        if (!form.department) e.department = "Department is required";
        if (!form.designation) e.designation = "Designation is required";
        if (!form.employementType) e.employementType = "Employment type is required";
        if (!form.workLocation) e.workLocation = "Work location is required";
        if (!form.joiningDate) e.joiningDate = "Joining date is required";
        if (!isEdit) {
            if (!form.password) e.password = "Password is required";
            else if (form.password.length < 8) e.password = "Minimum 8 characters";
            if (form.password !== form.confirmPassword) e.confirmPassword = "Passwords do not match";
        } else if (form.password) {
            if (form.password.length < 8) e.password = "Minimum 8 characters";
            if (form.password !== form.confirmPassword) e.confirmPassword = "Passwords do not match";
        }
        return e;
    };

    const handleSubmit = async () => {
        const errs = validate();
        if (Object.keys(errs).length) { setErrors(errs); toast.error("Please fix the errors before submitting."); return; }
        setSubmitting(true);
        try {
            const payload = { ...form };
            if (!payload.managerId) payload.managerId = null;
            if (!payload.dottedManagerId) payload.dottedManagerId = null;
            delete payload.confirmPassword;
            if (isEdit && !payload.password) delete payload.password;

            let targetHrId = null;
            if (isEdit) {
                await updateEmployee(employee._id, payload);
                targetHrId = employee._id;
                toast.success("Employee updated successfully.");
            } else {
                const res = await createEmployee(payload);
                targetHrId = res.data?.employee?._id;
                toast.success("Employee created successfully.");
            }

            if (targetHrId && isGlobalAdminLoggedIn && form.role === "hr") {
                const empIds = hrVisibleEmployees.map(e => e._id || e);
                await updateHRVisibility(targetHrId, empIds);
            }
            onSuccess();
            onClose();
        } catch (err) {
            toast.error(err?.response?.data?.message || "Something went wrong.");
        } finally {
            setSubmitting(false);
        }
    };

    const availableManagers = (managersList || []).filter(e => e._id !== employee?._id);

    return (
        <>
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={onClose} />
            <div className="fixed top-0 right-0 h-full w-full max-w-[560px] bg-white z-50 shadow-2xl flex flex-col overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-[#2D79C7] to-[#1F5EA8]">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-[10px] bg-white/20 flex items-center justify-center">
                            {isEdit ? <Edit3 className="w-4 h-4 text-white" /> : <UserIcon className="w-4 h-4 text-white" />}
                        </div>
                        <div>
                            <p className="text-white font-black text-sm">{isEdit ? "Edit Employee" : "Add New Employee"}</p>
                            <p className="text-white/60 text-xs">{isEdit ? `Editing ${employee?.employeeId}` : "Fill in the details below"}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-white/80 hover:text-white p-1.5 hover:bg-white/10 rounded-[8px] transition-colors cursor-pointer">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

                    {/* Basic Information */}
                    <SectionTitle>Basic Information</SectionTitle>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                            <FormField label="Employee ID" required error={errors.employeeId}>
                                <div className="relative">
                                    <input value={form.employeeId} onChange={set("employeeId")} placeholder="e.g. EMP-001" className={`${inputCls} pr-8 ${errors.employeeId ? "border-rose-300" : ""}`} />
                                    {idStatus === "checking" && <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />}
                                    {idStatus === "available" && <Check className="w-3.5 h-3.5 text-emerald-500 absolute right-3 top-1/2 -translate-y-1/2" />}
                                    {idStatus === "taken" && <X className="w-3.5 h-3.5 text-rose-500 absolute right-3 top-1/2 -translate-y-1/2" />}
                                </div>
                                {idStatus === "available" && !errors.employeeId && <p className="text-xs text-emerald-600 font-medium mt-0.5">ID is available</p>}
                            </FormField>
                        </div>
                        <FormField label="First Name" required error={errors.firstName}>
                            <input value={form.firstName} onChange={set("firstName")} placeholder="First name" className={`${inputCls} ${errors.firstName ? "border-rose-300" : ""}`} />
                        </FormField>
                        <FormField label="Last Name" error={errors.lastName}>
                            <input value={form.lastName} onChange={set("lastName")} placeholder="Last name" className={`${inputCls} ${errors.lastName ? "border-rose-300" : ""}`} />
                        </FormField>
                        <FormField label="Email" required error={errors.email}>
                            <input type="email" value={form.email} onChange={set("email")} placeholder="email@company.com" className={`${inputCls} ${errors.email ? "border-rose-300" : ""}`} />
                        </FormField>
                        <FormField label="Phone Number" required error={errors.phoneNumber}>
                            <input value={form.phoneNumber} onChange={set("phoneNumber")} placeholder="+91 XXXXX XXXXX" className={`${inputCls} ${errors.phoneNumber ? "border-rose-300" : ""}`} />
                        </FormField>
                        <div className="col-span-2">
                            <FormField label="Profile Picture">
                                <div className="flex items-center gap-4 mt-1 bg-gray-50/50 p-4 border border-gray-150 rounded-[14px]">
                                    <Avatar src={form.profilePicture} name={form.firstName || "New"} size="w-14 h-14" textSize="text-lg" />
                                    <div className="flex flex-col gap-1.5 text-left">
                                        <div className="flex gap-2">
                                            <button 
                                                type="button" 
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={uploading}
                                                className="bg-white border border-gray-200 text-gray-700 text-xs font-bold px-3 py-2 rounded-[8px] hover:bg-gray-50 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-60"
                                            >
                                                {uploading ? (
                                                    <div className="w-3.5 h-3.5 border-2 border-gray-400/30 border-t-gray-700 rounded-full animate-spin" />
                                                ) : (
                                                    <Upload className="w-3.5 h-3.5 text-gray-500" />
                                                )}
                                                <span>{uploading ? "Uploading..." : "Upload Image"}</span>
                                            </button>
                                            {form.profilePicture && (
                                                <button 
                                                    type="button" 
                                                    onClick={() => setForm(prev => ({ ...prev, profilePicture: "" }))}
                                                    className="bg-rose-50 border border-rose-100 text-rose-700 text-xs font-bold px-3 py-2 rounded-[8px] hover:bg-rose-100 transition-colors cursor-pointer"
                                                >
                                                    Remove
                                                </button>
                                            )}
                                        </div>
                                        <span className="text-xs text-gray-400 font-medium">Supported formats: JPG, JPEG, PNG, WEBP. Max size: 5 MB</span>
                                    </div>
                                    <input 
                                        type="file" 
                                        ref={fileInputRef}
                                        onChange={handleFileChange}
                                        accept="image/jpeg,image/jpg,image/png,image/webp"
                                        className="hidden" 
                                    />
                                </div>
                            </FormField>
                        </div>
                    </div>

                    {/* Organizational Information */}
                    <SectionTitle>Organizational Information</SectionTitle>
                    <div className="grid grid-cols-2 gap-3">
                        <FormField label="Role" required error={errors.role}>
                            <SelectField value={form.role} onChange={set("role")} error={errors.role}>
                                <option value="">Select role</option>
                                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                            </SelectField>
                        </FormField>
                        <FormField label="Department" required error={errors.department}>
                            <DepartmentSelectField 
                                value={form.department} 
                                onChange={(val) => {
                                    setForm(prev => ({ ...prev, department: val }));
                                    if (errors.department) setErrors(prev => ({ ...prev, department: "" }));
                                }} 
                                departments={departments}
                                onEdit={(dept) => handleTriggerRenameDepartment(dept)}
                                onDelete={(dept) => handleDeleteDepartment(dept)}
                                onAddNew={() => setShowNewDeptModal(true)}
                                error={errors.department}
                            />
                        </FormField>
                        <FormField label="Designation" required error={errors.designation}>
                            <input value={form.designation} onChange={set("designation")} placeholder="e.g. Lead Engineer" className={`${inputCls} ${errors.designation ? "border-rose-300" : ""}`} />
                        </FormField>
                        <FormField label="Reporting Manager">
                            <SelectField value={form.managerId} onChange={set("managerId")}>
                                <option value="">No Manager</option>
                                {availableManagers.map(m => (
                                    <option key={m._id} value={m._id}>
                                        {m.fullName || `${m.firstName} ${m.lastName}`} ({m.employeeId})
                                    </option>
                                ))}
                            </SelectField>
                        </FormField>
                        <FormField label="Dotted Line Manager">
                            <SelectField value={form.dottedManagerId} onChange={set("dottedManagerId")}>
                                <option value="">No Dotted Manager</option>
                                {availableManagers.map(m => (
                                    <option key={m._id} value={m._id}>
                                        {m.fullName || `${m.firstName} ${m.lastName}`} ({m.employeeId})
                                    </option>
                                ))}
                            </SelectField>
                        </FormField>
                        <FormField label="Employment Type" required error={errors.employementType}>
                            <SelectField value={form.employementType} onChange={set("employementType")} error={errors.employementType}>
                                <option value="">Select type</option>
                                {EMPLOYMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </SelectField>
                        </FormField>
                        <FormField label="Work Location" required error={errors.workLocation}>
                            <SelectField value={form.workLocation} onChange={set("workLocation")} error={errors.workLocation}>
                                <option value="">Select location</option>
                                {WORK_LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                            </SelectField>
                        </FormField>
                        <div className="col-span-2">
                            <FormField label="Joining Date" required error={errors.joiningDate}>
                                <input type="date" value={form.joiningDate} onChange={set("joiningDate")} className={`${inputCls} ${errors.joiningDate ? "border-rose-300" : ""}`} />
                            </FormField>
                        </div>
                    </div>

                    {/* Personal Information */}
                    <SectionTitle>Personal Information</SectionTitle>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2">
                            <FormField label="Father's Name">
                                <input value={form.fatherName} onChange={set("fatherName")} placeholder="Father's name" className={inputCls} />
                            </FormField>
                        </div>
                        <FormField label="Date of Birth">
                            <input type="date" value={form.dateOfBirth} onChange={set("dateOfBirth")} className={inputCls} />
                        </FormField>
                        <FormField label="Gender">
                            <SelectField value={form.gender} onChange={set("gender")}>
                                <option value="">Select gender</option>
                                {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
                            </SelectField>
                        </FormField>
                        <FormField label="Blood Group">
                            <SelectField value={form.bloodGroup} onChange={set("bloodGroup")}>
                                <option value="">Select</option>
                                {BLOOD_GROUPS.map(b => <option key={b} value={b}>{b}</option>)}
                            </SelectField>
                        </FormField>
                        <FormField label="Emergency Contact Number">
                            <input value={form.emergencyContactNumber} onChange={set("emergencyContactNumber")} placeholder="Contact number" className={inputCls} />
                        </FormField>
                        <div className="col-span-2">
                            <FormField label="Present Address">
                                <textarea value={form.presentAddress} onChange={set("presentAddress")} placeholder="Present address" rows={2} className={`${inputCls} py-2 h-16 resize-none`} />
                            </FormField>
                        </div>
                        <div className="col-span-2">
                            <FormField label="Permanent Address">
                                <textarea value={form.permanentAddress} onChange={set("permanentAddress")} placeholder="Permanent address" rows={2} className={`${inputCls} py-2 h-16 resize-none`} />
                            </FormField>
                        </div>
                    </div>

                    {/* Leave Configuration */}
                    <SectionTitle>Leave Configuration</SectionTitle>
                    <div className="grid grid-cols-3 gap-3">
                        <FormField label="Casual Leave">
                            <input type="number" min={0} value={form.casualLeave} onChange={set("casualLeave")} className={inputCls} />
                        </FormField>
                        <FormField label="Sick Leave">
                            <input type="number" min={0} value={form.sickLeave} onChange={set("sickLeave")} className={inputCls} />
                        </FormField>
                        <FormField label="Earned Leave">
                            <input type="number" min={0} value={form.earnedLeave} onChange={set("earnedLeave")} className={inputCls} />
                        </FormField>
                    </div>

                    {/* Roles & Permissions */}
                    <SectionTitle>Roles & Permissions</SectionTitle>
                    {(() => {
                        const isRoleGlobalAdmin = form.role === "global_admin" || form.role === "admin";
                        return (
                            <div className="bg-gray-50/50 p-4 border border-gray-150 rounded-[14px] space-y-3">
                                <p className="text-gray-400 text-[10.5px] font-semibold mb-1">
                                    {isRoleGlobalAdmin 
                                        ? "Global Admin automatically has full permission access to all modules."
                                        : "Configure module-level access permissions. Checked modules are visible and accessible."}
                                </p>
                                <div className="space-y-2">
                                    {/* Dashboard (Read Only) */}
                                    <div className="flex items-center justify-between p-2.5 bg-white border border-gray-100 rounded-[10px] select-none">
                                        <div>
                                            <p className="text-xs font-black text-slate-800">Dashboard</p>
                                            <p className="text-[10px] text-gray-400 font-bold">Main overview dashboard (Always enabled)</p>
                                        </div>
                                        <input type="checkbox" checked disabled className="w-4 h-4 rounded text-[#2D79C7] focus:ring-[#2D79C7] accent-[#2D79C7] cursor-not-allowed opacity-60" />
                                    </div>
                                    
                                    {/* Me (Read Only) */}
                                    <div className="flex items-center justify-between p-2.5 bg-white border border-gray-100 rounded-[10px] select-none">
                                        <div>
                                            <p className="text-xs font-black text-slate-800">Me</p>
                                            <p className="text-[10px] text-gray-400 font-bold">Personal profile and settings (Always enabled)</p>
                                        </div>
                                        <input type="checkbox" checked disabled className="w-4 h-4 rounded text-[#2D79C7] focus:ring-[#2D79C7] accent-[#2D79C7] cursor-not-allowed opacity-60" />
                                    </div>

                                    {/* My Team (Read Only) */}
                                    <div className="flex items-center justify-between p-2.5 bg-white border border-gray-100 rounded-[10px] select-none">
                                        <div>
                                            <p className="text-xs font-black text-slate-800">My Team</p>
                                            <p className="text-[10px] text-gray-400 font-bold">Direct reports directory (Always enabled)</p>
                                        </div>
                                        <input type="checkbox" checked disabled className="w-4 h-4 rounded text-[#2D79C7] focus:ring-[#2D79C7] accent-[#2D79C7] cursor-not-allowed opacity-60" />
                                    </div>

                                    {/* My Finances (Read Only) */}
                                    <div className="flex items-center justify-between p-2.5 bg-white border border-gray-100 rounded-[10px] select-none">
                                        <div>
                                            <p className="text-xs font-black text-slate-800">My Finances</p>
                                            <p className="text-[10px] text-gray-400 font-bold">Salary slips and bank info (Always enabled)</p>
                                        </div>
                                        <input type="checkbox" checked disabled className="w-4 h-4 rounded text-[#2D79C7] focus:ring-[#2D79C7] accent-[#2D79C7] cursor-not-allowed opacity-60" />
                                    </div>

                                    {/* Documents -> Company Documents (Read Only) */}
                                    <div className="flex items-center justify-between p-2.5 bg-white border border-gray-100 rounded-[10px] select-none">
                                        <div>
                                            <p className="text-xs font-black text-slate-800">Documents → Company Documents</p>
                                            <p className="text-[10px] text-gray-400 font-bold">Official handbook and policy files (Always enabled)</p>
                                        </div>
                                        <input type="checkbox" checked disabled className="w-4 h-4 rounded text-[#2D79C7] focus:ring-[#2D79C7] accent-[#2D79C7] cursor-not-allowed opacity-60" />
                                    </div>

                                    {/* Documents -> Employee Documents */}
                                    <div className={`flex items-center justify-between p-2.5 bg-white border border-gray-100 rounded-[10px] select-none transition-colors ${isRoleGlobalAdmin ? 'opacity-60' : 'hover:border-gray-200'}`}>
                                        <div>
                                            <p className="text-xs font-black text-slate-800">Documents → Employee Documents</p>
                                            <p className="text-[10px] text-gray-400 font-bold">Sensitive private employee record folders</p>
                                        </div>
                                        <input 
                                            type="checkbox" 
                                            checked={isRoleGlobalAdmin || form.permissions?.documents?.employeeDocuments !== false} 
                                            disabled={isRoleGlobalAdmin}
                                            onChange={(e) => setForm(prev => ({
                                                ...prev,
                                                permissions: {
                                                    ...prev.permissions,
                                                    documents: {
                                                        ...prev.permissions?.documents,
                                                        employeeDocuments: e.target.checked
                                                    }
                                                }
                                            }))}
                                            className="w-4 h-4 rounded text-[#2D79C7] focus:ring-[#2D79C7] accent-[#2D79C7] disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed" 
                                        />
                                    </div>

                                    {/* Time & Attendance */}
                                    <div className={`flex items-center justify-between p-2.5 bg-white border border-gray-100 rounded-[10px] select-none transition-colors ${isRoleGlobalAdmin ? 'opacity-60' : 'hover:border-gray-200'}`}>
                                        <div>
                                            <p className="text-xs font-black text-slate-800">Time & Attendance</p>
                                            <p className="text-[10px] text-gray-400 font-bold">Check-ins, leaves tracking and shift times</p>
                                        </div>
                                        <input 
                                            type="checkbox" 
                                            checked={isRoleGlobalAdmin || form.permissions?.timeAndAttend !== false} 
                                            disabled={isRoleGlobalAdmin}
                                            onChange={(e) => setForm(prev => ({
                                                ...prev,
                                                permissions: {
                                                    ...prev.permissions,
                                                    timeAndAttend: e.target.checked
                                                }
                                            }))}
                                            className="w-4 h-4 rounded text-[#2D79C7] focus:ring-[#2D79C7] accent-[#2D79C7] disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed" 
                                        />
                                    </div>

                                    {/* Employees */}
                                    <div className={`flex items-center justify-between p-2.5 bg-white border border-gray-100 rounded-[10px] select-none transition-colors ${isRoleGlobalAdmin ? 'opacity-60' : 'hover:border-gray-200'}`}>
                                        <div>
                                            <p className="text-xs font-black text-slate-800">Employees Module</p>
                                            <p className="text-[10px] text-gray-400 font-bold">Create and manage workforce accounts</p>
                                        </div>
                                        <input 
                                            type="checkbox" 
                                            checked={isRoleGlobalAdmin || form.permissions?.employees !== false} 
                                            disabled={isRoleGlobalAdmin}
                                            onChange={(e) => setForm(prev => ({
                                                ...prev,
                                                permissions: {
                                                    ...prev.permissions,
                                                    employees: e.target.checked
                                                }
                                            }))}
                                            className="w-4 h-4 rounded text-[#2D79C7] focus:ring-[#2D79C7] accent-[#2D79C7] disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed" 
                                        />
                                    </div>

                                    {/* Payroll */}
                                    <div className={`flex items-center justify-between p-2.5 bg-white border border-gray-100 rounded-[10px] select-none transition-colors ${isRoleGlobalAdmin ? 'opacity-60' : 'hover:border-gray-200'}`}>
                                        <div>
                                            <p className="text-xs font-black text-slate-800">Payroll Module</p>
                                            <p className="text-[10px] text-gray-400 font-bold">Salary computations and payouts database</p>
                                        </div>
                                        <input 
                                            type="checkbox" 
                                            checked={isRoleGlobalAdmin || form.permissions?.payroll !== false} 
                                            disabled={isRoleGlobalAdmin}
                                            onChange={(e) => setForm(prev => ({
                                                ...prev,
                                                permissions: {
                                                    ...prev.permissions,
                                                    payroll: e.target.checked
                                                }
                                            }))}
                                            className="w-4 h-4 rounded text-[#2D79C7] focus:ring-[#2D79C7] accent-[#2D79C7] disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed" 
                                        />
                                    </div>

                                    {/* Recruitment */}
                                    <div className={`flex items-center justify-between p-2.5 bg-white border border-gray-100 rounded-[10px] select-none transition-colors ${isRoleGlobalAdmin ? 'opacity-60' : 'hover:border-gray-200'}`}>
                                        <div>
                                            <p className="text-xs font-black text-slate-800">Recruitment</p>
                                            <p className="text-[10px] text-gray-400 font-bold">Job applications and vacancy pipeline</p>
                                        </div>
                                        <input 
                                            type="checkbox" 
                                            checked={isRoleGlobalAdmin || form.permissions?.recruitment !== false} 
                                            disabled={isRoleGlobalAdmin}
                                            onChange={(e) => setForm(prev => ({
                                                ...prev,
                                                permissions: {
                                                    ...prev.permissions,
                                                    recruitment: e.target.checked
                                                }
                                            }))}
                                            className="w-4 h-4 rounded text-[#2D79C7] focus:ring-[#2D79C7] accent-[#2D79C7] disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed" 
                                        />
                                    </div>

                                    {/* Hire */}
                                    <div className={`flex items-center justify-between p-2.5 bg-white border border-gray-100 rounded-[10px] select-none transition-colors ${isRoleGlobalAdmin ? 'opacity-60' : 'hover:border-gray-200'}`}>
                                        <div>
                                            <p className="text-xs font-black text-slate-800">Hire</p>
                                            <p className="text-[10px] text-gray-400 font-bold">Offer letters and new hires profiles</p>
                                        </div>
                                        <input 
                                            type="checkbox" 
                                            checked={isRoleGlobalAdmin || form.permissions?.hire !== false} 
                                            disabled={isRoleGlobalAdmin}
                                            onChange={(e) => setForm(prev => ({
                                                ...prev,
                                                permissions: {
                                                    ...prev.permissions,
                                                    hire: e.target.checked
                                                }
                                            }))}
                                            className="w-4 h-4 rounded text-[#2D79C7] focus:ring-[#2D79C7] accent-[#2D79C7] disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed" 
                                        />
                                    </div>

                                    {/* Offboarding & Onboarding */}
                                    <div className={`flex items-center justify-between p-2.5 bg-white border border-gray-100 rounded-[10px] select-none transition-colors ${isRoleGlobalAdmin ? 'opacity-60' : 'hover:border-gray-200'}`}>
                                        <div>
                                            <p className="text-xs font-black text-slate-800">Offboarding & Onboarding</p>
                                            <p className="text-[10px] text-gray-400 font-bold">New employee joinings and exits checklist</p>
                                        </div>
                                        <input 
                                            type="checkbox" 
                                            checked={isRoleGlobalAdmin || form.permissions?.offboardingAndOnboarding !== false} 
                                            disabled={isRoleGlobalAdmin}
                                            onChange={(e) => setForm(prev => ({
                                                ...prev,
                                                permissions: {
                                                    ...prev.permissions,
                                                    offboardingAndOnboarding: e.target.checked
                                                }
                                            }))}
                                            className="w-4 h-4 rounded text-[#2D79C7] focus:ring-[#2D79C7] accent-[#2D79C7] disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed" 
                                        />
                                    </div>

                                    {/* Organization */}
                                    <div className={`flex items-center justify-between p-2.5 bg-white border border-gray-100 rounded-[10px] select-none transition-colors ${isRoleGlobalAdmin ? 'opacity-60' : 'hover:border-gray-200'}`}>
                                        <div>
                                            <p className="text-xs font-black text-slate-800">Organization</p>
                                            <p className="text-[10px] text-gray-400 font-bold">Company structure, hierarchy and units</p>
                                        </div>
                                        <input 
                                            type="checkbox" 
                                            checked={isRoleGlobalAdmin || form.permissions?.organization !== false} 
                                            disabled={isRoleGlobalAdmin}
                                            onChange={(e) => setForm(prev => ({
                                                ...prev,
                                                permissions: {
                                                    ...prev.permissions,
                                                    organization: e.target.checked
                                                }
                                            }))}
                                            className="w-4 h-4 rounded text-[#2D79C7] focus:ring-[#2D79C7] accent-[#2D79C7] disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed" 
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    {/* HR Employee Visibility Management (Global Admin Control) */}
                    {isGlobalAdminLoggedIn && form.role === "hr" && (
                        <div>
                            <SectionTitle>Assigned Employees</SectionTitle>
                            <div className="space-y-3">
                                {/* Main Employee Selection Tool — Enterprise Layout */}
                                <div className="border border-gray-200 rounded-xl bg-white overflow-hidden shadow-2xs">
                                    {/* Header Actions */}
                                    <div className="flex items-center justify-between px-3 py-2 bg-gray-50/80 border-b border-gray-150 text-xs">
                                        <span className="font-semibold text-slate-700">Select Employees to Assign</span>
                                        <div className="flex items-center gap-3">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const allFiltered = (managersList || []).filter(emp => {
                                                        const q = hrSearchQuery.toLowerCase().trim();
                                                        if (!q) return true;
                                                        const name = emp.fullName || `${emp.firstName || ""} ${emp.lastName || ""}`;
                                                        return (
                                                            name.toLowerCase().includes(q) ||
                                                            (emp.employeeId || "").toLowerCase().includes(q) ||
                                                            (emp.department || "").toLowerCase().includes(q) ||
                                                            (emp.designation || "").toLowerCase().includes(q)
                                                        );
                                                    });
                                                    setHrVisibleEmployees(allFiltered);
                                                }}
                                                className="text-[#2D79C7] hover:text-[#1F5EA8] font-bold cursor-pointer transition-colors"
                                            >
                                                Select Filtered
                                            </button>
                                            <span className="text-gray-300">|</span>
                                            <button
                                                type="button"
                                                onClick={() => setHrVisibleEmployees([])}
                                                className="text-gray-500 hover:text-rose-600 font-bold cursor-pointer transition-colors"
                                            >
                                                Clear All
                                            </button>
                                        </div>
                                    </div>

                                    {/* Sticky Search Bar */}
                                    <div className="sticky top-0 bg-white border-b border-gray-150 p-2 z-10 flex items-center gap-2">
                                        <Search className="w-4 h-4 text-gray-400 shrink-0 ml-1" />
                                        <input
                                            type="text"
                                            placeholder="Search employee by name, ID, role or department..."
                                            value={hrSearchQuery}
                                            onChange={(e) => setHrSearchQuery(e.target.value)}
                                            className="w-full text-xs text-slate-800 placeholder-gray-400 bg-transparent outline-none"
                                        />
                                        {hrSearchQuery && (
                                            <button
                                                type="button"
                                                onClick={() => setHrSearchQuery("")}
                                                className="text-gray-400 hover:text-gray-600 cursor-pointer p-0.5"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>

                                    {/* Employee List with Checkboxes */}
                                    <div className="max-h-52 overflow-y-auto divide-y divide-gray-100">
                                        {(() => {
                                            const filtered = (managersList || []).filter(emp => {
                                                const q = hrSearchQuery.toLowerCase().trim();
                                                if (!q) return true;
                                                const name = emp.fullName || `${emp.firstName || ""} ${emp.lastName || ""}`;
                                                return (
                                                    name.toLowerCase().includes(q) ||
                                                    (emp.employeeId || "").toLowerCase().includes(q) ||
                                                    (emp.department || "").toLowerCase().includes(q) ||
                                                    (emp.designation || "").toLowerCase().includes(q)
                                                );
                                            });

                                            if (filtered.length === 0) {
                                                return (
                                                    <div className="p-5 text-center text-xs text-gray-400 font-medium">
                                                        No employees match "{hrSearchQuery}"
                                                    </div>
                                                );
                                            }

                                            const selectedIds = new Set(hrVisibleEmployees.map(e => e._id || e));

                                            return filtered.map(emp => {
                                                const empId = emp._id || emp;
                                                const isChecked = selectedIds.has(empId);
                                                const name = emp.fullName || `${emp.firstName || ""} ${emp.lastName || ""}`;

                                                return (
                                                    <label
                                                        key={empId}
                                                        className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors select-none ${
                                                            isChecked ? "bg-blue-50/50" : "hover:bg-gray-50"
                                                        }`}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            onChange={() => {
                                                                if (isChecked) {
                                                                    setHrVisibleEmployees(prev => prev.filter(v => (v._id || v) !== empId));
                                                                } else {
                                                                    setHrVisibleEmployees(prev => [...prev, emp]);
                                                                }
                                                            }}
                                                            className="w-4 h-4 rounded border-gray-300 text-[#2D79C7] focus:ring-0 accent-[#2D79C7] cursor-pointer shrink-0"
                                                        />
                                                        <Avatar src={emp.profilePicture} name={name} size="w-7 h-7" />
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-xs font-semibold text-slate-800 truncate">{name}</span>
                                                                <span className="text-[10px] font-mono text-gray-400 shrink-0 ml-2">{emp.employeeId}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-medium truncate">
                                                                <span>{emp.designation || "Employee"}</span>
                                                                {emp.department && (
                                                                    <>
                                                                        <span className="text-gray-300">•</span>
                                                                        <span>{emp.department}</span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </label>
                                                );
                                            });
                                        })()}
                                    </div>
                                </div>

                                {/* Selected Employees Chips Box */}
                                <div className="border border-gray-200 rounded-xl bg-gray-50/60 p-3 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-slate-800">
                                            Selected Employees ({hrVisibleEmployees.length})
                                        </span>
                                        {hrVisibleEmployees.length === 0 && (
                                            <span className="text-[11px] text-gray-400 font-medium">
                                                Unrestricted (sees all employees)
                                            </span>
                                        )}
                                    </div>

                                    {hrVisibleEmployees.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pt-0.5">
                                            {hrVisibleEmployees.map(emp => {
                                                const empId = emp._id || emp;
                                                const name = emp.fullName || emp.firstName || emp.employeeId;
                                                return (
                                                    <span
                                                        key={empId}
                                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-gray-200 rounded-md text-xs font-medium text-slate-700 shadow-2xs"
                                                    >
                                                        <span>{name}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => setHrVisibleEmployees(prev => prev.filter(v => (v._id || v) !== empId))}
                                                            className="text-gray-400 hover:text-rose-600 cursor-pointer transition-colors"
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Account Setup */}
                    <SectionTitle>Account Setup</SectionTitle>
                    <div className="grid grid-cols-2 gap-3">
                        <FormField label={isEdit ? "New Password (optional)" : "Password"} required={!isEdit} error={errors.password}>
                            <div className="relative">
                                <Lock className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={form.password}
                                    onChange={set("password")}
                                    placeholder={isEdit ? "Leave blank to keep" : "Min. 8 characters"}
                                    className={`${inputCls} pl-8 pr-9 ${errors.password ? "border-rose-300" : ""}`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#2D79C7] cursor-pointer focus:outline-none transition-colors"
                                    title={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                            </div>
                        </FormField>
                        <FormField label="Confirm Password" required={!isEdit} error={errors.confirmPassword}>
                            <div className="relative">
                                <Lock className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    value={form.confirmPassword}
                                    onChange={set("confirmPassword")}
                                    placeholder="Repeat password"
                                    className={`${inputCls} pl-8 pr-9 ${errors.confirmPassword ? "border-rose-300" : ""}`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#2D79C7] cursor-pointer focus:outline-none transition-colors"
                                    title={showConfirmPassword ? "Hide password" : "Show password"}
                                >
                                    {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                            </div>
                        </FormField>
                        <div className="col-span-2">
                            <FormField label="Status" required>
                                <div className="flex gap-2">
                                    {[{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }].map(s => (
                                        <button
                                            key={s.value}
                                            type="button"
                                            onClick={() => setForm(prev => ({ ...prev, status: s.value }))}
                                            className={`flex-1 py-2 text-xs font-bold rounded-[10px] border transition-all cursor-pointer ${
                                                form.status === s.value
                                                    ? s.value === "active"
                                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                        : "bg-gray-100 text-gray-600 border-gray-300"
                                                    : "bg-white text-gray-400 border-gray-200 hover:border-gray-300"
                                            }`}
                                        >
                                            {s.label}
                                        </button>
                                    ))}
                                </div>
                            </FormField>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-[#F3F4F6] flex items-center gap-3 bg-white">
                    <button onClick={onClose} className="flex-1 py-2.5 text-xs font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-[12px] transition-colors cursor-pointer">
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting || (!isEdit && idStatus === "taken")}
                        className="flex-1 py-2.5 text-xs font-bold text-white bg-[#2D79C7] hover:bg-[#1F5EA8] rounded-[12px] transition-colors cursor-pointer shadow-md shadow-[#2D79C7]/20 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {submitting
                            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />{isEdit ? "Saving..." : "Creating..."}</>
                            : isEdit ? "Save Changes" : "Create Employee"
                        }
                    </button>
                </div>
            </div>

            {showNewDeptModal && (
                <>
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] animate-fadeIn" onClick={() => { setShowNewDeptModal(false); setNewDeptName(""); }} />
                    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[400px] bg-white rounded-[24px] shadow-2xl p-6 z-[70] border border-gray-150 flex flex-col gap-4 animate-scaleIn select-none">
                        <div className="flex items-center gap-2 pb-1.5 border-b border-gray-100">
                            <div className="w-8 h-8 rounded-[10px] bg-blue-50 text-[#2D79C7] flex items-center justify-center border border-blue-100">
                                <Building2 className="w-4.5 h-4.5" />
                            </div>
                            <div>
                                <h3 className="text-[#1E1E1E] text-base font-black leading-tight">Add New Department</h3>
                                <p className="text-gray-400 text-[10.5px] font-semibold mt-0.5">Create custom organization unit</p>
                            </div>
                        </div>
                        <div className="flex flex-col gap-1.5 text-left">
                            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Department Name</label>
                            <input
                                type="text"
                                placeholder="e.g. Design, Product"
                                value={newDeptName}
                                onChange={(e) => setNewDeptName(e.target.value)}
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-[14px] text-sm text-[#1E1E1E] placeholder-gray-400 focus:outline-none focus:bg-white focus:border-[#2D79C7] focus:ring-1 focus:ring-[#2D79C7] transition-all shadow-inner"
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        if (newDeptName.trim()) {
                                            handleCreateDepartment(newDeptName.trim());
                                            setShowNewDeptModal(false);
                                            setNewDeptName("");
                                        }
                                    }
                                }}
                            />
                        </div>
                        <div className="flex gap-2.5 mt-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowNewDeptModal(false);
                                    setNewDeptName("");
                                }}
                                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-[12px] transition-colors cursor-pointer text-center"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={!newDeptName.trim()}
                                onClick={() => {
                                    if (newDeptName.trim()) {
                                        handleCreateDepartment(newDeptName.trim());
                                        setShowNewDeptModal(false);
                                        setNewDeptName("");
                                    }
                                }}
                                className="flex-1 py-2.5 bg-[#2D79C7] hover:bg-[#1F5EA8] disabled:bg-gray-300 text-white text-xs font-bold rounded-[12px] shadow-md hover:shadow-lg disabled:shadow-none transition-all cursor-pointer text-center flex items-center justify-center gap-1.5"
                            >
                                Create
                            </button>
                        </div>
                    </div>
                </>
            )}

            {showRenameDeptModal && (
                <>
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] animate-fadeIn" onClick={() => { setShowRenameDeptModal(false); setRenameDeptNewName(""); }} />
                    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[400px] bg-white rounded-[24px] shadow-2xl p-6 z-[70] border border-gray-150 flex flex-col gap-4 animate-scaleIn select-none">
                        <div className="flex items-center gap-2 pb-1.5 border-b border-gray-100">
                            <div className="w-8 h-8 rounded-[10px] bg-blue-50 text-[#2D79C7] flex items-center justify-center border border-blue-100">
                                <Edit3 className="w-4.5 h-4.5" />
                            </div>
                            <div>
                                <h3 className="text-[#1E1E1E] text-base font-black leading-tight">Rename Department</h3>
                                <p className="text-gray-400 text-[10.5px] font-semibold mt-0.5">Edit custom organization unit</p>
                            </div>
                        </div>
                        <div className="flex flex-col gap-1.5 text-left">
                            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Department Name</label>
                            <input
                                type="text"
                                placeholder="e.g. Design, Product"
                                value={renameDeptNewName}
                                onChange={(e) => setRenameDeptNewName(e.target.value)}
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-[14px] text-sm text-[#1E1E1E] placeholder-gray-400 focus:outline-none focus:bg-white focus:border-[#2D79C7] focus:ring-1 focus:ring-[#2D79C7] transition-all shadow-inner"
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        if (renameDeptNewName.trim()) {
                                            handleRenameDepartment();
                                        }
                                    }
                                }}
                            />
                        </div>
                        <div className="flex gap-2.5 mt-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowRenameDeptModal(false);
                                    setRenameDeptNewName("");
                                }}
                                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-[12px] transition-colors cursor-pointer text-center"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                disabled={!renameDeptNewName.trim() || renameDeptOldName === renameDeptNewName.trim()}
                                onClick={() => {
                                    if (renameDeptNewName.trim()) {
                                        handleRenameDepartment();
                                    }
                                }}
                                className="flex-1 py-2.5 bg-[#2D79C7] hover:bg-[#1F5EA8] disabled:bg-gray-300 text-white text-xs font-bold rounded-[12px] shadow-md hover:shadow-lg disabled:shadow-none transition-all cursor-pointer text-center flex items-center justify-center gap-1.5"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </>
            )}

            {showDeleteDeptModal && (
                <>
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] animate-fadeIn" onClick={() => { setShowDeleteDeptModal(false); setDeleteDeptTarget(""); }} />
                    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[400px] bg-white rounded-[24px] shadow-2xl p-6 z-[70] border border-gray-150 flex flex-col gap-4 animate-scaleIn select-none">
                        <div className="flex items-center gap-2 pb-1.5 border-b border-gray-100">
                            <div className="w-8 h-8 rounded-[10px] bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
                                <Trash2 className="w-4.5 h-4.5" />
                            </div>
                            <div>
                                <h3 className="text-[#1E1E1E] text-base font-black leading-tight">Delete Department</h3>
                                <p className="text-gray-400 text-[10.5px] font-semibold mt-0.5">Confirm permanent deletion</p>
                            </div>
                        </div>
                        <div className="text-xs font-semibold text-slate-600 leading-relaxed text-left">
                            Are you sure you want to delete the department <strong className="text-slate-800">"{deleteDeptTarget}"</strong>? This will clear the department field for all assigned employees.
                        </div>
                        <div className="flex gap-2.5 mt-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setShowDeleteDeptModal(false);
                                    setDeleteDeptTarget("");
                                }}
                                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-[12px] transition-colors cursor-pointer text-center"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    handleDeleteConfirm();
                                }}
                                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-[12px] shadow-md hover:shadow-lg transition-all cursor-pointer text-center flex items-center justify-center gap-1.5"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </>
            )}
        </>
    );
};

/* ─────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────── */
const Employees = () => {
    const { user, can } = useAuth();
    const navigate = useNavigate();
    const userRole = (user?.role || "").toLowerCase();
    const isHrOrAdmin = userRole === "global_admin" || userRole === "admin" || userRole === "hr";

    const [data, setData] = useState({ employees: [], summary: null });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [view, setView] = useState("list");
    const [filters, setFilters] = useState({ search: "", department: "", designation: "", employementType: "", status: "", role: "" });
    const [sortField, setSortField] = useState("fullName");
    const [sortDir, setSortDir] = useState("asc");
    const [page, setPage] = useState(1);
    const PAGE_SIZE = useResponsivePageSize(view);
    const [drawer, setDrawer] = useState(null);
    const [deactivateTarget, setDeactivateTarget] = useState(null);
    const [deactivating, setDeactivating] = useState(false);

    const [departments, setDepartments] = useState([]);
    const [managersList, setManagersList] = useState([]);

    const fetchEmployees = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await getAllEmployees();
            if (res.data.success) {
                setData({ employees: res.data.employees, summary: res.data.summary });
            }
        } catch (err) {
            setError(err?.response?.data?.message || "Failed to load employees.");
        } finally {
            setLoading(false);
        }
    }, []);

    const loadDynamicData = useCallback(async () => {
        try {
            const [deptsRes, mgrsRes] = await Promise.all([
                getDepartments(),
                getManagers()
            ]);
            if (deptsRes.data.success) {
                setDepartments(deptsRes.data.departments);
            }
            if (mgrsRes.data.success) {
                setManagersList(mgrsRes.data.managers);
            }
        } catch (err) {
            console.error("Failed to load departments/managers dynamically:", err);
        }
    }, []);

    const location = useLocation();

    useEffect(() => {
        if (location.state?.openDrawer) {
            setDrawer({ mode: location.state.openDrawer });
        }
    }, [location.state]);

    useEffect(() => {
        fetchEmployees();
        loadDynamicData();
    }, [fetchEmployees, loadDynamicData]);

    const handleDeactivate = (emp) => {
        setDeactivateTarget(emp);
    };

    const handleDeactivateConfirm = async () => {
        if (!deactivateTarget) return;
        setDeactivating(true);
        try {
            const res = await deactivateEmployee(deactivateTarget._id);
            if (res.data.success) {
                toast.success("Employee deactivated successfully.");
                await fetchEmployees();
            }
        } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to deactivate employee.");
        } finally {
            setDeactivating(false);
            setDeactivateTarget(null);
        }
    };

    const filtered = data.employees.filter(emp => {
        const name = emp.fullName || `${emp.firstName} ${emp.lastName}`;
        const q = filters.search.toLowerCase();
        if (q && !name.toLowerCase().includes(q) && !emp.email.toLowerCase().includes(q) && !emp.employeeId.toLowerCase().includes(q)) return false;
        if (filters.department && emp.department !== filters.department) return false;
        if (filters.designation && emp.designation !== filters.designation) return false;
        if (filters.employementType && emp.employementType !== filters.employementType) return false;
        if (filters.status && emp.status !== filters.status) return false;
        if (filters.role && emp.role !== filters.role) return false;
        return true;
    });

    const sorted = [...filtered].sort((a, b) => {
        const av = (a[sortField] || "").toString().toLowerCase();
        const bv = (b[sortField] || "").toString().toLowerCase();
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });

    const totalFiltered = sorted.length;
    const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const handleSort = (field) => {
        if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
        else { setSortField(field); setSortDir("asc"); }
        setPage(1);
    };

    const handleFilterChange = (f) => { setFilters(f); setPage(1); };

    return (
        <div className="space-y-6 select-none animate-fadeIn">
            <SummaryCards summary={data.summary} loading={loading} />

            <Card>
                <CardHeader
                    icon={Users}
                    title="Employees"
                    action={
                        isHrOrAdmin ? (
                        <button
                            onClick={() => setDrawer({ mode: "add" })}
                            className="flex items-center gap-1.5 bg-[#2D79C7] hover:bg-[#1F5EA8] text-white text-xs font-bold px-4 py-2 rounded-[12px] shadow-md shadow-[#2D79C7]/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                        >
                            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                            Add Employee
                        </button>
                        ) : null
                    }
                />

                <div className="px-5 py-4 border-b border-[#F3F4F6] flex flex-wrap items-center justify-between gap-3">
                    <FilterBar filters={filters} onChange={handleFilterChange} employees={data.employees} departments={departments} />
                    <ViewToggle view={view} onViewChange={(v) => { setView(v); setPage(1); }} />
                </div>

                {error ? (
                    <div className="p-5"><ErrorAlert message={error} onRetry={fetchEmployees} /></div>
                ) : loading ? (
                    <SkeletonLoader type={view === "card" ? "card" : "table"} rows={8} />
                ) : view === "list" ? (
                    <EmployeeListView
                        employees={paginated}
                        onView={(emp) => navigate(`/profile/${emp._id}`)}
                        onEdit={(emp) => setDrawer({ mode: "edit", employee: emp })}
                        onDeactivate={handleDeactivate}
                        sortField={sortField}
                        sortDir={sortDir}
                        onSort={handleSort}
                    />
                ) : (
                    <EmployeeCardView
                        employees={paginated}
                        onView={(emp) => navigate(`/profile/${emp._id}`)}
                        onEdit={(emp) => setDrawer({ mode: "edit", employee: emp })}
                    />
                )}

                {!loading && !error && (
                    <Pagination total={totalFiltered} limit={PAGE_SIZE} currentPage={page} onPageChange={setPage} />
                )}
            </Card>

            {drawer?.mode === "view" && (
                <ViewEmployeeDrawer
                    employee={drawer.employee}
                    onClose={() => setDrawer(null)}
                    onEdit={(emp) => setDrawer({ mode: "edit", employee: emp })}
                />
            )}

            {(drawer?.mode === "add" || drawer?.mode === "edit") && (
                <EmployeeDrawer
                    mode={drawer.mode}
                    employee={drawer.employee}
                    departments={departments}
                    managersList={managersList}
                    onClose={() => setDrawer(null)}
                    onSuccess={fetchEmployees}
                    refreshDepartments={loadDynamicData}
                />
            )}
        </div>
    );
};

export default Employees;
