/**
 * O3.1-O3.5 - Servicio de ordenes con prisma mockeado.
 */
import { Prisma } from '@prisma/client';

jest.mock('../src/core/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    order: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
    },
  },
}));

import { prisma } from '../src/core/prisma';
import { createOrder, getOwnOrder, listOwnOrders } from '../src/modules/orders/services/orders.service';

const USER_ID = 7n;

function orderRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 1n,
    externalId: '11111111-1111-1111-1111-111111111111',
    orderNumber: 'ORD-1',
    company: 'Optica Uno',
    patient: 'Juan Perez',
    odSphere: -2.5,
    odCylinder: null,
    odAxis: null,
    odAddition: null,
    odDnp: null,
    odHeight: null,
    odProductCode: null,
    oiSphere: -2.25,
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
    syncStatus: 'PENDIENTE',
    syncedAt: null,
    createdBy: USER_ID,
    createdAt: new Date('2026-09-01T10:00:00.000Z'),
    updatedAt: new Date('2026-09-01T10:00:00.000Z'),
    ...overrides,
  };
}

describe('O3.3 - createOrder (DEC-3: company autopoblada)', () => {
  beforeEach(() => jest.clearAllMocks());

  test('autopobla company desde users.company_name e ignora cualquier company del payload', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ companyName: 'Optica Uno' });
    (prisma.order.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.order.create as jest.Mock).mockResolvedValue(orderRow());

    const input = {
      orderNumber: ' ORD-1 ',
      patient: ' Juan ',
      company: 'EMPRESA HACK', // el cliente no puede definirla (DEC-3)
      odSphere: '-2.50',
      treatment: '',
    };
    const detail = await createOrder(USER_ID, input as never);

    const [args] = (prisma.order.create as jest.Mock).mock.calls[0];
    expect(args.data.company).toBe('Optica Uno');
    expect(args.data.orderNumber).toBe('ORD-1'); // trim
    expect(args.data.odSphere).toBe(-2.5); // normalizacion numerica
    expect(args.data.treatment).toBeNull(); // vacio -> null
    expect(args.data.createdBy).toBe(USER_ID);
    expect(detail.company).toBe('Optica Uno');
  });

  test('usuario sin empresa configurada responde 400 (DEC-3)', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ companyName: null });
    await expect(createOrder(USER_ID, { orderNumber: 'ORD-1', patient: 'Juan' })).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  test('numero de orden duplicado responde 409 ORDER_ALREADY_EXISTS (pre-check)', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ companyName: 'Optica Uno' });
    (prisma.order.findFirst as jest.Mock).mockResolvedValue({ id: 5n });
    await expect(createOrder(USER_ID, { orderNumber: 'ORD-1', patient: 'Juan' })).rejects.toMatchObject({
      statusCode: 409,
      code: 'ORDER_ALREADY_EXISTS',
    });
    expect(prisma.order.create).not.toHaveBeenCalled();
  });

  test('carrera concurrente: error P2002 del constraint tambien responde 409', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ companyName: 'Optica Uno' });
    (prisma.order.findFirst as jest.Mock).mockResolvedValue(null);
    const p2002 = new Prisma.PrismaClientKnownRequestError('Unique failed', {
      code: 'P2002',
      clientVersion: 'test',
    });
    (prisma.order.create as jest.Mock).mockRejectedValue(p2002);
    await expect(createOrder(USER_ID, { orderNumber: 'ORD-1', patient: 'Juan' })).rejects.toMatchObject({
      statusCode: 409,
      code: 'ORDER_ALREADY_EXISTS',
    });
  });
});

describe('O3.5 - listOwnOrders / getOwnOrder', () => {
  beforeEach(() => jest.clearAllMocks());

  test('lista SOLO las ordenes del usuario, ordenadas mas reciente primero, con total', async () => {
    (prisma.order.count as jest.Mock).mockResolvedValue(2);
    (prisma.order.findMany as jest.Mock).mockResolvedValue([orderRow(), orderRow({ id: 2n })]);

    const result = await listOwnOrders(USER_ID, { limit: 20, offset: 0 });
    expect(result.total).toBe(2);
    const where = (prisma.order.findMany as jest.Mock).mock.calls[0][0].where;
    expect(where.createdBy).toBe(USER_ID);
    const [args] = (prisma.order.findMany as jest.Mock).mock.calls[0];
    expect(args.orderBy).toEqual([{ createdAt: 'desc' }, { id: 'desc' }]);
    expect(result.data[0]).toHaveProperty('summary');
    expect(result.data[0]).not.toHaveProperty('syncStatus');
  });

  test('filtro de fechas: from/to (solo fecha) delimitan el dia completo', async () => {
    (prisma.order.count as jest.Mock).mockResolvedValue(0);
    (prisma.order.findMany as jest.Mock).mockResolvedValue([]);
    await listOwnOrders(USER_ID, { from: '2026-09-01', to: '2026-09-02' });
    const where = (prisma.order.findMany as jest.Mock).mock.calls[0][0].where;
    expect(where.createdAt.gte.toISOString()).toBe('2026-09-01T00:00:00.000Z');
    expect(where.createdAt.lte.toISOString()).toBe('2026-09-02T23:59:59.999Z');
  });

  test('detalle: una orden de OTRO cliente responde 404 (sin fugas)', async () => {
    (prisma.order.findUnique as jest.Mock).mockResolvedValue(orderRow({ createdBy: 999n }));
    await expect(getOwnOrder(USER_ID, 1n)).rejects.toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
  });

  test('detalle: el dueno obtiene el detalle completo', async () => {
    (prisma.order.findUnique as jest.Mock).mockResolvedValue(orderRow());
    const detail = await getOwnOrder(USER_ID, 1n);
    expect(detail.orderNumber).toBe('ORD-1');
    expect(detail.od.sphere).toBe(-2.5);
    expect(detail).not.toHaveProperty('syncStatus');
  });
});
