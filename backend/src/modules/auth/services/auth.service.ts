import { UserRole } from '@prisma/client';
import { prisma } from '../../../core/prisma';
import { ApiError } from '../../../core/errors';
import { hashPassword, signToken, verifyPassword } from '../../../core/security';

/** Usuario publico expuesto por la API (nunca incluye password_hash). */
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

/**
 * U2.5 - Login por username + contrasena (DEC-2). Responde token + usuario.
 */
export async function loginByUsername(
  username: string,
  password: string,
): Promise<{ token: string; user: PublicUser }> {
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Credenciales invalidas');
  }
  if (!user.isActive) {
    throw new ApiError(403, 'FORBIDDEN', 'Usuario deshabilitado');
  }
  const token = signToken({ sub: user.id.toString(), role: user.role });
  return { token, user: toPublicUser(user) };
}

/**
 * U2.8 / DEC-6 - Cambio de contrasena (actual + nueva). Valida la actual,
 * actualiza el hash y limpia el flag must_change_password.
 */
export async function changePassword(
  userId: bigint,
  currentPassword: string,
  newPassword: string,
): Promise<PublicUser> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Usuario inexistente');
  }
  const ok = await verifyPassword(currentPassword, user.passwordHash);
  if (!ok) {
    throw new ApiError(400, 'BAD_REQUEST', 'La contrasena actual es incorrecta');
  }
  const passwordHash = await hashPassword(newPassword);
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, mustChangePassword: false },
  });
  return toPublicUser(updated);
}
