import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/prisma';
import { ApiError } from '../../../core/errors';
import {
  orderToAdminDetail,
  orderToAdminListItem,
  orderToDetail,
  orderToListItem,
} from './orders.mapper';

/**
 * Servicios del dominio de ordenes del cliente (Fase 3, RF-05…RF-17).
 * - company se AUTOPOBLA de la cuenta del usuario autenticado (DEC-3) y se
 *   guarda como snapshot al momento de la creacion.
 * - Unicidad GLOBAL del order_number (RF-10/DEC-1): pre-check + constraint
 *   (P2002) para cubrir la carrera concurrente.
 * - Las ordenes son INMUTABLES tras su creacion (RF-17): no hay update/delete.
 */

export interface CreateOrderInput {
  orderNumber?: string;
  patient?: string;
  odSphere?: unknown;
  odCylinder?: unknown;
  odAxis?: unknown;
  odAddition?: unknown;
  odDnp?: unknown;
  odHeight?: unknown;
  odProductCode?: unknown;
  oiSphere?: unknown;
  oiCylinder?: unknown;
  oiAxis?: unknown;
  oiAddition?: unknown;
  oiDnp?: unknown;
  oiHeight?: unknown;
  oiProductCode?: unknown;
  treatment?: unknown;
  mountType?: unknown;
  mountBrand?: unknown;
  mountModel?: unknown;
  mountColor?: unknown;
  colorationColor?: unknown;
  colorationUnicolor?: unknown;
  colorationDegradadoPercent?: unknown;
  observations?: unknown;
}

export interface ListOrdersFilters {
  from?: string;
  to?: string;
  company?: string;
  syncStatus?: 'PENDIENTE' | 'SINCRONIZADA';
  limit?: number;
  offset?: number;
}

/** M4.6: roles que visualizan TODAS las ordenes (solo lectura). */
export type ViewRole = 'LABORATORIO' | 'ADMINISTRADOR';

function cleanText(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const s = String(value).trim();
  return s.length > 0 ? s : null;
}

function cleanNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

function cleanBool(value: unknown): boolean {
  return value === true || value === 'true';
}

function toData(input: CreateOrderInput, company: string, userId: bigint): Prisma.OrderUncheckedCreateInput {
  return {
    orderNumber: String(input.orderNumber).trim(),
    company,
    patient: String(input.patient).trim(),
    odSphere: cleanNumber(input.odSphere),
    odCylinder: cleanNumber(input.odCylinder),
    odAxis: cleanNumber(input.odAxis),
    odAddition: cleanNumber(input.odAddition),
    odDnp: cleanNumber(input.odDnp),
    odHeight: cleanNumber(input.odHeight),
    odProductCode: cleanText(input.odProductCode),
    oiSphere: cleanNumber(input.oiSphere),
    oiCylinder: cleanNumber(input.oiCylinder),
    oiAxis: cleanNumber(input.oiAxis),
    oiAddition: cleanNumber(input.oiAddition),
    oiDnp: cleanNumber(input.oiDnp),
    oiHeight: cleanNumber(input.oiHeight),
    oiProductCode: cleanText(input.oiProductCode),
    treatment: cleanText(input.treatment),
    mountType: cleanText(input.mountType),
    mountBrand: cleanText(input.mountBrand),
    mountModel: cleanText(input.mountModel),
    mountColor: cleanText(input.mountColor),
    colorationColor: cleanText(input.colorationColor),
    colorationUnicolor: cleanBool(input.colorationUnicolor),
    colorationDegradadoPercent: cleanNumber(input.colorationDegradadoPercent),
    observations: cleanText(input.observations),
    createdBy: userId,
  };
}

function dateToRange(value: string): { start?: Date; end?: Date } {
  // Solo fecha (YYYY-MM-DD) = dia completo en UTC; con hora = instante exacto
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  if (dateOnly) {
    return { start: new Date(`${value}T00:00:00.000Z`), end: new Date(`${value}T23:59:59.999Z`) };
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? {} : { start: d, end: d };
}

/** O3.1/O3.3 - Creacion de orden por el cliente autenticado. */
export async function createOrder(userId: bigint, input: CreateOrderInput) {
  // DEC-3: company autopoblada desde users.company_name (snapshot de la cuenta)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { companyName: true },
  });
  if (!user) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Usuario inexistente');
  }
  const company = user.companyName?.trim() ?? '';
  if (!company) {
    throw new ApiError(400, 'BAD_REQUEST', 'La cuenta del usuario no tiene empresa configurada (DEC-3)');
  }

  // RF-10/DEC-1: unicidad GLOBAL del numero de orden (pre-check amigable)
  const existing = await prisma.order.findFirst({
    where: { orderNumber: String(input.orderNumber).trim() },
    select: { id: true },
  });
  if (existing) {
    throw new ApiError(409, 'ORDER_ALREADY_EXISTS', 'El numero de orden ya existe');
  }

  try {
    const order = await prisma.order.create({
      data: toData(input, company, userId),
    });
    return orderToDetail(order);
  } catch (err) {
    // Carrera concurrente: el constraint UNIQUE resuelve el duplicado (RF-10)
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new ApiError(409, 'ORDER_ALREADY_EXISTS', 'El numero de orden ya existe');
    }
    throw err;
  }
}

/** O3.5 - Listado e historial del cliente (solo sus ordenes), paginado y con fechas. */
export async function listOwnOrders(userId: bigint, filters: ListOrdersFilters) {
  const limit = filters.limit ?? 20;
  const offset = filters.offset ?? 0;

  const where: Prisma.OrderWhereInput = { createdBy: userId };
  const range: { createdAt?: { gte?: Date; lte?: Date } } = {};
  if (filters.from) range.createdAt = { ...range.createdAt, gte: dateToRange(filters.from).start };
  if (filters.to) range.createdAt = { ...range.createdAt, lte: dateToRange(filters.to).end };
  if (range.createdAt) where.createdAt = range.createdAt;

  const [total, rows] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], // RF-05/RF-15: mas reciente primero
      skip: offset,
      take: limit,
    }),
  ]);
  return { data: rows.map(orderToListItem), total, limit, offset };
}

/** RF-16 - Detalle: solo el dueno ve su orden (sin fugas entre clientes). */
export async function getOwnOrder(userId: bigint, orderId: bigint) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.createdBy !== userId) {
    throw new ApiError(404, 'NOT_FOUND', 'Orden no encontrada');
  }
  return orderToDetail(order);
}

/** REM-2026-09/RF-10 - Check de unicidad global del N de Orden (validacion async UI). */
export async function checkOrderNumberAvailable(value: string): Promise<boolean> {
  const existing = await prisma.order.findFirst({
    where: { orderNumber: value },
    select: { id: true },
  });
  return existing === null;
}

/**
 * M4.7/RF-18…21 y RF-28…31 - Listado GLOBAL de solo lectura para
 * LABORATORIO (sin estado) y ADMINISTRADOR (con estado + pendiente desde).
 * Filtros: rango de fechas, empresa (cliente) y, para admin, estado de sync.
 */
export async function listAllOrders(role: ViewRole, filters: ListOrdersFilters) {
  const limit = filters.limit ?? 20;
  const offset = filters.offset ?? 0;

  const where: Prisma.OrderWhereInput = {};
  const range: { createdAt?: { gte?: Date; lte?: Date } } = {};
  if (filters.from) range.createdAt = { ...range.createdAt, gte: dateToRange(filters.from).start };
  if (filters.to) range.createdAt = { ...range.createdAt, lte: dateToRange(filters.to).end };
  if (range.createdAt) where.createdAt = range.createdAt;
  if (filters.company?.trim()) {
    where.company = { contains: filters.company.trim(), mode: 'insensitive' };
  }
  if (role === 'ADMINISTRADOR' && filters.syncStatus) {
    where.syncStatus = filters.syncStatus;
  }

  const [total, rows] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: offset,
      take: limit,
    }),
  ]);
  const data =
    role === 'ADMINISTRADOR' ? rows.map((r) => orderToAdminListItem(r)) : rows.map(orderToListItem);
  return { data, total, limit, offset };
}

/** RF-21/RF-31 - Detalle global de una orden (lab sin estado; admin con estado). */
export async function getAnyOrder(role: ViewRole, orderId: bigint) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    throw new ApiError(404, 'NOT_FOUND', 'Orden no encontrada');
  }
  return role === 'ADMINISTRADOR' ? orderToAdminDetail(order) : orderToDetail(order);
}
