import crypto from 'node:crypto';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { prisma } from '../../../core/prisma';
import { ApiError } from '../../../core/errors';

export type LoadActiveApiKey = () => Promise<string | null>;

/**
 * Middleware de autenticacion de integracion (M4.1, RF-39…41).
 * Exige el header X-API-Key con la clave unica y ACTIVA configurada en el
 * portal (tabla api_keys). Comparacion en tiempo constante para no filtrar
 * informacion por timing. NO usa JWT de usuarios.
 */
export function createApiKeyAuth(loadKey: LoadActiveApiKey): RequestHandler {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const provided = req.headers['x-api-key'];
      if (typeof provided !== 'string' || provided.length === 0) {
        throw new ApiError(401, 'UNAUTHORIZED', 'Header X-API-Key requerido');
      }
      const activeKey = await loadKey();
      if (!activeKey) {
        throw new ApiError(401, 'UNAUTHORIZED', 'No hay API Key activa configurada');
      }
      const a = Buffer.from(provided);
      const b = Buffer.from(activeKey);
      const equal = a.length === b.length && crypto.timingSafeEqual(a, b);
      if (!equal) {
        throw new ApiError(401, 'UNAUTHORIZED', 'API Key invalida');
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Implementacion por defecto: usa la (unica) API Key activa de la BD
 * (RF-40: una sola clave estatica, configurada una vez en el portal).
 */
export const apiKeyAuth: RequestHandler = createApiKeyAuth(async () => {
  const row = await prisma.apiKey.findFirst({
    where: { isActive: true },
    orderBy: { id: 'asc' },
    select: { keyValue: true },
  });
  return row?.keyValue ?? null;
});
