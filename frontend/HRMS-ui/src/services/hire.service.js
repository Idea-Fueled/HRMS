import API from "./api";

// Initial realistic candidates dataset for enterprise HRMS demo
const INITIAL_CANDIDATES = [
    {
        id: "cand_101",
        name: "Rohan Mehta",
        email: "rohan.mehta@example.com",
        phone: "+91 98765 43210",
        address: "Bengaluru, Karnataka",
        photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
        position: "Senior Full Stack Engineer",
        experience: "5.5 Yrs",
        currentCompany: "TechSolutions Pvt Ltd",
        currentCtc: "₹16 LPA",
        expectedCtc: "₹22 LPA",
        noticePeriod: "30 Days",
        skills: ["React", "Node.js", "TypeScript", "MongoDB", "AWS"],
        appliedDate: "2026-07-25",
        stage: "Technical Round 1",
        status: "In Progress",
        assignedHr: "Priya Sharma",
        resume: "Rohan_Mehta_Resume.pdf",
        interviews: [
            {
                id: "int_1",
                roundName: "HR Round",
                interviewer: "Prashant Kumar",
                date: "2026-07-27",
                time: "10:30 AM",
                meetingLink: "https://meet.google.com/abc-defg-hij",
                rating: 4,
                feedback: "Excellent communication skills, clear career goals, aligned with company culture.",
                status: "Passed"
            },
            {
                id: "int_2",
                roundName: "Technical Round 1",
                interviewer: "Anirudh Joshi",
                date: "2026-08-04",
                time: "02:00 PM",
                meetingLink: "https://meet.google.com/tech-round-one",
                rating: 0,
                feedback: "",
                status: "Scheduled"
            }
        ],
        documents: [
            { id: "doc_1", name: "Rohan_Mehta_Resume.pdf", type: "Resume", uploadDate: "2026-07-25", size: "1.2 MB", url: "#" },
            { id: "doc_2", name: "Portfolio_Link.pdf", type: "Portfolio", uploadDate: "2026-07-25", size: "3.5 MB", url: "#" }
        ],
        offerDetails: null,
        archiveReason: null
    },
    {
        id: "cand_102",
        name: "Ananya Iyer",
        email: "ananya.iyer@example.com",
        phone: "+91 91234 56789",
        address: "Chennai, Tamil Nadu",
        photo: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
        position: "Product Designer (UI/UX)",
        experience: "4 Yrs",
        currentCompany: "DesignCraft Studios",
        currentCtc: "₹14 LPA",
        expectedCtc: "₹19 LPA",
        noticePeriod: "15 Days",
        skills: ["Figma", "Design Systems", "Prototyping", "User Research"],
        appliedDate: "2026-07-22",
        stage: "Manager Round",
        status: "Passed",
        assignedHr: "Ananya Verma",
        resume: "Ananya_Iyer_UIUX.pdf",
        interviews: [
            {
                id: "int_3",
                roundName: "HR Round",
                interviewer: "Priya Sharma",
                date: "2026-07-24",
                time: "11:00 AM",
                meetingLink: "https://meet.google.com/hr-round-iyer",
                rating: 5,
                feedback: "Articulate, strong portfolio demonstration.",
                status: "Passed"
            },
            {
                id: "int_4",
                roundName: "Technical Round 1",
                interviewer: "Vikram Sengupta",
                date: "2026-07-28",
                time: "03:30 PM",
                meetingLink: "https://meet.google.com/design-review",
                rating: 5,
                feedback: "Exceptional design system understanding and mobile UI patterns.",
                status: "Passed"
            },
            {
                id: "int_5",
                roundName: "Manager Round",
                interviewer: "Siddharth Malhotra",
                date: "2026-07-31",
                time: "04:00 PM",
                meetingLink: "https://meet.google.com/manager-round-des",
                rating: 4,
                feedback: "Great cross-functional collaboration mindset.",
                status: "Passed"
            }
        ],
        documents: [
            { id: "doc_3", name: "Ananya_Iyer_UIUX.pdf", type: "Resume", uploadDate: "2026-07-22", size: "2.4 MB", url: "#" },
            { id: "doc_4", name: "Design_Case_Studies.pdf", type: "Portfolio", uploadDate: "2026-07-22", size: "8.1 MB", url: "#" }
        ],
        offerDetails: null,
        archiveReason: null
    },
    {
        id: "cand_103",
        name: "Vikramaditya Rao",
        email: "vikram.rao@example.com",
        phone: "+91 99887 76655",
        address: "Hyderabad, Telangana",
        photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
        position: "DevOps & Cloud Specialist",
        experience: "6.5 Yrs",
        currentCompany: "CloudScale Inc",
        currentCtc: "₹21 LPA",
        expectedCtc: "₹28 LPA",
        noticePeriod: "Immediate",
        skills: ["Kubernetes", "Docker", "Terraform", "AWS", "CI/CD"],
        appliedDate: "2026-07-15",
        stage: "Offer Sent",
        status: "Offer Sent",
        assignedHr: "Priya Sharma",
        resume: "Vikram_Rao_DevOps.pdf",
        interviews: [
            {
                id: "int_6",
                roundName: "HR Round",
                interviewer: "Priya Sharma",
                date: "2026-07-18",
                time: "12:00 PM",
                meetingLink: "https://meet.google.com/hr-devops",
                rating: 4,
                feedback: "Immediate joiner, strong technical pedigree.",
                status: "Passed"
            },
            {
                id: "int_7",
                roundName: "Technical Round 1",
                interviewer: "Rajesh Kumar",
                date: "2026-07-21",
                time: "05:00 PM",
                meetingLink: "https://meet.google.com/tech-infra-1",
                rating: 5,
                feedback: "Deep expertise in AWS EKS and Infrastructure as Code.",
                status: "Passed"
            },
            {
                id: "int_8",
                roundName: "Technical Round 2",
                interviewer: "Amitabh Sen",
                date: "2026-07-25",
                time: "02:30 PM",
                meetingLink: "https://meet.google.com/tech-infra-2",
                rating: 5,
                feedback: "Strong security posture and zero-downtime deployment strategies.",
                status: "Passed"
            }
        ],
        documents: [
            { id: "doc_5", name: "Vikram_Rao_DevOps.pdf", type: "Resume", uploadDate: "2026-07-15", size: "1.8 MB", url: "#" },
            { id: "doc_6", name: "AWS_Certified_DevOps_Professional.pdf", type: "Other", uploadDate: "2026-07-15", size: "500 KB", url: "#" },
            { id: "doc_7", name: "Offer_Letter_Draft.pdf", type: "Offer Letter", uploadDate: "2026-07-29", size: "450 KB", url: "#" }
        ],
        offerDetails: {
            offeredCtc: "₹26.5 LPA",
            joiningDate: "2026-08-15",
            offerDate: "2026-07-29",
            status: "Offer Sent",
            notes: "Immediate joiner, offer valid till Aug 5."
        },
        archiveReason: null
    },
    {
        id: "cand_104",
        name: "Neha Kulkarni",
        email: "neha.kulkarni@example.com",
        phone: "+91 97654 32109",
        address: "Pune, Maharashtra",
        photo: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
        position: "Product Manager",
        experience: "5 Yrs",
        currentCompany: "NextGen Software",
        currentCtc: "₹18 LPA",
        expectedCtc: "₹24 LPA",
        noticePeriod: "60 Days",
        skills: ["Product Roadmap", "Agile", "Mixpanel", "SQL", "Stakeholder Mgmt"],
        appliedDate: "2026-07-20",
        stage: "Joined",
        status: "Joined",
        assignedHr: "Ananya Verma",
        resume: "Neha_Kulkarni_PM.pdf",
        interviews: [
            {
                id: "int_9",
                roundName: "HR Round",
                interviewer: "Ananya Verma",
                date: "2026-07-21",
                time: "11:30 AM",
                meetingLink: "https://meet.google.com/pm-hr",
                rating: 5,
                feedback: "High ownership, strategic mindset.",
                status: "Passed"
            },
            {
                id: "int_10",
                roundName: "Manager Round",
                interviewer: "Gaurav Malhotra",
                date: "2026-07-24",
                time: "04:00 PM",
                meetingLink: "https://meet.google.com/pm-manager",
                rating: 5,
                feedback: "Solid metrics-driven approach and user empathy.",
                status: "Passed"
            }
        ],
        documents: [
            { id: "doc_8", name: "Neha_Kulkarni_PM.pdf", type: "Resume", uploadDate: "2026-07-20", size: "1.1 MB", url: "#" },
            { id: "doc_9", name: "Signed_Offer_Letter.pdf", type: "Offer Letter", uploadDate: "2026-07-27", size: "850 KB", url: "#" }
        ],
        offerDetails: {
            offeredCtc: "₹23 LPA",
            joiningDate: "2026-08-01",
            offerDate: "2026-07-26",
            status: "Offer Accepted",
            notes: "Joined on Aug 1 as Lead PM."
        },
        archiveReason: null
    },
    {
        id: "cand_105",
        name: "Karan Johar",
        email: "karan.johar@example.com",
        phone: "+91 94321 09876",
        address: "Mumbai, Maharashtra",
        photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
        position: "Backend Engineer (Node.js)",
        experience: "3 Yrs",
        currentCompany: "DataSync Systems",
        currentCtc: "₹10 LPA",
        expectedCtc: "₹15 LPA",
        noticePeriod: "30 Days",
        skills: ["Node.js", "Express", "PostgreSQL", "Redis"],
        appliedDate: "2026-07-29",
        stage: "Resume Screening",
        status: "In Progress",
        assignedHr: "Priya Sharma",
        resume: "Karan_Backend.pdf",
        interviews: [],
        documents: [
            { id: "doc_10", name: "Karan_Backend.pdf", type: "Resume", uploadDate: "2026-07-29", size: "900 KB", url: "#" }
        ],
        offerDetails: null,
        archiveReason: null
    },
    {
        id: "cand_106",
        name: "Shreya Ghoshal",
        email: "shreya.g@example.com",
        phone: "+91 95544 33221",
        address: "Kolkata, West Bengal",
        photo: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
        position: "QA Automation Engineer",
        experience: "4.5 Yrs",
        currentCompany: "QualityFirst Labs",
        currentCtc: "₹12 LPA",
        expectedCtc: "₹17 LPA",
        noticePeriod: "45 Days",
        skills: ["Cypress", "Selenium", "JavaScript", "Playwright"],
        appliedDate: "2026-07-10",
        stage: "Rejected",
        status: "Rejected",
        assignedHr: "Ananya Verma",
        resume: "Shreya_QA_Automation.pdf",
        interviews: [
            {
                id: "int_11",
                roundName: "HR Round",
                interviewer: "Ananya Verma",
                date: "2026-07-12",
                time: "10:00 AM",
                meetingLink: "#",
                rating: 3,
                feedback: "Good verbal skills.",
                status: "Passed"
            },
            {
                id: "int_12",
                roundName: "Technical Round 1",
                interviewer: "Nitin Saxena",
                date: "2026-07-16",
                time: "03:00 PM",
                meetingLink: "#",
                rating: 2,
                feedback: "Lacks core automation scripting knowledge in JavaScript.",
                status: "Failed"
            }
        ],
        documents: [
            { id: "doc_11", name: "Shreya_QA_Automation.pdf", type: "Resume", uploadDate: "2026-07-10", size: "1.4 MB", url: "#" }
        ],
        offerDetails: null,
        archiveReason: "Rejected"
    },
    {
        id: "cand_107",
        name: "Arjun Rampal",
        email: "arjun.rampal@example.com",
        phone: "+91 91122 33445",
        address: "Delhi NCR",
        photo: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80",
        position: "HR Generalist",
        experience: "3.5 Yrs",
        currentCompany: "PeopleFirst HR",
        currentCtc: "₹8 LPA",
        expectedCtc: "₹12 LPA",
        noticePeriod: "30 Days",
        skills: ["Recruitment", "Employee Engagement", "Payroll Admin"],
        appliedDate: "2026-07-28",
        stage: "New Application",
        status: "In Progress",
        assignedHr: "Priya Sharma",
        resume: "Arjun_HR_Generalist.pdf",
        interviews: [],
        documents: [
            { id: "doc_12", name: "Arjun_HR_Generalist.pdf", type: "Resume", uploadDate: "2026-07-28", size: "820 KB", url: "#" }
        ],
        offerDetails: null,
        archiveReason: null
    }
];

const STORAGE_KEY = "hrms_hire_candidates_v1";

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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_CANDIDATES));
    return INITIAL_CANDIDATES;
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
    let docUrl = "#";
    let docSize = "1.2 MB";

    if (candidateData.cvFile) {
        try {
            docUrl = URL.createObjectURL(candidateData.cvFile);
            if (candidateData.cvFile.size) {
                const kb = candidateData.cvFile.size / 1024;
                docSize = kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb.toFixed(0)} KB`;
            }
        } catch {
            docUrl = "#";
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
            return {
                ...c,
                interviews: [...(c.interviews || []), newInt]
            };
        }
        return c;
    });

    saveCandidatesToStorage(updated);
    return createdInterview;
};

export const addInterviewFeedbackApi = async (candidateId, interviewId, feedbackData) => {
    const current = getCandidatesFromStorage();

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
            return { ...c, interviews: updatedInterviews };
        }
        return c;
    });

    saveCandidatesToStorage(updated);
    return updated.find(c => c.id === candidateId);
};

export const addCandidateDocumentApi = async (candidateId, docData) => {
    const current = getCandidatesFromStorage();

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
            return {
                ...c,
                documents: [...(c.documents || []), newDoc]
            };
        }
        return c;
    });

    saveCandidatesToStorage(updated);
    return updated.find(c => c.id === candidateId);
};

export const updateOfferDetailsApi = async (candidateId, offerData) => {
    const current = getCandidatesFromStorage();

    const updated = current.map(c => {
        if (c.id === candidateId) {
            const offerObj = {
                offeredCtc: offerData.offeredCtc || c.expectedCtc,
                joiningDate: offerData.joiningDate || "",
                offerDate: offerData.offerDate || new Date().toISOString().split("T")[0],
                status: offerData.status || "Offer Sent",
                notes: offerData.notes || ""
            };
            return {
                ...c,
                stage: offerData.status === "Joined" ? "Joined" : "Offer Sent",
                status: offerData.status || "Offer Sent",
                offerDetails: offerObj
            };
        }
        return c;
    });

    saveCandidatesToStorage(updated);
    return updated.find(c => c.id === candidateId);
};

export const archiveCandidateApi = async (candidateId, reason) => {
    const current = getCandidatesFromStorage();

    const updated = current.map(c => {
        if (c.id === candidateId) {
            return {
                ...c,
                stage: "Rejected",
                status: "Rejected",
                archiveReason: reason || "Rejected"
            };
        }
        return c;
    });

    saveCandidatesToStorage(updated);
    return updated.find(c => c.id === candidateId);
};

export const deleteCandidateApi = async (candidateId) => {
    const current = getCandidatesFromStorage();
    const updated = current.filter(c => c.id !== candidateId);
    saveCandidatesToStorage(updated);
    return true;
};
