import { useRef, useState } from 'react';
import { FaTrash } from 'react-icons/fa';
import { Modal, Button } from 'react-bootstrap';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/apiClient';
import userService from '../services/userService';
import type { IUser } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function getAvatarSrc(pic: string): string {
  if (pic.startsWith('/')) return `${API_URL}${pic}`;
  return pic;
}

const schema = z.object({
  username: z.string().min(2, 'Username must be at least 2 characters'),
});

type FormData = z.infer<typeof schema>;

interface EditProfileModalProps {
  show: boolean;
  onHide: () => void;
  user: IUser;
}

export default function EditProfileModal({ show, onHide, user }: EditProfileModalProps) {
  const { refreshUser } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { username: user.username },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setRemovePhoto(false);
  };

  const handleRemovePhoto = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setRemovePhoto(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const hasPhoto = !removePhoto && (selectedFile != null || (!!user.profilePicture && !imgError));
  const currentAvatarSrc = selectedFile
    ? previewUrl
    : !removePhoto && user.profilePicture && !imgError
      ? getAvatarSrc(user.profilePicture)
      : null;

  const onSubmit = async (data: FormData) => {
    setApiError(null);
    try {
      let profilePicture: string | undefined;

      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        const { url } = await apiClient.upload<{ url: string }>('/file', formData);
        profilePicture = url;
      } else if (removePhoto) {
        profilePicture = '';
      }

      await userService.updateUser(user._id, {
        username: data.username,
        ...(profilePicture !== undefined && { profilePicture }),
      });
      await refreshUser();
      onHide();
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Update failed. Please try again.');
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setRemovePhoto(false);
    setImgError(false);
    setApiError(null);
    onHide();
  };

  return (
    <Modal show={show} onHide={handleClose} centered>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Modal.Header closeButton>
          <Modal.Title>Edit Profile</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {apiError && (
            <div className="alert alert-danger" role="alert">
              {apiError}
            </div>
          )}

          {/* Avatar picker */}
          <div className="text-center mb-4">
            <div style={{ display: 'inline-block', position: 'relative' }}>
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{ cursor: 'pointer' }}
                title="Click to change photo"
              >
                {currentAvatarSrc ? (
                  <img
                    src={currentAvatarSrc}
                    alt="Profile"
                    className="rounded-circle"
                    style={{ width: 96, height: 96, objectFit: 'cover', border: '2px solid #dee2e6' }}
                    onError={() => setImgError(true)}
                  />
                ) : (
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center bg-secondary text-white fw-bold"
                    style={{ width: 96, height: 96, fontSize: 36 }}
                  >
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              {hasPhoto && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  title="Remove photo"
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    border: 'none',
                    background: '#dc3545',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  <FaTrash size={11} />
                </button>
              )}
            </div>
            <div className="text-muted mt-1" style={{ fontSize: 12 }}>
              {hasPhoto ? 'Click to change' : 'Add photo'}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </div>

          <div className="mb-3">
            <label htmlFor="edit-username" className="form-label">Username</label>
            <input
              id="edit-username"
              type="text"
              className={`form-control ${errors.username ? 'is-invalid' : ''}`}
              {...register('username')}
            />
            {errors.username && (
              <div className="invalid-feedback">{errors.username.message}</div>
            )}
          </div>

        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}
