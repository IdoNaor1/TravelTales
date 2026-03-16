import apiClient from "./apiClient";

const BASE_URL = import.meta.env.PROD
  ? ""
  : import.meta.env.VITE_API_URL || "http://localhost:3000";
export interface IUploadResponse {
  url: string;
}

/**
 * Converts a server-relative path like "/public/foo.jpg" into a full URL.
 * Absolute URLs (http/https) are returned unchanged.
 */
export function resolveMediaUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${BASE_URL}${url}`;
}

export async function uploadFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const data = await apiClient.postForm<IUploadResponse>("/file", formData);
  return data.url;
}
