import type { Request, Response } from 'express';
import { asyncHandler } from '../../../core/async';
import {
  createUser,
  getUserById,
  listUsers,
  resetUserPassword,
  setUserActive,
  updateUser,
  type ListUsersFilters,
  type UpdateUserInput,
} from '../services/users.service';
import { UserRole } from '@prisma/client';

function parseBigInt(value: string): bigint {
  return BigInt(value);
}

function toBool(value: string | undefined): boolean | undefined {
  if (value === undefined) return undefined;
  return value === 'true';
}

/** U2.7 - GET /api/users?q=&role=&isActive=&limit=&offset= */
export const list = asyncHandler(async (req: Request, res: Response) => {
  const filters: ListUsersFilters = {
    q: (req.query.q as string | undefined) ?? undefined,
    role: (req.query.role as UserRole | undefined) ?? undefined,
    isActive: toBool(req.query.isActive as string | undefined),
    limit: req.query.limit !== undefined ? Number(req.query.limit) : undefined,
    offset: req.query.offset !== undefined ? Number(req.query.offset) : undefined,
  };
  const result = await listUsers(filters);
  res.json(result);
});

/** U2.6 - POST /api/users */
export const create = asyncHandler(async (req: Request, res: Response) => {
  const user = await createUser({
    username: req.body.username,
    password: req.body.password,
    role: req.body.role,
    companyName: req.body.companyName ?? null,
    email: req.body.email ?? null,
    phone: req.body.phone ?? null,
    address: req.body.address ?? null,
  });
  res.status(201).json(user);
});

/** GET /api/users/:id */
export const getById = asyncHandler(async (req: Request, res: Response) => {
  const user = await getUserById(parseBigInt(req.params.id));
  res.json(user);
});

/** U2.7 - PATCH /api/users/:id */
export const update = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as UpdateUserInput;
  const user = await updateUser(parseBigInt(req.params.id), body);
  res.json(user);
});

/** U2.7/DEC-4 - PATCH /api/users/:id/status  { isActive } */
export const setStatus = asyncHandler(async (req: Request, res: Response) => {
  const user = await setUserActive(parseBigInt(req.params.id), Boolean(req.body.isActive));
  res.json(user);
});

/** U2.6/RF-26 - POST /api/users/:id/reset-password  { newPassword } */
export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const user = await resetUserPassword(parseBigInt(req.params.id), String(req.body.newPassword));
  res.json({ message: 'Contrasena restablecida. Debera cambiarla en el proximo inicio de sesion.', user });
});
