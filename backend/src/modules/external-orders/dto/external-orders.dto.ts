import { param, query } from 'express-validator';

/** DTOs del contrato con el middleware (Fase 4). */

export const pendingOrdersValidators = [
  // RF-37: paginacion con defaults manejados en el servicio (limit=10)
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('offset').optional().isInt({ min: 0 }).toInt(),
];

// RF-49/R5: el path usa SIEMPRE el external_id (UUID generado por el portal)
export const syncValidators = [
  param('externalId')
    .isUUID()
    .withMessage('externalId debe ser un UUID valido'),
];
