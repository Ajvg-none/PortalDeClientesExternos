import type { Request, Response } from 'express';
import { asyncHandler } from '../../../core/async';
import { buildOrdersExport, getDashboard, type ExportFilters } from '../services/reports.service';

function filtersOf(req: Request): ExportFilters {
  return {
    from: (req.query.from as string | undefined) ?? undefined,
    to: (req.query.to as string | undefined) ?? undefined,
    company: (req.query.company as string | undefined) ?? undefined,
    syncStatus: (req.query.syncStatus as ExportFilters['syncStatus']) ?? undefined,
  };
}

/** E5.1/RF-33 - GET /api/reports/dashboard */
export const dashboard = asyncHandler(async (_req: Request, res: Response) => {
  res.json(await getDashboard());
});

/** E5.2/RF-34 - GET /api/reports/orders/export?from=&to=&company=&syncStatus= */
export const exportOrders = asyncHandler(async (req: Request, res: Response) => {
  const csv = await buildOrdersExport(filtersOf(req));
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="reporte-ordenes-${stamp}.csv"`);
  // Buffer UTF-8 (incluye el BOM \ufeff ya presente en el string) para Excel
  res.send(Buffer.from(csv, 'utf8'));
});
