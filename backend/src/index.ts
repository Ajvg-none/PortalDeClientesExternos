import { createApp } from './app';
import { assertEnv, env } from './config/env';

/** Entrypoint del backend (dentro del contenedor, paridad ARQ-2). */
assertEnv(); // REM-2026-09/R2.3: fail-fast en produccion ante secretos por defecto
const app = createApp();

app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`[api] Portal de Clientes Externos escuchando en http://0.0.0.0:${env.port} (${env.nodeEnv})`);
});
