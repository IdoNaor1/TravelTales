import apiClient from "./apiClient";

export interface IAISource {
  postId: string;
  title: string;
}

export interface IAIResponse {
  answer: string;
  sources: IAISource[];
}

const aiService = {
  ask(question: string): Promise<IAIResponse> {
    return apiClient.post<IAIResponse>("/ai/ask", { question });
  },
};

export default aiService;
