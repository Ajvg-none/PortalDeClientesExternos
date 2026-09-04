/**
 * U2.1/U2.2 - Utilidades de contrasena (bcryptjs) y JWT.
 */
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env';
import { ApiError } from '../src/core/errors';
import { hashPassword, signToken, verifyPassword, verifyToken } from '../src/core/security';

describe('U2.1 - Utilidades de contrasena (bcryptjs)', () => {
  test('hashPassword nunca devuelve el texto plano', async () => {
    const hash = await hashPassword('Temporal123!');
    expect(hash).not.toContain('Temporal123!');
    expect(hash).toMatch(/^\$2[aby]\$/);
  });

  test('verifyPassword acepta la contrasena correcta y rechaza la incorrecta', async () => {
    const hash = await hashPassword('Temporal123!');
    expect(await verifyPassword('Temporal123!', hash)).toBe(true);
    expect(await verifyPassword('otra-cosa', hash)).toBe(false);
  });
});

describe('U2.2 - Emision y validacion de JWT', () => {
  test('signToken/verifyToken redondean payload con sub y role', () => {
    const token = signToken({ sub: '42', role: 'ADMINISTRADOR' });
    const payload = verifyToken(token);
    expect(payload.sub).toBe('42');
    expect(payload.role).toBe('ADMINISTRADOR');
    expect(payload.exp).toBeGreaterThan(payload.iat);
  });

  test('un token con firma invalida lanza ApiError 401 UNAUTHORIZED', () => {
    expect(() => verifyToken('header.payload.firma-invalida')).toThrow(ApiError);
    try {
      verifyToken('header.payload.firma-invalida');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).statusCode).toBe(401);
      expect((err as ApiError).code).toBe('UNAUTHORIZED');
    }
  });

  test('un token expirado lanza ApiError 401 UNAUTHORIZED', () => {
    const expired = jwt.sign({ role: 'ADMINISTRADOR' }, env.jwtSecret, {
      subject: '1',
      expiresIn: '-1h',
    });
    expect(() => verifyToken(expired)).toThrow(ApiError);
  });
});
