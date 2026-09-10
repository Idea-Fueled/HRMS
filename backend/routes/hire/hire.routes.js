import express from "express";
import Candidate from "../../models/candidates/candidate.model.js";
import User from "../../models/users/user.model.js";

const router = express.Router();

// 1. GET /hire/candidates
router.get("/candidates", async (req, res) => {
    try {
        const candidates = await Candidate.find().sort({ createdAt: -1 });
        const existingEmails = new Set(candidates.map(c => c.email?.toLowerCase().trim()).filter(Boolean));

        // Fetch company employees from User collection
        const users = await User.find({
            status: { $ne: "terminated" }
        }).select("firstName lastName fullName email phoneNumber designation department profilePicture joiningDate createdAt salaryStructure presentAddress skills").lean();

        const joinedEmployeesFromUsers = (users || [])
            .filter(u => u.email && !existingEmails.has(u.email.toLowerCase().trim()))
            .map(u => {
                const name = u.fullName || `${u.firstName || ""} ${u.lastName || ""}`.trim() || "Employee";
                const joining = u.joiningDate ? new Date(u.joiningDate).toISOString().split("T")[0] : (u.createdAt ? new Date(u.createdAt).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]);
                const ctcFormatted = u.salaryStructure?.ctc ? (u.salaryStructure.ctc >= 100000 ? `₹${(u.salaryStructure.ctc / 100000).toFixed(1)} LPA` : `₹${u.salaryStructure.ctc}`) : "Standard";

                return {
                    id: `cand_emp_${u._id}`,
                    name,
                    email: u.email,
                    phone: u.phoneNumber || "",
                    address: u.presentAddress || "",
                    photo: u.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=2D79C7&color=fff`,
                    position: u.designation || "Software Engineer",
                    experience: "Joined Employee",
                    currentCompany: "Idea Fueled",
                    currentCtc: ctcFormatted,
                    expectedCtc: ctcFormatted,
                    noticePeriod: "Completed",
                    skills: u.skills && u.skills.length > 0 ? u.skills : ["General"],
                    appliedDate: joining,
                    stage: "Joined",
                    status: "Joined",
                    assignedHr: "HR Team",
                    resume: "Employee_Profile.pdf",
                    interviews: [],
                    documents: [],
                    offerDetails: {
                        offeredCtc: ctcFormatted,
                        joiningDate: joining,
                        offerDate: joining,
                        status: "Joined",
                        notes: "Existing employee in organization"
                    },
                    archiveReason: null
                };
            });

        const allCandidates = [...candidates, ...joinedEmployeesFromUsers];

        return res.status(200).json({
            success: true,
            candidates: allCandidates
        });
    } catch (err) {
        console.error("Error fetching candidates:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

// 2. POST /hire/candidates
router.post("/candidates", async (req, res) => {
    try {
        const candidateData = req.body;
        // Verify unique client-side ID or create one if missing
        if (!candidateData.id) {
            candidateData.id = `cand_${Date.now()}`;
        }
        
        // Check if candidate already exists in backend database
        let candidate = await Candidate.findOne({ id: candidateData.id });
        if (candidate) {
            Object.assign(candidate, candidateData);
            await candidate.save();
        } else {
            candidate = new Candidate(candidateData);
            await candidate.save();
        }

        return res.status(201).json({
            success: true,
            candidate
        });
    } catch (err) {
        console.error("Error saving candidate:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

// 3. PUT /hire/candidates/:id
router.put("/candidates/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const candidate = await Candidate.findOneAndUpdate(
            { id: id },
            { $set: updateData },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        if (!candidate) {
            return res.status(404).json({
                success: false,
                message: "Candidate not found"
            });
        }

        return res.status(200).json({
            success: true,
            candidate
        });
    } catch (err) {
        console.error("Error updating candidate:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

// 4. PUT /hire/candidates/:id/stage
router.put("/candidates/:id/stage", async (req, res) => {
    try {
        const { id } = req.params;
        const { stage } = req.body;

        let status = "In Progress";
        let archiveReason = null;

        if (stage === "Rejected") {
            status = "Rejected";
            archiveReason = "Rejected";
        } else if (stage === "Joined") {
            status = "Joined";
            archiveReason = null;
        } else if (stage === "Offer Sent" || stage === "Offer Accepted") {
            status = stage;
            archiveReason = null;
        }

        const candidate = await Candidate.findOneAndUpdate(
            { id: id },
            { $set: { stage, status, archiveReason } },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        if (!candidate) {
            return res.status(404).json({
                success: false,
                message: "Candidate not found"
            });
        }

        return res.status(200).json({
            success: true,
            candidate
        });
    } catch (err) {
        console.error("Error updating stage:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

// 5. DELETE /hire/candidates/:id
router.delete("/candidates/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const result = await Candidate.findOneAndDelete({ id: id });

        if (!result) {
            return res.status(404).json({
                success: false,
                message: "Candidate not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Candidate deleted successfully"
        });
    } catch (err) {
        console.error("Error deleting candidate:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

export default router;
