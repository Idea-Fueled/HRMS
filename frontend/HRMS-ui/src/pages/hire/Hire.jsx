import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
    Users, UserPlus, Briefcase, FileText, Calendar, Clock,
    Search, Filter, Plus, Edit3, Trash2, Eye, X, CheckCircle2,
    XCircle, ArrowRight, ChevronRight, Star, ExternalLink,
    Upload, RefreshCw, AlertCircle, ShieldAlert, Award, UserCheck,
    IndianRupee, ArrowUpRight, ChevronDown, Check, Layers, MoveRight,
    Building, Phone, Mail, MapPin, Download, Lock, PauseCircle, PlayCircle,
    Sparkles, Brain, Wand2, Loader2, CheckCircle, Zap, Target, TrendingUp, Cpu, FileUp, SlidersHorizontal
} from "lucide-react";
import { toast } from "sonner";
import { ViewToggle, SkeletonLoader, EmptyState } from "../../components/SharedComponents";
import {
    getHireCandidates,
    addCandidateApi,
    updateCandidateApi,
    updateCandidateStageApi,
    holdCandidateApi,
    unholdCandidateApi,
    scheduleInterviewApi,
    addInterviewFeedbackApi,
    addCandidateDocumentApi,
    deleteCandidateDocumentApi,
    updateOfferDetailsApi,
    archiveCandidateApi,
    deleteCandidateApi,
    parseResumeWithAi,
    searchCandidatesWithAi,
    uploadResumeToAiPool
} from "../../services/hire.service";
import { useAuth } from "../../context/AuthContext";
import { downloadCandidateDocument, fileToDataUrl } from "../../utils/candidateDocumentUtils";
import ConfirmDialog from "../../components/ConfirmDialog";

/* ─────────────────────────────────────────────
   CONSTANTS & PIPELINE STAGES
───────────────────────────────────────────── */
const PIPELINE_STAGES = [
    "New Application",
    "Resume Screening",
    "HR Round",
    "Technical Round 1",
    "Technical Round 2",
    "Manager Round",
    "HR Discussion",
    "Offer Sent",
    "Offer Accepted",
    "Joined",
    "On Hold",
    "Rejected"
];

const STAGE_CONFIG = {
    "New Application": { border: "border-t-indigo-500", dot: "bg-indigo-500", badge: "bg-indigo-50 text-indigo-700 border border-indigo-200" },
    "Resume Screening": { border: "border-t-amber-500", dot: "bg-amber-500", badge: "bg-amber-50 text-amber-700 border border-amber-200" },
    "HR Round": { border: "border-t-purple-500", dot: "bg-purple-500", badge: "bg-purple-50 text-purple-700 border border-purple-200" },
    "Technical Round 1": { border: "border-t-cyan-500", dot: "bg-cyan-500", badge: "bg-cyan-50 text-cyan-700 border border-cyan-200" },
    "Technical Round 2": { border: "border-t-blue-500", dot: "bg-blue-500", badge: "bg-blue-50 text-blue-700 border border-blue-200" },
    "Manager Round": { border: "border-t-teal-500", dot: "bg-teal-500", badge: "bg-teal-50 text-teal-700 border border-teal-200" },
    "HR Discussion": { border: "border-t-violet-500", dot: "bg-violet-500", badge: "bg-violet-50 text-violet-700 border border-violet-200" },
    "Offer Sent": { border: "border-t-emerald-500", dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
    "Offer Accepted": { border: "border-t-green-600", dot: "bg-green-600", badge: "bg-green-50 text-green-700 border border-green-200" },
    "Joined": { border: "border-t-[#2D79C7]", dot: "bg-[#2D79C7]", badge: "bg-blue-100 text-[#2D79C7] border border-blue-200" },
    "On Hold": { border: "border-t-amber-500", dot: "bg-amber-500", badge: "bg-amber-50 text-amber-800 border border-amber-300" },
    "Rejected": { border: "border-t-rose-500", dot: "bg-rose-500", badge: "bg-rose-50 text-rose-700 border border-rose-200" }
};

const HOLD_REASONS = [
    "Candidate Requested Time",
    "Budget / Hiring Freeze",
    "Position On Hold",
    "Waiting for Team / HM Review",
    "Future Consideration",
    "Salary Negotiation On Hold",
    "Other"
];

const POSITIONS = [
    "Senior Full Stack Engineer",
    "Backend Engineer (Node.js)",
    "Frontend Developer (React)",
    "Product Designer (UI/UX)",
    "Product Manager",
    "DevOps & Cloud Specialist",
    "QA Automation Engineer",
    "HR Specialist",
    "HR Generalist"
];

const HR_ASSIGNESS = ["Priya Sharma", "Ananya Verma", "Prashant Kumar"];
const INTERVIEWERS = ["Prashant Kumar", "Anirudh Joshi", "Vikram Sengupta", "Siddharth Malhotra", "Rajesh Kumar", "Amitabh Sen", "Gaurav Malhotra", "Nitin Saxena"];
const DOCUMENT_TYPES = ["Resume", "Portfolio", "Experience Letter", "Offer Letter", "Other"];
const ARCHIVE_REASONS = ["Rejected", "Withdrawn Application", "No Show"];

export const Hire = ({ initialTab }) => {
    const { user } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const isAiRoute = location.pathname.includes("search-by-ai") || initialTab === "search-by-ai";

    const [candidates, setCandidates] = useState([]);
    const [loading, setLoading] = useState(true);

    // Active Top Tab
    const [activeTab, setActiveTab] = useState(isAiRoute ? "search-by-ai" : "dashboard");

    useEffect(() => {
        if (location.pathname.includes("search-by-ai") || initialTab === "search-by-ai") {
            setActiveTab("search-by-ai");
        }
    }, [location.pathname, initialTab]);

    // View mode for Candidates Tab
    const [candidateView, setCandidateView] = useState("list"); // "list" | "card"

    // Search & Filters State
    const [searchTerm, setSearchTerm] = useState("");
    const [filterStage, setFilterStage] = useState("");
    const [filterPosition, setFilterPosition] = useState("");
    const [filterHr, setFilterHr] = useState("");
    const [filterStatus, setFilterStatus] = useState("");
    const [filterInterviewer, setFilterInterviewer] = useState("");

    // Candidate Detail Drawer State
    const [selectedCandidate, setSelectedCandidate] = useState(null);
    const [drawerOpen, setDrawerOpen] = useState(false);

    // Modals State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [prefilledCandidateData, setPrefilledCandidateData] = useState(null);
    const [aiParsingState, setAiParsingState] = useState({
        isOpen: false,
        progress: 0,
        statusText: "",
        fileName: ""
    });
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [candidateToEdit, setCandidateToEdit] = useState(null);

    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [candidateForInterview, setCandidateForInterview] = useState(null);

    const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
    const [interviewForFeedback, setInterviewForFeedback] = useState(null);

    const [isDocModalOpen, setIsDocModalOpen] = useState(false);
    const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [candidateToReject, setCandidateToReject] = useState(null);

    const [isHoldModalOpen, setIsHoldModalOpen] = useState(false);
    const [candidateToHold, setCandidateToHold] = useState(null);

    const [candidateToDelete, setCandidateToDelete] = useState(null);
    const [deletingCandidate, setDeletingCandidate] = useState(false);

    // Dragged candidate ID for Kanban board
    const [draggedCandidateId, setDraggedCandidateId] = useState(null);

    // Load initial candidate data
    const fetchCandidates = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getHireCandidates();
            setCandidates(data || []);
        } catch (err) {
            console.error("Failed to load candidates", err);
            toast.error("Failed to load recruitment candidates");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCandidates();
    }, [fetchCandidates]);

    // Role Security Check
    const role = user?.role?.toLowerCase();
    const isGlobalAdminOrHr = role === "global_admin" || role === "hr";

    if (!isGlobalAdminOrHr) {
        return (
            <div className="bg-white border border-[#E5E7EB] rounded-[20px] p-12 text-center max-w-lg mx-auto my-12 shadow-sm">
                <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-[#1E1E1E]">Access Restricted</h3>
                <p className="text-xs text-gray-500 mt-2">Only Global Admin and HR users can access the Hire module.</p>
            </div>
        );
    }

    /* ─────────────────────────────────────────────
       DYNAMIC DASHBOARD STATS COMPUTATION
    ───────────────────────────────────────────── */
    const stats = useMemo(() => {
        const total = candidates.length;
        const newApps = candidates.filter(c => c.stage === "New Application").length;
        const screening = candidates.filter(c => c.stage === "Resume Screening").length;

        let scheduledInterviewsCount = 0;
        candidates.forEach(c => {
            if (c.interviews && Array.isArray(c.interviews)) {
                scheduledInterviewsCount += c.interviews.filter(i => i.status === "Scheduled").length;
            }
        });

        const offersSent = candidates.filter(c => c.stage === "Offer Sent" || c.status === "Offer Sent").length;
        const joined = candidates.filter(c => c.stage === "Joined" || c.status === "Joined").length;
        const onHold = candidates.filter(c => (c.stage === "On Hold" || c.status === "On Hold") && c.stage !== "Rejected" && !c.archiveReason).length;
        const rejected = candidates.filter(c => c.stage === "Rejected" || c.status === "Rejected").length;

        return { total, newApps, screening, scheduledInterviewsCount, offersSent, joined, onHold, rejected };
    }, [candidates]);

    /* ─────────────────────────────────────────────
       FILTERED CANDIDATES
    ───────────────────────────────────────────── */
    const activeCandidates = useMemo(() => {
        return candidates.filter(c => c.stage !== "Rejected" && c.status !== "Rejected" && !c.archiveReason);
    }, [candidates]);

    const onHoldCandidatesList = useMemo(() => {
        return candidates.filter(c => (c.stage === "On Hold" || c.status === "On Hold") && c.stage !== "Rejected" && !c.archiveReason);
    }, [candidates]);

    const archivedCandidatesList = useMemo(() => {
        return candidates.filter(c => c.stage === "Rejected" || c.status === "Rejected" || Boolean(c.archiveReason));
    }, [candidates]);

    const filteredCandidates = useMemo(() => {
        let baseList = activeCandidates;
        if (activeTab === "archive") {
            baseList = archivedCandidatesList;
        } else if (activeTab === "hold") {
            baseList = onHoldCandidatesList;
        } else if (activeTab === "kanban") {
            baseList = candidates;
        }

        return baseList.filter(cand => {
            if (searchTerm.trim()) {
                const term = searchTerm.toLowerCase();
                const nameMatch = cand.name?.toLowerCase().includes(term);
                const emailMatch = cand.email?.toLowerCase().includes(term);
                const phoneMatch = cand.phone?.includes(term);
                const posMatch = cand.position?.toLowerCase().includes(term);
                const skillsMatch = cand.skills?.some(s => s.toLowerCase().includes(term));
                if (!nameMatch && !emailMatch && !phoneMatch && !posMatch && !skillsMatch) {
                    return false;
                }
            }

            if (filterStage && cand.stage !== filterStage) return false;
            if (filterPosition && cand.position !== filterPosition) return false;
            if (filterHr && cand.assignedHr !== filterHr) return false;
            if (filterStatus && cand.status !== filterStatus) return false;
            if (filterInterviewer) {
                const hasInterviewer = cand.interviews?.some(i => i.interviewer === filterInterviewer);
                if (!hasInterviewer) return false;
            }

            return true;
        });
    }, [candidates, activeCandidates, archivedCandidatesList, activeTab, searchTerm, filterStage, filterPosition, filterHr, filterStatus, filterInterviewer]);

    /* ─────────────────────────────────────────────
       ALL SCHEDULED INTERVIEWS LIST
    ───────────────────────────────────────────── */
    const allInterviewsList = useMemo(() => {
        const list = [];
        candidates.forEach(cand => {
            if (cand.interviews && Array.isArray(cand.interviews)) {
                cand.interviews.forEach(int => {
                    list.push({
                        ...int,
                        candidateId: cand.id,
                        candidateName: cand.name,
                        candidatePhoto: cand.photo,
                        candidatePosition: cand.position,
                        candidateEmail: cand.email,
                        candidateStage: cand.stage
                    });
                });
            }
        });

        if (filterInterviewer) {
            return list.filter(i => i.interviewer === filterInterviewer);
        }
        return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [candidates, filterInterviewer]);

    /* ─────────────────────────────────────────────
       OFFERS LIST
    ───────────────────────────────────────────── */
    const offerCandidatesList = useMemo(() => {
        return candidates.filter(cand =>
            cand.stage === "Offer Sent" ||
            cand.stage === "Offer Accepted" ||
            cand.stage === "Joined" ||
            cand.offerDetails !== null
        );
    }, [candidates]);

    /* ─────────────────────────────────────────────
       HANDLERS FOR ACTIONS
    ───────────────────────────────────────────── */

    const handleOpenDrawer = (cand) => {
        setSelectedCandidate(cand);
        setDrawerOpen(true);
    };

    const handleStartAiParsingFlow = async (file) => {
        if (!file) return;

        setAiParsingState({
            isOpen: true,
            progress: 8,
            statusText: "Initializing AI Resume Parser...",
            fileName: file.name
        });

        const startTime = Date.now();
        const duration = 5200;

        let parseResult = null;
        const parsePromise = parseResumeWithAi(file)
            .then(res => {
                parseResult = res?.parsed || res?.data || res;
            })
            .catch(err => {
                console.error("Resume parsing error:", err);
            });

        await new Promise((resolve) => {
            const interval = setInterval(() => {
                const elapsed = Date.now() - startTime;
                const ratio = Math.min(1, elapsed / duration);
                const currentPct = Math.round(ratio * 96);

                let status = "Scanning document & extracting text...";
                if (currentPct > 20 && currentPct <= 45) {
                    status = "Extracting candidate identity, email & phone...";
                } else if (currentPct > 45 && currentPct <= 70) {
                    status = "Detecting tech stack, skills & domain...";
                } else if (currentPct > 70 && currentPct <= 88) {
                    status = "Calculating experience & current role...";
                } else if (currentPct > 88) {
                    status = "Finalizing profile & prefilling form...";
                }

                setAiParsingState(prev => ({
                    ...prev,
                    progress: Math.max(prev.progress, currentPct),
                    statusText: status
                }));

                if (ratio >= 1) {
                    clearInterval(interval);
                    resolve();
                }
            }, 100);
        });

        await parsePromise;

        setAiParsingState(prev => ({
            ...prev,
            progress: 100,
            statusText: "Resume parsed! Opening candidate form..."
        }));

        await new Promise(r => setTimeout(r, 450));

        setAiParsingState({ isOpen: false, progress: 0, statusText: "", fileName: "" });

        const d = parseResult;
        const prefilled = {
            cvFile: file,
            name: d?.name && d.name !== "New Candidate" ? d.name : "",
            email: d?.email || "",
            phone: d?.phone || "",
            position: d?.position || "",
            currentCompany: d?.currentCompany && d.currentCompany !== "N/A" ? d.currentCompany : "",
            expYears: d?.expYears !== undefined ? String(d.expYears) : "0",
            expMonths: d?.expMonths !== undefined ? String(d.expMonths) : "0",
            skills: d?.skills?.length ? d.skills.join(", ") : "",
            resumeText: d?.rawText || d?.resumeText || "",
            aiSummary: d?.summary || d?.aiSummary || "",
            cvName: file.name
        };

        setPrefilledCandidateData(prefilled);
        setIsAddModalOpen(true);
        toast.success(`Resume for ${prefilled.name || "candidate"} parsed! Form pre-filled.`);
    };

    const handleMoveStage = async (candidateId, nextStage) => {
        try {
            const updated = await updateCandidateStageApi(candidateId, nextStage);
            setCandidates(prev => prev.map(c => c.id === candidateId ? updated : c));
            if (selectedCandidate && selectedCandidate.id === candidateId) {
                setSelectedCandidate(updated);
            }
            toast.success(`Candidate moved to ${nextStage}`);
        } catch {
            toast.error("Failed to update stage");
        }
    };

    const handleOpenHold = (cand) => {
        setCandidateToHold(cand);
        setIsHoldModalOpen(true);
    };

    const handleConfirmHold = async (reason, customNote) => {
        if (!candidateToHold) return;
        try {
            const finalReason = customNote ? `${reason}: ${customNote}` : reason;
            const updated = await holdCandidateApi(candidateToHold.id, finalReason);
            setCandidates(prev => prev.map(c => c.id === candidateToHold.id ? updated : c));
            if (selectedCandidate && selectedCandidate.id === candidateToHold.id) {
                setSelectedCandidate(updated);
            }
            setIsHoldModalOpen(false);
            setCandidateToHold(null);
            toast.success(`${candidateToHold.name} placed on hold`);
        } catch {
            toast.error("Failed to place candidate on hold");
        }
    };

    const handleUnhold = async (candidateId, targetStage = "Resume Screening") => {
        try {
            const updated = await unholdCandidateApi(candidateId, targetStage);
            setCandidates(prev => prev.map(c => c.id === candidateId ? updated : c));
            if (selectedCandidate && selectedCandidate.id === candidateId) {
                setSelectedCandidate(updated);
            }
            toast.success("Candidate restored to active pipeline");
        } catch {
            toast.error("Failed to restore candidate");
        }
    };

    const handleConfirmReject = async (reason) => {
        if (!candidateToReject) return;
        try {
            const updated = await archiveCandidateApi(candidateToReject.id, reason);
            setCandidates(prev => prev.map(c => c.id === candidateToReject.id ? updated : c));
            if (selectedCandidate && selectedCandidate.id === candidateToReject.id) {
                setSelectedCandidate(updated);
            }
            setIsRejectModalOpen(false);
            setCandidateToReject(null);
            toast.success("Candidate moved to Archive");
        } catch {
            toast.error("Failed to archive candidate");
        }
    };

    const handleDeleteCandidate = (candidateId) => {
        const cand = candidates.find(c => c.id === candidateId || c._id === candidateId);
        setCandidateToDelete(cand || { id: candidateId });
    };

    const handleConfirmDeleteCandidate = async () => {
        if (!candidateToDelete) return;
        const candidateId = candidateToDelete.id || candidateToDelete._id;
        try {
            setDeletingCandidate(true);
            await deleteCandidateApi(candidateId);
            setCandidates(prev => prev.filter(c => c.id !== candidateId && c._id !== candidateId));
            if (selectedCandidate?.id === candidateId || selectedCandidate?._id === candidateId) {
                setDrawerOpen(false);
                setSelectedCandidate(null);
            }
            toast.success("Candidate record deleted");
            setCandidateToDelete(null);
        } catch {
            toast.error("Failed to delete candidate");
        } finally {
            setDeletingCandidate(false);
        }
    };

    // Drag and Drop for Kanban Board
    const handleDragStart = (e, candId) => {
        setDraggedCandidateId(candId);
        e.dataTransfer.setData("text/plain", candId);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const handleDropStage = async (e, targetStage) => {
        e.preventDefault();
        const candId = e.dataTransfer.getData("text/plain") || draggedCandidateId;
        if (!candId) return;

        const candidateObj = candidates.find(c => c.id === candId);
        if (candidateObj && (candidateObj.stage !== targetStage || candidateObj.status !== targetStage)) {
            await handleMoveStage(candId, targetStage);
        }
        setDraggedCandidateId(null);
    };

    /* ─────────────────────────────────────────────
       RENDER TAB BUTTONS
    ───────────────────────────────────────────── */
    const navTabs = [
        { id: "dashboard", label: "Dashboard", icon: Layers },
        { id: "candidates", label: "Candidates", icon: Users, count: activeCandidates.length },
        { id: "kanban", label: "Kanban Pipeline", icon: Briefcase },
        { id: "hold", label: "On Hold", icon: PauseCircle, count: onHoldCandidatesList.length },
        { id: "offers", label: "Offers", icon: IndianRupee, count: offerCandidatesList.length },
        { id: "archive", label: "Archive", icon: FileText, count: archivedCandidatesList.length },
        { id: "search-by-ai", label: "Search by AI", icon: Sparkles }
    ];

    return (
        <div className="space-y-6 text-left select-none animate-fadeIn pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                <div>
                    <h2 className="text-[#1E1E1E] text-[22px] font-extrabold flex items-center gap-2">
                        <Briefcase className="w-6 h-6 text-[#2D79C7]" />
                        Hire & Recruitment ATS
                    </h2>
                    <p className="text-gray-400 text-[12px] font-medium mt-1">
                        Enterprise-grade candidate pipeline, interview scheduling, and offer management.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2 bg-[#2D79C7] hover:bg-[#1F5EA8] text-white px-4 py-2 rounded-[12px] text-xs font-bold shadow-md shadow-blue-500/10 transition-all cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Add Candidate</span>
                    </button>
                    <button
                        onClick={fetchCandidates}
                        title="Refresh Candidate Data"
                        className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-[12px] transition-all cursor-pointer"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Top Navigation Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto border-b border-gray-200/80 pb-2 scrollbar-none">
                {navTabs.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => {
                                setActiveTab(tab.id);
                                if (tab.id === "search-by-ai") {
                                    navigate("/hire/search-by-ai");
                                } else if (location.pathname.includes("search-by-ai")) {
                                    navigate("/hire");
                                }
                            }}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-[14px] text-xs font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap ${isActive
                                ? "bg-[#2D79C7] text-white shadow-md shadow-blue-500/15"
                                : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                                }`}
                        >
                            <Icon className="w-4 h-4" />
                            <span>{tab.label}</span>
                            {tab.count !== undefined && (
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${isActive ? "bg-white/20 text-white" : "bg-gray-200/80 text-gray-700"
                                    }`}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Search & Filter Bar */}
            {activeTab !== "dashboard" && activeTab !== "search-by-ai" && (
                <div className="bg-white border border-[#E5E7EB] rounded-[18px] p-4 shadow-[0_1px_4px_rgba(0,0,0,0.02)] space-y-3">
                    <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
                        <div className="relative w-full lg:w-80">
                            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="Search by name, email, skills, position..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-[12px] text-xs text-[#1E1E1E] focus:outline-none focus:border-[#2D79C7] focus:bg-white transition-all placeholder-gray-400"
                            />
                            {searchTerm && (
                                <button onClick={() => setSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        {activeTab === "candidates" && (
                            <ViewToggle view={candidateView} onViewChange={setCandidateView} />
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-gray-100 text-xs">
                        <select
                            value={filterStage}
                            onChange={(e) => setFilterStage(e.target.value)}
                            className="bg-gray-50 border border-gray-200 rounded-[10px] px-3 py-1.5 text-xs text-gray-700 font-semibold focus:outline-none focus:border-[#2D79C7]"
                        >
                            <option value="">All Stages</option>
                            {PIPELINE_STAGES.map(stg => (
                                <option key={stg} value={stg}>{stg}</option>
                            ))}
                        </select>

                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="bg-gray-50 border border-gray-200 rounded-[10px] px-3 py-1.5 text-xs text-gray-700 font-semibold focus:outline-none focus:border-[#2D79C7]"
                        >
                            <option value="">All Statuses</option>
                            <option value="In Progress">In Progress</option>
                            <option value="On Hold">On Hold</option>
                            <option value="Passed">Passed</option>
                            <option value="Offer Sent">Offer Sent</option>
                            <option value="Joined">Joined</option>
                            <option value="Rejected">Rejected</option>
                        </select>
                    </div>

                    {(filterStage || filterPosition || filterHr || filterStatus || filterInterviewer || searchTerm) && (
                        <div className="flex items-center justify-between text-[11px] font-bold text-gray-500 pt-1">
                            <span>Showing {filteredCandidates.length} matches</span>
                            <button
                                onClick={() => {
                                    setSearchTerm("");
                                    setFilterStage("");
                                    setFilterPosition("");
                                    setFilterHr("");
                                    setFilterStatus("");
                                    setFilterInterviewer("");
                                }}
                                className="text-[#2D79C7] hover:underline cursor-pointer font-bold"
                            >
                                Reset All Filters
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* TAB CONTENTS */}
            {loading ? (
                <SkeletonLoader type="card" rows={6} />
            ) : (
                <>
                    {/* TAB 1: DASHBOARD */}
                    {activeTab === "dashboard" && (
                        <DashboardView
                            stats={stats}
                            candidates={candidates}
                            onOpenDrawer={handleOpenDrawer}
                            onAddCandidate={() => setIsAddModalOpen(true)}
                            onScheduleInterview={(cand) => {
                                setCandidateForInterview(cand);
                                setIsScheduleModalOpen(true);
                            }}
                        />
                    )}

                    {/* TAB 2: CANDIDATES */}
                    {activeTab === "candidates" && (
                        <CandidatesView
                            candidates={filteredCandidates}
                            view={candidateView}
                            onOpenDrawer={handleOpenDrawer}
                            onEdit={(cand) => {
                                setCandidateToEdit(cand);
                                setIsEditModalOpen(true);
                            }}
                            onScheduleInterview={(cand) => {
                                setCandidateForInterview(cand);
                                setIsScheduleModalOpen(true);
                            }}
                            onMoveStage={handleMoveStage}
                            onHold={handleOpenHold}
                            onUnhold={handleUnhold}
                            onReject={(cand) => {
                                setCandidateToReject(cand);
                                setIsRejectModalOpen(true);
                            }}
                        />
                    )}

                    {/* TAB 3: KANBAN PIPELINE */}
                    {activeTab === "kanban" && (
                        <KanbanView
                            candidates={filteredCandidates}
                            stages={PIPELINE_STAGES}
                            onOpenDrawer={handleOpenDrawer}
                            onMoveStage={handleMoveStage}
                            onDragStart={handleDragStart}
                            onDragOver={handleDragOver}
                            onDropStage={handleDropStage}
                        />
                    )}

                    {/* TAB 4: ON HOLD */}
                    {activeTab === "hold" && (
                        <OnHoldView
                            candidates={filteredCandidates}
                            onOpenDrawer={handleOpenDrawer}
                            onUnhold={handleUnhold}
                            onReject={(cand) => {
                                setCandidateToReject(cand);
                                setIsRejectModalOpen(true);
                            }}
                            onDelete={handleDeleteCandidate}
                        />
                    )}

                    {/* TAB 5: OFFERS */}
                    {activeTab === "offers" && (
                        <OffersView
                            offers={offerCandidatesList}
                            onOpenDrawer={handleOpenDrawer}
                            onUpdateOffer={(cand) => {
                                setSelectedCandidate(cand);
                                setIsOfferModalOpen(true);
                            }}
                        />
                    )}

                    {/* TAB 6: ARCHIVE */}
                    {activeTab === "archive" && (
                        <ArchiveView
                            candidates={filteredCandidates}
                            onOpenDrawer={handleOpenDrawer}
                            onRestore={(candId) => handleMoveStage(candId, "New Application")}
                            onDelete={handleDeleteCandidate}
                        />
                    )}

                    {/* TAB 7: SEARCH BY AI */}
                    {activeTab === "search-by-ai" && (
                        <SearchByAiView
                            candidates={candidates}
                            onOpenDrawer={handleOpenDrawer}
                            onScheduleInterview={(cand) => {
                                setCandidateForInterview(cand);
                                setIsScheduleModalOpen(true);
                            }}
                            onMoveStage={handleMoveStage}
                            onStartAiParsing={handleStartAiParsingFlow}
                        />
                    )}
                </>
            )}

            {/* CANDIDATE DETAIL DRAWER */}
            {drawerOpen && selectedCandidate && (
                <CandidateDetailDrawer
                    candidate={selectedCandidate}
                    onClose={() => setDrawerOpen(false)}
                    onEdit={() => {
                        setCandidateToEdit(selectedCandidate);
                        setIsEditModalOpen(true);
                    }}
                    onScheduleInterview={() => {
                        setCandidateForInterview(selectedCandidate);
                        setIsScheduleModalOpen(true);
                    }}
                    onMoveStage={handleMoveStage}
                    onHold={handleOpenHold}
                    onUnhold={handleUnhold}
                    onReject={() => {
                        setCandidateToReject(selectedCandidate);
                        setIsRejectModalOpen(true);
                    }}
                    onAddFeedback={(intObj) => {
                        setInterviewForFeedback({ ...intObj, candidate: selectedCandidate });
                        setIsFeedbackModalOpen(true);
                    }}
                    onUploadDoc={() => setIsDocModalOpen(true)}
                    onDeleteDoc={async (candId, docId) => {
                        try {
                            const updated = await deleteCandidateDocumentApi(candId, docId);
                            setCandidates(prev => prev.map(c => c.id === candId ? updated : c));
                            setSelectedCandidate(updated);
                            toast.success("Document removed");
                        } catch {
                            toast.error("Failed to remove document");
                        }
                    }}
                />
            )}

            {/* AI RESUME PARSING PROGRESS OVERLAY */}
            <AiParsingModal {...aiParsingState} />

            {/* MODALS */}
            {isAddModalOpen && (
                <AddCandidateModal
                    initialData={prefilledCandidateData}
                    onClose={() => {
                        setIsAddModalOpen(false);
                        setPrefilledCandidateData(null);
                    }}
                    onSave={async (formData) => {
                        try {
                            const newCand = await addCandidateApi(formData);
                            setCandidates(prev => [newCand, ...prev]);
                            setIsAddModalOpen(false);
                            setPrefilledCandidateData(null);
                            toast.success("Candidate added successfully");
                        } catch {
                            toast.error("Failed to add candidate");
                        }
                    }}
                />
            )}

            {isEditModalOpen && candidateToEdit && (
                <EditCandidateModal
                    candidate={candidateToEdit}
                    onClose={() => {
                        setIsEditModalOpen(false);
                        setCandidateToEdit(null);
                    }}
                    onSave={async (formData) => {
                        try {
                            const updated = await updateCandidateApi(candidateToEdit.id, formData);
                            setCandidates(prev => prev.map(c => c.id === candidateToEdit.id ? updated : c));
                            if (selectedCandidate?.id === candidateToEdit.id) {
                                setSelectedCandidate(updated);
                            }
                            setIsEditModalOpen(false);
                            setCandidateToEdit(null);
                            toast.success("Candidate updated successfully");
                        } catch {
                            toast.error("Failed to update candidate");
                        }
                    }}
                />
            )}

            {isScheduleModalOpen && (
                <ScheduleInterviewModal
                    candidates={candidates}
                    initialCandidate={candidateForInterview}
                    onClose={() => {
                        setIsScheduleModalOpen(false);
                        setCandidateForInterview(null);
                    }}
                    onSave={async (candId, intData) => {
                        try {
                            await scheduleInterviewApi(candId, intData);
                            await fetchCandidates();
                            setIsScheduleModalOpen(false);
                            setCandidateForInterview(null);
                            toast.success("Interview scheduled successfully");
                        } catch {
                            toast.error("Failed to schedule interview");
                        }
                    }}
                />
            )}

            {isFeedbackModalOpen && interviewForFeedback && (
                <AddFeedbackModal
                    interview={interviewForFeedback}
                    onClose={() => {
                        setIsFeedbackModalOpen(false);
                        setInterviewForFeedback(null);
                    }}
                    onSave={async (feedbackData) => {
                        try {
                            const candId = interviewForFeedback.candidateId || interviewForFeedback.candidate?.id;
                            const updated = await addInterviewFeedbackApi(candId, interviewForFeedback.id, feedbackData);
                            setCandidates(prev => prev.map(c => c.id === candId ? updated : c));
                            if (selectedCandidate?.id === candId) {
                                setSelectedCandidate(updated);
                            }
                            setIsFeedbackModalOpen(false);
                            setInterviewForFeedback(null);
                            toast.success("Interview feedback & rating saved");
                        } catch {
                            toast.error("Failed to save feedback");
                        }
                    }}
                />
            )}

            {isDocModalOpen && selectedCandidate && (
                <UploadDocumentModal
                    candidate={selectedCandidate}
                    onClose={() => setIsDocModalOpen(false)}
                    onSave={async (docData) => {
                        try {
                            const updated = await addCandidateDocumentApi(selectedCandidate.id, docData);
                            setCandidates(prev => prev.map(c => c.id === selectedCandidate.id ? updated : c));
                            setSelectedCandidate(updated);
                            setIsDocModalOpen(false);
                            toast.success("Document uploaded successfully");
                        } catch {
                            toast.error("Failed to upload document");
                        }
                    }}
                />
            )}

            {isOfferModalOpen && selectedCandidate && (
                <UpdateOfferModal
                    candidate={selectedCandidate}
                    onClose={() => setIsOfferModalOpen(false)}
                    onSave={async (offerData) => {
                        try {
                            const updated = await updateOfferDetailsApi(selectedCandidate.id, offerData);
                            setCandidates(prev => prev.map(c => c.id === selectedCandidate.id ? updated : c));
                            setSelectedCandidate(updated);
                            setIsOfferModalOpen(false);
                            toast.success("Offer details updated");
                        } catch {
                            toast.error("Failed to update offer");
                        }
                    }}
                />
            )}

            {isHoldModalOpen && candidateToHold && (
                <HoldCandidateModal
                    candidate={candidateToHold}
                    onClose={() => {
                        setIsHoldModalOpen(false);
                        setCandidateToHold(null);
                    }}
                    onConfirm={handleConfirmHold}
                />
            )}

            {isRejectModalOpen && candidateToReject && (
                <RejectCandidateModal
                    candidate={candidateToReject}
                    onClose={() => {
                        setIsRejectModalOpen(false);
                        setCandidateToReject(null);
                    }}
                    onConfirm={handleConfirmReject}
                />
            )}

            {/* CONFIRM DELETE CANDIDATE DIALOG */}
            {candidateToDelete && (
                <ConfirmDialog
                    isOpen={!!candidateToDelete}
                    title="Delete Candidate Record?"
                    message={`Are you sure you want to permanently delete ${candidateToDelete.name || "this candidate"}'s record? This cannot be undone.`}
                    confirmLabel="Delete Candidate"
                    variant="danger"
                    loading={deletingCandidate}
                    onConfirm={handleConfirmDeleteCandidate}
                    onCancel={() => setCandidateToDelete(null)}
                />
            )}
        </div>
    );
};

/* ─────────────────────────────────────────────
   COMPONENT: DASHBOARD VIEW
───────────────────────────────────────────── */
const DashboardView = ({ stats, candidates, onOpenDrawer, onAddCandidate, onScheduleInterview }) => {
    const summaryCards = [
        { label: "Total Candidates", value: stats.total, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
        { label: "New Applications", value: stats.newApps, icon: UserPlus, color: "text-indigo-600", bg: "bg-indigo-50" },
        { label: "Resume Screening", value: stats.screening, icon: FileText, color: "text-amber-600", bg: "bg-amber-50" },
        { label: "Interviews Scheduled", value: stats.scheduledInterviewsCount, icon: Calendar, color: "text-cyan-600", bg: "bg-cyan-50" },
        { label: "Offers Sent", value: stats.offersSent, icon: IndianRupee, color: "text-purple-600", bg: "bg-purple-50" },
        { label: "Joined", value: stats.joined, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
        { label: "On Hold", value: stats.onHold, icon: PauseCircle, color: "text-amber-600", bg: "bg-amber-50" },
        { label: "Rejected", value: stats.rejected, icon: XCircle, color: "text-rose-600", bg: "bg-rose-50" },
    ];

    const recentCandidates = candidates.filter(c => c.stage !== "Rejected" && c.status !== "Rejected" && !c.archiveReason).slice(0, 5);

    return (
        <div className="space-y-6">
            {/* Stat Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-3.5">
                {summaryCards.map((card, idx) => {
                    const Icon = card.icon;
                    return (
                        <div key={idx} className="bg-white border border-[#E5E7EB] rounded-[16px] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex flex-col justify-between hover:shadow-md transition-all">
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide truncate">{card.label}</span>
                                <div className={`p-2 rounded-full ${card.bg} ${card.color}`}>
                                    <Icon className="w-4 h-4" />
                                </div>
                            </div>
                            <div className="text-[24px] font-black text-[#1E1E1E]">{card.value}</div>
                        </div>
                    );
                })}
            </div>

            {/* Middle Section: Recent Candidates */}
            <div className="w-full bg-white border border-[#E5E7EB] rounded-[20px] p-5 shadow-[0_1px_4px_rgba(0,0,0,0.02)]">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                    <h3 className="text-sm font-bold text-[#1E1E1E] flex items-center gap-2">
                        <Users className="w-4 h-4 text-[#2D79C7]" />
                        Recent Candidates
                    </h3>


                </div>

                <div className="divide-y divide-gray-100">
                    {recentCandidates.length === 0 ? (
                        <div className="py-10 text-center text-xs text-gray-400 font-bold space-y-2">
                            <p>No candidates added yet in the recruitment pipeline.</p>
                            <button
                                onClick={onAddCandidate}
                                className="px-3.5 py-2 bg-[#2D79C7] text-white rounded-[10px] text-xs font-bold hover:bg-[#1F5EA8] cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Add First Candidate</span>
                            </button>
                        </div>
                    ) : (
                        recentCandidates.map(cand => (
                            <div key={cand.id} className="py-3 flex items-center justify-between gap-3 hover:bg-gray-50 px-2 rounded-[12px] transition-all">
                                <div className="flex items-center gap-3 min-w-0">
                                    <img
                                        src={cand.photo}
                                        alt={cand.name}
                                        className="w-10 h-10 min-w-10 min-h-10 aspect-square rounded-full object-cover shrink-0 border border-gray-200 shadow-xs"
                                    />
                                    <div className="min-w-0">
                                        <h4 className="text-xs font-bold text-[#1E1E1E] truncate hover:text-[#2D79C7] cursor-pointer" onClick={() => onOpenDrawer(cand)}>
                                            {cand.name}
                                        </h4>
                                        <p className="text-[11px] text-gray-500 truncate">{cand.position} • {cand.experience}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2.5 shrink-0">
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold whitespace-nowrap shrink-0 ${STAGE_CONFIG[cand.stage]?.badge || "bg-blue-50 text-[#2D79C7] border border-blue-100"}`}>
                                        {cand.stage}
                                    </span>
                                    <button
                                        onClick={() => onOpenDrawer(cand)}
                                        className="p-1.5 text-gray-400 hover:text-[#2D79C7] hover:bg-blue-50 rounded-[8px] transition-all cursor-pointer"
                                    >
                                        <Eye className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

/* ─────────────────────────────────────────────
   COMPONENT: CANDIDATES VIEW (List & Card)
───────────────────────────────────────────── */
const CandidatesView = ({ candidates, view, onOpenDrawer, onEdit, onScheduleInterview, onMoveStage, onHold, onUnhold, onReject }) => {
    if (candidates.length === 0) {
        return <EmptyState message="No candidates found" description="Try adjusting your filters or search terms." />;
    }

    if (view === "card") {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {candidates.map(cand => (
                    <div key={cand.id} className="bg-white border border-[#E5E7EB] rounded-[18px] p-4 shadow-[0_1px_4px_rgba(0,0,0,0.02)] flex flex-col justify-between hover:shadow-md transition-all">
                        <div>
                            {/* Card Top */}
                            <div className="flex items-start justify-between gap-3 mb-3">
                                <div className="flex items-center gap-3">
                                    <img
                                        src={cand.photo}
                                        alt={cand.name}
                                        className="w-11 h-11 min-w-11 min-h-11 aspect-square rounded-full object-cover shrink-0 border border-gray-200 shadow-xs"
                                    />
                                    <div>
                                        <h4 className="text-xs font-black text-[#1E1E1E] hover:text-[#2D79C7] cursor-pointer" onClick={() => onOpenDrawer(cand)}>
                                            {cand.name}
                                        </h4>
                                        <p className="text-[11px] text-gray-500 font-medium">{cand.position}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Details */}
                            <div className="space-y-1.5 text-[11px] text-gray-600 font-medium mb-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-400">Exp:</span>
                                    <span className="font-bold text-gray-800">{cand.experience}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-400">Company:</span>
                                    <span className="truncate max-w-[120px] text-gray-800 font-semibold">{cand.currentCompany}</span>
                                </div>
                            </div>

                            {/* Skills badges */}
                            <div className="flex flex-wrap gap-1 mb-4">
                                {(cand.skills || []).slice(0, 3).map((sk, idx) => (
                                    <span key={idx} className="bg-gray-100 text-gray-700 text-[10px] font-semibold px-2 py-0.5 rounded-md">
                                        {sk}
                                    </span>
                                ))}
                                {(cand.skills || []).length > 3 && (
                                    <span className="text-[10px] text-gray-400 font-bold self-center">
                                        +{cand.skills.length - 3} more
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Card Bottom / Stage Pill & Actions */}
                        <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10.5px] font-bold whitespace-nowrap shrink-0 ${STAGE_CONFIG[cand.stage]?.badge || "bg-blue-50 text-[#2D79C7] border border-blue-100"}`}>
                                {cand.stage}
                            </span>

                            <div className="flex items-center gap-1">
                                {cand.stage === "On Hold" ? (
                                    <button
                                        onClick={() => onUnhold(cand.id)}
                                        title="Resume Candidate"
                                        className="p-1.5 text-amber-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-[8px] transition-all cursor-pointer"
                                    >
                                        <PlayCircle className="w-3.5 h-3.5" />
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => onHold(cand)}
                                        title="Put on Hold"
                                        className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-[8px] transition-all cursor-pointer"
                                    >
                                        <PauseCircle className="w-3.5 h-3.5" />
                                    </button>
                                )}
                                <button
                                    onClick={() => onOpenDrawer(cand)}
                                    title="View Candidate Profile"
                                    className="p-1.5 text-gray-500 hover:text-[#2D79C7] hover:bg-gray-100 rounded-[8px] transition-all cursor-pointer"
                                >
                                    <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    onClick={() => onEdit(cand)}
                                    title="Edit Candidate"
                                    className="p-1.5 text-gray-500 hover:text-[#2D79C7] hover:bg-gray-100 rounded-[8px] transition-all cursor-pointer"
                                >
                                    <Edit3 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    // Default List View Table
    return (
        <div className="bg-white border border-[#E5E7EB] rounded-[20px] shadow-[0_1px_4px_rgba(0,0,0,0.02)] overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
                <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-3.5 px-4 whitespace-nowrap">Candidate</th>
                        <th className="py-3.5 px-4 whitespace-nowrap">Position</th>
                        <th className="py-3.5 px-4 whitespace-nowrap">Experience</th>
                        <th className="py-3.5 px-4 whitespace-nowrap">Company</th>
                        <th className="py-3.5 px-4 whitespace-nowrap">Stage</th>
                        <th className="py-3.5 px-4 whitespace-nowrap">Applied Date</th>
                        <th className="py-3.5 px-4 text-right whitespace-nowrap">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                    {candidates.map(cand => (
                        <tr key={cand.id} className="hover:bg-gray-50/80 transition-all">
                            <td className="py-3 px-4">
                                <div className="flex items-center gap-3">
                                    <img
                                        src={cand.photo}
                                        alt={cand.name}
                                        className="w-9 h-9 min-w-9 min-h-9 aspect-square rounded-full object-cover shrink-0 border border-gray-200 shadow-xs"
                                    />
                                    <div className="min-w-0">
                                        <div className="font-bold text-[#1E1E1E] hover:text-[#2D79C7] cursor-pointer truncate max-w-[180px]" onClick={() => onOpenDrawer(cand)}>
                                            {cand.name}
                                        </div>
                                        <div className="text-[11px] text-gray-400 truncate max-w-[180px]">{cand.email}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="py-3 px-4 font-semibold text-gray-800 whitespace-nowrap">{cand.position}</td>
                            <td className="py-3 px-4 text-gray-600 whitespace-nowrap">{cand.experience}</td>
                            <td className="py-3 px-4 text-gray-600 whitespace-nowrap">{cand.currentCompany}</td>
                            <td className="py-3 px-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10.5px] font-bold whitespace-nowrap shrink-0 ${STAGE_CONFIG[cand.stage]?.badge || "bg-blue-50 text-[#2D79C7] border border-blue-100"}`}>
                                    {cand.stage}
                                </span>
                            </td>
                            <td className="py-3 px-4 text-gray-400 whitespace-nowrap">{cand.appliedDate}</td>
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1">
                                    {cand.stage === "On Hold" ? (
                                        <button
                                            onClick={() => onUnhold(cand.id)}
                                            className="p-1.5 text-amber-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-[8px] transition-all cursor-pointer"
                                            title="Resume Candidate"
                                        >
                                            <PlayCircle className="w-4 h-4" />
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => onHold(cand)}
                                            className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-[8px] transition-all cursor-pointer"
                                            title="Put on Hold"
                                        >
                                            <PauseCircle className="w-4 h-4" />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => onOpenDrawer(cand)}
                                        className="p-1.5 text-gray-500 hover:text-[#2D79C7] hover:bg-gray-100 rounded-[8px] transition-all cursor-pointer"
                                        title="View Profile"
                                    >
                                        <Eye className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => onEdit(cand)}
                                        className="p-1.5 text-gray-500 hover:text-[#2D79C7] hover:bg-gray-100 rounded-[8px] transition-all cursor-pointer"
                                        title="Edit Candidate"
                                    >
                                        <Edit3 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => onScheduleInterview(cand)}
                                        className="p-1.5 text-gray-500 hover:text-cyan-600 hover:bg-cyan-50 rounded-[8px] transition-all cursor-pointer"
                                        title="Schedule Interview"
                                    >
                                        <Calendar className="w-4 h-4" />
                                    </button>
                                    {cand.stage !== "Rejected" && (
                                        <button
                                            onClick={() => onReject(cand)}
                                            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-[8px] transition-all cursor-pointer"
                                            title="Reject Candidate"
                                        >
                                            <XCircle className="w-4 h-4" />
                                        </button>
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
   COMPONENT: ELEVATED KANBAN PIPELINE VIEW
───────────────────────────────────────────── */
const KanbanView = ({ candidates, stages, onOpenDrawer, onMoveStage, onDragStart, onDragOver, onDropStage }) => {
    return (
        <div className="flex gap-4 overflow-x-auto pb-6 pt-2 scrollbar-thin select-none min-h-[580px] items-start">
            {stages.map(stg => {
                const stageCandidates = candidates.filter(c => {
                    if (stg === "Joined") {
                        return c.stage === "Joined" || c.status === "Joined" || c.offerDetails?.status === "Joined";
                    }
                    if (stg === "Rejected") {
                        return c.stage === "Rejected" || c.status === "Rejected" || Boolean(c.archiveReason) || c.offerDetails?.status === "Offer Declined";
                    }
                    return c.stage === stg;
                });
                const cfg = STAGE_CONFIG[stg] || { border: "border-t-gray-400", dot: "bg-gray-400", badge: "bg-gray-100 text-gray-700" };

                return (
                    <div
                        key={stg}
                        onDragOver={onDragOver}
                        onDrop={(e) => onDropStage(e, stg)}
                        className={`w-[320px] shrink-0 bg-[#F8FAFC] border border-gray-200 border-t-[4px] ${cfg.border} rounded-[20px] p-3.5 flex flex-col justify-between shadow-xs transition-all`}
                    >
                        <div>
                            {/* Column Header */}
                            <div className="flex items-center justify-between px-3 py-2.5 bg-white border border-gray-200/80 rounded-[14px] shadow-2xs mb-3.5 mt-0.5">
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${cfg.dot}`} />
                                    <h3 className="text-xs font-black text-[#1E1E1E] truncate">{stg}</h3>
                                </div>
                                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black shrink-0 ${cfg.badge}`}>
                                    {stageCandidates.length}
                                </span>
                            </div>

                            {/* Candidate Cards Column */}
                            <div className="space-y-3 min-h-[160px]">
                                {stageCandidates.map(cand => (
                                    <div
                                        key={cand.id}
                                        draggable
                                        onDragStart={(e) => onDragStart(e, cand.id)}
                                        className="bg-white border border-gray-200 rounded-[16px] p-4 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-lg hover:border-[#2D79C7]/50 transition-all duration-200 cursor-grab active:cursor-grabbing space-y-3 relative group"
                                    >
                                        {/* Avatar & Info */}
                                        <div className="flex items-start gap-3">
                                            <img
                                                src={cand.photo}
                                                alt={cand.name}
                                                className="w-11 h-11 min-w-11 min-h-11 aspect-square rounded-full object-cover shrink-0 border border-gray-200 shadow-xs"
                                            />
                                            <div className="min-w-0 flex-1">
                                                <h4
                                                    className="text-sm font-extrabold text-[#1E1E1E] truncate hover:text-[#2D79C7] cursor-pointer transition-colors leading-snug"
                                                    onClick={() => onOpenDrawer(cand)}
                                                >
                                                    {cand.name}
                                                </h4>
                                                <p className="text-xs text-gray-500 font-medium truncate mt-0.5">{cand.position}</p>
                                            </div>
                                        </div>

                                        {/* Company & Experience */}
                                        <div className="flex items-center justify-between text-xs text-gray-600 font-medium pt-1.5 border-t border-gray-100">
                                            <span className="bg-blue-50 text-[#2D79C7] font-bold px-2.5 py-0.5 rounded-[8px] text-[11px] border border-blue-100">
                                                {cand.experience}
                                            </span>
                                            <span className="truncate text-gray-700 font-semibold max-w-[130px]">
                                                {cand.currentCompany}
                                            </span>
                                        </div>

                                        {/* Skills tags */}
                                        <div className="flex flex-wrap gap-1">
                                            {(cand.skills || []).slice(0, 3).map((sk, idx) => (
                                                <span key={idx} className="bg-gray-100 text-gray-700 text-[10.5px] font-semibold px-2.5 py-1 rounded-[6px] border border-gray-200/60">
                                                    {sk}
                                                </span>
                                            ))}
                                        </div>

                                        {/* Footer Bar */}
                                        <div className="pt-2.5 border-t border-gray-100 flex items-center justify-end text-xs">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onOpenDrawer(cand);
                                                }}
                                                className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 hover:bg-blue-50 text-gray-600 hover:text-[#2D79C7] rounded-[8px] text-[11px] font-bold transition-all border border-gray-200/80 cursor-pointer"
                                                title="View Profile"
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                                <span>View</span>
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {stageCandidates.length === 0 && (
                                    <div className="h-32 border-2 border-dashed border-gray-200/80 rounded-[16px] flex flex-col items-center justify-center text-gray-400 gap-1.5 bg-white/40 hover:bg-white/80 transition-all">
                                        <Briefcase className="w-5 h-5 text-gray-300 stroke-[1.5]" />
                                        <span className="text-[11px] font-bold">Drop candidate here</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

/* ─────────────────────────────────────────────
   COMPONENT: INTERVIEWS VIEW
───────────────────────────────────────────── */
const InterviewsView = ({ interviews, candidates, onAddFeedback, onScheduleNew }) => {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#1E1E1E]">Scheduled & Completed Interviews</h3>
                <button
                    onClick={onScheduleNew}
                    className="flex items-center gap-1.5 bg-[#2D79C7] text-white px-3.5 py-1.5 rounded-[10px] text-xs font-bold shadow-sm cursor-pointer hover:bg-[#1F5EA8]"
                >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Schedule Interview</span>
                </button>
            </div>

            {interviews.length === 0 ? (
                <EmptyState message="No interviews found" description="Schedule a new interview for candidates." />
            ) : (
                <div className="bg-white border border-[#E5E7EB] rounded-[20px] shadow-[0_1px_4px_rgba(0,0,0,0.02)] overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                                <th className="py-3.5 px-4 whitespace-nowrap">Candidate</th>
                                <th className="py-3.5 px-4 whitespace-nowrap">Interview Round</th>
                                <th className="py-3.5 px-4 whitespace-nowrap">Date & Time</th>
                                <th className="py-3.5 px-4 whitespace-nowrap">Meeting Link</th>
                                <th className="py-3.5 px-4 whitespace-nowrap">Rating & Status</th>
                                <th className="py-3.5 px-4 text-right whitespace-nowrap">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 font-medium">
                            {interviews.map(int => (
                                <tr key={int.id} className="hover:bg-gray-50/80 transition-all">
                                    <td className="py-3 px-4">
                                        <div className="flex items-center gap-2.5">
                                            <img
                                                src={int.candidatePhoto}
                                                alt={int.candidateName}
                                                className="w-9 h-9 min-w-9 min-h-9 aspect-square rounded-full object-cover shrink-0 border border-gray-200 shadow-xs"
                                            />
                                            <div>
                                                <div className="font-bold text-[#1E1E1E] truncate max-w-[170px]">{int.candidateName}</div>
                                                <div className="text-[10px] text-gray-400 truncate max-w-[170px]">{int.candidatePosition}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4 font-bold text-[#2D79C7] whitespace-nowrap">{int.roundName}</td>
                                    <td className="py-3 px-4 text-gray-600 whitespace-nowrap">
                                        <div>{int.date}</div>
                                        <div className="text-[10px] text-gray-400">{int.time}</div>
                                    </td>
                                    <td className="py-3 px-4 whitespace-nowrap">
                                        {int.meetingLink && int.meetingLink !== "#" ? (
                                            <a
                                                href={int.meetingLink}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="inline-flex items-center gap-1 text-[#2D79C7] font-bold hover:underline"
                                            >
                                                <span>Join Meet</span>
                                                <ExternalLink className="w-3 h-3" />
                                            </a>
                                        ) : (
                                            <span className="text-gray-400">N/A</span>
                                        )}
                                    </td>
                                    <td className="py-3 px-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            {int.rating > 0 ? (
                                                <span className="flex items-center text-amber-500 font-bold text-xs">
                                                    <Star className="w-3.5 h-3.5 fill-amber-400 mr-1" />
                                                    {int.rating}/5
                                                </span>
                                            ) : (
                                                <span className="text-gray-400 text-[10px]">No Rating</span>
                                            )}
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap shrink-0 ${int.status === "Passed" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                                                int.status === "Failed" ? "bg-rose-50 text-rose-700 border border-rose-200" :
                                                    "bg-blue-50 text-blue-700 border border-blue-200"
                                                }`}>
                                                {int.status}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4 text-right whitespace-nowrap">
                                        <button
                                            onClick={() => {
                                                const candObj = candidates.find(c => c.id === int.candidateId);
                                                onAddFeedback(int, candObj);
                                            }}
                                            className="px-2.5 py-1 bg-gray-100 hover:bg-[#2D79C7] hover:text-white rounded-[8px] text-[11px] font-bold text-gray-700 transition-all cursor-pointer"
                                        >
                                            {int.rating > 0 ? "Edit Feedback" : "+ Feedback"}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

/* ─────────────────────────────────────────────
   COMPONENT: OFFERS VIEW
───────────────────────────────────────────── */
const OffersView = ({ offers, onOpenDrawer, onUpdateOffer }) => {
    if (offers.length === 0) {
        return <EmptyState message="No offer records found" description="Candidates reaching Offer stage will appear here." />;
    }

    return (
        <div className="bg-white border border-[#E5E7EB] rounded-[20px] shadow-[0_1px_4px_rgba(0,0,0,0.02)] overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
                <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-3.5 px-4 whitespace-nowrap">Candidate</th>
                        <th className="py-3.5 px-4 whitespace-nowrap">Position</th>
                        <th className="py-3.5 px-4 whitespace-nowrap">Offered CTC</th>
                        <th className="py-3.5 px-4 whitespace-nowrap">Offer Date</th>
                        <th className="py-3.5 px-4 whitespace-nowrap">Expected Joining</th>
                        <th className="py-3.5 px-4 whitespace-nowrap">Status</th>
                        <th className="py-3.5 px-4 text-right whitespace-nowrap">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                    {offers.map(cand => {
                        const offer = cand.offerDetails || {};
                        return (
                            <tr key={cand.id} className="hover:bg-gray-50/80 transition-all">
                                <td className="py-3 px-4">
                                    <div className="flex items-center gap-2.5">
                                        <img
                                            src={cand.photo}
                                            alt={cand.name}
                                            className="w-9 h-9 min-w-9 min-h-9 aspect-square rounded-full object-cover shrink-0 border border-gray-200 shadow-xs"
                                        />
                                        <div>
                                            <div className="font-bold text-[#1E1E1E] cursor-pointer hover:text-[#2D79C7] truncate max-w-[170px]" onClick={() => onOpenDrawer(cand)}>
                                                {cand.name}
                                            </div>
                                            <div className="text-[10px] text-gray-400 truncate max-w-[170px]">{cand.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="py-3 px-4 font-semibold text-gray-800 whitespace-nowrap">{cand.position}</td>
                                <td className="py-3 px-4 font-black text-emerald-600 whitespace-nowrap">
                                    <span className="flex items-center gap-0.5">
                                        <IndianRupee className="w-3.5 h-3.5" />
                                        <span>{(offer.offeredCtc || cand.expectedCtc || "").replace(/^₹/, '')}</span>
                                    </span>
                                </td>
                                <td className="py-3 px-4 text-gray-600 whitespace-nowrap">{offer.offerDate || cand.appliedDate}</td>
                                <td className="py-3 px-4 text-gray-600 whitespace-nowrap">{offer.joiningDate || "TBD"}</td>
                                <td className="py-3 px-4 whitespace-nowrap">
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10.5px] font-bold whitespace-nowrap shrink-0 ${cand.status === "Joined" ? "bg-emerald-100 text-emerald-800 border border-emerald-300" :
                                        cand.status === "Offer Accepted" ? "bg-cyan-100 text-cyan-800 border border-cyan-300" :
                                            "bg-purple-100 text-purple-800 border border-purple-300"
                                        }`}>
                                        {cand.status}
                                    </span>
                                </td>
                                <td className="py-3 px-4 text-right whitespace-nowrap">
                                    <button
                                        onClick={() => onUpdateOffer(cand)}
                                        className="px-2.5 py-1 bg-gray-100 hover:bg-[#2D79C7] hover:text-white rounded-[8px] text-[11px] font-bold text-gray-700 transition-all cursor-pointer whitespace-nowrap"
                                    >
                                        Manage Offer
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

/* ─────────────────────────────────────────────
   COMPONENT: ON HOLD VIEW
───────────────────────────────────────────── */
const OnHoldView = ({ candidates, onOpenDrawer, onUnhold, onReject, onDelete }) => {
    if (candidates.length === 0) {
        return (
            <EmptyState
                message="No candidates on hold"
                description="Candidates placed on hold will appear here. You can put candidates on hold from the Candidates list, Kanban board, or profile drawer."
            />
        );
    }

    return (
        <div className="bg-white border border-[#E5E7EB] rounded-[20px] shadow-[0_1px_4px_rgba(0,0,0,0.02)] overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
                <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-3.5 px-4 whitespace-nowrap">Candidate</th>
                        <th className="py-3.5 px-4 whitespace-nowrap">Position</th>
                        <th className="py-3.5 px-4 whitespace-nowrap">Hold Reason / Note</th>
                        <th className="py-3.5 px-4 whitespace-nowrap">Applied Date</th>
                        <th className="py-3.5 px-4 text-right whitespace-nowrap">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                    {candidates.map(cand => (
                        <tr key={cand.id} className="hover:bg-gray-50/80 transition-all">
                            <td className="py-3 px-4">
                                <div className="flex items-center gap-2.5">
                                    <img
                                        src={cand.photo}
                                        alt={cand.name}
                                        className="w-9 h-9 min-w-9 min-h-9 aspect-square rounded-full object-cover shrink-0 border border-gray-200 shadow-xs"
                                    />
                                    <div>
                                        <div className="font-bold text-[#1E1E1E] cursor-pointer hover:text-[#2D79C7] truncate max-w-[170px]" onClick={() => onOpenDrawer(cand)}>
                                            {cand.name}
                                        </div>
                                        <div className="text-[10px] text-gray-400 truncate max-w-[170px]">{cand.email}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="py-3 px-4 text-gray-700 whitespace-nowrap">{cand.position}</td>
                            <td className="py-3 px-4 whitespace-nowrap">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-bold whitespace-nowrap shrink-0 bg-amber-50 text-amber-800 border border-amber-300">
                                    <PauseCircle className="w-3 h-3 text-amber-600" />
                                    <span>{cand.holdReason || "Placed on hold"}</span>
                                </span>
                            </td>
                            <td className="py-3 px-4 text-gray-400 whitespace-nowrap">{cand.appliedDate}</td>
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1.5">
                                    <button
                                        onClick={() => onUnhold(cand.id)}
                                        className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-[8px] text-[11px] font-bold transition-all cursor-pointer border border-emerald-200/80 whitespace-nowrap"
                                        title="Resume Candidate to Active Pipeline"
                                    >
                                        <PlayCircle className="w-3.5 h-3.5" />
                                        <span>Resume</span>
                                    </button>
                                    <button
                                        onClick={() => onOpenDrawer(cand)}
                                        className="p-1.5 text-gray-500 hover:text-[#2D79C7] hover:bg-gray-100 rounded-[8px] transition-all cursor-pointer"
                                        title="View Profile"
                                    >
                                        <Eye className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => onReject(cand)}
                                        className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-[8px] transition-all cursor-pointer"
                                        title="Reject Candidate"
                                    >
                                        <XCircle className="w-4 h-4" />
                                    </button>
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
   COMPONENT: ARCHIVE VIEW
───────────────────────────────────────────── */
const ArchiveView = ({ candidates, onOpenDrawer, onRestore, onDelete }) => {
    if (candidates.length === 0) {
        return <EmptyState message="Archive is empty" description="Rejected or withdrawn candidate applications appear here." />;
    }

    return (
        <div className="bg-white border border-[#E5E7EB] rounded-[20px] shadow-[0_1px_4px_rgba(0,0,0,0.02)] overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
                <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-3.5 px-4 whitespace-nowrap">Candidate</th>
                        <th className="py-3.5 px-4 whitespace-nowrap">Position</th>
                        <th className="py-3.5 px-4 whitespace-nowrap">Archive Reason</th>
                        <th className="py-3.5 px-4 whitespace-nowrap">Applied Date</th>
                        <th className="py-3.5 px-4 text-right whitespace-nowrap">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                    {candidates.map(cand => (
                        <tr key={cand.id} className="hover:bg-gray-50/80 transition-all opacity-80 hover:opacity-100">
                            <td className="py-3 px-4">
                                <div className="flex items-center gap-2.5">
                                    <img
                                        src={cand.photo}
                                        alt={cand.name}
                                        className="w-9 h-9 min-w-9 min-h-9 aspect-square rounded-full object-cover shrink-0 border border-gray-200 shadow-xs"
                                    />
                                    <div>
                                        <div className="font-bold text-[#1E1E1E] cursor-pointer hover:text-[#2D79C7] truncate max-w-[170px]" onClick={() => onOpenDrawer(cand)}>
                                            {cand.name}
                                        </div>
                                        <div className="text-[10px] text-gray-400 truncate max-w-[170px]">{cand.email}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="py-3 px-4 text-gray-700 whitespace-nowrap">{cand.position}</td>
                            <td className="py-3 px-4 whitespace-nowrap">
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10.5px] font-bold whitespace-nowrap shrink-0 bg-rose-50 text-rose-700 border border-rose-200">
                                    {cand.archiveReason || "Rejected"}
                                </span>
                            </td>
                            <td className="py-3 px-4 text-gray-400 whitespace-nowrap">{cand.appliedDate}</td>
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-2">
                                    <button
                                        onClick={() => onRestore(cand.id)}
                                        className="px-2.5 py-1 bg-blue-50 text-[#2D79C7] hover:bg-[#2D79C7] hover:text-white rounded-[8px] text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap"
                                    >
                                        Restore to Pipeline
                                    </button>
                                    <button
                                        onClick={() => onDelete(cand.id)}
                                        className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-[8px] transition-all cursor-pointer"
                                        title="Delete Permanently"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
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
   COMPONENT: SEARCH BY AI VIEW (MODERN & SLEEK)
───────────────────────────────────────────── */
const SUGGESTED_TAGS = [
    { label: "⚡ React & Node.js (MERN)", query: "React Node.js MongoDB Express Frontend Backend" },
    { label: "🐍 Python & AI/ML", query: "Python Django FastAPI Machine Learning Data" },
    { label: "🎨 UI/UX Designer", query: "UI/UX Designer Figma Wireframing Prototyping" },
    { label: "☁️ DevOps & AWS", query: "DevOps Docker Kubernetes AWS Cloud CI/CD" },
    { label: "📱 React Native / Mobile", query: "React Native Flutter iOS Android Mobile" },
    { label: "🧪 QA Automation", query: "QA Automation Selenium Cypress Testing" },
    { label: "🚀 Senior Tech Lead", query: "Team Lead Architecture Microservices System Design 5+ years" }
];

const calculateLocalAiScore = (candidate, query, minExp) => {
    const candSkills = (candidate.skills || []).map(s => s.toLowerCase());
    const candPosition = (candidate.position || "").toLowerCase();
    const candExp = parseFloat(candidate.experience) || 0;
    const candResumeText = (candidate.resumeText || "").toLowerCase();
    const candSummary = (candidate.aiSummary || "").toLowerCase();

    if (!query || !query.trim()) {
        return {
            matchScore: 0,
            matchingSkills: [],
            matchedRole: false,
            aiRationale: ""
        };
    }

    const tokens = query.toLowerCase().split(/[\s,+/&|]+/).map(t => t.trim()).filter(t => t.length > 1);
    const matchedSkills = [];
    let roleMatched = false;

    tokens.forEach(tok => {
        const isSkillMatch = candSkills.some(s => s.includes(tok) || tok.includes(s));
        const isRoleMatch = candPosition.includes(tok);
        const isResumeMatch = candResumeText.includes(tok) || candSummary.includes(tok);

        if (isSkillMatch) {
            const originalSkill = (candidate.skills || []).find(s => s.toLowerCase().includes(tok)) || tok;
            if (!matchedSkills.includes(originalSkill)) matchedSkills.push(originalSkill);
        }
        if (isRoleMatch) roleMatched = true;
    });

    let score = 25;
    // Skill relevance
    if (tokens.length > 0) {
        score += Math.min(50, Math.round((matchedSkills.length / Math.max(1, tokens.length)) * 50));
    }
    // Overall skill breadth
    if (candSkills.length > 0) {
        score += Math.min(15, candSkills.length * 2);
    }
    // Target position fit
    if (roleMatched) {
        score += 15;
    }
    // Experience criteria
    if (minExp && minExp !== "all") {
        const targetExp = parseFloat(minExp);
        if (candExp >= targetExp) score += 10;
        else score -= 12;
    }

    const finalScore = Math.min(99, Math.max(25, score));
    const rationale = matchedSkills.length > 0
        ? `Matched ${matchedSkills.length} skill${matchedSkills.length > 1 ? "s" : ""} (${matchedSkills.slice(0, 4).join(", ")}) for ${candidate.position || "role"} with ${candExp} yrs experience.`
        : `Candidate background aligns with ${candExp} yrs experience in ${candidate.position || "general domain"}.`;

    return {
        matchScore: finalScore,
        matchingSkills: matchedSkills,
        matchedRole: roleMatched,
        aiRationale: rationale
    };
};

const SearchByAiView = ({ candidates, onOpenDrawer, onScheduleInterview, onAddWithResume, onStartAiParsing }) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [minExpFilter, setMinExpFilter] = useState("all");
    const [stageFilter, setStageFilter] = useState("all");
    const [isSearching, setIsSearching] = useState(false);
    const [showDropzone, setShowDropzone] = useState(true);
    const [isDragOver, setIsDragOver] = useState(false);
    const [rankedList, setRankedList] = useState([]);

    const hasQuery = Boolean(searchQuery.trim());

    const performSearch = useCallback(async (queryText, expVal, stgVal) => {
        setIsSearching(true);
        let baseList = [...candidates];

        if (stgVal && stgVal !== "all") {
            baseList = baseList.filter(c => c.stage === stgVal);
        }

        if (expVal && expVal !== "all") {
            const minNum = parseFloat(expVal);
            baseList = baseList.filter(c => (parseFloat(c.experience) || 0) >= minNum);
        }

        const scored = baseList.map(cand => {
            const scoreData = calculateLocalAiScore(cand, queryText, expVal);
            return {
                ...cand,
                ...scoreData
            };
        });

        if (queryText.trim()) {
            scored.sort((a, b) => b.matchScore - a.matchScore);
        }

        setRankedList(scored);

        if (queryText.trim()) {
            try {
                const res = await searchCandidatesWithAi({
                    query: queryText,
                    minExp: expVal !== "all" ? parseFloat(expVal) : undefined,
                    stage: stgVal !== "all" ? stgVal : undefined
                });
                if (res?.success && Array.isArray(res?.candidates) && res.candidates.length > 0) {
                    const backendMap = new Map(res.candidates.map(c => [c.id, c]));
                    const merged = scored.map(cand => {
                        const fromBackend = backendMap.get(cand.id);
                        if (fromBackend) {
                            return {
                                ...cand,
                                matchScore: fromBackend.matchScore ?? cand.matchScore,
                                matchingSkills: fromBackend.matchingSkills?.length ? fromBackend.matchingSkills : cand.matchingSkills,
                                aiRationale: fromBackend.aiRationale || cand.aiRationale
                            };
                        }
                        return cand;
                    }).sort((a, b) => b.matchScore - a.matchScore);
                    setRankedList(merged);
                }
            } catch {
                // Keep local scored
            } finally {
                setIsSearching(false);
            }
        } else {
            setIsSearching(false);
        }
    }, [candidates]);

    useEffect(() => {
        performSearch(searchQuery, minExpFilter, stageFilter);
    }, [searchQuery, minExpFilter, stageFilter, candidates, performSearch]);

    const handleResetAll = () => {
        setSearchQuery("");
        setMinExpFilter("all");
        setStageFilter("all");
    };

    return (
        <div className="space-y-4">
            {/* CLEAN & SIMPLE AI SEARCH BOX */}
            <div className="bg-white border border-gray-200 rounded-2xl p-4.5 sm:p-5 shadow-xs space-y-4">
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#2D79C7] to-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-[#1E1E1E]">Search by AI</h3>
                            <p className="text-xs text-gray-500">
                                Search and match candidates by skills, position, or experience using AI.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            type="button"
                            onClick={() => setShowDropzone(!showDropzone)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                showDropzone
                                    ? "bg-blue-50 text-[#2D79C7] border-blue-300 shadow-2xs"
                                    : "bg-white hover:bg-gray-50 text-gray-600 border-gray-200"
                            }`}
                        >
                            <FileUp className="w-3.5 h-3.5 text-[#2D79C7]" />
                            <span>{showDropzone ? "Hide Dropzone" : "Resume Dropzone"}</span>
                        </button>
                    </div>
                </div>

                {/* Resume Dropzone */}
                {showDropzone && (
                    <div
                        onDragOver={(e) => {
                            e.preventDefault();
                            setIsDragOver(true);
                        }}
                        onDragLeave={(e) => {
                            e.preventDefault();
                            setIsDragOver(false);
                        }}
                        onDrop={(e) => {
                            e.preventDefault();
                            setIsDragOver(false);
                            const f = e.dataTransfer?.files?.[0];
                            const handler = onStartAiParsing || onAddWithResume;
                            if (f && handler) {
                                handler(f);
                            }
                        }}
                        className={`border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer relative ${
                            isDragOver
                                ? "border-[#2D79C7] bg-blue-50/70 scale-[1.01]"
                                : "border-blue-200 bg-blue-50/20 hover:bg-blue-50/40"
                        }`}
                    >
                        <input
                            type="file"
                            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                            onChange={(e) => {
                                const f = e.target.files?.[0];
                                const handler = onStartAiParsing || onAddWithResume;
                                if (f && handler) {
                                    handler(f);
                                }
                                e.target.value = "";
                            }}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                        />
                        <div className="flex flex-col items-center justify-center space-y-1.5 pointer-events-none">
                            <div className="w-10 h-10 rounded-full bg-blue-50 text-[#2D79C7] flex items-center justify-center shadow-xs border border-blue-100">
                                <Upload className="w-5 h-5 text-[#2D79C7]" />
                            </div>
                            <p className="text-xs font-bold text-gray-800">
                                Drag & drop candidate resume here (PDF, DOC, DOCX)
                            </p>
                            <p className="text-[11px] text-gray-500">
                                Scans candidate credentials in 5-6s and opens prefilled Add Candidate form
                            </p>
                        </div>
                    </div>
                )}

                {/* Search Input Bar */}
                <div className="relative flex items-center bg-gray-50 border border-gray-200 rounded-xl p-1.5 focus-within:bg-white focus-within:border-[#2D79C7] focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                    <div className="pl-3 pr-2 text-[#2D79C7]">
                        {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    </div>
                    <input
                        type="text"
                        placeholder="Search by required skills, target role, or experience (e.g. React, Node.js, 3+ years experience)..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                performSearch(searchQuery, minExpFilter, stageFilter);
                            }
                        }}
                        className="w-full bg-transparent border-0 text-[#1E1E1E] placeholder-gray-400 text-xs sm:text-[13px] font-medium focus:outline-none py-1.5 px-1"
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => setSearchQuery("")}
                            className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200 transition-all cursor-pointer mr-1.5 shrink-0"
                            title="Clear"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => performSearch(searchQuery, minExpFilter, stageFilter)}
                        className="bg-[#2D79C7] hover:bg-[#205E9E] text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
                    >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Search</span>
                    </button>
                </div>

                {/* Filters & Quick Tags Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-100 text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Experience Filter */}
                        <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1">
                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                            <select
                                value={minExpFilter}
                                onChange={(e) => setMinExpFilter(e.target.value)}
                                className="bg-transparent border-0 text-xs text-gray-700 font-semibold focus:outline-none cursor-pointer"
                            >
                                <option value="all">Any Experience</option>
                                <option value="1">1+ Years</option>
                                <option value="3">3+ Years</option>
                                <option value="5">5+ Years</option>
                                <option value="8">8+ Years Senior</option>
                            </select>
                        </div>

                        {/* Stage Filter */}
                        <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1">
                            <Briefcase className="w-3.5 h-3.5 text-gray-400" />
                            <select
                                value={stageFilter}
                                onChange={(e) => setStageFilter(e.target.value)}
                                className="bg-transparent border-0 text-xs text-gray-700 font-semibold focus:outline-none cursor-pointer"
                            >
                                <option value="all">All Stages</option>
                                {PIPELINE_STAGES.map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>

                        {/* Suggestions Tags */}
                        <div className="hidden lg:flex items-center gap-1.5 pl-2 border-l border-gray-200">
                            <span className="text-[11px] text-gray-400 font-medium">Quick:</span>
                            {SUGGESTED_TAGS.map((tag) => (
                                <button
                                    key={tag.label}
                                    type="button"
                                    onClick={() => setSearchQuery(tag.query)}
                                    className="bg-gray-50 hover:bg-blue-50 text-gray-600 hover:text-[#2D79C7] border border-gray-200 hover:border-blue-200 px-2 py-0.5 rounded-md text-[11px] font-medium transition-all cursor-pointer"
                                >
                                    {tag.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-gray-500 font-semibold">
                        <span className="bg-blue-50 text-[#2D79C7] px-2.5 py-0.5 rounded-full font-bold">
                            {rankedList.length} Candidates
                        </span>
                        {(searchQuery || minExpFilter !== "all" || stageFilter !== "all") && (
                            <button
                                type="button"
                                onClick={handleResetAll}
                                className="text-[#2D79C7] hover:underline cursor-pointer font-bold text-xs"
                            >
                                Reset
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* CANDIDATES RESULTS LIST */}
            {rankedList.length === 0 ? (
                <EmptyState
                    message="No candidates found"
                    description="Try searching with different skills, keywords, or reset filters."
                />
            ) : (
                <div className="space-y-3">
                    {rankedList.map((cand) => {
                        const score = cand.matchScore || 0;
                        const initials = (cand.name || "C")
                            .split(" ")
                            .map(n => n[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase();

                        return (
                            <div
                                key={cand.id}
                                className="bg-white border border-[#E5E7EB] hover:border-[#2D79C7]/40 rounded-xl p-4 shadow-2xs hover:shadow-xs transition-all space-y-3"
                            >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        {cand.photo ? (
                                            <img
                                                src={cand.photo}
                                                alt={cand.name}
                                                className="w-10 h-10 min-w-10 min-h-10 rounded-full object-cover border border-gray-200 shrink-0"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 min-w-10 min-h-10 rounded-full bg-blue-50 text-[#2D79C7] font-bold text-xs flex items-center justify-center shrink-0">
                                                {initials}
                                            </div>
                                        )}

                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h4
                                                    onClick={() => onOpenDrawer(cand)}
                                                    className="text-xs font-bold text-[#1E1E1E] hover:text-[#2D79C7] cursor-pointer truncate"
                                                >
                                                    {cand.name}
                                                </h4>
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${STAGE_CONFIG[cand.stage]?.badge || "bg-gray-100 text-gray-700"}`}>
                                                    {cand.stage}
                                                </span>
                                                <span className="text-gray-300 text-xs">•</span>
                                                <span className="text-xs font-semibold text-gray-600">
                                                    {cand.experience || "0 Yrs"} Exp
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-gray-500 truncate mt-0.5">
                                                <span className="font-semibold text-gray-700">{cand.position}</span>
                                                {cand.currentCompany && cand.currentCompany !== "N/A" && (
                                                    <>
                                                        <span className="mx-1.5 text-gray-300">•</span>
                                                        <span>{cand.currentCompany}</span>
                                                    </>
                                                )}
                                                {cand.email && (
                                                    <>
                                                        <span className="mx-1.5 text-gray-300">•</span>
                                                        <span className="text-gray-400">{cand.email}</span>
                                                    </>
                                                )}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Score pill & actions */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        {hasQuery && score > 0 ? (
                                            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                                                score >= 75
                                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                    : score >= 50
                                                    ? "bg-blue-50 text-[#2D79C7] border border-blue-200"
                                                    : "bg-gray-100 text-gray-600 border border-gray-200"
                                            }`}>
                                                <Sparkles className="w-3.5 h-3.5" />
                                                <span>{score}% Match</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1 px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-full text-[11px] font-medium text-gray-500">
                                                <FileText className="w-3 h-3 text-gray-400" />
                                                <span>Profile Indexed</span>
                                            </div>
                                        )}

                                        <button
                                            type="button"
                                            onClick={() => onScheduleInterview(cand)}
                                            className="px-3 py-1.5 bg-blue-50 hover:bg-[#2D79C7] text-[#2D79C7] hover:text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                                        >
                                            <Calendar className="w-3.5 h-3.5" />
                                            <span>Schedule</span>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => onOpenDrawer(cand)}
                                            className="p-1.5 text-gray-400 hover:text-[#2D79C7] hover:bg-blue-50 rounded-lg transition-all cursor-pointer"
                                            title="View Profile"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* AI Match Insight note (when query is active) */}
                                {hasQuery && cand.aiRationale && (
                                    <div className="bg-blue-50/50 border border-blue-100/80 rounded-lg px-3 py-1.5 text-[11.5px] text-gray-700 flex items-center gap-2">
                                        <Wand2 className="w-3.5 h-3.5 text-[#2D79C7] shrink-0" />
                                        <span><strong>AI Insight:</strong> {cand.aiRationale}</span>
                                    </div>
                                )}

                                {/* Skills */}
                                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100 text-xs">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        {(cand.skills || []).slice(0, 10).map((sk, i) => {
                                            const isMatched = hasQuery && (cand.matchingSkills || []).some(m => m.toLowerCase() === sk.toLowerCase());
                                            return (
                                                <span
                                                    key={i}
                                                    className={`text-[11px] px-2.5 py-0.5 rounded-md font-medium transition-all ${
                                                        isMatched
                                                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold"
                                                            : "bg-gray-100 text-gray-700"
                                                    }`}
                                                >
                                                    {isMatched && "✓ "}{sk}
                                                </span>
                                            );
                                        })}
                                        {(cand.skills || []).length > 10 && (
                                            <span className="text-[10px] text-gray-400 font-medium">
                                                +{cand.skills.length - 10} more
                                            </span>
                                        )}
                                    </div>

                                    {cand.aiSummary && (
                                        <span className="text-[11px] text-gray-400 italic max-w-sm truncate hidden sm:inline">
                                            "{cand.aiSummary}"
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

/* ─────────────────────────────────────────────
   AI RESUME PARSING PROGRESS OVERLAY
───────────────────────────────────────────── */
const AiParsingModal = ({ isOpen, progress, statusText, fileName }) => {
    if (!isOpen) return null;

    const steps = [
        { id: 1, label: "Scanning Document", threshold: 18 },
        { id: 2, label: "Identity & Contacts", threshold: 45 },
        { id: 3, label: "Skills & Experience", threshold: 72 },
        { id: 4, label: "Pre-filling Profile", threshold: 92 },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fadeIn select-none">
            <div className="bg-white rounded-[20px] shadow-2xl border border-gray-100 max-w-md w-full p-6 space-y-5">
                {/* Top Badge & Icon */}
                <div className="text-center space-y-3">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-50 text-[#2D79C7] ring-8 ring-blue-50/70 shadow-xs relative">
                        <Sparkles className="w-7 h-7 text-[#2D79C7] animate-pulse" />
                        <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-[#2D79C7]"></span>
                        </span>
                    </div>

                    <div>
                        <h3 className="text-base font-black text-[#1E1E1E]">Parsing Resume with AI</h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Extracting candidate credentials & auto-filling form
                        </p>
                    </div>

                    {fileName && (
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-50 border border-gray-200 rounded-full text-xs text-gray-700 font-medium max-w-xs truncate">
                            <FileText className="w-3.5 h-3.5 text-[#2D79C7] shrink-0" />
                            <span className="truncate">{fileName}</span>
                        </div>
                    )}
                </div>

                {/* Progress Bar & Percentage */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-gray-600 flex items-center gap-1.5">
                            <Loader2 className="w-3.5 h-3.5 text-[#2D79C7] animate-spin shrink-0" />
                            <span className="truncate">{statusText || "Parsing resume..."}</span>
                        </span>
                        <span className="font-black text-[#2D79C7] text-sm tabular-nums">
                            {Math.min(100, Math.round(progress))}%
                        </span>
                    </div>

                    {/* Progress Track */}
                    <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden p-0.5 border border-gray-200/50">
                        <div
                            className="h-full bg-gradient-to-r from-[#2D79C7] via-blue-500 to-[#1F5EA8] rounded-full transition-all duration-200 ease-out shadow-xs"
                            style={{ width: `${Math.min(100, Math.max(6, progress))}%` }}
                        />
                    </div>
                </div>

                {/* Steps Micro-List */}
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-100 text-[11px]">
                    {steps.map(step => {
                        const isDone = progress >= step.threshold;
                        const isCurrent = progress < step.threshold && (step.id === 1 || progress >= steps[step.id - 2]?.threshold);
                        return (
                            <div
                                key={step.id}
                                className={`flex items-center gap-2 p-2 rounded-lg transition-all ${
                                    isDone
                                        ? "bg-emerald-50/70 text-emerald-800"
                                        : isCurrent
                                        ? "bg-blue-50/70 text-[#2D79C7] font-semibold"
                                        : "bg-gray-50/50 text-gray-400"
                                }`}
                            >
                                {isDone ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                ) : isCurrent ? (
                                    <Loader2 className="w-3.5 h-3.5 text-[#2D79C7] animate-spin shrink-0" />
                                ) : (
                                    <div className="w-3.5 h-3.5 rounded-full border border-gray-300 shrink-0" />
                                )}
                                <span className="truncate">{step.label}</span>
                            </div>
                        );
                    })}
                </div>

                {/* Footer Note */}
                <div className="text-center text-[10px] text-gray-400 font-medium">
                    5-6 seconds automated parsing • Instant form pre-fill
                </div>
            </div>
        </div>
    );
};

/* ─────────────────────────────────────────────
   CANDIDATE DETAIL DRAWER
───────────────────────────────────────────── */
const CandidateDetailDrawer = ({ candidate, onClose, onEdit, onScheduleInterview, onMoveStage, onHold, onUnhold, onReject, onAddFeedback, onUploadDoc, onDeleteDoc }) => {
    const [drawerTab, setDrawerTab] = useState("basic");

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-xs transition-opacity animate-fadeIn select-none">
            <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-slideLeft">
                {/* Drawer Header */}
                <div className="p-5 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img
                            src={candidate.photo}
                            alt={candidate.name}
                            className="w-12 h-12 min-w-12 min-h-12 aspect-square rounded-full object-cover shrink-0 border-2 border-white shadow-sm"
                        />
                        <div>
                            <h3 className="text-base font-black text-[#1E1E1E]">{candidate.name}</h3>
                            <p className="text-xs text-gray-500 font-medium">{candidate.position}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button onClick={onEdit} className="px-3 py-1.5 bg-white border border-gray-200 rounded-[10px] text-xs font-bold text-gray-700 hover:bg-gray-100 cursor-pointer">
                            Edit
                        </button>
                        <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-200 cursor-pointer">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Stage Banner */}
                <div className={`px-5 py-3 ${candidate.stage === "On Hold" ? "bg-amber-50/90 border-b border-amber-200" : "bg-blue-50/70 border-b border-blue-100"} flex items-center justify-between text-xs`}>
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-gray-500 font-bold">Current Stage:</span>
                        <span className={`font-black ${candidate.stage === "On Hold" ? "text-amber-800" : "text-[#2D79C7]"}`}>{candidate.stage}</span>
                        {candidate.holdReason && (
                            <span className="text-[11px] text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md font-medium">
                                Note: {candidate.holdReason}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <select
                            value={candidate.stage}
                            onChange={(e) => onMoveStage(candidate.id, e.target.value)}
                            className="bg-white border border-blue-200 rounded-[8px] px-2 py-1 text-xs text-gray-800 font-bold focus:outline-none cursor-pointer"
                        >
                            {PIPELINE_STAGES.map(s => (
                                <option key={s} value={s}>Move to {s}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Drawer Nav Tabs */}
                <div className="flex items-center border-b border-gray-200 px-5 gap-6 text-xs font-bold text-gray-500">
                    <button
                        onClick={() => setDrawerTab("basic")}
                        className={`py-3 border-b-2 cursor-pointer transition-all ${drawerTab === "basic" ? "border-[#2D79C7] text-[#2D79C7]" : "border-transparent hover:text-gray-800"}`}
                    >
                        Basic & Professional
                    </button>
                    <button
                        onClick={() => setDrawerTab("timeline")}
                        className={`py-3 border-b-2 cursor-pointer transition-all ${drawerTab === "timeline" ? "border-[#2D79C7] text-[#2D79C7]" : "border-transparent hover:text-gray-800"}`}
                    >
                        Interview Timeline ({(candidate.interviews || []).length})
                    </button>
                    <button
                        onClick={() => setDrawerTab("documents")}
                        className={`py-3 border-b-2 cursor-pointer transition-all ${drawerTab === "documents" ? "border-[#2D79C7] text-[#2D79C7]" : "border-transparent hover:text-gray-800"}`}
                    >
                        Documents ({(candidate.documents || []).length})
                    </button>
                </div>

                {/* Drawer Body Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* TAB: BASIC & PROFESSIONAL */}
                    {drawerTab === "basic" && (
                        <div className="space-y-6">
                            <div>
                                <h4 className="text-xs font-black text-[#1E1E1E] uppercase tracking-wider mb-3">Basic Details</h4>
                                <div className="grid grid-cols-2 gap-4 bg-gray-50/70 p-4 rounded-[14px] border border-gray-200/80 text-xs">
                                    <div>
                                        <span className="text-gray-400 block text-[10px]">Email Address</span>
                                        <span className="font-bold text-gray-800">{candidate.email}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-400 block text-[10px]">Phone Number</span>
                                        <span className="font-bold text-gray-800">{candidate.phone}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-400 block text-[10px]">Location</span>
                                        <span className="font-bold text-gray-800">{candidate.address}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-400 block text-[10px]">Applied Date</span>
                                        <span className="font-bold text-gray-800">{candidate.appliedDate}</span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h4 className="text-xs font-black text-[#1E1E1E] uppercase tracking-wider mb-3">Professional Details</h4>
                                <div className="grid grid-cols-2 gap-4 bg-gray-50/70 p-4 rounded-[14px] border border-gray-200/80 text-xs">
                                    <div>
                                        <span className="text-gray-400 block text-[10px]">Current Company</span>
                                        <span className="font-bold text-gray-800">{candidate.currentCompany}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-400 block text-[10px]">Total Experience</span>
                                        <span className="font-bold text-gray-800">{candidate.experience}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-400 block text-[10px]">Current CTC</span>
                                        <span className="font-bold text-gray-800">{candidate.currentCtc}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-400 block text-[10px]">Expected CTC</span>
                                        <span className="font-bold text-gray-800">{candidate.expectedCtc}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-400 block text-[10px]">Notice Period</span>
                                        <span className="font-bold text-gray-800">{candidate.noticePeriod}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-400 block text-[10px]">Assigned HR</span>
                                        <span className="font-bold text-gray-800">{candidate.assignedHr}</span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h4 className="text-xs font-black text-[#1E1E1E] uppercase tracking-wider mb-2">Skills & Technologies</h4>
                                <div className="flex flex-wrap gap-1.5">
                                    {(candidate.skills || []).map((sk, i) => (
                                        <span key={i} className="bg-blue-50 text-[#2D79C7] text-xs font-bold px-2.5 py-1 rounded-[8px] border border-blue-100">
                                            {sk}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB: INTERVIEW TIMELINE */}
                    {drawerTab === "timeline" && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-black text-[#1E1E1E] uppercase tracking-wider">Interviews & Feedback</h4>
                                <button
                                    onClick={onScheduleInterview}
                                    className="flex items-center gap-1 bg-[#2D79C7] text-white px-3 py-1 rounded-[8px] text-xs font-bold hover:bg-[#1F5EA8] cursor-pointer"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Schedule Round</span>
                                </button>
                            </div>

                            {(candidate.interviews || []).length === 0 ? (
                                <p className="text-xs text-gray-400 italic py-4">No interview rounds scheduled yet.</p>
                            ) : (
                                <div className="space-y-3 relative before:absolute before:left-3 before:top-3 before:bottom-3 before:w-0.5 before:bg-gray-200">
                                    {candidate.interviews.map((int) => (
                                        <div key={int.id} className="relative pl-8 bg-white border border-gray-200 p-4 rounded-[14px] space-y-2">
                                            <span className="absolute left-1.5 top-5 w-3 h-3 rounded-full bg-[#2D79C7] ring-4 ring-blue-50" />
                                            <div className="flex items-center justify-between">
                                                <h5 className="text-xs font-bold text-[#1E1E1E]">{int.roundName}</h5>
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${int.status === "Passed" ? "bg-emerald-50 text-emerald-700" :
                                                    int.status === "Failed" ? "bg-rose-50 text-rose-700" : "bg-blue-50 text-blue-700"
                                                    }`}>
                                                    {int.status}
                                                </span>
                                            </div>

                                            <div className="text-[11px] text-gray-500 font-medium">
                                                Interviewer: <span className="font-bold text-gray-700">{int.interviewer}</span> • {int.date} ({int.time})
                                            </div>

                                            {int.rating > 0 && (
                                                <div className="flex items-center gap-1 text-amber-500 text-xs font-bold">
                                                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                                                    <span>Rating: {int.rating}/5</span>
                                                </div>
                                            )}

                                            {int.feedback ? (
                                                <div className="bg-gray-50 p-2.5 rounded-[8px] text-[11px] text-gray-700 italic border border-gray-150">
                                                    "{int.feedback}"
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => onAddFeedback(int)}
                                                    className="text-[11px] text-[#2D79C7] font-bold hover:underline cursor-pointer"
                                                >
                                                    + Add Rating & Feedback
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB: DOCUMENTS */}
                    {drawerTab === "documents" && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="text-xs font-black text-[#1E1E1E] uppercase tracking-wider">Uploaded Documents</h4>
                                    <p className="text-[11px] text-gray-400 mt-0.5">Click download to get the original uploaded file.</p>
                                </div>
                                <button
                                    onClick={onUploadDoc}
                                    className="flex items-center gap-1.5 bg-[#2D79C7] text-white px-3.5 py-1.5 rounded-[10px] text-xs font-bold hover:bg-[#1F5EA8] cursor-pointer shadow-xs"
                                >
                                    <Upload className="w-3.5 h-3.5" />
                                    <span>Upload Doc</span>
                                </button>
                            </div>

                            {(candidate.documents || []).length === 0 ? (
                                <div className="text-center py-8 border border-dashed border-gray-200 rounded-[14px] bg-gray-50/50 space-y-2">
                                    <FileText className="w-8 h-8 text-gray-300 mx-auto" />
                                    <p className="text-xs text-gray-400 font-medium">No documents uploaded yet for this candidate.</p>
                                    <button
                                        onClick={onUploadDoc}
                                        className="text-xs font-bold text-[#2D79C7] hover:underline cursor-pointer"
                                    >
                                        + Upload First Document
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-2.5">
                                    {candidate.documents.map(doc => {
                                        const hasFileContent = doc.url && doc.url !== "#" && doc.url !== "null";
                                        return (
                                            <div key={doc.id} className="p-3.5 bg-gray-50/80 border border-gray-200 rounded-[14px] flex items-center justify-between text-xs hover:bg-gray-100/70 transition-all">
                                                <div className="flex items-center gap-3 min-w-0 flex-1 pr-3">
                                                    <div className="p-2 bg-blue-100/60 text-[#2D79C7] rounded-[10px] shrink-0">
                                                        <FileText className="w-5 h-5" />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="font-bold text-gray-900 truncate" title={doc.name}>
                                                            {doc.name}
                                                        </div>
                                                        <div className="text-[11px] text-gray-500 flex items-center gap-1.5 mt-0.5">
                                                            <span>{doc.type}</span>
                                                            <span>•</span>
                                                            <span>{doc.size || "Original"}</span>
                                                            {!hasFileContent && (
                                                                <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded-md">
                                                                    No file attached
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    <button
                                                        type="button"
                                                        onClick={() => downloadCandidateDocument(doc, candidate)}
                                                        title={`Download exact original file: ${doc.name}`}
                                                        className="p-2 text-[#2D79C7] hover:text-white hover:bg-[#2D79C7] bg-white border border-blue-200 rounded-[10px] cursor-pointer transition-all shadow-2xs hover:shadow-xs"
                                                    >
                                                        <Download className="w-4 h-4" />
                                                    </button>
                                                    {onDeleteDoc && (
                                                        <button
                                                            type="button"
                                                            onClick={() => onDeleteDoc(candidate.id, doc.id)}
                                                            title="Delete document"
                                                            className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 bg-white border border-gray-200 rounded-[10px] cursor-pointer transition-all"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Drawer Footer Actions */}
                <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onReject}
                            className="px-3.5 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-[10px] text-xs font-bold cursor-pointer"
                        >
                            Reject Candidate
                        </button>
                        {candidate.stage === "On Hold" ? (
                            <button
                                onClick={() => onUnhold(candidate.id)}
                                className="px-3.5 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-[10px] text-xs font-bold cursor-pointer flex items-center gap-1.5"
                            >
                                <PlayCircle className="w-3.5 h-3.5" />
                                <span>Resume</span>
                            </button>
                        ) : (
                            <button
                                onClick={() => onHold(candidate)}
                                className="px-3.5 py-2 bg-amber-50 text-amber-800 hover:bg-amber-100 rounded-[10px] text-xs font-bold cursor-pointer flex items-center gap-1.5"
                            >
                                <PauseCircle className="w-3.5 h-3.5" />
                                <span>Put on Hold</span>
                            </button>
                        )}
                    </div>
                    <button
                        onClick={() => onMoveStage(candidate.id, PIPELINE_STAGES[Math.min(PIPELINE_STAGES.indexOf(candidate.stage) + 1, PIPELINE_STAGES.length - 1)])}
                        className="px-4 py-2 bg-[#2D79C7] hover:bg-[#1F5EA8] text-white rounded-[10px] text-xs font-bold cursor-pointer flex items-center gap-1.5"
                    >
                        <span>Move Next Stage</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ─────────────────────────────────────────────
   MODALS IMPLEMENTATION
───────────────────────────────────────────── */
// Experience formatting helpers
const formatExperience = (years, months) => {
    const y = parseInt(years, 10) || 0;
    const m = parseInt(months, 10) || 0;
    if (y > 0 && m > 0) {
        return `${y} ${y === 1 ? "Yr" : "Yrs"} ${m} ${m === 1 ? "Mo" : "Mos"}`;
    }
    if (y > 0) {
        return `${y} ${y === 1 ? "Yr" : "Yrs"}`;
    }
    if (m > 0) {
        return `${m} ${m === 1 ? "Mo" : "Mos"}`;
    }
    return "0 Yrs";
};

const parseExperience = (expStr = "") => {
    if (!expStr) return { years: "0", months: "0" };
    let years = 0;
    let months = 0;
    const str = String(expStr);
    const yrMatch = str.match(/(\d+(?:\.\d+)?)\s*(?:yr|year|yrs|years)/i);
    const moMatch = str.match(/(\d+)\s*(?:mo|month|mos|months)/i);
    if (yrMatch) {
        const floatYrs = parseFloat(yrMatch[1]);
        years = Math.floor(floatYrs);
        const remMonths = Math.round((floatYrs - years) * 12);
        if (remMonths > 0) months = remMonths;
    }
    if (moMatch) {
        months = parseInt(moMatch[1], 10);
    }
    if (!yrMatch && !moMatch) {
        const num = parseFloat(str);
        if (!isNaN(num)) {
            years = Math.floor(num);
            months = Math.round((num - years) * 12);
        }
    }
    return { years: String(years || 0), months: String(months || 0) };
};

const AddCandidateModal = ({ onClose, onSave, initialData = null, initialFile = null }) => {
    const initialCv = initialData?.cvFile || initialFile || null;
    const initialSkillsCount = initialData?.skills
        ? initialData.skills.split(",").map(s => s.trim()).filter(Boolean).length
        : 0;
    const initialExpText = (initialData?.expYears && initialData.expYears !== "0") || (initialData?.expMonths && initialData.expMonths !== "0")
        ? `${initialData.expYears || 0} Yrs ${initialData.expMonths && initialData.expMonths !== "0" ? initialData.expMonths + " Mos" : ""}`.trim()
        : "Auto-detected";

    const [cvFile, setCvFile] = useState(initialCv);
    const [isSaving, setIsSaving] = useState(false);
    const [isParsing, setIsParsing] = useState(false);
    const [aiParsedSuccess, setAiParsedSuccess] = useState(Boolean(initialData));
    const [aiExtractedCount, setAiExtractedCount] = useState({
        skills: initialSkillsCount,
        exp: initialExpText
    });
    const [resumeText, setResumeText] = useState(initialData?.resumeText || "");
    const [aiSummary, setAiSummary] = useState(initialData?.aiSummary || "");
    const [expYears, setExpYears] = useState(initialData?.expYears || "0");
    const [expMonths, setExpMonths] = useState(initialData?.expMonths || "0");
    const [isModalDragOver, setIsModalDragOver] = useState(false);
    const [form, setForm] = useState({
        name: initialData?.name || "",
        email: initialData?.email || "",
        phone: initialData?.phone || "",
        address: initialData?.address || "",
        position: initialData?.position || "",
        currentCompany: initialData?.currentCompany || "",
        currentCtc: initialData?.currentCtc || "",
        expectedCtc: initialData?.expectedCtc || "",
        noticePeriod: initialData?.noticePeriod || "",
        skills: initialData?.skills || "",
        assignedHr: initialData?.assignedHr || HR_ASSIGNESS[0],
        stage: initialData?.stage || "New Application"
    });

    const handleResumeAutoFill = async (file) => {
        if (!file) return;
        setCvFile(file);
        setIsParsing(true);
        setAiParsedSuccess(false);
        try {
            toast.loading("Scanning resume with AI engine...", { id: "ai-parse" });
            const res = await parseResumeWithAi(file);
            const d = res?.parsed || res?.data || res;
            if (d && (d.name || d.email || (d.skills && d.skills.length > 0) || d.position)) {
                setForm(prev => ({
                    ...prev,
                    name: d.name && d.name !== "New Candidate" ? d.name : prev.name,
                    email: d.email || prev.email,
                    phone: d.phone || prev.phone,
                    position: d.position || prev.position,
                    currentCompany: d.currentCompany && d.currentCompany !== "N/A" ? d.currentCompany : prev.currentCompany,
                    skills: d.skills && d.skills.length > 0 ? d.skills.join(", ") : prev.skills
                }));
                if (d.expYears !== undefined) {
                    setExpYears(String(d.expYears));
                }
                if (d.expMonths !== undefined) {
                    setExpMonths(String(d.expMonths));
                }
                setResumeText(d.rawText || d.resumeText || "");
                setAiSummary(d.summary || d.aiSummary || "");
                setAiParsedSuccess(true);
                setAiExtractedCount({
                    skills: d.skills?.length || 0,
                    exp: d.experience || (d.expYears ? `${d.expYears} Yrs` : "Detected")
                });
                toast.success("Resume parsed! Form auto-filled.", { id: "ai-parse" });
            } else {
                toast.info("Resume attached. Fill in any missing details.", { id: "ai-parse" });
            }
        } catch (err) {
            console.error("AI parse error:", err);
            toast.error("Could not auto-extract text from resume, but file is attached.", { id: "ai-parse" });
        } finally {
            setIsParsing(false);
        }
    };

    useEffect(() => {
        if (initialFile && !initialData) {
            handleResumeAutoFill(initialFile);
        }
    }, [initialFile, initialData]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name.trim() || !form.email.trim()) {
            toast.error("Name and email are required");
            return;
        }
        setIsSaving(true);
        let cvDataUrl = null;
        if (cvFile) {
            try {
                cvDataUrl = await fileToDataUrl(cvFile);
            } catch {
                cvDataUrl = null;
            }
        }
        const formattedExp = formatExperience(expYears, expMonths);
        await onSave({
            ...form,
            experience: formattedExp,
            cvFile,
            cvDataUrl,
            cvName: cvFile ? cvFile.name : "",
            resumeText,
            aiSummary
        });
        setIsSaving(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fadeIn select-none">
            <div className="bg-white rounded-[20px] shadow-2xl border border-gray-200 max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-[10px] bg-blue-50 text-[#2D79C7] flex items-center justify-center font-bold">
                            <UserPlus className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-[#1E1E1E]">Add New Candidate</h3>
                            <p className="text-[11px] text-gray-400">Fill details manually or upload a resume for instant AI auto-fill</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                </div>

                {/* AI Auto-Fill Resume Dropzone */}
                <div
                    onDragOver={(e) => {
                        e.preventDefault();
                        setIsModalDragOver(true);
                    }}
                    onDragLeave={(e) => {
                        e.preventDefault();
                        setIsModalDragOver(false);
                    }}
                    onDrop={(e) => {
                        e.preventDefault();
                        setIsModalDragOver(false);
                        const f = e.dataTransfer?.files?.[0];
                        if (f) handleResumeAutoFill(f);
                    }}
                    className={`rounded-[14px] border border-dashed p-3.5 transition-all ${
                        isModalDragOver
                            ? "border-[#2D79C7] bg-blue-50/80 scale-[1.01]"
                            : "border-gray-300 bg-gray-50/80 hover:bg-gray-100/60"
                    }`}
                >
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-[10px] bg-blue-50 text-[#2D79C7] flex items-center justify-center shrink-0">
                                {isParsing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                            </div>
                            <div>
                                <span className="text-xs font-bold text-[#1E1E1E]">Auto-fill with Resume</span>
                                <p className="text-[11px] text-gray-500">
                                    Upload CV (PDF/DOCX) to fill candidate details automatically.
                                </p>
                            </div>
                        </div>
                        <label className="cursor-pointer bg-white hover:bg-gray-100 text-[#2D79C7] border border-gray-200 px-3 py-1.5 rounded-[10px] text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 shrink-0">
                            <Upload className="w-3.5 h-3.5" />
                            <span>{isParsing ? "Scanning..." : cvFile ? "Change File" : "Upload File"}</span>
                            <input
                                type="file"
                                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                onChange={e => {
                                    const f = e.target.files?.[0];
                                    if (f) handleResumeAutoFill(f);
                                }}
                                disabled={isParsing}
                                className="hidden"
                            />
                        </label>
                    </div>

                    {isParsing && (
                        <div className="mt-2.5 pt-2 border-t border-gray-200 flex items-center gap-2 text-xs text-[#2D79C7] font-semibold">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Extracting text, contact info, and skills from resume...</span>
                        </div>
                    )}

                    {aiParsedSuccess && !isParsing && (
                        <div className="mt-2.5 pt-2 border-t border-gray-200 flex items-center justify-between text-xs flex-wrap gap-2 text-emerald-700 font-medium">
                            <div className="flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Auto-filled from <strong>{cvFile?.name}</strong></span>
                            </div>
                            <span className="text-[11px] text-gray-500">
                                {aiExtractedCount.skills} skills • {aiExtractedCount.exp}
                            </span>
                        </div>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="space-y-3 text-xs">
                    <div>
                        <label className="block text-gray-500 font-bold mb-1">Full Name *</label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. Rahul Sharma"
                            value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                            className="w-full p-2 bg-gray-50 border border-gray-200 rounded-[10px] focus:outline-none focus:border-[#2D79C7]"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-gray-500 font-bold mb-1">Email *</label>
                            <input
                                type="email"
                                required
                                placeholder="e.g. rahul@example.com"
                                value={form.email}
                                onChange={e => setForm({ ...form, email: e.target.value })}
                                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-[10px] focus:outline-none focus:border-[#2D79C7]"
                            />
                        </div>
                        <div>
                            <label className="block text-gray-500 font-bold mb-1">Phone</label>
                            <input
                                type="text"
                                placeholder="+91 98765 43210"
                                value={form.phone}
                                onChange={e => setForm({ ...form, phone: e.target.value })}
                                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-[10px] focus:outline-none focus:border-[#2D79C7]"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-gray-500 font-bold mb-1">Position Applied</label>
                            <input
                                type="text"
                                placeholder="e.g. Software Engineer, BDE, Marketing..."
                                value={form.position}
                                onChange={e => setForm({ ...form, position: e.target.value })}
                                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-[10px] focus:outline-none focus:border-[#2D79C7]"
                            />
                        </div>
                        <div>
                            <label className="block text-gray-500 font-bold mb-1">Experience (Years & Months)</label>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="relative w-full">
                                    <input
                                        type="number"
                                        min="0"
                                        max="50"
                                        placeholder="0"
                                        value={expYears}
                                        onChange={e => setExpYears(e.target.value)}
                                        className="w-full p-2 pr-11 bg-gray-50 border border-gray-200 rounded-[10px] focus:outline-none focus:border-[#2D79C7] text-xs font-medium"
                                    />
                                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 pointer-events-none">
                                        Years
                                    </span>
                                </div>
                                <div className="relative w-full">
                                    <input
                                        type="number"
                                        min="0"
                                        max="11"
                                        placeholder="0"
                                        value={expMonths}
                                        onChange={e => setExpMonths(e.target.value)}
                                        className="w-full p-2 pr-12 bg-gray-50 border border-gray-200 rounded-[10px] focus:outline-none focus:border-[#2D79C7] text-xs font-medium"
                                    />
                                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 pointer-events-none">
                                        Months
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-gray-500 font-bold mb-1">Current Company</label>
                        <input
                            type="text"
                            placeholder="e.g. Infosys / TCS / Freelance"
                            value={form.currentCompany}
                            onChange={e => setForm({ ...form, currentCompany: e.target.value })}
                            className="w-full p-2 bg-gray-50 border border-gray-200 rounded-[10px] focus:outline-none focus:border-[#2D79C7]"
                        />
                    </div>

                    <div>
                        <label className="block text-gray-500 font-bold mb-1">Skills (comma separated)</label>
                        <input
                            type="text"
                            placeholder="React, Node.js, TypeScript, SQL..."
                            value={form.skills}
                            onChange={e => setForm({ ...form, skills: e.target.value })}
                            className="w-full p-2 bg-gray-50 border border-gray-200 rounded-[10px] focus:outline-none focus:border-[#2D79C7]"
                        />
                    </div>

                    <div>
                        <label className="block text-gray-500 font-bold mb-1">Attached CV / Resume</label>
                        <div className="flex items-center gap-2 p-2 bg-gray-50 border border-gray-200 rounded-[10px]">
                            <input
                                type="file"
                                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                onChange={e => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        handleResumeAutoFill(file);
                                    }
                                }}
                                disabled={isParsing}
                                className="w-full text-xs text-gray-600 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-[#2D79C7]/10 file:text-[#2D79C7] hover:file:bg-[#2D79C7]/20 cursor-pointer"
                            />
                        </div>
                        {cvFile && (
                            <p className="text-[11px] text-emerald-600 font-bold mt-1 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Selected: {cvFile.name}
                            </p>
                        )}
                    </div>

                    <div className="pt-4 flex justify-end gap-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-[10px] text-gray-600 font-bold cursor-pointer">Cancel</button>
                        <button type="submit" disabled={isSaving || isParsing} className="px-4 py-2 bg-[#2D79C7] text-white rounded-[10px] font-bold hover:bg-[#1F5EA8] cursor-pointer disabled:opacity-50">
                            {isSaving ? "Saving..." : "Save Candidate"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const EditCandidateModal = ({ candidate, onClose, onSave }) => {
    const initialExp = parseExperience(candidate?.experience);
    const [expYears, setExpYears] = useState(initialExp.years);
    const [expMonths, setExpMonths] = useState(initialExp.months);
    const [form, setForm] = useState({
        ...candidate,
        position: candidate?.position || "",
        currentCompany: candidate?.currentCompany || "",
        email: candidate?.email || "",
        phone: candidate?.phone || "",
        currentCtc: candidate?.currentCtc || "",
        expectedCtc: candidate?.expectedCtc || "",
        noticePeriod: candidate?.noticePeriod || "",
        skills: Array.isArray(candidate?.skills) ? candidate.skills.join(", ") : (candidate?.skills || "")
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        const formattedExp = formatExperience(expYears, expMonths);
        const cleanedSkills = typeof form.skills === "string"
            ? form.skills.split(",").map(s => s.trim()).filter(Boolean)
            : (form.skills || []);
        onSave({
            ...form,
            experience: formattedExp,
            skills: cleanedSkills
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fadeIn select-none">
            <div className="bg-white rounded-[20px] shadow-2xl border border-gray-200 max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                    <div>
                        <h3 className="text-sm font-bold text-[#1E1E1E]">Edit Candidate Details</h3>
                        <p className="text-[11px] text-gray-400">Update candidate profile, position, company, and compensation</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer"><X className="w-4 h-4" /></button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3 text-xs">
                    <div>
                        <label className="block text-gray-500 font-bold mb-1">Full Name *</label>
                        <input
                            type="text"
                            required
                            value={form.name || ""}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                            className="w-full p-2 bg-gray-50 border border-gray-200 rounded-[10px] focus:outline-none focus:border-[#2D79C7]"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-gray-500 font-bold mb-1">Position / Job Title</label>
                            <input
                                type="text"
                                placeholder="e.g. Software Engineer, BDE, Marketing..."
                                value={form.position || ""}
                                onChange={e => setForm({ ...form, position: e.target.value })}
                                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-[10px] focus:outline-none focus:border-[#2D79C7]"
                            />
                        </div>
                        <div>
                            <label className="block text-gray-500 font-bold mb-1">Current Company</label>
                            <input
                                type="text"
                                placeholder="e.g. Baseline IT, ToXSL, DigiWolves..."
                                value={form.currentCompany || ""}
                                onChange={e => setForm({ ...form, currentCompany: e.target.value })}
                                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-[10px] focus:outline-none focus:border-[#2D79C7]"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-gray-500 font-bold mb-1">Email</label>
                            <input
                                type="email"
                                placeholder="candidate@example.com"
                                value={form.email || ""}
                                onChange={e => setForm({ ...form, email: e.target.value })}
                                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-[10px] focus:outline-none focus:border-[#2D79C7]"
                            />
                        </div>
                        <div>
                            <label className="block text-gray-500 font-bold mb-1">Phone</label>
                            <input
                                type="text"
                                placeholder="+91 98765 43210"
                                value={form.phone || ""}
                                onChange={e => setForm({ ...form, phone: e.target.value })}
                                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-[10px] focus:outline-none focus:border-[#2D79C7]"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-gray-500 font-bold mb-1">Experience (Years & Months)</label>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="relative w-full">
                                <input
                                    type="number"
                                    min="0"
                                    max="50"
                                    placeholder="0"
                                    value={expYears}
                                    onChange={e => setExpYears(e.target.value)}
                                    className="w-full p-2 pr-11 bg-gray-50 border border-gray-200 rounded-[10px] focus:outline-none focus:border-[#2D79C7] text-xs font-medium"
                                />
                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 pointer-events-none">
                                    Years
                                </span>
                            </div>
                            <div className="relative w-full">
                                <input
                                    type="number"
                                    min="0"
                                    max="11"
                                    placeholder="0"
                                    value={expMonths}
                                    onChange={e => setExpMonths(e.target.value)}
                                    className="w-full p-2 pr-12 bg-gray-50 border border-gray-200 rounded-[10px] focus:outline-none focus:border-[#2D79C7] text-xs font-medium"
                                />
                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 pointer-events-none">
                                    Months
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                            <label className="block text-gray-500 font-bold mb-1">Current CTC</label>
                            <input
                                type="text"
                                placeholder="e.g. 5.5 LPA"
                                value={form.currentCtc || ""}
                                onChange={e => setForm({ ...form, currentCtc: e.target.value })}
                                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-[10px] focus:outline-none focus:border-[#2D79C7]"
                            />
                        </div>
                        <div>
                            <label className="block text-gray-500 font-bold mb-1">Expected CTC</label>
                            <input
                                type="text"
                                placeholder="e.g. 8.0 LPA"
                                value={form.expectedCtc || ""}
                                onChange={e => setForm({ ...form, expectedCtc: e.target.value })}
                                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-[10px] focus:outline-none focus:border-[#2D79C7]"
                            />
                        </div>
                        <div>
                            <label className="block text-gray-500 font-bold mb-1">Notice Period</label>
                            <input
                                type="text"
                                placeholder="e.g. 30 Days"
                                value={form.noticePeriod || ""}
                                onChange={e => setForm({ ...form, noticePeriod: e.target.value })}
                                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-[10px] focus:outline-none focus:border-[#2D79C7]"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-gray-500 font-bold mb-1">Skills (comma separated)</label>
                        <input
                            type="text"
                            placeholder="e.g. Sales, Negotiation, CRM, Lead Generation..."
                            value={form.skills || ""}
                            onChange={e => setForm({ ...form, skills: e.target.value })}
                            className="w-full p-2 bg-gray-50 border border-gray-200 rounded-[10px] focus:outline-none focus:border-[#2D79C7]"
                        />
                    </div>

                    <div className="pt-4 flex justify-end gap-2 border-t border-gray-100">
                        <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-[10px] text-gray-600 font-bold cursor-pointer hover:bg-gray-50">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-[#2D79C7] text-white rounded-[10px] font-bold hover:bg-[#1F5EA8] cursor-pointer">Update Candidate</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const ScheduleInterviewModal = ({ candidates, initialCandidate, onClose, onSave }) => {
    const [candId, setCandId] = useState(initialCandidate?.id || candidates[0]?.id || "");
    const [roundName, setRoundName] = useState("Technical Round 1");
    const [interviewer, setInterviewer] = useState(INTERVIEWERS[0]);
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [time, setTime] = useState("02:00 PM");
    const [meetingLink, setMeetingLink] = useState("https://meet.google.com/new-interview");

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(candId, { roundName, interviewer, date, time, meetingLink });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fadeIn select-none">
            <div className="bg-white rounded-[20px] shadow-2xl border border-gray-200 max-w-md w-full p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                    <h3 className="text-sm font-bold text-[#1E1E1E]">Schedule Interview Round</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3 text-xs">
                    <div>
                        <label className="block text-gray-500 font-bold mb-1">Select Candidate</label>
                        <select
                            value={candId}
                            onChange={e => setCandId(e.target.value)}
                            className="w-full p-2 bg-gray-50 border border-gray-200 rounded-[10px]"
                        >
                            {candidates.map(c => <option key={c.id} value={c.id}>{c.name} ({c.position})</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-gray-500 font-bold mb-1">Interview Round</label>
                        <select
                            value={roundName}
                            onChange={e => setRoundName(e.target.value)}
                            className="w-full p-2 bg-gray-50 border border-gray-200 rounded-[10px]"
                        >
                            <option value="HR Round">HR Round</option>
                            <option value="Technical Round 1">Technical Round 1</option>
                            <option value="Technical Round 2">Technical Round 2</option>
                            <option value="Manager Round">Manager Round</option>
                            <option value="HR Discussion">HR Discussion</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-gray-500 font-bold mb-1">Interviewer</label>
                        <select
                            value={interviewer}
                            onChange={e => setInterviewer(e.target.value)}
                            className="w-full p-2 bg-gray-50 border border-gray-200 rounded-[10px]"
                        >
                            {INTERVIEWERS.map(int => <option key={int} value={int}>{int}</option>)}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-gray-500 font-bold mb-1">Date</label>
                            <input
                                type="date"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-[10px]"
                            />
                        </div>
                        <div>
                            <label className="block text-gray-500 font-bold mb-1">Time</label>
                            <input
                                type="text"
                                value={time}
                                onChange={e => setTime(e.target.value)}
                                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-[10px]"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-gray-500 font-bold mb-1">Meeting Link</label>
                        <input
                            type="text"
                            value={meetingLink}
                            onChange={e => setMeetingLink(e.target.value)}
                            className="w-full p-2 bg-gray-50 border border-gray-200 rounded-[10px]"
                        />
                    </div>

                    <div className="pt-4 flex justify-end gap-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-[10px] text-gray-600 font-bold cursor-pointer">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-[#2D79C7] text-white rounded-[10px] font-bold hover:bg-[#1F5EA8] cursor-pointer">Schedule</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const AddFeedbackModal = ({ interview, onClose, onSave }) => {
    const [rating, setRating] = useState(interview.rating || 4);
    const [feedback, setFeedback] = useState(interview.feedback || "");
    const [status, setStatus] = useState(interview.status || "Passed");

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({ rating, feedback, status });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fadeIn select-none">
            <div className="bg-white rounded-[20px] shadow-2xl border border-gray-200 max-w-md w-full p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                    <h3 className="text-sm font-bold text-[#1E1E1E]">Interview Feedback: {interview.roundName}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3 text-xs">
                    <div>
                        <label className="block text-gray-500 font-bold mb-1">Rating (1 to 5 Stars)</label>
                        <div className="flex items-center gap-2 py-1">
                            {[1, 2, 3, 4, 5].map(num => (
                                <button
                                    key={num}
                                    type="button"
                                    onClick={() => setRating(num)}
                                    className={`p-1.5 rounded-lg border transition-all cursor-pointer ${rating >= num ? "bg-amber-50 border-amber-300 text-amber-500" : "bg-gray-50 border-gray-200 text-gray-300"
                                        }`}
                                >
                                    <Star className={`w-5 h-5 ${rating >= num ? "fill-amber-400" : ""}`} />
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-gray-500 font-bold mb-1">Result Status</label>
                        <select
                            value={status}
                            onChange={e => setStatus(e.target.value)}
                            className="w-full p-2 bg-gray-50 border border-gray-200 rounded-[10px]"
                        >
                            <option value="Passed">Passed</option>
                            <option value="Failed">Failed</option>
                            <option value="On Hold">On Hold</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-gray-500 font-bold mb-1">Interviewer Feedback Notes</label>
                        <textarea
                            rows={4}
                            required
                            value={feedback}
                            onChange={e => setFeedback(e.target.value)}
                            placeholder="Enter technical comments, strengths, area for improvement..."
                            className="w-full p-2 bg-gray-50 border border-gray-200 rounded-[10px] focus:outline-none focus:border-[#2D79C7]"
                        />
                    </div>

                    <div className="pt-4 flex justify-end gap-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-[10px] text-gray-600 font-bold cursor-pointer">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-[#2D79C7] text-white rounded-[10px] font-bold hover:bg-[#1F5EA8] cursor-pointer">Save Feedback</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const UploadDocumentModal = ({ candidate, onClose, onSave }) => {
    const [name, setName] = useState("");
    const [type, setType] = useState("Resume");
    const [docFile, setDocFile] = useState(null);
    const [fileSize, setFileSize] = useState("60 KB");
    const [isUploading, setIsUploading] = useState(false);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setDocFile(file);
            if (!name) {
                setName(file.name);
            }
            const kb = file.size / 1024;
            setFileSize(kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb.toFixed(0)} KB`);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!docFile) {
            toast.error("Please select a file to upload");
            return;
        }
        if (!name.trim()) {
            toast.error("Document name required");
            return;
        }
        setIsUploading(true);
        let docDataUrl = null;
        try {
            docDataUrl = await fileToDataUrl(docFile);
        } catch {
            docDataUrl = null;
        }
        await onSave({
            name: name.trim(),
            type,
            size: fileSize,
            url: docDataUrl || "#"
        });
        setIsUploading(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fadeIn select-none">
            <div className="bg-white rounded-[20px] shadow-2xl border border-gray-200 max-w-sm w-full p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                    <h3 className="text-sm font-bold text-[#1E1E1E]">Upload Document</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer"><X className="w-4 h-4" /></button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3 text-xs">
                    <div>
                        <label className="block text-gray-500 font-bold mb-1">Document Type</label>
                        <select
                            value={type}
                            onChange={e => setType(e.target.value)}
                            className="w-full p-2 bg-gray-50 border border-gray-200 rounded-[10px] focus:outline-none focus:border-[#2D79C7]"
                        >
                            {DOCUMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-gray-500 font-bold mb-1">Select File (Optional)</label>
                        <input
                            type="file"
                            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                            onChange={handleFileChange}
                            className="w-full text-xs text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-[#2D79C7]/10 file:text-[#2D79C7] hover:file:bg-[#2D79C7]/20 cursor-pointer p-1.5 bg-gray-50 border border-gray-200 rounded-[10px]"
                        />
                    </div>

                    <div>
                        <label className="block text-gray-500 font-bold mb-1">Document Title / File Name *</label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. Experience_Certificate.pdf"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full p-2 bg-gray-50 border border-gray-200 rounded-[10px] focus:outline-none focus:border-[#2D79C7]"
                        />
                    </div>

                    <div className="pt-4 flex justify-end gap-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-[10px] text-gray-600 font-bold cursor-pointer">Cancel</button>
                        <button
                            type="submit"
                            disabled={isUploading}
                            className="px-4 py-2 bg-[#2D79C7] text-white rounded-[10px] font-bold hover:bg-[#1F5EA8] cursor-pointer disabled:opacity-50"
                        >
                            {isUploading ? "Uploading..." : "Upload"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const UpdateOfferModal = ({ candidate, onClose, onSave }) => {
    const offer = candidate.offerDetails || {};
    const [offeredCtc, setOfferedCtc] = useState(offer.offeredCtc || candidate.expectedCtc || "₹20 LPA");
    const [joiningDate, setJoiningDate] = useState(offer.joiningDate || new Date().toISOString().split("T")[0]);
    const [status, setStatus] = useState(offer.status || "Offer Sent");
    const [notes, setNotes] = useState(offer.notes || "");

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({ offeredCtc, joiningDate, status, notes });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fadeIn select-none">
            <div className="bg-white rounded-[20px] shadow-2xl border border-gray-200 max-w-md w-full p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                    <h3 className="text-sm font-bold text-[#1E1E1E]">Manage Offer: {candidate.name}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3 text-xs">
                    <div>
                        <label className="block text-gray-500 font-bold mb-1">Offered CTC</label>
                        <input
                            type="text"
                            value={offeredCtc}
                            onChange={e => setOfferedCtc(e.target.value)}
                            className="w-full p-2 bg-gray-50 border border-gray-200 rounded-[10px]"
                        />
                    </div>

                    <div>
                        <label className="block text-gray-500 font-bold mb-1">Expected Joining Date</label>
                        <input
                            type="date"
                            value={joiningDate}
                            onChange={e => setJoiningDate(e.target.value)}
                            className="w-full p-2 bg-gray-50 border border-gray-200 rounded-[10px]"
                        />
                    </div>

                    <div>
                        <label className="block text-gray-500 font-bold mb-1">Offer Status</label>
                        <select
                            value={status}
                            onChange={e => setStatus(e.target.value)}
                            className="w-full p-2 bg-gray-50 border border-gray-200 rounded-[10px]"
                        >
                            <option value="Offer Pending">Offer Pending</option>
                            <option value="Offer Sent">Offer Sent</option>
                            <option value="Offer Accepted">Offer Accepted</option>
                            <option value="Offer Declined">Offer Declined</option>
                            <option value="Joined">Joined</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-gray-500 font-bold mb-1">Offer Notes / Conditions</label>
                        <textarea
                            rows={3}
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="e.g. Valid till Friday, includes joining bonus..."
                            className="w-full p-2 bg-gray-50 border border-gray-200 rounded-[10px]"
                        />
                    </div>

                    <div className="pt-4 flex justify-end gap-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-[10px] text-gray-600 font-bold cursor-pointer">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-[#2D79C7] text-white rounded-[10px] font-bold hover:bg-[#1F5EA8] cursor-pointer">Save Offer</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const HoldCandidateModal = ({ candidate, onClose, onConfirm }) => {
    const [reason, setReason] = useState(HOLD_REASONS[0]);
    const [customNote, setCustomNote] = useState("");

    const handleSubmit = (e) => {
        e.preventDefault();
        onConfirm(reason, customNote);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fadeIn select-none">
            <div className="bg-white rounded-[20px] shadow-2xl border border-gray-200 max-w-sm w-full p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-amber-50 text-amber-600 rounded-full">
                            <PauseCircle className="w-5 h-5" />
                        </div>
                        <h3 className="text-sm font-bold text-[#1E1E1E]">Put on Hold</h3>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3 text-xs">
                    <p className="text-gray-600">
                        Put application for <strong>{candidate.name}</strong> on hold?
                    </p>

                    <div>
                        <label className="block text-gray-500 font-bold mb-1">Reason for Hold</label>
                        <select
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            className="w-full p-2 bg-gray-50 border border-gray-200 rounded-[10px] text-xs font-medium text-gray-800"
                        >
                            {HOLD_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-gray-500 font-bold mb-1">Optional Notes / Details</label>
                        <textarea
                            rows={2}
                            value={customNote}
                            onChange={e => setCustomNote(e.target.value)}
                            placeholder="e.g. Waiting for feedback, requested 2 weeks..."
                            className="w-full p-2 bg-gray-50 border border-gray-200 rounded-[10px] text-xs"
                        />
                    </div>

                    <div className="pt-3 flex justify-end gap-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-[10px] text-gray-600 font-bold cursor-pointer">
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-[10px] font-bold cursor-pointer shadow-xs"
                        >
                            Confirm Hold
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const RejectCandidateModal = ({ candidate, onClose, onConfirm }) => {
    const [reason, setReason] = useState("Rejected");

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fadeIn select-none">
            <div className="bg-white rounded-[20px] shadow-2xl border border-gray-200 max-w-sm w-full p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                    <h3 className="text-sm font-bold text-[#1E1E1E]">Reject Candidate</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                </div>

                <div className="space-y-3 text-xs">
                    <p className="text-gray-600">Are you sure you want to move <strong>{candidate.name}</strong> to the Archive?</p>

                    <div>
                        <label className="block text-gray-500 font-bold mb-1">Reason for Rejection / Archive</label>
                        <select
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            className="w-full p-2 bg-gray-50 border border-gray-200 rounded-[10px]"
                        >
                            {ARCHIVE_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>

                    <div className="pt-4 flex justify-end gap-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-[10px] text-gray-600 font-bold cursor-pointer">Cancel</button>
                        <button
                            type="button"
                            onClick={() => onConfirm(reason)}
                            className="px-4 py-2 bg-rose-600 text-white rounded-[10px] font-bold hover:bg-rose-700 cursor-pointer"
                        >
                            Confirm Rejection
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Hire;
