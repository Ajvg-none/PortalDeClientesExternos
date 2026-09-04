import type { RequestHandler } from 'express';

/** Controlador esqueleto: responde el nombre del modulo (B1.4). */
export function statusController(moduleName: string): RequestHandler {
  return (_req, res) => {
    res.json({ module: moduleName });
  };
}
