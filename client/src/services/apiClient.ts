const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

let isRefreshing = false;
let refreshQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: Error | null) => {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(undefined);
    }
  });
  refreshQueue = [];
};

async function refreshAccessToken(): Promise<void> {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  const res = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    throw new Error('Token refresh failed');
  }

  const data = await res.json();
  localStorage.setItem('accessToken', data.token);
  localStorage.setItem('refreshToken', data.refreshToken);
}

async function handleUnauthorized<T>(
  url: string,
  options: RequestInit,
): Promise<T> {
  if (isRefreshing) {
    // Another refresh is in-flight — wait for it to complete
    return new Promise<T>((resolve, reject) => {
      refreshQueue.push({
        resolve: () => resolve(request<T>(url, options, true)),
        reject,
      });
    });
  }

  isRefreshing = true;

  try {
    await refreshAccessToken();
    processQueue(null);
    return await request<T>(url, options, true);
  } catch (error) {
    processQueue(error as Error);
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw error;
  } finally {
    isRefreshing = false;
  }
}

async function request<T>(
  url: string,
  options: RequestInit = {},
  isRetry = false,
): Promise<T> {
  const token = localStorage.getItem('accessToken');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers,
  });

  if (res.status === 401 && !isRetry && !url.startsWith('/auth/')) {
    return handleUnauthorized<T>(url, options);
  }

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw Object.assign(new Error(errorBody.message || res.statusText), {
      status: res.status,
      body: errorBody,
    });
  }

  return res.json();
}

const apiClient = {
  get<T>(url: string): Promise<T> {
    return request<T>(url, { method: 'GET' });
  },

  post<T>(url: string, body?: unknown): Promise<T> {
    return request<T>(url, {
      method: 'POST',
      body: body != null ? JSON.stringify(body) : undefined,
    });
  },

  put<T>(url: string, body?: unknown): Promise<T> {
    return request<T>(url, {
      method: 'PUT',
      body: body != null ? JSON.stringify(body) : undefined,
    });
  },

  delete<T>(url: string): Promise<T> {
    return request<T>(url, { method: 'DELETE' });
  },
};

export default apiClient;
