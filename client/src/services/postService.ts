import apiClient from "./apiClient";
import type { IPost } from "../types";

export interface IPostsPage {
  posts: IPost[];
  nextCursor: string | null;
}

export interface ILikeResponse {
  likesCount: number;
  isLikedByUser: boolean;
}

const postService = {
  getPosts(cursor?: string, limit = 10): Promise<IPostsPage> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (cursor) params.set("cursor", cursor);
    return apiClient.get<IPostsPage>(`/posts?${params.toString()}`);
  },

  getPostById(id: string): Promise<IPost> {
    return apiClient.get<IPost>(`/posts/${id}`);
  },

  getPostsBySender(
    senderId: string,
    cursor?: string,
    limit = 10,
  ): Promise<IPostsPage> {
    const params = new URLSearchParams({
      sender: senderId,
      limit: String(limit),
    });
    if (cursor) params.set("cursor", cursor);
    return apiClient.get<IPostsPage>(`/posts?${params.toString()}`);
  },

  createPost(data: {
    title: string;
    content: string;
    image?: string;
  }): Promise<IPost> {
    return apiClient.post<IPost>("/posts", data);
  },

  updatePost(
    id: string,
    data: { title?: string; content?: string; image?: string },
  ): Promise<IPost> {
    return apiClient.put<IPost>(`/posts/${id}`, data);
  },

  deletePost(id: string): Promise<void> {
    return apiClient.delete<void>(`/posts/${id}`);
  },

  toggleLike(id: string): Promise<ILikeResponse> {
    return apiClient.post<ILikeResponse>(`/posts/${id}/like`);
  },
};

export default postService;
