#!/usr/bin/env node
/**
 * Check de estructura modular (B1.1) - verificacion automatizable del Gate F1.
 * Valida que el arbol modular (ARQ-1, anexo v1.2) y los archivos base existen.
 * Uso: node scripts/check-structure.mjs  (salida 0 = OK).
 */
import { existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];

const requiredFiles = [
  'backend/package.json',
  'backend/tsconfig.json',
  'backend/Dockerfile',
  'backend/.env.example',
  'backend/.dockerignore',
  'backend/jest.config.cjs',
  'backend/prisma/schema.prisma',
  'backend/src/app.ts',
  'backend/src/index.ts',
  'backend/src/config/env.ts',
  'backend/src/core/errors.ts',
  'backend/src/core/logger.ts',
  'backend/src/core/prisma.ts',
  'backend/src/core/middlewares/error-handler.ts',
  'backend/scripts/integration-tests.mjs',
  'frontend/package.json',
  'frontend/tsconfig.json',
  'frontend/vite.config.ts',
  'frontend/Dockerfile',
  'frontend/.env.example',
  'frontend/index.html',
  'frontend/src/main.tsx',
  'infra/docker-compose.yml',
];

const backendModules = ['auth', 'users', 'orders', 'external-orders', 'reports'];
const backendModuleDirs = ['routes', 'controllers', 'services', 'dto', 'tests'];

const frontendFeatures = [
  'auth',
  'orders-client',
  'orders-lab',
  'admin-users',
  'admin-orders',
  'admin-stats',
];
const frontendFeatureDirs = ['pages', 'components', 'hooks', 'api', 'types', 'tests'];

for (const file of requiredFiles) {
  if (!existsSync(join(root, file))) errors.push(`falta: ${file}`);
}

for (const mod of backendModules) {
  for (const dir of backendModuleDirs) {
    const path = join(root, 'backend', 'src', 'modules', mod, dir);
    if (!existsSync(path)) errors.push(`falta carpeta del modulo backend: ${mod}/${dir}`);
  }
}

for (const feat of frontendFeatures) {
  for (const dir of frontendFeatureDirs) {
    const path = join(root, 'frontend', 'src', 'features', feat, dir);
    if (!existsSync(path)) errors.push(`falta carpeta de feature frontend: ${feat}/${dir}`);
  }
}

// Carpetas transversales del frontend
for (const dir of ['app', 'shared', 'core']) {
  const path = join(root, 'frontend', 'src', dir);
  if (!existsSync(path)) errors.push(`falta capa transversal frontend: src/${dir}`);
}

// .env.example debe documentar las variables base (sin secretos reales)
const envSample = readdirSync(join(root, 'backend'))
  .filter((f) => f === '.env.example')
  .length;
if (!envSample) errors.push('falta backend/.env.example');

if (errors.length > 0) {
  console.error('[check-structure] FALLO:');
  for (const err of errors) console.error(`  - ${err}`);
  process.exit(1);
}
console.log('[check-structure] OK: estructura modular (ARQ-1) y archivos base presentes.');
