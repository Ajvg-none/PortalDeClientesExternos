/**
 * Seed de DEMO para probar la API en el entorno de desarrollo (BD "portal").
 * No se ejecuta automaticamente: uso manual -> npx tsx scripts/seed-demo.ts
 * Crea: admin (ADMINISTRADOR, sin flag), cliente1 (CLIENTE_EXTERNO, flag TRUE),
 * lab1 (LABORATORIO). Contrasena comun de ejemplo: Cambiar123!
 */
import bcrypt from 'bcryptjs';
import { prisma } from '../src/core/prisma';
import { UserRole } from '@prisma/client';

async function main(): Promise<void> {
  const password = 'Cambiar123!';
  const hash = bcrypt.hashSync(password, 10);
  const usernames = ['admin', 'cliente1', 'lab1'];

  await prisma.user.deleteMany({ where: { username: { in: usernames } } });

  await prisma.user.createMany({
    data: [
      {
        username: 'admin',
        passwordHash: hash,
        role: UserRole.ADMINISTRADOR,
        mustChangePassword: false,
      },
      {
        username: 'cliente1',
        passwordHash: hash,
        role: UserRole.CLIENTE_EXTERNO,
        companyName: 'Optica Demo',
        mustChangePassword: true, // para probar el flujo de primer acceso
      },
      {
        username: 'lab1',
        passwordHash: hash,
        role: UserRole.LABORATORIO,
        mustChangePassword: false,
      },
    ],
  });

  // eslint-disable-next-line no-console
  console.log(`[seed-demo] OK: admin/cliente1/lab1 creados. Contrasena: ${password}`);
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('[seed-demo] error', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
