import express from "express";
import { createPoll, getAllPolls, voteInPoll } from "../../controllers/polls/poll.controller.js";
import { isAuthenticated } from "../../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/", isAuthenticated, createPoll);
router.get("/", isAuthenticated, getAllPolls);
router.post("/:id/vote", isAuthenticated, voteInPoll);

export default router;
