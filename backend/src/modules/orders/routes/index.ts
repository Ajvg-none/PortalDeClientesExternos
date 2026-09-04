import { Router } from 'express';
import { statusController } from '../controllers/status.controller';

/** Router del modulo orders (montado en /api/orders). Endpoints reales en Fase 3. */
const router = Router();

// Sentinel estructural (Fase 1): verifica el montaje modular en /api/orders
router.get('/status', statusController('orders'));

export default router;
