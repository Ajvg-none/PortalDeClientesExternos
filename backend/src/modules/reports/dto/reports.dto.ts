import { query } from 'express-validator';

/** DTOs del modulo reports (Fase 5). */

export const exportOrdersValidators = [
  query('from').optional().isISO8601().withMessage('from debe ser fecha ISO 8601'),
  query('to').optional().isISO8601().withMessage('to debe ser fecha ISO 8601'),
  query('company').optional().trim().isLength({ max: 255 }),
  query('syncStatus')
    .optional()
    .isIn(['PENDIENTE', 'SINCRONIZADA'])
    .withMessage('syncStatus debe ser PENDIENTE|SINCRONIZADA'),
];
