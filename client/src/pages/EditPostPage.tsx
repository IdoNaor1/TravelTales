import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PostForm from "../components/PostForm";
import postService from "../services/postService";
import type { IPost } from "../types";

function EditPostPage() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<IPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!postId) return;
    postService
      .getPostById(postId)
      .then(setPost)
      .catch(() =>
        setError("Post not found or you do not have permission to edit it."),
      )
      .finally(() => setIsLoading(false));
  }, [postId]);

  const handleSuccess = (updated: IPost) => {
    navigate(`/post/${updated._id}`);
  };

  if (isLoading) {
    return (
      <div className="container py-4" style={{ maxWidth: 720 }}>
        <div className="placeholder-glow">
          <h2 className="placeholder col-4 mb-4" />
          <div className="placeholder col-12 mb-3" style={{ height: 42 }} />
          <div className="placeholder col-12" style={{ height: 160 }} />
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="container py-4" style={{ maxWidth: 720 }}>
        <div className="alert alert-danger">{error ?? "Post not found."}</div>
        <button
          className="btn btn-outline-secondary"
          onClick={() => navigate(-1)}
        >
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="container py-4" style={{ maxWidth: 720 }}>
      <h2 className="fw-bold mb-1">Edit Post</h2>
      <p className="text-muted mb-4">Update your travel story</p>
      <PostForm initialPost={post} onSuccess={handleSuccess} />
    </div>
  );
}

export default EditPostPage;
