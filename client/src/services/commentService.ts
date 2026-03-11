import apiClient from "./apiClient";
import type { IComment } from "../types";

const commentService = {
  getByPost(postId: string): Promise<IComment[]> {
    return apiClient.get<IComment[]>(`/comments?postId=${postId}`);
  },

  create(postId: string, content: string): Promise<IComment> {
    return apiClient.post<IComment>("/comments", { postId, content });
  },

  update(id: string, content: string): Promise<IComment> {
    return apiClient.put<IComment>(`/comments/${id}`, { content });
  },

  remove(id: string): Promise<void> {
    return apiClient.delete<void>(`/comments/${id}`);
  },
};

export default commentService;
