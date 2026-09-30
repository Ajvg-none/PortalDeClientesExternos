import {
  DEFAULT_PASSWORD_POLICY,
  validatePasswordPolicy,
} from '../src/core/password-policy';

/**
 * X7.2 - Politica de contrasenas (unitario, sin BD ni Express).
 */
describe('X7.2 - core/password-policy', () => {
  test('acepta una contrasena que cumple la politica', () => {
    expect(validatePasswordPolicy('NuevaClave1')).toEqual({ ok: true, reasons: [] });
    expect(validatePasswordPolicy('Cambiar123!')).toEqual({ ok: true, reasons: [] });
  });

  test('rechaza por longitud minima', () => {
    const result = validatePasswordPolicy('Ab1');
    expect(result.ok).toBe(false);
    expect(result.reasons.join(' ')).toContain('al menos 8');
  });

  test('rechaza por falta de letra', () => {
    const result = validatePasswordPolicy('12345678');
    expect(result.ok).toBe(false);
    expect(result.reasons.join(' ')).toContain('una letra');
  });

  test('rechaza por falta de numero', () => {
    const result = validatePasswordPolicy('PasswordSinNumero');
    expect(result.ok).toBe(false);
    expect(result.reasons.join(' ')).toContain('un numero');
  });

  test('rechaza por falta de mayuscula', () => {
    const result = validatePasswordPolicy('password1');
    expect(result.ok).toBe(false);
    expect(result.reasons.join(' ')).toContain('una mayuscula');
  });

  test('rechaza por longitud maxima (bcrypt 72)', () => {
    const result = validatePasswordPolicy(`Aa1${'x'.repeat(80)}`);
    expect(result.ok).toBe(false);
    expect(result.reasons.join(' ')).toContain('maximo 72');
  });

  test('acumula todos los motivos en un solo resultado', () => {
    const result = validatePasswordPolicy('');
    expect(result.ok).toBe(false);
    expect(result.reasons.length).toBeGreaterThanOrEqual(3);
  });

  test('respeta una politica personalizada', () => {
    const policy = { ...DEFAULT_PASSWORD_POLICY, requireUppercase: false, requireDigit: false };
    expect(validatePasswordPolicy('sololetras', policy).ok).toBe(true);
  });
});
