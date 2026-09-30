import type { ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut, Package, PlusCircle, Users, BarChart3, type LucideIcon } from 'lucide-react';
import type { Role } from '../core/types';
import { session } from '../core/http';
import logoCroven from '../assets/logo-croven.png';

/**
 * Top Header Layout de 64px SIN sidebar (anexo v1.4): logo CROVEN a la
 * izquierda, menu horizontal por rol al centro, perfil/acciones a la derecha.
 */
interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

const MENU: Record<Role, NavItem[]> = {
  CLIENTE_EXTERNO: [
    { to: '/ordenes', label: 'Mis órdenes', icon: Package },
    { to: '/ordenes/nueva', label: 'Nueva orden', icon: PlusCircle },
  ],
  LABORATORIO: [{ to: '/ordenes', label: 'Órdenes', icon: Package }],
  ADMINISTRADOR: [
    { to: '/ordenes', label: 'Órdenes', icon: Package },
    { to: '/usuarios', label: 'Usuarios', icon: Users },
    { to: '/estadisticas', label: 'Estadísticas', icon: BarChart3 },
  ],
};

export function TopBar({ role, username }: { role: Role; username: string }) {
  const navigate = useNavigate();
  const items = MENU[role] ?? [];

  function logout() {
    session.clear();
    navigate('/login');
  }

  // Inicial del usuario para avatar
  const initial = username.charAt(0).toUpperCase();

  return (
    <header className="topbar">
      <div className="topbar__brand">
        <img src={logoCroven} alt="Logo de Croven" className="topbar__logo" />
      </div>
      <nav className="topbar__nav" aria-label="Menú principal">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/ordenes'}
              className={({ isActive }) => `topbar__link${isActive ? ' is-active' : ''}`}
            >
              <Icon size={16} aria-hidden="true" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
      <div className="topbar__actions">
        {/* Chip de usuario con avatar de inicial */}
        <div className="topbar__user-chip">
          <span className="topbar__avatar" aria-hidden="true">
            {initial}
          </span>
          <span className="topbar__user">{username}</span>
        </div>
        <button onClick={logout} aria-label="Cerrar sesión" className="btn btn--sm">
          <LogOut size={16} aria-hidden="true" />
          <span>Salir</span>
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