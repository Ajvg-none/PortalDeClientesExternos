/**
 * Seed de la API Key de integracion (M4.1/RF-40) para el entorno de desarrollo
 * (BD "portal"). Uso manual -> npx tsx scripts/seed-apikey.ts
 * Deja UNA unica clave activa y estatica (las demas quedan inactivas).
 */
import { prisma } from '../src/core/prisma';

const KEY = process.env.MIDDLEWARE_API_KEY ?? 'dev-middleware-api-key-0001';

async function main(): Promise<void> {
  const row = await prisma.apiKey.findFirst({ where: { keyValue: KEY } });
  if (!row) {
    await prisma.apiKey.create({
      data: { keyValue: KEY, description: 'API Key del middleware (contrato PULL) v1', isActive: true },
    });
  } else if (!row.isActive) {
    await prisma.apiKey.update({ where: { id: row.id }, data: { isActive: true } });
  }
  // RF-40: una sola clave activa
  await prisma.apiKey.updateMany({
    where: { keyValue: { not: KEY } },
    data: { isActive: false },
  });
  // eslint-disable-next-line no-console
  console.log(`[seed-apikey] OK: API Key activa = ${KEY}`);
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('[seed-apikey] error', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
