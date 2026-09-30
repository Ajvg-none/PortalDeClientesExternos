/**
 * X7.2 - Politica de contrasenas (capa transversal core).
 * Logica PURA y testeable de forma aislada; no conoce Express ni la BD.
 * Se aplica tanto en los DTO (mensaje temprano) como en los servicios
 * (defensa en profundidad) para que no pueda saltarse.
 */

export interface PasswordPolicy {
  minLength: number;
  maxLength: number;
  requireLetter: boolean;
  requireDigit: boolean;
  requireUppercase: boolean;
}

export interface PasswordPolicyResult {
  ok: boolean;
  reasons: string[];
}

/** Politica v1 aprobada por el dueno (X7.2): 8-72, letra + numero + mayuscula. */
export const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
  minLength: 8,
  maxLength: 72,
  requireLetter: true,
  requireDigit: true,
  requireUppercase: true,
};

/** Valida una contrasena contra la politica y devuelve los motivos de rechazo. */
export function validatePasswordPolicy(
  password: string,
  policy: PasswordPolicy = DEFAULT_PASSWORD_POLICY,
): PasswordPolicyResult {
  const reasons: string[] = [];
  if (password.length < policy.minLength) {
    reasons.push(`Debe tener al menos ${policy.minLength} caracteres`);
  }
  if (password.length > policy.maxLength) {
    reasons.push(`Debe tener como maximo ${policy.maxLength} caracteres`);
  }
  if (policy.requireLetter && !/[A-Za-z]/.test(password)) {
    reasons.push('Debe incluir al menos una letra');
  }
  if (policy.requireDigit && !/[0-9]/.test(password)) {
    reasons.push('Debe incluir al menos un numero');
  }
  if (policy.requireUppercase && !/[A-Z]/.test(password)) {
    reasons.push('Debe incluir al menos una mayuscula');
  }
  return { ok: reasons.length === 0, reasons };
}
