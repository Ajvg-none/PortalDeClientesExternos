import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { validationResult } from 'express-validator';

/**
 * Middleware de validacion (express-validator): si hay errores responde
 * 400 VALIDATION_ERROR con el detalle por campo.
 */
export function validate(req: Request, res: Response, next: NextFunction): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const details = errors.array().map((e) => ({
      field: e.type === 'field' ? e.path : e.type,
      message: e.msg,
    }));
    res.status(400).json({
      code: 'VALIDATION_ERROR',
      message: 'Datos de entrada invalidos',
      errors: details,
    });
    return;
  }
  next();
}

/** Variante utilizable como RequestHandler directo en arrays de validacion. */
export const validateRequest: RequestHandler = validate;
