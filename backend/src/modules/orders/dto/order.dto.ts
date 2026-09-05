import { body, param, query } from 'express-validator';
import { MOUNT_TYPES, NUMERIC_FIELDS, TREATMENTS } from '../constants';

/**
 * DTO de creacion de orden (O3.1/O3.3, RF-07…RF-11).
 * - Obligatorios: orderNumber y patient (RF-09; "Empresa" se autopobla - DEC-3).
 * - Campos numericos sin validacion estricta de negocio (RF-09): se aceptan
 *   numeros, strings numericas o vacios; cualquier otro valor -> 400.
 * - No se aceptan adjuntos (RF-11): la API no procesa multipart.
 */

function isBlank(v: unknown): boolean {
  return v === undefined || v === null || v === '';
}

// Columna DECIMAL(6,2) => max 9999.99; el degradado usa DECIMAL(5,2) => max
// 999.99. REM-2026-09: un valor fuera de rango producia un 500 de BD; se
// valida para responder 400 (RF-09 permite vacio, no valores imposibles).
const numericRule = (field: string) =>
  body(field)
    .custom((value: unknown) => {
      if (isBlank(value)) return true; // campo opcional (RF-09)
      const n = Number(value);
      if (Number.isNaN(n) || !Number.isFinite(n)) return false;
      const max = field === 'colorationDegradadoPercent' ? 999.99 : 9999.99;
      return Math.abs(n) <= max;
    })
    .withMessage(`${field} debe ser un numero valido o dejarse vacio`);

const optionalText = (field: string, max: number) =>
  body(field)
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max })
    .withMessage(`${field} excede ${max} caracteres`);

export const createOrderValidators = [
  body('orderNumber')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('orderNumber es obligatorio (hasta 100 caracteres)'),
  body('patient')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('patient es obligatorio (hasta 255 caracteres)'),

  // Formula OD/OI + degradado: numeros o vacio
  ...NUMERIC_FIELDS.map((field) => numericRule(field)),

  optionalText('odProductCode', 100),
  optionalText('oiProductCode', 100),

  body('treatment')
    .optional({ values: 'falsy' })
    .trim()
    .custom((v: string) => (TREATMENTS as readonly string[]).includes(v))
    .withMessage(`treatment debe ser uno de: ${TREATMENTS.join(', ')}`),

  body('mountType')
    .optional({ values: 'falsy' })
    .trim()
    .custom((v: string) => (MOUNT_TYPES as readonly string[]).includes(v))
    .withMessage(`mountType debe ser uno de: ${MOUNT_TYPES.join(', ')}`),

  optionalText('mountBrand', 100),
  optionalText('mountModel', 100),
  optionalText('mountColor', 100),
  optionalText('colorationColor', 100),

  body('colorationUnicolor')
    .optional({ values: 'falsy' })
    .isBoolean()
    .withMessage('colorationUnicolor debe ser true|false')
    .toBoolean(),

  optionalText('observations', 2000),
];

export const listOrdersValidators = [
  query('from').optional().isISO8601().withMessage('from debe ser fecha ISO 8601'),
  query('to').optional().isISO8601().withMessage('to debe ser fecha ISO 8601'),
  query('company').optional().trim().isLength({ max: 255 }),
  query('syncStatus')
    .optional()
    .isIn(['PENDIENTE', 'SINCRONIZADA'])
    .withMessage('syncStatus debe ser PENDIENTE|SINCRONIZADA'),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('offset').optional().isInt({ min: 0 }).toInt(),
];

export const orderIdParamValidators = [
  // El id de BD es BIGINT: secuencia de digitos
  param('id').custom((v) => /^\d+$/.test(String(v))).withMessage('id invalido'),
];

// REM-2026-09/RF-10: el N de Orden del cliente (hasta 100 caracteres, igual
// que la columna order_number)
export const orderNumberParamValidators = [
  param('value')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('value debe tener entre 1 y 100 caracteres'),
];
