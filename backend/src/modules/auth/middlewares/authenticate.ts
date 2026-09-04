import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { prisma } from '../../../core/prisma';
import { ApiError } from '../../../core/errors';
import { verifyToken } from '../../../core/security';
import type { AuthUserRow } from '../context';

export type LoadAuthUser = (id: bigint) => Promise<AuthUserRow | null>;

/**
 * Fabrica del middleware de autenticacion (U2.3). Revalida contra BD en CADA
 * request: un usuario deshabilitado (is_active=false) o inexistente pierde el
 * acceso de inmediato aunque su token siga sin expirar.
 */
export function createAuthenticate(loadUser: LoadAuthUser): RequestHandler {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const header = req.headers.authorization ?? '';
      const [scheme, token] = header.split(' ');
      if (scheme !== 'Bearer' || !token) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Token requerido');
      }
      const payload = verifyToken(token); // lanza 401 si firma/exp invalidos
      const user = await loadUser(BigInt(payload.sub));
      if (!user || !user.isActive) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Usuario inexistente o deshabilitado');
      }
      req.auth = {
        userId: user.id,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
      };
      next();
    } catch (err) {
      next(err);
    }
  };
}

/** Implementacion por defecto: relee el usuario de la BD (fuente de verdad). */
export const authenticate: RequestHandler = createAuthenticate(async (id) => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, isActive: true, mustChangePassword: true },
  });
  return user;
});
