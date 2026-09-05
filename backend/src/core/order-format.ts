import { fixed2, toNumber } from './num';

/**
 * REM-cleanup 2026-09 / F2 - Resumen optico de una orden compartido entre el
 * modulo orders (mapper de listados/detalle) y reports (exportacion). Vive en
 * core para evitar que reports importe implementaciones internas de orders.
 */

/**
 * RF-05 - Resumen rapido de datos opticos, p. ej. "OD -2.50 / OI -2.25".
 * Maneja ojos vacios: si un ojo no tiene esfera, se omite esa parte.
 */
export function opticalSummary(order: { odSphere?: unknown; oiSphere?: unknown }): string {
  const parts: string[] = [];
  const od = fixed2(toNumber(order.odSphere));
  const oi = fixed2(toNumber(order.oiSphere));
  if (od !== null) parts.push(`OD ${od}`);
  if (oi !== null) parts.push(`OI ${oi}`);
  return parts.join(' / ');
}
