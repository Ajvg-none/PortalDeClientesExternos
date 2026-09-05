import { http } from '../../../core/http';
import type { AuthUser } from '../../../core/types';

/** API de gestion de usuarios (feature admin-users). */

export interface UsersList {
  data: AuthUser[];
  total: number;
}

export type UserInput = {
  username: string;
  password?: string;
  role: AuthUser['role'];
  companyName?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
};

export const usersApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? `?${new URLSearchParams(params).toString()}` : '';
    return http.get<UsersList>(`/users${qs}`);
  },
  get: (id: string) => http.get<AuthUser>(`/users/${id}`),
  create: (input: UserInput) => http.post<AuthUser>('/users', input),
  update: (id: string, input: Partial<UserInput>) => http.patch<AuthUser>(`/users/${id}`, input),
  setStatus: (id: string, isActive: boolean) =>
    http.patch<AuthUser>(`/users/${id}/status`, { isActive }),
  resetPassword: (id: string, newPassword: string) =>
    http.post<{ user: AuthUser }>(`/users/${id}/reset-password`, { newPassword }),
};
