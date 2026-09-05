/**
 * REM-2026-09 - Ruteo de sesion a nivel de App:
 * - REM-1: con flag de primer acceso, /cambiar-contrasena RENDERIZA el form
 *   (no un loop de redireccion a si misma) y el resto redirige alli.
 * - REM-3: la sesion se restaura desde storage al recargar (sin logout).
 */
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { session } from './core/http';

const CLIENTE = {
  id: '1',
  username: 'cliente1',
  email: null,
  role: 'CLIENTE_EXTERNO' as const,
  companyName: 'Optica Demo',
  isActive: true,
  mustChangePassword: true,
};

function okJson(payload: unknown) {
  return {
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => payload,
    text: async () => JSON.stringify(payload),
  } as unknown as Response;
}

function go(path: string) {
  window.history.replaceState({}, '', path);
}

describe('App - sesion y primer acceso', () => {
  beforeEach(() => {
    session.clear();
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(okJson({ data: [], total: 0 }))));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    session.clear();
    window.history.replaceState({}, '', '/');
  });

  it('REM-1: flag TRUE en /cambiar-contrasena renderiza el formulario (sin loop)', async () => {
    session.setToken('t');
    session.setUser({ ...CLIENTE, mustChangePassword: true });
    go('/cambiar-contrasena');
    render(<App />);
    expect(await screen.findByText(/cambio de contraseña/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /guardar y continuar/i })).toBeInTheDocument();
  });

  it('REM-1: flag TRUE en cualquier otra ruta redirige a /cambiar-contrasena', async () => {
    session.setToken('t');
    session.setUser({ ...CLIENTE, mustChangePassword: true });
    go('/');
    render(<App />);
    expect(await screen.findByText(/cambio de contraseña/i)).toBeInTheDocument();
  });

  it('REM-1: sin flag en /cambiar-contrasena redirige al dashboard', async () => {
    session.setToken('t');
    session.setUser({ ...CLIENTE, mustChangePassword: false });
    go('/cambiar-contrasena');
    render(<App />);
    expect(await screen.findByText(/total de órdenes/i)).toBeInTheDocument();
  });

  it('REM-3: con token y usuario persistidos la recarga mantiene la sesion', async () => {
    session.setToken('t');
    session.setUser({ ...CLIENTE, mustChangePassword: false });
    go('/ordenes');
    render(<App />);
    // Llega al listado (protegido) sin pasar por /login
    expect(await screen.findByText(/total de órdenes/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /ingresar/i })).toBeNull();
  });

  it('REM-3: con token pero sin usuario persistido redirige al login', async () => {
    session.setToken('t');
    go('/ordenes');
    render(<App />);
    expect(await screen.findByRole('button', { name: /ingresar/i })).toBeInTheDocument();
  });

  it('F6.1/REM-2026-09: ruta inexistente muestra la pantalla 404', async () => {
    session.setToken('t');
    session.setUser({ ...CLIENTE, mustChangePassword: false });
    go('/ruta-que-no-existe');
    render(<App />);
    expect(await screen.findByText('Página no encontrada.')).toBeInTheDocument();
  });
});
