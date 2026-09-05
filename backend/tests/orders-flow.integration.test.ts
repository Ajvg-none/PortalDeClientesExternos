/**
 * Integracion - Fase 3 (Gate F3): flujo de ordenes del cliente contra BD real
 * (portal_test). El runner resetea la BD aplicando migraciones antes.
 */
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { PrismaClient, UserRole } from '@prisma/client';
import { createApp } from '../src/app';

const app = createApp();
const testUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
const prisma = new PrismaClient({ datasources: { db: { url: testUrl } } });

const PASSWORD = 'Cambiar123!';
const HASH = bcrypt.hashSync(PASSWORD, 10);

async function login(username: string) {
  const res = await request(app).post('/api/auth/login').send({ username, password: PASSWORD });
  return res.body.token as string;
}

describe('Fase 3 - Dominio de ordenes del cliente (integrador)', () => {
  let adminToken = '';
  let clientAToken = '';
  let clientBToken = '';
  let labToken = '';
  let orderAId = '';
  let orderFullId = '';

  beforeAll(async () => {
    await prisma.user.createMany({
      data: [
        { username: 'admin', passwordHash: HASH, role: UserRole.ADMINISTRADOR, mustChangePassword: false },
        {
          username: 'optia',
          passwordHash: HASH,
          role: UserRole.CLIENTE_EXTERNO,
          companyName: 'Optica Uno',
          mustChangePassword: false,
        },
        {
          username: 'optib',
          passwordHash: HASH,
          role: UserRole.CLIENTE_EXTERNO,
          companyName: 'Optica Dos',
          mustChangePassword: false,
        },
        { username: 'lab', passwordHash: HASH, role: UserRole.LABORATORIO, mustChangePassword: false },
      ],
    });
  });

  afterAll(async () => {
    await prisma.order.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
  });

  beforeAll(async () => {
    adminToken = await login('admin');
    clientAToken = await login('optia');
    clientBToken = await login('optib');
    labToken = await login('lab');
  });

  test('O3.6 - sin token responde 401; LABORATORIO y ADMINISTRADOR no pueden crear (RF-22/32)', async () => {
    const payload = { orderNumber: 'ORD-X', patient: 'X' };
    expect((await request(app).post('/api/orders').send(payload)).status).toBe(401);
    expect(
      (await request(app).post('/api/orders').set('Authorization', `Bearer ${labToken}`).send(payload)).status,
    ).toBe(403);
    expect(
      (await request(app).post('/api/orders').set('Authorization', `Bearer ${adminToken}`).send(payload))
        .status,
    ).toBe(403);
  });

  test('O3.3/DEC-3 - creacion minima: company autopoblada (ignora payload) y sin estado de sync', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${clientAToken}`)
      .send({ orderNumber: 'ORD-A-001', patient: 'Juan Perez', company: 'EMPRESA HACK' });
    expect(res.status).toBe(201);
    expect(res.body.company).toBe('Optica Uno'); // DEC-3 snapshot
    expect(res.body.orderNumber).toBe('ORD-A-001');
    expect(res.body.patient).toBe('Juan Perez');
    expect(res.body.createdAt).toBeTruthy();
    expect(res.body.externalId).toMatch(/^[0-9a-f-]{36}$/);
    expect(res.body).not.toHaveProperty('syncStatus'); // RF-53…56
    orderAId = res.body.id;
  });

  test('O3.1 - validaciones: 400 sin orderNumber/patient y treatment invalido', async () => {
    expect(
      (await request(app).post('/api/orders').set('Authorization', `Bearer ${clientAToken}`).send({ patient: 'X' }))
        .status,
    ).toBe(400);
    expect(
      (await request(app).post('/api/orders').set('Authorization', `Bearer ${clientAToken}`).send({ orderNumber: 'ORD-9' }))
        .status,
    ).toBe(400);
    const bad = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${clientAToken}`)
      .send({ orderNumber: 'ORD-BAD', patient: 'X', treatment: 'TRATAMIENTO INVENTADO' });
    expect(bad.status).toBe(400);
    expect(bad.body.code).toBe('VALIDATION_ERROR');
  });

  test('O3.2/RF-10/DEC-1 - unicidad GLOBAL: duplicado en el mismo cliente y en otro cliente responde 409', async () => {
    const dupSame = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${clientAToken}`)
      .send({ orderNumber: 'ORD-A-001', patient: 'Otro' });
    expect(dupSame.status).toBe(409);
    expect(dupSame.body.code).toBe('ORDER_ALREADY_EXISTS');

    const dupOther = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${clientBToken}`)
      .send({ orderNumber: 'ORD-A-001', patient: 'Otro' });
    expect(dupOther.status).toBe(409); // global, no por empresa (DEC-1)
  });

  test('O3.3 - creacion completa con datos opticos (strings numericas) y listas cerradas', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${clientAToken}`)
      .send({
        orderNumber: 'ORD-A-002',
        patient: 'Maria Gomez',
        odSphere: '-2.50',
        odCylinder: '-0.75',
        odAxis: '180',
        odProductCode: 'LENTE-123',
        oiSphere: '-2.25',
        oiCylinder: '-0.50',
        oiAxis: '175',
        treatment: 'OCEAN (AR Azul)',
        mountType: 'METAL ARO COMPLETO',
        mountBrand: 'Ray-Ban',
        mountModel: 'RB-123',
        mountColor: 'Negro',
        colorationColor: 'Azul',
        colorationUnicolor: true,
        colorationDegradadoPercent: '20.5',
        observations: 'Entrega urgente',
      });
    expect(res.status).toBe(201);
    expect(res.body.od.sphere).toBe(-2.5);
    expect(res.body.od.cylinder).toBe(-0.75);
    expect(res.body.oi.sphere).toBe(-2.25);
    expect(res.body.treatment).toBe('OCEAN (AR Azul)');
    expect(res.body.mount).toMatchObject({ type: 'METAL ARO COMPLETO', brand: 'Ray-Ban', model: 'RB-123' });
    expect(res.body.coloration).toMatchObject({ color: 'Azul', unicolor: true, degradadoPercent: 20.5 });
    orderFullId = res.body.id;
  });

  test('O3.5/RF-05/RF-15 - historial del cliente: solo sus ordenes, paginado, orden y resumen', async () => {
    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${clientAToken}`);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body.data).toHaveLength(2);
    // Mas reciente primero (RF-15)
    expect(res.body.data[0].orderNumber).toBe('ORD-A-002');
    expect(res.body.data[1].orderNumber).toBe('ORD-A-001');
    // Resumen rapido RF-05: "OD -2.50 / OI -2.25"
    expect(res.body.data[0].summary).toBe('OD -2.50 / OI -2.25');
    expect(res.body.data[1].summary).toBe('');
    expect(res.body.data[0]).not.toHaveProperty('syncStatus');
  });

  test('O3.5 - filtro por rango de fechas', async () => {
    const empty = await request(app)
      .get('/api/orders')
      .query({ from: '2020-01-01', to: '2020-12-31' })
      .set('Authorization', `Bearer ${clientAToken}`);
    expect(empty.status).toBe(200);
    expect(empty.body.total).toBe(0);

    const wide = await request(app)
      .get('/api/orders')
      .query({ from: '2026-01-01', to: '2030-12-31' })
      .set('Authorization', `Bearer ${clientAToken}`);
    expect(wide.body.total).toBe(2);
  });

  test('O3.5 - el otro cliente no ve las ordenes ajenas (listado vacio y detalle 404)', async () => {
    const listB = await request(app).get('/api/orders').set('Authorization', `Bearer ${clientBToken}`);
    expect(listB.body.total).toBe(0);

    const foreign = await request(app)
      .get(`/api/orders/${orderAId}`)
      .set('Authorization', `Bearer ${clientBToken}`);
    expect(foreign.status).toBe(404);
  });

  test('RF-16 - detalle completo de una orden propia', async () => {
    const res = await request(app)
      .get(`/api/orders/${orderFullId}`)
      .set('Authorization', `Bearer ${clientAToken}`);
    expect(res.status).toBe(200);
    expect(res.body.patient).toBe('Maria Gomez');
    expect(res.body.treatment).toBe('OCEAN (AR Azul)');
    expect(res.body.coloration.unicolor).toBe(true);
  });

  test('O3.6/RF-17 - inmutabilidad: no hay PUT/PATCH/DELETE de ordenes (404) y la fila persiste', async () => {
    const put = await request(app)
      .put(`/api/orders/${orderAId}`)
      .set('Authorization', `Bearer ${clientAToken}`)
      .send({ patient: 'Cambiado' });
    expect(put.status).toBe(404);

    const patch = await request(app)
      .patch(`/api/orders/${orderAId}`)
      .set('Authorization', `Bearer ${clientAToken}`)
      .send({ patient: 'Cambiado' });
    expect(patch.status).toBe(404);

    const del = await request(app)
      .delete(`/api/orders/${orderAId}`)
      .set('Authorization', `Bearer ${clientAToken}`);
    expect(del.status).toBe(404);

    const count = await prisma.order.count();
    expect(count).toBe(2); // nada se edito ni borro
  });

  test('REM-2026-09/RF-10 - check de unicidad del N de Orden (validacion async UI)', async () => {
    const inUse = await request(app)
      .get('/api/orders/order-number/ORD-A-001')
      .set('Authorization', `Bearer ${clientAToken}`);
    expect(inUse.status).toBe(200);
    expect(inUse.body).toEqual({ available: false });

    const free = await request(app)
      .get('/api/orders/order-number/ORD-NUEVO-LIBRE')
      .set('Authorization', `Bearer ${clientAToken}`);
    expect(free.status).toBe(200);
    expect(free.body).toEqual({ available: true });

    // Solo el cliente que crea ordenes lo usa: LABORATORIO no puede
    const lab = await request(app)
      .get('/api/orders/order-number/ORD-A-001')
      .set('Authorization', `Bearer ${labToken}`);
    expect(lab.status).toBe(403);
  });
});
