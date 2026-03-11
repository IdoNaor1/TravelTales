import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Row, Col, Card, Button, Spinner } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import userService from '../services/userService';
import postsService from '../services/postsService';
import PostCard from '../components/PostCard';
import EditProfileModal from '../components/EditProfileModal';
import type { IUser, IPost } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function getAvatarSrc(pic: string): string {
  if (pic.startsWith('/')) return `${API_URL}${pic}`;
  return pic;
}

export default function ProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { user: currentUser } = useAuth();
  const isOwnProfile = currentUser?._id === userId;

  const [profileUser, setProfileUser] = useState<IUser | null>(null);
  const [posts, setPosts] = useState<IPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);
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
      .catch(() => setError('Failed to load profile.'))
      .finally(() => setIsLoading(false));
  }, [userId, isOwnProfile, currentUser]);

  if (isLoading) {
    return (
      <div className="container mt-5 text-center">
        <Spinner animation="border" />
      </div>
    );
  }

  if (error || !profileUser) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger">{error ?? 'User not found.'}</div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <Row className="justify-content-center">
        <Col lg={8}>
          <Card className="mb-4 shadow-sm">
            <Card.Body className="text-center py-4">
              {profileUser.profilePicture && !imgError ? (
                <img
                  src={getAvatarSrc(profileUser.profilePicture)}
                  alt={profileUser.username}
                  width={120}
                  height={120}
                  className="rounded-circle object-fit-cover mb-3"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div
                  className="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center fw-bold mx-auto mb-3"
                  style={{ width: 120, height: 120, fontSize: 48 }}
                >
                  {profileUser.username.charAt(0).toUpperCase()}
                </div>
              )}
              <h3 className="mb-1">{profileUser.username}</h3>
              <p className="text-muted mb-3">{profileUser.email}</p>
              {isOwnProfile && (
                <Button variant="outline-primary" size="sm" onClick={() => setShowEditModal(true)}>
                  Edit Profile
                </Button>
              )}
            </Card.Body>
          </Card>

          {isOwnProfile && currentUser && (
            <EditProfileModal
              show={showEditModal}
              onHide={() => setShowEditModal(false)}
              user={currentUser}
            />
          )}

          <h5 className="mb-3">Posts by {profileUser.username}</h5>
          {posts.length === 0 ? (
            <p className="text-muted">No posts yet.</p>
          ) : (
            posts.map((post) => (
              <PostCard key={post._id} post={post} currentUserId={currentUser?._id} />
            ))
          )}
        </Col>
      </Row>
    </div>
  );
}
