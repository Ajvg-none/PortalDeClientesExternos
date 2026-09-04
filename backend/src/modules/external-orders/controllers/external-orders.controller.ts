import type { Request, Response } from 'express';
import { asyncHandler } from '../../../core/async';
import { listPendingOrders, syncOrderByExternalId } from '../services/external-orders.service';

/** M4.2/M4.3 - GET /api/external-orders/pending */
export const pending = asyncHandler(async (req: Request, res: Response) => {
  const result = await listPendingOrders({
    limit: req.query.limit !== undefined ? Number(req.query.limit) : undefined,
    offset: req.query.offset !== undefined ? Number(req.query.offset) : undefined,
  });
  res.json(result);
});

/** M4.5 - PUT /api/external-orders/:externalId/sync */
export const sync = asyncHandler(async (req: Request, res: Response) => {
  const result = await syncOrderByExternalId(String(req.params.externalId));
  res.json(result);
});
