import { ApiError, httpErrors } from '../errors';
import type { ErrorRequestHandler, RequestHandler } from 'express';

/**
 * Middleware de ruta no encontrada: responde 404 en formato JSON estandar.
 */
export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(httpErrors.notFound(`Ruta no encontrada: ${req.method} ${req.originalUrl}`));
};

/**
 * Manejador global de errores: formato JSON { code, message }.
 * ApiError -> su status/codigo; JSON invalido -> 400; resto -> 500 (loggeado).
 */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({ code: err.code, message: err.message });
    return;
  }
  if (err !== null && typeof err === 'object' && (err as { type?: string }).type === 'entity.parse.failed') {
    res.status(400).json({ code: 'BAD_REQUEST', message: 'JSON invalido en el cuerpo de la solicitud' });
    return;
  }
  // REM-2026-09/R2.5: body por encima del limite (express.json 1mb) -> 413
  if (err !== null && typeof err === 'object' && (err as { type?: string }).type === 'entity.too.large') {
    res.status(413).json({ code: 'PAYLOAD_TOO_LARGE', message: 'El cuerpo de la solicitud excede el limite permitido' });
    return;
  }
  // eslint-disable-next-line no-console
  console.error('[errorHandler]', err);
  res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Error interno del servidor' });
};
