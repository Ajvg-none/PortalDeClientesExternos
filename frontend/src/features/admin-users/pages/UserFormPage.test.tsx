/**
 * REM-2026-09 (F6.7/RF-24/25): alta y edicion de usuarios por el administrador
 * (username obligatorio, empresa requerida para CLIENTE_EXTERNO, DEC-2/DEC-3).
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthContext } from '../../../app/AuthContext';
import { UserFormPage } from './UserFormPage';

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

function renderForm(entry: string) {
  const admin = { username: 'admin', role: 'ADMINISTRADOR', mustChangePassword: false } as never;
  return render(
    <AuthContext.Provider value={{ user: admin, token: 't', setSession: vi.fn(), clear: vi.fn() }}>
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path="/usuarios/nuevo" element={<UserFormPage />} />
          <Route path="/usuarios/:id/editar" element={<UserFormPage />} />
          <Route path="/usuarios" element={<div>LISTADO_USUARIOS</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe('F6.7 - UserFormPage (REM-2026-09)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('alta: exige username, password y empresa para cliente; crea al guardar', async () => {
    const user = userEvent.setup();
    renderForm('/usuarios/nuevo');
    await user.type(screen.getByLabelText(/username/i), 'nuevo');
    await user.type(screen.getByLabelText(/contraseña temporal/i), 'Cambiar123!');
    await user.type(screen.getByLabelText(/empresa \/ cliente/i), 'Optica Nueve');
    await user.click(screen.getByRole('button', { name: /crear usuario/i }));
    expect(usersApi.create).toHaveBeenCalledWith(
      expect.objectContaining({ username: 'nuevo', role: 'CLIENTE_EXTERNO', companyName: 'Optica Nueve' }),
    );
  });

  it('alta: sin empresa para CLIENTE_EXTERNO el boton queda deshabilitado', async () => {
    const user = userEvent.setup();
    renderForm('/usuarios/nuevo');
    await user.type(screen.getByLabelText(/username/i), 'nuevo');
    await user.type(screen.getByLabelText(/contraseña temporal/i), 'Cambiar123!');
    expect(screen.getByRole('button', { name: /crear usuario/i })).toBeDisabled();
    await user.type(screen.getByLabelText(/empresa \/ cliente/i), 'Optica Nueve');
    expect(screen.getByRole('button', { name: /crear usuario/i })).toBeEnabled();
  });

  it('edicion: precarga el usuario y actualiza sin pedir password', async () => {
    const user = userEvent.setup();
    (usersApi.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: '9',
      username: 'existente',
      role: 'LABORATORIO',
      companyName: null,
      email: 'a@b.cl',
      isActive: true,
      mustChangePassword: false,
    });
    renderForm('/usuarios/9/editar');
    expect(await screen.findByDisplayValue('existente')).toBeInTheDocument();
    expect(screen.queryByLabelText(/contraseña temporal/i)).toBeNull();

    await user.clear(screen.getByLabelText(/username/i));
    await user.type(screen.getByLabelText(/username/i), 'renombrado');
    await user.click(screen.getByRole('button', { name: /guardar cambios/i }));
    expect(usersApi.update).toHaveBeenCalledWith('9', expect.objectContaining({ username: 'renombrado', role: 'LABORATORIO' }));
  });
});
