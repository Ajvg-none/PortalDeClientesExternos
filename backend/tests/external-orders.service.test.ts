/**
 * M4.2/M4.3/M4.5 - Servicio del contrato PULL con prisma mockeado.
 */
import { SyncStatus } from '@prisma/client';

jest.mock('../src/core/prisma', () => ({
  prisma: {
    order: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import { prisma } from '../src/core/prisma';
import { listPendingOrders, syncOrderByExternalId } from '../src/modules/external-orders/services/external-orders.service';

function orderRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 1n,
    externalId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    orderNumber: 'ORD-1',
    company: 'Optica Uno',
    patient: 'Juan',
    odSphere: null,
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
    createdBy: 7n,
    createdAt: new Date('2026-08-01T10:00:00.000Z'),
    updatedAt: new Date('2026-08-01T10:00:00.000Z'),
    ...overrides,
  };
}

describe('M4.2/M4.3 - listPendingOrders (RF-35…38)', () => {
  beforeEach(() => jest.clearAllMocks());

  test('devuelve SOLO PENDIENTE en orden FIFO (created_at ASC, id ASC) y NO modifica estados', async () => {
    (prisma.order.count as jest.Mock).mockResolvedValue(2);
    (prisma.order.findMany as jest.Mock).mockResolvedValue([orderRow(), orderRow({ id: 2n })]);

    const result = await listPendingOrders({});
    expect(result.pagination).toEqual({ total: 2, limit: 10, offset: 0 }); // RF-37 default 10

    const where = (prisma.order.findMany as jest.Mock).mock.calls[0][0].where;
    expect(where.syncStatus).toBe(SyncStatus.PENDIENTE);
    const [args] = (prisma.order.findMany as jest.Mock).mock.calls[0];
    expect(args.orderBy).toEqual([{ createdAt: 'asc' }, { id: 'asc' }]); // FIFO (R3)
    expect(result.data).toHaveLength(2);

    // GET es read-only (R2/PC-1): nunca se llama a update
    expect(prisma.order.update).not.toHaveBeenCalled();
  });

  test('respeta limit/offset de la paginacion', async () => {
    (prisma.order.count as jest.Mock).mockResolvedValue(25);
    (prisma.order.findMany as jest.Mock).mockResolvedValue([]);
    await listPendingOrders({ limit: 5, offset: 10 });
    const [args] = (prisma.order.findMany as jest.Mock).mock.calls[0];
    expect(args.skip).toBe(10);
    expect(args.take).toBe(5);
  });
});

describe('M4.5 - syncOrderByExternalId (RF-49…52)', () => {
  beforeEach(() => jest.clearAllMocks());

  test('orden inexistente responde 404 NOT_FOUND', async () => {
    (prisma.order.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(syncOrderByExternalId('no-existe')).rejects.toMatchObject({ statusCode: 404 });
    expect(prisma.order.findUnique).toHaveBeenCalledWith({
      where: { externalId: 'no-existe' },
    });
  });

  test('marca SINCRONIZADA y registra synced_at', async () => {
    (prisma.order.findUnique as jest.Mock).mockResolvedValue(orderRow());
    (prisma.order.update as jest.Mock).mockResolvedValue(
      orderRow({ syncStatus: SyncStatus.SINCRONIZADA, syncedAt: new Date('2026-09-01T12:00:00.000Z') }),
    );
    const result = await syncOrderByExternalId('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    const [args] = (prisma.order.update as jest.Mock).mock.calls[0];
    expect(args.data.syncStatus).toBe(SyncStatus.SINCRONIZADA);
    expect(args.data.syncedAt).toBeInstanceOf(Date);
    expect(result.status).toBe('SINCRONIZADA');
    expect(result.syncedAt).toBe('2026-09-01T12:00:00.000Z');
  });

  test('idempotente: una orden ya sincronizada responde 200 sin llamar a update (PC-1)', async () => {
    (prisma.order.findUnique as jest.Mock).mockResolvedValue(
      orderRow({ syncStatus: SyncStatus.SINCRONIZADA, syncedAt: new Date('2026-09-01T12:00:00.000Z') }),
    );
    const result = await syncOrderByExternalId('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
    expect(result.message).toContain('ya estaba sincronizada');
    expect(prisma.order.update).not.toHaveBeenCalled();
  });
});
