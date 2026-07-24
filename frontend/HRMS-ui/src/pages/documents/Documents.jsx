import React, { useState, useEffect, useCallback } from "react";
import {
    Plus, FileText, FileSpreadsheet, Archive, Image as ImageIcon,
    File, Trash2, Edit3, ExternalLink, X, ChevronDown, Folder,
    Calendar, User, Download, Info, Loader2, ArrowUpRight, ShieldAlert
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import ConfirmDialog from "../../components/ConfirmDialog";
import { getAllEmployees } from "../../services/employee.service";
import {
    getDocuments,
    createDocument,
    updateDocument,
    deleteDocument
} from "../../services/document.service";
import { Avatar, SkeletonLoader, EmptyState, SearchBar } from "../../components/SharedComponents";

// Helper to format file sizes
const formatBytes = (bytes, decimals = 2) => {
    if (!bytes) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

// Constants for categories
const COMPANY_CATEGORIES = [
    "HR Policy",
    "Company Handbook",
    "Compliance Guidelines",
    "Reference Materials",
    "Other"
];

const EMPLOYEE_CATEGORIES = [
    "Identity Proof",
    "Educational Certificate",
    "Employment Record",
    "Other"
];

export const Documents = () => {
    const { user } = useAuth();
    const isHrOrAdmin = user?.role === "admin" || user?.role === "hr";
    const showEmployeeDocsTab = isHrOrAdmin;

    // Tab & Filtration States
    const [activeTab, setActiveTab] = useState("company"); // "company" or "employee"
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("");
    const [selectedEmployeeId, setSelectedEmployeeId] = useState(""); // filter employee docs by specific employee
    
    // Core Data States
    const [documents, setDocuments] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [dbCategories, setDbCategories] = useState([]);
    const [loading, setLoading] = useState(true);

    // Reset activeTab if permissions change
    useEffect(() => {
        if (!showEmployeeDocsTab && activeTab === "employee") {
            setActiveTab("company");
        }
    }, [showEmployeeDocsTab, activeTab]);

    // Form/Modal States
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [editingDoc, setEditingDoc] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deletingDoc, setDeletingDoc] = useState(false);
    const [formTitle, setFormTitle] = useState("");
    const [formDescription, setFormDescription] = useState("");
    const [formType, setFormType] = useState("company"); // "company" or "employee"
    const [formCategory, setFormCategory] = useState("");
    const [isCustomCategory, setIsCustomCategory] = useState(false);
    const [formEmployeeId, setFormEmployeeId] = useState("");
    const [formFile, setFormFile] = useState(null);
    const [formUrl, setFormUrl] = useState(""); // manual url fallback
    const [submitting, setSubmitting] = useState(false);

    // Filter employees locally in selector
    const [employeeSearchText, setEmployeeSearchText] = useState("");

    // Fetch documents & employees list
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params = {
                type: activeTab,
                category: selectedCategory || undefined,
                employeeId: activeTab === "employee" && selectedEmployeeId ? selectedEmployeeId : undefined,
                search: searchQuery || undefined
            };

            const docRes = await getDocuments(params);
            if (docRes.data?.success) {
                setDocuments(docRes.data.documents);
                setDbCategories(docRes.data.categories || []);
            }
        } catch (err) {
            console.error("Fetch documents failed:", err);
            toast.error("Failed to load documents.");
        } finally {
            setLoading(false);
        }
    }, [activeTab, selectedCategory, selectedEmployeeId, searchQuery]);

    // Initial load
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Fetch employees for dropdown if admin/hr
    useEffect(() => {
        if (isHrOrAdmin) {
            const loadEmployees = async () => {
                try {
                    const res = await getAllEmployees();
                    if (res.data?.success) {
                        setEmployees(res.data.employees);
                    }
                } catch (err) {
                    console.error("Load employees failed:", err);
                }
            };
            loadEmployees();
        }
    }, [isHrOrAdmin]);

    // Automatically set default category when type changes in form
    useEffect(() => {
        if (formType === "company") {
            setFormCategory(COMPANY_CATEGORIES[0]);
        } else {
            setFormCategory(EMPLOYEE_CATEGORIES[0]);
        }
    }, [formType]);

    // Handle drawer open (Add / Edit)
    const openFormDrawer = (doc = null) => {
        if (doc) {
            setEditingDoc(doc);
            setFormTitle(doc.title);
            setFormDescription(doc.description || "");
            setFormType(doc.type);
            setFormCategory(doc.category);
            setFormEmployeeId(doc.employeeId?._id || doc.employeeId || "");
            setFormUrl(doc.url || "");
            setFormFile(null);

            // Auto detect if custom category
            const standardCats = doc.type === "company" ? COMPANY_CATEGORIES : EMPLOYEE_CATEGORIES;
            if (!standardCats.includes(doc.category)) {
                setIsCustomCategory(true);
            } else {
                setIsCustomCategory(false);
            }
        } else {
            setEditingDoc(null);
            setFormTitle("");
            setFormDescription("");
            setFormType(activeTab); // default to current tab
            setFormCategory(activeTab === "company" ? COMPANY_CATEGORIES[0] : EMPLOYEE_CATEGORIES[0]);
            setFormEmployeeId("");
            setFormUrl("");
            setFormFile(null);
            setIsCustomCategory(false);
        }
        setEmployeeSearchText("");
        setIsDrawerOpen(true);
    };

    // Close form drawer
    const closeFormDrawer = () => {
        setIsDrawerOpen(false);
        setEditingDoc(null);
        setFormFile(null);
    };

    // Handle form submit
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formTitle.trim()) {
            toast.error("Please enter a document title.");
            return;
        }

        if (formType === "employee" && !formEmployeeId) {
            toast.error("Please select an employee.");
            return;
        }

        if (!editingDoc && !formFile && !formUrl.trim()) {
            toast.error("Please upload a file or enter a document URL.");
            return;
        }

        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append("title", formTitle.trim());
            formData.append("description", formDescription.trim());
            formData.append("type", formType);
            formData.append("category", formCategory);
            
            if (formType === "employee") {
                formData.append("employeeId", formEmployeeId);
            }
            if (formFile) {
                formData.append("file", formFile);
            } else if (formUrl.trim()) {
                formData.append("url", formUrl.trim());
            }

            let res;
            if (editingDoc) {
                res = await updateDocument(editingDoc._id, formData);
            } else {
                res = await createDocument(formData);
            }

            if (res.data?.success) {
                toast.success(editingDoc ? "Document updated successfully." : "Document uploaded successfully.");
                closeFormDrawer();
                fetchData();
            } else {
                toast.error(res.data?.message || "Operation failed.");
            }
        } catch (err) {
            console.error("Submit document failed:", err);
            toast.error(err.response?.data?.message || "Failed to save document.");
        } finally {
            setSubmitting(false);
        }
    };

    // Handle document delete
    const handleDelete = (docId) => {
        setDeleteTarget(docId);
    };

    const handleDeleteConfirm = async () => {
        if (!deleteTarget) return;
        setDeletingDoc(true);
        try {
            const res = await deleteDocument(deleteTarget);
            if (res.data?.success) {
                toast.success("Document deleted successfully.");
                fetchData();
            } else {
                toast.error(res.data?.message || "Failed to delete document.");
            }
        } catch (err) {
            console.error("Delete document failed:", err);
            toast.error("Failed to delete document.");
        } finally {
            setDeletingDoc(false);
            setDeleteTarget(null);
        }
    };

    // Get file details visual support
    const getFileVisuals = (fileType, title = "") => {
        const type = (fileType || title.split(".").pop() || "FILE").toUpperCase();
        if (["PDF"].some(t => type.includes(t))) {
            return {
                icon: FileText,
                color: "text-rose-600 bg-rose-50 border-rose-100",
                label: "PDF Document"
            };
        }
        if (["XLS", "XLSX", "CSV", "SHEET"].some(t => type.includes(t))) {
            return {
                icon: FileSpreadsheet,
                color: "text-emerald-600 bg-emerald-50 border-emerald-100",
                label: "Spreadsheet"
            };
        }
        if (["DOC", "DOCX", "WORD"].some(t => type.includes(t))) {
            return {
                icon: FileText,
                color: "text-blue-600 bg-blue-50 border-blue-100",
                label: "Word Document"
            };
        }
        if (["ZIP", "RAR", "TAR", "7Z"].some(t => type.includes(t))) {
            return {
                icon: Archive,
                color: "text-amber-600 bg-amber-50 border-amber-100",
                label: "Archive File"
            };
        }
        if (["PNG", "JPG", "JPEG", "WEBP", "GIF"].some(t => type.includes(t))) {
            return {
                icon: ImageIcon,
                color: "text-violet-600 bg-violet-50 border-violet-100",
                label: "Image Asset"
            };
        }
        return {
            icon: File,
            color: "text-slate-500 bg-slate-50 border-slate-100",
            label: type || "Document"
        };
    };

    // Dynamic categories list based on active tab
    const defaultCats = activeTab === "company" ? COMPANY_CATEGORIES : EMPLOYEE_CATEGORIES;
    const categoriesList = [...new Set([...defaultCats, ...dbCategories])];
    const formCategoriesList = formType === "company" ? COMPANY_CATEGORIES : EMPLOYEE_CATEGORIES;

    // Filter employees by text for combobox
    const filteredEmployees = employees.filter(emp =>
        emp.fullName?.toLowerCase().includes(employeeSearchText.toLowerCase()) ||
        emp.employeeId?.toLowerCase().includes(employeeSearchText.toLowerCase())
    );

    return (
        <div className="space-y-6 select-none animate-fadeIn">
            {/* Header section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-gray-150 gap-4">
                <div>
                    <h2 className="text-[#1E1E1E] text-[20px] font-black tracking-wide">Documents Center</h2>
                    <p className="text-gray-400 text-[12px] font-semibold mt-1">
                        {isHrOrAdmin 
                            ? "Manage company policies, handbooks, and view uploaded employee records." 
                            : "Access official company policies, guidelines, reference handbooks, and archives."}
                    </p>
                </div>
                {isHrOrAdmin && (
                    <button
                        onClick={() => openFormDrawer()}
                        className="bg-[#2D79C7] hover:bg-[#1F5EA8] text-white text-xs font-bold px-4 py-2.5 rounded-[12px] flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm shrink-0 self-start sm:self-auto"
                    >
                        <Plus className="w-4 h-4" /> Add Document
                    </button>
                )}
            </div>

            {/* Role-based sub-tabs header (Only for Admin/HR with permission) */}
            {showEmployeeDocsTab && (
                <div className="flex border-b border-gray-200">
                    <button
                        onClick={() => { setActiveTab("company"); setSelectedCategory(""); setSelectedEmployeeId(""); }}
                        className={`px-5 py-3 text-xs font-extrabold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                            activeTab === "company"
                                ? "border-[#2D79C7] text-[#2D79C7]"
                                : "border-transparent text-gray-400 hover:text-gray-600"
                        }`}
                    >
                        <Folder className="w-4 h-4" />
                        <span>Company Documents</span>
                    </button>
                    <button
                        onClick={() => { setActiveTab("employee"); setSelectedCategory(""); setSelectedEmployeeId(""); }}
                        className={`px-5 py-3 text-xs font-extrabold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
                            activeTab === "employee"
                                ? "border-[#2D79C7] text-[#2D79C7]"
                                : "border-transparent text-gray-400 hover:text-gray-600"
                        }`}
                    >
                        <User className="w-4 h-4" />
                        <span>Employee Documents</span>
                    </button>
                </div>
            )}

            {/* Filter Bar Controls */}
            <div className="premium-3d-card-mini flex flex-col md:flex-row md:items-center justify-between gap-4 p-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
                    <SearchBar
                        value={searchQuery}
                        onChange={setSearchQuery}
                        placeholder="Search document title..."
                    />

                    {/* Category Filter */}
                    <div className="relative">
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="w-full sm:w-48 pl-3 pr-8 h-[38px] bg-white border border-gray-200 rounded-[12px] text-xs font-bold text-gray-600 focus:outline-none focus:border-[#2D79C7] focus:ring-1 focus:ring-[#2D79C7] transition-all cursor-pointer appearance-none shadow-2xs"
                        >
                            <option value="">All Categories</option>
                            {categoriesList.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>

                    {/* Employee Filter (Only for Employee tab on Admin/HR view) */}
                    {activeTab === "employee" && isHrOrAdmin && (
                        <div className="relative">
                            <select
                                value={selectedEmployeeId}
                                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                                className="w-full sm:w-56 pl-3 pr-8 h-[38px] bg-white border border-gray-200 rounded-[12px] text-xs font-bold text-gray-600 focus:outline-none focus:border-[#2D79C7] focus:ring-1 focus:ring-[#2D79C7] transition-all cursor-pointer appearance-none shadow-2xs"
                            >
                                <option value="">All Employees</option>
                                {employees.map(emp => (
                                    <option key={emp._id} value={emp._id}>{emp.fullName} ({emp.employeeId})</option>
                                ))}
                            </select>
                            <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                    )}
                </div>

                {/* Info Note for regular employees */}
                {!isHrOrAdmin && (
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-bold bg-slate-50 border border-slate-100 px-3.5 py-1.5 rounded-full select-none">
                        <Info className="w-3.5 h-3.5 text-[#2D79C7]" />
                        <span>Company-wide resources</span>
                    </div>
                )}
            </div>

            {/* Document display board */}
            {loading ? (
                <SkeletonLoader type="card" rows={6} />
            ) : documents.length === 0 ? (
                <EmptyState
                    message="No documents found"
                    description={searchQuery || selectedCategory || selectedEmployeeId
                        ? "Try resetting your search query or filters to discover matching documents."
                        : "There are no files uploaded in this folder yet."}
                />
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {documents.map((doc) => {
                        const { icon: FileIcon, color: iconColor, label: fileLabel } = getFileVisuals(doc.fileType, doc.title);
                        const employeeName = doc.employeeId?.fullName || "—";
                        const employeePic = doc.employeeId?.profilePicture || "";
                        
                        return (
                            <div
                                key={doc._id}
                                className="premium-3d-card p-5 flex flex-col justify-between relative overflow-hidden group border-b-2 hover:border-b-[#2D79C7]"
                            >
                                <div className="space-y-4">
                                    {/* Badge & Category */}
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-black text-[#2D79C7] bg-blue-50 border border-blue-100/50 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                            {doc.category}
                                        </span>
                                        <span className="text-[9px] text-slate-400 font-bold">
                                            {doc.fileSize || "Link"}
                                        </span>
                                    </div>

                                    {/* Icon + Title */}
                                    <div className="flex items-start gap-3">
                                        <div className={`p-2.5 rounded-[12px] border ${iconColor} shrink-0 shadow-2xs`}>
                                            <FileIcon className="w-5 h-5 stroke-[2]" />
                                        </div>
                                        <div className="space-y-0.5 min-w-0">
                                            <h4 className="text-[#1E1E1E] text-xs font-black break-all group-hover:text-[#2D79C7] transition-colors leading-tight">
                                                {doc.title}
                                            </h4>
                                            <p className="text-gray-400 text-[10px] font-bold">
                                                {fileLabel}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Description */}
                                    <p className="text-gray-500 text-[11.5px] font-semibold leading-relaxed break-all line-clamp-2">
                                        {doc.description || "No description provided."}
                                    </p>
                                </div>

                                <div className="mt-5 space-y-4 pt-3.5 border-t border-slate-100">
                                    {/* Employee Link Visuals (Only for employee tab) */}
                                    {doc.type === "employee" && doc.employeeId && (
                                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 p-2 rounded-[12px]">
                                            <Avatar src={employeePic} name={employeeName} size="w-7 h-7" textSize="text-[8px]" />
                                            <div className="min-w-0">
                                                <p className="text-[#1E1E1E] text-[10.5px] font-black truncate">{employeeName}</p>
                                                <p className="text-gray-400 text-[9px] font-bold">ID: {doc.employeeId?.employeeId || "—"}</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Bottom Meta & Actions */}
                                    <div className="flex justify-between items-center gap-2">
                                        <div className="text-[9.5px] text-gray-400 font-bold flex flex-col gap-0.5 min-w-0">
                                            <span className="truncate">Uploaded by {doc.uploadedBy?.fullName || "System"}</span>
                                            <span>{doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : "—"}</span>
                                        </div>

                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <button
                                                onClick={() => window.open(doc.url, "_blank")}
                                                title="View / Download File"
                                                className="p-1.5 text-slate-500 hover:text-[#2D79C7] bg-slate-50 hover:bg-[#F0F7FF] border border-slate-150 rounded-[8px] transition-all cursor-pointer hover:shadow-2xs"
                                            >
                                                <Download className="w-3.5 h-3.5" />
                                            </button>

                                            {isHrOrAdmin && (
                                                <>
                                                    <button
                                                        onClick={() => openFormDrawer(doc)}
                                                        title="Edit Document"
                                                        className="p-1.5 text-slate-500 hover:text-amber-600 bg-slate-50 hover:bg-amber-50 border border-slate-150 rounded-[8px] transition-all cursor-pointer hover:shadow-2xs"
                                                    >
                                                        <Edit3 className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(doc._id)}
                                                        title="Delete Document"
                                                        className="p-1.5 text-slate-500 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 border border-slate-150 rounded-[8px] transition-all cursor-pointer hover:shadow-2xs"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Slide-out Add / Edit Drawer */}
            {isDrawerOpen && (
                <>
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40" onClick={closeFormDrawer} />
                    <div className="fixed top-0 right-0 h-full w-full max-w-[480px] bg-white z-50 shadow-2xl flex flex-col overflow-hidden animate-slideLeft">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-150 bg-slate-50">
                            <div>
                                <h4 className="text-[#1E1E1E] text-sm font-black tracking-wide">
                                    {editingDoc ? "Edit Document" : "Add New Document"}
                                </h4>
                                <p className="text-gray-400 text-[10.5px] font-bold mt-0.5">
                                    {editingDoc ? "Update the document properties or replace files." : "Upload a file and map its permissions."}
                                </p>
                            </div>
                            <button
                                onClick={closeFormDrawer}
                                className="text-gray-400 hover:text-gray-600 p-1.5 hover:bg-gray-100 rounded-[10px] transition-all cursor-pointer"
                            >
                                <X className="w-4.5 h-4.5" />
                            </button>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
                            {/* Document Title */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Document Title *</label>
                                <input
                                    type="text"
                                    required
                                    value={formTitle}
                                    onChange={(e) => setFormTitle(e.target.value)}
                                    placeholder="Enter custom document title (e.g. Leave Policy 2026)"
                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-[12px] text-xs text-[#1E1E1E] focus:outline-none focus:border-[#2D79C7] focus:ring-1 focus:ring-[#2D79C7] transition-all shadow-inner placeholder-gray-400"
                                />
                            </div>

                            {/* Description */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Description</label>
                                <textarea
                                    value={formDescription}
                                    onChange={(e) => setFormDescription(e.target.value)}
                                    placeholder="Write a brief description about this document..."
                                    rows={3}
                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-[12px] text-xs text-[#1E1E1E] focus:outline-none focus:border-[#2D79C7] focus:ring-1 focus:ring-[#2D79C7] transition-all shadow-inner placeholder-gray-400"
                                />
                            </div>

                            {/* Type (Company / Employee) */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Document Scope *</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setFormType("company")}
                                        className={`py-2 px-3 border text-xs font-bold rounded-[12px] cursor-pointer transition-all ${
                                            formType === "company"
                                                ? "bg-blue-50 border-[#2D79C7] text-[#2D79C7]"
                                                : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                                        }`}
                                    >
                                        Company Resource
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormType("employee")}
                                        className={`py-2 px-3 border text-xs font-bold rounded-[12px] cursor-pointer transition-all ${
                                            formType === "employee"
                                                ? "bg-blue-50 border-[#2D79C7] text-[#2D79C7]"
                                                : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                                        }`}
                                    >
                                        Employee Specific
                                    </button>
                                </div>
                            </div>

                            {/* Employee Selector (Only if Employee type) */}
                            {formType === "employee" && (
                                <div className="space-y-1.5 p-3.5 bg-slate-50 border border-slate-100 rounded-[14px]">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Map to Employee *</label>
                                    
                                    {/* Search textbox inside drawer for filtering */}
                                    <input
                                        type="text"
                                        value={employeeSearchText}
                                        onChange={(e) => setEmployeeSearchText(e.target.value)}
                                        placeholder="Search employee by name or ID..."
                                        className="w-full px-3 py-1.5 mb-2 bg-white border border-gray-200 rounded-[8px] text-[11px] text-[#1E1E1E] focus:outline-none placeholder-gray-400 shadow-2xs"
                                    />

                                    <div className="relative">
                                        <select
                                            value={formEmployeeId}
                                            onChange={(e) => setFormEmployeeId(e.target.value)}
                                            required={formType === "employee"}
                                            className="w-full pl-3 pr-8 py-2 bg-white border border-gray-200 rounded-[10px] text-xs font-bold text-[#1E1E1E] focus:outline-none focus:border-[#2D79C7] transition-all cursor-pointer appearance-none"
                                        >
                                            <option value="">Select Target Employee</option>
                                            {filteredEmployees.map(emp => (
                                                <option key={emp._id} value={emp._id}>
                                                    {emp.fullName} ({emp.employeeId})
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                    </div>
                                    
                                    {filteredEmployees.length === 0 && (
                                        <span className="text-[10px] text-rose-500 font-bold block mt-1">No matching employee found in database.</span>
                                    )}
                                </div>
                            )}

                            {/* Category Selector */}
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Category *</label>
                                <div className="relative">
                                    <select
                                        value={isCustomCategory ? "__new__" : formCategory}
                                        onChange={(e) => {
                                            if (e.target.value === "__new__") {
                                                setIsCustomCategory(true);
                                                setFormCategory("");
                                            } else {
                                                setIsCustomCategory(false);
                                                setFormCategory(e.target.value);
                                            }
                                        }}
                                        className="w-full pl-3 pr-8 py-2 bg-white border border-gray-200 rounded-[12px] text-xs font-bold text-[#1E1E1E] focus:outline-none focus:border-[#2D79C7] transition-all cursor-pointer appearance-none shadow-2xs"
                                    >
                                        {formCategoriesList.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                        <option value="__new__">+ Add Custom Category...</option>
                                    </select>
                                    <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                </div>

                                {isCustomCategory && (
                                    <div className="mt-2 space-y-1">
                                        <label className="text-[9px] font-bold text-[#2D79C7] uppercase tracking-wider">Custom Category Name *</label>
                                        <input
                                            type="text"
                                            required
                                            value={formCategory}
                                            onChange={(e) => setFormCategory(e.target.value)}
                                            placeholder="Enter custom category name (e.g. Legal Agreement)"
                                            className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-[10px] text-xs text-[#1E1E1E] focus:outline-none focus:border-[#2D79C7] focus:ring-1 focus:ring-[#2D79C7] transition-all shadow-inner placeholder-gray-400"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* File Upload Area */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Document File</label>
                                
                                {/* Drag and drop dropzone */}
                                <div className="border-2 border-dashed border-gray-200 hover:border-[#2D79C7] rounded-[16px] p-6 text-center transition-all cursor-pointer bg-slate-50/50 hover:bg-blue-50/10 flex flex-col items-center justify-center relative group">
                                    <input
                                        type="file"
                                        onChange={(e) => setFormFile(e.target.files[0] || null)}
                                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                    />
                                    <FileText className="w-8 h-8 text-gray-300 group-hover:text-[#2D79C7] transition-colors mb-2" />
                                    <span className="text-xs text-slate-500 font-bold">
                                        Drag & drop your document file here
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-semibold mt-1">
                                        Support PDF, Images, Word, Excel, TXT, ZIP up to 10 MB
                                    </span>
                                </div>

                                {/* Active File info badge */}
                                {formFile && (
                                    <div className="flex items-center justify-between p-3.5 bg-blue-50 border border-blue-100 rounded-[14px]">
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <FileText className="w-4.5 h-4.5 text-[#2D79C7] shrink-0" />
                                            <div className="min-w-0">
                                                <p className="text-[#1E1E1E] text-xs font-black truncate">{formFile.name}</p>
                                                <p className="text-gray-400 text-[10px] font-bold">Size: {formatBytes(formFile.size)}</p>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setFormFile(null)}
                                            className="text-gray-400 hover:text-gray-600 p-1 hover:bg-white rounded-full transition-all cursor-pointer"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                )}

                                {/* Fallback URL option if they don't upload file */}
                                <div className="pt-2 border-t border-slate-100 mt-2 space-y-1.5">
                                    <label className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider block">Or Paste Document URL Link</label>
                                    <input
                                        type="url"
                                        value={formUrl}
                                        onChange={(e) => setFormUrl(e.target.value)}
                                        disabled={!!formFile}
                                        placeholder="https://example.com/document-link.pdf"
                                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-[12px] text-xs text-[#1E1E1E] focus:outline-none focus:border-[#2D79C7] focus:ring-1 focus:ring-[#2D79C7] transition-all shadow-inner placeholder-gray-400 disabled:bg-slate-50 disabled:text-slate-400"
                                    />
                                    {editingDoc && !formFile && formUrl && (
                                        <span className="text-[10px] text-[#2D79C7] font-bold flex items-center gap-1">
                                            <Info className="w-3 h-3" /> Current link: <a href={formUrl} target="_blank" rel="noreferrer" className="underline">{formUrl.slice(0, 45)}...</a>
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Footer Submit */}
                            <div className="flex gap-3 pt-6 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={closeFormDrawer}
                                    className="flex-1 py-2.5 border border-gray-200 hover:bg-slate-50 text-xs font-black text-gray-500 rounded-[12px] transition-colors cursor-pointer text-center"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 py-2.5 bg-[#2D79C7] hover:bg-[#1F5EA8] disabled:bg-slate-300 text-xs font-black text-white rounded-[12px] transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                                        </>
                                    ) : (
                                        "Save Document"
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </>
            )}
        </div>
    );
};
