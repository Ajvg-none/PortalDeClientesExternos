import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ApiError, httpErrors } from '../errors';

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
  // eslint-disable-next-line no-console
  console.error('[errorHandler]', err);
  res.status(500).json(httpErrors.internal());
};
