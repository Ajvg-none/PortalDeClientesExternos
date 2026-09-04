/**
 * M4.4 - Serializador canonico del contrato (RF-48 + R4/R5/PC-4).
 */
import { Prisma } from '@prisma/client';
import { toCanonicalOrder } from '../src/modules/external-orders/services/external-orders.serializer';

type OrderRow = Prisma.OrderGetPayload<{}>;

function row(overrides: Record<string, unknown> = {}): OrderRow {
  return {
    id: 1n,
    externalId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    orderNumber: 'ORDEN-001',
    company: 'Optica El Centro',
    patient: 'Juan Perez',
    odSphere: -2.5,
    odCylinder: -0.75,
    odAxis: 180,
    odAddition: 2,
    odDnp: 30.5,
    odHeight: 22,
    odProductCode: 'LENTE-123',
    oiSphere: -2.25,
    oiCylinder: -0.5,
    oiAxis: 175,
    oiAddition: 2,
    oiDnp: 31,
    oiHeight: 21,
    oiProductCode: 'LENTE-456',
    treatment: 'OCEAN',
    mountType: 'METAL ARO COMPLETO',
    mountBrand: 'Ray-Ban',
    mountModel: 'RB-123',
    mountColor: 'Negro',
    colorationColor: 'Azul',
    colorationUnicolor: true,
    colorationDegradadoPercent: null,
    observations: 'Cliente solicita entrega urgente',
    syncStatus: 'PENDIENTE',
    syncedAt: null,
    createdBy: 1n,
    createdAt: new Date('2026-08-28T10:30:00.000Z'),
    updatedAt: new Date('2026-08-28T10:30:00.000Z'),
    ...overrides,
  } as unknown as OrderRow;
}

describe('M4.4 - toCanonicalOrder (RF-48 con R4/PC-4)', () => {
  test('mapea todos los campos poblabes + constantes', () => {
    const c = toCanonicalOrder(row());
    expect(c).toEqual({
      externalId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', // UUID del portal (R5)
      number: 'ORDEN-001',
      date: '2026-08-28T10:30:00.000Z',
      orderFromSupplier: true,
      status: 'CONFIRMED',
      customer: { company: 'Optica El Centro', patient: 'Juan Perez' },
      opticalDataOD: { sphere: -2.5, cylinder: -0.75, axis: 180, addition: 2, dnp: 30.5, height: 22, productCode: 'LENTE-123' },
      opticalDataOI: { sphere: -2.25, cylinder: -0.5, axis: 175, addition: 2, dnp: 31, height: 21, productCode: 'LENTE-456' },
      treatment: 'OCEAN',
      mount: { type: 'METAL ARO COMPLETO', brand: 'Ray-Ban', model: 'RB-123', color: 'Negro' },
      coloration: { color: 'Azul', unicolor: true, degradadoPercent: null },
      observations: 'Cliente solicita entrega urgente',
    });
  });

  test('NO entrega warehouse, items[], issuedOrderId ni issuedInvoiceId (PC-4)', () => {
    const c = toCanonicalOrder(row()) as unknown as Record<string, unknown>;
    expect(c).not.toHaveProperty('warehouse');
    expect(c).not.toHaveProperty('items');
    expect(c).not.toHaveProperty('issuedOrderId');
    expect(c).not.toHaveProperty('issuedInvoiceId');
  });

  test('campos opcionales vacios quedan como null', () => {
    const c = toCanonicalOrder(row({ odSphere: null, odProductCode: null, treatment: null, mountType: null, observations: null }));
    expect(c.opticalDataOD.sphere).toBeNull();
    expect(c.treatment).toBeNull();
    expect(c.mount.type).toBeNull();
    expect(c.observations).toBeNull();
  });
});
