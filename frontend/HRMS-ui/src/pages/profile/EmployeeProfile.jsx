import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    User, Mail, Phone, MapPin, Calendar, Briefcase, Building2,
    Shield, Clock, Edit3, X, Check, Eye, Download, Upload,
    Laptop, Mouse, ShieldCheck, Award, FileText,
    Heart, GraduationCap, PhoneCall, History, Loader2, Camera,
    Plus, Trash2, PlusCircle, UserCheck, Lock
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { Avatar, SkeletonLoader } from "../../components/SharedComponents";
import ConfirmDialog from "../../components/ConfirmDialog";
import { getEmployeeById, updateEmployee } from "../../services/employee.service";
import { uploadProfilePicture } from "../../services/auth.service";

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

const DEFAULT_ACTIVITIES = [
    { title: "Profile Details Updated", description: "Updated contact info and skills list.", timestamp: new Date(), type: "update" },
    { title: "Attendance Regularized", description: "Clock-in time regularized for 15th July.", timestamp: new Date(Date.now() - 86400000 * 4), type: "attendance" },
    { title: "Casual Leave Approved", description: "2 Days Casual Leave approved from 12 Jul to 13 Jul.", timestamp: new Date(Date.now() - 86400000 * 10), type: "leave" },
    { title: "Joined Idea Fueled HRMS", description: "Onboarded into active enterprise workspace.", timestamp: new Date("2023-01-15"), type: "onboarding" }
];

export const EmployeeProfile = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user: currentUser, updateUser } = useAuth();

    const [employee, setEmployee] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("Personal");

    // Drawer state for Edit Profile
    const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploadingPic, setUploadingPic] = useState(false);
    
    // Modals for adding items dynamically
    const [docModalFile, setDocModalFile] = useState(null);
    const [showAddSkillInput, setShowAddSkillInput] = useState(false);
    const [newSkillText, setNewSkillText] = useState("");
    const [showAddInterestInput, setShowAddInterestInput] = useState(false);
    const [newInterestText, setNewInterestText] = useState("");

    const [showEduModal, setShowEduModal] = useState(false);
    const [newEdu, setNewEdu] = useState({ degree: "", institution: "", fieldOfStudy: "", passingYear: "", level: "Post Graduate" });
    
    const [showExpModal, setShowExpModal] = useState(false);
    const [newExp, setNewExp] = useState({ title: "", company: "", period: "", description: "" });

    const [showDocModal, setShowDocModal] = useState(false);
    const [newDoc, setNewDoc] = useState({ name: "", category: "Government ID", numberOrTag: "", url: "" });

    const [showAssetModal, setShowAssetModal] = useState(false);
    const [newAsset, setNewAsset] = useState({ name: "", assetTag: "", category: "Hardware Workstation", condition: "Excellent" });

    // Confirm dialog state for deletions
    const [confirmDelete, setConfirmDelete] = useState({ isOpen: false, title: "", message: "", action: null });

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

    // Check if logged-in user is viewing their OWN profile
    const isOwnProfile = useMemo(() => {
        if (!id || id === "me") return true;
        if (currentUser && (id === currentUser._id || id === currentUser.employeeId)) return true;
        if (employee && currentUser && employee._id === currentUser._id) return true;
        return false;
    }, [id, currentUser, employee]);

    // Role check: HR and Admin can edit & delete ANY employee profile. Employees can edit & delete ONLY their own.
    const userRole = (currentUser?.role || "employee").toLowerCase();
    const canEdit = isOwnProfile || userRole === "admin" || userRole === "hr";
    const canDelete = isOwnProfile || userRole === "admin" || userRole === "hr";
    const canViewConfidential = isOwnProfile || userRole === "admin" || userRole === "hr";

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

    // Populate edit drawer form
    const openEditDrawer = () => {
        if (!employee) return;
        setEditForm({
            phoneNumber: employee.phoneNumber || "",
            aboutMe: employee.aboutMe || "Experienced professional passionate about operational excellence, workforce strategy, and digital innovation at Idea Fueled.",
            skills: Array.isArray(employee.skills) && employee.skills.length > 0 
                ? employee.skills.join(", ") 
                : "React.js, Node.js, HR Management, Team Leadership, Analytics",
            interests: Array.isArray(employee.interests) && employee.interests.length > 0 
                ? employee.interests.join(", ") 
                : "Photography, Technology, Reading, Badminton, Chess",
            dateOfBirth: safeDateToInput(employee.dateOfBirth),
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

    // Profile picture upload
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

    // Helper to persist employee updates to MongoDB backend
    const persistEmployeeUpdate = async (payload, successMsg = "Profile updated!") => {
        if (!canEdit) {
            toast.error("You do not have permission to edit this profile.");
            return false;
        }

        try {
            setSaving(true);
            const empIdToUpdate = employee._id || currentUser._id;
            const res = await updateEmployee(empIdToUpdate, payload);
            
            if (res.data?.success) {
                toast.success(successMsg);
                setEmployee(res.data.employee || { ...employee, ...payload });
                if (isOwnProfile && updateUser) {
                    updateUser(res.data.employee || { ...employee, ...payload });
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
        return ["React.js", "Node.js", "MongoDB", "HR Management", "System Design", "Payroll"];
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
        if (Array.isArray(employee?.interests) && employee.interests.length > 0) return employee.interests;
        return ["Photography", "Open Source", "Badminton", "Reading", "Chess"];
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
        return DEFAULT_EDUCATION;
    }, [employee]);

    const handleAddEducationSubmit = async (e) => {
        e.preventDefault();
        if (!newEdu.degree.trim() || !newEdu.institution.trim()) {
            toast.error("Degree and Institution are required.");
            return;
        }
        const updated = [newEdu, ...currentEducation];
        const ok = await persistEmployeeUpdate({ education: updated }, "Education record added!");
        if (ok) {
            setShowEduModal(false);
            setNewEdu({ degree: "", institution: "", fieldOfStudy: "", passingYear: "", level: "Post Graduate" });
        }
    };

    const handleDeleteEducation = (idx) => {
        if (!canDelete) return;
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
        return DEFAULT_EXPERIENCE;
    }, [employee]);

    const handleAddExperienceSubmit = async (e) => {
        e.preventDefault();
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
        return DEFAULT_DOCUMENTS;
    }, [employee]);

    const handleAddDocumentSubmit = async (e) => {
        e.preventDefault();
        if (!newDoc.name.trim()) {
            toast.error("Document Name is required.");
            return;
        }
        const updated = [{ ...newDoc, uploadedAt: new Date(), status: "Verified" }, ...currentDocuments];
        const ok = await persistEmployeeUpdate({ userDocuments: updated }, "Document added successfully!");
        if (ok) {
            setShowDocModal(false);
            setNewDoc({ name: "", category: "Government ID", numberOrTag: "", url: "" });
        }
    };

    const handleDeleteDocument = (idx) => {
        if (!canDelete) return;
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

    // 6. Asset Operations
    const currentAssets = useMemo(() => {
        if (Array.isArray(employee?.assets) && employee.assets.length > 0) return employee.assets;
        return DEFAULT_ASSETS;
    }, [employee]);

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

    // 7. Activity Timeline
    const currentActivities = useMemo(() => {
        if (Array.isArray(employee?.activities) && employee.activities.length > 0) return employee.activities;
        return DEFAULT_ACTIVITIES;
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
    
    const managerName = employee?.managerId?.fullName 
        ? employee.managerId.fullName 
        : (typeof employee?.managerId === "string" ? employee.managerId : "Anirudh Joshi");

    const dottedManagerName = employee?.dottedManagerId?.fullName 
        ? employee.dottedManagerId.fullName 
        : null;

    const aboutMeText = employee?.aboutMe || "Dedicated team member at Idea Fueled HRMS, focused on delivering strategic project milestones, fostering cross-departmental collaboration, and driving continuous process improvements.";

    // Tabs definition
    const allProfileTabs = useMemo(() => [
        { key: "Personal", label: "Personal", icon: User },
        { key: "Employment", label: "Employment", icon: Briefcase },
        { key: "Documents", label: "Documents", icon: FileText },
        { key: "Assets", label: "Assets", icon: Laptop },
        { key: "Activity", label: "Activity", icon: History },
    ], []);

    const profileTabs = useMemo(() => {
        if (canViewConfidential) return allProfileTabs;
        return allProfileTabs.filter(t => t.key === "Personal" || t.key === "Employment");
    }, [canViewConfidential, allProfileTabs]);

    useEffect(() => {
        if (!canViewConfidential && activeTab !== "Personal" && activeTab !== "Employment") {
            setActiveTab("Personal");
        }
    }, [canViewConfidential, activeTab]);

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
               TOP HERO SECTION
            ───────────────────────────────────────────── */}
            <div className="premium-3d-card p-6 sm:p-8 relative overflow-hidden bg-white border border-[#E5E7EB] rounded-[24px]">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#2D79C7] via-[#3B82F6] to-[#1E40AF]" />

                <div className="flex flex-col lg:flex-row items-start justify-between gap-6 pt-2">
                    
                    {/* Left: Avatar & Info */}
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

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-2 text-xs font-medium text-gray-500">
                                <span className="flex items-center gap-1.5 font-bold text-[#1E1E1E] bg-[#F8FAFC] border border-gray-200 px-2.5 py-1 rounded-lg">
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

                    {/* Right: Contact & Conditional Edit Action */}
                    <div className="flex flex-col items-start lg:items-end justify-between gap-4 w-full lg:w-auto border-t lg:border-t-0 pt-4 lg:pt-0 border-gray-100">
                        {canEdit && (
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
                                <span className="font-semibold text-gray-700">{empEmail}</span>
                            </div>

                            <div className="flex items-center lg:justify-end gap-2">
                                <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                <span className="font-semibold text-gray-700">{empPhone}</span>
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
                            <p className="text-gray-600 text-xs font-medium leading-relaxed">
                                {aboutMeText}
                            </p>
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
                                        onClick={() => setShowEduModal(true)}
                                        className="text-[#2D79C7] hover:text-[#1F5EA8] text-xs font-bold flex items-center gap-1 cursor-pointer"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Add Degree
                                    </button>
                                )}
                            </div>

                            <div className="space-y-3">
                                {currentEducation.map((edu, idx) => (
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
                                            {canDelete && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteEducation(idx)}
                                                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-rose-600 transition-opacity cursor-pointer"
                                                    title="Delete Education"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
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

                                    {/* Emergency Contact Integrated Block */}
                                    <div className="sm:col-span-2 bg-rose-50/60 border border-rose-100 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mt-1">
                                        <div className="space-y-1">
                                            <span className="text-rose-500 font-extrabold block text-[10.5px] uppercase tracking-wider flex items-center gap-1.5">
                                                <PhoneCall className="w-3.5 h-3.5 text-rose-600" />
                                                Emergency Contact
                                            </span>
                                            <h4 className="text-[#1E1E1E] text-xs font-black">
                                                {employee?.emergencyContactName || "Ramesh Kumar"}
                                            </h4>
                                            <p className="text-gray-500 text-[11px] font-medium">
                                                Relation: <span className="font-bold text-gray-700">{employee?.emergencyContactRelation || "Father"}</span>
                                            </p>
                                        </div>

                                        <div className="bg-white border border-rose-200 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-700 shadow-sm flex items-center gap-2">
                                            <Phone className="w-3.5 h-3.5 text-rose-500" />
                                            <span>{employee?.emergencyContactNumber || employee?.phoneNumber || "+91 98123 45678"}</span>
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
                            {canEdit && (
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
                            {currentExperience.map((exp, idx) => (
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
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ─────────────────────────────────────────────
               TAB 4: DOCUMENTS
            ───────────────────────────────────────────── */}
            {activeTab === "Documents" && (
                <div className="space-y-6">
                    {canEdit && (
                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={() => setShowDocModal(true)}
                                className="bg-[#2D79C7] hover:bg-[#1F5EA8] text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Upload / Add Document</span>
                            </button>
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {currentDocuments.map((doc, idx) => (
                            <div key={idx} className="premium-3d-card p-5 flex flex-col justify-between space-y-4 relative group">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#2D79C7]">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md">
                                            {doc.status || "Verified"}
                                        </span>
                                        {canDelete && (
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteDocument(idx)}
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
                                        onClick={() => setDocModalFile({ name: doc.name, tag: doc.numberOrTag || "Doc-Preview", type: doc.category })}
                                        className="flex-1 flex items-center justify-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold py-2 rounded-xl transition-all cursor-pointer"
                                    >
                                        <Eye className="w-3.5 h-3.5" />
                                        <span>View</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => toast.success(`Downloading ${doc.name}...`)}
                                        className="flex-1 flex items-center justify-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-[#2D79C7] border border-blue-100 text-xs font-bold py-2 rounded-xl transition-all cursor-pointer"
                                    >
                                        <Download className="w-3.5 h-3.5" />
                                        <span>Download</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ─────────────────────────────────────────────
               TAB 5: ASSETS
            ───────────────────────────────────────────── */}
            {activeTab === "Assets" && (
                <div className="space-y-6">
                    {canEdit && (
                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={() => setShowAssetModal(true)}
                                className="bg-[#2D79C7] hover:bg-[#1F5EA8] text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Assign New Asset</span>
                            </button>
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {currentAssets.map((asset, idx) => (
                            <div key={idx} className="premium-3d-card p-6 space-y-4 relative group">
                                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#2D79C7]">
                                            <Laptop className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="text-[#1E1E1E] text-xs font-extrabold">{asset.name}</h4>
                                            <p className="text-gray-400 text-[10.5px]">{asset.category}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-bold px-2 py-0.5 rounded">
                                            {asset.status || "Active"}
                                        </span>
                                        {canDelete && (
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteAsset(idx)}
                                                className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-rose-600 transition-opacity cursor-pointer"
                                                title="Delete Asset"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2 text-xs text-gray-600 font-medium">
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Asset Tag / Serial:</span>
                                        <span className="font-mono font-bold text-[#1E1E1E]">{asset.assetTag || `${empCode}-AST`}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Issued Date:</span>
                                        <span className="font-semibold text-gray-700">{formatDateStr(asset.issuedDate)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Condition:</span>
                                        <span className="text-emerald-600 font-bold">{asset.condition || "Excellent"}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
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
                                <span>Add Educational Qualification</span>
                            </h3>
                            <button type="button" onClick={() => setShowEduModal(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg">
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
                                <button type="button" onClick={() => setShowEduModal(false)} className="bg-white border border-gray-200 text-gray-700 font-bold py-2 px-4 rounded-xl cursor-pointer">
                                    Cancel
                                </button>
                                <button type="submit" disabled={saving} className="bg-[#2D79C7] hover:bg-[#1F5EA8] text-white font-bold py-2 px-5 rounded-xl shadow-sm cursor-pointer">
                                    Add Education
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

                            <div className="flex gap-3 justify-end pt-3 border-t border-gray-100">
                                <button type="button" onClick={() => setShowDocModal(false)} className="bg-white border border-gray-200 text-gray-700 font-bold py-2 px-4 rounded-xl cursor-pointer">
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
               ADD ASSET MODAL
            ───────────────────────────────────────────── */}
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
                            <button type="button" onClick={() => setDocModalFile(null)} className="bg-white border border-gray-200 text-gray-700 text-xs font-bold py-2 px-4 rounded-xl cursor-pointer hover:bg-gray-50">
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

        </div>
    );
};

export default EmployeeProfile;
