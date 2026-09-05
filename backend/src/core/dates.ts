/**
 * REM-2026-09/R2.8 - Utilidades de fecha/tiempo (capa transversal core).
 * Los filtros por rango de fechas interpretan el dia calendario (YYYY-MM-DD)
 * en ANALYTICS_TIMEZONE (la misma zona que agrupa el dashboard E5.1), no en
 * UTC crudo: evita que una orden creada a las 02:00 UTC se filtre en el dia
 * local equivocado.
 */

interface Parts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function formatParts(instant: number, timeZone: string): Parts | null {
  try {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const parts = dtf.formatToParts(new Date(instant));
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? NaN);
    return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour'), minute: get('minute'), second: get('second') };
  } catch {
    return null;
  }
}

/** Desplazamiento (offset) en ms de la zona para un instante dado. */
function offsetMsAt(instantMs: number, timeZone: string): number {
  const p = formatParts(instantMs, timeZone);
  if (!p) return 0;
  const wallAsUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return wallAsUtc - instantMs;
}

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Convierte una fecha del filtro a un rango [start, end] en la zona indicada.
 * - "YYYY-MM-DD": dia calendario completo en la zona (start 00:00 -> end 23:59:59.999).
 * - Otro ISO 8601: instante exacto (start = end).
 * Devuelve {} si no se puede interpretar.
 */
export function dateToDayRange(
  value: string,
  timeZone: string,
): { start?: Date; end?: Date } {
  const m = DATE_ONLY.exec(value);
  if (!m) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? {} : { start: d, end: d };
  }
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (formatParts(Date.UTC(year, month - 1, day, 12), timeZone) === null) {
    return {};
  }
  // Ancla al mediodia UTC del dia para estimar el offset DST correcto
  const noonUtc = Date.UTC(year, month - 1, day, 12);
  const offset = offsetMsAt(noonUtc, timeZone);
  const start = new Date(Date.UTC(year, month - 1, day, 0) - offset);
  const end = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999) - offset);
  return { start, end };
}
