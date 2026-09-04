import { Prisma } from '@prisma/client';
import { prisma } from '../../../core/prisma';
import { env } from '../../../config/env';
import { opticalSummary } from '../../orders/services/orders.mapper';
import { buildCsv } from './export';

/**
 * Servicios de estadisticas y reportes del ADMINISTRADOR (Fase 5, RF-33/34).
 * La agrupacion por cliente usa la columna company de la orden, que por DEC-3
 * es siempre la company autopoblada y consistente de la cuenta del cliente.
 */

export interface DashboardData {
  ordersByMonth: { month: string; total: number }[];
  topClients: { company: string; total: number }[];
  statusSummary: { pendiente: number; sincronizadas: number; total: number };
}

/** E5.1/RF-33 - Agregados del dashboard (admin). */
export async function getDashboard(): Promise<DashboardData> {
  const [months, topRows, statusRows] = await Promise.all([
    // Total de ordenes por mes, en la zona horaria configurada (ANALYTICS_TIMEZONE)
    prisma.$queryRaw<{ month: string; total: number }[]>(
      Prisma.sql`SELECT to_char(date_trunc('month', "created_at" AT TIME ZONE ${env.analyticsTimezone}), 'YYYY-MM') AS month,
                        COUNT(*)::int AS total
                 FROM "orders"
                 GROUP BY 1
                 ORDER BY 1`,
    ),
    // Top 5 clientes por cantidad de ordenes
    prisma.order.groupBy({
      by: ['company'],
      _count: { _all: true },
      orderBy: { _count: { company: 'desc' } },
      take: 5,
    }),
    // Pendientes vs sincronizadas
    prisma.order.groupBy({ by: ['syncStatus'], _count: { _all: true } }),
  ]);

  const statusSummary: DashboardData['statusSummary'] = { pendiente: 0, sincronizadas: 0, total: 0 };
  for (const row of statusRows) {
    const total = row._count._all;
    statusSummary.total += total;
    if (row.syncStatus === 'PENDIENTE') statusSummary.pendiente = total;
    else if (row.syncStatus === 'SINCRONIZADA') statusSummary.sincronizadas = total;
  }

  return {
    ordersByMonth: months.map((m) => ({ month: m.month, total: m.total })),
    topClients: topRows.map((r) => ({ company: r.company, total: r._count._all })),
    statusSummary,
  };
}

// ---------------------------------------------------------------- exportacion

export interface ExportFilters {
  from?: string;
  to?: string;
  company?: string;
  syncStatus?: 'PENDIENTE' | 'SINCRONIZADA';
}

const CSV_HEADERS = [
  'Numero de Orden',
  'Cliente (Empresa)',
  'Paciente',
  'Fecha de creacion',
  'Resumen optico',
  'Tratamiento',
  'Estado sincronizacion',
  'Fecha de sincronizacion',
  'Observaciones',
];

function dateRange(value: string, edge: 'start' | 'end'): Date | undefined {
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  if (dateOnly) {
    return edge === 'start'
      ? new Date(`${value}T00:00:00.000Z`)
      : new Date(`${value}T23:59:59.999Z`);
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/** E5.2 - Exporta el listado de ordenes segun los filtros aplicados (RF-34). */
export async function buildOrdersExport(filters: ExportFilters): Promise<string> {
  const where: Prisma.OrderWhereInput = {};
  const range: Prisma.OrderWhereInput['createdAt'] = {};
  if (filters.from) range.gte = dateRange(filters.from, 'start');
  if (filters.to) range.lte = dateRange(filters.to, 'end');
  if (filters.from || filters.to) where.createdAt = range;
  if (filters.company?.trim()) where.company = { contains: filters.company.trim(), mode: 'insensitive' };
  if (filters.syncStatus) where.syncStatus = filters.syncStatus;

  const rows = await prisma.order.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: 10_000, // cota de memoria para el reporte; el listado completo usa /api/orders
  });

  const data = rows.map((o) => [
    o.orderNumber,
    o.company,
    o.patient,
    o.createdAt.toISOString(),
    opticalSummary(o),
    o.treatment ?? '',
    o.syncStatus,
    o.syncedAt ? o.syncedAt.toISOString() : '',
    o.observations ?? '',
  ]);

  return buildCsv(CSV_HEADERS, data);
}
