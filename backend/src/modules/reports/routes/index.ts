import { Router } from 'express';
import { statusController } from '../controllers/status.controller';

/** Router del modulo reports (montado en /api/reports). Endpoints reales en Fase 5. */
const router = Router();

// Sentinel estructural (Fase 1): verifica el montaje modular en /api/reports
router.get('/status', statusController('reports'));

export default router;
