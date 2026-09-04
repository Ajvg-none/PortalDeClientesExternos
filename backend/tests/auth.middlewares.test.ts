/**
 * U2.3/U2.4/U2.8 - Middlewares de autenticacion, rol y primer acceso.
 */
import type { NextFunction, Request, Response } from 'express';
import { UserRole } from '@prisma/client';
import { ApiError } from '../src/core/errors';
import { signToken } from '../src/core/security';
import { createAuthenticate } from '../src/modules/auth/middlewares/authenticate';
import { requireRole } from '../src/modules/auth/middlewares/require-role';
import { passwordChangeRequired } from '../src/modules/auth/middlewares/password-change-required';

function run(req: Partial<Request>, handler: (r: Request, s: Response, n: NextFunction) => void) {
  const next = jest.fn();
  handler(req as Request, {} as Response, next);
  return next;
}

describe('U2.3 - Middleware de autenticacion (revalida is_active en cada request)', () => {
  test('sin header Authorization responde 401 UNAUTHORIZED', async () => {
    const loader = jest.fn();
    const next = await run({ headers: {} }, createAuthenticate(loader));
    const err = next.mock.calls[0][0] as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('UNAUTHORIZED');
  });

  test('con token valido y usuario activo inyecta req.auth y continua', async () => {
    const token = signToken({ sub: '5', role: 'LABORATORIO' });
    const loader = jest.fn().mockResolvedValue({
      id: 5n,
      role: 'LABORATORIO',
      isActive: true,
      mustChangePassword: false,
    });
    const req: Partial<Request> = { headers: { authorization: `Bearer ${token}` } };
    const next = await run(req, createAuthenticate(loader));
    expect(next).toHaveBeenCalledWith();
    expect(loader).toHaveBeenCalledWith(5n);
    expect(req.auth).toEqual({
      userId: 5n,
      role: 'LABORATORIO',
      mustChangePassword: false,
    });
  });

  test('usuario deshabilitado (is_active=false) pierde acceso aunque el token sea valido', async () => {
    const token = signToken({ sub: '9', role: 'CLIENTE_EXTERNO' });
    const loader = jest.fn().mockResolvedValue({
      id: 9n,
      role: 'CLIENTE_EXTERNO',
      isActive: false,
      mustChangePassword: false,
    });
    const next = await run({ headers: { authorization: `Bearer ${token}` } }, createAuthenticate(loader));
    const err = next.mock.calls[0][0] as ApiError;
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('UNAUTHORIZED');
  });

  test('token con firma invalida responde 401', async () => {
    const loader = jest.fn().mockResolvedValue(null);
    const next = await run(
      { headers: { authorization: 'Bearer abc.def.ghi' } },
      createAuthenticate(loader),
    );
    expect((next.mock.calls[0][0] as ApiError).code).toBe('UNAUTHORIZED');
  });
});

describe('U2.4 - Middleware de autorizacion por rol', () => {
  test('rol no permitido responde 403 FORBIDDEN', () => {
    const req: Partial<Request> = { auth: { userId: 1n, role: UserRole.CLIENTE_EXTERNO, mustChangePassword: false } };
    const next = run(req, requireRole(UserRole.ADMINISTRADOR));
    const err = next.mock.calls[0][0] as ApiError;
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('FORBIDDEN');
  });

  test('rol permitido continua', () => {
    const req: Partial<Request> = { auth: { userId: 1n, role: UserRole.ADMINISTRADOR, mustChangePassword: false } };
    const next = run(req, requireRole(UserRole.ADMINISTRADOR));
    expect(next).toHaveBeenCalledWith();
  });

  test('sin autenticacion responde 401', () => {
    const next = run({}, requireRole(UserRole.ADMINISTRADOR));
    expect((next.mock.calls[0][0] as ApiError).statusCode).toBe(401);
  });
});

describe('U2.8 - Guard de primer acceso (must_change_password)', () => {
  test('con flag activo responde 403 PASSWORD_CHANGE_REQUIRED', () => {
    const req: Partial<Request> = { auth: { userId: 1n, role: UserRole.CLIENTE_EXTERNO, mustChangePassword: true } };
    const next = run(req, passwordChangeRequired);
    const err = next.mock.calls[0][0] as ApiError;
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('PASSWORD_CHANGE_REQUIRED');
  });

  test('con flag limpio continua', () => {
    const req: Partial<Request> = { auth: { userId: 1n, role: UserRole.CLIENTE_EXTERNO, mustChangePassword: false } };
    const next = run(req, passwordChangeRequired);
    expect(next).toHaveBeenCalledWith();
  });
});
