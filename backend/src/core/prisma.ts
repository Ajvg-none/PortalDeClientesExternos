import { PrismaClient } from '@prisma/client';

/**
 * Cliente Prisma singleton (capa transversal core).
 * Se crea una unica instancia por proceso; en desarrollo se reutiliza
 * via globalThis para evitar agotar conexiones con hot-reload.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
