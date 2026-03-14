import express from "express";
import postsController from "../controller/postsController";
import { authMiddleware } from "../middleware/authMiddleware";
import {
  validate,
  isString,
  isMongoId,
  minLength,
  maxLength,
} from "../middleware/validate";

const router = express.Router();

/**
 * @swagger
 * /posts:
 *   post:
 *     summary: Create a new post
 *     description: Create a new post with a title and content. The authenticated user will be set as the post's sender.
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePostRequest'
 *     responses:
 *       201:
 *         description: Post created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Post'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 *   get:
 *     summary: Get all posts
 *     description: Retrieve posts with cursor-based pagination. Optionally filter by sender.
 *     tags: [Posts]
 *     parameters:
 *       - in: query
 *         name: sender
 *         schema:
 *           type: string
 *         description: Filter posts by sender (user ID)
 *         example: 507f1f77bcf86cd799439011
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 9
 *         description: Number of posts to return (max 100)
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *         description: ID of the last post from the previous page (for cursor pagination)
 *     responses:
 *       200:
 *         description: Paginated list of posts
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedPostsResponse'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router
  .route("/")
  .post(
    authMiddleware,
    validate({
      title: {
        source: "body",
        validators: [isString, minLength(1), maxLength(200)],
      },
      content: {
        source: "body",
        validators: [isString, minLength(1), maxLength(5000)],
      },
      image: { source: "body", optional: true, validators: [isString] },
    }),
    postsController.createPost,
  )
  .get(postsController.getAllPosts);

/**
 * @swagger
 * /posts/{id}:
 *   get:
 *     summary: Get post by ID
 *     description: Retrieve a specific post by its ID.
 *     tags: [Posts]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Post ID
 *         example: 507f1f77bcf86cd799439012
 *     responses:
 *       200:
 *         description: Post retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Post'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 *   put:
 *     summary: Update post
 *     description: Update an existing post's title and/or content.
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Post ID
 *         example: 507f1f77bcf86cd799439012
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Updated post title
 *                 example: Updated Post Title
 *               content:
 *                 type: string
 *                 description: Updated post content
 *                 example: This is the updated content.
 *     responses:
 *       200:
 *         description: Post updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Post'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 *   delete:
 *     summary: Delete post
 *     description: Delete a post by its ID.
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Post ID
 *         example: 507f1f77bcf86cd799439012
 *     responses:
 *       200:
 *         description: Post deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Post deleted successfully
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router
  .route("/:id")
  .get(
    validate({ id: { source: "params", validators: [isMongoId] } }),
    postsController.getPostById,
  )
  .put(
    authMiddleware,
    validate({
      id: { source: "params", validators: [isMongoId] },
      title: {
        source: "body",
        optional: true,
        validators: [isString, minLength(1), maxLength(200)],
      },
      content: {
        source: "body",
        optional: true,
        validators: [isString, minLength(1), maxLength(5000)],
      },
      image: { source: "body", optional: true, validators: [isString] },
    }),
    postsController.updatePostById,
  )
  .delete(
    authMiddleware,
    validate({ id: { source: "params", validators: [isMongoId] } }),
    postsController.deletePostById,
  );

/**
 * @swagger
 * /posts/{id}/like:
 *   post:
 *     summary: Toggle like on a post
 *     description: Adds a like if the user hasn't liked the post yet, or removes it if they already have.
 *     tags: [Posts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Post ID
 *     responses:
 *       200:
 *         description: Like toggled successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LikeToggleResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post(
  "/:id/like",
  authMiddleware,
  validate({ id: { source: "params", validators: [isMongoId] } }),
  postsController.toggleLike,
);

export default router;
