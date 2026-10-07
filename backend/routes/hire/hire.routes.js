import express from "express";
import Candidate from "../../models/candidates/candidate.model.js";

const router = express.Router();

// 1. GET /hire/candidates
router.get("/candidates", async (req, res) => {
    try {
        const candidates = await Candidate.find().sort({ createdAt: -1 });
        return res.status(200).json({
            success: true,
            candidates
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
            { new: true }
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
        const { stage, holdReason } = req.body;

        let status = "In Progress";
        let archiveReason = null;
        let updateHoldReason = null;

        if (stage === "Rejected") {
            status = "Rejected";
            archiveReason = "Rejected";
        } else if (stage === "On Hold" || stage === "Hold") {
            status = "On Hold";
            archiveReason = null;
            updateHoldReason = holdReason || "Candidate placed on hold";
        } else if (stage === "Joined") {
            status = "Joined";
            archiveReason = null;
        } else if (stage === "Offer Sent" || stage === "Offer Accepted") {
            status = stage;
            archiveReason = null;
        }

        const setFields = { stage, status, archiveReason };
        if (stage === "On Hold" || stage === "Hold") {
            setFields.holdReason = updateHoldReason;
        } else {
            setFields.holdReason = null;
        }

        const candidate = await Candidate.findOneAndUpdate(
            { id: id },
            { $set: setFields },
            { new: true }
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

// 5. PUT /hire/candidates/:id/hold
router.put("/candidates/:id/hold", async (req, res) => {
    try {
        const { id } = req.params;
        const { holdReason } = req.body;

        const candidate = await Candidate.findOneAndUpdate(
            { id: id },
            {
                $set: {
                    stage: "On Hold",
                    status: "On Hold",
                    holdReason: holdReason || "Candidate placed on hold",
                    archiveReason: null
                }
            },
            { new: true }
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
        console.error("Error placing candidate on hold:", err);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

// 6. PUT /hire/candidates/:id/unhold
router.put("/candidates/:id/unhold", async (req, res) => {
    try {
        const { id } = req.params;
        const { targetStage } = req.body;
        const nextStage = targetStage || "Resume Screening";

        const candidate = await Candidate.findOneAndUpdate(
            { id: id },
            {
                $set: {
                    stage: nextStage,
                    status: "In Progress",
                    holdReason: null,
                    archiveReason: null
                }
            },
            { new: true }
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
        console.error("Error unholding candidate:", err);
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
