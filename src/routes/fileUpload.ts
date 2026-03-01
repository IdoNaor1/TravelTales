import express, { Response } from "express";
import multer from "multer";
import path from "path";
import { authMiddleware, AuthRequest } from "../middleware/authMiddleware";

const router = express.Router();

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, "public/");
    },
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname);
        const timestamp = Date.now();
        cb(null, `${timestamp}${ext}`);
    }
});

const upload = multer({ storage });

/**
 * @swagger
 * /file:
 *   post:
 *     summary: Upload an image file
 *     description: Upload a single image file. Returns the public URL for the stored file.
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: File uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 *                   example: /public/1709123456789.jpg
 *       400:
 *         description: No file provided
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post("/", authMiddleware, upload.single("file"), (req: AuthRequest, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json("No file provided");
        }
        res.status(200).json({ url: `/public/${req.file.filename}` });
    } catch (error) {
        console.error(error);
        res.status(500).json("Error uploading file");
    }
});

export default router;
