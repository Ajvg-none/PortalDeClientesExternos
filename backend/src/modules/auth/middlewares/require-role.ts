import type { RequestHandler } from 'express';
import { UserRole } from '@prisma/client';
import { ApiError } from '../../../core/errors';

/**
 * Middleware de autorizacion por rol (U2.4). Debe ejecutarse DESPUES de
 * authenticate (req.auth presente).
 */
export function requireRole(...allowed: UserRole[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.auth) {
      next(new ApiError(401, 'UNAUTHORIZED', 'Autenticacion requerida'));
      return;
    }
    if (!allowed.includes(req.auth.role)) {
      next(new ApiError(403, 'FORBIDDEN', 'No tiene permisos para esta accion'));
      return;
    }
    next();
  };
}

export const requireAdmin = requireRole(UserRole.ADMINISTRADOR);
