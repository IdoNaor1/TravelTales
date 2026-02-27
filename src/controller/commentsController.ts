import commentsModel from "../model/commentsModel";
import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";

const createComment = async (req: AuthRequest, res: Response) => {
    try {
        const { postId, content } = req.body;

        if (!req.userId) {
            return res.status(401).json("Unauthorized");
        }

        const newComment = new commentsModel({
            postId,
            content,
            author: req.userId
        });
        await newComment.save();
        res.status(201).json(newComment);
    } catch (error) {
        console.error(error);
        res.status(500).json("Error creating comment");
    }
};

const getCommentById = async (req: AuthRequest, res: Response) => {
    const id = req.params.id;
    try {
        const comment = await commentsModel.findById(id);
        if (!comment) {
            return res.status(404).json("Comment not found");
        }
        res.status(200).json(comment);
    } catch (error) {
        console.error(error);
        res.status(500).json("Error retrieving comment");
    }
};

const getCommentsByPostId = async (req: AuthRequest, res: Response) => {
    const postIdRaw = req.query.postId;
    const postId = Array.isArray(postIdRaw) ? postIdRaw[0] : (typeof postIdRaw === 'string' ? postIdRaw : undefined);
    try {
        const comments = await commentsModel.find({ postId: postId });
        res.status(200).json(comments);
    } catch (error) {
        console.error(error);
        res.status(500).json("Error retrieving comments");
    }
};

const updateCommentById = async (req: AuthRequest, res: Response) => {
    const id = req.params.id;
    const updateData = req.body;
    try {
        const comment = await commentsModel.findById(id);
        if (!comment) {
            return res.status(404).json("Comment not found");
        }

        if (comment.author.toString() !== req.userId) {
            return res.status(403).json("Forbidden: You can only update your own comments");
        }

        const updatedComment = await commentsModel.findByIdAndUpdate(id, updateData, { new: true });
        res.status(200).json(updatedComment);
    } catch (error) {
        console.error(error);
        res.status(500).json("Error updating comment");
    }
};

const deleteCommentById = async (req: AuthRequest, res: Response) => {
    const id = req.params.id;
    try {
        const comment = await commentsModel.findById(id);
        if (!comment) {
            return res.status(404).json("Comment not found");
        }

        if (comment.author.toString() !== req.userId) {
            return res.status(403).json("Forbidden: You can only delete your own comments");
        }

        const deletedComment = await commentsModel.findByIdAndDelete(id);
        res.status(200).json(deletedComment);
    } catch (error) {
        console.error(error);
        res.status(500).json("Error deleting comment");
    }
};

export default {
    createComment,
    getCommentById,
    getCommentsByPostId,
    updateCommentById,
    deleteCommentById
};
