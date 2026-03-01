import postsModel from "../model/postsModel";
import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";

const createPost = async (req: AuthRequest, res: Response) => {
    try {
        const { title, content, image } = req.body;

        if (!req.userId) {
            return res.status(401).json("Unauthorized");
        }

        const newPost = new postsModel({
            title,
            content,
            image,
            sender: req.userId
        });
        await newPost.save();
        res.status(201).json(newPost);
    } catch (error) {
        console.error(error);
        res.status(500).json("Error creating post");
    }
};

const getAllPosts = async (req: AuthRequest, res: Response) => {
    const senderRaw = req.query.sender;
    const sender = Array.isArray(senderRaw) ? senderRaw[0] : (typeof senderRaw === 'string' ? senderRaw : undefined);
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
    const cursor = req.query.cursor as string | undefined;

    try {
        const filter: Record<string, unknown> = {};
        if (sender !== undefined) filter.sender = sender;
        if (cursor) filter._id = { $lt: cursor };

        const posts = await postsModel
            .find(filter)
            .sort({ createdAt: -1, _id: -1 })
            .limit(limit + 1);

        const hasMore = posts.length > limit;
        const page = hasMore ? posts.slice(0, limit) : posts;
        const nextCursor = hasMore ? page[page.length - 1]._id.toString() : null;

        res.status(200).json({ posts: page, nextCursor });
    } catch (error) {
        console.error(error);
        res.status(500).json("Error retrieving posts");
    }
};

const getPostById = async (req: AuthRequest, res: Response) => {
    const id = req.params.id;
    try {
        const post = await postsModel.findById(id);
        if (!post) {
            return res.status(404).json("Post not found");
        }
        res.status(200).json(post);
    } catch (error) {
        console.error(error);
        res.status(500).json("Error retrieving post");
    }
};

const updatePostById = async (req: AuthRequest, res: Response) => {
    const id = req.params.id;
    const updateData = req.body;
    try {
        const post = await postsModel.findById(id);
        if (!post) {
            return res.status(404).json("Post not found");
        }

        if (post.sender.toString() !== req.userId) {
            return res.status(403).json("Forbidden: You can only update your own posts");
        }

        const updatedPost = await postsModel.findByIdAndUpdate(id, updateData, { new: true });
        res.status(200).json(updatedPost);
    } catch (error) {
        console.error(error);
        res.status(500).json("Error updating post");
    }
};

const deletePostById = async (req: AuthRequest, res: Response) => {
    const id = req.params.id;
    try {
        const post = await postsModel.findById(id);
        if (!post) {
            return res.status(404).json("Post not found");
        }

        if (post.sender.toString() !== req.userId) {
            return res.status(403).json("Forbidden: You can only delete your own posts");
        }

        const deletedPost = await postsModel.findByIdAndDelete(id);
        res.status(200).json(deletedPost);
    } catch (error) {
        console.error(error);
        res.status(500).json("Error deleting post");
    }
};

const toggleLike = async (req: AuthRequest, res: Response) => {
    const id = req.params.id;

    if (!req.userId) {
        return res.status(401).json("Unauthorized");
    }

    try {
        const post = await postsModel.findById(id);
        if (!post) {
            return res.status(404).json("Post not found");
        }

        const userId = req.userId;
        const alreadyLiked = post.likes.some(
            (likeId) => likeId.toString() === userId
        );

        const updatedPost = await postsModel.findByIdAndUpdate(
            id,
            alreadyLiked
                ? { $pull: { likes: userId } }
                : { $addToSet: { likes: userId } },
            { new: true }
        );

        res.status(200).json({
            likesCount: updatedPost!.likes.length,
            isLikedByUser: !alreadyLiked
        });
    } catch (error) {
        console.error(error);
        res.status(500).json("Error toggling like");
    }
};

export default {
    createPost,
    getAllPosts,
    getPostById,
    updatePostById,
    deletePostById,
    toggleLike
};
