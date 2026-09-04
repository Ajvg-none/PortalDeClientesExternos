/**
 * E5.2 - Generador de CSV puro: escapado, CRLF y BOM UTF-8 (RF-34).
 */
import { buildCsv, csvCell } from '../src/modules/reports/services/export';

describe('csvCell', () => {
  test('campos simples no se entrecomillan', () => {
    expect(csvCell('ORD-1')).toBe('ORD-1');
    expect(csvCell(null)).toBe('');
    expect(csvCell(undefined)).toBe('');
    expect(csvCell(123)).toBe('123');
  });

  test('coma, comilla o salto de linea entrecomillan y duplican comillas', () => {
    expect(csvCell('Optica, SA')).toBe('"Optica, SA"');
    expect(csvCell('dijo "hola"')).toBe('"dijo ""hola"""');
    expect(csvCell('linea1\nlinea2')).toBe('"linea1\nlinea2"');
    expect(csvCell('a\r\nb')).toBe('"a\r\nb"');
  });

  test('acentos se conservan tal cual', () => {
    expect(csvCell('Óptica Ávila')).toBe('Óptica Ávila');
  });
});

describe('buildCsv', () => {
  test('encabeza con BOM UTF-8, usa CRLF y agrega salto final', () => {
    const csv = buildCsv(['Numero', 'Cliente'], [['ORD-1', 'Optica Uno'], ['ORD-2', 'Optica Dos']]);
    expect(csv.startsWith('\ufeff')).toBe(true);
    const body = csv.slice(1); // sin BOM
    expect(body.split('\r\n')).toEqual(['Numero,Cliente', 'ORD-1,Optica Uno', 'ORD-2,Optica Dos', '']);
  });

  test('escapa celdas con contenido especial dentro del cuerpo', () => {
    const csv = buildCsv(['A', 'B'], [['x', 'con, coma'], ['y', 'con "comilla"']]);
    expect(csv).toContain('"con, coma"');
    expect(csv).toContain('"con ""comilla"""');
  });

  test('sin filas devuelve solo el encabezado (con BOM y CRLF)', () => {
    const csv = buildCsv(['A', 'B'], []);
    expect(csv).toBe('\ufeffA,B\r\n');
  });
});
