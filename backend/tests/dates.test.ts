/**
 * REM-2026-09/R2.8 - dateToDayRange: el filtro "YYYY-MM-DD" se interpreta como
 * dia calendario en la zona horaria configurada (no en UTC crudo).
 */
import { dateToDayRange } from '../src/core/dates';

describe('R2.8 - dateToDayRange (zona horaria configurada)', () => {
  test('America/Santiago en invierno (UTC-4): el dia empieza a las 04:00Z', () => {
    const { start, end } = dateToDayRange('2026-07-10', 'America/Santiago');
    expect(start?.toISOString()).toBe('2026-07-10T04:00:00.000Z');
    expect(end?.toISOString()).toBe('2026-07-11T03:59:59.999Z');
  });

  test('America/Santiago en verano (UTC-3): el dia empieza a las 03:00Z', () => {
    const { start } = dateToDayRange('2026-01-10', 'America/Santiago');
    expect(start?.toISOString()).toBe('2026-01-10T03:00:00.000Z');
  });

  test('UTC: el dia calendario es el dia UTC', () => {
    const { start, end } = dateToDayRange('2026-07-10', 'UTC');
    expect(start?.toISOString()).toBe('2026-07-10T00:00:00.000Z');
    expect(end?.toISOString()).toBe('2026-07-10T23:59:59.999Z');
  });

  test('un ISO 8601 con hora se trata como instante exacto', () => {
    const { start, end } = dateToDayRange('2026-07-10T15:30:00Z', 'UTC');
    expect(start?.getTime()).toBe(end?.getTime());
  });

  test('valor invalido devuelve un rango vacio', () => {
    expect(dateToDayRange('no-es-fecha', 'UTC')).toEqual({});
  });
});
