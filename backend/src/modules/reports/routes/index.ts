import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { statusController } from '../../../core/status-controller';
import { dashboard, exportOrders } from '../controllers/reports.controller';
import { exportOrdersValidators } from '../dto/reports.dto';
import { validate } from '../../../core/middlewares/validate';
import { authenticate } from '../../auth/middlewares/authenticate';
import { requireRole } from '../../auth/middlewares/require-role';
import { passwordChangeRequired } from '../../auth/middlewares/password-change-required';

/**
 * Router del modulo reports (montado en /api/reports) - Fase 5.
 * Estadisticas y exportacion: SOLO ADMINISTRADOR (RF-33/RF-34).
 */
const router = Router();

// Sentinel estructural (Fase 1/B1.4)
router.get('/status', statusController('reports'));

// Autenticacion + primer acceso + rol admin
router.use(authenticate);
router.use(passwordChangeRequired);
router.use(requireRole(UserRole.ADMINISTRADOR));

// E5.1/RF-33 - dashboard de estadisticas
router.get('/dashboard', dashboard);

// E5.2/RF-34 - exportacion CSV del listado con filtros
router.get('/orders/export', exportOrdersValidators, validate, exportOrders);

export default router;
