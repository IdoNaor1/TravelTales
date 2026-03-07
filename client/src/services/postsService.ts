import apiClient from './apiClient';
import type { IPost, ILikeResponse } from '../types';

const getPosts = (params?: { sender?: string; limit?: number; cursor?: string }) => {
  const query = new URLSearchParams();
  if (params?.sender) query.set('sender', params.sender);
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.cursor) query.set('cursor', params.cursor);
  const qs = query.toString();
  return apiClient.get<{ posts: IPost[]; nextCursor: string | null }>(`/posts${qs ? `?${qs}` : ''}`);
};

const getPostById = (id: string) =>
  apiClient.get<IPost>(`/posts/${id}`);

const toggleLike = (postId: string) =>
  apiClient.post<ILikeResponse>(`/posts/${postId}/like`);

export default { getPosts, getPostById, toggleLike };
