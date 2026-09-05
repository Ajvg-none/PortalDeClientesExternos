import { Prisma } from '@prisma/client';
import { toNumber as num } from '../../../core/num';
import { opticalSummary } from '../../../core/order-format';
// Re-export para compatibilidad de callers (tests) que importan el resumen
// desde el mapper de orders.
export { opticalSummary } from '../../../core/order-format';

/**
 * Proyecciones de orden (O3.4, RF-05/RF-16).
 * NUNCA exponen estado de sincronizacion (RF-53…56: cliente no lo ve).
 */

type OrderRow = Prisma.OrderGetPayload<{}>;

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

/** RF-05/RF-19 - Item compacto para listados (cliente y laboratorio: sin estado). */
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

/**
 * M4.6 - Antiguedad "pendiente desde" (PC-1c), en minutos enteros desde la
 * creacion. Solo tiene sentido mientras la orden siga PENDIENTE.
 */
export function pendingSinceMinutes(createdAt: Date, now: number = Date.now()): number {
  return Math.max(0, Math.floor((now - createdAt.getTime()) / 60_000));
}

/** RF-29/M4.7 - Item del listado maestro del ADMINISTRADOR (con estado). */
export function orderToAdminListItem(order: OrderRow, now?: number) {
  return {
    ...orderToListItem(order),
    syncStatus: order.syncStatus,
    syncedAt: order.syncedAt ? order.syncedAt.toISOString() : null,
    pendingSinceMinutes:
      order.syncStatus === 'PENDIENTE' ? pendingSinceMinutes(order.createdAt, now) : null,
  };
}

/** RF-31/M4.7 - Detalle del ADMINISTRADOR: igual que el detalle completo + estado. */
export function orderToAdminDetail(order: OrderRow, now?: number) {
  return {
    ...orderToDetail(order),
    syncStatus: order.syncStatus,
    syncedAt: order.syncedAt ? order.syncedAt.toISOString() : null,
    pendingSinceMinutes:
      order.syncStatus === 'PENDIENTE' ? pendingSinceMinutes(order.createdAt, now) : null,
  };
}
