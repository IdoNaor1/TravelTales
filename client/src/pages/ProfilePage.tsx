import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "react-bootstrap";
import { useAuth } from "../context/AuthContext";
import userService from "../services/userService";
import postsService from "../services/postsService";
import PostCard from "../components/PostCard";
import EditProfileModal from "../components/EditProfileModal";
import Avatar from "../components/Avatar";
import type { IUser, IPost } from "../types";

export default function ProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { user: currentUser } = useAuth();
  const isOwnProfile = currentUser?._id === userId;

  const [profileUser, setProfileUser] = useState<IUser | null>(null);
  const [posts, setPosts] = useState<IPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    if (!userId) return;
    setIsLoading(true);
    setError(null);

    const userPromise =
      isOwnProfile && currentUser
        ? Promise.resolve(currentUser)
        : userService.getUserById(userId);

    Promise.all([userPromise, postsService.getPosts({ sender: userId })])
      .then(([user, { posts: userPosts }]) => {
        setProfileUser(user);
        setPosts(userPosts);
      })
      .catch(() => setError("Failed to load profile."))
      .finally(() => setIsLoading(false));
  }, [userId, isOwnProfile, currentUser]);

  if (isLoading) {
    return (
      <div className="container py-4" style={{ maxWidth: 920 }}>
        <div className="card border-0 shadow-sm mb-4 placeholder-glow">
          <div className="card-body p-4 text-center">
            <div
              className="placeholder rounded-circle mb-3 mx-auto"
              style={{ width: 120, height: 120 }}
            />
            <p className="placeholder col-4 mx-auto mb-2" />
            <p className="placeholder col-5 mx-auto mb-3" />
            <p className="placeholder col-3 mx-auto" />
          </div>
        </div>
        <div className="row g-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div className="col-12 col-md-6 col-lg-4" key={i}>
              <div
                className="card border-0 shadow-sm placeholder-glow"
                style={{ height: 260 }}
              >
                <div className="placeholder w-100" style={{ height: 150 }} />
                <div className="card-body">
                  <p className="placeholder col-8" />
                  <p className="placeholder col-12" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !profileUser) {
    return (
      <div className="container py-4" style={{ maxWidth: 920 }}>
        <div className="alert alert-danger">{error ?? "User not found."}</div>
      </div>
    );
  }

  return (
    <div className="container py-4" style={{ maxWidth: 920 }}>
      <div className="card mb-4 shadow-sm border-0">
        <div className="card-body text-center py-4">
          <Avatar
            src={profileUser.profilePicture}
            username={profileUser.username}
            size={120}
            className="mb-3 mx-auto"
          />
          <h3 className="mb-1">{profileUser.username}</h3>
          <p className="text-muted mb-3">{profileUser.email}</p>
          {isOwnProfile && (
            <Button
              variant="outline-primary"
              size="sm"
              onClick={() => setShowEditModal(true)}
            >
              Edit Profile
            </Button>
          )}
        </div>
      </div>

      {isOwnProfile && currentUser && (
        <EditProfileModal
          show={showEditModal}
          onHide={() => setShowEditModal(false)}
          user={currentUser}
        />
      )}

      <div className="travel-page-header">
        <h5 className="mb-0">Posts by {profileUser.username}</h5>
      </div>

      {posts.length === 0 ? (
        <div className="empty-state text-center text-muted">
          <p className="fs-5 mb-1">No travel stories yet</p>
          <p className="mb-0">New posts from this user will appear here.</p>
        </div>
      ) : (
        <div className="row g-3">
          {posts.map((post) => (
            <div key={post._id} className="col-12 col-md-6 col-lg-4">
              <PostCard post={post} currentUserId={currentUser?._id} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
