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

  return (
    <header
      style={{
        height: 'var(--header-height)',
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        alignItems: 'center',
        gap: '24px',
        padding: '0 24px',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}
    >
      <div style={{ fontWeight: 700, fontSize: '18px', color: 'var(--color-text)', whiteSpace: 'nowrap' }}>
        CROVEN
      </div>

      <nav style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: '8px' }}>
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/ordenes'}
            style={({ isActive }) => ({
              padding: '8px 16px',
              borderRadius: '8px',
              fontWeight: 500,
              fontSize: '14px',
              color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              borderBottom: isActive ? '2px solid var(--color-primary)' : '2px solid transparent',
            })}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', whiteSpace: 'nowrap' }}>
        <span style={{ color: 'var(--color-text-secondary)', fontSize: '13px' }}>{username}</span>
        <button
          onClick={logout}
          aria-label="Cerrar sesión"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            height: '42px',
            padding: '0 16px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--color-border)',
            background: 'var(--color-surface)',
            color: 'var(--color-text-body)',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <LogOut size={18} color="var(--color-primary)" /> Salir
        </button>
      </div>
    </header>
  );
}

/** Contenedor de contenido: max-w-7xl centrado sobre canvas (anexo v1.4). */
export function Layout({ children }: { children: ReactNode }) {
  return (
    <div style={{ maxWidth: 'var(--content-max-width)', margin: '0 auto', padding: '24px' }}>
      {children}
    </div>
  );
}
