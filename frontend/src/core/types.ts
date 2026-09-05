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

/** Formula optica de un ojo (espejo de la proyeccion de detalle del backend). */
export interface EyeData {
  sphere: number | null;
  cylinder: number | null;
  axis: number | null;
  addition: number | null;
  dnp: number | null;
  height: number | null;
  productCode: string | null;
}

export interface MountData {
  type: string | null;
  brand: string | null;
  model: string | null;
  color: string | null;
}

export interface ColorationData {
  color: string | null;
  unicolor: boolean;
  degradadoPercent: number | null;
}

export interface OrderDetail extends OrderListItem {
  externalId: string;
  od: EyeData;
  oi: EyeData;
  treatment: string | null;
  mount: MountData;
  coloration: ColorationData;
  observations: string | null;
}

export interface DashboardData {
  ordersByMonth: { month: string; total: number }[];
  topClients: { company: string; total: number }[];
  statusSummary: { pendiente: number; sincronizadas: number; total: number };
}
