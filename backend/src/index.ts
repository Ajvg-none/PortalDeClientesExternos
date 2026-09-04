import { createApp } from './app';
import { env } from './config/env';

/** Entrypoint del backend (dentro del contenedor, paridad ARQ-2). */
const app = createApp();

app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`[api] Portal de Clientes Externos escuchando en http://0.0.0.0:${env.port} (${env.nodeEnv})`);
});
