/**
 * E5.2 - Generador de CSV puro (sin dependencias de BD), testable.
 * - Encabezados en la primera fila.
 * - Escapado CSV: los campos con coma, comilla, CR o LF se entrecomillan y las
 *   comillas internas se duplican.
 * - Final de linea CRLF y BOM UTF-8 (\ufeff) para que Excel interprete los
 *   acentos correctamente (RF-34).
 */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function buildCsv(headers: string[], rows: unknown[][]): string {
  const all = [headers.map((h) => csvCell(h)), ...rows.map((r) => r.map(csvCell))];
  const body = all.map((line) => line.join(',')).join('\r\n');
  // BOM UTF-8 + salto final
  return `\ufeff${body}\r\n`;
}
