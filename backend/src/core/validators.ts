import { body, param } from 'express-validator';
import { validatePasswordPolicy } from './password-policy';

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

/**
 * X7.2 - Validacion de contrasena segun la politica comun. Se usa en los DTO
 * de auth (cambio) y users (alta/reset) para no duplicar reglas. En caso de
 * rechazo, el mensaje lista todos los motivos.
 */
export function passwordValidators(field = 'newPassword') {
  return [
    body(field)
      .isString()
      .custom((value: unknown) => {
        const result = validatePasswordPolicy(String(value ?? ''));
        if (!result.ok) throw new Error(result.reasons.join('. '));
        return true;
      }),
  ];
}

