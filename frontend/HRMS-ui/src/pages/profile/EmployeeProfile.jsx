import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    User, Mail, Phone, MapPin, Calendar, Briefcase, Building2,
    Shield, Clock, Edit3, X, Check, Eye, Download, Upload,
    Laptop, Mouse, ShieldCheck, Award, FileText,
    Heart, GraduationCap, PhoneCall, History, Loader2, Camera,
    Plus, Trash2, PlusCircle, UserCheck, Lock, ArrowUpRight,
    Monitor, Keyboard as KeyboardIcon, Mouse as MouseIcon, Smartphone, Tablet as TabletIcon, Cpu, Zap,
    Umbrella, CheckCircle2, AlertCircle, SlidersHorizontal, Sparkles, Hourglass, RotateCcw, FileSpreadsheet,
    ChevronLeft, ChevronRight, CheckCircle, XCircle, LogOut, CreditCard, ExternalLink, Headphones, Send
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { Avatar, SkeletonLoader } from "../../components/SharedComponents";
import ConfirmDialog from "../../components/ConfirmDialog";
import { ResignJobModal, AdminInitiateExitModal } from "../../components/ExitModals";
import { isManagementUser } from "../../utils/roleUtils";
import { getEmployeeById, updateEmployee, inviteEmployee } from "../../services/employee.service";
import { uploadProfilePicture, uploadDocumentFile } from "../../services/auth.service";
import { getAllAssets, getAssignedAssets, acknowledgeAsset, requestNewAsset } from "../../services/asset.service";
import { getLeaveSummary, getLeaveHistory, updateEmployeeLeaveBalance } from "../../services/dashboard.service";
import { getEmployeeAttendanceHistory, getTodayAttendanceStatus, importEmployeeAttendance } from "../../services/attendance.service";
import { TeamMemberAttendanceHistory } from "../my-team/MyTeam";
import * as XLSX from "xlsx";


/* ─────────────────────────────────────────────
   HELPERS & DEFAULT SEEDS
───────────────────────────────────────────── */
const formatDateStr = (d) => {
    if (!d) return "—";
    try {
        const dateObj = new Date(d);
        if (isNaN(dateObj.getTime())) return String(d);
        return dateObj.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    } catch {
        return String(d);
    }
};

const safeDateToInput = (d) => {
    if (!d) return "";
    try {
        const dateObj = new Date(d);
        if (isNaN(dateObj.getTime())) return "";
        return dateObj.toISOString().split("T")[0];
    } catch {
        return "";
    }
};

const DEFAULT_EDUCATION = [
    { degree: "Master of Business Administration (MBA)", institution: "Delhi University", fieldOfStudy: "HR & Strategy", passingYear: "2021", level: "Post Graduate" },
    { degree: "Bachelor of Technology (B.Tech)", institution: "Amity University", fieldOfStudy: "Computer Science", passingYear: "2019", level: "Under Graduate" }
];

const DEFAULT_EXPERIENCE = [
    { title: "Senior HR Manager", company: "Idea Fueled HRMS", period: "2024 - Present", description: "Leading talent operations, HRIS management, and workforce strategy." },
    { title: "HR Specialist", company: "Idea Fueled HRMS", period: "2023 - 2024", description: "Managed employee onboarding, payroll compliance, and performance reviews." }
];

const DEFAULT_DOCUMENTS = [
    { name: "PAN Card Copy", category: "Government ID", numberOrTag: "ABCDE1234F", url: "", uploadedAt: "2023-01-16", status: "Verified" },
    { name: "Aadhaar Card", category: "National Identification", numberOrTag: "XXXX-XXXX-9012", url: "", uploadedAt: "2023-01-16", status: "Verified" },
    { name: "Employment Offer Letter", category: "Agreement", numberOrTag: "IF-OFFER-2023", url: "", uploadedAt: "2023-01-15", status: "Signed" },
    { name: "Curriculum Vitae / Resume", category: "Resume", numberOrTag: "PDF 1.4 MB", url: "", uploadedAt: "2023-01-15", status: "Active" }
];

const DEFAULT_ASSETS = [
    { name: "Apple MacBook Pro 16\"", assetTag: "IF-LAP-2024", category: "Hardware Workstation", issuedDate: "2023-01-15", condition: "Excellent", status: "Active" },
    { name: "Dell UltraSharp 27\" 4K Monitor", assetTag: "IF-MON-2023", category: "Display Monitor", issuedDate: "2023-01-15", condition: "Good", status: "Active" },
    { name: "Logitech MX Master 3S Mouse", assetTag: "IF-PER-88", category: "Peripherals", issuedDate: "2023-01-15", condition: "Excellent", status: "Active" },
    { name: "Idea Fueled Smart Access Pass", assetTag: "IF-SEC-01", category: "Security Badge", issuedDate: "2023-01-15", condition: "Active", status: "Active" }
];

export const EmployeeProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user: currentUser, updateUser } = useAuth();

    const [employee, setEmployee] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("Personal");
    const [invitingEmployee, setInvitingEmployee] = useState(false);

    const handleInviteClick = async () => {
        if (!employee?._id) return;
        try {
            setInvitingEmployee(true);
            const res = await inviteEmployee(employee._id);
            if (res.data?.success) {
                if (res.data?.emailDelivered === false) {
                    toast.error(res.data?.message || "Email delivery failed due to SMTP error.", { duration: 6000 });
                    if (res.data?.setPasswordUrl && navigator?.clipboard) {
                        navigator.clipboard.writeText(res.data.setPasswordUrl).then(() => {
                            toast.info("Password setup link copied to clipboard!", { duration: 5000 });
                        }).catch(() => {});
                    }
                } else {
                    toast.success(`Welcome invitation sent to ${employee.email || "employee"}!`);
                }
                setEmployee(prev => ({ ...prev, invitationSent: true, invitationSentAt: new Date() }));
            } else {
                toast.error(res.data?.message || "Failed to send invitation.");
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to send invitation email.");
        } finally {
            setInvitingEmployee(false);
        }
    };

    // Drawer state for Edit Profile
    const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploadingPic, setUploadingPic] = useState(false);
    
    // Modals for adding items dynamically
    const [docModalFile, setDocModalFile] = useState(null);
    const [docFile, setDocFile] = useState(null);
    const [showAddSkillInput, setShowAddSkillInput] = useState(false);
    const [newSkillText, setNewSkillText] = useState("");
    const [showAddInterestInput, setShowAddInterestInput] = useState(false);
    const [newInterestText, setNewInterestText] = useState("");

    const [showEduModal, setShowEduModal] = useState(false);
    const [newEdu, setNewEdu] = useState({ degree: "", institution: "", fieldOfStudy: "", passingYear: "", level: "Post Graduate" });
    const [editingEduIdx, setEditingEduIdx] = useState(null);
    
    const [showExpModal, setShowExpModal] = useState(false);
    const [newExp, setNewExp] = useState({ title: "", company: "", period: "", description: "" });

    const [showDocModal, setShowDocModal] = useState(false);
    const [newDoc, setNewDoc] = useState({ name: "", category: "Government ID", numberOrTag: "", url: "" });

    // Dedicated Government ID Modal States (Aadhaar & PAN)
    const [govDocModal, setGovDocModal] = useState({ isOpen: false, type: "aadhaar" }); // "aadhaar" | "pan"
    const [govDocNumber, setGovDocNumber] = useState("");
    const [govDocFile, setGovDocFile] = useState(null);
    const [savingGovDoc, setSavingGovDoc] = useState(false);

    const [showAssetModal, setShowAssetModal] = useState(false);
    const [newAsset, setNewAsset] = useState({ name: "", assetTag: "", category: "Hardware Workstation", condition: "Excellent" });

    // Request New Asset Modal state (for employees other than global admin)
    const [showRequestAssetModal, setShowRequestAssetModal] = useState(false);
    const [requestAssetType, setRequestAssetType] = useState("Monitor");
    const [requestAssetComment, setRequestAssetComment] = useState("");
    const [submittingAssetRequest, setSubmittingAssetRequest] = useState(false);
    const [acknowledgingId, setAcknowledgingId] = useState(null);

    // Check for email acknowledge redirection in URL query params
    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search);
        if (searchParams.get("acknowledged") === "true") {
            const assetCode = searchParams.get("assetId") || "";
            toast.success(`Asset ${assetCode ? `"${assetCode}" ` : ""}receipt acknowledged successfully! Confirmation sent to Management.`);
            const cleanPath = window.location.pathname + (searchParams.get("tab") ? `?tab=${searchParams.get("tab")}` : "");
            window.history.replaceState({}, document.title, cleanPath);
        }
    }, []);

    // Confirm dialog state for deletions
    const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, title: "", message: "", action: null });

    // Attendance State for this specific employee
    const [attendanceLogs, setAttendanceLogs] = useState([]);
    const [loadingAttendance, setLoadingAttendance] = useState(false);
    const [attendanceMonth, setAttendanceMonth] = useState(new Date().getMonth());
    const [attendanceYear, setAttendanceYear] = useState(new Date().getFullYear());
    const [todayAttendanceRec, setTodayAttendanceRec] = useState(null);

    // Import Attendance Excel State (Global Admin)
    const [showImportAttendanceModal, setShowImportAttendanceModal] = useState(false);
    const [importAttendanceFile, setImportAttendanceFile] = useState(null);
    const [importParsedRecords, setImportParsedRecords] = useState([]);
    const [importingAttendance, setImportingAttendance] = useState(false);
    const [importAttendanceError, setImportAttendanceError] = useState("");

    // Leaves State for this specific employee
    const [leaveSummaryData, setLeaveSummaryData] = useState(null);
    const [leaveHistoryList, setLeaveHistoryList] = useState([]);
    const [loadingLeaves, setLoadingLeaves] = useState(false);
    const [showEditLeaveModal, setShowEditLeaveModal] = useState(false);
    const [savingLeaveBalance, setSavingLeaveBalance] = useState(false);
    const [editLeaveForm, setEditLeaveForm] = useState({
        casual: 6,
        sick: 6,
        earned: 12,
        compOff: 0
    });

    // Edit form fields
    const [editForm, setEditForm] = useState({
        phoneNumber: "",
        aboutMe: "",
        skills: "",
        interests: "",
        dateOfBirth: "",
        gender: "Male",
        bloodGroup: "O+",
        fatherName: "",
        emergencyContactName: "",
        emergencyContactRelation: "",
        emergencyContactNumber: "",
        presentAddress: "",
        permanentAddress: "",
        profilePicture: ""
    });

    // Resign and Exit Modal States
    const [isResignModalOpen, setIsResignModalOpen] = useState(false);
    const [isAdminExitModalOpen, setIsAdminExitModalOpen] = useState(false);

    // Check if logged-in user is viewing their OWN profile
    const isOwnProfile = useMemo(() => {
        if (!id || id === "me") return true;
        const currentUserId = (currentUser?._id || currentUser?.id || "").toString();
        const currentEmpCode = (currentUser?.employeeId || "").toString().toLowerCase();
        const currentUserEmail = (currentUser?.email || "").toString().toLowerCase();

        const targetId = (id || "").toString();
        const empMongoId = (employee?._id || employee?.id || "").toString();
        const empCode = (employee?.employeeId || "").toString().toLowerCase();
        const empEmail = (employee?.email || "").toString().toLowerCase();

        if (currentUserId && (targetId === currentUserId || empMongoId === currentUserId)) return true;
        if (currentEmpCode && (targetId.toLowerCase() === currentEmpCode || empCode === currentEmpCode)) return true;
        if (currentUserEmail && empEmail && currentUserEmail === empEmail) return true;
        return false;
    }, [id, currentUser, employee]);

    const userRole = (currentUser?.role || "employee").toLowerCase();

    // Check employee visibility assignment
    const isReportingManager = useMemo(() => {
        if (!currentUser || !employee) return false;
        const currentUserId = (currentUser._id || currentUser.id || "").toString();
        const currentEmpId = (currentUser.employeeId || "").toString().toLowerCase();
        const currentUserName = (currentUser.fullName || `${currentUser.firstName || ""} ${currentUser.lastName || ""}`).trim().toLowerCase();

        const empMgrId = (
            employee.managerId && typeof employee.managerId === "object"
                ? (employee.managerId._id || "")
                : (employee.managerId || "")
        ).toString();

        const empDottedMgrId = (
            employee.dottedManagerId && typeof employee.dottedManagerId === "object"
                ? (employee.dottedManagerId._id || "")
                : (employee.dottedManagerId || "")
        ).toString();

        const empMgrName = (
            employee.managerId && typeof employee.managerId === "object"
                ? (employee.managerId.fullName || "")
                : (employee.manager || "")
        ).toString().trim().toLowerCase();

        return (
            (empMgrId && (empMgrId === currentUserId || empMgrId.toLowerCase() === currentEmpId)) ||
            (empDottedMgrId && (empDottedMgrId === currentUserId || empDottedMgrId.toLowerCase() === currentEmpId)) ||
            (empMgrName && currentUserName && (empMgrName === currentUserName || currentUserName.includes(empMgrName) || empMgrName.includes(currentUserName)))
        );
    }, [currentUser, employee]);

    const isAssigned = useMemo(() => {
        // 1. Global Admin always has full access
        if (userRole === "global_admin" || userRole === "admin") return true;

        // 2. Own Profile -> full access
        if (isOwnProfile) return true;

        // 3. Manager viewing their team member
        if ((userRole === "manager" || userRole === "management") && isReportingManager) return true;

        // 4. For HR user:
        if (userRole === "hr") {
            const list = currentUser?.visibleEmployees;
            // If HR has no specific visibleEmployees list configured -> Unrestricted access
            if (!list || !Array.isArray(list) || list.length === 0) return true;

            const targetMongoId = (employee?._id || id || "").toString();
            const targetEmpCode = (employee?.employeeId || "").toString();

            return list.some(v => {
                if (!v) return false;
                const vId = (typeof v === "object" && v !== null && v?._id) ? v._id.toString() : (v?.toString() || "");
                return vId && (vId === targetMongoId || vId === targetEmpCode);
            });
        }

        // Regular employees viewing other profiles get public view only
        return false;
    }, [currentUser, employee, id, isOwnProfile, userRole, isReportingManager]);

    const canEdit = isOwnProfile || ((userRole === "global_admin" || userRole === "admin" || userRole === "hr") && isAssigned);
    const canDelete = (userRole === "global_admin" || userRole === "admin" || (userRole === "hr" && isAssigned));
    const canViewConfidential = isOwnProfile || userRole === "global_admin" || userRole === "admin" || (userRole === "hr" && isAssigned) || isReportingManager;
    const canViewAttendanceAndLeaves = isOwnProfile || userRole === "global_admin" || userRole === "admin" || (userRole === "hr" && isAssigned) || isReportingManager;
    const canEditLeaves = userRole === "global_admin" || userRole === "admin" || (userRole === "hr" && isAssigned) || isReportingManager;
    const canViewProfileCompletion = isOwnProfile || userRole === "global_admin" || userRole === "admin" || (userRole === "hr" && isAssigned) || isReportingManager;


    // Fetch employee data from MongoDB
    const fetchProfile = useCallback(async () => {
        setLoading(true);
        try {
            const targetId = (!id || id === "me") ? (currentUser?._id || currentUser?.id) : id;
            if (!targetId) {
                setEmployee(currentUser);
                setLoading(false);
                return;
            }

            const res = await getEmployeeById(targetId);
            if (res.data?.success && res.data.employee) {
                setEmployee(res.data.employee);
            } else {
                setEmployee(currentUser);
            }
        } catch (err) {
            console.error("Fetch profile failed:", err);
            if (!id || id === "me" || (currentUser && id === currentUser._id)) {
                setEmployee(currentUser);
            } else {
                toast.error("Failed to load employee profile.");
            }
        } finally {
            setLoading(false);
        }
    }, [id, currentUser]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    // Attendance Data Fetching for this specific employee
    const fetchEmployeeAttendance = useCallback(async () => {
        const empId = employee?._id || id;
        if (!empId) return;
        setLoadingAttendance(true);
        try {
            const res = await getEmployeeAttendanceHistory(empId, { month: attendanceMonth, year: attendanceYear });
            if (res.data?.success && Array.isArray(res.data.attendances)) {
                setAttendanceLogs(res.data.attendances);
            } else {
                setAttendanceLogs([]);
            }
        } catch (err) {
            console.error("Fetch employee attendance history error:", err);
            setAttendanceLogs([]);
        } finally {
            setLoadingAttendance(false);
        }
    }, [employee, id, attendanceMonth, attendanceYear]);

    const fetchTodayAttendance = useCallback(async () => {
        const empId = employee?._id || id;
        if (!empId) return;
        try {
            const res = await getTodayAttendanceStatus(empId);
            if (res.data?.success && res.data.attendance) {
                setTodayAttendanceRec(res.data.attendance);
            } else {
                setTodayAttendanceRec(null);
            }
        } catch (err) {
            console.error("Fetch today attendance error:", err);
        }
    }, [employee, id]);

    // Handler to download sample Excel template for Attendance Import
    const handleDownloadAttendanceTemplate = () => {
        try {
            const sampleRows = [
                {
                    "Date": "2026-10-01",
                    "Status": "Present",
                    "Clock In": "09:30 AM",
                    "Clock Out": "06:30 PM",
                    "Work Mode": "Office",
                    "Remarks": "Standard workday"
                },
                {
                    "Date": "2026-10-02",
                    "Status": "Present",
                    "Clock In": "10:00 AM",
                    "Clock Out": "07:00 PM",
                    "Work Mode": "Work From Home",
                    "Remarks": "Remote work day"
                },
                {
                    "Date": "2026-10-03",
                    "Status": "Half Day",
                    "Clock In": "09:30 AM",
                    "Clock Out": "01:30 PM",
                    "Work Mode": "Office",
                    "Remarks": "First half only"
                },
                {
                    "Date": "2026-10-04",
                    "Status": "Week Off",
                    "Clock In": "",
                    "Clock Out": "",
                    "Work Mode": "Office",
                    "Remarks": "Weekend"
                },
                {
                    "Date": "2026-10-05",
                    "Status": "Holiday",
                    "Clock In": "",
                    "Clock Out": "",
                    "Work Mode": "Office",
                    "Remarks": "Public Holiday"
                }
            ];

            const ws = XLSX.utils.json_to_sheet(sampleRows);
            ws["!cols"] = [
                { wch: 15 },
                { wch: 14 },
                { wch: 14 },
                { wch: 14 },
                { wch: 18 },
                { wch: 25 }
            ];
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Attendance_Template");
            const safeName = (employee?.fullName || employee?.firstName || "Employee").replace(/[^a-zA-Z0-9_-]/g, "_");
            XLSX.writeFile(wb, `Attendance_Template_${safeName}.xlsx`);
            toast.success("Sample Excel template downloaded!");
        } catch (err) {
            console.error("Template download error:", err);
            toast.error("Failed to generate Excel template.");
        }
    };

    // Handler to parse uploaded Excel / CSV file
    const handleImportAttendanceFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImportAttendanceError("");
        setImportAttendanceFile(file);

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const data = new Uint8Array(evt.target.result);
                const workbook = XLSX.read(data, { type: "array", cellDates: true });
                const firstSheetName = workbook.SheetNames[0];
                if (!firstSheetName) {
                    setImportAttendanceError("The uploaded file does not contain any worksheets.");
                    setImportParsedRecords([]);
                    return;
                }

                const worksheet = workbook.Sheets[firstSheetName];
                const rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

                if (!rawRows || rawRows.length === 0) {
                    setImportAttendanceError("No rows found in the uploaded spreadsheet.");
                    setImportParsedRecords([]);
                    return;
                }

                const parsed = [];
                for (let i = 0; i < rawRows.length; i++) {
                    const row = rawRows[i];
                    const getValue = (patterns) => {
                        const keys = Object.keys(row);
                        for (const pat of patterns) {
                            const found = keys.find(k => pat.test(k.trim()));
                            if (found && row[found] !== undefined && row[found] !== "") {
                                return row[found];
                            }
                        }
                        return "";
                    };

                    const rawDate = getValue([/^date$/i, /attendance.*date/i, /^day$/i, /entry.*date/i]);
                    if (!rawDate) continue;

                    let formattedDate = "";
                    if (rawDate instanceof Date) {
                        if (!isNaN(rawDate.getTime())) {
                            formattedDate = rawDate.toISOString().split("T")[0];
                        }
                    } else if (typeof rawDate === "number") {
                        const utc_days = Math.floor(rawDate - 25569);
                        const d = new Date(utc_days * 86400 * 1000);
                        formattedDate = d.toISOString().split("T")[0];
                    } else {
                        const str = String(rawDate).trim();
                        const dmy = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
                        if (dmy) {
                            formattedDate = `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
                        } else {
                            const parsedD = new Date(str);
                            if (!isNaN(parsedD.getTime())) {
                                formattedDate = parsedD.toISOString().split("T")[0];
                            } else {
                                formattedDate = str;
                            }
                        }
                    }

                    const rawClockIn = getValue([/^clock.*in/i, /^punch.*in/i, /^in.*time/i, /^first.*in/i, /^check.*in/i, /^start.*time/i]);
                    const rawClockOut = getValue([/^clock.*out/i, /^punch.*out/i, /^out.*time/i, /^last.*out/i, /^check.*out/i, /^end.*time/i]);
                    const rawStatus = getValue([/^status$/i, /attendance.*status/i]);
                    const rawWorkMode = getValue([/^work.*mode/i, /^mode$/i]);
                    const rawRemarks = getValue([/remarks?/i, /notes?/i, /comments?/i, /reason/i]);

                    const formatTimeStr = (t) => {
                        if (!t && t !== 0) return "";
                        if (t instanceof Date) {
                            return t.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
                        }
                        if (typeof t === "number") {
                            let frac = t > 1 ? t - Math.floor(t) : t;
                            const totalM = Math.round(frac * 24 * 60);
                            const h = Math.floor(totalM / 60);
                            const m = totalM % 60;
                            const ampm = h >= 12 ? "PM" : "AM";
                            const h12 = h % 12 || 12;
                            return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;
                        }
                        return String(t).trim();
                    };

                    const clockInStr = formatTimeStr(rawClockIn);
                    const clockOutStr = formatTimeStr(rawClockOut);

                    let status = "Present";
                    if (rawStatus) {
                        const s = String(rawStatus).toLowerCase().trim();
                        if (s.includes("absent") || s === "a") status = "Absent";
                        else if (s.includes("half") || s === "hd") status = "Half Day";
                        else if (s.includes("off") || s.includes("week") || s === "wo") status = "Week Off";
                        else if (s.includes("holiday") || s === "h") status = "Holiday";
                        else status = "Present";
                    } else if (!clockInStr) {
                        status = "Absent";
                    }

                    let workMode = "Office";
                    if (rawWorkMode) {
                        const wm = String(rawWorkMode).toLowerCase().trim();
                        if (wm.includes("home") || wm.includes("wfh") || wm.includes("remote")) {
                            workMode = "Work From Home";
                        }
                    }

                    parsed.push({
                        date: formattedDate,
                        clockIn: clockInStr,
                        clockOut: clockOutStr,
                        status,
                        workMode,
                        remarks: rawRemarks ? String(rawRemarks).trim() : ""
                    });
                }

                if (parsed.length === 0) {
                    setImportAttendanceError("Could not detect any valid date rows. Please check column headers.");
                }

                setImportParsedRecords(parsed);
            } catch (err) {
                console.error("Excel parse error:", err);
                setImportAttendanceError("Failed to parse Excel file. Please ensure it is a valid format.");
                setImportParsedRecords([]);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    // Handler to submit attendance import to backend
    const handleImportAttendanceSubmit = async () => {
        const empId = employee?._id || id;
        if (!empId) {
            toast.error("Employee identifier not found.");
            return;
        }

        if (!importAttendanceFile && importParsedRecords.length === 0) {
            toast.error("Please upload an Excel or CSV file first.");
            return;
        }

        setImportingAttendance(true);
        try {
            const formData = new FormData();
            if (importAttendanceFile) {
                formData.append("file", importAttendanceFile);
            }
            if (importParsedRecords.length > 0) {
                formData.append("records", JSON.stringify(importParsedRecords));
            }

            const res = await importEmployeeAttendance(empId, formData);
            if (res.data?.success) {
                toast.success(res.data.message || `Successfully imported ${res.data.importedCount || importParsedRecords.length} records!`);
                setShowImportAttendanceModal(false);
                setImportAttendanceFile(null);
                setImportParsedRecords([]);

                // If imported records contain dates, automatically switch month view to match
                if (importParsedRecords.length > 0 && importParsedRecords[0].date) {
                    const parsedDate = new Date(importParsedRecords[0].date);
                    if (!isNaN(parsedDate.getTime())) {
                        setAttendanceMonth(parsedDate.getMonth());
                        setAttendanceYear(parsedDate.getFullYear());
                    }
                }

                fetchEmployeeAttendance();
                fetchTodayAttendance();
            } else {
                toast.error(res.data?.message || "Failed to import attendance.");
            }
        } catch (err) {
            console.error("Attendance import request error:", err);
            toast.error(err.response?.data?.message || "Failed to import attendance.");
        } finally {
            setImportingAttendance(false);
        }
    };

    // Leaves Data Fetching for this specific employee
    const fetchEmployeeLeaves = useCallback(async () => {
        const empId = employee?._id || id;
        if (!empId) return;
        setLoadingLeaves(true);
        try {
            const [summaryRes, historyRes] = await Promise.all([
                getLeaveSummary(empId).catch(() => ({ data: { success: false } })),
                getLeaveHistory(empId).catch(() => ({ data: { success: false } }))
            ]);

            if (summaryRes.data?.success && summaryRes.data.leaveSummary) {
                setLeaveSummaryData(summaryRes.data.leaveSummary);
                const bal = summaryRes.data.leaveSummary.leaveBalance || {};
                setEditLeaveForm({
                    casual: bal.casual?.total ?? 6,
                    sick: bal.sick?.total ?? 6,
                    earned: bal.earned?.total ?? 12,
                    compOff: bal.compOff?.total ?? 0
                });
            }
            if (historyRes.data?.success && Array.isArray(historyRes.data.leaves)) {
                setLeaveHistoryList(historyRes.data.leaves);
            } else {
                setLeaveHistoryList([]);
            }
        } catch (err) {
            console.error("Fetch employee leaves error:", err);
        } finally {
            setLoadingLeaves(false);
        }
    }, [employee, id]);

    useEffect(() => {
        if (activeTab === "Attendance" && employee) {
            fetchEmployeeAttendance();
            fetchTodayAttendance();
        } else if (activeTab === "Leaves" && employee) {
            fetchEmployeeLeaves();
        }
    }, [activeTab, employee, fetchEmployeeAttendance, fetchTodayAttendance, fetchEmployeeLeaves]);

    // Save Leave Balance adjustment (Admin / Assigned HR)
    const handleSaveLeaveBalance = async (e) => {
        e.preventDefault();
        const empId = employee?._id || id;
        if (!empId) return;
        setSavingLeaveBalance(true);
        try {
            const res = await updateEmployeeLeaveBalance(empId, editLeaveForm);
            if (res.data?.success) {
                toast.success("Leave balance updated successfully!");
                setShowEditLeaveModal(false);
                fetchEmployeeLeaves();
            } else {
                toast.error(res.data?.message || "Failed to update leave balance.");
            }
        } catch (err) {
            console.error("Update leave balance error:", err);
            toast.error("Error updating leave balance.");
        } finally {
            setSavingLeaveBalance(false);
        }
    };


    // Populate edit drawer form
    const openEditDrawer = () => {
        if (!employee) return;
        setEditForm({
            phoneNumber: employee.phoneNumber || "",
            aboutMe: (employee.aboutMe && !employee.aboutMe.includes("Experienced professional passionate") && !employee.aboutMe.includes("Dedicated team member")) ? employee.aboutMe : "",
            skills: Array.isArray(employee.skills) && employee.skills.length > 0 
                ? employee.skills.join(", ") 
                : "",
            interests: (() => {
                if (!Array.isArray(employee.interests) || employee.interests.length === 0) return "";
                const mockSet = new Set(["Photography", "Technology", "Reading", "Badminton", "Chess", "Open Source"]);
                if (employee.interests.every(it => mockSet.has(it)) && employee.interests.length >= 4) return "";
                return employee.interests.join(", ");
            })(),
            dateOfBirth: safeDateToInput(employee.dateOfBirth),
            gender: employee.gender || "Male",
            bloodGroup: employee.bloodGroup || "O+",
            fatherName: employee.fatherName || "",
            emergencyContactName: employee.emergencyContactName || "",
            emergencyContactRelation: employee.emergencyContactRelation || "",
            emergencyContactNumber: employee.emergencyContactNumber || employee.phoneNumber || "",
            presentAddress: employee.presentAddress || "",
            permanentAddress: employee.permanentAddress || "",
            profilePicture: employee.profilePicture || ""
        });
        setIsEditDrawerOpen(true);
    };

    // Profile picture upload from edit drawer
    const handleProfilePicUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            setUploadingPic(true);
            const formData = new FormData();
            formData.append("image", file);

            const res = await uploadProfilePicture(formData);
            const imgUrl = res.data?.url || res.data?.imageUrl;
            if (res.data?.success && imgUrl) {
                setEditForm(prev => ({ ...prev, profilePicture: imgUrl }));
                toast.success("Profile picture uploaded successfully!");
            } else {
                toast.error("Failed to upload image.");
            }
        } catch (err) {
            console.error("Profile picture upload error:", err);
            toast.error("Error uploading picture.");
        } finally {
            setUploadingPic(false);
        }
    };

    // Direct hero avatar photo upload handler
    const handleDirectHeroPicUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setUploadingPic(true);
            const formData = new FormData();
            formData.append("image", file);
            toast.loading("Uploading photo...", { id: "hero-photo" });

            const res = await uploadProfilePicture(formData);
            toast.dismiss("hero-photo");
            const imgUrl = res.data?.url || res.data?.imageUrl;
            if (res.data?.success && imgUrl) {
                const ok = await persistEmployeeUpdate({ profilePicture: imgUrl }, "Profile picture updated!");
                if (ok) {
                    setEmployee(prev => prev ? ({ ...prev, profilePicture: imgUrl }) : prev);
                    if (isOwnProfile && updateUser) {
                        updateUser({ profilePicture: imgUrl });
                    }
                }
            } else {
                toast.error("Failed to upload image.");
            }
        } catch (err) {
            console.error("Hero photo upload error:", err);
            toast.dismiss("hero-photo");
            toast.error("Error uploading picture.");
        } finally {
            setUploadingPic(false);
        }
    };

    // Helper to persist employee updates to MongoDB backend
    const persistEmployeeUpdate = async (payload, successMsg = "Profile updated!") => {
        if (!canEdit) {
            toast.error("You do not have permission to edit this profile.");
            return false;
        }

        try {
            setSaving(true);
            const empIdToUpdate = employee._id || currentUser._id;
            
            // Dynamically record real activity log if not already explicitly provided
            const existingActivities = Array.isArray(employee?.activities) ? employee.activities : [];
            const newActivityItem = {
                title: successMsg.replace("!", ""),
                description: `Activity recorded on ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}.`,
                timestamp: new Date(),
                type: "update"
            };
            const updatedPayload = {
                ...payload,
                activities: payload.activities || [newActivityItem, ...existingActivities].slice(0, 50)
            };

            const res = await updateEmployee(empIdToUpdate, updatedPayload);
            
            if (res.data?.success) {
                toast.success(successMsg);
                setEmployee(res.data.employee || { ...employee, ...updatedPayload });
                if (isOwnProfile && updateUser) {
                    updateUser(res.data.employee || { ...employee, ...updatedPayload });
                }
                return true;
            } else {
                toast.error(res.data?.message || "Update failed.");
                return false;
            }
        } catch (err) {
            console.error("Persist employee update error:", err);
            toast.error("Failed to save changes to database.");
            return false;
        } finally {
            setSaving(false);
        }
    };

    // Save Edit Drawer form
    const handleSaveProfile = async (e) => {
        e.preventDefault();
        const payload = {
            ...editForm,
            skills: typeof editForm.skills === "string" ? editForm.skills.split(",").map(s => s.trim()).filter(Boolean) : editForm.skills,
            interests: typeof editForm.interests === "string" ? editForm.interests.split(",").map(i => i.trim()).filter(Boolean) : editForm.interests
        };

        const ok = await persistEmployeeUpdate(payload, "Profile updated successfully!");
        if (ok) setIsEditDrawerOpen(false);
    };

    // DYNAMIC ADD/DELETE OPERATIONS

    // 1. Skill Operations
    const currentSkills = useMemo(() => {
        if (Array.isArray(employee?.skills) && employee.skills.length > 0) return employee.skills;
        return [];
    }, [employee]);

    const handleAddSkill = async () => {
        if (!newSkillText.trim()) return;
        const updated = [...currentSkills, newSkillText.trim()];
        const ok = await persistEmployeeUpdate({ skills: updated }, `Skill "${newSkillText.trim()}" added!`);
        if (ok) {
            setNewSkillText("");
            setShowAddSkillInput(false);
        }
    };

    const handleDeleteSkill = (skillToDelete) => {
        if (!canDelete) return;
        setConfirmDelete({
            isOpen: true,
            title: "Delete Skill",
            message: `Are you sure you want to delete the skill "${skillToDelete}"?`,
            action: async () => {
                const updated = currentSkills.filter(s => s !== skillToDelete);
                await persistEmployeeUpdate({ skills: updated }, `Skill "${skillToDelete}" removed!`);
            }
        });
    };

    // 2. Interest Operations
    const currentInterests = useMemo(() => {
        if (!Array.isArray(employee?.interests) || employee.interests.length === 0) return [];
        const mockSet = new Set(["Photography", "Technology", "Reading", "Badminton", "Chess", "Open Source"]);
        if (employee.interests.every(it => mockSet.has(it)) && employee.interests.length >= 4) return [];
        return employee.interests;
    }, [employee]);

    const handleAddInterest = async () => {
        if (!newInterestText.trim()) return;
        const updated = [...currentInterests, newInterestText.trim()];
        const ok = await persistEmployeeUpdate({ interests: updated }, `Interest "${newInterestText.trim()}" added!`);
        if (ok) {
            setNewInterestText("");
            setShowAddInterestInput(false);
        }
    };

    const handleDeleteInterest = (interestToDelete) => {
        if (!canDelete) return;
        setConfirmDelete({
            isOpen: true,
            title: "Delete Interest",
            message: `Are you sure you want to delete the interest "${interestToDelete}"?`,
            action: async () => {
                const updated = currentInterests.filter(i => i !== interestToDelete);
                await persistEmployeeUpdate({ interests: updated }, `Interest "${interestToDelete}" removed!`);
            }
        });
    };

    // 3. Education Operations
    const currentEducation = useMemo(() => {
        if (Array.isArray(employee?.education) && employee.education.length > 0) return employee.education;
        return [];
    }, [employee]);

    const handleAddEducationSubmit = async (e) => {
        e.preventDefault();
        if (!newEdu.degree.trim() || !newEdu.institution.trim()) {
            toast.error("Degree and Institution are required.");
            return;
        }
        let updated;
        if (editingEduIdx !== null) {
            updated = currentEducation.map((edu, i) => i === editingEduIdx ? newEdu : edu);
        } else {
            updated = [newEdu, ...currentEducation];
        }
        const ok = await persistEmployeeUpdate({ education: updated }, editingEduIdx !== null ? "Education record updated!" : "Education record added!");
        if (ok) {
            setShowEduModal(false);
            setEditingEduIdx(null);
            setNewEdu({ degree: "", institution: "", fieldOfStudy: "", passingYear: "", level: "Post Graduate" });
        }
    };

    const handleDeleteEducation = (idx) => {
        if (!canEdit) return;
        const target = currentEducation[idx];
        setConfirmDelete({
            isOpen: true,
            title: "Delete Education Record",
            message: `Are you sure you want to delete "${target?.degree || 'this education record'}"?`,
            action: async () => {
                const updated = currentEducation.filter((_, i) => i !== idx);
                await persistEmployeeUpdate({ education: updated }, "Education record deleted!");
            }
        });
    };

    // 4. Experience Operations
    const currentExperience = useMemo(() => {
        if (Array.isArray(employee?.experienceTimeline) && employee.experienceTimeline.length > 0) return employee.experienceTimeline;
        return [];
    }, [employee]);

    const handleAddExperienceSubmit = async (e) => {
        e.preventDefault();
        if (!canDelete) return;
        if (!newExp.title.trim() || !newExp.company.trim()) {
            toast.error("Title and Company are required.");
            return;
        }
        const updated = [newExp, ...currentExperience];
        const ok = await persistEmployeeUpdate({ experienceTimeline: updated }, "Experience entry added!");
        if (ok) {
            setShowExpModal(false);
            setNewExp({ title: "", company: "", period: "", description: "" });
        }
    };

    const handleDeleteExperience = (idx) => {
        if (!canDelete) return;
        const target = currentExperience[idx];
        setConfirmDelete({
            isOpen: true,
            title: "Delete Experience Entry",
            message: `Are you sure you want to delete "${target?.title || 'this experience entry'}"?`,
            action: async () => {
                const updated = currentExperience.filter((_, i) => i !== idx);
                await persistEmployeeUpdate({ experienceTimeline: updated }, "Experience entry deleted!");
            }
        });
    };

    // 5. Document Operations
    const currentDocuments = useMemo(() => {
        if (Array.isArray(employee?.userDocuments) && employee.userDocuments.length > 0) return employee.userDocuments;
        return [];
    }, [employee]);

    const aadhaarDoc = useMemo(() => {
        return currentDocuments.find(d => {
            const name = (d.name || "").toLowerCase();
            return name.includes("aadhaar") || name.includes("adhar");
        });
    }, [currentDocuments]);

    const panDoc = useMemo(() => {
        return currentDocuments.find(d => {
            const name = (d.name || "").toLowerCase();
            return name.includes("pan card") || name === "pan";
        });
    }, [currentDocuments]);

    const otherDocuments = useMemo(() => {
        return currentDocuments.filter(d => {
            const name = (d.name || "").toLowerCase();
            const isAadhaar = name.includes("aadhaar") || name.includes("adhar");
            const isPan = name.includes("pan card") || name === "pan";
            return !isAadhaar && !isPan;
        });
    }, [currentDocuments]);

    const handleOpenGovDocModal = (type) => {
        const isAadhaar = type === "aadhaar";
        const currentNum = isAadhaar 
            ? (employee?.aadhaarNumber || aadhaarDoc?.numberOrTag || "")
            : (employee?.panNumber || panDoc?.numberOrTag || "");
        setGovDocNumber(currentNum);
        setGovDocFile(null);
        setGovDocModal({ isOpen: true, type });
    };

    const handleGovDocSubmit = async (e) => {
        e.preventDefault();
        const isAadhaar = govDocModal.type === "aadhaar";
        const docTitle = isAadhaar ? "Aadhaar Card" : "PAN Card";
        const existingDoc = isAadhaar ? aadhaarDoc : panDoc;

        if (!govDocNumber.trim() && !govDocFile && !existingDoc?.url) {
            toast.error(`Please provide a ${docTitle} number or attach a file.`);
            return;
        }

        setSavingGovDoc(true);
        try {
            let fileUrl = existingDoc?.url || "";
            if (govDocFile) {
                const formData = new FormData();
                formData.append("file", govDocFile);
                toast.loading(`Uploading ${docTitle}...`, { id: "gov-upload" });
                const uploadRes = await uploadDocumentFile(formData);
                toast.dismiss("gov-upload");
                if (uploadRes.data?.success && uploadRes.data?.url) {
                    fileUrl = uploadRes.data.url;
                } else {
                    toast.error("File upload failed.");
                    setSavingGovDoc(false);
                    return;
                }
            }

            const newDocEntry = {
                name: docTitle,
                category: "Government ID",
                numberOrTag: govDocNumber.trim(),
                url: fileUrl,
                uploadedAt: new Date(),
                status: "Verified"
            };

            const filtered = currentDocuments.filter(d => {
                const name = (d.name || "").toLowerCase();
                return isAadhaar 
                    ? !(name.includes("aadhaar") || name.includes("adhar"))
                    : !(name.includes("pan card") || name === "pan");
            });

            const updatedDocs = [newDocEntry, ...filtered];
            const updatePayload = {
                userDocuments: updatedDocs,
                ...(isAadhaar ? { aadhaarNumber: govDocNumber.trim() } : { panNumber: govDocNumber.trim().toUpperCase() })
            };

            const ok = await persistEmployeeUpdate(updatePayload, `${docTitle} saved successfully!`);
            if (ok) {
                setGovDocModal({ isOpen: false, type: "aadhaar" });
                setGovDocFile(null);
                setGovDocNumber("");
            }
        } catch (err) {
            console.error(`Error saving ${docTitle}:`, err);
            toast.dismiss("gov-upload");
            toast.error(err.response?.data?.message || `Failed to save ${docTitle}.`);
        } finally {
            setSavingGovDoc(false);
        }
    };

    const handleAddDocumentSubmit = async (e) => {
        e.preventDefault();
        if (!newDoc.name.trim()) {
            toast.error("Document Name is required.");
            return;
        }
        setSaving(true);
        try {
            let fileUrl = "";
            if (docFile) {
                const formData = new FormData();
                formData.append("file", docFile);
                toast.loading("Uploading file...");
                const uploadRes = await uploadDocumentFile(formData);
                toast.dismiss();
                if (uploadRes.data?.success && uploadRes.data?.url) {
                    fileUrl = uploadRes.data.url;
                } else {
                    toast.error("File upload failed.");
                    setSaving(false);
                    return;
                }
            }
            const updated = [{ ...newDoc, url: fileUrl, uploadedAt: new Date(), status: "Verified" }, ...currentDocuments];
            const ok = await persistEmployeeUpdate({ userDocuments: updated }, "Document added successfully!");
            if (ok) {
                setShowDocModal(false);
                setDocFile(null);
                setNewDoc({ name: "", category: "Government ID", numberOrTag: "", url: "" });
            }
        } catch (err) {
            console.error("Document upload failed:", err);
            toast.dismiss();
            toast.error(err.response?.data?.message || "Failed to upload document.");
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteDocument = (idx) => {
        if (!canEdit) return;
        const target = currentDocuments[idx];
        setConfirmDelete({
            isOpen: true,
            title: "Delete Document",
            message: `Are you sure you want to delete "${target?.name || 'this document'}"?`,
            action: async () => {
                const updated = currentDocuments.filter((_, i) => i !== idx);
                await persistEmployeeUpdate({ userDocuments: updated }, "Document removed successfully!");
            }
        });
    };

    // 6. Asset Operations - Live sync with Assets Module
    const [userAssets, setUserAssets] = useState([]);
    const [loadingAssets, setLoadingAssets] = useState(false);

    const fetchUserAssets = useCallback(async () => {
        if (!employee) return;
        setLoadingAssets(true);
        try {
            let assetsList = [];
            const empIdStr = String(employee._id || employee.id || "").trim();
            const empCodeStr = String(employee.employeeId || "").trim();
            const empEmailStr = String(employee.email || "").toLowerCase().trim();
            const empNameStr = String(employee.fullName || `${employee.firstName || ''} ${employee.lastName || ''}`).toLowerCase().trim();

            const isAssetForThisEmp = (asset) => {
                if (!asset || !asset.assignedTo) return false;
                const assignedObj = asset.assignedTo;

                if (typeof assignedObj === "object" && assignedObj !== null) {
                    const aId = String(assignedObj._id || assignedObj.id || "").trim();
                    const aCode = String(assignedObj.employeeId || "").trim();
                    const aEmail = String(assignedObj.email || "").toLowerCase().trim();
                    const aName = String(assignedObj.fullName || `${assignedObj.firstName || ''} ${assignedObj.lastName || ''}`).toLowerCase().trim();

                    if (empIdStr && aId && aId === empIdStr) return true;
                    if (empCodeStr && aCode && aCode === empCodeStr) return true;
                    if (empEmailStr && aEmail && aEmail === empEmailStr) return true;
                    if (empNameStr && aName && (aName === empNameStr || (aName.length > 3 && (aName.includes(empNameStr) || empNameStr.includes(aName))))) return true;
                }

                const aStr = String(assignedObj).trim();
                if (empIdStr && aStr === empIdStr) return true;
                if (empCodeStr && aStr === empCodeStr) return true;

                return false;
            };

            // 1. Fetch from getAllAssets API
            try {
                const res = await getAllAssets();
                if (res.data?.success && Array.isArray(res.data.assets)) {
                    assetsList = res.data.assets.filter(asset => isAssetForThisEmp(asset));
                }
            } catch (err) {
                console.error("Error fetching all assets:", err);
            }

            // 2. Fetch from getAssignedAssets API (grouped by employee)
            try {
                const assignedRes = await getAssignedAssets();
                if (assignedRes.data?.success && Array.isArray(assignedRes.data.assignedGroups)) {
                    assignedRes.data.assignedGroups.forEach(g => {
                        const gEmp = g.employee || {};
                        const gId = String(gEmp._id || gEmp.id || "").trim();
                        const gCode = String(gEmp.employeeId || "").trim();
                        const gEmail = String(gEmp.email || "").toLowerCase().trim();
                        const gName = String(gEmp.fullName || `${gEmp.firstName || ''} ${gEmp.lastName || ''}`).toLowerCase().trim();

                        const isGroupMatch = 
                            (empIdStr && gId && gId === empIdStr) ||
                            (empCodeStr && gCode && gCode === empCodeStr) ||
                            (empEmailStr && gEmail && gEmail === empEmailStr) ||
                            (empNameStr && gName && (gName === empNameStr || gName.includes(empNameStr) || empNameStr.includes(gName)));

                        if (isGroupMatch && Array.isArray(g.assets)) {
                            g.assets.forEach(gAsset => {
                                const exists = assetsList.some(a => 
                                    (a._id && gAsset._id && String(a._id) === String(gAsset._id)) ||
                                    (a.assetId && gAsset.assetId && a.assetId === gAsset.assetId)
                                );
                                if (!exists) {
                                    assetsList.push(gAsset);
                                }
                            });
                        }
                    });
                }
            } catch (err) {
                console.error("Error fetching assigned groups:", err);
            }

            // 3. Fallback to employee.assets array stored directly on employee document
            const directAssets = Array.isArray(employee?.assets) ? employee.assets : [];
            directAssets.forEach(dAsset => {
                const exists = assetsList.some(a => 
                    (a._id && dAsset._id && String(a._id) === String(dAsset._id)) ||
                    (a.assetId && dAsset.assetId && a.assetId === dAsset.assetId) ||
                    (a.name && dAsset.name && a.name === dAsset.name)
                );
                if (!exists) {
                    assetsList.push(dAsset);
                }
            });

            setUserAssets(assetsList);
        } catch (err) {
            console.error("Error loading employee assigned assets:", err);
        } finally {
            setLoadingAssets(false);
        }
    }, [employee]);

    useEffect(() => {
        if (employee) {
            fetchUserAssets();
        }
    }, [employee, fetchUserAssets, activeTab, id]);

    const getCategoryIcon = (category, className = "w-5 h-5") => {
        switch (category) {
            case "Screen":
            case "Monitor":
            case "Display Monitor":
                return <Monitor className={className} />;
            case "Keyboard":
                return <KeyboardIcon className={className} />;
            case "Mouse":
                return <MouseIcon className={className} />;
            case "Earphone/Headphone":
            case "Headphones":
            case "Earphones":
                return <Headphones className={className} />;
            case "Mobile":
                return <Smartphone className={className} />;
            case "Tablet":
                return <TabletIcon className={className} />;
            case "CPU":
                return <Cpu className={className} />;
            case "UPS":
                return <Zap className={className} />;
            case "Desktop":
                return <Monitor className={className} />;
            case "Laptop":
            default:
                return <Laptop className={className} />;
        }
    };

    // Handle receipt acknowledgment directly from profile card
    const handleAcknowledgeAsset = async (asset) => {
        if (!asset || !asset._id) return;
        setAcknowledgingId(asset._id);
        try {
            const res = await acknowledgeAsset(asset._id);
            if (res.data?.success) {
                toast.success(res.data.message || "Asset acknowledged! Management has been notified.");
                fetchUserAssets();
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to acknowledge asset.");
        } finally {
            setAcknowledgingId(null);
        }
    };

    // Handle employee asset request submission
    const handleRequestAssetSubmit = async (e) => {
        e.preventDefault();
        if (requestAssetType === "Other" && !requestAssetComment.trim()) {
            toast.error("Please specify which asset you require in the comment box.");
            return;
        }
        setSubmittingAssetRequest(true);
        try {
            const res = await requestNewAsset({
                assetType: requestAssetType,
                comment: requestAssetComment.trim()
            });
            if (res.data?.success) {
                toast.success(res.data.message || "Asset request submitted successfully!");
                setShowRequestAssetModal(false);
                setRequestAssetType("Monitor");
                setRequestAssetComment("");
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to submit asset request.");
        } finally {
            setSubmittingAssetRequest(false);
        }
    };

    const handleAddAssetSubmit = async (e) => {
        e.preventDefault();
        if (!newAsset.name.trim()) {
            toast.error("Asset Name is required.");
            return;
        }
        const updated = [{ ...newAsset, issuedDate: new Date(), status: "Active" }, ...currentAssets];
        const ok = await persistEmployeeUpdate({ assets: updated }, "Asset assigned successfully!");
        if (ok) {
            setShowAssetModal(false);
            setNewAsset({ name: "", assetTag: "", category: "Hardware Workstation", condition: "Excellent" });
        }
    };

    const handleDeleteAsset = (idx) => {
        if (!canDelete) return;
        const target = currentAssets[idx];
        setConfirmDelete({
            isOpen: true,
            title: "Delete Asset",
            message: `Are you sure you want to delete asset "${target?.name || 'this item'}"?`,
            action: async () => {
                const updated = currentAssets.filter((_, i) => i !== idx);
                await persistEmployeeUpdate({ assets: updated }, "Asset unassigned successfully!");
            }
        });
    };

    // 7. Activity Timeline (Dynamic & strictly based on actual records)
    const currentActivities = useMemo(() => {
        if (Array.isArray(employee?.activities) && employee.activities.length > 0) return employee.activities;
        return [];
    }, [employee]);

    // Extract core employee details
    const empName = employee?.fullName || `${employee?.firstName || ""} ${employee?.lastName || ""}`.trim() || "Employee Name";
    const empRole = (employee?.role || "employee").toUpperCase();
    const empDept = employee?.department || "General";
    const empDesignation = employee?.designation || "Staff Member";
    const empCode = employee?.employeeId || "IF-EMP";
    const empLocation = employee?.workLocation || "Office";
    const empEmail = employee?.email || "employee@ideafueled.com";
    const empPhone = employee?.phoneNumber || "+91 98765 43210";
    const empJoining = formatDateStr(employee?.joiningDate || employee?.createdAt || "2023-01-15");
    const empStatus = (employee?.status || "active").toLowerCase();
    
    const isTargetManagement = isManagementUser(employee);

    const managerName = employee?.managerId?.fullName 
        ? employee.managerId.fullName 
        : (typeof employee?.managerId === "string" ? employee.managerId : "");

    const dottedManagerName = employee?.dottedManagerId?.fullName 
        ? employee.dottedManagerId.fullName 
        : null;

    const aboutMeText = useMemo(() => {
        const raw = (employee?.aboutMe || "").trim();
        if (
            raw.includes("Experienced professional passionate about operational excellence") ||
            raw.includes("Dedicated team member at Idea Fueled HRMS")
        ) {
            return "";
        }
        return raw;
    }, [employee]);

    // Profile Completion Calculation (Dynamic progress across key profile pillars)
    const profileCompletion = useMemo(() => {
        const hasPhoto = Boolean(employee?.profilePicture && !employee.profilePicture.includes("default") && employee.profilePicture.length > 5);
        const hasBio = Boolean(aboutMeText && aboutMeText.trim().length >= 10);
        const hasInterests = Boolean(Array.isArray(currentInterests) && currentInterests.length > 0);
        const hasEducation = Boolean(Array.isArray(currentEducation) && currentEducation.length > 0);
        const hasAadhaar = Boolean(aadhaarDoc?.url || (employee?.aadhaarNumber && employee.aadhaarNumber.trim().length >= 8));
        const hasPan = Boolean(panDoc?.url || (employee?.panNumber && employee.panNumber.trim().length >= 8));

        const criteria = [
            { id: "photo", label: "Profile Photo", done: hasPhoto, weight: 15, action: () => (document.getElementById("hero-profile-pic-input")?.click() || openEditDrawer()) },
            { id: "bio", label: "About Me / Bio", done: hasBio, weight: 15, action: openEditDrawer },
            { id: "interests", label: "Interests & Hobbies", done: hasInterests, weight: 15, action: () => { setActiveTab("Personal"); setShowAddInterestInput(true); } },
            { id: "education", label: "Education Qualification", done: hasEducation, weight: 15, action: () => { setActiveTab("Personal"); setShowEduModal(true); } },
            { id: "aadhaar", label: "Aadhaar Card", done: hasAadhaar, weight: 20, action: () => { setActiveTab("Documents"); handleOpenGovDocModal("aadhaar"); } },
            { id: "pan", label: "PAN Card", done: hasPan, weight: 20, action: () => { setActiveTab("Documents"); handleOpenGovDocModal("pan"); } }
        ];

        const earned = criteria.reduce((sum, c) => sum + (c.done ? c.weight : 0), 0);
        const pending = criteria.filter(c => !c.done);

        return {
            percent: Math.min(100, earned),
            criteria,
            pending
        };
    }, [employee, aadhaarDoc, panDoc]);

    // Tabs definition
    const allProfileTabs = useMemo(() => {
        const base = [
            { key: "Personal", label: "Personal", icon: User },
            { key: "Employment", label: "Employment", icon: Briefcase },
        ];

        if (canViewAttendanceAndLeaves && !isTargetManagement) {
            base.push(
                { key: "Attendance", label: "Attendance", icon: Clock },
                { key: "Leaves", label: "Leaves", icon: Umbrella }
            );
        }

        base.push(
            { key: "Documents", label: "Documents", icon: FileText },
            { key: "Assets", label: "Assets", icon: Laptop },
            { key: "Activity", label: "Activity", icon: History }
        );

        return base;
    }, [canViewAttendanceAndLeaves, isTargetManagement]);


    const profileTabs = useMemo(() => {
        if (canViewConfidential) return allProfileTabs;
        // Public read-only view for unassigned HR or employee: ONLY Employment overview tab
        return [{ key: "Employment", label: "Overview", icon: Briefcase }];
    }, [canViewConfidential, allProfileTabs]);

    useEffect(() => {
        if (!canViewConfidential && activeTab !== "Employment") {
            setActiveTab("Employment");
        } else if (isTargetManagement && (activeTab === "Attendance" || activeTab === "Leaves")) {
            setActiveTab("Personal");
        }
    }, [canViewConfidential, isTargetManagement, activeTab]);

    if (loading) {
        return (
            <div className="p-6 space-y-6">
                <SkeletonLoader type="card" />
                <SkeletonLoader type="table" rows={6} />
            </div>
        );
    }

    return (
        <div className="space-y-4 sm:space-y-6 text-left select-none animate-fadeIn pb-16 max-w-7xl mx-auto">

            {/* ─────────────────────────────────────────────
               TOP HERO SECTION
            ───────────────────────────────────────────── */}
            <div className="premium-3d-card p-4 sm:p-8 relative overflow-hidden bg-white border border-[#E5E7EB] rounded-[20px] sm:rounded-[24px]">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#2D79C7] via-[#3B82F6] to-[#1E40AF]" />

                <div className="flex flex-col lg:flex-row items-start justify-between gap-5 sm:gap-6 pt-2">
                    
                    {/* Left: Avatar & Info */}
                    <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4 sm:gap-6 w-full lg:w-auto">
                        <div className="relative shrink-0 group">
                            <Avatar
                                src={employee?.profilePicture}
                                name={empName}
                                size="w-20 h-20 sm:w-28 sm:h-28"
                                textSize="text-xl sm:text-2xl font-black"
                            />
                            {canEdit && (
                                <label
                                    title="Click to update profile photo"
                                    className="absolute inset-0 rounded-full bg-black/40 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-md"
                                >
                                    {uploadingPic ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            <Camera className="w-5 h-5 mb-0.5" />
                                            <span className="text-[10px] font-bold">Change</span>
                                        </>
                                    )}
                                    <input
                                        id="hero-profile-pic-input"
                                        type="file"
                                        accept="image/*"
                                        onChange={handleDirectHeroPicUpload}
                                        disabled={uploadingPic}
                                        className="hidden"
                                    />
                                </label>
                            )}
                            <span className={`absolute bottom-1 right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 border-white shadow-sm flex items-center justify-center ${
                                empStatus === "active" ? "bg-emerald-500" : empStatus === "on_notice" ? "bg-amber-500" : "bg-gray-400"
                            }`} title={`Status: ${empStatus}`} />
                        </div>

                        <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-2.5">
                                <h1 className="text-[#1E1E1E] text-xl sm:text-2xl md:text-3xl font-black tracking-tight leading-tight">
                                    {empName}
                                </h1>
                                <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border tracking-wider ${
                                    empStatus === "active"
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                        : empStatus === "on_notice"
                                        ? "bg-amber-50 text-amber-700 border-amber-200"
                                        : "bg-gray-100 text-gray-600 border-gray-200"
                                }`}>
                                    {empStatus.replace("_", " ")}
                                </span>
                            </div>

                            <p className="text-gray-600 text-xs sm:text-sm font-semibold flex items-center justify-center sm:justify-start gap-2">
                                <span>{empDesignation}</span>
                                <span className="text-gray-300">·</span>
                                <span className="text-[#2D79C7] font-bold">{empDept}</span>
                            </p>

                            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-3 sm:gap-x-4 gap-y-2 pt-2 text-xs font-medium text-gray-500">
                                <div className="flex flex-col items-center sm:items-start gap-1.5">
                                    <span className="flex items-center gap-1.5 font-bold text-[#1E1E1E] bg-[#F8FAFC] border border-gray-200 px-2.5 py-1 rounded-lg">
                                        <ShieldCheck className="w-3.5 h-3.5 text-[#2D79C7]" />
                                        {empCode}
                                    </span>
                                    {currentUser?.role === "global_admin" && (
                                        <button
                                            type="button"
                                            onClick={handleInviteClick}
                                            disabled={invitingEmployee}
                                            className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer shadow-xs ${
                                                employee?.invitationSent
                                                    ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200"
                                                    : "bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200"
                                            }`}
                                        >
                                            {invitingEmployee ? (
                                                <Loader2 className="w-3 h-3 animate-spin" />
                                            ) : (
                                                <Send className="w-3 h-3" />
                                            )}
                                            <span>{employee?.invitationSent ? "Re-invite" : "Invite"}</span>
                                            {employee?.invitationSent && (
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                            )}
                                        </button>
                                    )}
                                </div>

                                <span className="flex items-center gap-1.5 bg-[#F8FAFC] border border-gray-200 px-2.5 py-1 rounded-lg self-center sm:self-start">
                                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                                    {empLocation}
                                </span>

                                <span className="flex items-center gap-1.5 bg-[#F8FAFC] border border-gray-200 px-2.5 py-1 rounded-lg self-center sm:self-start">
                                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                    Joined {empJoining}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Right: Contact & Actions */}
                    <div className="flex flex-col items-center sm:items-start lg:items-end justify-between gap-4 w-full lg:w-auto border-t lg:border-t-0 pt-4 lg:pt-0 border-gray-100">
                        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-center sm:justify-start">
                            {canEdit && (
                                <button
                                    type="button"
                                    onClick={openEditDrawer}
                                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#2D79C7] hover:bg-[#1F5EA8] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition-all cursor-pointer shrink-0"
                                >
                                    <Edit3 className="w-4 h-4" />
                                    <span>Edit Profile</span>
                                </button>
                            )}
                        </div>

                        <div className="space-y-2 text-xs text-gray-600 font-medium text-center sm:text-left lg:text-right w-full">
                            <div className="flex items-center justify-center sm:justify-start lg:justify-end gap-2">
                                <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                <span className="font-semibold text-gray-700 truncate">{empEmail}</span>
                            </div>

                            <div className="flex items-center justify-center sm:justify-start lg:justify-end gap-2">
                                <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                <span className="font-semibold text-gray-700">{empPhone}</span>
                            </div>

                            {!isTargetManagement && managerName && (
                                <div className="flex items-center justify-center sm:justify-start lg:justify-end gap-2">
                                    <User className="w-3.5 h-3.5 text-[#2D79C7] shrink-0" />
                                    <span>Reports to: <strong className="text-[#1E1E1E]">{managerName}</strong></span>
                                </div>
                            )}

                            {/* Resignation / Exit action directly below Reports to (Excluded for Management) */}
                            {isOwnProfile && !isTargetManagement && (
                                <div className="flex items-center justify-center sm:justify-start lg:justify-end pt-1.5">
                                    <button
                                        type="button"
                                        onClick={() => setIsResignModalOpen(true)}
                                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-bold rounded-lg shadow-2xs transition-all cursor-pointer hover:shadow-xs active:scale-95"
                                    >
                                        <LogOut className="w-3.5 h-3.5" />
                                        <span>Resign from my job</span>
                                    </button>
                                </div>
                            )}

                            {!isOwnProfile && userRole === "global_admin" && !isTargetManagement && (
                                <div className="flex items-center lg:justify-end pt-1.5">
                                    <button
                                        type="button"
                                        onClick={() => setIsAdminExitModalOpen(true)}
                                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-bold rounded-lg shadow-2xs transition-all cursor-pointer hover:shadow-xs active:scale-95"
                                    >
                                        <LogOut className="w-3.5 h-3.5" />
                                        <span>Initiate exit</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ─────────────────────────────────────────────
                   PROFILE COMPLETION PROGRESS BAR (Full width)
                   (Visible ONLY to: Self, Global Admin, and Assigned HR)
                ───────────────────────────────────────────── */}
                {canViewProfileCompletion && (
                    <div className="mt-6 pt-5 border-t border-gray-150">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                                    profileCompletion.percent === 100 ? "bg-emerald-100 text-emerald-600" : "bg-blue-100 text-[#2D79C7]"
                                }`}>
                                    <Sparkles className="w-3.5 h-3.5" />
                                </div>
                                <div>
                                    <span className="text-xs font-bold text-gray-800">Profile Completeness</span>
                                    <span className="text-[11px] text-gray-400 font-semibold ml-2">
                                        ({profileCompletion.criteria.filter(c => c.done).length} of {profileCompletion.criteria.length} completed)
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border shadow-2xs ${
                                    profileCompletion.percent === 100
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                        : profileCompletion.percent >= 60
                                        ? "bg-blue-50 text-[#2D79C7] border-blue-200"
                                        : "bg-amber-50 text-amber-700 border-amber-200"
                                }`}>
                                    {profileCompletion.percent}% Complete
                                </span>
                            </div>
                        </div>

                        {/* Progress Bar Track */}
                        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden shadow-inner p-0.5">
                            <div
                                className={`h-full rounded-full transition-all duration-700 ease-out ${
                                    profileCompletion.percent === 100
                                        ? "bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600"
                                        : "bg-gradient-to-r from-[#2D79C7] to-blue-500"
                                }`}
                                style={{ width: `${profileCompletion.percent}%` }}
                            />
                        </div>

                        {/* Pending Checklist Prompts */}
                        {profileCompletion.pending.length > 0 && canEdit && (
                            <div className="flex flex-wrap items-center gap-2 mt-2.5">
                                <span className="text-[10.5px] font-bold text-gray-400 uppercase tracking-wider">Complete your profile:</span>
                                {profileCompletion.pending.map((item) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={item.action}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50/70 hover:bg-blue-100 text-[#2D79C7] border border-blue-100 text-[11px] font-bold rounded-lg transition-colors cursor-pointer active:scale-95"
                                    >
                                        <Plus className="w-3 h-3" />
                                        <span>{item.label}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ─────────────────────────────────────────────
               NAVIGATION TABS
            ───────────────────────────────────────────── */}
            <div className="flex border-b border-gray-200 gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none pb-0.5">
                {profileTabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.key;
                    return (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => setActiveTab(tab.key)}
                            className={`px-3.5 sm:px-5 py-2.5 sm:py-3 text-xs font-extrabold border-b-2 transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer whitespace-nowrap shrink-0 ${
                                isActive
                                    ? "border-[#2D79C7] text-[#2D79C7]"
                                    : "border-transparent text-gray-400 hover:text-gray-600"
                            }`}
                        >
                            <Icon className={`w-4 h-4 ${isActive ? "text-[#2D79C7]" : "text-gray-400"}`} />
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* ─────────────────────────────────────────────
               TAB 1: PERSONAL
            ───────────────────────────────────────────── */}
            {activeTab === "Personal" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                    
                    {/* Left Column (About Me, Hobbies & Interests, Education Qualification) */}
                    <div className="space-y-6">
                        
                        {/* About Me */}
                        <div className="premium-3d-card p-6 space-y-3">
                            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                                <h3 className="text-[#1E1E1E] text-sm font-extrabold flex items-center gap-2">
                                    <User className="w-4 h-4 text-[#2D79C7]" />
                                    <span>About Me</span>
                                </h3>
                                {canEdit && (
                                    <button onClick={openEditDrawer} className="text-[#2D79C7] hover:text-[#1F5EA8] text-xs font-bold flex items-center gap-1 cursor-pointer">
                                        <Edit3 className="w-3.5 h-3.5" /> Edit
                                    </button>
                                )}
                            </div>
                            {aboutMeText ? (
                                <p className="text-gray-600 text-xs font-medium leading-relaxed whitespace-pre-line">
                                    {aboutMeText}
                                </p>
                            ) : (
                                <div className="py-5 text-center select-none bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                                    <p className="text-slate-400 text-xs font-medium italic">No bio added yet.</p>
                                    {canEdit && (
                                        <button
                                            type="button"
                                            onClick={openEditDrawer}
                                            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#2D79C7]/10 hover:bg-[#2D79C7]/20 text-[#2D79C7] text-xs font-bold rounded-lg transition-colors cursor-pointer"
                                        >
                                            <Edit3 className="w-3.5 h-3.5" />
                                            <span>Add your bio</span>
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Hobbies & Interests */}
                        <div className="premium-3d-card p-6 space-y-3">
                            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                                <h3 className="text-[#1E1E1E] text-sm font-extrabold flex items-center gap-2">
                                    <Heart className="w-4 h-4 text-rose-500" />
                                    <span>Interests & Hobbies</span>
                                </h3>
                                {canEdit && (
                                    <button
                                        type="button"
                                        onClick={() => setShowAddInterestInput(true)}
                                        className="text-[#2D79C7] hover:text-[#1F5EA8] text-xs font-bold flex items-center gap-1 cursor-pointer"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Add
                                    </button>
                                )}
                            </div>

                            {showAddInterestInput && (
                                <div className="flex items-center gap-2 pt-1">
                                    <input
                                        type="text"
                                        value={newInterestText}
                                        onChange={(e) => setNewInterestText(e.target.value)}
                                        placeholder="Enter interest or hobby..."
                                        className="flex-1 bg-slate-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-medium focus:outline-none focus:border-[#2D79C7]"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddInterest}
                                        className="bg-[#2D79C7] text-white text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer hover:bg-[#1F5EA8]"
                                    >
                                        Save
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowAddInterestInput(false)}
                                        className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            )}

                            {currentInterests.length === 0 ? (
                                <div className="py-5 text-center select-none bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                                    <p className="text-slate-400 text-xs font-medium italic">No interests or hobbies added yet.</p>
                                    {canEdit && !showAddInterestInput && (
                                        <button
                                            type="button"
                                            onClick={() => setShowAddInterestInput(true)}
                                            className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#2D79C7]/10 hover:bg-[#2D79C7]/20 text-[#2D79C7] text-xs font-bold rounded-lg transition-colors cursor-pointer"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                            <span>Add interest</span>
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="flex flex-wrap gap-2 pt-1">
                                    {currentInterests.map((it, idx) => (
                                        <span key={idx} className="bg-slate-100 text-slate-700 border border-slate-200 px-3 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5">
                                            <span>{it}</span>
                                            {canDelete && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteInterest(it)}
                                                    className="opacity-60 hover:opacity-100 text-rose-500 cursor-pointer ml-0.5"
                                                    title="Delete interest"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            )}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Education Qualification (Moved to Left Column) */}
                        <div className="premium-3d-card p-6 space-y-4">
                            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                                <h3 className="text-[#1E1E1E] text-sm font-extrabold flex items-center gap-2">
                                    <GraduationCap className="w-4 h-4 text-[#2D79C7]" />
                                    <span>Education Qualification</span>
                                </h3>
                                {canEdit && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setNewEdu({ degree: "", institution: "", fieldOfStudy: "", passingYear: "", level: "Post Graduate" });
                                            setEditingEduIdx(null);
                                            setShowEduModal(true);
                                        }}
                                        className="text-[#2D79C7] hover:text-[#1F5EA8] text-xs font-bold flex items-center gap-1 cursor-pointer"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Add Degree
                                    </button>
                                )}
                            </div>

                            <div className="space-y-3">
                                {currentEducation.length === 0 ? (
                                    <div className="py-5 text-center select-none bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                                        <p className="text-slate-400 text-xs font-medium italic">No education qualifications added yet.</p>
                                        {canEdit && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setNewEdu({ degree: "", institution: "", fieldOfStudy: "", passingYear: "", level: "Post Graduate" });
                                                    setEditingEduIdx(null);
                                                    setShowEduModal(true);
                                                }}
                                                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#2D79C7]/10 hover:bg-[#2D79C7]/20 text-[#2D79C7] text-xs font-bold rounded-lg transition-colors cursor-pointer"
                                            >
                                                <Plus className="w-3.5 h-3.5" />
                                                <span>Add qualification</span>
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    currentEducation.map((edu, idx) => (
                                        <div key={idx} className="group bg-[#F8FAFC] border border-gray-200/70 p-4 rounded-xl flex items-center justify-between">
                                            <div>
                                                <h4 className="text-[#1E1E1E] text-xs font-bold">{edu.degree}</h4>
                                                <p className="text-gray-500 text-[11px] font-medium">{edu.fieldOfStudy || edu.institution}</p>
                                                <p className="text-gray-400 text-[10.5px]">{edu.institution} · Graduated {edu.passingYear}</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="bg-blue-50 text-[#2D79C7] text-[10.5px] font-bold px-2.5 py-1 rounded-md border border-blue-100">
                                                    {edu.level || "Qualification"}
                                                </span>
                                                {canEdit && (
                                                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setNewEdu({ ...edu });
                                                                setEditingEduIdx(idx);
                                                                setShowEduModal(true);
                                                            }}
                                                            className="p-1 text-gray-400 hover:text-[#2D79C7] transition-colors cursor-pointer"
                                                            title="Edit Education"
                                                        >
                                                            <Edit3 className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteEducation(idx)}
                                                            className="p-1 text-gray-400 hover:text-rose-600 transition-colors cursor-pointer"
                                                            title="Delete Education"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                    </div>

                    {/* Right Column (Personal Info & Emergency Contact) */}
                    <div className="space-y-6">
                        
                        {/* Personal Information (Visible only to HR/Admin or Own Profile) */}
                        {canViewConfidential && (
                            <div className="premium-3d-card p-6 space-y-4">
                                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                                    <h3 className="text-[#1E1E1E] text-sm font-extrabold flex items-center gap-2">
                                        <UserCheck className="w-4 h-4 text-[#2D79C7]" />
                                        <span>Personal Information</span>
                                    </h3>
                                    {canEdit && (
                                        <button onClick={openEditDrawer} className="text-[#2D79C7] hover:text-[#1F5EA8] text-xs font-bold flex items-center gap-1 cursor-pointer">
                                            <Edit3 className="w-3.5 h-3.5" /> Edit
                                        </button>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                                    <div className="bg-[#F8FAFC] border border-gray-200/70 p-3.5 rounded-xl">
                                        <span className="text-gray-400 font-medium block text-[10.5px] uppercase tracking-wider">Date of Birth</span>
                                        <span className="text-[#1E1E1E] font-bold block mt-1">
                                            {formatDateStr(employee?.dateOfBirth || "1996-08-24")}
                                        </span>
                                    </div>

                                    <div className="bg-[#F8FAFC] border border-gray-200/70 p-3.5 rounded-xl">
                                        <span className="text-gray-400 font-medium block text-[10.5px] uppercase tracking-wider">Gender</span>
                                        <span className="text-[#1E1E1E] font-bold block mt-1">
                                            {employee?.gender || "Male"}
                                        </span>
                                    </div>

                                    <div className="bg-[#F8FAFC] border border-gray-200/70 p-3.5 rounded-xl">
                                        <span className="text-gray-400 font-medium block text-[10.5px] uppercase tracking-wider">Blood Group</span>
                                        <span className="text-[#1E1E1E] font-bold block mt-1">
                                            {employee?.bloodGroup || "—"}
                                        </span>
                                    </div>

                                    <div className="bg-[#F8FAFC] border border-gray-200/70 p-3.5 rounded-xl">
                                        <span className="text-gray-400 font-medium block text-[10.5px] uppercase tracking-wider">Father&apos;s Name</span>
                                        <span className="text-[#1E1E1E] font-bold block mt-1">
                                            {employee?.fatherName || "—"}
                                        </span>
                                    </div>

                                    <div className="bg-[#F8FAFC] border border-gray-200/70 p-3.5 rounded-xl sm:col-span-2">
                                        <span className="text-gray-400 font-medium block text-[10.5px] uppercase tracking-wider">Present Address</span>
                                        <span className="text-[#1E1E1E] font-medium block mt-1">
                                            {employee?.presentAddress || "—"}
                                        </span>
                                    </div>

                                    <div className="bg-[#F8FAFC] border border-gray-200/70 p-3.5 rounded-xl sm:col-span-2">
                                        <span className="text-gray-400 font-medium block text-[10.5px] uppercase tracking-wider">Permanent Address</span>
                                        <span className="text-[#1E1E1E] font-medium block mt-1">
                                            {employee?.permanentAddress || "—"}
                                        </span>
                                    </div>

                                    {/* Emergency Contact Integrated Block */}
                                    <div className="sm:col-span-2 bg-rose-50/60 border border-rose-100 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-1">
                                        <div className="space-y-1">
                                            <span className="text-rose-500 font-extrabold block text-[10.5px] uppercase tracking-wider flex items-center gap-1.5">
                                                <PhoneCall className="w-3.5 h-3.5 text-rose-600" />
                                                Emergency Contact
                                            </span>
                                            <h4 className="text-[#1E1E1E] text-xs font-black">
                                                {employee?.emergencyContactName || "—"}
                                            </h4>
                                            <p className="text-gray-500 text-[11px] font-medium">
                                                Relation: <span className="font-bold text-gray-700">{employee?.emergencyContactRelation || "—"}</span>
                                            </p>
                                        </div>

                                        <div className="bg-white border border-rose-200 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-700 shadow-sm flex items-center gap-2">
                                            <Phone className="w-3.5 h-3.5 text-rose-500" />
                                            <span>{employee?.emergencyContactNumber || employee?.phoneNumber || "—"}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            )}

            {/* ─────────────────────────────────────────────
               TAB 2: EMPLOYMENT
            ───────────────────────────────────────────── */}
            {activeTab === "Employment" && (
                <div className="space-y-6">
                    <div className="premium-3d-card p-6 sm:p-8 space-y-6">
                        <div className="flex items-center justify-between border-b border-gray-150 pb-4">
                            <div>
                                <h2 className="text-[#1E1E1E] text-base font-extrabold flex items-center gap-2">
                                    <Briefcase className="w-5 h-5 text-[#2D79C7]" />
                                    <span>Employment & Work Roster Parameters</span>
                                </h2>
                                <p className="text-gray-500 text-xs font-medium mt-1">
                                    Enterprise employment configuration, organizational department hierarchy, and active work shift.
                                </p>
                            </div>
                            {canEdit && (
                                <button onClick={openEditDrawer} className="text-[#2D79C7] hover:text-[#1F5EA8] text-xs font-bold flex items-center gap-1 cursor-pointer">
                                    <Edit3 className="w-4 h-4" /> Edit Parameters
                                </button>
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            
                            <div className="bg-[#F8FAFC] border border-gray-200 p-4 rounded-2xl space-y-1">
                                <span className="text-gray-400 text-[10.5px] font-bold uppercase tracking-wider block">Employee ID</span>
                                <span className="text-[#1E1E1E] text-sm font-mono font-bold block">{empCode}</span>
                            </div>

                            <div className="bg-[#F8FAFC] border border-gray-200 p-4 rounded-2xl space-y-1">
                                <span className="text-gray-400 text-[10.5px] font-bold uppercase tracking-wider block">Department</span>
                                <span className="text-[#2D79C7] text-sm font-bold block">{empDept}</span>
                            </div>

                            <div className="bg-[#F8FAFC] border border-gray-200 p-4 rounded-2xl space-y-1">
                                <span className="text-gray-400 text-[10.5px] font-bold uppercase tracking-wider block">Designation</span>
                                <span className="text-[#1E1E1E] text-sm font-bold block">{empDesignation}</span>
                            </div>

                            <div className="bg-[#F8FAFC] border border-gray-200 p-4 rounded-2xl space-y-1">
                                <span className="text-gray-400 text-[10.5px] font-bold uppercase tracking-wider block">Employment Type</span>
                                <span className="text-[#1E1E1E] text-sm font-bold block capitalize">
                                    {(employee?.role === "intern" || employee?.employementType === "intern") ? "Intern" : (employee?.employementType || "full_time").replace("_", " ")}
                                </span>
                            </div>

                            <div className="bg-[#F8FAFC] border border-gray-200 p-4 rounded-2xl space-y-1">
                                <span className="text-gray-400 text-[10.5px] font-bold uppercase tracking-wider block">Date of Joining</span>
                                <span className="text-[#1E1E1E] text-sm font-bold block">{empJoining}</span>
                            </div>

                            {!isTargetManagement && (
                                <div className="bg-[#F8FAFC] border border-gray-200 p-4 rounded-2xl space-y-1">
                                    <span className="text-gray-400 text-[10.5px] font-bold uppercase tracking-wider block">Reporting Manager</span>
                                    <span className="text-[#1E1E1E] text-sm font-bold block">{managerName || "Not Assigned"}</span>
                                </div>
                            )}

                            <div className="bg-[#F8FAFC] border border-gray-200 p-4 rounded-2xl space-y-1">
                                <span className="text-gray-400 text-[10.5px] font-bold uppercase tracking-wider block">Work Location</span>
                                <span className="text-[#1E1E1E] text-sm font-bold block">{empLocation}</span>
                            </div>

                            <div className="bg-[#F8FAFC] border border-gray-200 p-4 rounded-2xl space-y-1">
                                <span className="text-gray-400 text-[10.5px] font-bold uppercase tracking-wider block">Assigned Shift</span>
                                <span className="text-[#1E1E1E] text-sm font-bold block">
                                    Standard Day (09:30 AM – 06:30 PM)
                                </span>
                            </div>

                        </div>
                    </div>

                    {/* Experience Timeline */}
                    <div className="premium-3d-card p-6 sm:p-8 space-y-4">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <h3 className="text-[#1E1E1E] text-sm font-extrabold flex items-center gap-2">
                                <Briefcase className="w-4 h-4 text-[#2D79C7]" />
                                <span>Experience Timeline</span>
                            </h3>
                            {canDelete && (
                                <button
                                    type="button"
                                    onClick={() => setShowExpModal(true)}
                                    className="text-[#2D79C7] hover:text-[#1F5EA8] text-xs font-bold flex items-center gap-1 cursor-pointer"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Add Role
                                </button>
                            )}
                        </div>

                        <div className="relative pl-6 space-y-5 border-l-2 border-gray-200 ml-2 pt-1">
                            {currentExperience.length === 0 ? (
                                <p className="text-gray-400 text-xs italic py-2 font-semibold select-none">No experience timeline records added yet.</p>
                            ) : (
                                currentExperience.map((exp, idx) => (
                                    <div key={idx} className="relative group">
                                        <div className={`absolute -left-[31px] top-0 w-4 h-4 rounded-full border-4 border-white shadow-sm ${idx === 0 ? "bg-[#2D79C7]" : "bg-gray-300"}`} />
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <h4 className="text-[#1E1E1E] text-xs font-extrabold">{exp.title}</h4>
                                                <p className="text-[#2D79C7] text-[11px] font-bold">{exp.company}</p>
                                                <p className="text-gray-400 text-[10.5px] font-mono mt-0.5">{exp.period}</p>
                                                {exp.description && <p className="text-gray-500 text-[11px] mt-1">{exp.description}</p>}
                                            </div>
                                            {canDelete && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteExperience(idx)}
                                                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-rose-600 transition-opacity cursor-pointer"
                                                    title="Delete experience"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ─────────────────────────────────────────────
               TAB 3: ATTENDANCE
            ───────────────────────────────────────────── */}
            {activeTab === "Attendance" && (
                <div className="space-y-6">
                    <TeamMemberAttendanceHistory
                        member={{
                            userId: employee?._id || id,
                            name: empName,
                            dept: employee?.department?.name || employee?.department || "General",
                            designation: employee?.designation || "Employee",
                            avatar: employee?.avatar || employee?.profilePicture,
                            profilePicture: employee?.profilePicture || employee?.avatar
                        }}
                        hideBack={true}
                        extraActions={
                            userRole === "global_admin" && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setImportAttendanceFile(null);
                                        setImportParsedRecords([]);
                                        setImportAttendanceError("");
                                        setShowImportAttendanceModal(true);
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white text-xs font-bold rounded-xl shadow-xs hover:shadow transition-all cursor-pointer"
                                    title="Import attendance records from Excel"
                                >
                                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-100" />
                                    <span>Import Excel</span>
                                </button>
                            )
                        }
                    />
                </div>
            )}

            {/* ─────────────────────────────────────────────
               TAB 4: LEAVES & QUOTA MANAGEMENT
            ───────────────────────────────────────────── */}
            {activeTab === "Leaves" && (
                <div className="space-y-6">
                    {/* Leave Allocation Header with Edit Quota Button */}
                    <div className="premium-3d-card p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#2D79C7] shrink-0">
                                <Umbrella className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-[#1E1E1E] text-sm font-extrabold flex items-center gap-2">
                                    <span>Leave Allocation & Balances</span>
                                    <span className="text-[10px] font-extrabold bg-blue-50 text-[#2D79C7] border border-blue-100 px-2 py-0.5 rounded">
                                        FY 2026 - 2027
                                    </span>
                                </h3>
                                <p className="text-gray-400 text-xs font-medium mt-0.5">
                                    Track quotas, taken days, and leave requests for {empName}.
                                </p>
                            </div>
                        </div>

                        {canEditLeaves && (
                            <button
                                type="button"
                                onClick={() => setShowEditLeaveModal(true)}
                                className="bg-[#2D79C7] hover:bg-[#1F5EA8] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm flex items-center gap-2 cursor-pointer transition-all shrink-0"
                            >
                                <SlidersHorizontal className="w-3.5 h-3.5" />
                                <span>Adjust Leave Quotas</span>
                            </button>
                        )}
                    </div>

                    {/* 4 Leave Quotas Grid (Circular Pie Charts) */}
                    {(() => {
                        const bal = leaveSummaryData?.leaveBalance || {};
                        const casualTotal = bal.casual?.total ?? 6;
                        const casualUsed = bal.casual?.used ?? 0;
                        const casualAvail = Math.max(0, casualTotal - casualUsed);

                        const sickTotal = bal.sick?.total ?? 6;
                        const sickUsed = bal.sick?.used ?? 0;
                        const sickAvail = Math.max(0, sickTotal - sickUsed);

                        const earnedTotal = bal.earned?.total ?? 12;
                        const earnedUsed = bal.earned?.used ?? 0;
                        const earnedAvail = Math.max(0, earnedTotal - earnedUsed);

                        const compOffTotal = bal.compOff?.total ?? 0;
                        const compOffUsed = bal.compOff?.used ?? 0;
                        const compOffAvail = Math.max(0, compOffTotal - compOffUsed);

                        const quotas = [
                            { label: "Casual Leave", avail: casualAvail, used: casualUsed, total: casualTotal, color: "#38BDF8", textColor: "text-sky-600" },
                            { label: "Sick Leave", avail: sickAvail, used: sickUsed, total: sickTotal, color: "#F59E0B", textColor: "text-amber-600" },
                            { label: "Earned Leave", avail: earnedAvail, used: earnedUsed, total: earnedTotal, color: "#10B981", textColor: "text-emerald-600" },
                            { label: "Comp Offs", avail: compOffAvail, used: compOffUsed, total: compOffTotal, color: "#A855F7", textColor: "text-purple-600" }
                        ];

                        const radius = 54;
                        const strokeWidth = 11;
                        const circumference = 2 * Math.PI * radius;

                        return (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {quotas.map((q, idx) => {
                                    const pct = q.total > 0 ? Math.min(100, Math.round((q.avail / q.total) * 100)) : 0;
                                    const strokeDashoffset = circumference - (pct / 100) * circumference;

                                    return (
                                        <div key={idx} className="premium-3d-card p-5 flex flex-col justify-between min-h-[310px] space-y-3 relative">
                                            {/* Header */}
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-[#1E1E1E] text-xs font-extrabold">{q.label}</h4>
                                                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${q.textColor} bg-gray-50 border border-gray-150`}>
                                                    {pct}% Left
                                                </span>
                                            </div>

                                            {/* Circular Progress Donut / Pie */}
                                            <div className="flex justify-center items-center py-2 relative">
                                                <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
                                                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 130 130">
                                                        {/* Background track */}
                                                        <circle
                                                            cx="65"
                                                            cy="65"
                                                            r={radius}
                                                            className="stroke-gray-100 fill-none"
                                                            strokeWidth={strokeWidth}
                                                        />
                                                        {/* Active progress stroke */}
                                                        <circle
                                                            cx="65"
                                                            cy="65"
                                                            r={radius}
                                                            fill="none"
                                                            stroke={q.color}
                                                            strokeWidth={strokeWidth}
                                                            strokeDasharray={circumference}
                                                            strokeDashoffset={strokeDashoffset}
                                                            strokeLinecap="round"
                                                            className="transition-all duration-700 ease-out"
                                                        />
                                                    </svg>
                                                    <div className="absolute flex flex-col items-center justify-center text-center pointer-events-none select-none">
                                                        <span className="text-[#1E1E1E] text-base font-black leading-none">
                                                            {q.avail} <span className="text-[11px] font-extrabold text-gray-500">Days</span>
                                                        </span>
                                                        <span className="text-gray-400 text-[8.5px] font-bold mt-1 uppercase tracking-wider">
                                                            Available
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Bottom Metrics Grid */}
                                            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-100 text-center select-none">
                                                <div>
                                                    <span className="text-[9.5px] text-gray-400 font-extrabold uppercase block">Consumed</span>
                                                    <span className="text-xs font-extrabold text-gray-800 font-mono mt-0.5 block">{q.used}</span>
                                                </div>
                                                <div>
                                                    <span className="text-[9.5px] text-gray-400 font-extrabold uppercase block">Total</span>
                                                    <span className="text-xs font-extrabold text-[#2D79C7] font-mono mt-0.5 block">{q.total}</span>
                                                </div>
                                                <div>
                                                    <span className="text-[9.5px] text-gray-400 font-extrabold uppercase block">Accrued</span>
                                                    <span className="text-xs font-extrabold text-emerald-600 font-mono mt-0.5 block">{q.total}</span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })()}

                    {/* Leave Requests & History Table */}
                    <div className="premium-3d-card p-5 space-y-4">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <h4 className="text-[#1E1E1E] text-xs font-extrabold flex items-center gap-2">
                                <History className="w-4 h-4 text-[#2D79C7]" />
                                <span>Leave Requests & Application History</span>
                            </h4>
                            <span className="text-gray-400 text-xs font-bold">
                                {leaveHistoryList.length} Application{leaveHistoryList.length !== 1 ? "s" : ""}
                            </span>
                        </div>

                        <div className="overflow-x-auto w-full">
                            <table className="w-full border-collapse text-left min-w-[700px] whitespace-nowrap">
                                <thead>
                                    <tr className="border-b border-gray-200 bg-[#F8FAFC] text-gray-500 text-[10px] uppercase font-extrabold tracking-wider select-none">
                                        <th className="py-3 px-4 font-extrabold">Leave Dates</th>
                                        <th className="py-3 px-4 font-extrabold">Leave Type</th>
                                        <th className="py-3 px-4 font-extrabold">Days</th>
                                        <th className="py-3 px-4 font-extrabold">Reason / Note</th>
                                        <th className="py-3 px-4 font-extrabold">Requested On</th>
                                        <th className="py-3 px-4 font-extrabold text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 text-xs font-semibold text-gray-700">
                                    {loadingLeaves ? (
                                        <tr>
                                            <td colSpan="6" className="py-10 text-center text-gray-400 font-bold">
                                                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-[#2D79C7]" />
                                                <span>Loading leave history...</span>
                                            </td>
                                        </tr>
                                    ) : leaveHistoryList.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="py-10 text-center text-gray-400 font-bold select-none">
                                                <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 text-[#2D79C7] flex items-center justify-center mx-auto mb-2">
                                                    <Umbrella className="w-5 h-5" />
                                                </div>
                                                <p>No leave requests or applications submitted yet.</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        leaveHistoryList.map((req, idx) => {
                                            const startStr = req.startDate ? new Date(req.startDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "--";
                                            const endStr = req.endDate ? new Date(req.endDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "--";
                                            const dateRange = startStr === endStr ? startStr : `${startStr} - ${endStr}`;
                                            const reqDate = req.createdAt ? new Date(req.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "--";
                                            const formatType = (t) => {
                                                if (t === "casual_leave") return "Casual Leave";
                                                if (t === "sick_leave") return "Sick Leave";
                                                if (t === "earned_leave") return "Earned Leave";
                                                if (t === "partial_leave") return "Partial Leave";
                                                if (t === "unpaid_leave") return "Unpaid Leave";
                                                return t || "Leave";
                                            };

                                            return (
                                                <tr key={req._id || idx} className="hover:bg-[#F8FAFC]/70 transition-colors">
                                                    <td className="py-3.5 px-4 font-mono font-bold text-gray-900">
                                                        {dateRange}
                                                    </td>
                                                    <td className="py-3.5 px-4 font-bold text-[#2D79C7]">
                                                        {formatType(req.leaveType)}
                                                    </td>
                                                    <td className="py-3.5 px-4 font-mono text-gray-700">
                                                        {req.totalDays || 1} Day{(req.totalDays || 1) > 1 ? "s" : ""}
                                                    </td>
                                                    <td className="py-3.5 px-4 max-w-[200px] truncate text-gray-600 font-medium" title={req.reason}>
                                                        {req.reason || "--"}
                                                    </td>
                                                    <td className="py-3.5 px-4 font-mono text-gray-400">
                                                        {reqDate}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-center">
                                                        <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                                                            req.status?.toLowerCase() === "approved"
                                                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                                : req.status?.toLowerCase() === "pending"
                                                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                                                : "bg-rose-50 text-rose-700 border-rose-200"
                                                        }`}>
                                                            {req.status ? req.status.charAt(0).toUpperCase() + req.status.slice(1) : "Pending"}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ─────────────────────────────────────────────
               TAB 5: DOCUMENTS
            ───────────────────────────────────────────── */}
            {activeTab === "Documents" && (
                <div className="space-y-6">
                    {/* Primary Government ID Section (Aadhaar & PAN) */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <h3 className="text-[#1E1E1E] text-sm font-extrabold flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4 text-[#2D79C7]" />
                                    <span>Government Identification & Verification</span>
                                </h3>
                                <p className="text-gray-400 text-[11px] font-medium mt-0.5">
                                    Mandatory identity documents for payroll, tax verification & legal compliance.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {/* Aadhaar Card */}
                            <div className="premium-3d-card p-5 bg-white border border-gray-150 rounded-2xl flex flex-col justify-between space-y-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#2D79C7]">
                                            <ShieldCheck className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="text-[#1E1E1E] text-sm font-extrabold">Aadhaar Card</h4>
                                            <p className="text-gray-400 text-[11px] font-medium">Unique Identification Authority of India</p>
                                        </div>
                                    </div>
                                    {aadhaarDoc?.url ? (
                                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Uploaded & Verified
                                        </span>
                                    ) : (
                                        <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3 text-amber-600" /> Pending Upload
                                        </span>
                                    )}
                                </div>

                                <div className="bg-[#F8FAFC] border border-gray-150 p-3.5 rounded-xl space-y-1">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-gray-400 font-bold uppercase text-[10px]">Aadhaar Number</span>
                                        <span className="text-[#1E1E1E] font-mono font-bold tracking-wider">
                                            {employee?.aadhaarNumber || aadhaarDoc?.numberOrTag || "Not Provided"}
                                        </span>
                                    </div>
                                    {aadhaarDoc?.uploadedAt && (
                                        <div className="flex items-center justify-between text-[10.5px] text-gray-400 font-medium pt-1 border-t border-gray-100">
                                            <span>Uploaded On</span>
                                            <span>{formatDateStr(aadhaarDoc.uploadedAt)}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 pt-1">
                                    {aadhaarDoc?.url ? (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => setDocModalFile({ name: "Aadhaar Card", tag: aadhaarDoc.numberOrTag || employee?.aadhaarNumber || "Aadhaar", type: "Government ID", url: aadhaarDoc.url })}
                                                className="flex-1 flex items-center justify-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold py-2 rounded-xl transition-all cursor-pointer"
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                                <span>Preview</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => window.open(aadhaarDoc.url, "_blank")}
                                                className="flex-1 flex items-center justify-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-[#2D79C7] border border-blue-100 text-xs font-bold py-2 rounded-xl transition-all cursor-pointer"
                                            >
                                                <Download className="w-3.5 h-3.5" />
                                                <span>Download</span>
                                            </button>
                                            {canEdit && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenGovDocModal("aadhaar")}
                                                    className="p-2 text-gray-400 hover:text-[#2D79C7] border border-gray-200 rounded-xl transition-colors cursor-pointer"
                                                    title="Update / Re-upload Aadhaar"
                                                >
                                                    <Edit3 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </>
                                    ) : (
                                        canEdit ? (
                                            <button
                                                type="button"
                                                onClick={() => handleOpenGovDocModal("aadhaar")}
                                                className="w-full flex items-center justify-center gap-1.5 bg-[#2D79C7] hover:bg-[#1F5EA8] text-white text-xs font-bold py-2.5 rounded-xl transition-all shadow-sm cursor-pointer"
                                            >
                                                <Upload className="w-3.5 h-3.5" />
                                                <span>Upload Aadhaar Card</span>
                                            </button>
                                        ) : (
                                            <p className="text-gray-400 text-xs italic text-center w-full py-1">Document not uploaded by employee</p>
                                        )
                                    )}
                                </div>
                            </div>

                            {/* PAN Card */}
                            <div className="premium-3d-card p-5 bg-white border border-gray-150 rounded-2xl flex flex-col justify-between space-y-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                                            <CreditCard className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="text-[#1E1E1E] text-sm font-extrabold">PAN Card</h4>
                                            <p className="text-gray-400 text-[11px] font-medium">Income Tax Department of India</p>
                                        </div>
                                    </div>
                                    {panDoc?.url ? (
                                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Uploaded & Verified
                                        </span>
                                    ) : (
                                        <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3 text-amber-600" /> Pending Upload
                                        </span>
                                    )}
                                </div>

                                <div className="bg-[#F8FAFC] border border-gray-150 p-3.5 rounded-xl space-y-1">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-gray-400 font-bold uppercase text-[10px]">PAN Number</span>
                                        <span className="text-[#1E1E1E] font-mono font-bold tracking-wider uppercase">
                                            {employee?.panNumber || panDoc?.numberOrTag || "Not Provided"}
                                        </span>
                                    </div>
                                    {panDoc?.uploadedAt && (
                                        <div className="flex items-center justify-between text-[10.5px] text-gray-400 font-medium pt-1 border-t border-gray-100">
                                            <span>Uploaded On</span>
                                            <span>{formatDateStr(panDoc.uploadedAt)}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 pt-1">
                                    {panDoc?.url ? (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => setDocModalFile({ name: "PAN Card", tag: panDoc.numberOrTag || employee?.panNumber || "PAN", type: "Government ID", url: panDoc.url })}
                                                className="flex-1 flex items-center justify-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold py-2 rounded-xl transition-all cursor-pointer"
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                                <span>Preview</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => window.open(panDoc.url, "_blank")}
                                                className="flex-1 flex items-center justify-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-[#2D79C7] border border-blue-100 text-xs font-bold py-2 rounded-xl transition-all cursor-pointer"
                                            >
                                                <Download className="w-3.5 h-3.5" />
                                                <span>Download</span>
                                            </button>
                                            {canEdit && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenGovDocModal("pan")}
                                                    className="p-2 text-gray-400 hover:text-[#2D79C7] border border-gray-200 rounded-xl transition-colors cursor-pointer"
                                                    title="Update / Re-upload PAN"
                                                >
                                                    <Edit3 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </>
                                    ) : (
                                        canEdit ? (
                                            <button
                                                type="button"
                                                onClick={() => handleOpenGovDocModal("pan")}
                                                className="w-full flex items-center justify-center gap-1.5 bg-[#2D79C7] hover:bg-[#1F5EA8] text-white text-xs font-bold py-2.5 rounded-xl transition-all shadow-sm cursor-pointer"
                                            >
                                                <Upload className="w-3.5 h-3.5" />
                                                <span>Upload PAN Card</span>
                                            </button>
                                        ) : (
                                            <p className="text-gray-400 text-xs italic text-center w-full py-1">Document not uploaded by employee</p>
                                        )
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Secondary Section: Other Company & Compliance Documents */}
                    <div className="pt-4 border-t border-gray-150">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h4 className="text-[#1E1E1E] text-xs font-bold uppercase tracking-wider">Other Uploaded Documents</h4>
                                <p className="text-gray-400 text-[11px] font-medium">Contracts, educational degrees, and miscellaneous files.</p>
                            </div>
                            {canEdit && (
                                <button
                                    type="button"
                                    onClick={() => setShowDocModal(true)}
                                    className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 text-xs font-bold px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                                >
                                    <Plus className="w-3.5 h-3.5 text-[#2D79C7]" />
                                    <span>Upload Other Document</span>
                                </button>
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {otherDocuments.length === 0 ? (
                                <div className="col-span-full py-10 text-center select-none bg-slate-50/50 rounded-[20px] border border-dashed border-slate-200 animate-fadeIn">
                                    <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-[#2D79C7] mx-auto mb-2">
                                        <FileText className="w-4 h-4" />
                                    </div>
                                    <h4 className="text-slate-700 text-xs font-bold">No additional documents uploaded</h4>
                                    <p className="text-slate-400 text-[11px] mt-0.5">Other certificates and compliance agreements will appear here.</p>
                                </div>
                            ) : (
                                otherDocuments.map((doc, idx) => (
                                    <div key={idx} className="premium-3d-card p-5 flex flex-col justify-between space-y-4 relative group">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#2D79C7]">
                                                <FileText className="w-5 h-5" />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md">
                                                    {doc.status || "Verified"}
                                                </span>
                                                {canEdit && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteDocument(currentDocuments.indexOf(doc))}
                                                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-rose-600 transition-opacity cursor-pointer"
                                                        title="Delete Document"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <div>
                                            <h4 className="text-[#1E1E1E] text-sm font-bold">{doc.name}</h4>
                                            <p className="text-gray-400 text-xs mt-0.5">{doc.category}</p>
                                            {doc.numberOrTag && (
                                                <p className="text-gray-500 font-mono text-xs font-bold mt-2">
                                                    {doc.numberOrTag}
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                                            <button
                                                type="button"
                                                onClick={() => setDocModalFile({ name: doc.name, tag: doc.numberOrTag || "Doc-Preview", type: doc.category, url: doc.url })}
                                                className="flex-1 flex items-center justify-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold py-2 rounded-xl transition-all cursor-pointer"
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                                <span>View</span>
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (doc.url) {
                                                        window.open(doc.url, "_blank");
                                                    } else {
                                                        toast.info("No download URL available.");
                                                    }
                                                }}
                                                className="flex-1 flex items-center justify-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-[#2D79C7] border border-blue-100 text-xs font-bold py-2 rounded-xl transition-all cursor-pointer"
                                            >
                                                <Download className="w-3.5 h-3.5" />
                                                <span>Download</span>
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ─────────────────────────────────────────────
               TAB 5: ASSETS
            ───────────────────────────────────────────── */}
            {activeTab === "Assets" && (
                <div className="space-y-6">
                    {/* Header Row above Assets Grid */}
                    <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-[20px] border border-slate-200/80 shadow-2xs">
                        <div>
                            <h3 className="text-[#1E1E1E] text-sm font-extrabold flex items-center gap-2">
                                <Laptop className="w-4.5 h-4.5 text-[#2D79C7]" />
                                <span>Assigned Corporate Assets</span>
                            </h3>
                            <p className="text-gray-400 text-xs mt-0.5">
                                Official devices, hardware, and IT equipment allocated to you
                            </p>
                        </div>

                        {/* Top Right Corner Request Button for Employees other than Global Admin */}
                        {userRole !== "global_admin" && userRole !== "admin" && (
                            <button
                                type="button"
                                onClick={() => {
                                    setRequestAssetType("Monitor");
                                    setRequestAssetComment("");
                                    setShowRequestAssetModal(true);
                                }}
                                className="flex items-center gap-2 px-4 py-2.5 bg-[#2D79C7] hover:bg-[#2063A6] text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer active:scale-95"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Request New Asset</span>
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {loadingAssets ? (
                            <div className="col-span-full py-12 text-center text-slate-400 font-bold">
                                Loading assigned assets...
                            </div>
                        ) : userAssets.length === 0 ? (
                            <div className="col-span-full py-12 text-center select-none bg-slate-50/50 rounded-[20px] border border-dashed border-slate-200 animate-fadeIn">
                                <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-[#2D79C7] mx-auto mb-3">
                                    <Laptop className="w-5 h-5" />
                                </div>
                                <h4 className="text-slate-850 text-xs font-bold">No assets assigned yet</h4>
                                <p className="text-slate-400 text-[11px] mt-1">Devices and items assigned to this employee from the Assets tab will appear here.</p>
                            </div>
                        ) : (
                            userAssets.map((asset, idx) => {
                                const isAck = asset.acknowledgmentStatus === "Acknowledged";
                                return (
                                <div key={asset._id || idx} className="premium-3d-card p-6 space-y-4 relative group">
                                    <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#2D79C7]">
                                                {getCategoryIcon(asset.category)}
                                            </div>
                                            <div>
                                                <h4 className="text-[#1E1E1E] text-xs font-extrabold">{asset.brandModel || asset.name || asset.category}</h4>
                                                <p className="text-gray-400 text-[10.5px]">{asset.category}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-bold px-2 py-0.5 rounded">
                                                {asset.status || "Assigned"}
                                            </span>
                                            {isAck ? (
                                                <span className="bg-emerald-100/70 text-emerald-800 border border-emerald-200 text-[9.5px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                                                    <CheckCircle className="w-3 h-3 text-emerald-600" />
                                                    <span>Acknowledged</span>
                                                </span>
                                            ) : (
                                                <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[9.5px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                                    <Clock className="w-3 h-3 text-amber-600" />
                                                    <span>Ack Pending</span>
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-2 text-xs text-gray-600 font-medium">
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Asset Code:</span>
                                            <span className="font-mono font-bold text-[#1E1E1E]">{asset.assetId || asset.assetCode || asset.assetTag || asset.serialNumber || `${empCode}-AST`}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Issued Date:</span>
                                            <span className="font-semibold text-gray-700">{formatDateStr(asset.assignedDate || asset.issuedDate || asset.createdAt)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Condition:</span>
                                            <span className="text-emerald-600 font-bold">{asset.condition || "Excellent"}</span>
                                        </div>
                                        {isAck && asset.acknowledgedAt && (
                                            <div className="flex justify-between text-[11px] text-emerald-700 pt-1 border-t border-emerald-100/60">
                                                <span>Confirmed On:</span>
                                                <span className="font-semibold">{formatDateStr(asset.acknowledgedAt)}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Action button if pending acknowledgment and viewing own profile */}
                                    {!isAck && isOwnProfile && asset._id && (
                                        <div className="pt-2 border-t border-gray-100">
                                            <button
                                                type="button"
                                                onClick={() => handleAcknowledgeAsset(asset)}
                                                disabled={acknowledgingId === asset._id}
                                                className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
                                            >
                                                {acknowledgingId === asset._id ? (
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                ) : (
                                                    <Check className="w-3.5 h-3.5" />
                                                )}
                                                <span>Acknowledge Receipt</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            );
                            })
                        )}
                    </div>
                </div>
            )}

            {/* ─────────────────────────────────────────────
               TAB 6: ACTIVITY TIMELINE
            ───────────────────────────────────────────── */}
            {activeTab === "Activity" && (
                <div className="premium-3d-card p-6 sm:p-8 space-y-6">
                    <h3 className="text-[#1E1E1E] text-sm font-extrabold flex items-center gap-2 border-b border-gray-150 pb-3">
                        <History className="w-4.5 h-4.5 text-[#2D79C7]" />
                        <span>Recent Employee Activity & Audit Log</span>
                    </h3>

                    {currentActivities.length === 0 ? (
                        <div className="py-12 text-center select-none bg-slate-50/50 rounded-[20px] border border-dashed border-slate-200 animate-fadeIn">
                            <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-[#2D79C7] mx-auto mb-3">
                                <History className="w-5 h-5" />
                            </div>
                            <h4 className="text-slate-850 text-xs font-bold">No activity recorded yet</h4>
                            <p className="text-slate-400 text-[11px] mt-1">Real-time profile updates, attendance logs, and leave actions for {empName} will appear here as they occur.</p>
                        </div>
                    ) : (
                        <div className="relative pl-6 space-y-6 border-l-2 border-blue-100 ml-3 pt-2">
                            {currentActivities.map((act, idx) => (
                                <div key={idx} className="relative">
                                    <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-[#2D79C7] border-4 border-white shadow-sm flex items-center justify-center" />
                                    <div className="bg-[#F8FAFC] border border-gray-200 p-4 rounded-2xl space-y-1">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-[#1E1E1E] text-xs font-bold">{act.title}</h4>
                                            <span className="text-[10.5px] font-mono text-gray-400">{formatDateStr(act.timestamp)}</span>
                                        </div>
                                        <p className="text-gray-600 text-xs font-medium">
                                            {act.description}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ─────────────────────────────────────────────
               EDIT PROFILE DRAWER
            ───────────────────────────────────────────── */}
            {isEditDrawerOpen && (
                <div className="fixed inset-0 z-50 overflow-hidden">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setIsEditDrawerOpen(false)} />
                    <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
                        <div className="w-screen max-w-lg bg-white shadow-2xl border-l border-gray-200 flex flex-col justify-between">
                            
                            <div className="px-6 py-5 bg-[#F8FAFC] border-b border-gray-200 flex items-center justify-between">
                                <div>
                                    <h3 className="text-[#1E1E1E] text-base font-extrabold flex items-center gap-2">
                                        <Edit3 className="w-4 h-4 text-[#2D79C7]" />
                                        <span>Edit Personal Profile</span>
                                    </h3>
                                    <p className="text-gray-400 text-xs font-medium mt-0.5">
                                        Update your personal info, skills, and emergency contact.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setIsEditDrawerOpen(false)}
                                    className="p-1.5 rounded-xl hover:bg-gray-200 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form id="edit-profile-form" onSubmit={handleSaveProfile} className="p-6 overflow-y-auto space-y-5 flex-1">
                                <div className="space-y-2">
                                    <label className="text-gray-700 text-xs font-bold block">Profile Picture</label>
                                    <div className="flex items-center gap-4">
                                        <Avatar src={editForm.profilePicture || employee?.profilePicture} name={empName} size="w-14 h-14" />
                                        <label className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-[#2D79C7] border border-blue-100 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer">
                                            {uploadingPic ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                                            <span>{uploadingPic ? "Uploading..." : "Upload New Photo"}</span>
                                            <input type="file" accept="image/*" onChange={handleProfilePicUpload} className="hidden" />
                                        </label>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-gray-700 text-xs font-bold block">Phone Number</label>
                                    <input
                                        type="text"
                                        value={editForm.phoneNumber}
                                        onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                                        placeholder="+91 98765 43210"
                                        className="w-full bg-[#F8FAFC] border border-gray-200 rounded-xl px-3.5 py-2 text-xs font-medium focus:outline-none focus:border-[#2D79C7]"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-gray-700 text-xs font-bold block">About Me / Bio</label>
                                    <textarea
                                        rows="3"
                                        value={editForm.aboutMe}
                                        onChange={(e) => setEditForm({ ...editForm, aboutMe: e.target.value })}
                                        placeholder="Write a brief bio..."
                                        className="w-full bg-[#F8FAFC] border border-gray-200 rounded-xl p-3 text-xs font-medium focus:outline-none focus:border-[#2D79C7] resize-none"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-gray-700 text-xs font-bold block">Skills (Comma separated)</label>
                                    <input
                                        type="text"
                                        value={editForm.skills}
                                        onChange={(e) => setEditForm({ ...editForm, skills: e.target.value })}
                                        placeholder="React, Node.js, HR Management"
                                        className="w-full bg-[#F8FAFC] border border-gray-200 rounded-xl px-3.5 py-2 text-xs font-medium focus:outline-none focus:border-[#2D79C7]"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-gray-700 text-xs font-bold block">Interests & Hobbies (Comma separated)</label>
                                    <input
                                        type="text"
                                        value={editForm.interests}
                                        onChange={(e) => setEditForm({ ...editForm, interests: e.target.value })}
                                        placeholder="Photography, Tech Blogs, Badminton"
                                        className="w-full bg-[#F8FAFC] border border-gray-200 rounded-xl px-3.5 py-2 text-xs font-medium focus:outline-none focus:border-[#2D79C7]"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-gray-700 text-xs font-bold block">Date of Birth</label>
                                        <input
                                            type="date"
                                            value={editForm.dateOfBirth}
                                            onChange={(e) => setEditForm({ ...editForm, dateOfBirth: e.target.value })}
                                            className="w-full bg-[#F8FAFC] border border-gray-200 rounded-xl px-3.5 py-2 text-xs font-medium focus:outline-none focus:border-[#2D79C7]"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-gray-700 text-xs font-bold block">Gender</label>
                                        <select
                                            value={editForm.gender}
                                            onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                                            className="w-full bg-[#F8FAFC] border border-gray-200 rounded-xl px-3.5 py-2 text-xs font-medium focus:outline-none focus:border-[#2D79C7]"
                                        >
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-3 pt-2 border-t border-gray-150">
                                    <h4 className="text-xs font-extrabold text-[#1E1E1E]">Emergency Contact Details</h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <label className="text-gray-700 text-[11px] font-bold block">Contact Name</label>
                                            <input
                                                type="text"
                                                value={editForm.emergencyContactName}
                                                onChange={(e) => setEditForm({ ...editForm, emergencyContactName: e.target.value })}
                                                placeholder="Ramesh Kumar"
                                                className="w-full bg-[#F8FAFC] border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-[#2D79C7]"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-gray-700 text-[11px] font-bold block">Relationship</label>
                                            <input
                                                type="text"
                                                value={editForm.emergencyContactRelation}
                                                onChange={(e) => setEditForm({ ...editForm, emergencyContactRelation: e.target.value })}
                                                placeholder="Father / Spouse"
                                                className="w-full bg-[#F8FAFC] border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:border-[#2D79C7]"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-gray-700 text-[11px] font-bold block">Contact Phone Number</label>
                                        <input
                                            type="text"
                                            value={editForm.emergencyContactNumber}
                                            onChange={(e) => setEditForm({ ...editForm, emergencyContactNumber: e.target.value })}
                                            placeholder="+91 98123 45678"
                                            className="w-full bg-[#F8FAFC] border border-gray-200 rounded-xl px-3.5 py-2 text-xs font-medium focus:outline-none focus:border-[#2D79C7]"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3 pt-2 border-t border-gray-150">
                                    <div className="space-y-1.5">
                                        <label className="text-gray-700 text-xs font-bold block">Present Address</label>
                                        <textarea
                                            rows="2"
                                            value={editForm.presentAddress}
                                            onChange={(e) => setEditForm({ ...editForm, presentAddress: e.target.value })}
                                            placeholder="Enter present address..."
                                            className="w-full bg-[#F8FAFC] border border-gray-200 rounded-xl p-3 text-xs font-medium focus:outline-none focus:border-[#2D79C7] resize-none"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-gray-700 text-xs font-bold block">Permanent Address</label>
                                        <textarea
                                            rows="2"
                                            value={editForm.permanentAddress}
                                            onChange={(e) => setEditForm({ ...editForm, permanentAddress: e.target.value })}
                                            placeholder="Enter permanent address..."
                                            className="w-full bg-[#F8FAFC] border border-gray-200 rounded-xl p-3 text-xs font-medium focus:outline-none focus:border-[#2D79C7] resize-none"
                                        />
                                    </div>
                                </div>
                            </form>

                            <div className="px-6 py-4 bg-[#F8FAFC] border-t border-gray-200 flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsEditDrawerOpen(false)}
                                    className="bg-white border border-gray-200 text-gray-700 text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    form="edit-profile-form"
                                    disabled={saving}
                                    className="bg-[#2D79C7] hover:bg-[#1F5EA8] text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-sm cursor-pointer flex items-center gap-2"
                                >
                                    {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                    <span>{saving ? "Saving..." : "Save Profile"}</span>
                                </button>
                            </div>

                        </div>
                    </div>
                </div>
            )}

            {/* ─────────────────────────────────────────────
               ADD EDUCATION MODAL
            ───────────────────────────────────────────── */}
            {showEduModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowEduModal(false)} />
                    <div className="bg-white rounded-[24px] border border-gray-100 shadow-2xl z-10 w-full max-w-md p-6 space-y-4 select-none">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <h3 className="text-[#1E1E1E] text-sm font-extrabold flex items-center gap-2">
                                <GraduationCap className="w-4 h-4 text-[#2D79C7]" />
                                <span>{editingEduIdx !== null ? "Edit Educational Qualification" : "Add Educational Qualification"}</span>
                            </h3>
                            <button type="button" onClick={() => { setShowEduModal(false); setEditingEduIdx(null); }} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleAddEducationSubmit} className="space-y-3 text-xs">
                            <div>
                                <label className="text-gray-700 font-bold block mb-1">Degree / Qualification</label>
                                <input
                                    type="text"
                                    value={newEdu.degree}
                                    onChange={(e) => setNewEdu({ ...newEdu, degree: e.target.value })}
                                    placeholder="e.g. Master of Business Administration"
                                    className="w-full bg-[#F8FAFC] border border-gray-200 rounded-xl p-2.5 font-medium focus:outline-none focus:border-[#2D79C7]"
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-gray-700 font-bold block mb-1">Institution / University</label>
                                <input
                                    type="text"
                                    value={newEdu.institution}
                                    onChange={(e) => setNewEdu({ ...newEdu, institution: e.target.value })}
                                    placeholder="e.g. Delhi University"
                                    className="w-full bg-[#F8FAFC] border border-gray-200 rounded-xl p-2.5 font-medium focus:outline-none focus:border-[#2D79C7]"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-gray-700 font-bold block mb-1">Passing Year</label>
                                    <input
                                        type="text"
                                        value={newEdu.passingYear}
                                        onChange={(e) => setNewEdu({ ...newEdu, passingYear: e.target.value })}
                                        placeholder="e.g. 2021"
                                        className="w-full bg-[#F8FAFC] border border-gray-200 rounded-xl p-2.5 font-medium focus:outline-none focus:border-[#2D79C7]"
                                    />
                                </div>
                                <div>
                                    <label className="text-gray-700 font-bold block mb-1">Qualification Level</label>
                                    <select
                                        value={newEdu.level}
                                        onChange={(e) => setNewEdu({ ...newEdu, level: e.target.value })}
                                        className="w-full bg-[#F8FAFC] border border-gray-200 rounded-xl p-2.5 font-medium focus:outline-none focus:border-[#2D79C7]"
                                    >
                                        <option value="Post Graduate">Post Graduate</option>
                                        <option value="Under Graduate">Under Graduate</option>
                                        <option value="Diploma">Diploma</option>
                                        <option value="Doctorate">Doctorate</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex gap-3 justify-end pt-3 border-t border-gray-100">
                                <button type="button" onClick={() => { setShowEduModal(false); setEditingEduIdx(null); }} className="bg-white border border-gray-200 text-gray-700 font-bold py-2 px-4 rounded-xl cursor-pointer">
                                    Cancel
                                </button>
                                <button type="submit" disabled={saving} className="bg-[#2D79C7] hover:bg-[#1F5EA8] text-white font-bold py-2 px-5 rounded-xl shadow-sm cursor-pointer">
                                    {editingEduIdx !== null ? "Save Changes" : "Add Education"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ─────────────────────────────────────────────
               ADD EXPERIENCE MODAL
            ───────────────────────────────────────────── */}
            {showExpModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowExpModal(false)} />
                    <div className="bg-white rounded-[24px] border border-gray-100 shadow-2xl z-10 w-full max-w-md p-6 space-y-4 select-none">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <h3 className="text-[#1E1E1E] text-sm font-extrabold flex items-center gap-2">
                                <Briefcase className="w-4 h-4 text-[#2D79C7]" />
                                <span>Add Experience Role</span>
                            </h3>
                            <button type="button" onClick={() => setShowExpModal(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleAddExperienceSubmit} className="space-y-3 text-xs">
                            <div>
                                <label className="text-gray-700 font-bold block mb-1">Job Title / Designation</label>
                                <input
                                    type="text"
                                    value={newExp.title}
                                    onChange={(e) => setNewExp({ ...newExp, title: e.target.value })}
                                    placeholder="e.g. Senior Specialist"
                                    className="w-full bg-[#F8FAFC] border border-gray-200 rounded-xl p-2.5 font-medium focus:outline-none focus:border-[#2D79C7]"
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-gray-700 font-bold block mb-1">Company / Organization</label>
                                <input
                                    type="text"
                                    value={newExp.company}
                                    onChange={(e) => setNewExp({ ...newExp, company: e.target.value })}
                                    placeholder="e.g. Idea Fueled HRMS"
                                    className="w-full bg-[#F8FAFC] border border-gray-200 rounded-xl p-2.5 font-medium focus:outline-none focus:border-[#2D79C7]"
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-gray-700 font-bold block mb-1">Period / Tenure</label>
                                <input
                                    type="text"
                                    value={newExp.period}
                                    onChange={(e) => setNewExp({ ...newExp, period: e.target.value })}
                                    placeholder="e.g. 2022 - 2024"
                                    className="w-full bg-[#F8FAFC] border border-gray-200 rounded-xl p-2.5 font-medium focus:outline-none focus:border-[#2D79C7]"
                                />
                            </div>

                            <div>
                                <label className="text-gray-700 font-bold block mb-1">Brief Description</label>
                                <textarea
                                    rows="2"
                                    value={newExp.description}
                                    onChange={(e) => setNewExp({ ...newExp, description: e.target.value })}
                                    placeholder="Key responsibilities or milestones..."
                                    className="w-full bg-[#F8FAFC] border border-gray-200 rounded-xl p-2.5 font-medium focus:outline-none focus:border-[#2D79C7] resize-none"
                                />
                            </div>

                            <div className="flex gap-3 justify-end pt-3 border-t border-gray-100">
                                <button type="button" onClick={() => setShowExpModal(false)} className="bg-white border border-gray-200 text-gray-700 font-bold py-2 px-4 rounded-xl cursor-pointer">
                                    Cancel
                                </button>
                                <button type="submit" disabled={saving} className="bg-[#2D79C7] hover:bg-[#1F5EA8] text-white font-bold py-2 px-5 rounded-xl shadow-sm cursor-pointer">
                                    Add Role
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ─────────────────────────────────────────────
               ADD DOCUMENT MODAL
            ───────────────────────────────────────────── */}
            {showDocModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowDocModal(false)} />
                    <div className="bg-white rounded-[24px] border border-gray-100 shadow-2xl z-10 w-full max-w-md p-6 space-y-4 select-none">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <h3 className="text-[#1E1E1E] text-sm font-extrabold flex items-center gap-2">
                                <FileText className="w-4 h-4 text-[#2D79C7]" />
                                <span>Upload / Add Employee Document</span>
                            </h3>
                            <button type="button" onClick={() => setShowDocModal(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleAddDocumentSubmit} className="space-y-3 text-xs">
                            <div>
                                <label className="text-gray-700 font-bold block mb-1">Document Name</label>
                                <input
                                    type="text"
                                    value={newDoc.name}
                                    onChange={(e) => setNewDoc({ ...newDoc, name: e.target.value })}
                                    placeholder="e.g. Form 16 / Identity Certificate"
                                    className="w-full bg-[#F8FAFC] border border-gray-200 rounded-xl p-2.5 font-medium focus:outline-none focus:border-[#2D79C7]"
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-gray-700 font-bold block mb-1">Category</label>
                                <select
                                    value={newDoc.category}
                                    onChange={(e) => setNewDoc({ ...newDoc, category: e.target.value })}
                                    className="w-full bg-[#F8FAFC] border border-gray-200 rounded-xl p-2.5 font-medium focus:outline-none focus:border-[#2D79C7]"
                                >
                                    <option value="Government ID">Government ID</option>
                                    <option value="National Identification">National Identification</option>
                                    <option value="Agreement">Agreement</option>
                                    <option value="Resume">Resume</option>
                                    <option value="Educational Certificate">Educational Certificate</option>
                                    <option value="Other Compliance Doc">Other Compliance Doc</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-gray-700 font-bold block mb-1">Doc Number / Reference Tag</label>
                                <input
                                    type="text"
                                    value={newDoc.numberOrTag}
                                    onChange={(e) => setNewDoc({ ...newDoc, numberOrTag: e.target.value })}
                                    placeholder="e.g. REF-2026-901"
                                    className="w-full bg-[#F8FAFC] border border-gray-200 rounded-xl p-2.5 font-medium focus:outline-none focus:border-[#2D79C7]"
                                />
                            </div>

                            <div>
                                <label className="text-gray-700 font-bold block mb-1">Attach File (Image / PDF)</label>
                                <input
                                    type="file"
                                    accept="image/*,application/pdf"
                                    onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                            setDocFile(e.target.files[0]);
                                        }
                                    }}
                                    className="w-full bg-[#F8FAFC] border border-gray-200 rounded-xl p-2.5 font-medium focus:outline-none focus:border-[#2D79C7]"
                                    required
                                />
                            </div>

                            <div className="flex gap-3 justify-end pt-3 border-t border-gray-100">
                                <button type="button" onClick={() => { setShowDocModal(false); setDocFile(null); }} className="bg-white border border-gray-200 text-gray-700 font-bold py-2 px-4 rounded-xl cursor-pointer">
                                    Cancel
                                </button>
                                <button type="submit" disabled={saving} className="bg-[#2D79C7] hover:bg-[#1F5EA8] text-white font-bold py-2 px-5 rounded-xl shadow-sm cursor-pointer">
                                    Save Document
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ─────────────────────────────────────────────
               ADD GOVERNMENT ID MODAL (Aadhaar / PAN)
            ───────────────────────────────────────────── */}
            {govDocModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setGovDocModal({ isOpen: false, type: "aadhaar" })} />
                    <div className="bg-white rounded-[24px] border border-gray-100 shadow-2xl z-10 w-full max-w-md p-6 space-y-4 select-none">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <h3 className="text-[#1E1E1E] text-sm font-extrabold flex items-center gap-2">
                                {govDocModal.type === "aadhaar" ? (
                                    <ShieldCheck className="w-4 h-4 text-[#2D79C7]" />
                                ) : (
                                    <CreditCard className="w-4 h-4 text-indigo-600" />
                                )}
                                <span>Upload {govDocModal.type === "aadhaar" ? "Aadhaar Card" : "PAN Card"}</span>
                            </h3>
                            <button
                                type="button"
                                onClick={() => setGovDocModal({ isOpen: false, type: "aadhaar" })}
                                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleGovDocSubmit} className="space-y-4 text-xs">
                            <div>
                                <label className="text-gray-700 font-bold block mb-1">
                                    {govDocModal.type === "aadhaar" ? "Aadhaar Number (12 Digits)" : "PAN Card Number (10 Alphanumeric)"}
                                    <span className="text-rose-500 ml-0.5">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={govDocNumber}
                                    onChange={(e) => setGovDocNumber(e.target.value)}
                                    placeholder={govDocModal.type === "aadhaar" ? "e.g. 1234 5678 9012" : "e.g. ABCDE1234F"}
                                    className="w-full bg-[#F8FAFC] border border-gray-200 rounded-xl p-2.5 font-mono font-medium focus:outline-none focus:border-[#2D79C7] uppercase"
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-gray-700 font-bold block mb-1">
                                    Attach Document File (Image or PDF)
                                    <span className="text-rose-500 ml-0.5">*</span>
                                </label>
                                <input
                                    type="file"
                                    accept="image/*,application/pdf"
                                    onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                            setGovDocFile(e.target.files[0]);
                                        }
                                    }}
                                    className="w-full bg-[#F8FAFC] border border-gray-200 rounded-xl p-2.5 font-medium focus:outline-none focus:border-[#2D79C7] cursor-pointer"
                                    required={!(govDocModal.type === "aadhaar" ? aadhaarDoc?.url : panDoc?.url)}
                                />
                                {(govDocModal.type === "aadhaar" ? aadhaarDoc?.url : panDoc?.url) && (
                                    <p className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3" /> Existing file attached. Upload new file only if replacing.
                                    </p>
                                )}
                            </div>

                            <div className="flex gap-3 justify-end pt-3 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setGovDocModal({ isOpen: false, type: "aadhaar" })}
                                    className="bg-white border border-gray-200 text-gray-700 font-bold py-2 px-4 rounded-xl cursor-pointer hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingGovDoc}
                                    className="bg-[#2D79C7] hover:bg-[#1F5EA8] text-white font-bold py-2 px-5 rounded-xl shadow-sm cursor-pointer disabled:opacity-50"
                                >
                                    {savingGovDoc ? "Uploading..." : `Save ${govDocModal.type === "aadhaar" ? "Aadhaar" : "PAN"}`}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {showAssetModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowAssetModal(false)} />
                    <div className="bg-white rounded-[24px] border border-gray-100 shadow-2xl z-10 w-full max-w-md p-6 space-y-4 select-none">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <h3 className="text-[#1E1E1E] text-sm font-extrabold flex items-center gap-2">
                                <Laptop className="w-4 h-4 text-[#2D79C7]" />
                                <span>Assign Company Asset</span>
                            </h3>
                            <button type="button" onClick={() => setShowAssetModal(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleAddAssetSubmit} className="space-y-3 text-xs">
                            <div>
                                <label className="text-gray-700 font-bold block mb-1">Asset Name</label>
                                <input
                                    type="text"
                                    value={newAsset.name}
                                    onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
                                    placeholder="e.g. Keychron K2 Wireless Keyboard"
                                    className="w-full bg-[#F8FAFC] border border-gray-200 rounded-xl p-2.5 font-medium focus:outline-none focus:border-[#2D79C7]"
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-gray-700 font-bold block mb-1">Asset Tag / Serial Number</label>
                                <input
                                    type="text"
                                    value={newAsset.assetTag}
                                    onChange={(e) => setNewAsset({ ...newAsset, assetTag: e.target.value })}
                                    placeholder="e.g. IF-ACC-904"
                                    className="w-full bg-[#F8FAFC] border border-gray-200 rounded-xl p-2.5 font-medium focus:outline-none focus:border-[#2D79C7]"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-gray-700 font-bold block mb-1">Category</label>
                                    <select
                                        value={newAsset.category}
                                        onChange={(e) => setNewAsset({ ...newAsset, category: e.target.value })}
                                        className="w-full bg-[#F8FAFC] border border-gray-200 rounded-xl p-2.5 font-medium focus:outline-none focus:border-[#2D79C7]"
                                    >
                                        <option value="Hardware Workstation">Hardware Workstation</option>
                                        <option value="Display Monitor">Display Monitor</option>
                                        <option value="Peripherals">Peripherals</option>
                                        <option value="Security Badge">Security Badge</option>
                                        <option value="Mobile Device">Mobile Device</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-gray-700 font-bold block mb-1">Condition</label>
                                    <select
                                        value={newAsset.condition}
                                        onChange={(e) => setNewAsset({ ...newAsset, condition: e.target.value })}
                                        className="w-full bg-[#F8FAFC] border border-gray-200 rounded-xl p-2.5 font-medium focus:outline-none focus:border-[#2D79C7]"
                                    >
                                        <option value="Excellent">Excellent</option>
                                        <option value="Good">Good</option>
                                        <option value="Fair">Fair</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex gap-3 justify-end pt-3 border-t border-gray-100">
                                <button type="button" onClick={() => setShowAssetModal(false)} className="bg-white border border-gray-200 text-gray-700 font-bold py-2 px-4 rounded-xl cursor-pointer">
                                    Cancel
                                </button>
                                <button type="submit" disabled={saving} className="bg-[#2D79C7] hover:bg-[#1F5EA8] text-white font-bold py-2 px-5 rounded-xl shadow-sm cursor-pointer">
                                    Assign Asset
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ─────────────────────────────────────────────
               REQUEST NEW ASSET MODAL (For Employees other than Global Admin)
            ───────────────────────────────────────────── */}
            {showRequestAssetModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
                        onClick={() => !submittingAssetRequest && setShowRequestAssetModal(false)}
                    />
                    <div className="bg-white rounded-[24px] border border-gray-100 shadow-2xl z-10 w-full max-w-lg p-6 sm:p-7 space-y-5 select-none animate-fadeIn">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3.5">
                            <div>
                                <h3 className="text-[#1E1E1E] text-base font-extrabold flex items-center gap-2">
                                    <Laptop className="w-5 h-5 text-[#2D79C7]" />
                                    <span>Request New Asset</span>
                                </h3>
                                <p className="text-gray-400 text-xs mt-0.5">
                                    Select the item you require. Your request will be sent directly to management.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowRequestAssetModal(false)}
                                disabled={submittingAssetRequest}
                                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleRequestAssetSubmit} className="space-y-4">
                            <div>
                                <label className="text-xs font-extrabold text-slate-700 block mb-2">
                                    Select Asset Type <span className="text-rose-500">*</span>
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                    {[
                                        { id: "Monitor", label: "Monitor", icon: Monitor },
                                        { id: "Mouse", label: "Mouse", icon: MouseIcon },
                                        { id: "Keyboard", label: "Keyboard", icon: KeyboardIcon },
                                        { id: "Earphone/Headphone", label: "Earphone / Headphone", icon: Headphones },
                                        { id: "Other", label: "Other", icon: PlusCircle },
                                    ].map((item) => {
                                        const IconComp = item.icon;
                                        const isSelected = requestAssetType === item.id;
                                        return (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onClick={() => setRequestAssetType(item.id)}
                                                className={`p-3 rounded-2xl border text-left flex flex-col justify-between gap-2 transition-all cursor-pointer ${
                                                    isSelected
                                                        ? "border-[#2D79C7] bg-blue-50/70 text-[#2D79C7] ring-2 ring-blue-100 shadow-sm"
                                                        : "border-slate-200 hover:border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                                                }`}
                                            >
                                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                                                    isSelected ? "bg-[#2D79C7] text-white" : "bg-slate-100 text-slate-600"
                                                }`}>
                                                    <IconComp className="w-4 h-4" />
                                                </div>
                                                <span className="text-xs font-bold leading-tight">{item.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Comment box - opens when other is clicked, or optional for other types */}
                            {requestAssetType === "Other" ? (
                                <div className="space-y-1.5 animate-fadeIn">
                                    <label className="text-xs font-extrabold text-slate-700 flex items-center justify-between">
                                        <span>Specify Required Asset &amp; Details <span className="text-rose-500">*</span></span>
                                        <span className="text-[11px] text-amber-600 font-semibold">Required for "Other"</span>
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={requestAssetComment}
                                        onChange={(e) => setRequestAssetComment(e.target.value)}
                                        placeholder="Please tell us which asset you need and why (e.g. Type-C Multiport Adapter, Ergonomic Chair, Web Camera)..."
                                        className="w-full bg-[#F8FAFC] border border-gray-300 rounded-xl p-3 text-xs font-medium focus:outline-none focus:border-[#2D79C7] focus:bg-white resize-none"
                                        required
                                        autoFocus
                                    />
                                </div>
                            ) : (
                                <div className="space-y-1.5">
                                    <label className="text-xs font-extrabold text-slate-700 block">
                                        Additional Notes / Specifications <span className="text-slate-400 font-normal">(Optional)</span>
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={requestAssetComment}
                                        onChange={(e) => setRequestAssetComment(e.target.value)}
                                        placeholder="Any specific preference, model, connectivity port, or reason..."
                                        className="w-full bg-[#F8FAFC] border border-gray-200 rounded-xl p-3 text-xs font-medium focus:outline-none focus:border-[#2D79C7] focus:bg-white resize-none"
                                    />
                                </div>
                            )}


                            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setShowRequestAssetModal(false)}
                                    disabled={submittingAssetRequest}
                                    className="px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-bold rounded-xl transition-all cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submittingAssetRequest}
                                    className="px-5 py-2 bg-[#2D79C7] hover:bg-[#1F5EA8] text-white text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
                                >
                                    {submittingAssetRequest ? (
                                        <>
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            <span>Submitting...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Check className="w-3.5 h-3.5" />
                                            <span>Submit Request</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ─────────────────────────────────────────────
               PREVIEW DOCUMENT MODAL
            ───────────────────────────────────────────── */}
            {docModalFile && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDocModalFile(null)} />
                    <div className="bg-white rounded-[24px] border border-gray-100 shadow-2xl z-10 w-full max-w-md p-6 space-y-4 select-none">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <h3 className="text-[#1E1E1E] text-sm font-extrabold flex items-center gap-2">
                                <FileText className="w-4 h-4 text-[#2D79C7]" />
                                <span>{docModalFile.name}</span>
                            </h3>
                            <button type="button" onClick={() => setDocModalFile(null)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="bg-[#F8FAFC] border border-gray-200 rounded-2xl p-6 text-center space-y-3 select-none max-h-[350px] overflow-y-auto">
                            {docModalFile.url ? (
                                docModalFile.url.match(/\.(jpeg|jpg|gif|png|webp)/i) ? (
                                    <div className="max-h-[220px] overflow-hidden rounded-xl border border-gray-200 bg-white flex items-center justify-center shadow-2xs">
                                        <img src={docModalFile.url} alt={docModalFile.name} className="max-w-full max-h-[210px] object-contain" />
                                    </div>
                                ) : (
                                    <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 text-[#2D79C7] flex items-center justify-center mx-auto shadow-inner">
                                        <FileText className="w-8 h-8" />
                                    </div>
                                )
                            ) : (
                                <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 text-[#2D79C7] flex items-center justify-center mx-auto shadow-inner">
                                    <FileText className="w-8 h-8" />
                                </div>
                            )}
                            <div>
                                <p className="text-xs font-extrabold text-[#1E1E1E]">{docModalFile.type} Preview</p>
                                <p className="text-[11px] font-mono text-gray-400 mt-0.5">{docModalFile.tag}</p>
                            </div>
                            <p className="text-[11px] text-emerald-600 font-bold bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 inline-block select-none">
                                Document Verified & Encrypted
                            </p>
                            {docModalFile.url && (
                                <a 
                                    href={docModalFile.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="text-xs text-[#2D79C7] hover:underline font-bold flex items-center justify-center gap-1 mt-2 cursor-pointer"
                                >
                                    <span>Open file in new tab</span>
                                    <ArrowUpRight className="w-3.5 h-3.5" />
                                </a>
                            )}
                        </div>

                        <div className="flex gap-3 justify-end pt-2">
                            <button type="button" onClick={() => setDocModalFile(null)} className="bg-white border border-gray-200 text-gray-700 text-xs font-bold py-2 px-4 rounded-xl cursor-pointer hover:bg-gray-50">
                                Close
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    if (docModalFile.url) {
                                        window.open(docModalFile.url, "_blank");
                                    } else {
                                        toast.success(`Downloading ${docModalFile.name}...`);
                                    }
                                    setDocModalFile(null);
                                }}
                                className="bg-[#2D79C7] hover:bg-[#1F5EA8] text-white text-xs font-bold py-2 px-5 rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                            >
                                <Download className="w-3.5 h-3.5" />
                                <span>Open / Download</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ─────────────────────────────────────────────
               ADJUST LEAVE QUOTAS MODAL (ADMIN & ASSIGNED HR)
            ───────────────────────────────────────────── */}
            {showEditLeaveModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowEditLeaveModal(false)} />
                    <div className="bg-white rounded-[24px] border border-gray-100 shadow-2xl z-10 w-full max-w-md p-6 space-y-4 select-none animate-fadeIn">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <div>
                                <h3 className="text-[#1E1E1E] text-sm font-extrabold flex items-center gap-2">
                                    <SlidersHorizontal className="w-4 h-4 text-[#2D79C7]" />
                                    <span>Adjust Leave Quotas</span>
                                </h3>
                                <p className="text-gray-400 text-xs font-medium mt-0.5">
                                    Set total annual quota allocations for {empName}.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowEditLeaveModal(false)}
                                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg transition-colors cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveLeaveBalance} className="space-y-4 text-xs">
                            <div className="grid grid-cols-2 gap-3.5">
                                <div className="space-y-1.5">
                                    <label className="text-gray-700 font-bold block flex items-center justify-between">
                                        <span>Casual Leave</span>
                                        <span className="text-[10px] text-sky-600 font-mono">Days</span>
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.5"
                                        value={editLeaveForm.casual}
                                        onChange={(e) => setEditLeaveForm({ ...editLeaveForm, casual: Number(e.target.value) })}
                                        className="w-full bg-[#F8FAFC] border border-gray-200 rounded-xl p-2.5 font-bold text-gray-800 focus:outline-none focus:border-[#2D79C7]"
                                        required
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-gray-700 font-bold block flex items-center justify-between">
                                        <span>Sick Leave</span>
                                        <span className="text-[10px] text-amber-600 font-mono">Days</span>
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.5"
                                        value={editLeaveForm.sick}
                                        onChange={(e) => setEditLeaveForm({ ...editLeaveForm, sick: Number(e.target.value) })}
                                        className="w-full bg-[#F8FAFC] border border-gray-200 rounded-xl p-2.5 font-bold text-gray-800 focus:outline-none focus:border-[#2D79C7]"
                                        required
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-gray-700 font-bold block flex items-center justify-between">
                                        <span>Earned Leave</span>
                                        <span className="text-[10px] text-emerald-600 font-mono">Days</span>
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.5"
                                        value={editLeaveForm.earned}
                                        onChange={(e) => setEditLeaveForm({ ...editLeaveForm, earned: Number(e.target.value) })}
                                        className="w-full bg-[#F8FAFC] border border-gray-200 rounded-xl p-2.5 font-bold text-gray-800 focus:outline-none focus:border-[#2D79C7]"
                                        required
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-gray-700 font-bold block flex items-center justify-between">
                                        <span>Comp Offs</span>
                                        <span className="text-[10px] text-purple-600 font-mono">Days</span>
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.5"
                                        value={editLeaveForm.compOff}
                                        onChange={(e) => setEditLeaveForm({ ...editLeaveForm, compOff: Number(e.target.value) })}
                                        className="w-full bg-[#F8FAFC] border border-gray-200 rounded-xl p-2.5 font-bold text-gray-800 focus:outline-none focus:border-[#2D79C7]"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3 text-[11px] text-[#2D79C7] font-medium flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                <span>Adjusted total quotas will reflect immediately across the employee&apos;s portal & leave ledger.</span>
                            </div>

                            <div className="flex gap-3 justify-end pt-3 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setShowEditLeaveModal(false)}
                                    className="bg-white border border-gray-200 text-gray-700 font-bold py-2 px-4 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingLeaveBalance}
                                    className="bg-[#2D79C7] hover:bg-[#1F5EA8] text-white font-bold py-2 px-5 rounded-xl shadow-sm cursor-pointer flex items-center gap-2 transition-all"
                                >
                                    {savingLeaveBalance && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                    <span>{savingLeaveBalance ? "Saving..." : "Save Quotas"}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ─────────────────────────────────────────────
               IMPORT ATTENDANCE EXCEL MODAL (GLOBAL ADMIN)
            ───────────────────────────────────────────── */}
            {showImportAttendanceModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
                    <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-gray-150 overflow-hidden my-8">
                        {/* Modal Header */}
                        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-emerald-50/50 via-white to-white">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                                    <FileSpreadsheet className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-base font-extrabold text-[#1E1E1E]">Import Attendance via Excel</h3>
                                        <span className="text-[10px] font-extrabold bg-emerald-100/80 text-emerald-800 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                            Admin Action
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 font-medium mt-0.5">
                                        Upload attendance sheet for <span className="font-bold text-gray-800">{empName}</span> ({employee?.employeeId || "Emp"})
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setShowImportAttendanceModal(false);
                                    setImportAttendanceFile(null);
                                    setImportParsedRecords([]);
                                    setImportAttendanceError("");
                                }}
                                className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                                title="Close"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 space-y-5">
                            {/* Template Download Banner */}
                            <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50/70 to-blue-50/40 border border-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex items-start gap-2.5">
                                    <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="text-xs font-bold text-gray-900">Need the sample file format?</h4>
                                        <p className="text-[11px] text-gray-500 font-medium">
                                            Download pre-configured Excel template with column headers (Date, Status, Clock In, Clock Out, Work Mode, Remarks).
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleDownloadAttendanceTemplate}
                                    className="px-3 py-1.5 bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold shadow-xs hover:shadow transition-all flex items-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>Download Template</span>
                                </button>
                            </div>

                            {/* File Upload / Dropzone */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-2">
                                    Upload Spreadsheet File (.xlsx, .xls, .csv)
                                </label>
                                <label className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                                    importAttendanceFile
                                        ? "border-emerald-300 bg-emerald-50/20"
                                        : "border-gray-250 hover:border-emerald-500 hover:bg-[#F8FAFC]"
                                }`}>
                                    <input
                                        type="file"
                                        accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                                        onChange={handleImportAttendanceFileChange}
                                        className="hidden"
                                    />
                                    {importAttendanceFile ? (
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                                                <CheckCircle className="w-5 h-5" />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-xs font-bold text-gray-900 line-clamp-1">{importAttendanceFile.name}</p>
                                                <p className="text-[11px] text-gray-500 font-medium">
                                                    {(importAttendanceFile.size / 1024).toFixed(1)} KB • Click to change file
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="w-12 h-12 rounded-xl bg-gray-100 text-gray-500 flex items-center justify-center mb-2.5">
                                                <Upload className="w-6 h-6 text-emerald-600" />
                                            </div>
                                            <p className="text-xs font-bold text-gray-800">
                                                Click to browse or drag and drop your file here
                                            </p>
                                            <p className="text-[11px] text-gray-400 mt-1">
                                                Supports Microsoft Excel (.xlsx, .xls) and CSV files
                                            </p>
                                        </>
                                    )}
                                </label>
                            </div>

                            {/* Error notification */}
                            {importAttendanceError && (
                                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-700 text-xs">
                                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                    <span>{importAttendanceError}</span>
                                </div>
                            )}

                            {/* Parsed Preview Table */}
                            {importParsedRecords.length > 0 && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-xs font-bold text-gray-800">Spreadsheet Data Preview</h4>
                                            <span className="text-[11px] font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                                                {importParsedRecords.length} Rows Detected
                                            </span>
                                        </div>
                                        <span className="text-[11px] text-gray-400 font-medium">
                                            Showing first {Math.min(importParsedRecords.length, 50)} rows
                                        </span>
                                    </div>

                                    <div className="max-h-56 overflow-y-auto border border-gray-200 rounded-xl bg-white">
                                        <table className="w-full text-left text-xs border-collapse">
                                            <thead className="bg-[#F8FAFC] border-b border-gray-200 text-gray-500 uppercase text-[10px] font-extrabold sticky top-0">
                                                <tr>
                                                    <th className="py-2.5 px-3">#</th>
                                                    <th className="py-2.5 px-3">Date</th>
                                                    <th className="py-2.5 px-3">Status</th>
                                                    <th className="py-2.5 px-3">Clock In</th>
                                                    <th className="py-2.5 px-3">Clock Out</th>
                                                    <th className="py-2.5 px-3">Mode</th>
                                                    <th className="py-2.5 px-3">Remarks</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 text-gray-700 font-medium">
                                                {importParsedRecords.slice(0, 50).map((row, idx) => {
                                                    const statusLower = (row.status || "").toLowerCase();
                                                    let badgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-200";
                                                    if (statusLower.includes("absent")) badgeStyle = "bg-rose-50 text-rose-700 border-rose-200";
                                                    else if (statusLower.includes("half")) badgeStyle = "bg-amber-50 text-amber-700 border-amber-200";
                                                    else if (statusLower.includes("week") || statusLower.includes("off")) badgeStyle = "bg-gray-100 text-gray-600 border-gray-200";
                                                    else if (statusLower.includes("holiday")) badgeStyle = "bg-purple-50 text-purple-700 border-purple-200";

                                                    return (
                                                        <tr key={idx} className="hover:bg-[#F8FAFC]">
                                                            <td className="py-2 px-3 text-gray-400 font-mono text-[11px]">{idx + 1}</td>
                                                            <td className="py-2 px-3 font-bold font-mono text-gray-900">{row.date || "—"}</td>
                                                            <td className="py-2 px-3">
                                                                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${badgeStyle}`}>
                                                                    {row.status}
                                                                </span>
                                                            </td>
                                                            <td className="py-2 px-3 font-mono text-emerald-700 font-semibold">{row.clockIn || "—"}</td>
                                                            <td className="py-2 px-3 font-mono text-gray-700 font-semibold">{row.clockOut || "—"}</td>
                                                            <td className="py-2 px-3 text-gray-600">{row.workMode || "Office"}</td>
                                                            <td className="py-2 px-3 text-gray-500 max-w-[120px] truncate" title={row.remarks}>{row.remarks || "—"}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Informational Note */}
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-gray-600 flex items-start gap-2 font-medium">
                                <AlertCircle className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                                <span>
                                    Imported records will be merged with the employee&apos;s existing ledger. Existing entries on matching dates will be safely updated.
                                </span>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 bg-[#F8FAFC] border-t border-gray-150 flex items-center justify-between gap-3">
                            <div>
                                {importParsedRecords.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setImportAttendanceFile(null);
                                            setImportParsedRecords([]);
                                            setImportAttendanceError("");
                                        }}
                                        className="text-xs font-bold text-gray-500 hover:text-rose-600 transition-colors cursor-pointer"
                                    >
                                        Clear File
                                    </button>
                                )}
                            </div>

                            <div className="flex items-center gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowImportAttendanceModal(false);
                                        setImportAttendanceFile(null);
                                        setImportParsedRecords([]);
                                        setImportAttendanceError("");
                                    }}
                                    className="px-4 py-2 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl text-xs hover:bg-gray-100 transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleImportAttendanceSubmit}
                                    disabled={importingAttendance || importParsedRecords.length === 0}
                                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs shadow-sm flex items-center gap-2 transition-all cursor-pointer"
                                >
                                    {importingAttendance ? (
                                        <>
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            <span>Importing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-100" />
                                            <span>
                                                {importParsedRecords.length > 0
                                                    ? `Import ${importParsedRecords.length} Records`
                                                    : "Import Records"}
                                            </span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ─────────────────────────────────────────────
               CONFIRM DELETE DIALOG
            ───────────────────────────────────────────── */}
            <ConfirmDialog
                isOpen={confirmDelete.isOpen}
                onClose={() => setConfirmDelete({ isOpen: false, title: "", message: "", action: null })}
                onConfirm={() => {
                    if (confirmDelete.action) confirmDelete.action();
                    setConfirmDelete({ isOpen: false, title: "", message: "", action: null });
                }}
                title={confirmDelete.title}
                message={confirmDelete.message}
                confirmText="Yes, Delete"
                cancelText="Cancel"
                type="danger"
            />

            {/* ─────────────────────────────────────────────
               RESIGN & ADMIN EXIT MODALS
            ───────────────────────────────────────────── */}
            <ResignJobModal
                isOpen={isResignModalOpen}
                onClose={() => setIsResignModalOpen(false)}
                onSuccess={() => fetchProfile()}
                employee={employee}
            />

            <AdminInitiateExitModal
                isOpen={isAdminExitModalOpen}
                onClose={() => setIsAdminExitModalOpen(false)}
                onSuccess={() => fetchProfile()}
                employee={employee}
            />

        </div>
    );
};

export default EmployeeProfile;
