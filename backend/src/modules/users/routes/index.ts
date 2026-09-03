import { Router } from 'express';
import { statusController } from '../controllers/status.controller';

/** Router del modulo users (montado en /api/users). Endpoints reales en Fase 2. */
const router = Router();

// Sentinel estructural (Fase 1): verifica el montaje modular en /api/users
router.get('/status', statusController('users'));

export default router;
