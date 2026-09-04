import type { NextFunction, Request, RequestHandler, Response } from 'express';
import morgan from 'morgan';
import { env } from '../config/env';

/**
 * Logger de peticiones HTTP (morgan). En modo test se desactiva para no
 * ensuciar la salida de Jest.
 */
export function requestLogger(): RequestHandler {
  if (env.isTest) {
    return (_req: Request, _res: Response, next: NextFunction) => {
      next();
    };
  }
  return morgan(env.nodeEnv === 'production' ? 'combined' : 'dev');
}
