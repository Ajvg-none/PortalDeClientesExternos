import type { RequestHandler } from 'express';
import { ApiError } from '../../../core/errors';

/**
 * Guard de primer acceso (U2.8 / DEC-6): mientras users.must_change_password
 * sea TRUE, el usuario autenticado SOLO puede ejecutar el cambio de contrasena
 * (POST /api/auth/change-password); el resto de los recursos responde 403.
 */
export const passwordChangeRequired: RequestHandler = (req, _res, next) => {
  if (req.auth?.mustChangePassword) {
    next(
      new ApiError(
        403,
        'PASSWORD_CHANGE_REQUIRED',
        'Debe cambiar su contrasena temporal antes de continuar',
      ),
    );
    return;
  }
  next();
};
