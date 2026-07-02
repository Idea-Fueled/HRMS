import Poll from "../../models/polls/poll.model.js";
import User from "../../models/users/user.model.js";

export const createPoll = async (req, res) => {
    try {
        const { question, options } = req.body;
        const creatorId = req.user.userId || req.user.id;

        if (!question || !options || !Array.isArray(options) || options.length < 2) {
            return res.status(400).json({
                success: false,
                message: "A poll question and at least 2 options are required."
            });
        }

        const creator = await User.findById(creatorId);
        if (!creator) {
            return res.status(404).json({
                success: false,
                message: "Creator user not found."
            });
        }

        const poll = await Poll.create({
            question,
            options,
            creator: creatorId
        });

        const populatedPoll = await Poll.findById(poll._id).populate(
            "creator",
            "fullName designation profilePicture"
        );

        return res.status(201).json({
            success: true,
            message: "Poll created successfully",
            poll: populatedPoll
        });
    } catch (error) {
        console.error("Create Poll Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const getAllPolls = async (req, res) => {
    try {
        const polls = await Poll.find({ isActive: true })
            .populate("creator", "fullName designation profilePicture")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            polls
        });
    } catch (error) {
        console.error("Get All Polls Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

export const voteInPoll = async (req, res) => {
    try {
        const pollId = req.params.id;
        const { optionIndex } = req.body;
        const userId = req.user.userId || req.user.id;

        if (optionIndex === undefined || typeof optionIndex !== "number") {
            return res.status(400).json({
                success: false,
                message: "Invalid option index."
            });
        }

        const poll = await Poll.findById(pollId);
        if (!poll || !poll.isActive) {
            return res.status(404).json({
                success: false,
                message: "Active poll not found."
            });
        }

        if (optionIndex < 0 || optionIndex >= poll.options.length) {
            return res.status(400).json({
                success: false,
                message: "Option index out of range."
            });
        }

        // Check if user already voted
        const existingVoteIndex = poll.votes.findIndex(
            (v) => v.user.toString() === userId.toString()
        );

        if (existingVoteIndex > -1) {
            // Update vote
            poll.votes[existingVoteIndex].optionIndex = optionIndex;
        } else {
            // Add new vote
            poll.votes.push({
                user: userId,
                optionIndex
            });
        }

        await poll.save();

        const populatedPoll = await Poll.findById(pollId).populate(
            "creator",
            "fullName designation profilePicture"
        );

        return res.status(200).json({
            success: true,
            message: "Vote cast successfully",
            poll: populatedPoll
        });
    } catch (error) {
        console.error("Vote in Poll Error:", error);
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
