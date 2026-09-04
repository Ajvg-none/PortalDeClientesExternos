/**
 * F6.4 - Formulario de nueva orden: empresa autopoblada solo lectura y
 * resumen modal antes de enviar.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthContext } from '../../../app/AuthContext';
import { NewOrderPage } from './NewOrderPage';

vi.mock('../api/orders', () => ({ ordersApi: { list: vi.fn(), get: vi.fn(), create: vi.fn() } }));
import { ordersApi } from '../api/orders';

function providers() {
  const user = { username: 'optia', role: 'CLIENTE_EXTERNO', companyName: 'Optica Uno', mustChangePassword: false } as never;
  return (
    <AuthContext.Provider value={{ user, token: 't', setSession: vi.fn(), clear: vi.fn() }}>
      <MemoryRouter>
        <NewOrderPage />
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

describe('F6.4 - NewOrderPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('muestra la empresa autopoblada deshabilitada (DEC-3)', () => {
    render(providers());
    const emp = screen.getByLabelText(/empresa/i) as HTMLInputElement;
    expect(emp.value).toBe('Optica Uno');
    expect(emp.disabled).toBe(true);
  });

  it('el boton inicial esta deshabilitado sin N° de orden ni paciente', () => {
    render(providers());
    expect(screen.getByRole('button', { name: /revisar orden/i })).toBeDisabled();
  });

  it('al completar obligatorios abre el modal de resumen y confirma el envio', async () => {
    (ordersApi.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: '9', orderNumber: 'ORD-9' });
    const user = userEvent.setup();
    render(providers());
    await user.type(screen.getByLabelText(/número de orden/i), 'ORD-9');
    await user.type(screen.getByLabelText(/paciente/i), 'Ana');
    await user.click(screen.getByRole('button', { name: /revisar orden/i }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('ORD-9')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /confirmar envío/i }));
    expect(ordersApi.create).toHaveBeenCalledWith(expect.objectContaining({ orderNumber: 'ORD-9', patient: 'Ana' }));
  });
});
