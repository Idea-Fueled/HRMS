import express from "express"
import { createPost, deletePost, getAllPosts, getPostById } from "../../controllers/posts/post.controller.js";

const router = express.Router();

router.post("/", createPost)
router.get("/", getAllPosts);
router.get("/:id", getPostById)
router.delete("/:id", deletePost)

export default router;