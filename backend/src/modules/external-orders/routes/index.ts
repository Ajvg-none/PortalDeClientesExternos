import { Router } from 'express';
import { statusController } from '../../../core/status-controller';
import { pending, sync } from '../controllers/external-orders.controller';
import { pendingOrdersValidators, syncValidators } from '../dto/external-orders.dto';
import { validate } from '../../../core/middlewares/validate';
import { apiKeyAuth } from '../middlewares/api-key-auth';

/**
 * Router del modulo external-orders (montado en /api/external-orders) - Fase 4.
 * Contrato PULL con el middleware (RF-35…52): NO usa JWT de usuarios, se
 * autentica con la API Key estatica del portal (header X-API-Key, RF-39/41).
 */
const router = Router();

// Sentinel estructural (Fase 1/B1.4)
router.get('/status', statusController('external-orders'));

// A partir de aca el contrato exige la API Key (RF-39/41)
router.use(apiKeyAuth);

// M4.2/M4.3 - consulta de pendientes (RF-35…38)
router.get('/pending', pendingOrdersValidators, validate, pending);

// M4.5 - confirmacion de sincronizacion (RF-49…52)
router.put('/:externalId/sync', syncValidators, validate, sync);

export default router;
