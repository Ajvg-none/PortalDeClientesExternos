import type { Request, Response } from 'express';
import { asyncHandler } from '../../../core/async';
import {
  checkOrderNumberAvailable,
  createOrder,
  getAnyOrder,
  getOwnOrder,
  listAllOrders,
  listOwnOrders,
  type CreateOrderInput,
  type ListOrdersFilters,
} from '../services/orders.service';

function bodyAs(input: Request): CreateOrderInput {
  return input.body as CreateOrderInput;
}

function filtersOf(req: Request): ListOrdersFilters {
  return {
    from: (req.query.from as string | undefined) ?? undefined,
    to: (req.query.to as string | undefined) ?? undefined,
    company: (req.query.company as string | undefined) ?? undefined,
    syncStatus: (req.query.syncStatus as 'PENDIENTE' | 'SINCRONIZADA' | undefined) ?? undefined,
    limit: req.query.limit !== undefined ? Number(req.query.limit) : undefined,
    offset: req.query.offset !== undefined ? Number(req.query.offset) : undefined,
  };
}

/** O3.3 - POST /api/orders (solo CLIENTE_EXTERNO) */
export const create = asyncHandler(async (req: Request, res: Response) => {
  const detail = await createOrder(req.auth!.userId, bodyAs(req));
  res.status(201).json(detail);
});

/**
 * O3.5 / M4.7 - GET /api/orders segun rol:
 * CLIENTE_EXTERNO -> su historial; LABORATORIO/ADMINISTRADOR -> todas
 * (lab sin estado; admin con estado + "pendiente desde").
 */
export const listByRole = asyncHandler(async (req: Request, res: Response) => {
  const role = req.auth!.role;
  if (role === 'CLIENTE_EXTERNO') {
    const result = await listOwnOrders(req.auth!.userId, filtersOf(req));
    res.json(result);
    return;
  }
  const result = await listAllOrders(role, filtersOf(req));
  res.json(result);
});

/** RF-16 / RF-21 / RF-31 - GET /api/orders/:id segun rol (cliente: solo suyas). */
export const getByRole = asyncHandler(async (req: Request, res: Response) => {
  const role = req.auth!.role;
  const id = BigInt(req.params.id);
  if (role === 'CLIENTE_EXTERNO') {
    res.json(await getOwnOrder(req.auth!.userId, id));
    return;
  }
  res.json(await getAnyOrder(role, id));
});

/**
 * REM-2026-09/RF-10 - GET /api/orders/order-number/:value (solo cliente):
 * validacion asincrona de unicidad del N de Orden en el formulario.
 */
export const checkOrderNumber = asyncHandler(async (req: Request, res: Response) => {
  const available = await checkOrderNumberAvailable(String(req.params.value));
  res.json({ available });
});
