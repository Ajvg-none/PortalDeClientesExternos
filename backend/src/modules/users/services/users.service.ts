import { UserRole, Prisma } from '@prisma/client';
import { prisma } from '../../../core/prisma';
import { ApiError } from '../../../core/errors';
import { hashPassword } from '../../../core/security';
import { toPublicUser, type PublicUser } from '../../auth/services/auth.service';

/**
 * Servicios de administracion de usuarios (U2.6/U2.7, RF-23…RF-27).
 * SIN borrado fisico (DEC-4): la baja es exclusivamente is_active = false.
 */

export interface CreateUserInput {
  username: string;
  password: string;
  role: UserRole;
  companyName?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
}

export interface ListUsersFilters {
  q?: string;
  role?: UserRole;
  isActive?: boolean;
  limit?: number;
  offset?: number;
}

function buildWhere(filters: ListUsersFilters): Prisma.UserWhereInput {
  const where: Prisma.UserWhereInput = {};
  if (filters.role) where.role = filters.role;
  if (filters.isActive !== undefined) where.isActive = filters.isActive;
  if (filters.q?.trim()) {
    where.OR = [
      { username: { contains: filters.q.trim(), mode: 'insensitive' } },
      { companyName: { contains: filters.q.trim(), mode: 'insensitive' } },
    ];
  }
  return where;
}

async function assertUsernameFree(username: string, excludeId?: bigint): Promise<void> {
  const existing = await prisma.user.findFirst({
    where: { username, NOT: excludeId ? { id: excludeId } : undefined },
    select: { id: true },
  });
  if (existing) {
    throw new ApiError(409, 'USERNAME_ALREADY_EXISTS', 'El username ya esta en uso');
  }
}

async function assertEmailFree(email: string, excludeId?: bigint): Promise<void> {
  const existing = await prisma.user.findFirst({
    where: { email, NOT: excludeId ? { id: excludeId } : undefined },
    select: { id: true },
  });
  if (existing) {
    throw new ApiError(409, 'EMAIL_ALREADY_EXISTS', 'El email ya esta en uso');
  }
}

/**
 * U2.6 - Alta de usuario (el admin asigna username unico y contrasena
 * temporal). Queda con must_change_password = true (DEC-6).
 */
export async function createUser(input: CreateUserInput): Promise<PublicUser> {
  await assertUsernameFree(input.username);
  if (input.email) await assertEmailFree(input.email);
  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      username: input.username,
      passwordHash,
      role: input.role,
      companyName: input.companyName ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      address: input.address ?? null,
      isActive: true,
      mustChangePassword: true, // DEC-6: primer acceso obliga al cambio
    },
  });
  return toPublicUser(user);
}

/** U2.7 - Listado filtrable (q/role/isActive) paginado. */
export async function listUsers(filters: ListUsersFilters) {
  const limit = filters.limit ?? 20;
  const offset = filters.offset ?? 0;
  const where = buildWhere(filters);
  const [total, rows] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { username: 'asc' },
      skip: offset,
      take: limit,
    }),
  ]);
  return { data: rows.map(toPublicUser), total, limit, offset };
}

export async function getUserById(id: bigint): Promise<PublicUser> {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new ApiError(404, 'NOT_FOUND', 'Usuario no encontrado');
  return toPublicUser(user);
}

export type UpdateUserInput = Partial<
  Pick<CreateUserInput, 'username' | 'role' | 'companyName' | 'email' | 'phone' | 'address'>
>;

/** U2.7 - Edicion de datos del usuario. */
export async function updateUser(id: bigint, input: UpdateUserInput): Promise<PublicUser> {
  const current = await prisma.user.findUnique({ where: { id } });
  if (!current) throw new ApiError(404, 'NOT_FOUND', 'Usuario no encontrado');
  if (input.username && input.username !== current.username) {
    await assertUsernameFree(input.username, id);
  }
  if (input.email && input.email !== current.email) {
    await assertEmailFree(input.email, id);
  }
  const data: Prisma.UserUpdateInput = {};
  if (input.username !== undefined) data.username = input.username;
  if (input.role !== undefined) data.role = input.role;
  if (input.companyName !== undefined) data.companyName = input.companyName;
  if (input.email !== undefined) data.email = input.email;
  if (input.phone !== undefined) data.phone = input.phone;
  if (input.address !== undefined) data.address = input.address;
  const user = await prisma.user.update({ where: { id }, data });
  return toPublicUser(user);
}

/** U2.7 - Baja logica / reactivacion (DEC-4: sin DELETE fisico). */
export async function setUserActive(id: bigint, isActive: boolean): Promise<PublicUser> {
  const current = await prisma.user.findUnique({ where: { id } });
  if (!current) throw new ApiError(404, 'NOT_FOUND', 'Usuario no encontrado');
  const user = await prisma.user.update({ where: { id }, data: { isActive } });
  return toPublicUser(user);
}

/** U2.6/RF-26 - Reset de contrasena: deja el flag en TRUE (DEC-6). */
export async function resetUserPassword(id: bigint, newPassword: string): Promise<PublicUser> {
  const current = await prisma.user.findUnique({ where: { id } });
  if (!current) throw new ApiError(404, 'NOT_FOUND', 'Usuario no encontrado');
  const passwordHash = await hashPassword(newPassword);
  const user = await prisma.user.update({
    where: { id },
    data: { passwordHash, mustChangePassword: true },
  });
  return toPublicUser(user);
}
