import { Response } from "express";
import { AuthRequest } from "../middleware/authMiddleware";
import { queryRAG, ValidationError } from "../services/ragService";

const askAI = async (req: AuthRequest, res: Response) => {
  try {
    const { question } = req.body;

    const result = await queryRAG(question);
    res.status(200).json(result);
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({ message: error.message });
    }
    console.error("AI query error:", error);
    res.status(500).json("Error processing AI query");
  }
};

export default { askAI };
