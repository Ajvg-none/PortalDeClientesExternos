import type { ReactElement } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { session } from '../core/http';
import { useAuth } from './AuthContext';
import type { Role } from '../core/types';

/** Guard de autenticacion: sin token -> /login; con flag -> /cambiar-contrasena. */
export function RequireAuth({ children }: { children?: ReactElement }) {
  const { user } = useAuth();
  if (!session.getToken() || !user) return <Navigate to="/login" replace />;
  if (user.mustChangePassword) return <Navigate to="/cambiar-contrasena" replace />;
  return children ?? <Outlet />;
}

/** Guard por rol: redirige a /ordenes (home del rol) si no tiene acceso. */
export function RequireRole({ role, children }: { role: Role; children: ReactElement }) {
  const { user } = useAuth();
  if (!user || user.role !== role) return <Navigate to="/ordenes" replace />;
  return children;
}
