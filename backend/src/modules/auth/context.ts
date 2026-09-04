import type { UserRole } from '@prisma/client';

/**
 * Contexto de autenticacion inyectado en cada request autenticado
 * (auth/authenticate). Los roles e is_active se releen de BD por request.
 */
export interface AuthContext {
  userId: bigint;
  role: UserRole;
  mustChangePassword: boolean;
}

/** Rows minimas que necesita el authenticator desde la BD. */
export interface AuthUserRow {
  id: bigint;
  role: UserRole;
  isActive: boolean;
  mustChangePassword: boolean;
}
