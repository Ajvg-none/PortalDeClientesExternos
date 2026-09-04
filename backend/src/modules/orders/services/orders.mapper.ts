import { Prisma } from '@prisma/client';

/**
 * Proyecciones de orden (O3.4, RF-05/RF-16).
 * NUNCA exponen estado de sincronizacion (RF-53…56: cliente no lo ve).
 */

type OrderRow = Prisma.OrderGetPayload<{}>;

function num(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

function fixed(value: number | null): string | null {
  return value === null ? null : value.toFixed(2);
}

/**
 * RF-05 - Resumen rapido de datos opticos, p. ej. "OD -2.50 / OI -2.25".
 * Maneja ojos vacios: si un ojo no tiene esfera, se omite esa parte.
 */
export function opticalSummary(order: Pick<OrderRow, 'odSphere' | 'oiSphere'>): string {
  const parts: string[] = [];
  const od = fixed(num(order.odSphere));
  const oi = fixed(num(order.oiSphere));
  if (od !== null) parts.push(`OD ${od}`);
  if (oi !== null) parts.push(`OI ${oi}`);
  return parts.join(' / ');
}

/** RF-16 - Detalle completo (todos los datos ingresados, sin sync_status). */
export function orderToDetail(order: OrderRow) {
  return {
    id: String(order.id),
    externalId: order.externalId,
    orderNumber: order.orderNumber,
    company: order.company,
    patient: order.patient,
    createdAt: order.createdAt.toISOString(),
    od: {
      sphere: num(order.odSphere),
      cylinder: num(order.odCylinder),
      axis: num(order.odAxis),
      addition: num(order.odAddition),
      dnp: num(order.odDnp),
      height: num(order.odHeight),
      productCode: order.odProductCode ?? null,
    },
    oi: {
      sphere: num(order.oiSphere),
      cylinder: num(order.oiCylinder),
      axis: num(order.oiAxis),
      addition: num(order.oiAddition),
      dnp: num(order.oiDnp),
      height: num(order.oiHeight),
      productCode: order.oiProductCode ?? null,
    },
    treatment: order.treatment ?? null,
    mount: {
      type: order.mountType ?? null,
      brand: order.mountBrand ?? null,
      model: order.mountModel ?? null,
      color: order.mountColor ?? null,
    },
    coloration: {
      color: order.colorationColor ?? null,
      unicolor: order.colorationUnicolor,
      degradadoPercent: num(order.colorationDegradadoPercent),
    },
    observations: order.observations ?? null,
    summary: opticalSummary(order),
  };
}

/** RF-05/RF-19 - Item compacto para listados. */
export function orderToListItem(order: OrderRow) {
  return {
    id: String(order.id),
    orderNumber: order.orderNumber,
    company: order.company,
    patient: order.patient,
    createdAt: order.createdAt.toISOString(),
    summary: opticalSummary(order),
  };
}
