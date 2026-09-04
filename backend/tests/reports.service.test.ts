/**
 * E5.1/E5.2 - Servicio de reports (dashboard y exportacion) con prisma mockeado.
 */
import { SyncStatus } from '@prisma/client';

jest.mock('../src/core/prisma', () => ({
  prisma: {
    $queryRaw: jest.fn(),
    order: {
      groupBy: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

import { prisma } from '../src/core/prisma';
import { buildOrdersExport, getDashboard } from '../src/modules/reports/services/reports.service';

function orderRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 1n,
    externalId: '11111111-1111-4111-8111-111111111111',
    orderNumber: 'ORD-1',
    company: 'Optica Uno',
    patient: 'Juan',
    odSphere: -2.5,
    odCylinder: null,
    odAxis: null,
    odAddition: null,
    odDnp: null,
    odHeight: null,
    odProductCode: null,
    oiSphere: null,
    oiCylinder: null,
    oiAxis: null,
    oiAddition: null,
    oiDnp: null,
    oiHeight: null,
    oiProductCode: null,
    treatment: null,
    mountType: null,
    mountBrand: null,
    mountModel: null,
    mountColor: null,
    colorationColor: null,
    colorationUnicolor: false,
    colorationDegradadoPercent: null,
    observations: null,
    syncStatus: SyncStatus.PENDIENTE,
    syncedAt: null,
    createdBy: 1n,
    createdAt: new Date('2026-07-15T10:00:00.000Z'),
    updatedAt: new Date('2026-07-15T10:00:00.000Z'),
    ...overrides,
  };
}

describe('E5.1 - getDashboard (RF-33)', () => {
  beforeEach(() => jest.clearAllMocks());

  test('combina meses, top 5 y estado con dataset fijo', async () => {
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([
      { month: '2026-07', total: 2 },
      { month: '2026-08', total: 3 },
    ]);
    (prisma.order.groupBy as jest.Mock)
      .mockResolvedValueOnce([
        { company: 'Optica Uno', _count: { _all: 4 } },
        { company: 'Optica Dos', _count: { _all: 1 } },
      ])
      .mockResolvedValueOnce([]); // sin datos por estado en este caso
    const dash = await getDashboard();
    expect(dash.ordersByMonth).toEqual([
      { month: '2026-07', total: 2 },
      { month: '2026-08', total: 3 },
    ]);
    expect(dash.topClients).toEqual([
      { company: 'Optica Uno', total: 4 },
      { company: 'Optica Dos', total: 1 },
    ]);
    expect(dash.statusSummary).toEqual({ pendiente: 0, sincronizadas: 0, total: 0 });
  });

  test('agrupa pendientes vs sincronizadas y pide top 5 por cantidad', async () => {
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([]);
    (prisma.order.groupBy as jest.Mock)
      .mockResolvedValueOnce([
        { company: 'A', _count: { _all: 10 } },
        { company: 'B', _count: { _all: 8 } },
      ])
      .mockResolvedValueOnce([
        { syncStatus: 'PENDIENTE', _count: { _all: 7 } },
        { syncStatus: 'SINCRONIZADA', _count: { _all: 3 } },
      ]);
    const dash = await getDashboard();
    expect(dash.statusSummary).toEqual({ pendiente: 7, sincronizadas: 3, total: 10 });
    expect(prisma.order.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ by: ['company'], take: 5, orderBy: { _count: { company: 'desc' } } }),
    );
  });
});

describe('E5.2 - buildOrdersExport (RF-34)', () => {
  beforeEach(() => jest.clearAllMocks());

  test('arma el CSV con encabezado + filas, BOM y escapado', async () => {
    (prisma.order.findMany as jest.Mock).mockResolvedValue([
      orderRow({ orderNumber: 'ORD-1', company: 'Optica Uno', syncStatus: SyncStatus.SINCRONIZADA, syncedAt: new Date('2026-07-16T00:00:00.000Z'), observations: 'con, coma' }),
    ]);
    const csv = await buildOrdersExport({ syncStatus: 'SINCRONIZADA' });
    expect(csv.startsWith('\ufeff')).toBe(true);
    expect(csv).toContain('Numero de Orden');
    expect(csv).toContain('ORD-1');
    expect(csv).toContain('"con, coma"');
    expect(csv).toContain('SINCRONIZADA');

    const [args] = (prisma.order.findMany as jest.Mock).mock.calls[0];
    expect(args.where.syncStatus).toBe('SINCRONIZADA');
    expect(args.take).toBe(10000);
    expect(args.orderBy).toEqual([{ createdAt: 'desc' }, { id: 'desc' }]);
  });

  test('filtros de fecha y empresa se traducen al where', async () => {
    (prisma.order.findMany as jest.Mock).mockResolvedValue([]);
    await buildOrdersExport({ from: '2026-07-01', to: '2026-07-31', company: 'Optica' });
    const [args] = (prisma.order.findMany as jest.Mock).mock.calls[0];
    expect(args.where.company).toEqual({ contains: 'Optica', mode: 'insensitive' });
    expect(args.where.createdAt.gte.toISOString()).toBe('2026-07-01T00:00:00.000Z');
    expect(args.where.createdAt.lte.toISOString()).toBe('2026-07-31T23:59:59.999Z');
  });
});
