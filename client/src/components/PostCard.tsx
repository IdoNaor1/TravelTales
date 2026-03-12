import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FaHeart, FaRegHeart, FaComment } from "react-icons/fa";
import type { IPost, IUser } from "../types";
import postService from "../services/postService";
import { resolveMediaUrl } from "../services/fileService";
import Avatar from "./Avatar";

interface PostCardProps {
  post: IPost;
  currentUserId?: string;
}

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

export default function PostCard({ post, currentUserId }: PostCardProps) {
  const navigate = useNavigate();
  const sender =
    typeof post.sender === "object" ? (post.sender as IUser) : null;
  const senderId =
    typeof post.sender === "string" ? post.sender : (post.sender as IUser)._id;

  const [likesCount, setLikesCount] = useState(post.likes?.length ?? 0);
  const [isLiked, setIsLiked] = useState(
    currentUserId ? (post.likes ?? []).includes(currentUserId) : false,
  );
  const [isLiking, setIsLiking] = useState(false);

  const handleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentUserId) {
      navigate("/login");
      return;
    }
    if (isLiking) return;

    // Optimistic update
    const prevLiked = isLiked;
    const prevCount = likesCount;
    setIsLiked(!prevLiked);
    setLikesCount(prevLiked ? prevCount - 1 : prevCount + 1);
    setIsLiking(true);

    try {
      const result = await postService.toggleLike(post._id);
      setLikesCount(result.likesCount);
      setIsLiked(result.isLikedByUser);
    } catch {
      // Revert on error
      setIsLiked(prevLiked);
      setLikesCount(prevCount);
    } finally {
      setIsLiking(false);
    }
  };

  const contentPreview =
    post.content.length > 150 ? post.content.slice(0, 150) + "…" : post.content;

  return (
    <div className="card shadow-sm border-0 post-card">
      {post.image && (
        <Link to={`/post/${post._id}`} tabIndex={-1}>
          <img
            src={resolveMediaUrl(post.image)}
            className="card-img-top"
            alt={post.title}
            style={{ height: 200, objectFit: "cover" }}
          />
        </Link>
      )}

      <div className="card-body d-flex flex-column p-3">
        {/* Author row */}
        <div className="d-flex align-items-center mb-2">
          <Link
            to={`/profile/${senderId}`}
            className="d-flex align-items-center text-decoration-none text-dark"
          >
            <Avatar
              src={sender?.profilePicture}
              username={sender?.username || "User"}
              size={32}
              className="me-2"
            />
            <span className="fw-semibold small">
              {sender?.username || "Unknown"}
            </span>
          </Link>
          <span className="text-muted small ms-auto">
            {post.createdAt ? formatTimeAgo(post.createdAt) : ""}
          </span>
        </div>

        {/* Title & content preview */}
        <Link
          to={`/post/${post._id}`}
          className="text-decoration-none text-dark flex-grow-1"
        >
          <h6 className="card-title fw-bold mb-1">{post.title}</h6>
          <p className="card-text text-muted small mb-0">{contentPreview}</p>
        </Link>

        {/* Like & comment footer */}
        <div className="d-flex align-items-center gap-3 pt-2 mt-2 border-top">
          <button
            className={`btn btn-sm p-0 border-0 d-flex align-items-center gap-1 ${isLiked ? "text-danger" : "text-muted"}`}
            onClick={handleLike}
            disabled={isLiking}
            aria-label={isLiked ? "Unlike post" : "Like post"}
          >
            {isLiked ? <FaHeart /> : <FaRegHeart />}
            <span className="small">{likesCount}</span>
          </button>

          <Link
            to={`/post/${post._id}`}
            className="d-flex align-items-center gap-1 text-muted text-decoration-none small"
          >
            <FaComment />
            <span>{post.commentCount ?? 0}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
