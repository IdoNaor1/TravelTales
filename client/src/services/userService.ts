import apiClient from './apiClient';
import type { IUser } from '../types';

const getUserById = (id: string) =>
  apiClient.get<IUser>(`/users/${id}`);

const updateUser = (id: string, data: { username?: string; email?: string; profilePicture?: string }) =>
  apiClient.put<IUser>(`/users/${id}`, data);

export default { getUserById, updateUser };
