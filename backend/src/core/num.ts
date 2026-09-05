/**
 * REM-cleanup 2026-09 / F2 - Coercion numerica unica de la API.
 * Los valores opticos llegan como Decimal de Postgres, number o string
 * numerica. Esta funcion devuelve number o null y elimina la duplicacion de
 * `num()` que existia en orders.mapper, external-orders.serializer y
 * core/order-format.
 */
export function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

/** Versiones con dos decimales fijos (p. ej. esferas) para resumenes. */
export function fixed2(value: number | null): string | null {
  return value === null ? null : value.toFixed(2);
}
