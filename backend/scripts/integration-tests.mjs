/**
 * Ejecuta los tests de INTEGRACION (B1.5):
 * 1) Resetea la BD de pruebas (TEST_DATABASE_URL) aplicando las migraciones
 *    de Prisma desde cero (prisma migrate reset --force --skip-seed).
 * 2) Corre Jest solo con los archivos *.integration.test.ts.
 * Uso: npm run test:integration (dentro del contenedor de la API).
 */
import { spawnSync } from 'node:child_process';

// REM-2026-09: sin fallback a DATABASE_URL. Este script ejecuta
// `prisma migrate reset` (DROP + recrea tablas): solo debe correr contra la
// BD de PRUEBAS, nunca contra dev/prod. Se exige TEST_DATABASE_URL explicita
// y un nombre de base que termine en `_test` como red de seguridad extra.
const testUrl = process.env.TEST_DATABASE_URL;
if (!testUrl) {
  // eslint-disable-next-line no-console
  console.error('[test:integration] Falta TEST_DATABASE_URL (ver backend/.env.example)');
  process.exit(1);
}
try {
  const dbName = new URL(testUrl).pathname.split('/').filter(Boolean).pop() ?? '';
  if (!dbName.endsWith('_test')) {
    // eslint-disable-next-line no-console
    console.error(
      `[test:integration] TEST_DATABASE_URL debe apuntar a una base *_test (recibida: "${dbName}"). ` +
        'Negado para proteger bases de dev/prod.',
    );
    process.exit(1);
  }
} catch {
  // eslint-disable-next-line no-console
  console.error('[test:integration] TEST_DATABASE_URL no es una URL valida');
  process.exit(1);
}

const env = {
  ...process.env,
  DATABASE_URL: testUrl,
  TEST_DATABASE_URL: testUrl,
};

// 1) BD de pruebas limpia con las migraciones versionadas
const reset = spawnSync('npx', ['prisma', 'migrate', 'reset', '--force', '--skip-seed'], {
  env,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
if (reset.status !== 0) {
  process.exit(reset.status ?? 1);
}

// 2) Suite de integracion
const jest = spawnSync(
  'npx',
  [
    'jest',
    '--runInBand',
    '--testMatch',
    '**/*.integration.test.ts',
    '--testPathIgnorePatterns',
    '/node_modules/',
  ],
  { env, stdio: 'inherit', shell: process.platform === 'win32' },
);
process.exit(jest.status ?? 1);
