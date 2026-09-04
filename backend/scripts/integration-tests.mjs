/**
 * Ejecuta los tests de INTEGRACION (B1.5):
 * 1) Resetea la BD de pruebas (TEST_DATABASE_URL) aplicando las migraciones
 *    de Prisma desde cero (prisma migrate reset --force --skip-seed).
 * 2) Corre Jest solo con los archivos *.integration.test.ts.
 * Uso: npm run test:integration (dentro del contenedor de la API).
 */
import { spawnSync } from 'node:child_process';

const testUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
if (!testUrl) {
  // eslint-disable-next-line no-console
  console.error('[test:integration] Falta TEST_DATABASE_URL (ver backend/.env.example)');
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
