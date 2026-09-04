/**
 * O3.4 - Proyecciones de orden: resumen optico y detalle (RF-05/RF-16).
 */
import { orderToDetail, opticalSummary } from '../src/modules/orders/services/orders.mapper';
import type { Prisma } from '@prisma/client';

type OrderRow = Prisma.OrderGetPayload<object>;

function row(overrides: Record<string, unknown> = {}): OrderRow {
  return {
    id: 1n,
    externalId: '11111111-1111-1111-1111-111111111111',
    orderNumber: 'ORD-1',
    company: 'Optica Uno',
    patient: 'Juan Perez',
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
    syncStatus: 'PENDIENTE',
    syncedAt: null,
    createdBy: 1n,
    createdAt: new Date('2026-09-01T10:00:00.000Z'),
    updatedAt: new Date('2026-09-01T10:00:00.000Z'),
    ...overrides,
  } as unknown as OrderRow;
}

describe('O3.4 - opticalSummary (RF-05: "OD -2.50 / OI -2.25")', () => {
  test('ambos ojos con esfera', () => {
    expect(opticalSummary(row({ odSphere: -2.5, oiSphere: -2.25 }))).toBe('OD -2.50 / OI -2.25');
  });

  test('solo OD (OI vacio) omite el ojo sin dato', () => {
    expect(opticalSummary(row({ odSphere: 1.75 }))).toBe('OD 1.75');
  });

  test('solo OI', () => {
    expect(opticalSummary(row({ oiSphere: -3.5 }))).toBe('OI -3.50');
  });

  test('sin esferas devuelve cadena vacia', () => {
    expect(opticalSummary(row())).toBe('');
  });
});

describe('O3.4 - orderToDetail (RF-16)', () => {
  test('incluye todos los datos ingresados, agrupados y sin estado de sincronizacion', () => {
    const detail = orderToDetail(
      row({
        odSphere: -2.5,
        odProductCode: 'L1',
        oiCylinder: -0.75,
        treatment: 'OCEAN (AR Azul)',
        mountType: 'METAL ARO COMPLETO',
        mountBrand: 'Ray-Ban',
        observations: 'Entrega urgente',
        colorationUnicolor: true,
      }),
    );
    expect(detail.od.sphere).toBe(-2.5);
    expect(detail.od.productCode).toBe('L1');
    expect(detail.oi.cylinder).toBe(-0.75);
    expect(detail.treatment).toBe('OCEAN (AR Azul)');
    expect(detail.mount).toMatchObject({ type: 'METAL ARO COMPLETO', brand: 'Ray-Ban' });
    expect(detail.coloration.unicolor).toBe(true);
    expect(detail.observations).toBe('Entrega urgente');
    expect(detail.createdAt).toBe('2026-09-01T10:00:00.000Z');
    // Cliente nunca ve estado de sincronizacion (RF-53…56)
    expect(detail).not.toHaveProperty('syncStatus');
    expect(detail).not.toHaveProperty('syncedAt');
  });

  test('campos vacios quedan como null (no como cadena vacia)', () => {
    const detail = orderToDetail(row());
    expect(detail.od.sphere).toBeNull();
    expect(detail.treatment).toBeNull();
    expect(detail.mount.brand).toBeNull();
    expect(detail.coloration.color).toBeNull();
    expect(detail.observations).toBeNull();
  });
});
