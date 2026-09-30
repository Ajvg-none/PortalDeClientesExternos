import request from 'supertest';
import bcrypt from 'bcryptjs';
import { PrismaClient, SyncStatus, UserRole } from '@prisma/client';
import { createApp } from '../src/app';

/**
 * X7.5 - Recorrido integral minimo (E2E de API): login cliente -> crear orden
 * -> middleware simulado consume GET /pending -> PUT /sync -> el panel admin
 * ve la orden SINCRONIZADA. No asume nada del middleware real (R1): usa un
 * cliente HTTP de prueba (supertest) y deja evidencia del contrato consumido.
 */
const app = createApp();
const testUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
const prisma = new PrismaClient({ datasources: { db: { url: testUrl } } });

const PASSWORD = 'Cambiar123!';
const HASH = bcrypt.hashSync(PASSWORD, 10);
const API_KEY = 'e2e-api-key';
const COMPANY = 'Optica E2E';
const ORDER_NUMBER = 'E2E-0001';
const USERNAMES = ['e2e-cliente', 'e2e-admin'];

async function login(username: string): Promise<string> {
  const res = await request(app).post('/api/auth/login').send({ username, password: PASSWORD });
  return res.body.token as string;
}

describe('X7.5 - recorrido integral (login -> orden -> middleware -> sync -> admin)', () => {
  let apiKey = API_KEY;
  let createdApiKey = false;

  beforeAll(async () => {
    const existingKey = await prisma.apiKey.findFirst({ where: { isActive: true }, orderBy: { id: 'asc' } });
    if (existingKey) {
      apiKey = existingKey.keyValue;
    } else {
      await prisma.apiKey.create({ data: { keyValue: API_KEY, description: 'e2e', isActive: true } });
      createdApiKey = true;
    }

    await prisma.user.create({
      data: {
        username: 'e2e-cliente',
        passwordHash: HASH,
        role: UserRole.CLIENTE_EXTERNO,
        companyName: COMPANY,
        mustChangePassword: false,
      },
    });
    await prisma.user.create({
      data: {
        username: 'e2e-admin',
        passwordHash: HASH,
        role: UserRole.ADMINISTRADOR,
        mustChangePassword: false,
      },
    });
  });

  afterAll(async () => {
    await prisma.order.deleteMany({ where: { company: COMPANY } });
    await prisma.user.deleteMany({ where: { username: { in: USERNAMES } } });
    if (createdApiKey) await prisma.apiKey.deleteMany({ where: { keyValue: API_KEY } });
    await prisma.$disconnect();
  });

  test('el flujo completo deja la orden SINCRONIZADA y el contrato consumido es el canonico', async () => {
    // 1) El cliente inicia sesion y crea la orden
    const clienteToken = await login('e2e-cliente');
    const created = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${clienteToken}`)
      .send({ orderNumber: ORDER_NUMBER, patient: 'Paciente E2E', odSphere: -1.25, oiSphere: -1.5 });
    expect(created.status).toBe(201);
    const externalId = created.body.externalId as string;
    expect(externalId).toMatch(/^[0-9a-f-]{36}$/i);

    // 2) El middleware (simulado) consulta los pendientes (solo lectura)
    const pending = await request(app)
      .get('/api/external-orders/pending')
      .query({ limit: 100 })
      .set('X-API-Key', apiKey);
    expect(pending.status).toBe(200);
    const consumed = pending.body.data.find((o: { number: string }) => o.number === ORDER_NUMBER);
    expect(consumed).toBeDefined();
    // Evidencia del contrato canonico (R4/R5)
    expect(consumed.externalId).toBe(externalId);
    expect(consumed.orderFromSupplier).toBe(true);
    expect(consumed.status).toBe('CONFIRMED');
    expect(consumed.customer).toEqual({ company: COMPANY, patient: 'Paciente E2E' });
    expect(consumed).not.toHaveProperty('warehouse');
    expect(consumed).not.toHaveProperty('issuedOrderId');
    expect(consumed).not.toHaveProperty('items');

    // 3) Entregar NO sincroniza: sigue PENDIENTE
    const beforeSync = await prisma.order.findUnique({ where: { externalId } });
    expect(beforeSync?.syncStatus).toBe(SyncStatus.PENDIENTE);

    // 4) El middleware confirma la sincronizacion
    const sync = await request(app)
      .put(`/api/external-orders/${externalId}/sync`)
      .set('X-API-Key', apiKey);
    expect(sync.status).toBe(200);
    expect(sync.body.status).toBe('SINCRONIZADA');

    // 5) El panel admin ve la orden SINCRONIZADA
    const adminToken = await login('e2e-admin');
    const detail = await request(app)
      .get(`/api/orders/${created.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(detail.status).toBe(200);
    expect(detail.body.syncStatus).toBe('SINCRONIZADA');
    expect(detail.body.syncedAt).toBeTruthy();
  });
});
