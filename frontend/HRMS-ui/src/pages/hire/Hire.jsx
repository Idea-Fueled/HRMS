import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
    Users, UserPlus, Briefcase, FileText, Calendar, Clock,
    Search, Filter, Plus, Edit3, Trash2, Eye, X, CheckCircle2,
    XCircle, ArrowRight, ChevronRight, Star, ExternalLink,
    Upload, RefreshCw, AlertCircle, ShieldAlert, Award, UserCheck,
    DollarSign, ArrowUpRight, ChevronDown, Check, Layers, MoveRight,
    Building, Phone, Mail, MapPin, Download, Lock
} from "lucide-react";
import { toast } from "sonner";
import { ViewToggle, SkeletonLoader, EmptyState } from "../../components/SharedComponents";
import {
    getHireCandidates,
    addCandidateApi,
    updateCandidateApi,
    updateCandidateStageApi,
    scheduleInterviewApi,
    addInterviewFeedbackApi,
    addCandidateDocumentApi,
    updateOfferDetailsApi,
    archiveCandidateApi,
    deleteCandidateApi
} from "../../services/hire.service";
import { useAuth } from "../../context/AuthContext";

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
    "Rejected"
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

export const Hire = () => {
    const { user } = useAuth();
    const [candidates, setCandidates] = useState([]);
    const [loading, setLoading] = useState(true);

    // Active Top Tab
    const [activeTab, setActiveTab] = useState("dashboard"); // "dashboard" | "candidates" | "kanban" | "interviews" | "offers" | "archive"

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
        const rejected = candidates.filter(c => c.stage === "Rejected" || c.status === "Rejected").length;

        return { total, newApps, screening, scheduledInterviewsCount, offersSent, joined, rejected };
    }, [candidates]);

    /* ─────────────────────────────────────────────
       FILTERED CANDIDATES
    ───────────────────────────────────────────── */
    const activeCandidates = useMemo(() => {
        return candidates.filter(c => c.stage !== "Rejected" && c.status !== "Rejected");
    }, [candidates]);

    const archivedCandidatesList = useMemo(() => {
        return candidates.filter(c => c.stage === "Rejected" || c.status === "Rejected" || c.archiveReason);
    }, [candidates]);

    const filteredCandidates = useMemo(() => {
        const baseList = activeTab === "archive" ? archivedCandidatesList : candidates;

        return baseList.filter(cand => {
            // Search matching
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

            // Stage filter
            if (filterStage && cand.stage !== filterStage) return false;

            // Position filter
            if (filterPosition && cand.position !== filterPosition) return false;

            // Assigned HR filter
            if (filterHr && cand.assignedHr !== filterHr) return false;

            // Status filter
            if (filterStatus && cand.status !== filterStatus) return false;

            // Interviewer filter
            if (filterInterviewer) {
                const hasInterviewer = cand.interviews?.some(i => i.interviewer === filterInterviewer);
                if (!hasInterviewer) return false;
            }

            return true;
        });
    }, [candidates, archivedCandidatesList, activeTab, searchTerm, filterStage, filterPosition, filterHr, filterStatus, filterInterviewer]);

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

        // Filter interviews if filterInterviewer is set
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

    // Drawer Open
    const handleOpenDrawer = (cand) => {
        setSelectedCandidate(cand);
        setDrawerOpen(true);
    };

    // Stage Mover
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

    // Rejection
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

    // Delete permanently from archive
    const handleDeleteCandidate = async (candidateId) => {
        if (!window.confirm("Are you sure you want to permanently delete this candidate record?")) return;
        try {
            await deleteCandidateApi(candidateId);
            setCandidates(prev => prev.filter(c => c.id !== candidateId));
            if (selectedCandidate?.id === candidateId) {
                setDrawerOpen(false);
                setSelectedCandidate(null);
            }
            toast.success("Candidate record deleted");
        } catch {
            toast.error("Failed to delete candidate");
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
        if (candidateObj && candidateObj.stage !== targetStage) {
            await handleMoveStage(candId, targetStage);
        }
        setDraggedCandidateId(null);
    };

    /* ─────────────────────────────────────────────
       RENDER TAB BUTTONS
    ───────────────────────────────────────────── */
    const navTabs = [
        { id: "dashboard", label: "Dashboard", icon: Layers },
        { id: "candidates", label: "Candidates", icon: Users, count: candidates.length },
        { id: "kanban", label: "Kanban Pipeline", icon: Briefcase },
        { id: "interviews", label: "Interviews", icon: Calendar, count: stats.scheduledInterviewsCount },
        { id: "offers", label: "Offers", icon: DollarSign, count: stats.offersSent },
        { id: "archive", label: "Archive", icon: FileText, count: archivedCandidatesList.length }
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
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-[14px] text-xs font-bold transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                                isActive
                                    ? "bg-[#2D79C7] text-white shadow-md shadow-blue-500/15"
                                    : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                            }`}
                        >
                            <Icon className="w-4 h-4" />
                            <span>{tab.label}</span>
                            {tab.count !== undefined && (
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                    isActive ? "bg-white/20 text-white" : "bg-gray-200/80 text-gray-700"
                                }`}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Search & Filter Bar (Shown across all listing tabs) */}
            {activeTab !== "dashboard" && (
                <div className="bg-white border border-[#E5E7EB] rounded-[18px] p-4 shadow-[0_1px_4px_rgba(0,0,0,0.02)] space-y-3">
                    <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
                        {/* Search Input */}
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

                        {/* View Toggle (when in candidates tab) */}
                        {activeTab === "candidates" && (
                            <ViewToggle view={candidateView} onViewChange={setCandidateView} />
                        )}
                    </div>

                    {/* Filter Dropdowns */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 pt-2 border-t border-gray-100 text-xs">
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
                            value={filterPosition}
                            onChange={(e) => setFilterPosition(e.target.value)}
                            className="bg-gray-50 border border-gray-200 rounded-[10px] px-3 py-1.5 text-xs text-gray-700 font-semibold focus:outline-none focus:border-[#2D79C7]"
                        >
                            <option value="">All Positions</option>
                            {POSITIONS.map(pos => (
                                <option key={pos} value={pos}>{pos}</option>
                            ))}
                        </select>

                        <select
                            value={filterHr}
                            onChange={(e) => setFilterHr(e.target.value)}
                            className="bg-gray-50 border border-gray-200 rounded-[10px] px-3 py-1.5 text-xs text-gray-700 font-semibold focus:outline-none focus:border-[#2D79C7]"
                        >
                            <option value="">All Assigned HR</option>
                            {HR_ASSIGNESS.map(hr => (
                                <option key={hr} value={hr}>{hr}</option>
                            ))}
                        </select>

                        <select
                            value={filterInterviewer}
                            onChange={(e) => setFilterInterviewer(e.target.value)}
                            className="bg-gray-50 border border-gray-200 rounded-[10px] px-3 py-1.5 text-xs text-gray-700 font-semibold focus:outline-none focus:border-[#2D79C7]"
                        >
                            <option value="">All Interviewers</option>
                            {INTERVIEWERS.map(int => (
                                <option key={int} value={int}>{int}</option>
                            ))}
                        </select>

                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="bg-gray-50 border border-gray-200 rounded-[10px] px-3 py-1.5 text-xs text-gray-700 font-semibold focus:outline-none focus:border-[#2D79C7]"
                        >
                            <option value="">All Statuses</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Passed">Passed</option>
                            <option value="Offer Sent">Offer Sent</option>
                            <option value="Joined">Joined</option>
                            <option value="Rejected">Rejected</option>
                        </select>
                    </div>

                    {/* Reset Filters button if any filter applied */}
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

                    {/* TAB 4: INTERVIEWS */}
                    {activeTab === "interviews" && (
                        <InterviewsView
                            interviews={allInterviewsList}
                            candidates={candidates}
                            onAddFeedback={(intObj, candObj) => {
                                setInterviewForFeedback({ ...intObj, candidate: candObj });
                                setIsFeedbackModalOpen(true);
                            }}
                            onScheduleNew={() => {
                                setCandidateForInterview(candidates[0] || null);
                                setIsScheduleModalOpen(true);
                            }}
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
                    onReject={() => {
                        setCandidateToReject(selectedCandidate);
                        setIsRejectModalOpen(true);
                    }}
                    onAddFeedback={(intObj) => {
                        setInterviewForFeedback({ ...intObj, candidate: selectedCandidate });
                        setIsFeedbackModalOpen(true);
                    }}
                    onUploadDoc={() => setIsDocModalOpen(true)}
                />
            )}

            {/* MODALS */}
            {isAddModalOpen && (
                <AddCandidateModal
                    onClose={() => setIsAddModalOpen(false)}
                    onSave={async (formData) => {
                        try {
                            const newCand = await addCandidateApi(formData);
                            setCandidates(prev => [newCand, ...prev]);
                            setIsAddModalOpen(false);
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
        { label: "Offers Sent", value: stats.offersSent, icon: DollarSign, color: "text-purple-600", bg: "bg-purple-50" },
        { label: "Joined", value: stats.joined, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
        { label: "Rejected", value: stats.rejected, icon: XCircle, color: "text-rose-600", bg: "bg-rose-50" },
    ];

    const recentCandidates = candidates.slice(0, 5);

    return (
        <div className="space-y-6">
            {/* Stat Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3.5">
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

            {/* Middle Section: Recent Candidates & Pipeline Progress */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Candidates List */}
                <div className="lg:col-span-2 bg-white border border-[#E5E7EB] rounded-[20px] p-5 shadow-[0_1px_4px_rgba(0,0,0,0.02)]">
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                        <h3 className="text-sm font-bold text-[#1E1E1E] flex items-center gap-2">
                            <Users className="w-4 h-4 text-[#2D79C7]" />
                            Recent Candidates
                        </h3>
                        <button onClick={onAddCandidate} className="text-xs text-[#2D79C7] font-bold hover:underline cursor-pointer flex items-center gap-1">
                            <Plus className="w-3.5 h-3.5" />
                            Add Candidate
                        </button>
                    </div>

                    <div className="divide-y divide-gray-100">
                        {recentCandidates.map(cand => (
                            <div key={cand.id} className="py-3 flex items-center justify-between gap-3 hover:bg-gray-50 px-2 rounded-[12px] transition-all">
                                <div className="flex items-center gap-3 min-w-0">
                                    <img
                                        src={cand.photo}
                                        alt={cand.name}
                                        className="w-9 h-9 rounded-full object-cover border border-gray-200 shrink-0"
                                    />
                                    <div className="min-w-0">
                                        <h4 className="text-xs font-bold text-[#1E1E1E] truncate hover:text-[#2D79C7] cursor-pointer" onClick={() => onOpenDrawer(cand)}>
                                            {cand.name}
                                        </h4>
                                        <p className="text-[11px] text-gray-500 truncate">{cand.position} • {cand.experience}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 shrink-0">
                                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-[#2D79C7] border border-blue-100">
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
                        ))}
                    </div>
                </div>

                {/* Quick Pipeline Summary */}
                <div className="bg-white border border-[#E5E7EB] rounded-[20px] p-5 shadow-[0_1px_4px_rgba(0,0,0,0.02)] flex flex-col justify-between">
                    <div>
                        <h3 className="text-sm font-bold text-[#1E1E1E] flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
                            <Layers className="w-4 h-4 text-[#2D79C7]" />
                            Pipeline Funnel
                        </h3>

                        <div className="space-y-3">
                            {PIPELINE_STAGES.slice(0, 7).map(stg => {
                                const count = candidates.filter(c => c.stage === stg).length;
                                const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                                return (
                                    <div key={stg} className="space-y-1">
                                        <div className="flex items-center justify-between text-[11px] font-bold text-gray-600">
                                            <span>{stg}</span>
                                            <span>{count} ({pct}%)</span>
                                        </div>
                                        <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                                            <div className="bg-[#2D79C7] h-full transition-all duration-500" style={{ width: `${pct}%` }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-gray-100 text-center">
                        <p className="text-xs text-gray-500 font-medium">Keep moving candidates through interview rounds.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

/* ─────────────────────────────────────────────
   COMPONENT: CANDIDATES VIEW (List & Card)
───────────────────────────────────────────── */
const CandidatesView = ({ candidates, view, onOpenDrawer, onEdit, onScheduleInterview, onMoveStage, onReject }) => {
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
                                    <img src={cand.photo} alt={cand.name} className="w-11 h-11 rounded-full object-cover border border-gray-200" />
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
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-400">Assigned HR:</span>
                                    <span className="text-gray-800 font-semibold">{cand.assignedHr}</span>
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
                        <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-[#2D79C7] border border-blue-100">
                                {cand.stage}
                            </span>

                            <div className="flex items-center gap-1">
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
                        <th className="py-3.5 px-4">Candidate</th>
                        <th className="py-3.5 px-4">Position</th>
                        <th className="py-3.5 px-4">Experience</th>
                        <th className="py-3.5 px-4">Company</th>
                        <th className="py-3.5 px-4">Stage</th>
                        <th className="py-3.5 px-4">Assigned HR</th>
                        <th className="py-3.5 px-4">Applied Date</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                    {candidates.map(cand => (
                        <tr key={cand.id} className="hover:bg-gray-50/80 transition-all">
                            <td className="py-3 px-4">
                                <div className="flex items-center gap-3">
                                    <img src={cand.photo} alt={cand.name} className="w-8 h-8 rounded-full object-cover border border-gray-200" />
                                    <div>
                                        <div className="font-bold text-[#1E1E1E] hover:text-[#2D79C7] cursor-pointer" onClick={() => onOpenDrawer(cand)}>
                                            {cand.name}
                                        </div>
                                        <div className="text-[11px] text-gray-400">{cand.email}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="py-3 px-4 font-semibold text-gray-800">{cand.position}</td>
                            <td className="py-3 px-4 text-gray-600">{cand.experience}</td>
                            <td className="py-3 px-4 text-gray-600">{cand.currentCompany}</td>
                            <td className="py-3 px-4">
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-[#2D79C7] border border-blue-100">
                                    {cand.stage}
                                </span>
                            </td>
                            <td className="py-3 px-4 text-gray-600">{cand.assignedHr}</td>
                            <td className="py-3 px-4 text-gray-400">{cand.appliedDate}</td>
                            <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-1">
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
   COMPONENT: KANBAN PIPELINE VIEW
───────────────────────────────────────────── */
const KanbanView = ({ candidates, stages, onOpenDrawer, onMoveStage, onDragStart, onDragOver, onDropStage }) => {
    return (
        <div className="flex gap-4 overflow-x-auto pb-6 pt-2 scrollbar-thin select-none min-h-[550px]">
            {stages.map(stg => {
                const stageCandidates = candidates.filter(c => c.stage === stg);
                return (
                    <div
                        key={stg}
                        onDragOver={onDragOver}
                        onDrop={(e) => onDropStage(e, stg)}
                        className="w-[280px] shrink-0 bg-gray-50/80 border border-[#E5E7EB] rounded-[18px] p-3 flex flex-col justify-between"
                    >
                        <div>
                            {/* Column Header */}
                            <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-3">
                                <h3 className="text-xs font-black text-[#1E1E1E] truncate max-w-[190px]">{stg}</h3>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-white border border-gray-200 text-gray-700">
                                    {stageCandidates.length}
                                </span>
                            </div>

                            {/* Candidate Cards Column */}
                            <div className="space-y-3 min-h-[150px]">
                                {stageCandidates.map(cand => (
                                    <div
                                        key={cand.id}
                                        draggable
                                        onDragStart={(e) => onDragStart(e, cand.id)}
                                        className="bg-white border border-[#E5E7EB] rounded-[14px] p-3.5 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing space-y-2.5"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-2.5">
                                                <img src={cand.photo} alt={cand.name} className="w-8 h-8 rounded-full object-cover border border-gray-200" />
                                                <div>
                                                    <h4 className="text-xs font-bold text-[#1E1E1E] hover:text-[#2D79C7] cursor-pointer" onClick={() => onOpenDrawer(cand)}>
                                                        {cand.name}
                                                    </h4>
                                                    <p className="text-[10px] text-gray-500">{cand.position}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="text-[10px] text-gray-600 flex items-center justify-between font-semibold">
                                            <span>Exp: {cand.experience}</span>
                                            <span>HR: {cand.assignedHr}</span>
                                        </div>

                                        {/* Skills tags */}
                                        <div className="flex flex-wrap gap-1">
                                            {(cand.skills || []).slice(0, 2).map((sk, idx) => (
                                                <span key={idx} className="bg-gray-100 text-gray-600 text-[9px] font-bold px-1.5 py-0.5 rounded">
                                                    {sk}
                                                </span>
                                            ))}
                                        </div>

                                        {/* Quick Move Stage Control */}
                                        <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[10px]">
                                            <span className="text-gray-400">{cand.appliedDate}</span>
                                            <select
                                                value={cand.stage}
                                                onChange={(e) => onMoveStage(cand.id, e.target.value)}
                                                onClick={(e) => e.stopPropagation()}
                                                className="bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5 text-[10px] text-gray-700 font-bold focus:outline-none"
                                            >
                                                {stages.map(s => (
                                                    <option key={s} value={s}>{s}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                ))}

                                {stageCandidates.length === 0 && (
                                    <div className="h-24 border border-dashed border-gray-200 rounded-[12px] flex items-center justify-center text-[11px] text-gray-400 font-medium">
                                        Drag candidate here
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
                                <th className="py-3.5 px-4">Candidate</th>
                                <th className="py-3.5 px-4">Interview Round</th>
                                <th className="py-3.5 px-4">Interviewer</th>
                                <th className="py-3.5 px-4">Date & Time</th>
                                <th className="py-3.5 px-4">Meeting Link</th>
                                <th className="py-3.5 px-4">Rating & Status</th>
                                <th className="py-3.5 px-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 font-medium">
                            {interviews.map(int => (
                                <tr key={int.id} className="hover:bg-gray-50/80 transition-all">
                                    <td className="py-3 px-4">
                                        <div className="flex items-center gap-2.5">
                                            <img src={int.candidatePhoto} alt={int.candidateName} className="w-8 h-8 rounded-full object-cover border border-gray-200" />
                                            <div>
                                                <div className="font-bold text-[#1E1E1E]">{int.candidateName}</div>
                                                <div className="text-[10px] text-gray-400">{int.candidatePosition}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4 font-bold text-[#2D79C7]">{int.roundName}</td>
                                    <td className="py-3 px-4 text-gray-700">{int.interviewer}</td>
                                    <td className="py-3 px-4 text-gray-600">
                                        <div>{int.date}</div>
                                        <div className="text-[10px] text-gray-400">{int.time}</div>
                                    </td>
                                    <td className="py-3 px-4">
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
                                    <td className="py-3 px-4">
                                        <div className="flex items-center gap-2">
                                            {int.rating > 0 ? (
                                                <span className="flex items-center text-amber-500 font-bold text-xs">
                                                    <Star className="w-3.5 h-3.5 fill-amber-400 mr-1" />
                                                    {int.rating}/5
                                                </span>
                                            ) : (
                                                <span className="text-gray-400 text-[10px]">No Rating</span>
                                            )}
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                int.status === "Passed" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                                                int.status === "Failed" ? "bg-rose-50 text-rose-700 border border-rose-200" :
                                                "bg-blue-50 text-blue-700 border border-blue-200"
                                            }`}>
                                                {int.status}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4 text-right">
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
                        <th className="py-3.5 px-4">Candidate</th>
                        <th className="py-3.5 px-4">Position</th>
                        <th className="py-3.5 px-4">Offered CTC</th>
                        <th className="py-3.5 px-4">Offer Date</th>
                        <th className="py-3.5 px-4">Expected Joining</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                    {offers.map(cand => {
                        const offer = cand.offerDetails || {};
                        return (
                            <tr key={cand.id} className="hover:bg-gray-50/80 transition-all">
                                <td className="py-3 px-4">
                                    <div className="flex items-center gap-2.5">
                                        <img src={cand.photo} alt={cand.name} className="w-8 h-8 rounded-full object-cover border border-gray-200" />
                                        <div>
                                            <div className="font-bold text-[#1E1E1E] cursor-pointer hover:text-[#2D79C7]" onClick={() => onOpenDrawer(cand)}>
                                                {cand.name}
                                            </div>
                                            <div className="text-[10px] text-gray-400">{cand.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="py-3 px-4 font-semibold text-gray-800">{cand.position}</td>
                                <td className="py-3 px-4 font-black text-emerald-600">{offer.offeredCtc || cand.expectedCtc}</td>
                                <td className="py-3 px-4 text-gray-600">{offer.offerDate || cand.appliedDate}</td>
                                <td className="py-3 px-4 text-gray-600">{offer.joiningDate || "TBD"}</td>
                                <td className="py-3 px-4">
                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                        cand.status === "Joined" ? "bg-emerald-100 text-emerald-800 border border-emerald-300" :
                                        cand.status === "Offer Accepted" ? "bg-cyan-100 text-cyan-800 border border-cyan-300" :
                                        "bg-purple-100 text-purple-800 border border-purple-300"
                                    }`}>
                                        {cand.status}
                                    </span>
                                </td>
                                <td className="py-3 px-4 text-right">
                                    <button
                                        onClick={() => onUpdateOffer(cand)}
                                        className="px-2.5 py-1 bg-gray-100 hover:bg-[#2D79C7] hover:text-white rounded-[8px] text-[11px] font-bold text-gray-700 transition-all cursor-pointer"
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
                        <th className="py-3.5 px-4">Candidate</th>
                        <th className="py-3.5 px-4">Position</th>
                        <th className="py-3.5 px-4">Archive Reason</th>
                        <th className="py-3.5 px-4">Applied Date</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                    {candidates.map(cand => (
                        <tr key={cand.id} className="hover:bg-gray-50/80 transition-all opacity-80 hover:opacity-100">
                            <td className="py-3 px-4">
                                <div className="flex items-center gap-2.5">
                                    <img src={cand.photo} alt={cand.name} className="w-8 h-8 rounded-full object-cover border border-gray-200" />
                                    <div>
                                        <div className="font-bold text-[#1E1E1E] cursor-pointer hover:text-[#2D79C7]" onClick={() => onOpenDrawer(cand)}>
                                            {cand.name}
                                        </div>
                                        <div className="text-[10px] text-gray-400">{cand.email}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="py-3 px-4 text-gray-700">{cand.position}</td>
                            <td className="py-3 px-4">
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                    {cand.archiveReason || "Rejected"}
                                </span>
                            </td>
                            <td className="py-3 px-4 text-gray-400">{cand.appliedDate}</td>
                            <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                    <button
                                        onClick={() => onRestore(cand.id)}
                                        className="px-2.5 py-1 bg-blue-50 text-[#2D79C7] hover:bg-[#2D79C7] hover:text-white rounded-[8px] text-[11px] font-bold transition-all cursor-pointer"
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
   CANDIDATE DETAIL DRAWER
───────────────────────────────────────────── */
const CandidateDetailDrawer = ({ candidate, onClose, onEdit, onScheduleInterview, onMoveStage, onReject, onAddFeedback, onUploadDoc }) => {
    const [drawerTab, setDrawerTab] = useState("basic"); // "basic" | "timeline" | "documents"

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-xs transition-opacity animate-fadeIn select-none">
            <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-slideLeft">
                {/* Drawer Header */}
                <div className="p-5 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img src={candidate.photo} alt={candidate.name} className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm" />
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
                <div className="px-5 py-3 bg-blue-50/70 border-b border-blue-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                        <span className="text-gray-500 font-bold">Current Stage:</span>
                        <span className="font-black text-[#2D79C7]">{candidate.stage}</span>
                    </div>

                    <div className="flex items-center gap-2">
                        <select
                            value={candidate.stage}
                            onChange={(e) => onMoveStage(candidate.id, e.target.value)}
                            className="bg-white border border-blue-200 rounded-[8px] px-2 py-1 text-xs text-gray-800 font-bold focus:outline-none"
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
                            {/* Basic Details Section */}
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

                            {/* Professional Details Section */}
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

                            {/* Skills */}
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
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                    int.status === "Passed" ? "bg-emerald-50 text-emerald-700" :
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
                                <h4 className="text-xs font-black text-[#1E1E1E] uppercase tracking-wider">Uploaded Documents</h4>
                                <button
                                    onClick={onUploadDoc}
                                    className="flex items-center gap-1 bg-[#2D79C7] text-white px-3 py-1 rounded-[8px] text-xs font-bold hover:bg-[#1F5EA8] cursor-pointer"
                                >
                                    <Upload className="w-3.5 h-3.5" />
                                    <span>Upload Doc</span>
                                </button>
                            </div>

                            {(candidate.documents || []).length === 0 ? (
                                <p className="text-xs text-gray-400 italic py-4">No documents uploaded yet.</p>
                            ) : (
                                <div className="space-y-2">
                                    {candidate.documents.map(doc => (
                                        <div key={doc.id} className="p-3 bg-gray-50 border border-gray-200 rounded-[12px] flex items-center justify-between text-xs">
                                            <div className="flex items-center gap-3">
                                                <FileText className="w-5 h-5 text-[#2D79C7]" />
                                                <div>
                                                    <div className="font-bold text-gray-800">{doc.name}</div>
                                                    <div className="text-[10px] text-gray-400">{doc.type} • {doc.size}</div>
                                                </div>
                                            </div>

                                            <a href={doc.url} download className="p-1.5 text-[#2D79C7] hover:bg-blue-50 rounded-[8px] cursor-pointer">
                                                <Download className="w-4 h-4" />
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Drawer Footer Actions */}
                <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                    <button
                        onClick={onReject}
                        className="px-4 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-[10px] text-xs font-bold cursor-pointer"
                    >
                        Reject Candidate
                    </button>
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
   MODAL: ADD CANDIDATE
───────────────────────────────────────────── */
const AddCandidateModal = ({ onClose, onSave }) => {
    const [form, setForm] = useState({
        name: "",
        email: "",
        phone: "",
        address: "",
        position: POSITIONS[0],
        experience: "3 Yrs",
        currentCompany: "",
        currentCtc: "",
        expectedCtc: "",
        noticePeriod: "30 Days",
        skills: "React, Node.js",
        assignedHr: HR_ASSIGNESS[0],
        stage: "New Application"
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.name.trim() || !form.email.trim()) {
            toast.error("Name and email are required");
            return;
        }
        onSave(form);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fadeIn select-none">
            <div className="bg-white rounded-[20px] shadow-2xl border border-gray-200 max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                    <h3 className="text-sm font-bold text-[#1E1E1E]">Add New Candidate</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3 text-xs">
                    <div>
                        <label className="block text-gray-500 font-bold mb-1">Full Name *</label>
                        <input
                            type="text"
                            required
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
                                value={form.email}
                                onChange={e => setForm({ ...form, email: e.target.value })}
                                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-[10px] focus:outline-none focus:border-[#2D79C7]"
                            />
                        </div>
                        <div>
                            <label className="block text-gray-500 font-bold mb-1">Phone</label>
                            <input
                                type="text"
                                value={form.phone}
                                onChange={e => setForm({ ...form, phone: e.target.value })}
                                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-[10px] focus:outline-none focus:border-[#2D79C7]"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-gray-500 font-bold mb-1">Position Applied</label>
                            <select
                                value={form.position}
                                onChange={e => setForm({ ...form, position: e.target.value })}
                                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-[10px] focus:outline-none focus:border-[#2D79C7]"
                            >
                                {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-gray-500 font-bold mb-1">Experience</label>
                            <input
                                type="text"
                                value={form.experience}
                                onChange={e => setForm({ ...form, experience: e.target.value })}
                                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-[10px] focus:outline-none focus:border-[#2D79C7]"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-gray-500 font-bold mb-1">Current Company</label>
                            <input
                                type="text"
                                value={form.currentCompany}
                                onChange={e => setForm({ ...form, currentCompany: e.target.value })}
                                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-[10px] focus:outline-none focus:border-[#2D79C7]"
                            />
                        </div>
                        <div>
                            <label className="block text-gray-500 font-bold mb-1">Assigned HR</label>
                            <select
                                value={form.assignedHr}
                                onChange={e => setForm({ ...form, assignedHr: e.target.value })}
                                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-[10px] focus:outline-none focus:border-[#2D79C7]"
                            >
                                {HR_ASSIGNESS.map(h => <option key={h} value={h}>{h}</option>)}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-gray-500 font-bold mb-1">Skills (comma separated)</label>
                        <input
                            type="text"
                            value={form.skills}
                            onChange={e => setForm({ ...form, skills: e.target.value })}
                            className="w-full p-2 bg-gray-50 border border-gray-200 rounded-[10px] focus:outline-none focus:border-[#2D79C7]"
                        />
                    </div>

                    <div className="pt-4 flex justify-end gap-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-[10px] text-gray-600 font-bold">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-[#2D79C7] text-white rounded-[10px] font-bold hover:bg-[#1F5EA8]">Save Candidate</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

/* ─────────────────────────────────────────────
   MODAL: EDIT CANDIDATE
───────────────────────────────────────────── */
const EditCandidateModal = ({ candidate, onClose, onSave }) => {
    const [form, setForm] = useState({ ...candidate });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(form);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fadeIn select-none">
            <div className="bg-white rounded-[20px] shadow-2xl border border-gray-200 max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                    <h3 className="text-sm font-bold text-[#1E1E1E]">Edit Candidate Details</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3 text-xs">
                    <div>
                        <label className="block text-gray-500 font-bold mb-1">Full Name</label>
                        <input
                            type="text"
                            value={form.name}
                            onChange={e => setForm({ ...form, name: e.target.value })}
                            className="w-full p-2 bg-gray-50 border border-gray-200 rounded-[10px]"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-gray-500 font-bold mb-1">Position</label>
                            <select
                                value={form.position}
                                onChange={e => setForm({ ...form, position: e.target.value })}
                                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-[10px]"
                            >
                                {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-gray-500 font-bold mb-1">Assigned HR</label>
                            <select
                                value={form.assignedHr}
                                onChange={e => setForm({ ...form, assignedHr: e.target.value })}
                                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-[10px]"
                            >
                                {HR_ASSIGNESS.map(h => <option key={h} value={h}>{h}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-gray-500 font-bold mb-1">Current CTC</label>
                            <input
                                type="text"
                                value={form.currentCtc || ""}
                                onChange={e => setForm({ ...form, currentCtc: e.target.value })}
                                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-[10px]"
                            />
                        </div>
                        <div>
                            <label className="block text-gray-500 font-bold mb-1">Expected CTC</label>
                            <input
                                type="text"
                                value={form.expectedCtc || ""}
                                onChange={e => setForm({ ...form, expectedCtc: e.target.value })}
                                className="w-full p-2 bg-gray-50 border border-gray-200 rounded-[10px]"
                            />
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end gap-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-[10px] text-gray-600 font-bold">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-[#2D79C7] text-white rounded-[10px] font-bold hover:bg-[#1F5EA8]">Update</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

/* ─────────────────────────────────────────────
   MODAL: SCHEDULE INTERVIEW
───────────────────────────────────────────── */
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
                        <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-[10px] text-gray-600 font-bold">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-[#2D79C7] text-white rounded-[10px] font-bold hover:bg-[#1F5EA8]">Schedule</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

/* ─────────────────────────────────────────────
   MODAL: ADD FEEDBACK & RATING
───────────────────────────────────────────── */
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
                                    className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                        rating >= num ? "bg-amber-50 border-amber-300 text-amber-500" : "bg-gray-50 border-gray-200 text-gray-300"
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
                        <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-[10px] text-gray-600 font-bold">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-[#2D79C7] text-white rounded-[10px] font-bold hover:bg-[#1F5EA8]">Save Feedback</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

/* ─────────────────────────────────────────────
   MODAL: UPLOAD CANDIDATE DOCUMENT
───────────────────────────────────────────── */
const UploadDocumentModal = ({ candidate, onClose, onSave }) => {
    const [name, setName] = useState("");
    const [type, setType] = useState("Resume");

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name.trim()) {
            toast.error("Document name required");
            return;
        }
        onSave({ name, type, size: "1.2 MB" });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fadeIn select-none">
            <div className="bg-white rounded-[20px] shadow-2xl border border-gray-200 max-w-sm w-full p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                    <h3 className="text-sm font-bold text-[#1E1E1E]">Upload Document</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3 text-xs">
                    <div>
                        <label className="block text-gray-500 font-bold mb-1">Document Type</label>
                        <select
                            value={type}
                            onChange={e => setType(e.target.value)}
                            className="w-full p-2 bg-gray-50 border border-gray-200 rounded-[10px]"
                        >
                            {DOCUMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-gray-500 font-bold mb-1">Document Title / File Name</label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. Experience_Certificate.pdf"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full p-2 bg-gray-50 border border-gray-200 rounded-[10px]"
                        />
                    </div>

                    <div className="pt-4 flex justify-end gap-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-[10px] text-gray-600 font-bold">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-[#2D79C7] text-white rounded-[10px] font-bold hover:bg-[#1F5EA8]">Upload</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

/* ─────────────────────────────────────────────
   MODAL: UPDATE OFFER DETAILS
───────────────────────────────────────────── */
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
                        <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-[10px] text-gray-600 font-bold">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-[#2D79C7] text-white rounded-[10px] font-bold hover:bg-[#1F5EA8]">Save Offer</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

/* ─────────────────────────────────────────────
   MODAL: REJECT CANDIDATE
───────────────────────────────────────────── */
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
                        <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-[10px] text-gray-600 font-bold">Cancel</button>
                        <button
                            type="button"
                            onClick={() => onConfirm(reason)}
                            className="px-4 py-2 bg-rose-600 text-white rounded-[10px] font-bold hover:bg-rose-700"
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
