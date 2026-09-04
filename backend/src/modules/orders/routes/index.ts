import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { statusController } from '../controllers/status.controller';
import { create, getMineById, listMine } from '../controllers/orders.controller';
import {
  createOrderValidators,
  listOrdersValidators,
  orderIdParamValidators,
} from '../dto/order.dto';
import { validate } from '../../../core/middlewares/validate';
import { authenticate } from '../../auth/middlewares/authenticate';
import { requireRole } from '../../auth/middlewares/require-role';
import { passwordChangeRequired } from '../../auth/middlewares/password-change-required';

/**
 * Router del modulo orders (montado en /api/orders) - Fase 3.
 * Solo CLIENTE_EXTERNO: Laboratorio y Administrador NO crean ni acceden por
 * aqui (RF-22/RF-32; sus listados globales llegan en la Fase 4 / M4.7).
 * Inmutabilidad (RF-17): no existen rutas de edicion ni cancelacion.
 */
const router = Router();

// Sentinel estructural (Fase 1/B1.4)
router.get('/status', statusController('orders'));

// Autenticacion + primer acceso (DEC-6) + rol cliente
router.use(authenticate);
router.use(passwordChangeRequired);
router.use(requireRole(UserRole.CLIENTE_EXTERNO));

// Crear orden (RF-07…13)
router.post('/', createOrderValidators, validate, create);

// Historial propio con filtros (RF-05/RF-06/RF-15)
router.get('/', listOrdersValidators, validate, listMine);

// Detalle de una orden propia (RF-16)
router.get('/:id', orderIdParamValidators, validate, getMineById);

export default router;
