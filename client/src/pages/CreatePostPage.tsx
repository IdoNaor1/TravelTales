import { useNavigate } from "react-router-dom";
import PostForm from "../components/PostForm";
import type { IPost } from "../types";

function CreatePostPage() {
  const navigate = useNavigate();

  const handleSuccess = (post: IPost) => {
    navigate(`/post/${post._id}`);
  };

  return (
    <div className="container py-4" style={{ maxWidth: 720 }}>
      <h2 className="fw-bold mb-1">Share Your Journey</h2>
      <p className="text-muted mb-4">
        Tell the community about your travel experience
      </p>
      <PostForm onSuccess={handleSuccess} />
    </div>
  );
}

export default CreatePostPage;
