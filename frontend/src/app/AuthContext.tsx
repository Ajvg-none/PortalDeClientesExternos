import { createContext, useContext, type ReactNode } from 'react';
import type { AuthUser } from '../core/types';

/** Estado de sesion compartido: usuario autenticado + token (core session). */
export interface AuthSession {
  user: AuthUser | null;
  token: string | null;
  setSession: (token: string, user: AuthUser) => void;
  clear: () => void;
}

export const AuthContext = createContext<AuthSession | null>(null);

export function AuthProvider({
  value,
  children,
}: {
  value: AuthSession;
  children: ReactNode;
}) {
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthSession {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
