/**
 * M4.1 - Middleware de API Key de integracion (X-API-Key).
 */
import type { Request, Response } from 'express';
import { ApiError } from '../src/core/errors';
import { createApiKeyAuth } from '../src/modules/external-orders/middlewares/api-key-auth';

function run(req: Partial<Request>, loader: () => Promise<string | null>) {
  const next = jest.fn();
  const handler = createApiKeyAuth(loader);
  handler(req as Request, {} as Response, next);
  return next;
}

function callError(next: ReturnType<typeof jest.fn>): ApiError | undefined {
  return next.mock.calls[0]?.[0] as ApiError | undefined;
}

describe('M4.1 - apiKeyAuth (X-API-Key, RF-39…41)', () => {
  test('con la clave activa correcta continua', async () => {
    const loader = jest.fn().mockResolvedValue('dev-middleware-api-key-0001');
    const next = await run({ headers: { 'x-api-key': 'dev-middleware-api-key-0001' } }, loader);
    expect(next).toHaveBeenCalledWith();
  });

  test('sin header responde 401 UNAUTHORIZED', async () => {
    const loader = jest.fn().mockResolvedValue('clave');
    const next = await run({ headers: {} }, loader);
    expect(callError(next)?.statusCode).toBe(401);
    expect(callError(next)?.code).toBe('UNAUTHORIZED');
  });

  test('clave incorrecta responde 401 (aunque exista una activa)', async () => {
    const loader = jest.fn().mockResolvedValue('clave-correcta');
    const next = await run({ headers: { 'x-api-key': 'clave-incorrecta' } }, loader);
    expect(callError(next)?.statusCode).toBe(401);
  });

  test('sin API Key activa configurada responde 401', async () => {
    const loader = jest.fn().mockResolvedValue(null);
    const next = await run({ headers: { 'x-api-key': 'cualquiera' } }, loader);
    expect(callError(next)?.statusCode).toBe(401);
  });
});
