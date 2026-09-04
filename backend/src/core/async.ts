import type { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Envuelve handlers async: en Express 4 las promesas rechazadas no se
 * propagan al manejador de errores; este wrapper las reenvia via next().
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
