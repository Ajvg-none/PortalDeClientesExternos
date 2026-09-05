/**
 * F6.2 - Login: redireccion por username, flag de primer acceso y error.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthContext } from '../../../app/AuthContext';
import { LoginPage } from './LoginPage';

vi.mock('../../../core/http', () => ({
  http: { post: vi.fn() },
  session: { getToken: vi.fn(() => null), setToken: vi.fn(), setUser: vi.fn(), clear: vi.fn() },
}));
import { http } from '../../../core/http';

function providers(setSession = vi.fn()) {
  return (
    <AuthContext.Provider
      value={{ user: null, token: null, setSession, clear: vi.fn() }}
    >
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

describe('F6.2 - LoginPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('muestra el formulario con usuario y contraseña', () => {
    render(providers());
    expect(screen.getByLabelText(/usuario/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/contraseña/i)).toBeInTheDocument();
  });

  it('ante credenciales invalidas muestra el error de la API', async () => {
    (http.post as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Credenciales invalidas'));
    const user = userEvent.setup();
    render(providers());
    await user.type(screen.getByLabelText(/usuario/i), 'admin');
    await user.type(screen.getByLabelText(/contraseña/i), 'mala');
    await user.click(screen.getByRole('button', { name: /ingresar/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Credenciales invalidas');
  });

  it('con credenciales validas y flag activo, guarda sesion y navega a cambio de contraseña', async () => {
    const setSession = vi.fn();
    const user = userEvent.setup();
    (http.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      token: 't',
      user: { username: 'cliente1', role: 'CLIENTE_EXTERNO', mustChangePassword: true },
    });
    render(providers(setSession));
    await user.type(screen.getByLabelText(/usuario/i), 'cliente1');
    await user.type(screen.getByLabelText(/contraseña/i), 'Cambiar123!');
    await user.click(screen.getByRole('button', { name: /ingresar/i }));
    await vi.waitFor(() => expect(setSession).toHaveBeenCalledWith('t', expect.objectContaining({ mustChangePassword: true })));
  });
});
