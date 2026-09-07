import type { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import type { Role } from '../core/types';
import { session } from '../core/http';

/**
 * Top Header Layout de 64px SIN sidebar (anexo v1.4): logo CROVEN a la
 * izquierda, menu horizontal por rol al centro, perfil/acciones a la derecha.
 */
export interface NavItem {
  to: string;
  label: string;
}

const MENU: Record<Role, NavItem[]> = {
  CLIENTE_EXTERNO: [
    { to: '/ordenes', label: 'Mis órdenes' },
    { to: '/ordenes/nueva', label: 'Nueva orden' },
  ],
  LABORATORIO: [{ to: '/ordenes', label: 'Órdenes' }],
  ADMINISTRADOR: [
    { to: '/ordenes', label: 'Órdenes' },
    { to: '/usuarios', label: 'Usuarios' },
    { to: '/estadisticas', label: 'Estadísticas' },
  ],
};

export function TopBar({ role, username }: { role: Role; username: string }) {
  const navigate = useNavigate();
  const items = MENU[role] ?? [];

  function logout() {
    session.clear();
    navigate('/login');
  }

  // ✅ NUEVO: inicial del usuario para avatar
  const initial = username.charAt(0).toUpperCase();

  return (
    <header className="topbar">
      <div className="topbar__brand">CROVEN</div>
      <nav className="topbar__nav" aria-label="Menú principal">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/ordenes'}
            className={({ isActive }) => `topbar__link${isActive ? ' is-active' : ''}`}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="topbar__actions">
        {/* ✅ NUEVO: chip de usuario con avatar de inicial */}
        <div className="topbar__user-chip">
          <span className="topbar__avatar" aria-hidden="true">
            {initial}
          </span>
          <span className="topbar__user">{username}</span>
        </div>
        <button onClick={logout} aria-label="Cerrar sesión" className="btn">
          <LogOut size={18} color="var(--color-primary)" aria-hidden="true" /> Salir
        </button>
      </div>
    </header>
  );
}

/** Contenedor de contenido: max-w-7xl centrado sobre canvas (anexo v1.4). */
export function Layout({ children }: { children: ReactNode }) {
  return (
    <main id="contenido" className="page">
      {children}
    </main>
  );
}