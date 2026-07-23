import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    User, Mail, Phone, MapPin, Calendar, Briefcase, Building2,
    Shield, Clock, Edit3, X, Check, Eye, Download, Upload,
    Laptop, Mouse, HardDrive, ShieldCheck, Award, FileText,
    CheckCircle2, AlertCircle, Sparkles, UserCheck, Heart,
    GraduationCap, PhoneCall, History, ExternalLink, ChevronRight,
    Loader2, Camera
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { Avatar, SkeletonLoader } from "../../components/SharedComponents";
import { getEmployeeById, updateEmployee } from "../../services/employee.service";
import { uploadProfilePicture } from "../../services/auth.service";

/* ─────────────────────────────────────────────
   HELPERS & MOCK ENRICHMENTS FOR ENTERPRISE DEMO
───────────────────────────────────────────── */
const formatDateStr = (d) => {
    if (!d) return "—";
    try {
        return new Date(d).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    } catch {
        return String(d);
    }
};

export const EmployeeProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user: currentUser, updateUser } = useAuth();

    const [employee, setEmployee] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("Overview");

    // Drawer state for Edit Profile
    const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploadingPic, setUploadingPic] = useState(false);
    
    // Preview document modal
    const [docModalFile, setDocModalFile] = useState(null);

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

    // Determine if viewing logged-in user's profile
    const isOwnProfile = useMemo(() => {
        if (!id) return true;
        if (id === "me") return true;
        if (currentUser && (id === currentUser._id || id === currentUser.employeeId)) return true;
        if (employee && currentUser && employee._id === currentUser._id) return true;
        return false;
    }, [id, currentUser, employee]);

    // Fetch employee data
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
            // Fallback to currentUser if own profile
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

    // Populate edit form when opening drawer
    const openEditDrawer = () => {
        if (!employee) return;
        setEditForm({
            phoneNumber: employee.phoneNumber || "",
            aboutMe: employee.aboutMe || "Experienced professional passionate about operational excellence, workforce strategy, and digital innovation at Idea Fueled.",
            skills: Array.isArray(employee.skills) ? employee.skills.join(", ") : (employee.skills || "React.js, Node.js, HR Management, Team Leadership, Analytics"),
            interests: Array.isArray(employee.interests) ? employee.interests.join(", ") : (employee.interests || "Photography, Technology, Reading, Badminton, Chess"),
            dateOfBirth: employee.dateOfBirth ? new Date(employee.dateOfBirth).toISOString().split("T")[0] : "",
            gender: employee.gender || "Male",
            bloodGroup: employee.bloodGroup || "O+",
            fatherName: employee.fatherName || "",
            emergencyContactName: employee.emergencyContactName || "Ramesh Kumar",
            emergencyContactRelation: employee.emergencyContactRelation || "Father",
            emergencyContactNumber: employee.emergencyContactNumber || employee.phoneNumber || "",
            presentAddress: employee.presentAddress || "",
            permanentAddress: employee.permanentAddress || "",
            profilePicture: employee.profilePicture || ""
        });
        setIsEditDrawerOpen(true);
    };

    // Handle profile picture file upload inside Edit Drawer
    const handleProfilePicUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            setUploadingPic(true);
            const formData = new FormData();
            formData.append("image", file);

            const res = await uploadProfilePicture(formData);
            if (res.data?.success && res.data.imageUrl) {
                setEditForm(prev => ({ ...prev, profilePicture: res.data.imageUrl }));
                toast.success("Profile picture uploaded!");
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

    // Submit Edit Profile Form
    const handleSaveProfile = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const empIdToUpdate = employee._id || currentUser._id;
            
            const payload = {
                ...editForm,
                skills: typeof editForm.skills === "string" ? editForm.skills.split(",").map(s => s.trim()).filter(Boolean) : editForm.skills,
                interests: typeof editForm.interests === "string" ? editForm.interests.split(",").map(i => i.trim()).filter(Boolean) : editForm.interests
            };

            const res = await updateEmployee(empIdToUpdate, payload);
            if (res.data?.success) {
                toast.success("Profile updated successfully!");
                setIsEditDrawerOpen(false);
                if (isOwnProfile && updateUser) {
                    updateUser(res.data.employee || { ...employee, ...payload });
                }
                await fetchProfile();
            } else {
                toast.error(res.data?.message || "Failed to update profile.");
            }
        } catch (err) {
            console.error("Update profile error:", err);
            toast.error("Failed to update profile details.");
        } finally {
            setSaving(false);
        }
    };

    // Derived Display Data with realistic enterprise fallbacks
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
    
    const managerName = employee?.managerId?.fullName 
        ? employee.managerId.fullName 
        : (typeof employee?.managerId === "string" ? employee.managerId : "Anirudh Joshi");

    const dottedManagerName = employee?.dottedManagerId?.fullName 
        ? employee.dottedManagerId.fullName 
        : null;

    const aboutMeText = employee?.aboutMe || "Dedicated team member at Idea Fueled HRMS, focused on delivering strategic project milestones, fostering cross-departmental collaboration, and driving continuous process improvements.";

    const skillsList = useMemo(() => {
        if (Array.isArray(employee?.skills) && employee.skills.length > 0) return employee.skills;
        if (typeof employee?.skills === "string" && employee.skills.trim()) {
            return employee.skills.split(",").map(s => s.trim());
        }
        if (empDept.includes("Engineering") || empDesignation.includes("Developer") || empDesignation.includes("Software")) {
            return ["React.js", "Node.js", "MongoDB", "TypeScript", "System Design", "REST APIs", "Git", "Agile"];
        }
        if (empDept.includes("HR")) {
            return ["Talent Acquisition", "Employee Relations", "Payroll Management", "HRIS", "Performance Review", "Compliance", "People Analytics"];
        }
        return ["Project Planning", "Cross-functional Leadership", "Communication", "Data Analysis", "Process Optimization", "Client Relations"];
    }, [employee, empDept, empDesignation]);

    const interestsList = useMemo(() => {
        if (Array.isArray(employee?.interests) && employee.interests.length > 0) return employee.interests;
        if (typeof employee?.interests === "string" && employee.interests.trim()) {
            return employee.interests.split(",").map(i => i.trim());
        }
        return ["Photography", "Open Source", "Badminton", "Tech Blogs", "Chess", "Traveling"];
    }, [employee]);

    // Navigation Tabs definition
    const profileTabs = [
        { key: "Overview", label: "Overview", icon: User },
        { key: "Employment", label: "Employment", icon: Briefcase },
        { key: "Attendance", label: "Attendance", icon: Clock },
        { key: "Documents", label: "Documents", icon: FileText },
        { key: "Assets", label: "Assets", icon: Laptop },
        { key: "Activity", label: "Activity", icon: History },
    ];

    if (loading) {
        return (
            <div className="p-6 space-y-6">
                <SkeletonLoader type="card" />
                <SkeletonLoader type="table" rows={6} />
            </div>
        );
    }

    return (
        <div className="space-y-6 text-left select-none animate-fadeIn pb-16 max-w-7xl mx-auto">

            {/* ─────────────────────────────────────────────
               TOP HERO SECTION (CLEAN ENTERPRISE CARD)
            ───────────────────────────────────────────── */}
            <div className="premium-3d-card p-6 sm:p-8 relative overflow-hidden bg-white border border-[#E5E7EB] rounded-[24px]">
                {/* Subtle top subtle border accent */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#2D79C7] via-[#3B82F6] to-[#1E40AF]" />

                <div className="flex flex-col lg:flex-row items-start justify-between gap-6 pt-2">
                    
                    {/* Left: Avatar & Primary Info */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 w-full lg:w-auto">
                        <div className="relative shrink-0">
                            <Avatar
                                src={employee?.profilePicture}
                                name={empName}
                                size="w-24 h-24 sm:w-28 sm:h-28"
                                textSize="text-2xl font-black"
                            />
                            <span className={`absolute bottom-1 right-1 w-5 h-5 rounded-full border-2 border-white shadow-sm flex items-center justify-center ${
                                empStatus === "active" ? "bg-emerald-500" : empStatus === "on_notice" ? "bg-amber-500" : "bg-gray-400"
                            }`} title={`Status: ${empStatus}`} />
                        </div>

                        <div className="space-y-1.5 flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2.5">
                                <h1 className="text-[#1E1E1E] text-2xl sm:text-3xl font-black tracking-tight leading-tight">
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

                            <p className="text-gray-600 text-sm font-semibold flex items-center gap-2">
                                <span>{empDesignation}</span>
                                <span className="text-gray-300">·</span>
                                <span className="text-[#2D79C7] font-bold">{empDept}</span>
                            </p>

                            {/* Key Quick Badges */}
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-2 text-xs font-medium text-gray-500">
                                <span className="flex items-center gap-1.5 font-mono font-bold text-[#1E1E1E] bg-[#F8FAFC] border border-gray-200 px-2.5 py-1 rounded-lg">
                                    <ShieldCheck className="w-3.5 h-3.5 text-[#2D79C7]" />
                                    {empCode}
                                </span>

                                <span className="flex items-center gap-1.5 bg-[#F8FAFC] border border-gray-200 px-2.5 py-1 rounded-lg">
                                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                                    {empLocation}
                                </span>

                                <span className="flex items-center gap-1.5 bg-[#F8FAFC] border border-gray-200 px-2.5 py-1 rounded-lg">
                                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                    Joined {empJoining}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Right: Contact Stack & Edit Action Button */}
                    <div className="flex flex-col items-start lg:items-end justify-between gap-4 w-full lg:w-auto border-t lg:border-t-0 pt-4 lg:pt-0 border-gray-100">
                        {isOwnProfile && (
                            <button
                                type="button"
                                onClick={openEditDrawer}
                                className="flex items-center gap-2 bg-[#2D79C7] hover:bg-[#1F5EA8] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm transition-all cursor-pointer shrink-0"
                            >
                                <Edit3 className="w-4 h-4" />
                                <span>Edit Profile</span>
                            </button>
                        )}

                        <div className="space-y-2 text-xs text-gray-600 font-medium text-left lg:text-right w-full">
                            <div className="flex items-center lg:justify-end gap-2">
                                <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                <span className="font-mono text-gray-700">{empEmail}</span>
                            </div>

                            <div className="flex items-center lg:justify-end gap-2">
                                <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                <span className="font-mono text-gray-700">{empPhone}</span>
                            </div>

                            <div className="flex items-center lg:justify-end gap-2">
                                <User className="w-3.5 h-3.5 text-[#2D79C7] shrink-0" />
                                <span>Reports to: <strong className="text-[#1E1E1E]">{managerName}</strong></span>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            {/* ─────────────────────────────────────────────
               NAVIGATION TABS
            ───────────────────────────────────────────── */}
            <div className="flex border-b border-gray-200 gap-2 overflow-x-auto scrollbar-none">
                {profileTabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.key;
                    return (
                        <button
                            key={tab.key}
                            type="button"
                            onClick={() => setActiveTab(tab.key)}
                            className={`px-5 py-3 text-xs font-extrabold border-b-2 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
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
               TAB 1: OVERVIEW (TWO-COLUMN RESPONSIVE LAYOUT)
            ───────────────────────────────────────────── */}
            {activeTab === "Overview" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    
                    {/* Left Column (Bio, Skills, Interests, Experience) */}
                    <div className="lg:col-span-5 space-y-6">
                        
                        {/* About Me */}
                        <div className="premium-3d-card p-6 space-y-3">
                            <h3 className="text-[#1E1E1E] text-sm font-extrabold flex items-center gap-2 border-b border-gray-100 pb-3">
                                <User className="w-4 h-4 text-[#2D79C7]" />
                                <span>About Me</span>
                            </h3>
                            <p className="text-gray-600 text-xs font-medium leading-relaxed">
                                {aboutMeText}
                            </p>
                        </div>

                        {/* Skills */}
                        <div className="premium-3d-card p-6 space-y-3">
                            <h3 className="text-[#1E1E1E] text-sm font-extrabold flex items-center gap-2 border-b border-gray-100 pb-3">
                                <Award className="w-4 h-4 text-[#2D79C7]" />
                                <span>Skills & Competencies</span>
                            </h3>
                            <div className="flex flex-wrap gap-2 pt-1">
                                {skillsList.map((sk, idx) => (
                                    <span key={idx} className="bg-blue-50/80 text-[#2D79C7] border border-blue-100 px-3 py-1 rounded-xl text-xs font-bold">
                                        {sk}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Hobbies & Interests */}
                        <div className="premium-3d-card p-6 space-y-3">
                            <h3 className="text-[#1E1E1E] text-sm font-extrabold flex items-center gap-2 border-b border-gray-100 pb-3">
                                <Heart className="w-4 h-4 text-rose-500" />
                                <span>Interests & Hobbies</span>
                            </h3>
                            <div className="flex flex-wrap gap-2 pt-1">
                                {interestsList.map((it, idx) => (
                                    <span key={idx} className="bg-slate-100 text-slate-700 border border-slate-200 px-3 py-1 rounded-xl text-xs font-semibold">
                                        {it}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Experience Timeline */}
                        <div className="premium-3d-card p-6 space-y-4">
                            <h3 className="text-[#1E1E1E] text-sm font-extrabold flex items-center gap-2 border-b border-gray-100 pb-3">
                                <Briefcase className="w-4 h-4 text-[#2D79C7]" />
                                <span>Experience Timeline</span>
                            </h3>

                            <div className="relative pl-6 space-y-5 border-l-2 border-gray-200 ml-2 pt-1">
                                <div className="relative">
                                    <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-[#2D79C7] border-4 border-white shadow-sm" />
                                    <h4 className="text-[#1E1E1E] text-xs font-extrabold">{empDesignation}</h4>
                                    <p className="text-[#2D79C7] text-[11px] font-bold">Idea Fueled HRMS</p>
                                    <p className="text-gray-400 text-[10.5px] font-mono mt-0.5">2024 – Present · Full-time</p>
                                </div>

                                <div className="relative">
                                    <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-gray-300 border-4 border-white shadow-sm" />
                                    <h4 className="text-[#1E1E1E] text-xs font-extrabold">Professional Lead / Specialist</h4>
                                    <p className="text-gray-600 text-[11px] font-medium">Idea Fueled HRMS</p>
                                    <p className="text-gray-400 text-[10.5px] font-mono mt-0.5">2023 – 2024 · Full-time</p>
                                </div>

                                <div className="relative">
                                    <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-gray-300 border-4 border-white shadow-sm" />
                                    <h4 className="text-[#1E1E1E] text-xs font-extrabold">Associate Engineer / Executive</h4>
                                    <p className="text-gray-600 text-[11px] font-medium">Prior Enterprise Organization</p>
                                    <p className="text-gray-400 text-[10.5px] font-mono mt-0.5">2021 – 2023</p>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Right Column (Personal Info, Emergency, Education, Reporting Structure) */}
                    <div className="lg:col-span-7 space-y-6">
                        
                        {/* Personal Information */}
                        <div className="premium-3d-card p-6 space-y-4">
                            <h3 className="text-[#1E1E1E] text-sm font-extrabold flex items-center gap-2 border-b border-gray-100 pb-3">
                                <UserCheck className="w-4 h-4 text-[#2D79C7]" />
                                <span>Personal Information</span>
                            </h3>

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
                                        {employee?.bloodGroup || "O+"}
                                    </span>
                                </div>

                                <div className="bg-[#F8FAFC] border border-gray-200/70 p-3.5 rounded-xl">
                                    <span className="text-gray-400 font-medium block text-[10.5px] uppercase tracking-wider">Father&apos;s Name</span>
                                    <span className="text-[#1E1E1E] font-bold block mt-1">
                                        {employee?.fatherName || "Ramesh Kumar"}
                                    </span>
                                </div>

                                <div className="bg-[#F8FAFC] border border-gray-200/70 p-3.5 rounded-xl sm:col-span-2">
                                    <span className="text-gray-400 font-medium block text-[10.5px] uppercase tracking-wider">Present Address</span>
                                    <span className="text-[#1E1E1E] font-medium block mt-1">
                                        {employee?.presentAddress || "Flat 402, Block B, Idea Fueled Tech Residency, Electronic City, Bengaluru, KA 560100"}
                                    </span>
                                </div>

                                <div className="bg-[#F8FAFC] border border-gray-200/70 p-3.5 rounded-xl sm:col-span-2">
                                    <span className="text-gray-400 font-medium block text-[10.5px] uppercase tracking-wider">Permanent Address</span>
                                    <span className="text-[#1E1E1E] font-medium block mt-1">
                                        {employee?.permanentAddress || "House No. 128, Sector 15, Green Park, New Delhi, India 110016"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Emergency Contact */}
                        <div className="premium-3d-card p-6 space-y-4">
                            <h3 className="text-[#1E1E1E] text-sm font-extrabold flex items-center gap-2 border-b border-gray-100 pb-3">
                                <PhoneCall className="w-4 h-4 text-rose-600" />
                                <span>Emergency Contact</span>
                            </h3>

                            <div className="bg-rose-50/50 border border-rose-100 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div className="space-y-1">
                                    <h4 className="text-[#1E1E1E] text-xs font-black">
                                        {employee?.emergencyContactName || "Ramesh Kumar"}
                                    </h4>
                                    <p className="text-gray-500 text-[11px] font-medium">
                                        Relation: <span className="font-bold text-gray-700">{employee?.emergencyContactRelation || "Father"}</span>
                                    </p>
                                </div>

                                <div className="bg-white border border-rose-200 px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold text-rose-700 shadow-sm flex items-center gap-2">
                                    <Phone className="w-3.5 h-3.5 text-rose-500" />
                                    <span>{employee?.emergencyContactNumber || employee?.phoneNumber || "+91 98123 45678"}</span>
                                </div>
                            </div>
                        </div>

                        {/* Education */}
                        <div className="premium-3d-card p-6 space-y-4">
                            <h3 className="text-[#1E1E1E] text-sm font-extrabold flex items-center gap-2 border-b border-gray-100 pb-3">
                                <GraduationCap className="w-4 h-4 text-[#2D79C7]" />
                                <span>Education Qualification</span>
                            </h3>

                            <div className="space-y-3">
                                <div className="bg-[#F8FAFC] border border-gray-200/70 p-4 rounded-xl flex items-center justify-between">
                                    <div>
                                        <h4 className="text-[#1E1E1E] text-xs font-bold">Master of Business Administration (MBA)</h4>
                                        <p className="text-gray-500 text-[11px] font-medium">Specialization: HR & Organizational Strategy</p>
                                        <p className="text-gray-400 text-[10.5px]">Delhi University · Graduated 2021</p>
                                    </div>
                                    <span className="bg-blue-50 text-[#2D79C7] text-[10.5px] font-bold px-2.5 py-1 rounded-md border border-blue-100">
                                        Post Graduate
                                    </span>
                                </div>

                                <div className="bg-[#F8FAFC] border border-gray-200/70 p-4 rounded-xl flex items-center justify-between">
                                    <div>
                                        <h4 className="text-[#1E1E1E] text-xs font-bold">Bachelor of Technology (B.Tech)</h4>
                                        <p className="text-gray-500 text-[11px] font-medium">Computer Science & Engineering</p>
                                        <p className="text-gray-400 text-[10.5px]">Amity University · Graduated 2019</p>
                                    </div>
                                    <span className="bg-slate-100 text-slate-700 text-[10.5px] font-bold px-2.5 py-1 rounded-md border border-slate-200">
                                        Under Graduate
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Reporting Structure */}
                        <div className="premium-3d-card p-6 space-y-4">
                            <h3 className="text-[#1E1E1E] text-sm font-extrabold flex items-center gap-2 border-b border-gray-100 pb-3">
                                <Building2 className="w-4 h-4 text-[#2D79C7]" />
                                <span>Reporting Structure</span>
                            </h3>

                            <div className="space-y-3">
                                <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-2xl flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Avatar name={managerName} size="w-10 h-10" textSize="text-xs" />
                                        <div>
                                            <span className="text-[10px] font-bold uppercase text-[#2D79C7] tracking-wider block">Direct Reporting Manager</span>
                                            <h4 className="text-[#1E1E1E] text-xs font-bold mt-0.5">{managerName}</h4>
                                            <p className="text-gray-500 text-[11px] font-medium">Senior Director · {empDept}</p>
                                        </div>
                                    </div>
                                </div>

                                {dottedManagerName && (
                                    <div className="bg-gray-50 border border-gray-200 p-4 rounded-2xl flex items-center gap-3">
                                        <Avatar name={dottedManagerName} size="w-9 h-9" textSize="text-xs" />
                                        <div>
                                            <span className="text-[10px] font-bold uppercase text-gray-500 tracking-wider block">Dotted Line Manager</span>
                                            <h4 className="text-[#1E1E1E] text-xs font-bold mt-0.5">{dottedManagerName}</h4>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                    </div>

                </div>
            )}

            {/* ─────────────────────────────────────────────
               TAB 2: EMPLOYMENT
            ───────────────────────────────────────────── */}
            {activeTab === "Employment" && (
                <div className="space-y-6">
                    <div className="premium-3d-card p-6 sm:p-8 space-y-6">
                        <div className="border-b border-gray-150 pb-4">
                            <h2 className="text-[#1E1E1E] text-base font-extrabold flex items-center gap-2">
                                <Briefcase className="w-5 h-5 text-[#2D79C7]" />
                                <span>Employment & Work Roster Parameters</span>
                            </h2>
                            <p className="text-gray-500 text-xs font-medium mt-1">
                                Enterprise employment configuration, organizational department hierarchy, and active work shift.
                            </p>
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
                                    {(employee?.employementType || "full_time").replace("_", " ")}
                                </span>
                            </div>

                            <div className="bg-[#F8FAFC] border border-gray-200 p-4 rounded-2xl space-y-1">
                                <span className="text-gray-400 text-[10.5px] font-bold uppercase tracking-wider block">Date of Joining</span>
                                <span className="text-[#1E1E1E] text-sm font-bold block">{empJoining}</span>
                            </div>

                            <div className="bg-[#F8FAFC] border border-gray-200 p-4 rounded-2xl space-y-1">
                                <span className="text-gray-400 text-[10.5px] font-bold uppercase tracking-wider block">Reporting Manager</span>
                                <span className="text-[#1E1E1E] text-sm font-bold block">{managerName}</span>
                            </div>

                            <div className="bg-[#F8FAFC] border border-gray-200 p-4 rounded-2xl space-y-1">
                                <span className="text-gray-400 text-[10.5px] font-bold uppercase tracking-wider block">Work Location</span>
                                <span className="text-[#1E1E1E] text-sm font-bold block">{empLocation}</span>
                            </div>

                            <div className="bg-[#F8FAFC] border border-gray-200 p-4 rounded-2xl space-y-1">
                                <span className="text-gray-400 text-[10.5px] font-bold uppercase tracking-wider block">Assigned Shift</span>
                                <span className="text-[#1E1E1E] text-sm font-bold block font-mono">
                                    Standard Day (09:30 AM – 06:30 PM)
                                </span>
                            </div>

                            <div className="bg-[#F8FAFC] border border-gray-200 p-4 rounded-2xl space-y-1">
                                <span className="text-gray-400 text-[10.5px] font-bold uppercase tracking-wider block">System Access Role</span>
                                <span className="text-[#2D79C7] text-sm font-extrabold block uppercase tracking-wider">
                                    {empRole}
                                </span>
                            </div>

                        </div>
                    </div>
                </div>
            )}

            {/* ─────────────────────────────────────────────
               TAB 3: ATTENDANCE SUMMARY (SUMMARY ONLY)
            ───────────────────────────────────────────── */}
            {activeTab === "Attendance" && (
                <div className="space-y-6">
                    {/* Top KPI Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                        <div className="premium-3d-card p-5">
                            <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider block">Attendance Rate</span>
                            <div className="text-2xl font-black font-mono text-[#2D79C7] mt-2">96.5%</div>
                            <span className="text-[11px] text-emerald-600 font-bold mt-1 inline-block">Excellent Punctuality</span>
                        </div>

                        <div className="premium-3d-card p-5">
                            <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider block">Leave Balance</span>
                            <div className="text-2xl font-black font-mono text-[#1E1E1E] mt-2">14 Days</div>
                            <span className="text-[11px] text-gray-500 font-medium mt-1 inline-block">Casual: 8 | Sick: 6</span>
                        </div>

                        <div className="premium-3d-card p-5">
                            <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider block">Avg Work Hours</span>
                            <div className="text-2xl font-black font-mono text-[#1E1E1E] mt-2">8h 24m</div>
                            <span className="text-[11px] text-gray-500 font-medium mt-1 inline-block">Standard: 8h 00m</span>
                        </div>

                        <div className="premium-3d-card p-5">
                            <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider block">Late Arrivals</span>
                            <div className="text-2xl font-black font-mono text-amber-600 mt-2">1 Day</div>
                            <span className="text-[11px] text-gray-500 font-medium mt-1 inline-block">This Month</span>
                        </div>

                        <div className="premium-3d-card p-5">
                            <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider block">WFH Days</span>
                            <div className="text-2xl font-black font-mono text-blue-600 mt-2">3 Days</div>
                            <span className="text-[11px] text-gray-500 font-medium mt-1 inline-block">Approved Remote</span>
                        </div>
                    </div>

                    {/* Recent 5 Days Log */}
                    <div className="premium-3d-card p-6 space-y-4">
                        <h3 className="text-[#1E1E1E] text-sm font-extrabold flex items-center gap-2 border-b border-gray-100 pb-3">
                            <Clock className="w-4 h-4 text-[#2D79C7]" />
                            <span>Recent Attendance Activity Snapshot</span>
                        </h3>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs whitespace-nowrap">
                                <thead>
                                    <tr className="bg-[#F8FAFC] text-gray-400 font-bold uppercase border-b border-gray-200">
                                        <th className="py-3 px-4">Date</th>
                                        <th className="py-3 px-4">Work Mode</th>
                                        <th className="py-3 px-4">Clock In</th>
                                        <th className="py-3 px-4">Clock Out</th>
                                        <th className="py-3 px-4">Total Hours</th>
                                        <th className="py-3 px-4">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                                    <tr className="hover:bg-gray-50">
                                        <td className="py-3 px-4 font-bold text-[#1E1E1E]">22 Jul 2026</td>
                                        <td className="py-3 px-4">Office</td>
                                        <td className="py-3 px-4 font-mono">09:28 AM</td>
                                        <td className="py-3 px-4 font-mono">06:32 PM</td>
                                        <td className="py-3 px-4 font-mono font-bold">8h 44m</td>
                                        <td className="py-3 px-4">
                                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10.5px] font-bold px-2 py-0.5 rounded-md">Present</span>
                                        </td>
                                    </tr>

                                    <tr className="hover:bg-gray-50">
                                        <td className="py-3 px-4 font-bold text-[#1E1E1E]">21 Jul 2026</td>
                                        <td className="py-3 px-4">Office</td>
                                        <td className="py-3 px-4 font-mono">09:30 AM</td>
                                        <td className="py-3 px-4 font-mono">06:30 PM</td>
                                        <td className="py-3 px-4 font-mono font-bold">8h 30m</td>
                                        <td className="py-3 px-4">
                                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10.5px] font-bold px-2 py-0.5 rounded-md">Present</span>
                                        </td>
                                    </tr>

                                    <tr className="hover:bg-gray-50">
                                        <td className="py-3 px-4 font-bold text-[#1E1E1E]">20 Jul 2026</td>
                                        <td className="py-3 px-4">Work From Home</td>
                                        <td className="py-3 px-4 font-mono">09:25 AM</td>
                                        <td className="py-3 px-4 font-mono">06:40 PM</td>
                                        <td className="py-3 px-4 font-mono font-bold">8h 45m</td>
                                        <td className="py-3 px-4">
                                            <span className="bg-blue-50 text-blue-700 border border-blue-100 text-[10.5px] font-bold px-2 py-0.5 rounded-md">WFH</span>
                                        </td>
                                    </tr>

                                    <tr className="hover:bg-gray-50">
                                        <td className="py-3 px-4 font-bold text-[#1E1E1E]">19 Jul 2026</td>
                                        <td className="py-3 px-4">Office</td>
                                        <td className="py-3 px-4 font-mono">09:42 AM</td>
                                        <td className="py-3 px-4 font-mono">06:35 PM</td>
                                        <td className="py-3 px-4 font-mono font-bold">8h 13m</td>
                                        <td className="py-3 px-4">
                                            <span className="bg-amber-50 text-amber-700 border border-amber-100 text-[10.5px] font-bold px-2 py-0.5 rounded-md">Late</span>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ─────────────────────────────────────────────
               TAB 4: DOCUMENTS
            ───────────────────────────────────────────── */}
            {activeTab === "Documents" && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        
                        {/* Document 1: PAN */}
                        <div className="premium-3d-card p-5 flex flex-col justify-between space-y-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#2D79C7]">
                                    <FileText className="w-5 h-5" />
                                </div>
                                <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md">
                                    Verified
                                </span>
                            </div>

                            <div>
                                <h4 className="text-[#1E1E1E] text-sm font-bold">PAN Card Copy</h4>
                                <p className="text-gray-400 text-xs mt-0.5">Government ID Proof</p>
                                <p className="text-gray-500 font-mono text-xs font-bold mt-2">
                                    PAN: {employee?.panNumber || "ABCDE1234F"}
                                </p>
                            </div>

                            <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setDocModalFile({ name: "PAN Card Copy", tag: employee?.panNumber || "ABCDE1234F", type: "PAN Card" })}
                                    className="flex-1 flex items-center justify-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold py-2 rounded-xl transition-all cursor-pointer"
                                >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>View</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => toast.success("Downloading PAN Card Copy...")}
                                    className="flex-1 flex items-center justify-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-[#2D79C7] border border-blue-100 text-xs font-bold py-2 rounded-xl transition-all cursor-pointer"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>Download</span>
                                </button>
                            </div>
                        </div>

                        {/* Document 2: Aadhaar */}
                        <div className="premium-3d-card p-5 flex flex-col justify-between space-y-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#2D79C7]">
                                    <FileText className="w-5 h-5" />
                                </div>
                                <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md">
                                    Verified
                                </span>
                            </div>

                            <div>
                                <h4 className="text-[#1E1E1E] text-sm font-bold">Aadhaar Card</h4>
                                <p className="text-gray-400 text-xs mt-0.5">National Identification</p>
                                <p className="text-gray-500 font-mono text-xs font-bold mt-2">
                                    UID: {employee?.aadhaarNumber || "XXXX-XXXX-9012"}
                                </p>
                            </div>

                            <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setDocModalFile({ name: "Aadhaar Card", tag: employee?.aadhaarNumber || "XXXX-XXXX-9012", type: "Aadhaar" })}
                                    className="flex-1 flex items-center justify-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold py-2 rounded-xl transition-all cursor-pointer"
                                >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>View</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => toast.success("Downloading Aadhaar Card...")}
                                    className="flex-1 flex items-center justify-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-[#2D79C7] border border-blue-100 text-xs font-bold py-2 rounded-xl transition-all cursor-pointer"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>Download</span>
                                </button>
                            </div>
                        </div>

                        {/* Document 3: Offer Letter */}
                        <div className="premium-3d-card p-5 flex flex-col justify-between space-y-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
                                    <FileText className="w-5 h-5" />
                                </div>
                                <span className="bg-purple-50 text-purple-700 border border-purple-100 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md">
                                    Signed
                                </span>
                            </div>

                            <div>
                                <h4 className="text-[#1E1E1E] text-sm font-bold">Employment Offer Letter</h4>
                                <p className="text-gray-400 text-xs mt-0.5">Official Idea Fueled Agreement</p>
                                <p className="text-gray-400 text-[11px] mt-2">Issued on joining date</p>
                            </div>

                            <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setDocModalFile({ name: "Employment Offer Letter", tag: "Idea Fueled Contract", type: "Agreement" })}
                                    className="flex-1 flex items-center justify-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold py-2 rounded-xl transition-all cursor-pointer"
                                >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>View</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => toast.success("Downloading Offer Letter...")}
                                    className="flex-1 flex items-center justify-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-[#2D79C7] border border-blue-100 text-xs font-bold py-2 rounded-xl transition-all cursor-pointer"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>Download</span>
                                </button>
                            </div>
                        </div>

                        {/* Document 4: Resume */}
                        <div className="premium-3d-card p-5 flex flex-col justify-between space-y-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                                    <FileText className="w-5 h-5" />
                                </div>
                                <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md">
                                    Active
                                </span>
                            </div>

                            <div>
                                <h4 className="text-[#1E1E1E] text-sm font-bold">Curriculum Vitae / Resume</h4>
                                <p className="text-gray-400 text-xs mt-0.5">Professional Background</p>
                                <p className="text-gray-400 text-[11px] mt-2">PDF Document · 1.4 MB</p>
                            </div>

                            <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setDocModalFile({ name: "Curriculum Vitae", tag: empName, type: "Resume" })}
                                    className="flex-1 flex items-center justify-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold py-2 rounded-xl transition-all cursor-pointer"
                                >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>View</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => toast.success("Downloading Resume...")}
                                    className="flex-1 flex items-center justify-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-[#2D79C7] border border-blue-100 text-xs font-bold py-2 rounded-xl transition-all cursor-pointer"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>Download</span>
                                </button>
                            </div>
                        </div>

                        {/* Document 5: Degree Certificate */}
                        <div className="premium-3d-card p-5 flex flex-col justify-between space-y-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                                    <GraduationCap className="w-5 h-5" />
                                </div>
                                <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md">
                                    Verified
                                </span>
                            </div>

                            <div>
                                <h4 className="text-[#1E1E1E] text-sm font-bold">Graduation Certificate</h4>
                                <p className="text-gray-400 text-xs mt-0.5">Educational Credential</p>
                                <p className="text-gray-400 text-[11px] mt-2">University Convocation Doc</p>
                            </div>

                            <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setDocModalFile({ name: "Degree Certificate", tag: "Educational Qualification", type: "Degree" })}
                                    className="flex-1 flex items-center justify-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold py-2 rounded-xl transition-all cursor-pointer"
                                >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>View</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => toast.success("Downloading Certificate...")}
                                    className="flex-1 flex items-center justify-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-[#2D79C7] border border-blue-100 text-xs font-bold py-2 rounded-xl transition-all cursor-pointer"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    <span>Download</span>
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            )}

            {/* ─────────────────────────────────────────────
               TAB 5: ASSETS
            ───────────────────────────────────────────── */}
            {activeTab === "Assets" && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        
                        {/* Asset 1: Laptop */}
                        <div className="premium-3d-card p-6 space-y-4">
                            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#2D79C7]">
                                        <Laptop className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="text-[#1E1E1E] text-xs font-extrabold">Apple MacBook Pro 16&quot;</h4>
                                        <p className="text-gray-400 text-[10.5px]">M2 Pro · 16GB RAM · 512GB SSD</p>
                                    </div>
                                </div>
                                <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-bold px-2 py-0.5 rounded">
                                    Active
                                </span>
                            </div>

                            <div className="space-y-2 text-xs text-gray-600 font-medium">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Asset Tag / Serial:</span>
                                    <span className="font-mono font-bold text-[#1E1E1E]">{empCode}-LAP-2024</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Category:</span>
                                    <span className="font-semibold text-gray-700">Hardware Workstation</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Issued Date:</span>
                                    <span className="font-semibold text-gray-700">{empJoining}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Condition:</span>
                                    <span className="text-emerald-600 font-bold">Excellent</span>
                                </div>
                            </div>
                        </div>

                        {/* Asset 2: Monitor */}
                        <div className="premium-3d-card p-6 space-y-4">
                            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                                        <Laptop className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="text-[#1E1E1E] text-xs font-extrabold">Dell UltraSharp 27&quot; 4K Monitor</h4>
                                        <p className="text-gray-400 text-[10.5px]">U2723QE · USB-C Hub</p>
                                    </div>
                                </div>
                                <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-bold px-2 py-0.5 rounded">
                                    Active
                                </span>
                            </div>

                            <div className="space-y-2 text-xs text-gray-600 font-medium">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Asset Tag / Serial:</span>
                                    <span className="font-mono font-bold text-[#1E1E1E]">{empCode}-MON-2023</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Category:</span>
                                    <span className="font-semibold text-gray-700">Display Monitor</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Issued Date:</span>
                                    <span className="font-semibold text-gray-700">{empJoining}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Condition:</span>
                                    <span className="text-emerald-600 font-bold">Good</span>
                                </div>
                            </div>
                        </div>

                        {/* Asset 3: Mouse */}
                        <div className="premium-3d-card p-6 space-y-4">
                            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-600">
                                        <Mouse className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="text-[#1E1E1E] text-xs font-extrabold">Logitech MX Master 3S</h4>
                                        <p className="text-gray-400 text-[10.5px]">Wireless Ergonomic Mouse</p>
                                    </div>
                                </div>
                                <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-bold px-2 py-0.5 rounded">
                                    Active
                                </span>
                            </div>

                            <div className="space-y-2 text-xs text-gray-600 font-medium">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Asset Tag / Serial:</span>
                                    <span className="font-mono font-bold text-[#1E1E1E]">{empCode}-MOU-88</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Category:</span>
                                    <span className="font-semibold text-gray-700">Peripherals</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Issued Date:</span>
                                    <span className="font-semibold text-gray-700">{empJoining}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Condition:</span>
                                    <span className="text-emerald-600 font-bold">Excellent</span>
                                </div>
                            </div>
                        </div>

                        {/* Asset 4: ID Card */}
                        <div className="premium-3d-card p-6 space-y-4">
                            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                                        <ShieldCheck className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="text-[#1E1E1E] text-xs font-extrabold">Idea Fueled Smart Access Pass</h4>
                                        <p className="text-gray-400 text-[10.5px]">NFC Office Security Badge</p>
                                    </div>
                                </div>
                                <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-bold px-2 py-0.5 rounded">
                                    Active
                                </span>
                            </div>

                            <div className="space-y-2 text-xs text-gray-600 font-medium">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Asset Tag / Badge ID:</span>
                                    <span className="font-mono font-bold text-[#1E1E1E]">{empCode}-SEC-01</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Access Level:</span>
                                    <span className="font-bold text-[#2D79C7]">All Floors & Labs</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Issued Date:</span>
                                    <span className="font-semibold text-gray-700">{empJoining}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Condition:</span>
                                    <span className="text-emerald-600 font-bold">Active</span>
                                </div>
                            </div>
                        </div>

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
                        <span>Recent Employee Activity & Milestone Audit Log</span>
                    </h3>

                    <div className="relative pl-6 space-y-6 border-l-2 border-blue-100 ml-3 pt-2">
                        
                        <div className="relative">
                            <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-[#2D79C7] border-4 border-white shadow-sm flex items-center justify-center" />
                            <div className="bg-[#F8FAFC] border border-gray-200 p-4 rounded-2xl space-y-1">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-[#1E1E1E] text-xs font-bold">Profile Details Updated</h4>
                                    <span className="text-[10.5px] font-mono text-gray-400">22 Jul 2026, 10:45 AM</span>
                                </div>
                                <p className="text-gray-600 text-xs font-medium">
                                    Updated emergency contact details and skills list.
                                </p>
                            </div>
                        </div>

                        <div className="relative">
                            <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-emerald-500 border-4 border-white shadow-sm" />
                            <div className="bg-[#F8FAFC] border border-gray-200 p-4 rounded-2xl space-y-1">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-[#1E1E1E] text-xs font-bold">Attendance Regularized</h4>
                                    <span className="text-[10.5px] font-mono text-gray-400">18 Jul 2026, 04:30 PM</span>
                                </div>
                                <p className="text-gray-600 text-xs font-medium">
                                    Clock-in time regularized for 15th July by manager <strong className="text-[#1E1E1E]">{managerName}</strong>.
                                </p>
                            </div>
                        </div>

                        <div className="relative">
                            <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-purple-500 border-4 border-white shadow-sm" />
                            <div className="bg-[#F8FAFC] border border-gray-200 p-4 rounded-2xl space-y-1">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-[#1E1E1E] text-xs font-bold">Casual Leave Approved</h4>
                                    <span className="text-[10.5px] font-mono text-gray-400">10 Jul 2026, 11:15 AM</span>
                                </div>
                                <p className="text-gray-600 text-xs font-medium">
                                    2 Days Casual Leave approved from 12 Jul to 13 Jul 2026.
                                </p>
                            </div>
                        </div>

                        <div className="relative">
                            <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-amber-500 border-4 border-white shadow-sm" />
                            <div className="bg-[#F8FAFC] border border-gray-200 p-4 rounded-2xl space-y-1">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-[#1E1E1E] text-xs font-bold">Document Uploaded & Verified</h4>
                                    <span className="text-[10.5px] font-mono text-gray-400">16 Jan 2023, 02:00 PM</span>
                                </div>
                                <p className="text-gray-600 text-xs font-medium">
                                    Uploaded official PAN and Aadhaar identity documents for HR compliance.
                                </p>
                            </div>
                        </div>

                        <div className="relative">
                            <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-[#2D79C7] border-4 border-white shadow-sm" />
                            <div className="bg-[#F8FAFC] border border-gray-200 p-4 rounded-2xl space-y-1">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-[#1E1E1E] text-xs font-bold">Joined Idea Fueled HRMS</h4>
                                    <span className="text-[10.5px] font-mono text-gray-400">{empJoining}</span>
                                </div>
                                <p className="text-gray-600 text-xs font-medium">
                                    Onboarded as <strong className="text-[#1E1E1E]">{empDesignation}</strong> in <strong className="text-[#2D79C7]">{empDept}</strong>.
                                </p>
                            </div>
                        </div>

                    </div>
                </div>
            )}

            {/* ─────────────────────────────────────────────
               RIGHT-SIDE SLIDE-OVER EDIT PROFILE DRAWER
            ───────────────────────────────────────────── */}
            {isEditDrawerOpen && (
                <div className="fixed inset-0 z-50 overflow-hidden">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
                        onClick={() => setIsEditDrawerOpen(false)}
                    />

                    <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
                        <div className="w-screen max-w-lg bg-white shadow-2xl border-l border-gray-200 flex flex-col justify-between">
                            
                            {/* Drawer Header */}
                            <div className="px-6 py-5 bg-[#F8FAFC] border-b border-gray-200 flex items-center justify-between">
                                <div>
                                    <h3 className="text-[#1E1E1E] text-base font-extrabold flex items-center gap-2">
                                        <Edit3 className="w-4 h-4 text-[#2D79C7]" />
                                        <span>Edit Personal Profile</span>
                                    </h3>
                                    <p className="text-gray-400 text-xs font-medium mt-0.5">
                                        Update your personal information, skills, and emergency contact details.
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

                            {/* Drawer Form Body */}
                            <form id="edit-profile-form" onSubmit={handleSaveProfile} className="p-6 overflow-y-auto space-y-5 flex-1">
                                
                                {/* Profile Picture Upload */}
                                <div className="space-y-2">
                                    <label className="text-gray-700 text-xs font-bold block">Profile Picture</label>
                                    <div className="flex items-center gap-4">
                                        <Avatar
                                            src={editForm.profilePicture || employee?.profilePicture}
                                            name={empName}
                                            size="w-14 h-14"
                                        />
                                        <label className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-[#2D79C7] border border-blue-100 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer">
                                            {uploadingPic ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                                            <span>{uploadingPic ? "Uploading..." : "Upload New Photo"}</span>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleProfilePicUpload}
                                                className="hidden"
                                            />
                                        </label>
                                    </div>
                                </div>

                                {/* Phone Number */}
                                <div className="space-y-1.5">
                                    <label className="text-gray-700 text-xs font-bold block">Phone Number</label>
                                    <input
                                        type="text"
                                        value={editForm.phoneNumber}
                                        onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                                        placeholder="+91 98765 43210"
                                        className="w-full bg-[#F8FAFC] border border-gray-200 rounded-xl px-3.5 py-2 text-xs font-medium text-gray-800 focus:outline-none focus:border-[#2D79C7]"
                                    />
                                </div>

                                {/* About Me / Bio */}
                                <div className="space-y-1.5">
                                    <label className="text-gray-700 text-xs font-bold block">About Me / Bio</label>
                                    <textarea
                                        rows="3"
                                        value={editForm.aboutMe}
                                        onChange={(e) => setEditForm({ ...editForm, aboutMe: e.target.value })}
                                        placeholder="Write a brief professional summary..."
                                        className="w-full bg-[#F8FAFC] border border-gray-200 rounded-xl p-3 text-xs font-medium text-gray-800 focus:outline-none focus:border-[#2D79C7] resize-none"
                                    />
                                </div>

                                {/* Skills */}
                                <div className="space-y-1.5">
                                    <label className="text-gray-700 text-xs font-bold block">Skills (Comma separated)</label>
                                    <input
                                        type="text"
                                        value={editForm.skills}
                                        onChange={(e) => setEditForm({ ...editForm, skills: e.target.value })}
                                        placeholder="React, Node.js, HR Management, Payroll"
                                        className="w-full bg-[#F8FAFC] border border-gray-200 rounded-xl px-3.5 py-2 text-xs font-medium text-gray-800 focus:outline-none focus:border-[#2D79C7]"
                                    />
                                </div>

                                {/* Interests */}
                                <div className="space-y-1.5">
                                    <label className="text-gray-700 text-xs font-bold block">Interests & Hobbies (Comma separated)</label>
                                    <input
                                        type="text"
                                        value={editForm.interests}
                                        onChange={(e) => setEditForm({ ...editForm, interests: e.target.value })}
                                        placeholder="Photography, Tech Blogs, Badminton"
                                        className="w-full bg-[#F8FAFC] border border-gray-200 rounded-xl px-3.5 py-2 text-xs font-medium text-gray-800 focus:outline-none focus:border-[#2D79C7]"
                                    />
                                </div>

                                {/* Date of Birth & Gender */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-gray-700 text-xs font-bold block">Date of Birth</label>
                                        <input
                                            type="date"
                                            value={editForm.dateOfBirth}
                                            onChange={(e) => setEditForm({ ...editForm, dateOfBirth: e.target.value })}
                                            className="w-full bg-[#F8FAFC] border border-gray-200 rounded-xl px-3.5 py-2 text-xs font-medium text-gray-800 focus:outline-none focus:border-[#2D79C7]"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-gray-700 text-xs font-bold block">Gender</label>
                                        <select
                                            value={editForm.gender}
                                            onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                                            className="w-full bg-[#F8FAFC] border border-gray-200 rounded-xl px-3.5 py-2 text-xs font-medium text-gray-800 focus:outline-none focus:border-[#2D79C7]"
                                        >
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Emergency Contact Info */}
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
                                                className="w-full bg-[#F8FAFC] border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium text-gray-800 focus:outline-none focus:border-[#2D79C7]"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-gray-700 text-[11px] font-bold block">Relationship</label>
                                            <input
                                                type="text"
                                                value={editForm.emergencyContactRelation}
                                                onChange={(e) => setEditForm({ ...editForm, emergencyContactRelation: e.target.value })}
                                                placeholder="Father / Spouse"
                                                className="w-full bg-[#F8FAFC] border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium text-gray-800 focus:outline-none focus:border-[#2D79C7]"
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
                                            className="w-full bg-[#F8FAFC] border border-gray-200 rounded-xl px-3.5 py-2 text-xs font-medium text-gray-800 focus:outline-none focus:border-[#2D79C7]"
                                        />
                                    </div>
                                </div>

                                {/* Present & Permanent Address */}
                                <div className="space-y-3 pt-2 border-t border-gray-150">
                                    <div className="space-y-1.5">
                                        <label className="text-gray-700 text-xs font-bold block">Present Address</label>
                                        <textarea
                                            rows="2"
                                            value={editForm.presentAddress}
                                            onChange={(e) => setEditForm({ ...editForm, presentAddress: e.target.value })}
                                            placeholder="Enter present address..."
                                            className="w-full bg-[#F8FAFC] border border-gray-200 rounded-xl p-3 text-xs font-medium text-gray-800 focus:outline-none focus:border-[#2D79C7] resize-none"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-gray-700 text-xs font-bold block">Permanent Address</label>
                                        <textarea
                                            rows="2"
                                            value={editForm.permanentAddress}
                                            onChange={(e) => setEditForm({ ...editForm, permanentAddress: e.target.value })}
                                            placeholder="Enter permanent address..."
                                            className="w-full bg-[#F8FAFC] border border-gray-200 rounded-xl p-3 text-xs font-medium text-gray-800 focus:outline-none focus:border-[#2D79C7] resize-none"
                                        />
                                    </div>
                                </div>

                            </form>

                            {/* Drawer Footer Actions */}
                            <div className="px-6 py-4 bg-[#F8FAFC] border-t border-gray-200 flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsEditDrawerOpen(false)}
                                    className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    form="edit-profile-form"
                                    disabled={saving}
                                    className="bg-[#2D79C7] hover:bg-[#1F5EA8] text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-2"
                                >
                                    {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                    <span>{saving ? "Saving Changes..." : "Save Profile"}</span>
                                </button>
                            </div>

                        </div>
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
                            <button
                                type="button"
                                onClick={() => setDocModalFile(null)}
                                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="bg-[#F8FAFC] border border-gray-200 rounded-2xl p-8 text-center space-y-3">
                            <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 text-[#2D79C7] flex items-center justify-center mx-auto">
                                <FileText className="w-8 h-8" />
                            </div>
                            <div>
                                <p className="text-xs font-extrabold text-[#1E1E1E]">{docModalFile.type} Preview</p>
                                <p className="text-[11px] font-mono text-gray-400 mt-0.5">{docModalFile.tag}</p>
                            </div>
                            <p className="text-[11px] text-emerald-600 font-bold bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 inline-block">
                                Document Verified & Encrypted
                            </p>
                        </div>

                        <div className="flex gap-3 justify-end pt-2">
                            <button
                                type="button"
                                onClick={() => setDocModalFile(null)}
                                className="bg-white border border-gray-200 text-gray-700 text-xs font-bold py-2 px-4 rounded-xl cursor-pointer hover:bg-gray-50"
                            >
                                Close
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    toast.success(`Downloading ${docModalFile.name}...`);
                                    setDocModalFile(null);
                                }}
                                className="bg-[#2D79C7] hover:bg-[#1F5EA8] text-white text-xs font-bold py-2 px-5 rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                            >
                                <Download className="w-3.5 h-3.5" />
                                <span>Download Copy</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default EmployeeProfile;
