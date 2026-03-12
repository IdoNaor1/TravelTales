import express from "express";
import aiController from "../controller/aiController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = express.Router();

/**
 * @swagger
 * /ai/ask:
 *   post:
 *     summary: Ask the AI Travel Assistant a question
 *     description: |
 *       Uses Retrieval-Augmented Generation (RAG) over all travel posts to answer
 *       travel-related questions. The system retrieves the most relevant post
 *       excerpts via vector similarity, then generates an answer using Google Gemini.
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AskAIRequest'
 *     responses:
 *       200:
 *         description: AI-generated answer with source references
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AskAIResponse'
 *       400:
 *         description: Invalid question (too short, too long, or missing)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post("/ask", authMiddleware, aiController.askAI);

export default router;
