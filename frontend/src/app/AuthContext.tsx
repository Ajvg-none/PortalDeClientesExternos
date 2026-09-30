import { createContext, useContext } from 'react';
import type { AuthUser } from '../core/types';

/** Estado de sesion compartido: usuario autenticado + token (core session). */
export interface AuthSession {
  user: AuthUser | null;
  token: string | null;
  setSession: (token: string, user: AuthUser) => void;
  clear: () => void;
}

export const AuthContext = createContext<AuthSession | null>(null);

export function useAuth(): AuthSession {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
