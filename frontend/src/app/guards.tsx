import type { ReactElement } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { session } from '../core/http';
import { useAuth } from './AuthContext';
import type { Role } from '../core/types';

/**
 * Guard de autenticacion (REM-2026-09): sin sesion -> /login; con el flag de
 * primer acceso (DEC-6) -> /cambiar-contrasena. NO se usa en la ruta de cambio
 * de contrasena (ver RequirePasswordChange) para evitar una redireccion hacia
 * si misma que impedia renderizar la pantalla.
 */
export function RequireAuth({ children }: { children?: ReactElement }) {
  const { user } = useAuth();
  if (!session.getToken() || !user) return <Navigate to="/login" replace />;
  if (user.mustChangePassword) return <Navigate to="/cambiar-contrasena" replace />;
  return children ?? <Outlet />;
}

/**
 * Guard de la pantalla de cambio obligatorio de contrasena (F6.10/DEC-6).
 * Renderiza su contenido SOLO cuando el flag esta activo; en cualquier otro
 * caso redirige a la ruta que corresponde segun el estado de la sesion.
 */
export function RequirePasswordChange({ children }: { children?: ReactElement }) {
  const { user } = useAuth();
  if (!session.getToken() || !user) return <Navigate to="/login" replace />;
  if (!user.mustChangePassword) return <Navigate to="/ordenes" replace />;
  return children ?? <Outlet />;
}

/** Guard por rol: redirige a /ordenes (home del rol) si no tiene acceso. */
export function RequireRole({ role, children }: { role: Role; children: ReactElement }) {
  const { user } = useAuth();
  if (!user || user.role !== role) return <Navigate to="/ordenes" replace />;
  return children;
}
