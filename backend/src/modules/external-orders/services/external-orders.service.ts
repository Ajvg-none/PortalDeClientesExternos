import { Prisma, SyncStatus } from '@prisma/client';
import { prisma } from '../../../core/prisma';
import { ApiError } from '../../../core/errors';
import { toCanonicalOrder } from './external-orders.serializer';

/**
 * Servicios del contrato PULL con el middleware (Fase 4, RF-35…52).
 * Reglas R2/R3/PC-1: el GET es de SOLO LECTURA (entregar no sincroniza);
 * el unico cambio de estado lo produce el PUT /sync (idempotente).
 */

export interface PendingFilters {
  limit?: number;
  offset?: number;
}

/**
 * M4.2/M4.3 - GET /pending: SOLO PENDIENTE, orden FIFO (created_at ASC,
 * id ASC) y paginado. NO modifica ningun estado.
 */
export async function listPendingOrders(filters: PendingFilters) {
  const limit = filters.limit ?? 10; // RF-37: valor por defecto 10
  const offset = filters.offset ?? 0;
  const where: Prisma.OrderWhereInput = { syncStatus: SyncStatus.PENDIENTE };
  const [total, rows] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], // FIFO estable (R3)
      skip: offset,
      take: limit,
    }),
  ]);
  return {
    data: rows.map(toCanonicalOrder),
    pagination: { total, limit, offset },
  };
}

/**
 * M4.5 - PUT /:externalId/sync (RF-49…52): marca SINCRONIZADA + synced_at.
 * Busca por external_id (UUID, R5). Idempotente: confirmar una orden ya
 * sincronizada responde 200 sin error ni cambios (PC-1). 404 si no existe.
 */
export async function syncOrderByExternalId(externalId: string) {
  const order = await prisma.order.findUnique({ where: { externalId } });
  if (!order) {
    throw new ApiError(404, 'NOT_FOUND', 'Orden no encontrada');
  }
  if (order.syncStatus === SyncStatus.SINCRONIZADA) {
    // Idempotencia (PC-1): ya estaba sincronizada -> 200, sin tocar synced_at
    return {
      message: 'La orden ya estaba sincronizada',
      externalId: order.externalId,
      status: SyncStatus.SINCRONIZADA,
      syncedAt: order.syncedAt?.toISOString() ?? null,
    };
  }
  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { syncStatus: SyncStatus.SINCRONIZADA, syncedAt: new Date() },
  });
  return {
    message: 'Orden sincronizada',
    externalId: updated.externalId,
    status: updated.syncStatus,
    syncedAt: updated.syncedAt?.toISOString() ?? null,
  };
}
