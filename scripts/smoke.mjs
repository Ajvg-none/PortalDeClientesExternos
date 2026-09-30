#!/usr/bin/env node
/**
 * X7.4 - Smoke test de despliegue (staging/produccion). Usa fetch nativo
 * (Node 20) y no depende del repo: valida salud, login, dashboard y el
 * contrato del middleware contra una instancia en marcha.
 *
 * Variables:
 *   SMOKE_BASE_URL      base de la API    (default http://localhost:3000)
 *   SMOKE_FRONTEND_URL  base del frontend (opcional; valida HTML)
 *   SMOKE_ADMIN_USER    default admin
 *   SMOKE_ADMIN_PASS    default Cambiar123!
 *   SMOKE_API_KEY       API Key del middleware (opcional)
 *
 * Uso: node scripts/smoke.mjs   (exit 0 = todo OK, 1 = algun fallo)
 */
import { fileURLToPath } from 'node:url';

const BASE_URL = (process.env.SMOKE_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const FRONTEND_URL = process.env.SMOKE_FRONTEND_URL?.replace(/\/$/, '');
const ADMIN_USER = process.env.SMOKE_ADMIN_USER ?? 'admin';
const ADMIN_PASS = process.env.SMOKE_ADMIN_PASS ?? 'Cambiar123!';
const API_KEY = process.env.SMOKE_API_KEY;

async function expectOk(res, label) {
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`${label}: HTTP ${res.status} ${body.slice(0, 200)}`);
  }
  return res;
}

/**
 * Ejecuta los chequeos y devuelve la lista de resultados. No usa process.exit
 * para poder reutilizarse desde tests (el entrypoint decide el exit code).
 */
export async function runSmoke() {
  const results = [];
  const run = async (name, fn) => {
    try {
      await fn();
      results.push({ name, ok: true });
    } catch (err) {
      results.push({ name, ok: false, error: err.message });
    }
  };

  let token = null;

  await run('GET /api/health', async () => {
    const res = await expectOk(await fetch(`${BASE_URL}/api/health`), 'health');
    const body = await res.json();
    if (body.status !== 'ok') throw new Error(`health inesperado: ${JSON.stringify(body)}`);
  });

  await run('POST /api/auth/login (admin)', async () => {
    const res = await expectOk(
      await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: ADMIN_USER, password: ADMIN_PASS }),
      }),
      'login',
    );
    const body = await res.json();
    if (!body.token) throw new Error('login sin token');
    token = body.token;
  });

  await run('GET /api/reports/dashboard (admin)', async () => {
    if (!token) throw new Error('sin token de admin');
    await expectOk(
      await fetch(`${BASE_URL}/api/reports/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      'dashboard',
    );
  });

  if (API_KEY) {
    await run('GET /api/external-orders/pending (X-API-Key)', async () => {
      await expectOk(
        await fetch(`${BASE_URL}/api/external-orders/pending`, { headers: { 'X-API-Key': API_KEY } }),
        'pending',
      );
    });
  }

  if (FRONTEND_URL) {
    await run('GET frontend /', async () => {
      const res = await expectOk(await fetch(`${FRONTEND_URL}/`), 'frontend');
      const html = await res.text();
      if (!html.includes('<div id="root"') && !html.includes('<!doctype html')) {
        throw new Error('el frontend no devolvio HTML esperado');
      }
    });
  }

  return results;
}

/** Formatea y reporta resultados; devuelve true si todo paso. */
export function reportSmoke(results) {
  let allOk = true;
  for (const r of results) {
    if (r.ok) {
      console.log(`  OK   ${r.name}`);
    } else {
      allOk = false;
      console.error(`  FAIL ${r.name}: ${r.error}`);
    }
  }
  return allOk;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  console.log(`[smoke] objetivo: ${BASE_URL}${FRONTEND_URL ? ` / ${FRONTEND_URL}` : ''}`);
  runSmoke()
    .then((results) => {
      const ok = reportSmoke(results);
      console.log(ok ? '[smoke] OK' : '[smoke] FALLO');
      // exitCode (no process.exit) para no abortar con handles de fetch vivos
      process.exitCode = ok ? 0 : 1;
    })
    .catch((err) => {
      console.error('[smoke] error inesperado:', err);
      process.exitCode = 1;
    });
}
