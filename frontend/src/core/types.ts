/** Roles y tipos compartidos del frontend (espejo de la BD). */

export type Role = 'CLIENTE_EXTERNO' | 'LABORATORIO' | 'ADMINISTRADOR';

export interface AuthUser {
  id: string;
  username: string;
  email: string | null;
  phone?: string | null;
  address?: string | null;
  role: Role;
  companyName: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export interface OrderListItem {
  id: string;
  orderNumber: string;
  company: string;
  patient: string;
  createdAt: string;
  summary: string;
  syncStatus?: 'PENDIENTE' | 'SINCRONIZADA';
  syncedAt?: string | null;
  pendingSinceMinutes?: number | null;
}

export interface OrderDetail extends OrderListItem {
  externalId: string;
  od: Record<string, string | number | null>;
  oi: Record<string, string | number | null>;
  treatment: string | null;
  mount: Record<string, string | null>;
  coloration: Record<string, unknown>;
  observations: string | null;
}

export interface DashboardData {
  ordersByMonth: { month: string; total: number }[];
  topClients: { company: string; total: number }[];
  statusSummary: { pendiente: number; sincronizadas: number; total: number };
}
