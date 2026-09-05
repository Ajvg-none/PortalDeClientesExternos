/**
 * F6.1 - Top Header Layout (64px, sin sidebar, logo CROVEN, menu por rol).
 * REM-2026-09: logout limpia la sesion y redirige al login (RF-03).
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { TopBar } from './TopBar';
import { session } from '../core/http';

vi.mock('../core/http', async () => {
  const actual = await vi.importActual<typeof import('../core/http')>('../core/http');
  return { ...actual, session: { ...actual.session, clear: vi.fn() } };
});

function renderTopBar(role: 'CLIENTE_EXTERNO' | 'LABORATORIO' | 'ADMINISTRADOR') {
  return render(
    <MemoryRouter>
      <TopBar role={role} username="usuario" />
    </MemoryRouter>,
  );
}

describe('F6.1 - TopBar (Top Header Layout)', () => {
  it('muestra el logo CROVEN y el usuario', () => {
    renderTopBar('ADMINISTRADOR');
    expect(screen.getByText('CROVEN')).toBeInTheDocument();
    expect(screen.getByText('usuario')).toBeInTheDocument();
  });

  it('muestra los items de menu segun rol y NO usa sidebar', () => {
    const { container } = renderTopBar('ADMINISTRADOR');
    expect(screen.getByText('Órdenes')).toBeInTheDocument();
    expect(screen.getByText('Usuarios')).toBeInTheDocument();
    expect(screen.getByText('Estadísticas')).toBeInTheDocument();
    // Top header (nav horizontal), no un elemento aside/sidebar
    expect(container.querySelector('aside')).toBeNull();
    expect(container.querySelector('header nav')).not.toBeNull();
  });

  it('el menu del cliente es distinto al del administrador', () => {
    renderTopBar('CLIENTE_EXTERNO');
    expect(screen.getByText('Mis órdenes')).toBeInTheDocument();
    expect(screen.getByText('Nueva orden')).toBeInTheDocument();
    expect(screen.queryByText('Usuarios')).toBeNull();
  });

  it('REM-2026-09: al cerrar sesion limpia la sesion y redirige al login (RF-03)', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/ordenes']}>
        <Routes>
          <Route path="/login" element={<div>PANTALLA_LOGIN</div>} />
          <Route
            path="/ordenes"
            element={
              <TopBar role="ADMINISTRADOR" username="admin" />
            }
          />
        </Routes>
      </MemoryRouter>,
    );
    await user.click(screen.getByRole('button', { name: /cerrar sesión/i }));
    expect(session.clear).toHaveBeenCalled();
    expect(await screen.findByText('PANTALLA_LOGIN')).toBeInTheDocument();
  });
});
