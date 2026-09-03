import { Router } from 'express';
import { statusController } from '../controllers/status.controller';

/** Router del modulo auth (montado en /api/auth). Endpoints reales en Fase 2. */
const router = Router();

// Sentinel estructural (Fase 1): verifica el montaje modular en /api/auth
router.get('/status', statusController('auth'));

export default router;
