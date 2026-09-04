/**
 * U2.6/U2.7 - Servicio de administracion de usuarios con prisma mockeado.
 */
import { UserRole } from '@prisma/client';

jest.mock('../src/core/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import { prisma } from '../src/core/prisma';
import {
  createUser,
  getUserById,
  listUsers,
  resetUserPassword,
  setUserActive,
  updateUser,
} from '../src/modules/users/services/users.service';

function userRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 1n,
    username: 'cliente1',
    passwordHash: 'x',
    email: null,
    role: UserRole.CLIENTE_EXTERNO,
    companyName: 'Optica Uno',
    phone: null,
    address: null,
    isActive: true,
    mustChangePassword: true,
    createdAt: new Date('2026-09-01T00:00:00Z'),
    updatedAt: new Date('2026-09-01T00:00:00Z'),
    ...overrides,
  };
}

describe('U2.6 - createUser', () => {
  beforeEach(() => jest.clearAllMocks());

  test('username duplicado responde 409 USERNAME_ALREADY_EXISTS', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue({ id: 2n });
    await expect(
      createUser({ username: 'cliente1', password: 'Temporal123', role: UserRole.CLIENTE_EXTERNO }),
    ).rejects.toMatchObject({ statusCode: 409, code: 'USERNAME_ALREADY_EXISTS' });
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  test('creacion exitosa: hashea la clave, is_active=true y must_change_password=true (DEC-6)', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.user.create as jest.Mock).mockResolvedValue(userRow());
    const created = await createUser({
      username: 'cliente1',
      password: 'Temporal123',
      role: UserRole.CLIENTE_EXTERNO,
      companyName: 'Optica Uno',
    });
    const [args] = (prisma.user.create as jest.Mock).mock.calls[0];
    expect(args.data.passwordHash).not.toContain('Temporal123');
    expect(args.data.isActive).toBe(true);
    expect(args.data.mustChangePassword).toBe(true); // DEC-6
    expect(created).toMatchObject({ id: '1', mustChangePassword: true });
  });
});

describe('U2.7 - listUsers / getUserById / updateUser / setUserActive / resetUserPassword', () => {
  beforeEach(() => jest.clearAllMocks());

  test('listUsers pagina y devuelve total', async () => {
    (prisma.user.count as jest.Mock).mockResolvedValue(3);
    (prisma.user.findMany as jest.Mock).mockResolvedValue([
      userRow({ id: 1n, username: 'a' }),
      userRow({ id: 2n, username: 'b' }),
    ]);
    const result = await listUsers({ q: 'opti', role: UserRole.CLIENTE_EXTERNO, limit: 2, offset: 0 });
    expect(result.total).toBe(3);
    expect(result.data.map((u) => u.id)).toEqual(['1', '2']);
    const where = (prisma.user.findMany as jest.Mock).mock.calls[0][0].where;
    expect(where.role).toBe(UserRole.CLIENTE_EXTERNO);
    expect(where.OR).toBeDefined(); // busqueda por q
  });

  test('getUserById inexistente responde 404 NOT_FOUND', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(getUserById(99n)).rejects.toMatchObject({ statusCode: 404 });
  });

  test('updateUser no permite pisar un username existente (409)', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(userRow());
    (prisma.user.findFirst as jest.Mock).mockResolvedValue({ id: 7n });
    await expect(updateUser(1n, { username: 'ocupado' })).rejects.toMatchObject({
      statusCode: 409,
      code: 'USERNAME_ALREADY_EXISTS',
    });
  });

  test('setUserActive da de baja (is_active=false) sin eliminar el registro (DEC-4)', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(userRow());
    (prisma.user.update as jest.Mock).mockResolvedValue(userRow({ isActive: false }));
    const user = await setUserActive(1n, false);
    expect(user.isActive).toBe(false);
  });

  test('resetUserPassword hashea y deja must_change_password=true (DEC-6)', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(userRow());
    (prisma.user.update as jest.Mock).mockResolvedValue(userRow({ mustChangePassword: true }));
    await resetUserPassword(1n, 'Nueva123');
    const [args] = (prisma.user.update as jest.Mock).mock.calls[0];
    expect(args.data.mustChangePassword).toBe(true);
    expect(args.data.passwordHash).not.toContain('Nueva123');
  });
});
