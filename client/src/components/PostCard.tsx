import { useState } from 'react';
import { Card, Button } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { FaHeart, FaRegHeart, FaComment } from 'react-icons/fa';
import type { IPost } from '../types';
import postsService from '../services/postsService';

interface PostCardProps {
  post: IPost;
  currentUserId?: string;
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function PostCard({ post, currentUserId }: PostCardProps) {
  const navigate = useNavigate();
  const [liked, setLiked] = useState(() => post.likes.includes(currentUserId ?? ''));
  const [likeCount, setLikeCount] = useState(post.likes.length);
  const [isLiking, setIsLiking] = useState(false);

  const { sender } = post;

  const handleLike = async () => {
    if (!currentUserId) {
      navigate('/login');
      return;
    }
    if (isLiking) return;

    setIsLiking(true);
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount((c) => (wasLiked ? c - 1 : c + 1));

    try {
      const res = await postsService.toggleLike(post._id);
      setLiked(res.isLikedByUser);
      setLikeCount(res.likesCount);
    } catch {
      setLiked(wasLiked);
      setLikeCount((c) => (wasLiked ? c + 1 : c - 1));
    } finally {
      setIsLiking(false);
    }
  };

  const contentPreview =
    post.content.length > 150 ? post.content.slice(0, 150) + '…' : post.content;

  return (
    <Card className="mb-3 shadow-sm">
      <Card.Header className="bg-white border-0 d-flex align-items-center gap-2 pb-0">
        <Link
          to={`/profile/${sender._id}`}
          className="d-flex align-items-center gap-2 text-decoration-none text-dark"
        >
          {sender.profilePicture ? (
            <img
              src={sender.profilePicture}
              alt={sender.username}
              width={36}
              height={36}
              className="rounded-circle object-fit-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
                (e.currentTarget.nextElementSibling as HTMLElement | null)?.style.setProperty('display', 'flex');
              }}
            />
          ) : null}
          <span
            className="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center fw-bold"
            style={{
              width: 36,
              height: 36,
              fontSize: 14,
              display: sender.profilePicture ? 'none' : 'flex',
              flexShrink: 0,
            }}
          >
            {sender.username.charAt(0).toUpperCase()}
          </span>
          <strong>{sender.username}</strong>
        </Link>
        <small className="text-muted ms-auto">{formatRelativeTime(post.createdAt)}</small>
      </Card.Header>

      {post.image && (
        <Card.Img
          variant="top"
          src={post.image}
          alt={post.title}
          className="mt-2"
          style={{ maxHeight: 400, objectFit: 'cover' }}
        />
      )}

      <Card.Body>
        <Card.Title>{post.title}</Card.Title>
        <Card.Text className="text-muted">{contentPreview}</Card.Text>
      </Card.Body>

      <Card.Footer className="bg-light d-flex align-items-center gap-3">
        <Button
          variant="link"
          className="p-0 text-decoration-none d-flex align-items-center gap-1"
          style={{ color: liked ? '#dc3545' : '#6c757d' }}
          onClick={handleLike}
          disabled={isLiking}
          aria-label={liked ? 'Unlike post' : 'Like post'}
        >
          {liked ? <FaHeart /> : <FaRegHeart />}
          <span>{likeCount}</span>
        </Button>
        <span className="d-flex align-items-center gap-1 text-muted">
          <FaComment />
          <span>0</span>
        </span>
      </Card.Footer>
    </Card>
  );
}
