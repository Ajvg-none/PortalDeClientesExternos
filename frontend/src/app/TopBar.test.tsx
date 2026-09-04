/**
 * F6.1 - Top Header Layout (64px, sin sidebar, logo CROVEN, menu por rol).
 */
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { TopBar } from './TopBar';

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
});
