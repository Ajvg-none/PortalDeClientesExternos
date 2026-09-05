import { prisma } from '../../../core/prisma';
import { ApiError } from '../../../core/errors';
import { hashPassword, signToken, verifyPassword } from '../../../core/security';
import { toPublicUser, type PublicUser } from '../../../core/user-projection';

export type { PublicUser } from '../../../core/user-projection';

/**
 * U2.5 - Login por username + contrasena (DEC-2). Responde token + usuario.
 * REM-2026-09/R2.4: si el usuario no existe se ejecuta igualmente una
 * comparacion bcrypt contra un hash dummy para no filtrar por timing si una
 * cuenta existe o no; en ambos casos la respuesta es el mismo 401 generico.
 */
const DUMMY_HASH =
  '$2a$10$w0l3wDwqNqTIsEh/Y28SYuZuVBWG3uGTUA4tn3guMvSKXVgNU3x0a';

export async function loginByUsername(
  username: string,
  password: string,
): Promise<{ token: string; user: PublicUser }> {
  const user = await prisma.user.findUnique({ where: { username } });
  const hashToCheck = user?.passwordHash ?? DUMMY_HASH;
  const ok = await verifyPassword(password, hashToCheck);
  if (!user || !ok) {
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
