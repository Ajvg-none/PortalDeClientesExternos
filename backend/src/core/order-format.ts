/**
 * REM-2026-09/R4 - Resumen optico de una orden compartido entre el modulo
 * orders (mapper de listados/detalle) y reports (exportacion). Vive en core
 * para evitar que reports importe implementaciones internas de orders (ARQ-1).
 */

function num(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

function fixed(value: number | null): string | null {
  return value === null ? null : value.toFixed(2);
}

/**
 * RF-05 - Resumen rapido de datos opticos, p. ej. "OD -2.50 / OI -2.25".
 * Maneja ojos vacios: si un ojo no tiene esfera, se omite esa parte.
 */
export function opticalSummary(order: { odSphere?: unknown; oiSphere?: unknown }): string {
  const parts: string[] = [];
  const od = fixed(num(order.odSphere));
  const oi = fixed(num(order.oiSphere));
  if (od !== null) parts.push(`OD ${od}`);
  if (oi !== null) parts.push(`OI ${oi}`);
  return parts.join(' / ');
}
