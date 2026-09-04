import type { Request, Response } from 'express';
import { asyncHandler } from '../../../core/async';
import {
  createOrder,
  getOwnOrder,
  listOwnOrders,
  type CreateOrderInput,
  type ListOrdersFilters,
} from '../services/orders.service';

function bodyAs(input: Request): CreateOrderInput {
  return input.body as CreateOrderInput;
}

/** O3.3 - POST /api/orders */
export const create = asyncHandler(async (req: Request, res: Response) => {
  const detail = await createOrder(req.auth!.userId, bodyAs(req));
  res.status(201).json(detail);
});

/** O3.5 - GET /api/orders?from=&to=&limit=&offset= */
export const listMine = asyncHandler(async (req: Request, res: Response) => {
  const filters: ListOrdersFilters = {
    from: (req.query.from as string | undefined) ?? undefined,
    to: (req.query.to as string | undefined) ?? undefined,
    limit: req.query.limit !== undefined ? Number(req.query.limit) : undefined,
    offset: req.query.offset !== undefined ? Number(req.query.offset) : undefined,
  };
  const result = await listOwnOrders(req.auth!.userId, filters);
  res.json(result);
});

/** RF-16 - GET /api/orders/:id (solo del dueno) */
export const getMineById = asyncHandler(async (req: Request, res: Response) => {
  const detail = await getOwnOrder(req.auth!.userId, BigInt(req.params.id));
  res.json(detail);
});
