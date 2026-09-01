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

// Helper to save candidates to localStorage
export const saveCandidatesToStorage = (candidates) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(candidates));
    } catch (e) {
        console.error("Error saving candidate storage", e);
    }
};

/* ─────────────────────────────────────────────
   HIRE SERVICE METHODS
───────────────────────────────────────────── */

export const getHireCandidates = async () => {
    try {
        // Attempt backend fetch if route exists
        const res = await API.get("/hire/candidates");
        if (res.data?.success && Array.isArray(res.data.candidates)) {
            saveCandidatesToStorage(res.data.candidates);
            return res.data.candidates;
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
        position: candidateData.position || "Software Engineer",
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

export const updateCandidateStageApi = async (id, newStage) => {
    const current = getCandidatesFromStorage();
    const updated = current.map(c => {
        if (c.id === id) {
            let newStatus = c.status;
            let archiveReason = c.archiveReason;

            if (newStage === "Rejected") {
                newStatus = "Rejected";
                archiveReason = "Rejected";
            } else if (newStage === "Joined") {
                newStatus = "Joined";
                archiveReason = null;
            } else if (newStage === "Offer Sent" || newStage === "Offer Accepted") {
                newStatus = newStage;
                archiveReason = null;
            } else {
                newStatus = "In Progress";
                archiveReason = null;
            }

            return { ...c, stage: newStage, status: newStatus, archiveReason };
        }
        return c;
    });
    saveCandidatesToStorage(updated);

    try {
        await API.put(`/hire/candidates/${id}/stage`, { stage: newStage });
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
            candidateToUpdate = {
                ...c,
                stage: offerData.status === "Joined" ? "Joined" : "Offer Sent",
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
