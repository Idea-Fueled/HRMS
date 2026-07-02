import Post from "../../models/posts/post.model.js";
import User from "../../models/users/user.model.js"

export const createPost = async (req, res, next) => {
    try {
        const { author, content, attachemnt, isPinned, category } = req.body
        if (!author || !content?.trim()) {
            return res.status(400).json({
                success: false,
                message: "Please provide the author and content"
            })
        }

        const user = await User.findById(author);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Author not found!"
            })
        }

        const post = await Post.create({
            author, content, attachemnt, isPinned, category
        })

        return res.status(201).json({
            success: true,
            message: "Post created successfully",
            post
        })
    } catch (error) {
        return res.status(500).json({
            message: error.message
        })
    }
}

export const getAllPosts = async (req, res, next) => {
    try {
        const posts = await Post.find({
            isActive: true,
        })
            .populate(
                "author",
                "fullName profilePicture designation"
            )
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            count: posts.length,
            posts,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        })
    }
}

export const getPostById = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id)
            .populate(
                "author",
                "fullName profilePicture designation"
            );

        if (!post) {
            return res.status(404).json({
                success: false,
                message: "Post not found.",
            });
        }

        return res.status(200).json({
            success: true,
            post,
        });
    } catch (error) {
        console.error("Get Post Error:", error);

        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

export const deletePost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);

        if (!post) {
            return res.status(404).json({
                success: false,
                message: "Post not found.",
            });
        }

        post.isActive = false;

        await post.save();

        return res.status(200).json({
            success: true,
            message: "Post deleted successfully.",
        });
    } catch (error) {
        console.error("Delete Post Error:", error);

        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};