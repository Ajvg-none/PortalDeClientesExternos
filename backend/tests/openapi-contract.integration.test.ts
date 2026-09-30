import request from 'supertest';
import bcrypt from 'bcryptjs';
import { PrismaClient, UserRole } from '@prisma/client';
import { createApp } from '../src/app';
import { validateApiResponse } from './helpers/openapi';

/**
 * X7.1 - Contrato real vs spec OpenAPI. Recorre CADA endpoint documentado
 * (incluidos 400/401/403/404/409 y la autenticacion por API Key) y valida la
 * respuesta observada contra el schema de la spec. Requiere BD de pruebas
 * (el runner de integracion la resetea antes).
 */
const app = createApp();
const testUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
const prisma = new PrismaClient({ datasources: { db: { url: testUrl } } });

const PASSWORD = 'Cambiar123!';
const HASH = bcrypt.hashSync(PASSWORD, 10);
const API_KEY = 'contract-api-key';
const COMPANY = 'Optica Contrato';
// Usuarios con prefijo propio para no colisionar con otras suites de
// integracion que corren contra la MISMA base (runInBand, sin reset por archivo).
const ADMIN = 'ctr-admin';
const LAB = 'ctr-lab';
const CLIENTE = 'ctr-cliente';
const CHANGER = 'ctr-changer';
const PENDING = 'ctr-pending';
const TEST_USERNAMES = [ADMIN, LAB, CLIENTE, CHANGER, PENDING, 'contrato-user', 'ctr-weak'];

/** Valida la respuesta real contra la spec; falla con mensaje legible. */
function expectSpec(method: string, path: string, status: number, body: unknown): void {
  const error = validateApiResponse(method, path, status, body);
  expect(error).toBeUndefined();
}

async function login(username: string): Promise<string> {
  const res = await request(app).post('/api/auth/login').send({ username, password: PASSWORD });
  return res.body.token as string;
}

describe('X7.1 - contrato OpenAPI (integrador)', () => {
  let adminToken = '';
  let labToken = '';
  let clienteToken = '';
  let changerToken = '';
  let pendingToken = '';
  let userId = '';
  let apiKey = API_KEY;
  let createdApiKey = false;

  beforeAll(async () => {
    // Reutiliza una API Key activa existente (otra suite puede haberla creado);
    // solo crea una propia si no hay ninguna.
    const existingKey = await prisma.apiKey.findFirst({ where: { isActive: true }, orderBy: { id: 'asc' } });
    if (existingKey) {
      apiKey = existingKey.keyValue;
    } else {
      await prisma.apiKey.create({ data: { keyValue: API_KEY, description: 'contrato', isActive: true } });
      createdApiKey = true;
    }

    await prisma.user.create({
      data: { username: ADMIN, passwordHash: HASH, role: UserRole.ADMINISTRADOR, mustChangePassword: false },
    });
    await prisma.user.create({
      data: { username: LAB, passwordHash: HASH, role: UserRole.LABORATORIO, mustChangePassword: false },
    });
    await prisma.user.create({
      data: {
        username: CLIENTE,
        passwordHash: HASH,
        role: UserRole.CLIENTE_EXTERNO,
        companyName: COMPANY,
        mustChangePassword: false,
      },
    });
    await prisma.user.create({
      data: {
        username: CHANGER,
        passwordHash: HASH,
        role: UserRole.CLIENTE_EXTERNO,
        companyName: COMPANY,
        mustChangePassword: true,
      },
    });
    await prisma.user.create({
      data: {
        username: PENDING,
        passwordHash: HASH,
        role: UserRole.CLIENTE_EXTERNO,
        companyName: COMPANY,
        mustChangePassword: true,
      },
    });

    adminToken = await login(ADMIN);
    labToken = await login(LAB);
    clienteToken = await login(CLIENTE);
    changerToken = await login(CHANGER);
    pendingToken = await login(PENDING);
  });

  afterAll(async () => {
    // Limpieza total: esta suite no debe contaminar las demas (misma BD).
    await prisma.order.deleteMany({ where: { company: COMPANY } });
    await prisma.user.deleteMany({ where: { username: { in: TEST_USERNAMES } } });
    if (createdApiKey) await prisma.apiKey.deleteMany({ where: { keyValue: API_KEY } });
    await prisma.$disconnect();
  });

  test('GET /health', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expectSpec('get', '/health', res.status, res.body);
  });

  describe('auth', () => {
    test('POST /auth/login 200 y 401', async () => {
      const ok = await request(app).post('/api/auth/login').send({ username: ADMIN, password: PASSWORD });
      expect(ok.status).toBe(200);
      expectSpec('post', '/auth/login', ok.status, ok.body);

      const bad = await request(app).post('/api/auth/login').send({ username: ADMIN, password: 'mala' });
      expect(bad.status).toBe(401);
      expectSpec('post', '/auth/login', bad.status, bad.body);
    });

    test('POST /auth/change-password 200, 400 y 401', async () => {
      const ok = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${changerToken}`)
        .send({ currentPassword: PASSWORD, newPassword: 'NuevaClave1' });
      expect(ok.status).toBe(200);
      expectSpec('post', '/auth/change-password', ok.status, ok.body);

      const wrong = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${changerToken}`)
        .send({ currentPassword: 'incorrecta', newPassword: 'OtraClave1' });
      expect(wrong.status).toBe(400);
      expectSpec('post', '/auth/change-password', wrong.status, wrong.body);

      const noAuth = await request(app)
        .post('/api/auth/change-password')
        .send({ currentPassword: PASSWORD, newPassword: 'OtraClave1' });
      expect(noAuth.status).toBe(401);
      expectSpec('post', '/auth/change-password', noAuth.status, noAuth.body);
    });

    test('guard de primer acceso: 403 antes de cambiar contrasena', async () => {
      const blocked = await request(app)
        .get('/api/orders')
        .set('Authorization', `Bearer ${pendingToken}`);
      expect(blocked.status).toBe(403);
      expectSpec('get', '/orders', blocked.status, blocked.body);
    });
  });

  describe('users', () => {
    test('POST /users 201 y 409', async () => {
      const created = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          username: 'contrato-user',
          password: 'Temporal123',
          role: 'CLIENTE_EXTERNO',
          companyName: 'Optica Nueva',
          email: 'contrato@example.com',
        });
      expect(created.status).toBe(201);
      expectSpec('post', '/users', created.status, created.body);
      userId = created.body.id;

      const dup = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ username: 'contrato-user', password: 'Temporal123', role: 'CLIENTE_EXTERNO', companyName: 'X' });
      expect(dup.status).toBe(409);
      expectSpec('post', '/users', dup.status, dup.body);
    });

    test('GET /users 200', async () => {
      const res = await request(app).get('/api/users').set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expectSpec('get', '/users', res.status, res.body);
    });

    test('POST /users con contrasena debil 400 (X7.2)', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ username: 'ctr-weak', password: 'debil', role: 'CLIENTE_EXTERNO', companyName: 'X' });
      expect(res.status).toBe(400);
      expectSpec('post', '/users', res.status, res.body);
    });

    test('GET /users/{id} 200 y 404', async () => {
      const ok = await request(app)
        .get(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(ok.status).toBe(200);
      expectSpec('get', '/users/{id}', ok.status, ok.body);

      const missing = await request(app)
        .get('/api/users/999999')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(missing.status).toBe(404);
      expectSpec('get', '/users/{id}', missing.status, missing.body);
    });

    test('PATCH /users/{id} 200', async () => {
      const res = await request(app)
        .patch(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ phone: '+56 9 1111 2222' });
      expect(res.status).toBe(200);
      expectSpec('patch', '/users/{id}', res.status, res.body);
    });

    test('PATCH /users/{id}/status 200', async () => {
      const res = await request(app)
        .patch(`/api/users/${userId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false });
      expect(res.status).toBe(200);
      expectSpec('patch', '/users/{id}/status', res.status, res.body);
    });

    test('POST /users/{id}/reset-password 200', async () => {
      const res = await request(app)
        .post(`/api/users/${userId}/reset-password`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ newPassword: 'Reset12345' });
      expect(res.status).toBe(200);
      expectSpec('post', '/users/{id}/reset-password', res.status, res.body);
    });
  });

  describe('orders', () => {
    let orderId = '';
    let externalId = '';

    test('POST /orders 201, 400 y 409', async () => {
      const created = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${clienteToken}`)
        .send({ orderNumber: 'CTR-0001', patient: 'Paciente Uno', odSphere: -2.5, oiSphere: -2.25 });
      expect(created.status).toBe(201);
      expectSpec('post', '/orders', created.status, created.body);
      orderId = created.body.id;
      externalId = created.body.externalId;

      const invalid = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${clienteToken}`)
        .send({ patient: 'Sin numero' });
      expect(invalid.status).toBe(400);
      expectSpec('post', '/orders', invalid.status, invalid.body);

      const dup = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${clienteToken}`)
        .send({ orderNumber: 'CTR-0001', patient: 'Duplicado' });
      expect(dup.status).toBe(409);
      expectSpec('post', '/orders', dup.status, dup.body);
    });

    test('GET /orders por rol 200', async () => {
      const asCliente = await request(app).get('/api/orders').set('Authorization', `Bearer ${clienteToken}`);
      expect(asCliente.status).toBe(200);
      expectSpec('get', '/orders', asCliente.status, asCliente.body);

      const asLab = await request(app).get('/api/orders').set('Authorization', `Bearer ${labToken}`);
      expect(asLab.status).toBe(200);
      expectSpec('get', '/orders', asLab.status, asLab.body);

      const asAdmin = await request(app).get('/api/orders').set('Authorization', `Bearer ${adminToken}`);
      expect(asAdmin.status).toBe(200);
      expectSpec('get', '/orders', asAdmin.status, asAdmin.body);
    });

    test('GET /orders/order-number/{value} 200', async () => {
      const res = await request(app)
        .get('/api/orders/order-number/CTR-9999')
        .set('Authorization', `Bearer ${clienteToken}`);
      expect(res.status).toBe(200);
      expectSpec('get', '/orders/order-number/{value}', res.status, res.body);
    });

    test('GET /orders/{id} 200 y 404', async () => {
      const ok = await request(app)
        .get(`/api/orders/${orderId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(ok.status).toBe(200);
      expectSpec('get', '/orders/{id}', ok.status, ok.body);

      const missing = await request(app)
        .get('/api/orders/999999')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(missing.status).toBe(404);
      expectSpec('get', '/orders/{id}', missing.status, missing.body);
    });

    describe('external-orders', () => {
      test('GET /external-orders/pending 200 y 401', async () => {
        const ok = await request(app).get('/api/external-orders/pending').set('X-API-Key', apiKey);
        expect(ok.status).toBe(200);
        expectSpec('get', '/external-orders/pending', ok.status, ok.body);
        expect(ok.body.data[0].externalId).toBeDefined();

        const noKey = await request(app).get('/api/external-orders/pending');
        expect(noKey.status).toBe(401);
        expectSpec('get', '/external-orders/pending', noKey.status, noKey.body);
      });

      test('PUT /external-orders/{externalId}/sync 200, 400 y 404', async () => {
        const ok = await request(app)
          .put(`/api/external-orders/${externalId}/sync`)
          .set('X-API-Key', apiKey);
        expect(ok.status).toBe(200);
        expectSpec('put', '/external-orders/{externalId}/sync', ok.status, ok.body);

        const bad = await request(app)
          .put('/api/external-orders/no-es-uuid/sync')
          .set('X-API-Key', apiKey);
        expect(bad.status).toBe(400);
        expectSpec('put', '/external-orders/{externalId}/sync', bad.status, bad.body);

        const missing = await request(app)
          .put('/api/external-orders/00000000-0000-4000-8000-000000000099/sync')
          .set('X-API-Key', apiKey);
        expect(missing.status).toBe(404);
        expectSpec('put', '/external-orders/{externalId}/sync', missing.status, missing.body);
      });
    });

    describe('reports', () => {
      test('GET /reports/dashboard 200 y 401', async () => {
        const ok = await request(app).get('/api/reports/dashboard').set('Authorization', `Bearer ${adminToken}`);
        expect(ok.status).toBe(200);
        expectSpec('get', '/reports/dashboard', ok.status, ok.body);

        const noAuth = await request(app).get('/api/reports/dashboard');
        expect(noAuth.status).toBe(401);
        expectSpec('get', '/reports/dashboard', noAuth.status, noAuth.body);
      });

      test('GET /reports/orders/export 200 (text/csv)', async () => {
        const res = await request(app)
          .get('/api/reports/orders/export')
          .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toContain('text/csv');
        expectSpec('get', '/reports/orders/export', res.status, res.text);
      });
    });
  });
});
