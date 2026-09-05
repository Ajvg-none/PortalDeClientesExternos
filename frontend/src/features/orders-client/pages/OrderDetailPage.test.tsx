/**
 * REM-2026-09 (F6.5/F6.8, RF-16/31): el detalle muestra TODOS los datos
 * ingresados, admin ve estado + fecha de sincronizacion, y no existen
 * acciones de edicion para ningun rol.
 */
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthContext } from '../../../app/AuthContext';
import { OrderDetailPage } from './OrderDetailPage';

vi.mock('../api/orders', () => ({
  ordersApi: { list: vi.fn(), get: vi.fn(), create: vi.fn(), checkOrderNumber: vi.fn() },
}));
import { ordersApi } from '../api/orders';

const ORDER = {
  id: '1',
  orderNumber: 'ORD-9',
  company: 'Optica Uno',
  patient: 'Ana',
  createdAt: '2026-09-01T10:00:00Z',
  summary: 'OD -2.50 / OI -2.25',
  externalId: 'uuid-1',
  syncStatus: 'SINCRONIZADA',
  syncedAt: '2026-09-02T12:00:00Z',
  pendingSinceMinutes: null,
  od: { sphere: -2.5, cylinder: -0.75, axis: 180, addition: 2, dnp: 30.5, height: 22, productCode: 'LENTE-1' },
  oi: { sphere: -2.25, cylinder: -0.5, axis: 175, addition: 2, dnp: 31, height: 21, productCode: 'LENTE-2' },
  treatment: 'OCEAN (AR Azul)',
  mount: { type: 'METAL ARO COMPLETO', brand: 'Ray-Ban', model: 'RB-123', color: 'Negro' },
  coloration: { color: 'Azul', unicolor: true, degradadoPercent: 20 },
  observations: 'Entregar antes de las 18h',
};

function renderDetail(role: string) {
  const user = { username: 'u', role, mustChangePassword: false } as never;
  (ordersApi.get as ReturnType<typeof vi.fn>).mockResolvedValue(ORDER);
  return render(
    <AuthContext.Provider value={{ user, token: 't', setSession: vi.fn(), clear: vi.fn() }}>
      <MemoryRouter initialEntries={['/ordenes/1']}>
        <Routes>
          <Route path="/ordenes/:id" element={<OrderDetailPage />} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

describe('OrderDetailPage (REM-2026-09)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('cliente: muestra todos los campos ingresados sin estado de sincronizacion', async () => {
    renderDetail('CLIENTE_EXTERNO');
    expect(await screen.findByText('Orden ORD-9')).toBeInTheDocument();
    expect(screen.getByText('Ana')).toBeInTheDocument();
    expect(screen.getByText('LENTE-1')).toBeInTheDocument();
    expect(screen.getByText('OCEAN (AR Azul)')).toBeInTheDocument();
    expect(screen.getByText('METAL ARO COMPLETO')).toBeInTheDocument();
    expect(screen.getByText('Ray-Ban')).toBeInTheDocument();
    expect(screen.getByText('RB-123')).toBeInTheDocument();
    expect(screen.getByText('Entregar antes de las 18h')).toBeInTheDocument();
    expect(screen.queryByText('SINCRONIZADA')).toBeNull();
  });

  it('admin: muestra estado y fecha de sincronizacion, y no hay acciones de edicion', async () => {
    renderDetail('ADMINISTRADOR');
    expect(await screen.findByText('SINCRONIZADA')).toBeInTheDocument();
    expect(screen.getByText(/sincronizada el/i)).toBeInTheDocument();
    // solo lectura: ningun boton de editar/cancelar/eliminar
    const buttons = screen.queryAllByRole('button');
    expect(buttons).toHaveLength(0);
  });
});
