/**
 * REM-2026-09 (F6.7/RF-23…27): gestion de usuarios - filtros, alta/edicion,
 * reset con confirmacion, baja logica sin DELETE.
 */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthContext } from '../../../app/AuthContext';
import { UsersPage } from './UsersPage';

vi.mock('../api/users', () => ({
  usersApi: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    setStatus: vi.fn(),
    resetPassword: vi.fn(),
  },
}));
import { usersApi } from '../api/users';

const USERS = {
  data: [
    { id: '1', username: 'optia', role: 'CLIENTE_EXTERNO', companyName: 'Optica Uno', email: null, isActive: true, mustChangePassword: true },
    { id: '2', username: 'lab1', role: 'LABORATORIO', companyName: null, email: null, isActive: false, mustChangePassword: false },
  ],
  total: 2,
};

function renderPage() {
  const admin = { username: 'admin', role: 'ADMINISTRADOR', mustChangePassword: false } as never;
  return render(
    <AuthContext.Provider value={{ user: admin, token: 't', setSession: vi.fn(), clear: vi.fn() }}>
      <MemoryRouter>
        <UsersPage />
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe('F6.7 - UsersPage (REM-2026-09)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (usersApi.list as ReturnType<typeof vi.fn>).mockResolvedValue(USERS);
  });

  it('lista usuarios con enlace a alta y sin accion de borrado fisico', async () => {
    renderPage();
    expect(await screen.findByText('optia')).toBeInTheDocument();
    expect(screen.getByText('lab1')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /nuevo usuario/i })).toBeInTheDocument();
    expect(screen.queryByText(/eliminar/i)).toBeNull();
  });

  it('filtra por nombre/rol/estado con Aplicar y Limpiar', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('optia');

    await user.type(screen.getByLabelText(/nombre \/ empresa/i), 'optia');
    await user.selectOptions(screen.getByLabelText('Rol'), 'CLIENTE_EXTERNO');
    await user.selectOptions(screen.getByLabelText('Estado'), 'true');
    await user.click(screen.getByRole('button', { name: /aplicar filtros/i }));

    const calls = (usersApi.list as ReturnType<typeof vi.fn>).mock.calls;
    const last = calls[calls.length - 1][0] as Record<string, string>;
    expect(last.q).toBe('optia');
    expect(last.role).toBe('CLIENTE_EXTERNO');
    expect(last.isActive).toBe('true');
  });

  it('dar de baja pide confirmacion y llama al endpoint de estado (sin DELETE)', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('optia');

    const rowButtons = screen.getAllByRole('button', { name: /dar de baja/i });
    await user.click(rowButtons[rowButtons.length - 1]); // ultima fila activa
    const dialog = screen.getByRole('dialog');
    const confirm = within(dialog).getByRole('button', { name: /dar de baja/i });
    await user.click(confirm);
    expect(usersApi.setStatus).toHaveBeenCalledWith('1', false);
  });

  it('reset de contrasena requiere la nueva contrasena y confirma', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('optia');

    await user.click(screen.getAllByRole('button', { name: /reset contraseña/i })[0]);
    const pass = screen.getByLabelText(/nueva contraseña/i);
    await user.type(pass, 'Nueva123');
    await user.click(screen.getByRole('button', { name: /restablecer/i }));
    expect(usersApi.resetPassword).toHaveBeenCalledWith('1', 'Nueva123');
  });
});
