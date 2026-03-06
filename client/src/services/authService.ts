import apiClient from './apiClient';
import type { IAuthResponse, ILoginRequest, IRegisterRequest, ITokenRefreshResponse } from '../types';

export const authService = {
  register: (data: IRegisterRequest) =>
    apiClient.post<IAuthResponse>('/auth/register', data),

  login: (data: ILoginRequest) =>
    apiClient.post<IAuthResponse>('/auth/login', data),

  googleLogin: (credential: string) =>
    apiClient.post<IAuthResponse>('/auth/google', { credential }),

  refresh: (refreshToken: string) =>
    apiClient.post<ITokenRefreshResponse>('/auth/refresh', { refreshToken }),

  logout: (refreshToken: string) =>
    apiClient.post<void>('/auth/logout', { refreshToken }),
};
