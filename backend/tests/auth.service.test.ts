/**
 * U2.5/U2.8 - Servicio de auth (login y cambio de contrasena) con prisma mockeado.
 */
import bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';

jest.mock('../src/core/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import { prisma } from '../src/core/prisma';
import { ApiError } from '../src/core/errors';
import { changePassword, loginByUsername } from '../src/modules/auth/services/auth.service';

const HASH = bcrypt.hashSync('Temporal123', 10);

function userRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 1n,
    username: 'cliente1',
    passwordHash: HASH,
    email: null,
    role: UserRole.CLIENTE_EXTERNO,
    companyName: 'Optica Uno',
    phone: null,
    address: null,
    isActive: true,
    mustChangePassword: true,
    createdAt: new Date('2026-09-01T00:00:00Z'),
    ...overrides,
  };
}

describe('U2.5 - loginByUsername', () => {
  beforeEach(() => jest.clearAllMocks());

  test('credenciales validas: devuelve token, rol y flag', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(userRow());
    const result = await loginByUsername('cliente1', 'Temporal123');
    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { username: 'cliente1' } });
    expect(typeof result.token).toBe('string');
    expect(result.user).toMatchObject({
      id: '1',
      role: UserRole.CLIENTE_EXTERNO,
      mustChangePassword: true,
    });
    expect(result.user).not.toHaveProperty('passwordHash');
  });

  test('usuario inexistente responde 401 UNAUTHORIZED', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(loginByUsername('nadie', 'x')).rejects.toMatchObject({
      statusCode: 401,
      code: 'UNAUTHORIZED',
    });
  });

  test('contrasena incorrecta responde 401 (mismo mensaje que usuario inexistente)', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(userRow());
    await expect(loginByUsername('cliente1', 'incorrecta')).rejects.toMatchObject({
      statusCode: 401,
      code: 'UNAUTHORIZED',
    });
  });

  test('usuario deshabilitado responde 403 FORBIDDEN', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(userRow({ isActive: false }));
    await expect(loginByUsername('cliente1', 'Temporal123')).rejects.toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN',
    });
  });
});

describe('U2.8 - changePassword', () => {
  beforeEach(() => jest.clearAllMocks());

  test('contrasena actual incorrecta responde 400', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(userRow());
    await expect(changePassword(1n, 'mala', 'Nueva123')).rejects.toBeInstanceOf(ApiError);
  });

  test('cambio exitoso: hashea la nueva contrasena y limpia el flag', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(userRow());
    (prisma.user.update as jest.Mock).mockResolvedValue(userRow({ mustChangePassword: false }));
    const updated = await changePassword(1n, 'Temporal123', 'Nueva123');
    const [args] = (prisma.user.update as jest.Mock).mock.calls[0];
    expect(args.data.mustChangePassword).toBe(false);
    expect(args.data.passwordHash).not.toContain('Nueva123');
    expect(updated.mustChangePassword).toBe(false);
  });
});
