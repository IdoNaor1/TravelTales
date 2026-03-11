import apiClient from "./apiClient";

export interface IUploadResponse {
  url: string;
}

export async function uploadFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const data = await apiClient.postForm<IUploadResponse>("/file", formData);
  return data.url;
}
