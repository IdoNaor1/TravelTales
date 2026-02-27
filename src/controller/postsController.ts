import postsModel from "../model/postsModel";
import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";

const createPost = async (req: AuthRequest, res: Response) => {
    try {
        const { title, content } = req.body;

        if (!req.userId) {
            return res.status(401).json("Unauthorized");
        }

        const newPost = new postsModel({
            title,
            content,
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
    try {
        if (sender !== undefined) {
            const posts = await postsModel.find({ sender });
            res.status(200).json(posts);
        } else {
            const posts = await postsModel.find();
            res.status(200).json(posts);
        }
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

export default {
    createPost,
    getAllPosts,
    getPostById,
    updatePostById,
    deletePostById
};
