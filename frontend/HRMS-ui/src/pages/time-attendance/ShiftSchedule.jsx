import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
    Clock,
    Calendar,
    Plus,
    Search,
    Edit3,
    Trash2,
    Users,
    Check,
    X,
    UserPlus,
    Briefcase,
    CalendarDays,
    Info,
    CheckCircle2,
    Eye
} from "lucide-react";
import { toast } from "sonner";
import { Avatar } from "../../components/SharedComponents";
import {
    getAllHolidays,
    createHoliday,
    updateHoliday,
    deleteHoliday
} from "../../services/dashboard.service";
import {
    getAllShifts,
    createShift,
    updateShift,
    deleteShift,
    assignEmployeeToShift
} from "../../services/shift.service";
import { getAllEmployees } from "../../services/employee.service";
import API from "../../services/api";
import ConfirmDialog from "../../components/ConfirmDialog";

/* ─────────────────────────────────────────────
   HELPERS & FORMATTERS
───────────────────────────────────────────── */
const DAY_OPTIONS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const displayType = (type) => {
    if (type === "public_holiday") return "Public Holiday";
    if (type === "company_holiday") return "Company Holiday";
    if (type === "optional_holiday") return "Optional Holiday";
    return type || "Public Holiday";
};

const typeBadgeColors = {
    "Public Holiday": "bg-blue-50 text-[#2D79C7] border-blue-100",
    "Company Holiday": "bg-purple-50 text-purple-700 border-purple-100",
    "Optional Holiday": "bg-amber-50 text-amber-700 border-amber-100",
};

/* ─────────────────────────────────────────────
   SHIFT SCHEDULE COMPONENT
───────────────────────────────────────────── */
export const ShiftSchedule = () => {
    const [subTab, setSubTab] = useState("shifts"); // 'shifts' | 'holidays'

    /* ── SHIFT STATES ── */
    const [shifts, setShifts] = useState([]);
    const [loadingShifts, setLoadingShifts] = useState(true);
    const [selectedShiftId, setSelectedShiftId] = useState(null);
    const [shiftSearch, setShiftSearch] = useState("");

    // Shift Modals & Confirm Dialogs
    const [createShiftOpen, setCreateShiftOpen] = useState(false);
    const [editShiftOpen, setEditShiftOpen] = useState(false);
    const [assignModalOpen, setAssignModalOpen] = useState(false);
    const [deleteShiftTarget, setDeleteShiftTarget] = useState(null);
    const [deleteHolidayTarget, setDeleteHolidayTarget] = useState(null);
    
    // Active Employees List for Assignment
    const [allEmployees, setAllEmployees] = useState([]);
    const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
    const [assignSearch, setAssignSearch] = useState("");

    // Shift Form State
    const [shiftForm, setShiftForm] = useState({
        name: "",
        code: "",
        startTime: "09:30 AM",
        endTime: "06:30 PM",
        breakMinutes: 45,
        workingDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
        description: ""
    });

    /* ── HOLIDAY STATES ── */
    const [holidays, setHolidays] = useState([]);
    const [loadingHolidays, setLoadingHolidays] = useState(true);
    const [holidaySearch, setHolidaySearch] = useState("");
    const [viewHolidayModal, setViewHolidayModal] = useState(null);

    // Holiday Modals
    const [createHolidayOpen, setCreateHolidayOpen] = useState(false);
    const [editHolidayModal, setEditHolidayModal] = useState(null);

    const [holidayForm, setHolidayForm] = useState({
        title: "",
        date: "",
        day: "",
        type: "public_holiday",
        description: ""
    });

    // Auto-calculate day of week for Holiday date picker
    useEffect(() => {
        if (holidayForm.date) {
            const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
            const d = days[new Date(holidayForm.date).getDay()];
            setHolidayForm(prev => ({ ...prev, day: d }));
        }
    }, [holidayForm.date]);

    /* ── API FETCHERS ── */
    const fetchShifts = useCallback(async () => {
        try {
            setLoadingShifts(true);
            const res = await getAllShifts();
            if (res.data?.success) {
                const data = res.data.data || [];
                setShifts(data);
                if (data.length > 0 && !selectedShiftId) {
                    setSelectedShiftId(data[0]._id);
                }
            }
        } catch (err) {
            console.error("Fetch shifts error:", err);
            toast.error("Failed to load shifts.");
        } finally {
            setLoadingShifts(false);
        }
    }, [selectedShiftId]);

    const fetchHolidaysData = useCallback(async () => {
        try {
            setLoadingHolidays(true);
            const res = await getAllHolidays();
            if (res.data?.success) {
                setHolidays(res.data.holidays || []);
            }
        } catch (err) {
            console.error("Fetch holidays error:", err);
            toast.error("Failed to load holidays.");
        } finally {
            setLoadingHolidays(false);
        }
    }, []);

    const fetchEmployeesList = useCallback(async () => {
        try {
            const res = await getAllEmployees();
            if (res.data?.success && res.data.employees) {
                setAllEmployees(res.data.employees);
            } else {
                const fallbackRes = await API.get("/attendance/dashboard-summary");
                if (fallbackRes.data?.tableData) {
                    setAllEmployees(fallbackRes.data.tableData);
                }
            }
        } catch (err) {
            console.error("Fetch employees error:", err);
            try {
                const fallbackRes = await API.get("/attendance/dashboard-summary");
                if (fallbackRes.data?.tableData) {
                    setAllEmployees(fallbackRes.data.tableData);
                }
            } catch (fallbackErr) {
                console.error("Fallback fetch error:", fallbackErr);
            }
        }
    }, []);

    useEffect(() => {
        fetchShifts();
        fetchHolidaysData();
        fetchEmployeesList();
    }, [fetchShifts, fetchHolidaysData, fetchEmployeesList]);

    /* ── SHIFT HANDLERS ── */
    const selectedShift = useMemo(() => {
        return shifts.find(s => s._id === selectedShiftId) || shifts[0] || null;
    }, [shifts, selectedShiftId]);

    const filteredShifts = useMemo(() => {
        if (!shiftSearch.trim()) return shifts;
        const q = shiftSearch.toLowerCase();
        return shifts.filter(s =>
            s.name.toLowerCase().includes(q) ||
            s.code.toLowerCase().includes(q) ||
            (s.description && s.description.toLowerCase().includes(q))
        );
    }, [shifts, shiftSearch]);

    // Open Assign Modal & populate pre-assigned employees
    const openAssignStaffModal = () => {
        if (!selectedShift) return;
        const assignedIds = selectedShift.assignedEmployees
            ? selectedShift.assignedEmployees.map(e => (typeof e === "object" ? e._id : e))
            : [];
        setSelectedEmployeeIds(assignedIds);
        setAssignSearch("");
        setAssignModalOpen(true);
    };

    const handleCreateShiftSubmit = async (e) => {
        e.preventDefault();
        if (!shiftForm.name.trim() || !shiftForm.code.trim()) {
            toast.error("Shift name and code are required.");
            return;
        }

        try {
            const res = await createShift(shiftForm);
            if (res.data?.success) {
                toast.success("Shift created successfully.");
                setCreateShiftOpen(false);
                setShiftForm({
                    name: "",
                    code: "",
                    startTime: "09:30 AM",
                    endTime: "06:30 PM",
                    breakMinutes: 45,
                    workingDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
                    description: ""
                });
                await fetchShifts();
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to create shift.");
        }
    };

    const handleEditShiftSubmit = async (e) => {
        e.preventDefault();
        if (!selectedShift) return;

        try {
            const res = await updateShift(selectedShift._id, shiftForm);
            if (res.data?.success) {
                toast.success("Shift updated successfully.");
                setEditShiftOpen(false);
                await fetchShifts();
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to update shift.");
        }
    };

    const confirmDeleteShift = async () => {
        if (!deleteShiftTarget) return;
        try {
            const res = await deleteShift(deleteShiftTarget._id);
            if (res.data?.success) {
                toast.success("Shift deleted successfully.");
                await fetchShifts();
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to delete shift.");
        } finally {
            setDeleteShiftTarget(null);
        }
    };

    const confirmDeleteHoliday = async () => {
        if (!deleteHolidayTarget) return;
        try {
            const res = await deleteHoliday(deleteHolidayTarget._id);
            if (res.data?.success) {
                toast.success("Holiday deleted successfully.");
                await fetchHolidaysData();
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to delete holiday.");
        } finally {
            setDeleteHolidayTarget(null);
        }
    };

    const handleAssignEmployeesSubmit = async () => {
        if (!selectedShift) return;

        try {
            const res = await assignEmployeeToShift(selectedShift._id, selectedEmployeeIds);
            if (res.data?.success) {
                toast.success("Employees assigned to shift successfully.");
                setAssignModalOpen(false);
                await fetchShifts();
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to assign employees.");
        }
    };

    /* ── HOLIDAY HANDLERS ── */
    const filteredHolidays = useMemo(() => {
        if (!holidaySearch.trim()) return holidays;
        const q = holidaySearch.toLowerCase();
        return holidays.filter(h =>
            h.title.toLowerCase().includes(q) ||
            (h.day && h.day.toLowerCase().includes(q)) ||
            (h.type && h.type.toLowerCase().includes(q))
        );
    }, [holidays, holidaySearch]);

    // Filter Assign Modal Employees
    const filteredAssignEmployees = useMemo(() => {
        if (!assignSearch.trim()) return allEmployees;
        const q = assignSearch.toLowerCase();
        return allEmployees.filter(e => {
            const name = e.fullName || `${e.firstName || ""} ${e.lastName || ""}`.trim();
            const id = e.employeeId || e._id || "";
            const dept = e.department || "";
            return (
                name.toLowerCase().includes(q) ||
                String(id).toLowerCase().includes(q) ||
                dept.toLowerCase().includes(q)
            );
        });
    }, [allEmployees, assignSearch]);

    const handleCreateHolidaySubmit = async (e) => {
        e.preventDefault();
        if (!holidayForm.title.trim() || !holidayForm.date) {
            toast.error("Holiday title and date are required.");
            return;
        }

        try {
            const res = await createHoliday(holidayForm);
            if (res.data?.success) {
                toast.success("Holiday created successfully.");
                setCreateHolidayOpen(false);
                setHolidayForm({ title: "", date: "", day: "", type: "public_holiday", description: "" });
                await fetchHolidaysData();
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to create holiday.");
        }
    };

    const handleEditHolidaySubmit = async (e) => {
        e.preventDefault();
        if (!editHolidayModal) return;

        try {
            const res = await updateHoliday(editHolidayModal._id, holidayForm);
            if (res.data?.success) {
                toast.success("Holiday updated successfully.");
                setEditHolidayModal(null);
                await fetchHolidaysData();
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to update holiday.");
        }
    };

    return (
        <div className="space-y-6 text-left select-none animate-fadeIn pb-12">
            
            {/* Symmetric Sub-Tabs Selector Top Bar */}
            <div className="premium-3d-card px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setSubTab("shifts")}
                        className={`h-9 inline-flex items-center justify-center gap-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer select-none leading-none ${
                            subTab === "shifts"
                                ? "bg-[#2D79C7] text-white shadow-sm font-extrabold"
                                : "bg-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50 border border-transparent"
                        }`}
                    >
                        <Clock className="w-4 h-4 shrink-0" />
                        <span className="leading-none">Shifts ({shifts.length})</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setSubTab("holidays")}
                        className={`h-9 inline-flex items-center justify-center gap-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer select-none leading-none ${
                            subTab === "holidays"
                                ? "bg-[#2D79C7] text-white shadow-sm font-extrabold"
                                : "bg-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-50 border border-transparent"
                        }`}
                    >
                        <CalendarDays className="w-4 h-4 shrink-0" />
                        <span className="leading-none">Holidays ({holidays.length})</span>
                    </button>
                </div>

                <div>
                    {subTab === "shifts" ? (
                        <button
                            type="button"
                            onClick={() => {
                                setShiftForm({
                                    name: "",
                                    code: "",
                                    startTime: "09:30 AM",
                                    endTime: "06:30 PM",
                                    breakMinutes: 45,
                                    workingDays: ["Mon", "Tue", "Wed", "Thu", "Fri"],
                                    description: ""
                                });
                                setCreateShiftOpen(true);
                            }}
                            className="h-9 inline-flex items-center justify-center gap-1.5 bg-[#2D79C7] hover:bg-[#1F5EA8] text-white text-xs font-bold px-4 rounded-xl shadow-sm transition-all cursor-pointer"
                        >
                            <Plus className="w-4 h-4 shrink-0" />
                            <span>Create Shift</span>
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => {
                                setHolidayForm({ title: "", date: "", day: "", type: "public_holiday", description: "" });
                                setCreateHolidayOpen(true);
                            }}
                            className="h-9 inline-flex items-center justify-center gap-1.5 bg-[#2D79C7] hover:bg-[#1F5EA8] text-white text-xs font-bold px-4 rounded-xl shadow-sm transition-all cursor-pointer"
                        >
                            <Plus className="w-4 h-4 shrink-0" />
                            <span>Create Holiday</span>
                        </button>
                    )}
                </div>
            </div>

            {/* ─────────────────────────────────────────────
               SUB-TAB 1: SHIFTS MANAGEMENT
            ───────────────────────────────────────────── */}
            {subTab === "shifts" && (
                <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">
                    
                    {/* Left Column: Searchable Shift List */}
                    <div className="premium-3d-card p-4 space-y-4">
                        <div className="relative">
                            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                            <input
                                type="text"
                                value={shiftSearch}
                                onChange={(e) => setShiftSearch(e.target.value)}
                                placeholder="Search shift name, code..."
                                className="w-full pl-9 pr-3 py-1.5 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl text-xs font-medium text-gray-700 focus:outline-none focus:border-[#2D79C7]"
                            />
                        </div>

                        <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
                            {loadingShifts ? (
                                <p className="text-xs text-gray-400 text-center py-8">Loading shifts...</p>
                            ) : filteredShifts.length === 0 ? (
                                <p className="text-xs text-gray-400 text-center py-8">No shifts found.</p>
                            ) : (
                                filteredShifts.map((shift) => {
                                    const isSelected = selectedShiftId === shift._id;
                                    const assignedCount = shift.assignedEmployees ? shift.assignedEmployees.length : 0;

                                    return (
                                        <div
                                            key={shift._id}
                                            onClick={() => setSelectedShiftId(shift._id)}
                                            className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                                                isSelected
                                                    ? "border-[#2D79C7] bg-blue-50/50 shadow-sm font-bold"
                                                    : "border-[#E5E7EB] hover:bg-gray-50/80"
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-[#1E1E1E] text-xs font-extrabold">{shift.name}</h4>
                                                <span className="text-[10px] font-mono font-bold text-[#2D79C7] bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                                    {shift.code}
                                                </span>
                                            </div>

                                            <div className="mt-2 text-[11px] text-gray-500 font-medium flex items-center justify-between">
                                                <span>{shift.startTime} - {shift.endTime}</span>
                                                <span className="text-gray-400">{assignedCount} Assigned</span>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Right Column: Shift Details View */}
                    {selectedShift ? (
                        <div className="premium-3d-card p-6 space-y-6">
                            
                            {/* Header & Actions */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E5E7EB]">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-[#1E1E1E] text-[18px] font-extrabold">{selectedShift.name}</h2>
                                        <span className="text-xs font-mono font-bold text-[#2D79C7] bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-100">
                                            {selectedShift.code}
                                        </span>
                                    </div>
                                    <p className="text-gray-500 text-xs font-medium mt-1">
                                        {selectedShift.description || "Shift parameters and assigned workforce roster."}
                                    </p>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={openAssignStaffModal}
                                        className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-[#2D79C7] border border-blue-100 text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                                    >
                                        <UserPlus className="w-3.5 h-3.5" />
                                        <span>Assign Staff</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShiftForm({
                                                name: selectedShift.name,
                                                code: selectedShift.code,
                                                startTime: selectedShift.startTime,
                                                endTime: selectedShift.endTime,
                                                breakMinutes: selectedShift.breakMinutes || 45,
                                                workingDays: selectedShift.workingDays || ["Mon", "Tue", "Wed", "Thu", "Fri"],
                                                description: selectedShift.description || ""
                                            });
                                            setEditShiftOpen(true);
                                        }}
                                        className="flex items-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer border border-[#E5E7EB]"
                                    >
                                        <Edit3 className="w-3.5 h-3.5" />
                                        <span>Edit</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => setDeleteShiftTarget(selectedShift)}
                                        className="flex items-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>

                            {/* Metrics Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl p-4">
                                    <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider block">Shift Timings</span>
                                    <div className="text-[#1E1E1E] text-sm font-bold font-mono mt-1">
                                        {selectedShift.startTime} - {selectedShift.endTime}
                                    </div>
                                </div>

                                <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl p-4">
                                    <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider block">Working Days</span>
                                    <div className="flex items-center gap-1 mt-1 text-xs font-bold text-gray-700">
                                        {selectedShift.workingDays ? selectedShift.workingDays.join(", ") : "Mon - Fri"}
                                    </div>
                                </div>

                                <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl p-4">
                                    <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider block">Break Duration</span>
                                    <div className="text-[#1E1E1E] text-sm font-bold font-mono mt-1">
                                        {selectedShift.breakMinutes || 45} mins
                                    </div>
                                </div>

                                <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl p-4">
                                    <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider block">Assigned Employees</span>
                                    <div className="text-[#2D79C7] text-sm font-bold font-mono mt-1">
                                        {selectedShift.assignedEmployees ? selectedShift.assignedEmployees.length : 0} Members
                                    </div>
                                </div>
                            </div>

                            {/* Assigned Employees Section */}
                            <div className="space-y-3 pt-2">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-[#1E1E1E] text-xs font-bold uppercase tracking-wider">
                                        Assigned Employees List ({selectedShift.assignedEmployees ? selectedShift.assignedEmployees.length : 0})
                                    </h3>
                                </div>

                                {!selectedShift.assignedEmployees || selectedShift.assignedEmployees.length === 0 ? (
                                    <div className="bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl p-8 text-center text-gray-400 text-xs font-medium">
                                        No employees assigned to this shift yet. Click "Assign Staff" to assign employees.
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {selectedShift.assignedEmployees.map((emp) => {
                                            const name = emp.fullName || `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || "Employee";

                                            return (
                                                <div key={emp._id} className="flex items-center justify-between p-3 border border-[#E5E7EB] rounded-xl bg-[#F8FAFC]/60">
                                                    <div className="flex items-center gap-3">
                                                        <Avatar name={name} size="w-8 h-8" textSize="text-xs" />
                                                        <div>
                                                            <span className="text-[#1E1E1E] text-xs font-bold block">{name}</span>
                                                            <span className="text-gray-400 text-[10.5px] font-medium">
                                                                {emp.designation || emp.department || "Staff"}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <span className="text-[#2D79C7] font-mono text-[10.5px] font-bold">
                                                        {emp.employeeId || "EMP"}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                        </div>
                    ) : (
                        <div className="bg-white border border-[#E5E7EB] rounded-[16px] p-12 text-center text-gray-400 text-xs font-medium">
                            Select a shift from the left list to view details.
                        </div>
                    )}
                </div>
            )}

            {/* ─────────────────────────────────────────────
               SUB-TAB 2: HOLIDAYS MANAGEMENT
            ───────────────────────────────────────────── */}
            {subTab === "holidays" && (
                <div className="premium-3d-card p-6 space-y-4">
                    
                    {/* Header & Filter */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E7EB]">
                        <h3 className="text-[#1E1E1E] text-[15px] font-extrabold flex items-center gap-2">
                            <CalendarDays className="w-4.5 h-4.5 text-[#2D79C7]" />
                            <span>Holiday Calendar</span>
                        </h3>

                        <div className="relative">
                            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                            <input
                                type="text"
                                value={holidaySearch}
                                onChange={(e) => setHolidaySearch(e.target.value)}
                                placeholder="Search holiday title, day, type..."
                                className="pl-9 pr-3 py-1.5 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl text-xs font-medium text-gray-700 focus:outline-none focus:border-[#2D79C7] w-64"
                            />
                        </div>
                    </div>

                    {/* Holidays Table */}
                    <div className="overflow-x-auto w-full">
                        <table className="w-full border-collapse text-left whitespace-nowrap">
                            <thead>
                                <tr className="bg-[#F8FAFC] text-gray-400 text-[11px] uppercase font-bold border-b border-[#E5E7EB]">
                                    <th className="py-3.5 px-4">Holiday Name</th>
                                    <th className="py-3.5 px-4">Date</th>
                                    <th className="py-3.5 px-4">Day</th>
                                    <th className="py-3.5 px-4">Type</th>
                                    <th className="py-3.5 px-4">Description</th>
                                    <th className="py-3.5 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-xs font-semibold text-gray-700">
                                {loadingHolidays ? (
                                    <tr>
                                        <td colSpan="6" className="py-10 text-center text-gray-400 font-medium">
                                            Loading holiday calendar...
                                        </td>
                                    </tr>
                                ) : filteredHolidays.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="py-10 text-center text-gray-400 font-medium">
                                            No holidays found. Click "Create Holiday" to add a new holiday.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredHolidays.map((h) => {
                                        const typeLabel = displayType(h.type);
                                        const dateStr = h.date ? new Date(h.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

                                        return (
                                            <tr key={h._id} className="hover:bg-[#F8FAFC] transition-colors">
                                                <td className="py-3.5 px-4 font-bold text-[#1E1E1E]">
                                                    {h.title}
                                                </td>

                                                <td className="py-3.5 px-4 font-mono font-bold text-gray-800">
                                                    {dateStr}
                                                </td>

                                                <td className="py-3.5 px-4 text-gray-600 font-medium">
                                                    {h.day || "—"}
                                                </td>

                                                <td className="py-3.5 px-4">
                                                    <span className={`text-[10.5px] font-bold px-2.5 py-0.5 rounded-md border ${typeBadgeColors[typeLabel] || "bg-gray-100 text-gray-700 border-gray-200"}`}>
                                                        {typeLabel}
                                                    </span>
                                                </td>

                                                <td className="py-3.5 px-4 text-gray-500 font-medium max-w-xs truncate">
                                                    {h.description || "—"}
                                                </td>

                                                <td className="py-3.5 px-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setViewHolidayModal(h)}
                                                            className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors cursor-pointer border border-[#E5E7EB]"
                                                            title="View Holiday"
                                                        >
                                                            <Eye className="w-3.5 h-3.5" />
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setHolidayForm({
                                                                    title: h.title,
                                                                    date: h.date ? h.date.split("T")[0] : "",
                                                                    day: h.day || "",
                                                                    type: h.type || "public_holiday",
                                                                    description: h.description || ""
                                                                });
                                                                setEditHolidayModal(h);
                                                            }}
                                                            className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#2D79C7] transition-colors cursor-pointer border border-blue-100"
                                                            title="Edit Holiday"
                                                        >
                                                            <Edit3 className="w-3.5 h-3.5" />
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => setDeleteHolidayTarget(h)}
                                                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer border border-rose-100"
                                                            title="Delete Holiday"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
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
            )}

            {/* ─────────────────────────────────────────────
               MODALS FOR SHIFTS & HOLIDAYS
            ───────────────────────────────────────────── */}

            {/* CREATE / EDIT SHIFT MODAL */}
            {(createShiftOpen || editShiftOpen) && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 select-none animate-fadeIn">
                    <div className="bg-white border border-[#E5E7EB] rounded-[20px] shadow-xl w-full max-w-lg overflow-hidden">
                        <div className="bg-[#2D79C7] px-6 py-4 text-white flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Clock className="w-5 h-5" />
                                <h3 className="text-base font-bold">{createShiftOpen ? "Create New Shift" : "Edit Shift Details"}</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => { setCreateShiftOpen(false); setEditShiftOpen(false); }}
                                className="text-white/80 hover:text-white font-bold text-base cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={createShiftOpen ? handleCreateShiftSubmit : handleEditShiftSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-gray-600 text-xs font-bold">Shift Name *</label>
                                    <input
                                        type="text"
                                        required
                                        value={shiftForm.name}
                                        onChange={(e) => setShiftForm(prev => ({ ...prev, name: e.target.value }))}
                                        placeholder="e.g. General Day Shift"
                                        className="w-full bg-[#F8FAFC] border border-[#E5E7EB] text-gray-700 text-xs p-2.5 rounded-xl focus:outline-none focus:border-[#2D79C7]"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-gray-600 text-xs font-bold">Shift Code *</label>
                                    <input
                                        type="text"
                                        required
                                        value={shiftForm.code}
                                        onChange={(e) => setShiftForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                                        placeholder="e.g. GEN-01"
                                        className="w-full bg-[#F8FAFC] border border-[#E5E7EB] text-gray-700 text-xs p-2.5 rounded-xl focus:outline-none focus:border-[#2D79C7]"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div className="space-y-1">
                                    <label className="text-gray-600 text-xs font-bold">Start Time *</label>
                                    <input
                                        type="text"
                                        required
                                        value={shiftForm.startTime}
                                        onChange={(e) => setShiftForm(prev => ({ ...prev, startTime: e.target.value }))}
                                        placeholder="09:30 AM"
                                        className="w-full bg-[#F8FAFC] border border-[#E5E7EB] text-gray-700 text-xs p-2.5 rounded-xl focus:outline-none focus:border-[#2D79C7]"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-gray-600 text-xs font-bold">End Time *</label>
                                    <input
                                        type="text"
                                        required
                                        value={shiftForm.endTime}
                                        onChange={(e) => setShiftForm(prev => ({ ...prev, endTime: e.target.value }))}
                                        placeholder="06:30 PM"
                                        className="w-full bg-[#F8FAFC] border border-[#E5E7EB] text-gray-700 text-xs p-2.5 rounded-xl focus:outline-none focus:border-[#2D79C7]"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-gray-600 text-xs font-bold">Break (mins)</label>
                                    <input
                                        type="number"
                                        value={shiftForm.breakMinutes}
                                        onChange={(e) => setShiftForm(prev => ({ ...prev, breakMinutes: Number(e.target.value) }))}
                                        placeholder="45"
                                        className="w-full bg-[#F8FAFC] border border-[#E5E7EB] text-gray-700 text-xs p-2.5 rounded-xl focus:outline-none focus:border-[#2D79C7]"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-gray-600 text-xs font-bold block">Working Days</label>
                                <div className="flex flex-wrap gap-2">
                                    {DAY_OPTIONS.map((d) => {
                                        const checked = shiftForm.workingDays.includes(d);
                                        return (
                                            <button
                                                key={d}
                                                type="button"
                                                onClick={() => {
                                                    setShiftForm(prev => {
                                                        const exists = prev.workingDays.includes(d);
                                                        return {
                                                            ...prev,
                                                            workingDays: exists
                                                                ? prev.workingDays.filter(day => day !== d)
                                                                : [...prev.workingDays, d]
                                                        };
                                                    });
                                                }}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                                                    checked
                                                        ? "bg-[#2D79C7] text-white border-[#2D79C7]"
                                                        : "bg-[#F8FAFC] text-gray-600 border-[#E5E7EB]"
                                                }`}
                                            >
                                                {d}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-gray-600 text-xs font-bold">Shift Description</label>
                                <textarea
                                    rows="2"
                                    value={shiftForm.description}
                                    onChange={(e) => setShiftForm(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="Enter details about this shift schedule..."
                                    className="w-full bg-[#F8FAFC] border border-[#E5E7EB] text-gray-700 text-xs p-3 rounded-xl focus:outline-none focus:border-[#2D79C7] resize-none"
                                />
                            </div>

                            <div className="flex gap-3 justify-end pt-2">
                                <button
                                    type="button"
                                    onClick={() => { setCreateShiftOpen(false); setEditShiftOpen(false); }}
                                    className="bg-white border border-[#E5E7EB] text-gray-700 text-xs font-bold py-2 px-4 rounded-xl cursor-pointer hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="bg-[#2D79C7] hover:bg-[#1F5EA8] text-white text-xs font-bold py-2 px-5 rounded-xl shadow-sm transition-all cursor-pointer"
                                >
                                    {createShiftOpen ? "Create Shift" : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ASSIGN EMPLOYEES MODAL */}
            {assignModalOpen && selectedShift && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 select-none animate-fadeIn">
                    <div className="bg-white border border-[#E5E7EB] rounded-[20px] shadow-xl w-full max-w-lg overflow-hidden">
                        <div className="bg-[#2D79C7] px-6 py-4 text-white flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <UserPlus className="w-5 h-5" />
                                <h3 className="text-base font-bold">Assign Staff to {selectedShift.name}</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setAssignModalOpen(false)}
                                className="text-white/80 hover:text-white font-bold text-base cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <p className="text-xs text-gray-500 font-medium">
                                Select active employees to assign to shift <strong className="text-gray-800">{selectedShift.code}</strong>:
                            </p>

                            {/* Employee Search */}
                            <div className="relative">
                                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                                <input
                                    type="text"
                                    value={assignSearch}
                                    onChange={(e) => setAssignSearch(e.target.value)}
                                    placeholder="Search employee by name, ID or department..."
                                    className="w-full pl-9 pr-3 py-2 bg-[#F8FAFC] border border-[#E5E7EB] rounded-xl text-xs font-medium text-gray-700 focus:outline-none focus:border-[#2D79C7]"
                                />
                            </div>

                            <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                                {filteredAssignEmployees.length === 0 ? (
                                    <p className="text-xs text-gray-400 text-center py-6">No matching employees found.</p>
                                ) : (
                                    filteredAssignEmployees.map((emp) => {
                                        const empName = emp.name || emp.fullName || `${emp.firstName || ""} ${emp.lastName || ""}`.trim() || "Employee";
                                        const empMongoId = emp._id || emp.mongoId;
                                        const isChecked = selectedEmployeeIds.some(id => String(id) === String(empMongoId) || String(id) === String(emp.id));

                                        return (
                                            <div
                                                key={emp._id || emp.id}
                                                onClick={() => {
                                                    setSelectedEmployeeIds(prev => {
                                                        const exists = prev.some(id => String(id) === String(empMongoId) || String(id) === String(emp.id));
                                                        return exists
                                                            ? prev.filter(id => String(id) !== String(empMongoId) && String(id) !== String(emp.id))
                                                            : [...prev, empMongoId];
                                                    });
                                                }}
                                                className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                                                    isChecked ? "border-[#2D79C7] bg-blue-50/60 font-bold shadow-sm" : "border-[#E5E7EB] hover:bg-gray-50"
                                                }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Avatar name={empName} size="w-8 h-8" textSize="text-xs" />
                                                    <div>
                                                        <span className="text-[#1E1E1E] text-xs font-bold block">{empName}</span>
                                                        <span className="text-gray-400 text-[10.5px] font-medium">{emp.dept || emp.department || "Staff"}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[#2D79C7] font-mono text-[10.5px] font-bold">
                                                        {emp.employeeId || emp.id || "EMP"}
                                                    </span>
                                                    {isChecked ? (
                                                        <CheckCircle2 className="w-5 h-5 text-[#2D79C7] fill-blue-50" />
                                                    ) : (
                                                        <div className="w-5 h-5 rounded-full border border-gray-300 bg-white" />
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-[#E5E7EB]">
                                <span className="text-xs text-gray-500 font-semibold">
                                    Selected: <strong>{selectedEmployeeIds.length}</strong> employees
                                </span>
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setAssignModalOpen(false)}
                                        className="bg-white border border-[#E5E7EB] text-gray-700 text-xs font-bold py-2 px-4 rounded-xl cursor-pointer hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleAssignEmployeesSubmit}
                                        className="bg-[#2D79C7] hover:bg-[#1F5EA8] text-white text-xs font-bold py-2 px-5 rounded-xl shadow-sm transition-all cursor-pointer"
                                    >
                                        Save Assignment
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* CREATE / EDIT HOLIDAY MODAL */}
            {(createHolidayOpen || editHolidayModal) && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 select-none animate-fadeIn">
                    <div className="bg-white border border-[#E5E7EB] rounded-[20px] shadow-xl w-full max-w-md overflow-hidden">
                        <div className="bg-[#2D79C7] px-6 py-4 text-white flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <CalendarDays className="w-5 h-5" />
                                <h3 className="text-base font-bold">{createHolidayOpen ? "Create Holiday" : "Edit Holiday"}</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => { setCreateHolidayOpen(false); setEditHolidayModal(null); }}
                                className="text-white/80 hover:text-white font-bold text-base cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={createHolidayOpen ? handleCreateHolidaySubmit : handleEditHolidaySubmit} className="p-6 space-y-4">
                            <div className="space-y-1">
                                <label className="text-gray-600 text-xs font-bold">Holiday Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={holidayForm.title}
                                    onChange={(e) => setHolidayForm(prev => ({ ...prev, title: e.target.value }))}
                                    placeholder="e.g. Independence Day"
                                    className="w-full bg-[#F8FAFC] border border-[#E5E7EB] text-gray-700 text-xs p-2.5 rounded-xl focus:outline-none focus:border-[#2D79C7]"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-gray-600 text-xs font-bold">Date *</label>
                                    <input
                                        type="date"
                                        required
                                        value={holidayForm.date}
                                        onChange={(e) => setHolidayForm(prev => ({ ...prev, date: e.target.value }))}
                                        className="w-full bg-[#F8FAFC] border border-[#E5E7EB] text-gray-700 text-xs p-2.5 rounded-xl focus:outline-none focus:border-[#2D79C7]"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-gray-600 text-xs font-bold">Day of Week</label>
                                    <input
                                        type="text"
                                        readOnly
                                        value={holidayForm.day}
                                        placeholder="Auto calculated"
                                        className="w-full bg-[#F8FAFC] border border-[#E5E7EB] text-gray-500 text-xs p-2.5 rounded-xl cursor-not-allowed"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-gray-600 text-xs font-bold">Holiday Type</label>
                                <select
                                    value={holidayForm.type}
                                    onChange={(e) => setHolidayForm(prev => ({ ...prev, type: e.target.value }))}
                                    className="w-full bg-[#F8FAFC] border border-[#E5E7EB] text-gray-700 text-xs p-2.5 rounded-xl focus:outline-none focus:border-[#2D79C7] cursor-pointer"
                                >
                                    <option value="public_holiday">Public Holiday</option>
                                    <option value="company_holiday">Company Holiday</option>
                                    <option value="optional_holiday">Optional Holiday</option>
                                </select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-gray-600 text-xs font-bold">Description</label>
                                <textarea
                                    rows="2"
                                    value={holidayForm.description}
                                    onChange={(e) => setHolidayForm(prev => ({ ...prev, description: e.target.value }))}
                                    placeholder="Enter holiday notes or observe criteria..."
                                    className="w-full bg-[#F8FAFC] border border-[#E5E7EB] text-gray-700 text-xs p-3 rounded-xl focus:outline-none focus:border-[#2D79C7] resize-none"
                                />
                            </div>

                            <div className="flex gap-3 justify-end pt-2">
                                <button
                                    type="button"
                                    onClick={() => { setCreateHolidayOpen(false); setEditHolidayModal(null); }}
                                    className="bg-white border border-[#E5E7EB] text-gray-700 text-xs font-bold py-2 px-4 rounded-xl cursor-pointer hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="bg-[#2D79C7] hover:bg-[#1F5EA8] text-white text-xs font-bold py-2 px-5 rounded-xl shadow-sm transition-all cursor-pointer"
                                >
                                    {createHolidayOpen ? "Create Holiday" : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* VIEW HOLIDAY DETAILS MODAL */}
            {viewHolidayModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 select-none animate-fadeIn">
                    <div className="bg-white border border-[#E5E7EB] rounded-[20px] shadow-xl w-full max-w-md overflow-hidden">
                        <div className="bg-[#2D79C7] px-6 py-4 text-white flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <CalendarDays className="w-5 h-5" />
                                <h3 className="text-base font-bold">Holiday Details</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setViewHolidayModal(null)}
                                className="text-white/80 hover:text-white font-bold text-base cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <h2 className="text-[#1E1E1E] text-base font-extrabold">{viewHolidayModal.title}</h2>
                                <span className={`text-[10.5px] font-bold px-2.5 py-0.5 rounded-md border inline-block mt-2 ${typeBadgeColors[displayType(viewHolidayModal.type)] || "bg-gray-100 text-gray-700 border-gray-200"}`}>
                                    {displayType(viewHolidayModal.type)}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-3 bg-[#F8FAFC] p-4 rounded-xl border border-[#E5E7EB]">
                                <div>
                                    <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider block">Date</span>
                                    <span className="text-gray-800 text-xs font-mono font-bold">
                                        {viewHolidayModal.date ? new Date(viewHolidayModal.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider block">Day</span>
                                    <span className="text-gray-800 text-xs font-bold">
                                        {viewHolidayModal.day || "—"}
                                    </span>
                                </div>
                            </div>

                            {viewHolidayModal.description && (
                                <div className="space-y-1">
                                    <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider block">Description</span>
                                    <p className="text-gray-600 text-xs font-medium bg-[#F8FAFC] p-3 rounded-xl border border-[#E5E7EB]">
                                        {viewHolidayModal.description}
                                    </p>
                                </div>
                            )}

                            <div className="flex justify-end pt-2">
                                <button
                                    type="button"
                                    onClick={() => setViewHolidayModal(null)}
                                    className="bg-[#2D79C7] hover:bg-[#1F5EA8] text-white text-xs font-bold py-2 px-5 rounded-xl cursor-pointer"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Shift Confirm Dialog */}
            <ConfirmDialog
                isOpen={!!deleteShiftTarget}
                title="Delete Shift Schedule"
                message={`Are you sure you want to delete "${deleteShiftTarget?.name}"? Employees currently assigned to this shift will need to be re-assigned.`}
                confirmLabel="Delete Shift"
                cancelLabel="Cancel"
                variant="danger"
                onConfirm={confirmDeleteShift}
                onCancel={() => setDeleteShiftTarget(null)}
            />

            {/* Delete Holiday Confirm Dialog */}
            <ConfirmDialog
                isOpen={!!deleteHolidayTarget}
                title="Delete Holiday"
                message={`Are you sure you want to remove "${deleteHolidayTarget?.title}" from the official holiday list?`}
                confirmLabel="Delete Holiday"
                cancelLabel="Cancel"
                variant="danger"
                onConfirm={confirmDeleteHoliday}
                onCancel={() => setDeleteHolidayTarget(null)}
            />

        </div>
    );
};

export default ShiftSchedule;
