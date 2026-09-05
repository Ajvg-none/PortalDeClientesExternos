/**
 * Integracion - Fase 5 (Gate F5): dashboard y exportacion CSV del admin contra
 * BD real (portal_test). El runner resetea la BD aplicando migraciones antes.
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

describe('Fase 5 - Estadisticas y reportes (integrador)', () => {
  let adminToken = '';
  let clientToken = '';

  beforeAll(async () => {
    const admin = await prisma.user.create({
      data: { username: 'admin', passwordHash: HASH, role: UserRole.ADMINISTRADOR, mustChangePassword: false },
    });
    const optiA = await prisma.user.create({
      data: { username: 'optia', passwordHash: HASH, role: UserRole.CLIENTE_EXTERNO, companyName: 'Optica Uno', mustChangePassword: false },
    });
    const optiB = await prisma.user.create({
      data: { username: 'optib', passwordHash: HASH, role: UserRole.CLIENTE_EXTERNO, companyName: 'Optica Dos', mustChangePassword: false },
    });

    // Dataset fijo: julio (2 ordenes Optica Uno) y agosto (2: Optica Uno y Optica Dos)
    await prisma.$executeRawUnsafe(
      `INSERT INTO orders (id, external_id, order_number, company, patient, sync_status, synced_at, created_by, created_at, updated_at)
       VALUES
        (1, '20000000-0000-4000-8000-000000000001', 'ORD-7-1', 'Optica Uno', 'P1', 'PENDIENTE', NULL, ${optiA.id}, '2026-07-05T10:00:00.000Z', now()),
        (2, '20000000-0000-4000-8000-000000000002', 'ORD-7-2', 'Optica Uno', 'P2', 'SINCRONIZADA', '2026-07-06T12:00:00.000Z', ${optiA.id}, '2026-07-06T09:00:00.000Z', now()),
        (3, '20000000-0000-4000-8000-000000000003', 'ORD-8-1', 'Optica Uno', 'P3', 'PENDIENTE', NULL, ${optiA.id}, '2026-08-10T10:00:00.000Z', now()),
        (4, '20000000-0000-4000-8000-000000000004', 'ORD-8-2', 'Optica Dos', 'P4', 'SINCRONIZADA', '2026-08-11T12:00:00.000Z', ${optiB.id}, '2026-08-11T09:00:00.000Z', now())`,
    );

    void admin;
    const resAdmin = await request(app).post('/api/auth/login').send({ username: 'admin', password: PASSWORD });
    adminToken = resAdmin.body.token;
    const resClient = await request(app).post('/api/auth/login').send({ username: 'optia', password: PASSWORD });
    clientToken = resClient.body.token;
  });

  afterAll(async () => {
    await prisma.$executeRawUnsafe('DELETE FROM orders');
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
  });

  test('E5.1/RF-33 - dashboard: ordenes por mes, top clientes y pendientes vs sincronizadas', async () => {
    const res = await request(app).get('/api/reports/dashboard').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.ordersByMonth).toEqual([
      { month: '2026-07', total: 2 },
      { month: '2026-08', total: 2 },
    ]);
    expect(res.body.topClients).toEqual([
      { company: 'Optica Uno', total: 3 },
      { company: 'Optica Dos', total: 1 },
    ]);
    expect(res.body.statusSummary).toEqual({ pendiente: 2, sincronizadas: 2, total: 4 });
  });

  test('RF-33 - dashboard solo para ADMINISTRADOR', async () => {
    expect((await request(app).get('/api/reports/dashboard')).status).toBe(401);
    expect(
      (await request(app).get('/api/reports/dashboard').set('Authorization', `Bearer ${clientToken}`)).status,
    ).toBe(403);
  });

  test('E5.2/RF-34 - exporta CSV con BOM y los filtros aplicados', async () => {
    const res = await request(app)
      .get('/api/reports/orders/export')
      .query({ syncStatus: 'PENDIENTE' })
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.headers['content-disposition']).toContain('attachment; filename="reporte-ordenes-');
    const text = res.text;
    expect(text.startsWith('\ufeff')).toBe(true);
    const body = text.startsWith('\ufeff') ? text.slice(1) : text;
    const lines = body.split('\r\n').filter((l: string) => l.length > 0);
    expect(lines[0]).toBe(
      'Numero de Orden,Cliente (Empresa),Paciente,Fecha de creacion,Resumen optico,Tratamiento,Estado sincronizacion,Fecha de sincronizacion,Observaciones',
    );
    expect(lines).toHaveLength(3); // header + 2 pendientes (ORD-7-1 y ORD-8-1)
    expect(lines.some((l: string) => l.includes('ORD-7-1'))).toBe(true);
    expect(lines.some((l: string) => l.includes('ORD-8-2'))).toBe(false); // no estaba pendiente
  });

  test('E5.2 - exporta segun filtro de empresa', async () => {
    const res = await request(app)
      .get('/api/reports/orders/export')
      .query({ company: 'Optica Dos' })
      .set('Authorization', `Bearer ${adminToken}`);
    const lines = res.text.split('\r\n').filter((l: string) => l.length > 0);
    expect(lines).toHaveLength(2); // header + 1 fila
    expect(lines[1]).toContain('Optica Dos');
    expect(lines[1]).toContain('ORD-8-2');
  });

  test('E5.2 - exportacion solo para ADMINISTRADOR', async () => {
    expect((await request(app).get('/api/reports/orders/export')).status).toBe(401);
    expect(
      (await request(app).get('/api/reports/orders/export').set('Authorization', `Bearer ${clientToken}`))
        .status,
    ).toBe(403);
  });
});
