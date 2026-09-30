/**
 * X7.2 - Politica de contrasenas del frontend (espejo de la del backend,
 * `backend/src/core/password-policy.ts`). Fuente unica para los formularios:
 * evita repetir la regla en cada feature.
 */
export const PASSWORD_POLICY_MESSAGE =
  'Mínimo 8 caracteres, con una letra, un número y una mayúscula';

export function isValidPassword(password: string): boolean {
  return (
    password.length >= 8 &&
    password.length <= 72 &&
    /[A-Za-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[A-Z]/.test(password)
  );
}
