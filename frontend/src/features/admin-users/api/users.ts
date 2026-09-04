import { http } from '../../../core/http';
import type { AuthUser } from '../../../core/types';

/** API de gestion de usuarios (feature admin-users). */

export interface UsersList {
  data: AuthUser[];
  total: number;
}

export const usersApi = {
  list: (params?: Record<string, string>) => {
    const qs = params ? `?${new URLSearchParams(params).toString()}` : '';
    return http.get<UsersList>(`/users${qs}`);
  },
  create: (input: Record<string, unknown>) => http.post<AuthUser>('/users', input),
  setStatus: (id: string, isActive: boolean) =>
    http.patch<AuthUser>(`/users/${id}/status`, { isActive }),
  resetPassword: (id: string, newPassword: string) =>
    http.post<{ user: AuthUser }>(`/users/${id}/reset-password`, { newPassword }),
};
