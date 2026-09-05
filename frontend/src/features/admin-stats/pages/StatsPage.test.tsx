/**
 * REM-2026-09 (F6.9/RF-34): la exportacion CSV descarga con fetch autenticado
 * (header Authorization), no con window.open (que responderia 401).
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { session } from '../../../core/http';
import { reportsApi } from '../api/reports';
import { StatsPage } from './StatsPage';

vi.mock('../api/reports', () => ({ reportsApi: { dashboard: vi.fn() } }));

const DASH = {
  ordersByMonth: [{ month: '2026-08', total: 3 }],
  topClients: [{ company: 'Optica Uno', total: 3 }],
  statusSummary: { pendiente: 1, sincronizadas: 2, total: 3 },
};

function okBlob() {
  return {
    ok: true,
    status: 200,
    headers: new Headers(),
    blob: async () => new Blob(['data']),
  } as unknown as Response;
}

describe('F6.9 - StatsPage export', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (reportsApi.dashboard as ReturnType<typeof vi.fn>).mockResolvedValue(DASH);
    session.setToken('jwt-token');
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(okBlob())));
    vi.stubGlobal('URL', { ...URL, createObjectURL: vi.fn(() => 'blob:mock'), revokeObjectURL: vi.fn() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    session.clear();
  });

  it('exporta el CSV enviando el token en el header Authorization', async () => {
    const user = userEvent.setup();
    render(<StatsPage />);
    await screen.findByText('Órdenes por mes');
    await user.click(screen.getByRole('button', { name: /exportar csv/i }));

    const fetchMock = fetch as unknown as ReturnType<typeof vi.fn>;
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, opts] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/api/reports/orders/export');
    expect((opts.headers as Record<string, string>).Authorization).toBe('Bearer jwt-token');
  });
});
