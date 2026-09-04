/**
 * Integracion - Fase 2 (Gate F2): flujo completo de autenticacion y gestion de
 * usuarios contra la BD real de pruebas (portal_test).
 * El runner (npm run test:integration) resetea la BD aplicando migraciones antes.
 */
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { PrismaClient, UserRole } from '@prisma/client';
import { createApp } from '../src/app';

const app = createApp();

const testUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
const prisma = new PrismaClient({ datasources: { db: { url: testUrl } } });

const PASSWORD = 'Temporal123';
const HASH = bcrypt.hashSync(PASSWORD, 10);

async function login(username: string, password: string) {
  return request(app).post('/api/auth/login').send({ username, password });
}

describe('Fase 2 - Auth y gestion de usuarios (integrador)', () => {
  let adminToken = '';
  let clientId = '';
  let clientToken = '';
  let createdId = '';

  beforeAll(async () => {
    // Seed limpio (el runner ya reseteo la BD)
    await prisma.user.createMany({
      data: [
        { username: 'admin', passwordHash: HASH, role: UserRole.ADMINISTRADOR, mustChangePassword: false },
        {
          username: 'cliente1',
          passwordHash: HASH,
          role: UserRole.CLIENTE_EXTERNO,
          companyName: 'Optica Uno',
          mustChangePassword: true,
        },
        { username: 'lab1', passwordHash: HASH, role: UserRole.LABORATORIO, mustChangePassword: false },
      ],
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
  });

  test('U2.5 - login con username correcto devuelve token, rol y flag', async () => {
    const res = await login('admin', PASSWORD);
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user).toMatchObject({ username: 'admin', role: 'ADMINISTRADOR', mustChangePassword: false });
    adminToken = res.body.token;
  });

  test('U2.5 - credenciales invalidas: 401 UNAUTHORIZED', async () => {
    const res = await login('admin', 'incorrecta');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  test('U2.7 - listado sin token responde 401', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(401);
  });

  test('U2.7 - listado como admin devuelve los usuarios con filtros', async () => {
    const all = await request(app).get('/api/users').set('Authorization', `Bearer ${adminToken}`);
    expect(all.status).toBe(200);
    expect(all.body.total).toBe(3);
    expect(all.body.data.map((u: { username: string }) => u.username)).toEqual([
      'admin',
      'cliente1',
      'lab1',
    ]);

    const clientes = await request(app)
      .get('/api/users')
      .query({ role: 'CLIENTE_EXTERNO', isActive: 'true' })
      .set('Authorization', `Bearer ${adminToken}`);
    expect(clientes.body.total).toBe(1);
    expect(clientes.body.data[0].username).toBe('cliente1');

    const search = await request(app)
      .get('/api/users')
      .query({ q: 'Optica' })
      .set('Authorization', `Bearer ${adminToken}`);
    expect(search.body.total).toBe(1);
  });

  test('U2.4 - rol no admin (y con flag pendiente) no puede listar usuarios', async () => {
    const resLogin = await login('cliente1', PASSWORD);
    expect(resLogin.status).toBe(200);
    expect(resLogin.body.user.mustChangePassword).toBe(true);
    clientToken = resLogin.body.token;

    // U2.8: con flag activo, solo /change-password es accesible
    const blocked = await request(app).get('/api/users').set('Authorization', `Bearer ${clientToken}`);
    expect(blocked.status).toBe(403);
    expect(blocked.body.code).toBe('PASSWORD_CHANGE_REQUIRED');
  });

  test('U2.8 - change-password valida la actual y limpia el flag', async () => {
    const wrongCurrent = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ currentPassword: 'incorrecta', newPassword: 'NuevaClave1' });
    expect(wrongCurrent.status).toBe(400);

    const ok = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ currentPassword: PASSWORD, newPassword: 'NuevaClave1' });
    expect(ok.status).toBe(200);
    expect(ok.body.user.mustChangePassword).toBe(false);

    // Ahora el guard no bloquea; el rol CLIENTE_EXTERNO responde 403 FORBIDDEN (matriz de roles)
    const after = await request(app).get('/api/users').set('Authorization', `Bearer ${clientToken}`);
    expect(after.status).toBe(403);
    expect(after.body.code).toBe('FORBIDDEN');
  });

  test('U2.4 - LABORATORIO tampoco puede gestionar usuarios', async () => {
    const lab = await login('lab1', PASSWORD);
    const res = await request(app).get('/api/users').set('Authorization', `Bearer ${lab.body.token}`);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');
  });

  test('U2.6 - alta de usuario: validacion, unicidad y flag de primer acceso', async () => {
    const noAuth = await request(app)
      .post('/api/users')
      .send({ username: 'cliente2', password: 'OtraClave1', role: 'CLIENTE_EXTERNO', companyName: 'Optica Dos' });
    expect(noAuth.status).toBe(401);

    const invalid = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ password: 'OtraClave1', role: 'CLIENTE_EXTERNO' }); // sin username ni companyName
    expect(invalid.status).toBe(400);
    expect(invalid.body.code).toBe('VALIDATION_ERROR');

    const duplicado = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ username: 'cliente1', password: 'OtraClave1', role: 'CLIENTE_EXTERNO', companyName: 'X' });
    expect(duplicado.status).toBe(409);
    expect(duplicado.body.code).toBe('USERNAME_ALREADY_EXISTS');

    const created = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ username: 'cliente2', password: 'OtraClave1', role: 'CLIENTE_EXTERNO', companyName: 'Optica Dos' });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ username: 'cliente2', mustChangePassword: true, isActive: true });
    expect(created.body).not.toHaveProperty('passwordHash');
    createdId = created.body.id;
  });

  test('U2.7 - baja logica (DEC-4): usuario deshabilitado no puede iniciar sesion', async () => {
    const client = await prisma.user.findUnique({ where: { username: 'cliente1' } });
    clientId = client!.id.toString();

    const baja = await request(app)
      .patch(`/api/users/${clientId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false });
    expect(baja.status).toBe(200);
    expect(baja.body.isActive).toBe(false);

    const res = await login('cliente1', 'NuevaClave1');
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('FORBIDDEN');

    // Reactivar
    const alta = await request(app)
      .patch(`/api/users/${clientId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: true });
    expect(alta.body.isActive).toBe(true);
  });

  test('U2.6/RF-26 - reset de contrasena: la anterior deja de servir y el flag vuelve a TRUE', async () => {
    const reset = await request(app)
      .post(`/api/users/${clientId}/reset-password`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ newPassword: 'Reset12345' });
    expect(reset.status).toBe(200);
    expect(reset.body.user.mustChangePassword).toBe(true);

    expect((await login('cliente1', 'NuevaClave1')).status).toBe(401);
    const res = await login('cliente1', 'Reset12345');
    expect(res.status).toBe(200);
    expect(res.body.user.mustChangePassword).toBe(true);
  });

  test('DEC-4 - no existe DELETE de usuarios (404) y el registro sigue existiendo', async () => {
    const del = await request(app).delete(`/api/users/${clientId}`).set('Authorization', `Bearer ${adminToken}`);
    expect(del.status).toBe(404);
    const still = await prisma.user.findUnique({ where: { id: BigInt(clientId) } });
    expect(still).not.toBeNull();
  });

  test('U2.7 - edicion de un usuario recien creado', async () => {
    const upd = await request(app)
      .patch(`/api/users/${createdId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ companyName: 'Optica Dos SA' });
    expect(upd.status).toBe(200);
    expect(upd.body.companyName).toBe('Optica Dos SA');
  });
});
