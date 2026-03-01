/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import apiClient from '../services/apiClient';
import type { IUser, IAuthResponse, IRegisterRequest } from '../types';

interface AuthContextType {
  user: IUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: IRegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

async function fetchUser(): Promise<IUser> {
  return apiClient.get<IUser>('/users/me');
}

async function storeTokensAndFetchUser(authRes: IAuthResponse): Promise<IUser> {
  localStorage.setItem('accessToken', authRes.token);
  localStorage.setItem('refreshToken', authRes.refreshToken);
  return fetchUser();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<IUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount: validate existing tokens
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setIsLoading(false);
      return;
    }

    fetchUser()
      .then(setUser)
      .catch(() => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const authRes = await apiClient.post<IAuthResponse>('/auth/login', { email, password });
    const fullUser = await storeTokensAndFetchUser(authRes);
    setUser(fullUser);
  }, []);

  const register = useCallback(async (data: IRegisterRequest) => {
    const authRes = await apiClient.post<IAuthResponse>('/auth/register', data);
    const fullUser = await storeTokensAndFetchUser(authRes);
    setUser(fullUser);
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    try {
      if (refreshToken) {
        await apiClient.post('/auth/logout', { refreshToken });
      }
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
