import type { Request, Response } from 'express';
import { asyncHandler } from '../../../core/async';
import { changePassword, loginByUsername } from '../services/auth.service';

/** U2.5 - POST /api/auth/login */
export const login = asyncHandler(async (req: Request, res: Response) => {
  const { username, password } = req.body as { username?: string; password?: string };
  const result = await loginByUsername(String(username), String(password));
  res.json(result);
});

/** U2.8 - POST /api/auth/change-password (requiere autenticacion) */
export const changeMyPassword = asyncHandler(async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body as {
    currentPassword?: string;
    newPassword?: string;
  };
  const user = await changePassword(
    req.auth!.userId,
    String(currentPassword),
    String(newPassword),
  );
  res.json({ message: 'Contrasena actualizada', user });
});
