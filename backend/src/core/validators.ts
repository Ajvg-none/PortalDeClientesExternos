import { param } from 'express-validator';

/**
 * Validacion de params que representan ids BIGINT de la BD (REM-cleanup
 * 2026-09 / F2). Se comparte entre los modulos orders y users en lugar de
 * duplicar la regla /^\d+$/ en cada DTO.
 */
export function bigIntIdParamValidators(field = 'id') {
  return [
    param(field)
      .custom((v: unknown) => /^\d+$/.test(String(v)))
      .withMessage(`${field} invalido`),
  ];
}
