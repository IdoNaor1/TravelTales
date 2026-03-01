import express from "express";
import postsRouter from "./posts";
import commentsRouter from "./comments";
import authRouter from "./auth";
import usersRouter from "./users";
import fileUploadRouter from "./fileUpload";

const router = express.Router();

router.use('/posts', postsRouter);
router.use('/comments', commentsRouter);
router.use('/auth', authRouter);
router.use('/users', usersRouter);
router.use('/file', fileUploadRouter);

export default router;
