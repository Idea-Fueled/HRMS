import API from "./api";

// Dynamic candidates dataset for enterprise HRMS (no static candidates)
const INITIAL_CANDIDATES = [];

const STORAGE_KEY = "hrms_hire_candidates_v3";

// Helper to retrieve saved candidates from localStorage or fallback
export const getCandidatesFromStorage = () => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.error("Error reading candidate storage", e);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
    return [];
};

// Helper to save candidates to localStorage with fallback for quota limits
export const saveCandidatesToStorage = (candidates) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(candidates));
    } catch (e) {
        console.warn("Storage quota exceeded or error saving candidates, saving trimmed copy without heavy base64 data:", e);
        try {
            const sanitized = (candidates || []).map(c => ({
                ...c,
                documents: (c.documents || []).map(d => ({
                    ...d,
                    url: d.url && d.url.startsWith("data:") ? "#" : d.url
                }))
            }));
            localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
        } catch (innerErr) {
            console.error("Critical error saving candidate storage", innerErr);
        }
    }
};

/* ─────────────────────────────────────────────
   HIRE SERVICE METHODS
───────────────────────────────────────────── */

export const getHireCandidates = async () => {
    try {
        const localCandidates = getCandidatesFromStorage();
        const res = await API.get("/hire/candidates");
        if (res.data?.success && Array.isArray(res.data.candidates)) {
            const backendCandidates = res.data.candidates;
            const backendIdSet = new Set(backendCandidates.map(c => c.id));
            const backendEmailSet = new Set(backendCandidates.map(c => c.email?.toLowerCase().trim()).filter(Boolean));

            // Merge local previous candidates that might not be in the backend response
            const merged = [...backendCandidates];
            (localCandidates || []).forEach(loc => {
                const email = loc.email?.toLowerCase().trim();
                if (!backendIdSet.has(loc.id) && (!email || !backendEmailSet.has(email))) {
                    merged.push(loc);
                    // Proactively sync missing local candidate to backend
                    API.post("/hire/candidates", loc).catch(() => {});
                }
            });

            saveCandidatesToStorage(merged);
            return merged;
        }
    } catch {
        // Fallback to localStorage data
    }
    return getCandidatesFromStorage();
};

export const addCandidateApi = async (candidateData) => {
    const current = getCandidatesFromStorage();
    
    // Process candidate CV/Resume upload if present
    const docName = candidateData.cvName || candidateData.resume || (candidateData.cvFile ? candidateData.cvFile.name : null);
    let docUrl = candidateData.cvDataUrl || "#";
    let docSize = "60 KB";

    if (candidateData.cvFile) {
        try {
            if (candidateData.cvFile.size) {
                const kb = candidateData.cvFile.size / 1024;
                docSize = kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb.toFixed(0)} KB`;
            }
        } catch {
            // Keep default
        }
    }

    const initialDocs = docName ? [
        {
            id: `doc_${Date.now()}`,
            name: docName,
            type: docName.toLowerCase().endsWith(".pdf") ? "PDF Resume" : (docName.toLowerCase().endsWith(".doc") || docName.toLowerCase().endsWith(".docx")) ? "Word Resume" : "Resume / CV",
            uploadDate: new Date().toISOString().split("T")[0],
            size: docSize,
            url: docUrl
        }
    ] : [];

    const newCandidate = {
        id: `cand_${Date.now()}`,
        name: candidateData.name || "New Candidate",
        email: candidateData.email || "",
        phone: candidateData.phone || "",
        address: candidateData.address || "",
        photo: candidateData.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(candidateData.name || "C")}&background=2D79C7&color=fff`,
        position: candidateData.position || "",
        experience: candidateData.experience || "0 Yrs",
        currentCompany: candidateData.currentCompany || "N/A",
        currentCtc: candidateData.currentCtc || "N/A",
        expectedCtc: candidateData.expectedCtc || "N/A",
        noticePeriod: candidateData.noticePeriod || "30 Days",
        skills: Array.isArray(candidateData.skills) ? candidateData.skills : (candidateData.skills || "").split(",").map(s => s.trim()).filter(Boolean),
        appliedDate: new Date().toISOString().split("T")[0],
        stage: candidateData.stage || "New Application",
        status: candidateData.status || "In Progress",
        assignedHr: candidateData.assignedHr || "Priya Sharma",
        resume: docName || "Candidate_Resume.pdf",
        resumeText: candidateData.resumeText || "",
        aiSummary: candidateData.aiSummary || "",
        interviews: [],
        documents: initialDocs,
        offerDetails: null,
        archiveReason: null
    };

    const updated = [newCandidate, ...current];
    saveCandidatesToStorage(updated);

    try {
        await API.post("/hire/candidates", newCandidate);
    } catch {
        // Handled via local storage sync
    }

    return newCandidate;
};

export const updateCandidateApi = async (id, updateData) => {
    const current = getCandidatesFromStorage();
    const updated = current.map(c => {
        if (c.id === id) {
            return { ...c, ...updateData };
        }
        return c;
    });
    saveCandidatesToStorage(updated);

    try {
        await API.put(`/hire/candidates/${id}`, updateData);
    } catch {
        // Local fallback sync
    }

    return updated.find(c => c.id === id);
};

export const updateCandidateStageApi = async (id, newStage, holdReason = null) => {
    const current = getCandidatesFromStorage();
    const updated = current.map(c => {
        if (c.id === id) {
            let newStatus = c.status;
            let archiveReason = c.archiveReason;
            let newHoldReason = c.holdReason || null;

            if (newStage === "Rejected") {
                newStatus = "Rejected";
                archiveReason = "Rejected";
                newHoldReason = null;
            } else if (newStage === "On Hold" || newStage === "Hold") {
                newStatus = "On Hold";
                archiveReason = null;
                newHoldReason = holdReason || c.holdReason || "Candidate placed on hold";
            } else if (newStage === "Joined") {
                newStatus = "Joined";
                archiveReason = null;
                newHoldReason = null;
            } else if (newStage === "Offer Sent" || newStage === "Offer Accepted") {
                newStatus = newStage;
                archiveReason = null;
                newHoldReason = null;
            } else {
                newStatus = "In Progress";
                archiveReason = null;
                newHoldReason = null;
            }

            return { ...c, stage: newStage, status: newStatus, archiveReason, holdReason: newHoldReason };
        }
        return c;
    });
    saveCandidatesToStorage(updated);

    try {
        await API.put(`/hire/candidates/${id}/stage`, { stage: newStage, holdReason });
    } catch {
        // Handled
    }

    return updated.find(c => c.id === id);
};

export const holdCandidateApi = async (id, holdReason = "Candidate placed on hold") => {
    const current = getCandidatesFromStorage();
    const updated = current.map(c => {
        if (c.id === id) {
            return {
                ...c,
                stage: "On Hold",
                status: "On Hold",
                holdReason: holdReason,
                archiveReason: null
            };
        }
        return c;
    });
    saveCandidatesToStorage(updated);

    try {
        await API.put(`/hire/candidates/${id}/hold`, { holdReason });
    } catch {
        // Handled
    }

    return updated.find(c => c.id === id);
};

export const unholdCandidateApi = async (id, targetStage = "Resume Screening") => {
    const current = getCandidatesFromStorage();
    const updated = current.map(c => {
        if (c.id === id) {
            return {
                ...c,
                stage: targetStage,
                status: "In Progress",
                holdReason: null,
                archiveReason: null
            };
        }
        return c;
    });
    saveCandidatesToStorage(updated);

    try {
        await API.put(`/hire/candidates/${id}/unhold`, { targetStage });
    } catch {
        // Handled
    }

    return updated.find(c => c.id === id);
};

export const scheduleInterviewApi = async (candidateId, interviewData) => {
    const current = getCandidatesFromStorage();
    let createdInterview = null;
    let candidateToUpdate = null;

    const updated = current.map(c => {
        if (c.id === candidateId) {
            const newInt = {
                id: `int_${Date.now()}`,
                roundName: interviewData.roundName || "Technical Round 1",
                interviewer: interviewData.interviewer || "Prashant Kumar",
                date: interviewData.date || new Date().toISOString().split("T")[0],
                time: interviewData.time || "11:00 AM",
                meetingLink: interviewData.meetingLink || "https://meet.google.com/sample-room",
                rating: 0,
                feedback: "",
                status: "Scheduled"
            };
            createdInterview = newInt;
            candidateToUpdate = {
                ...c,
                interviews: [...(c.interviews || []), newInt]
            };
            return candidateToUpdate;
        }
        return c;
    });

    saveCandidatesToStorage(updated);

    if (candidateToUpdate) {
        try {
            await API.put(`/hire/candidates/${candidateId}`, candidateToUpdate);
        } catch (err) {
            console.error("Failed to sync interview to backend", err);
        }
    }

    return createdInterview;
};

export const addInterviewFeedbackApi = async (candidateId, interviewId, feedbackData) => {
    const current = getCandidatesFromStorage();
    let candidateToUpdate = null;

    const updated = current.map(c => {
        if (c.id === candidateId) {
            const updatedInterviews = (c.interviews || []).map(int => {
                if (int.id === interviewId) {
                    return {
                        ...int,
                        rating: feedbackData.rating !== undefined ? Number(feedbackData.rating) : int.rating,
                        feedback: feedbackData.feedback !== undefined ? feedbackData.feedback : int.feedback,
                        status: feedbackData.status || "Passed"
                    };
                }
                return int;
            });
            candidateToUpdate = { ...c, interviews: updatedInterviews };
            return candidateToUpdate;
        }
        return c;
    });

    saveCandidatesToStorage(updated);

    if (candidateToUpdate) {
        try {
            await API.put(`/hire/candidates/${candidateId}`, candidateToUpdate);
        } catch (err) {
            console.error("Failed to sync feedback to backend", err);
        }
    }

    return updated.find(c => c.id === candidateId);
};

export const addCandidateDocumentApi = async (candidateId, docData) => {
    const current = getCandidatesFromStorage();
    let candidateToUpdate = null;

    const updated = current.map(c => {
        if (c.id === candidateId) {
            const newDoc = {
                id: `doc_${Date.now()}`,
                name: docData.name || "Document.pdf",
                type: docData.type || "Other",
                uploadDate: new Date().toISOString().split("T")[0],
                size: docData.size || "1.5 MB",
                url: docData.url || "#"
            };
            candidateToUpdate = {
                ...c,
                documents: [...(c.documents || []), newDoc]
            };
            return candidateToUpdate;
        }
        return c;
    });

    saveCandidatesToStorage(updated);

    if (candidateToUpdate) {
        try {
            await API.put(`/hire/candidates/${candidateId}`, candidateToUpdate);
        } catch (err) {
            console.error("Failed to sync document to backend", err);
        }
    }

    return updated.find(c => c.id === candidateId);
};

export const deleteCandidateDocumentApi = async (candidateId, docId) => {
    const current = getCandidatesFromStorage();
    let candidateToUpdate = null;

    const updated = current.map(c => {
        if (c.id === candidateId) {
            candidateToUpdate = {
                ...c,
                documents: (c.documents || []).filter(d => d.id !== docId)
            };
            return candidateToUpdate;
        }
        return c;
    });

    saveCandidatesToStorage(updated);

    if (candidateToUpdate) {
        try {
            await API.put(`/hire/candidates/${candidateId}`, candidateToUpdate);
        } catch (err) {
            console.error("Failed to sync document deletion to backend", err);
        }
    }

    return updated.find(c => c.id === candidateId);
};

export const updateOfferDetailsApi = async (candidateId, offerData) => {
    const current = getCandidatesFromStorage();
    let candidateToUpdate = null;

    const updated = current.map(c => {
        if (c.id === candidateId) {
            const offerObj = {
                offeredCtc: offerData.offeredCtc || c.expectedCtc,
                joiningDate: offerData.joiningDate || "",
                offerDate: offerData.offerDate || new Date().toISOString().split("T")[0],
                status: offerData.status || "Offer Sent",
                notes: offerData.notes || ""
            };

            let newStage = c.stage;
            if (offerData.status === "Joined") {
                newStage = "Joined";
            } else if (offerData.status === "Offer Accepted") {
                newStage = "Offer Accepted";
            } else if (offerData.status === "Offer Sent" || offerData.status === "Offer Pending") {
                newStage = "Offer Sent";
            } else if (offerData.status === "Offer Declined") {
                newStage = "Rejected";
            }

            candidateToUpdate = {
                ...c,
                stage: newStage,
                status: offerData.status || "Offer Sent",
                offerDetails: offerObj
            };
            return candidateToUpdate;
        }
        return c;
    });

    saveCandidatesToStorage(updated);

    if (candidateToUpdate) {
        try {
            await API.put(`/hire/candidates/${candidateId}`, candidateToUpdate);
        } catch (err) {
            console.error("Failed to sync offer details to backend", err);
        }
    }

    return updated.find(c => c.id === candidateId);
};

export const archiveCandidateApi = async (candidateId, reason) => {
    const current = getCandidatesFromStorage();
    let candidateToUpdate = null;

    const updated = current.map(c => {
        if (c.id === candidateId) {
            candidateToUpdate = {
                ...c,
                stage: "Rejected",
                status: "Rejected",
                archiveReason: reason || "Rejected"
            };
            return candidateToUpdate;
        }
        return c;
    });

    saveCandidatesToStorage(updated);

    if (candidateToUpdate) {
        try {
            await API.put(`/hire/candidates/${candidateId}`, candidateToUpdate);
        } catch (err) {
            console.error("Failed to sync archive state to backend", err);
        }
    }

    return updated.find(c => c.id === candidateId);
};

export const deleteCandidateApi = async (candidateId) => {
    const current = getCandidatesFromStorage();
    const updated = current.filter(c => c.id !== candidateId);
    saveCandidatesToStorage(updated);

    try {
        await API.delete(`/hire/candidates/${candidateId}`);
    } catch (err) {
        console.error("Failed to sync delete to backend", err);
    }

    return true;
};

export const parseResumeWithAi = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await API.post("/hire/parse-resume", formData, {
        headers: { "Content-Type": "multipart/form-data" }
    });
    return res.data;
};

export const searchCandidatesWithAi = async (params) => {
    const res = await API.post("/hire/ai-search", params);
    return res.data;
};

export const uploadResumeToAiPool = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await API.post("/hire/ai-upload-resume", formData, {
        headers: { "Content-Type": "multipart/form-data" }
    });
    return res.data;
};

