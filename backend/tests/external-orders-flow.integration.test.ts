/**
 * Integracion - Fase 4 (Gate F4): contrato PULL con el middleware contra BD
 * real (portal_test). El runner resetea la BD aplicando migraciones antes.
 */
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { PrismaClient, SyncStatus, UserRole } from '@prisma/client';
import { createApp } from '../src/app';

const app = createApp();
const testUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
const prisma = new PrismaClient({ datasources: { db: { url: testUrl } } });

const PASSWORD = 'Cambiar123!';
const HASH = bcrypt.hashSync(PASSWORD, 10);
const API_KEY = 'test-middleware-api-key';

const UUID_O1 = '10000000-0000-4000-8000-000000000001';
const UUID_O2 = '10000000-0000-4000-8000-000000000002';
const UUID_O3 = '10000000-0000-4000-8000-000000000003';

async function login(username: string) {
  const res = await request(app).post('/api/auth/login').send({ username, password: PASSWORD });
  return res.body.token as string;
}

describe('Fase 4 - Contrato PULL con el middleware (integrador)', () => {
  let adminToken = '';
  let labToken = '';
  let optiAToken = '';
  let optiBToken = '';

  beforeAll(async () => {
    const admin = await prisma.user.create({
      data: { username: 'admin', passwordHash: HASH, role: UserRole.ADMINISTRADOR, mustChangePassword: false },
    });
    const lab = await prisma.user.create({
      data: { username: 'lab', passwordHash: HASH, role: UserRole.LABORATORIO, mustChangePassword: false },
    });
    const optiA = await prisma.user.create({
      data: {
        username: 'optia',
        passwordHash: HASH,
        role: UserRole.CLIENTE_EXTERNO,
        companyName: 'Optica Uno',
        mustChangePassword: false,
      },
    });
    const optiB = await prisma.user.create({
      data: {
        username: 'optib',
        passwordHash: HASH,
        role: UserRole.CLIENTE_EXTERNO,
        companyName: 'Optica Dos',
        mustChangePassword: false,
      },
    });

    await prisma.apiKey.create({
      data: { keyValue: API_KEY, description: 'key de prueba', isActive: true },
    });

    // o1: PENDIENTE mas antigua (Optica Uno); o2: PENDIENTE (Optica Dos);
    // o3: SINCRONIZADA (Optica Uno)
    await prisma.$executeRawUnsafe(
      `INSERT INTO orders (id, external_id, order_number, company, patient, sync_status, synced_at, created_by, created_at, updated_at)
       VALUES (1, '${UUID_O1}', 'ORD-EXT-1', 'Optica Uno', 'Paciente', 'PENDIENTE', NULL, ${optiA.id}, '2026-08-01T10:00:00.000Z', now()),
              (2, '${UUID_O2}', 'ORD-EXT-2', 'Optica Dos', 'Paciente', 'PENDIENTE', NULL, ${optiB.id}, '2026-08-02T10:00:00.000Z', now()),
              (3, '${UUID_O3}', 'ORD-EXT-3', 'Optica Uno', 'Paciente', 'SINCRONIZADA', '2026-08-03T12:00:00.000Z', ${optiA.id}, '2026-08-03T10:00:00.000Z', now())`,
    );

    adminToken = await login('admin');
    labToken = await login('lab');
    optiAToken = await login('optia');
    optiBToken = await login('optib');
  });

  afterAll(async () => {
    await prisma.$executeRawUnsafe('DELETE FROM orders');
    await prisma.apiKey.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
  });

  test('M4.1 - /pending exige API Key: 401 sin header y con clave incorrecta', async () => {
    expect((await request(app).get('/api/external-orders/pending')).status).toBe(401);
    const wrong = await request(app)
      .get('/api/external-orders/pending')
      .set('X-API-Key', 'clave-incorrecta');
    expect(wrong.status).toBe(401);
    expect(wrong.body.code).toBe('UNAUTHORIZED');
  });

  test('M4.2/M4.3 - /pending devuelve SOLO PENDIENTE en orden FIFO y paginado, sin tocar estados', async () => {
    const res = await request(app).get('/api/external-orders/pending').set('X-API-Key', API_KEY);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    // FIFO: la mas antigua primero (R3)
    expect(res.body.data[0].externalId).toBe(UUID_O1);
    expect(res.body.data[1].externalId).toBe(UUID_O2);
    expect(res.body.pagination).toMatchObject({ total: 2, limit: 10, offset: 0 });
    // Excluye la SINCRONIZADA
    expect(res.body.data.map((o: { number: string }) => o.number)).not.toContain('ORD-EXT-3');

    const page1 = await request(app)
      .get('/api/external-orders/pending')
      .query({ limit: 1, offset: 0 })
      .set('X-API-Key', API_KEY);
    expect(page1.body.data[0].externalId).toBe(UUID_O1);
    const page2 = await request(app)
      .get('/api/external-orders/pending')
      .query({ limit: 1, offset: 1 })
      .set('X-API-Key', API_KEY);
    expect(page2.body.data[0].externalId).toBe(UUID_O2);

    // El GET NO modifica estados (R2/PC-1)
    const pendientes = await prisma.order.count({ where: { syncStatus: SyncStatus.PENDIENTE } });
    expect(pendientes).toBe(2);
  });

  test('M4.4 - el JSON es el canonico (constantes + sin warehouse/items/issued*)', async () => {
    const res = await request(app)
      .get('/api/external-orders/pending')
      .query({ limit: 1, offset: 0 })
      .set('X-API-Key', API_KEY);
    const item = res.body.data[0];
    expect(item).toMatchObject({
      externalId: UUID_O1,
      number: 'ORD-EXT-1',
      orderFromSupplier: true,
      status: 'CONFIRMED',
      customer: { company: 'Optica Uno', patient: 'Paciente' },
      opticalDataOD: expect.any(Object),
      opticalDataOI: expect.any(Object),
    });
    expect(item).not.toHaveProperty('warehouse');
    expect(item).not.toHaveProperty('items');
    expect(item).not.toHaveProperty('issuedOrderId');
    expect(item).not.toHaveProperty('issuedInvoiceId');
  });

  test('M4.5 - PUT /sync: 200 marca SINCRONIZADA, es idempotente, 404 si no existe', async () => {
    const ok = await request(app)
      .put(`/api/external-orders/${UUID_O1}/sync`)
      .set('X-API-Key', API_KEY);
    expect(ok.status).toBe(200);
    expect(ok.body.status).toBe('SINCRONIZADA');
    expect(ok.body.syncedAt).toBeTruthy();

    const row = await prisma.order.findUnique({ where: { externalId: UUID_O1 } });
    expect(row?.syncStatus).toBe(SyncStatus.SINCRONIZADA);
    expect(row?.syncedAt).not.toBeNull();

    // Idempotencia (PC-1): segunda confirmacion -> 200 y synced_at sin cambios
    const twice = await request(app)
      .put(`/api/external-orders/${UUID_O1}/sync`)
      .set('X-API-Key', API_KEY);
    expect(twice.status).toBe(200);
    expect(twice.body.message).toContain('ya estaba sincronizada');
    expect(twice.body.syncedAt).toBe(ok.body.syncedAt);

    // Sin API Key -> 401; UUID inexistente -> 404; UUID malformado -> 400
    expect((await request(app).put(`/api/external-orders/${UUID_O1}/sync`)).status).toBe(401);
    expect(
      (
        await request(app)
          .put('/api/external-orders/99999999-9999-4999-8999-999999999999/sync')
          .set('X-API-Key', API_KEY)
      ).status,
    ).toBe(404);
    expect(
      (
        await request(app)
          .put('/api/external-orders/no-es-un-uuid/sync')
          .set('X-API-Key', API_KEY)
      ).status,
    ).toBe(400);
  });

  test('M4.7/M4.6 - listado global por rol: lab sin estado; admin con estado + pendiente desde', async () => {
    const lab = await request(app).get('/api/orders').set('Authorization', `Bearer ${labToken}`);
    expect(lab.status).toBe(200);
    expect(lab.body.total).toBe(3);
    for (const item of lab.body.data) {
      expect(item).not.toHaveProperty('syncStatus');
      expect(item).not.toHaveProperty('pendingSinceMinutes');
    }

    const admin = await request(app).get('/api/orders').set('Authorization', `Bearer ${adminToken}`);
    expect(admin.body.total).toBe(3);
    const syncItem = admin.body.data.find((o: { orderNumber: string }) => o.orderNumber === 'ORD-EXT-3');
    const pendItem = admin.body.data.find((o: { orderNumber: string }) => o.orderNumber === 'ORD-EXT-2');
    expect(syncItem.syncStatus).toBe('SINCRONIZADA');
    expect(syncItem.syncedAt).toBeTruthy();
    expect(syncItem.pendingSinceMinutes).toBeNull();
    expect(pendItem.syncStatus).toBe('PENDIENTE');
    expect(typeof pendItem.pendingSinceMinutes).toBe('number');
    expect(pendItem.pendingSinceMinutes).toBeGreaterThanOrEqual(0);
  });

  test('M4.7 - filtros del admin: por empresa y por estado de sincronizacion', async () => {
    const byCompany = await request(app)
      .get('/api/orders')
      .query({ company: 'Optica Uno' })
      .set('Authorization', `Bearer ${adminToken}`);
    expect(byCompany.body.total).toBe(2);

    const pendientes = await request(app)
      .get('/api/orders')
      .query({ syncStatus: 'PENDIENTE' })
      .set('Authorization', `Bearer ${adminToken}`);
    expect(pendientes.body.total).toBe(1); // o1 quedo sincronizada antes
    expect(pendientes.body.data[0].orderNumber).toBe('ORD-EXT-2');

    const byDate = await request(app)
      .get('/api/orders')
      .query({ from: '2026-08-02', to: '2026-08-02' })
      .set('Authorization', `Bearer ${adminToken}`);
    expect(byDate.body.total).toBe(1);
    expect(byDate.body.data[0].orderNumber).toBe('ORD-EXT-2');
  });

  test('RF-21/RF-31 - detalle global: lab sin estado, admin con estado; clientes ajenos siguen en 404', async () => {
    const labDetail = await request(app)
      .get(`/api/orders/3`)
      .set('Authorization', `Bearer ${labToken}`);
    expect(labDetail.status).toBe(200);
    expect(labDetail.body).not.toHaveProperty('syncStatus');

    const adminDetail = await request(app)
      .get(`/api/orders/3`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminDetail.body.syncStatus).toBe('SINCRONIZADA');
    expect(adminDetail.body.syncedAt).toBeTruthy();

    // El cliente B no ve la orden del cliente A (sigue aplicando RF-16)
    expect((await request(app).get('/api/orders/3').set('Authorization', `Bearer ${optiBToken}`)).status).toBe(404);
  });

  test('RF-53…56 - el cliente ve solo su historial sin estados', async () => {
    const optiA = await request(app).get('/api/orders').set('Authorization', `Bearer ${optiAToken}`);
    expect(optiA.body.total).toBe(2); // ORD-EXT-1 y ORD-EXT-3 (las suyas)
    expect(optiA.body.data.every((o: Record<string, unknown>) => !('syncStatus' in o))).toBe(true);
  });
});
