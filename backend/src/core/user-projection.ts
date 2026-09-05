import type { UserRole } from '@prisma/client';

/**
 * Proyeccion publica de un usuario (REM-2026-09/R4). Vive en core para que
 * auth y users compartan la misma proyeccion sin que un modulo de negocio
 * importe servicios internos de otro (ARQ-1). Nunca incluye password_hash.
 */
export interface PublicUser {
  id: string;
  username: string;
  email: string | null;
  role: UserRole;
  companyName: string | null;
  phone: string | null;
  address: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: Date;
}

export function toPublicUser(user: {
  id: bigint;
  username: string;
  email: string | null;
  role: UserRole;
  companyName: string | null;
  phone: string | null;
  address: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: Date;
}): PublicUser {
  return {
    id: user.id.toString(),
    username: user.username,
    email: user.email,
    role: user.role,
    companyName: user.companyName,
    phone: user.phone,
    address: user.address,
    isActive: user.isActive,
    mustChangePassword: user.mustChangePassword,
    createdAt: user.createdAt,
  };
}
