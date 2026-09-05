import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { statusController } from '../controllers/status.controller';
import { checkOrderNumber, create, getByRole, listByRole } from '../controllers/orders.controller';
import {
  createOrderValidators,
  listOrdersValidators,
  orderIdParamValidators,
  orderNumberParamValidators,
} from '../dto/order.dto';
import { validate } from '../../../core/middlewares/validate';
import { authenticate } from '../../auth/middlewares/authenticate';
import { requireRole } from '../../auth/middlewares/require-role';
import { passwordChangeRequired } from '../../auth/middlewares/password-change-required';

/**
 * Router del modulo orders (montado en /api/orders).
 * - Crear orden: SOLO CLIENTE_EXTERNO (RF-22/32).
 * - Listar/detalle segun rol (GET / y GET /:id):
 *   * CLIENTE_EXTERNO -> su propio historial (Fase 3, RF-05…17).
 *   * LABORATORIO/ADMINISTRADOR -> listado global de solo lectura
 *     (M4.7, RF-18…21 / RF-28…31; admin ve estado + "pendiente desde").
 * Inmutabilidad (RF-17): no existen rutas de edicion ni cancelacion.
 */
const router = Router();

// Sentinel estructural (Fase 1/B1.4)
router.get('/status', statusController('orders'));

// Autenticacion + primer acceso (DEC-6)
router.use(authenticate);
router.use(passwordChangeRequired);

// Crear orden (RF-07…13) - solo cliente
router.post('/', requireRole(UserRole.CLIENTE_EXTERNO), createOrderValidators, validate, create);

// Historial propio / listado global segun rol
router.get('/', listOrdersValidators, validate, listByRole);

// REM-2026-09/RF-10: check async de unicidad del N de Orden (solo cliente)
router.get(
  '/order-number/:value',
  requireRole(UserRole.CLIENTE_EXTERNO),
  orderNumberParamValidators,
  validate,
  checkOrderNumber,
);

// Detalle segun rol (cliente: solo suyas)
router.get('/:id', orderIdParamValidators, validate, getByRole);

export default router;
