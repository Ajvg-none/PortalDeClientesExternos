import { Router } from 'express';
import { statusController } from '../controllers/status.controller';

/**
 * Router del modulo external-orders (montado en /api/external-orders).
 * Contrato PULL con el middleware en Fase 4 (GET /pending, PUT /:externalId/sync).
 */
const router = Router();

// Sentinel estructural (Fase 1): verifica el montaje modular
router.get('/status', statusController('external-orders'));

export default router;
