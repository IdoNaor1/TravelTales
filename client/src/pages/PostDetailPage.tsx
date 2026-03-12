import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FaHeart, FaRegHeart, FaComment } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import postService from "../services/postService";
import commentService from "../services/commentService";
import { resolveMediaUrl } from "../services/fileService";
import Avatar from "../components/Avatar";
import type { IComment, IPost, IUser } from "../types";

const commentSchema = z.object({
  content: z
    .string()
    .min(1, "Comment cannot be empty")
    .max(1000, "Comment must be at most 1000 characters"),
});
type CommentFormData = z.infer<typeof commentSchema>;

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTimeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function asUser(v: string | IUser): IUser | null {
  return typeof v === "object" ? v : null;
}
function asId(v: string | IUser): string {
  return typeof v === "string" ? v : v._id;
}

// ── Comment item ──────────────────────────────────────────────────────────────

function CommentItem({
  comment,
  currentUserId,
  onDelete,
  onEdit,
}: {
  comment: IComment;
  currentUserId?: string;
  onDelete: (id: string) => void;
  onEdit: (id: string, newContent: string) => void;
}) {
  const author = asUser(comment.author);
  const authorId = asId(comment.author);
  const isOwner = currentUserId === authorId;

  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const trimmed = editContent.trim();
    if (!trimmed || trimmed === comment.content) {
      setIsEditing(false);
      setEditContent(comment.content);
      return;
    }
    setSaving(true);
    try {
      await onEdit(comment._id, trimmed);
      setIsEditing(false);
    } catch {
      /* keep editing open on failure */
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditContent(comment.content);
    setIsEditing(false);
  };

  return (
    <div className="d-flex gap-3 py-3 border-bottom">
      <Link to={`/profile/${authorId}`} tabIndex={-1}>
        <Avatar
          src={author?.profilePicture}
          username={author?.username || "User"}
          size={36}
          className="flex-shrink-0"
        />
      </Link>
      <div className="flex-grow-1">
        <div className="d-flex justify-content-between align-items-center mb-1">
          <Link
            to={`/profile/${authorId}`}
            className="fw-semibold small text-dark text-decoration-none"
          >
            {author?.username || "Unknown"}
          </Link>
          <div className="d-flex align-items-center gap-2">
            <span className="text-muted" style={{ fontSize: "0.75rem" }}>
              {formatTimeAgo(comment.createdAt)}
            </span>
            {isOwner && !isEditing && (
              <>
                <button
                  className="btn btn-sm btn-link text-primary p-0"
                  onClick={() => setIsEditing(true)}
                  aria-label="Edit comment"
                  style={{ fontSize: "0.75rem" }}
                >
                  Edit
                </button>
                <button
                  className="btn btn-sm btn-link text-danger p-0"
                  onClick={() => onDelete(comment._id)}
                  aria-label="Delete comment"
                  style={{ fontSize: "0.75rem" }}
                >
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
        {isEditing ? (
          <div>
            <textarea
              className="form-control form-control-sm mb-2"
              rows={2}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              maxLength={1000}
            />
            <div className="d-flex gap-2">
              <button
                className="btn btn-primary btn-sm"
                onClick={handleSave}
                disabled={saving || !editContent.trim()}
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={handleCancel}
                disabled={saving}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="mb-0 small">{comment.content}</p>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

function PostDetailPage() {
  const { postId } = useParams<{ postId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [post, setPost] = useState<IPost | null>(null);
  const [postLoading, setPostLoading] = useState(true);
  const [postError, setPostError] = useState<string | null>(null);

  const [likesCount, setLikesCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);

  const [comments, setComments] = useState<IComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentError, setCommentError] = useState<string | null>(null);

  const {
    register: registerComment,
    handleSubmit: handleCommentSubmit,
    reset: resetComment,
    formState: { errors: commentErrors, isSubmitting: submittingComment },
  } = useForm<CommentFormData>({ resolver: zodResolver(commentSchema) });

  // Load post
  useEffect(() => {
    if (!postId) return;
    setPostLoading(true);
    postService
      .getPostById(postId)
      .then((p) => {
        setPost(p);
        setLikesCount(p.likes?.length ?? 0);
        setIsLiked(user ? (p.likes ?? []).includes(user._id) : false);
      })
      .catch(() => setPostError("Post not found."))
      .finally(() => setPostLoading(false));
  }, [postId, user]);

  // Load comments
  useEffect(() => {
    if (!postId) return;
    setCommentsLoading(true);
    commentService
      .getByPost(postId)
      .then(setComments)
      .catch(() => {}) // non-fatal
      .finally(() => setCommentsLoading(false));
  }, [postId]);

  const handleLike = async () => {
    if (!user || isLiking || !post) return;
    const prev = { isLiked, likesCount };
    setIsLiked(!isLiked);
    setLikesCount(isLiked ? likesCount - 1 : likesCount + 1);
    setIsLiking(true);
    try {
      const res = await postService.toggleLike(post._id);
      setLikesCount(res.likesCount);
      setIsLiked(res.isLikedByUser);
    } catch {
      setIsLiked(prev.isLiked);
      setLikesCount(prev.likesCount);
    } finally {
      setIsLiking(false);
    }
  };

  const handleDelete = async () => {
    if (!post || !window.confirm("Delete this post?")) return;
    try {
      await postService.deletePost(post._id);
      navigate("/");
    } catch {
      alert("Failed to delete post.");
    }
  };

  const onCommentSubmit = async (data: CommentFormData) => {
    if (!postId) return;
    setCommentError(null);
    try {
      const created = await commentService.create(postId, data.content);
      setComments((prev) => [...prev, created]);
      resetComment();
    } catch {
      setCommentError("Failed to post comment. Please try again.");
    }
  };

  const handleCommentDelete = async (commentId: string) => {
    if (!window.confirm("Delete this comment?")) return;
    try {
      await commentService.remove(commentId);
      setComments((prev) => prev.filter((c) => c._id !== commentId));
    } catch {
      alert("Failed to delete comment.");
    }
  };

  const handleCommentEdit = async (commentId: string, newContent: string) => {
    const updated = await commentService.update(commentId, newContent);
    setComments((prev) =>
      prev.map((c) =>
        c._id === commentId ? { ...c, content: updated.content } : c,
      ),
    );
  };

  // ── Loading / error states ──────────────────────────────────────────────────

  if (postLoading) {
    return (
      <div className="container py-4" style={{ maxWidth: 760 }}>
        <div className="placeholder-glow">
          <div
            className="placeholder w-100 rounded mb-3"
            style={{ height: 380 }}
          />
          <div className="placeholder col-8 mb-2" style={{ height: 28 }} />
          <div className="placeholder col-12 mb-1" />
          <div className="placeholder col-10" />
        </div>
      </div>
    );
  }

  if (postError || !post) {
    return (
      <div className="container py-4" style={{ maxWidth: 760 }}>
        <div className="alert alert-danger">
          {postError ?? "Post not found."}
        </div>
        <button
          className="btn btn-outline-secondary"
          onClick={() => navigate(-1)}
        >
          Go back
        </button>
      </div>
    );
  }

  const sender = asUser(post.sender);
  const senderId = asId(post.sender);
  const isOwner = user?._id === senderId;

  return (
    <div className="container py-4" style={{ maxWidth: 760 }}>
      {/* Cover image */}
      {post.image && (
        <img
          src={resolveMediaUrl(post.image)}
          alt={post.title}
          className="img-fluid rounded-3 w-100 mb-4"
          style={{ maxHeight: 480, objectFit: "cover" }}
        />
      )}

      {/* Author row + owner actions */}
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <Link
          to={`/profile/${senderId}`}
          className="d-flex align-items-center gap-2 text-decoration-none text-dark"
        >
          <Avatar
            src={sender?.profilePicture}
            username={sender?.username || "User"}
            size={42}
          />
          <div>
            <div className="fw-semibold">{sender?.username || "Unknown"}</div>
            <div className="text-muted" style={{ fontSize: "0.78rem" }}>
              {post.createdAt ? formatTimeAgo(post.createdAt) : ""}
            </div>
          </div>
        </Link>

        {isOwner && (
          <div className="d-flex gap-2">
            <Link
              to={`/post/${post._id}/edit`}
              className="btn btn-outline-secondary btn-sm"
            >
              Edit
            </Link>
            <button
              className="btn btn-outline-danger btn-sm"
              onClick={handleDelete}
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Title & content */}
      <h1 className="fw-bold mb-3">{post.title}</h1>
      <p className="fs-6 lh-lg" style={{ whiteSpace: "pre-wrap" }}>
        {post.content}
      </p>

      {/* Like + comment counts */}
      <div className="d-flex align-items-center gap-4 py-3 border-top border-bottom mb-4">
        <button
          className={`btn btn-sm p-0 border-0 d-flex align-items-center gap-2 ${isLiked ? "text-danger" : "text-muted"}`}
          onClick={handleLike}
          disabled={!user || isLiking}
          aria-label={isLiked ? "Unlike" : "Like"}
        >
          {isLiked ? <FaHeart size={20} /> : <FaRegHeart size={20} />}
          <span className="fw-semibold">{likesCount}</span>
        </button>
        <span className="d-flex align-items-center gap-2 text-muted">
          <FaComment size={18} />
          <span className="fw-semibold">{comments.length}</span>
        </span>
      </div>

      {/* ── Comments section ── */}
      <h5 className="fw-bold mb-3">Comments</h5>

      {commentsLoading ? (
        <div className="text-center py-3">
          <div
            className="spinner-border spinner-border-sm text-secondary"
            role="status"
          />
        </div>
      ) : comments.length === 0 ? (
        <p className="text-muted small">No comments yet. Be the first!</p>
      ) : (
        <div className="mb-4">
          {comments.map((c) => (
            <CommentItem
              key={c._id}
              comment={c}
              currentUserId={user?._id}
              onDelete={handleCommentDelete}
              onEdit={handleCommentEdit}
            />
          ))}
        </div>
      )}

      {/* Add comment form */}
      {user ? (
        <form
          onSubmit={handleCommentSubmit(onCommentSubmit)}
          className="mt-3"
          noValidate
        >
          <div className="d-flex gap-3">
            <Avatar
              src={user.profilePicture}
              username={user.username}
              size={36}
              className="flex-shrink-0"
            />
            <div className="flex-grow-1">
              <textarea
                className={`form-control mb-1 ${commentErrors.content ? "is-invalid" : ""}`}
                rows={2}
                placeholder="Add a comment…"
                {...registerComment("content")}
              />
              {commentErrors.content && (
                <div className="invalid-feedback d-block mb-1">
                  {commentErrors.content.message}
                </div>
              )}
              {commentError && (
                <div className="text-danger small mb-2">{commentError}</div>
              )}
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={submittingComment}
              >
                {submittingComment ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-1" />
                    Posting…
                  </>
                ) : (
                  "Post comment"
                )}
              </button>
            </div>
          </div>
        </form>
      ) : (
        <p className="text-muted small mt-3">
          <Link to="/login">Log in</Link> to leave a comment.
        </p>
      )}
    </div>
  );
}

export default PostDetailPage;
