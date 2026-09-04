/**
 * F6.3/F6.6/F6.8 - Listado de ordenes por rol (API simulada).
 */
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthContext } from '../../../app/AuthContext';
import { OrdersPage } from './OrdersPage';

vi.mock('../api/orders', () => ({ ordersApi: { list: vi.fn(), get: vi.fn(), create: vi.fn() } }));
import { ordersApi } from '../api/orders';

function providers(role: string) {
  const user = { username: 'u', role, mustChangePassword: false } as never;
  return (
    <AuthContext.Provider value={{ user, token: 't', setSession: vi.fn(), clear: vi.fn() }}>
      <MemoryRouter>
        <OrdersPage />
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

const ROWS = {
  data: [
    { id: '1', orderNumber: 'ORD-A-002', company: 'Optica Uno', patient: 'Maria', createdAt: '2026-09-02T10:00:00Z', summary: 'OD -2.50 / OI -2.25', syncStatus: 'PENDIENTE', pendingSinceMinutes: 120 },
    { id: '2', orderNumber: 'ORD-A-001', company: 'Optica Uno', patient: 'Juan', createdAt: '2026-09-01T10:00:00Z', summary: '' },
  ],
  total: 2,
};

describe('OrdersPage por rol', () => {
  beforeEach(() => vi.clearAllMocks());

  it('cliente: muestra total y resumen, sin estado', async () => {
    (ordersApi.list as ReturnType<typeof vi.fn>).mockResolvedValue(ROWS);
    render(providers('CLIENTE_EXTERNO'));
    expect(await screen.findByText('ORD-A-002')).toBeInTheDocument();
    expect(screen.getByText(/Total de órdenes:/)).toHaveTextContent('2');
    expect(screen.getByText('OD -2.50 / OI -2.25')).toBeInTheDocument();
    expect(screen.queryByText(/PENDIENTE/)).toBeNull();
  });

  it('admin: muestra badge de estado y "pendiente desde"', async () => {
    (ordersApi.list as ReturnType<typeof vi.fn>).mockResolvedValue(ROWS);
    render(providers('ADMINISTRADOR'));
    expect((await screen.findAllByText('PENDIENTE')).length).toBeGreaterThan(0);
    expect(await screen.findByText(/h pendiente/)).toBeInTheDocument();
  });
});
