import request from 'supertest';
import type { NextFunction, Request, Response } from 'express';
import { createApp } from '../src/app';
import { ApiError } from '../src/core/errors';
import { errorHandler } from '../src/core/middlewares/error-handler';

const app = createApp();

const MODULES = ['auth', 'users', 'orders', 'external-orders', 'reports'];

describe('B1.4 - API Express modular', () => {
  test('GET /api/health responde 200 con { status: "ok" }', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  test.each(MODULES)('el router del modulo %s queda montado en /api/%s/status', async (mod) => {
    const res = await request(app).get(`/api/${mod}/status`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ module: mod });
  });

  test('una ruta desconocida responde 404 con formato JSON { code, message }', async () => {
    const res = await request(app).get('/api/no-existe');
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ code: 'NOT_FOUND' });
    expect(res.body.message).toContain('/api/no-existe');
  });

  test('un JSON invalido en el body responde 400 BAD_REQUEST (errorHandler global)', async () => {
    const res = await request(app)
      .post('/api/health')
      .set('Content-Type', 'application/json')
      .send('{"malformado":');
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ code: 'BAD_REQUEST' });
  });

  test('REM-2026-09/R2.5: body mayor al limite (1mb) responde 413 PAYLOAD_TOO_LARGE', async () => {
    const big = JSON.stringify({ data: 'x'.repeat(1_200_000) });
    const res = await request(app)
      .post('/api/health')
      .set('Content-Type', 'application/json')
      .send(big);
    expect(res.status).toBe(413);
    expect(res.body).toMatchObject({ code: 'PAYLOAD_TOO_LARGE' });
  });
});

describe('B1.4 - errorHandler (unitario)', () => {
  const mockResponse = () => {
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
    return res;
  };

  test('ApiError responde con su statusCode y cuerpo { code, message }', () => {
    const res = mockResponse();
    const next = jest.fn() as NextFunction;
    errorHandler(new ApiError(409, 'DUPLICADO', 'El numero de orden ya existe'), {} as Request, res, next);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ code: 'DUPLICADO', message: 'El numero de orden ya existe' });
  });

  test('un error desconocido responde 500 INTERNAL_ERROR (y se loggea)', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const res = mockResponse();
    const next = jest.fn() as NextFunction;
    errorHandler(new Error('boom'), {} as Request, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ code: 'INTERNAL_ERROR', message: 'Error interno del servidor' });
    spy.mockRestore();
  });

  test('REM-2026-09/R2.5: error entity.too.large responde 413 JSON', () => {
    const res = mockResponse();
    const next = jest.fn() as NextFunction;
    errorHandler({ type: 'entity.too.large' }, {} as Request, res, next);
    expect(res.status).toHaveBeenCalledWith(413);
    expect(res.json).toHaveBeenCalledWith({
      code: 'PAYLOAD_TOO_LARGE',
      message: 'El cuerpo de la solicitud excede el limite permitido',
    });
  });
});
