import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { ApiError } from './errors';

/**
 * Seguridad transversal (U2.1/U2.2): hash de contrasenas y JWT.
 * bcryptjs es JS puro (sin binarios nativos) y jsonwebtoken firma HS256.
 */

const BCRYPT_ROUNDS = 10;

// ---------- Contrasenas (U2.1) ----------

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// ---------- JWT (U2.2) ----------

export interface JwtPayload {
  /** id de usuario como string (BigInt de BD serializado) */
  sub: string;
  /** rol en el momento de emitir el token (el runtime revalida contra BD) */
  role: string;
}

export interface JwtVerified {
  sub: string;
  role: string;
  iat: number;
  exp: number;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(
    { role: payload.role },
    env.jwtSecret,
    { subject: payload.sub, expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'] },
  );
}

/**
 * Verifica firma y expiracion. Devuelve el payload tipado o lanza
 * ApiError 401 UNAUTHORIZED (para que el middleware lo use directo).
 */
export function verifyToken(token: string): JwtVerified {
  try {
    return jwt.verify(token, env.jwtSecret) as JwtVerified;
  } catch {
    throw new ApiError(401, 'UNAUTHORIZED', 'Token invalido o expirado');
  }
}
