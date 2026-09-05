import type { RequestHandler } from 'express';

/**
 * Controlador "sentinel" estructural (Fase 1/B1.4) compartido por todos los
 * modulos (REM-2026-09/R4): responde el nombre del modulo montado.
 * Vive en core para no duplicar el factory en cada modulo de negocio (ARQ-1).
 */
export function statusController(moduleName: string): RequestHandler {
  return (_req, res) => {
    res.json({ module: moduleName });
  };
}
