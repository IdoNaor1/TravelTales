import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Row, Col, Card, Button, Spinner } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import userService from '../services/userService';
import postsService from '../services/postsService';
import PostCard from '../components/PostCard';
import EditProfileModal from '../components/EditProfileModal';
import Avatar from '../components/Avatar';
import type { IUser, IPost } from '../types';

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
              <Avatar
                src={profileUser.profilePicture}
                username={profileUser.username}
                size={120}
                className="mb-3 mx-auto"
              />
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
