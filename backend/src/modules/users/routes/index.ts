import { Router } from 'express';
import { UserRole } from '@prisma/client';
import { statusController } from '../controllers/status.controller';
import { authenticate } from '../../auth/middlewares/authenticate';
import { requireRole } from '../../auth/middlewares/require-role';
import { passwordChangeRequired } from '../../auth/middlewares/password-change-required';
import { validate } from '../../../core/middlewares/validate';
import {
  createUserValidators,
  idParamValidators,
  listUsersValidators,
  resetPasswordValidators,
  setActiveValidators,
  updateUserValidators,
} from '../dto/user.dto';
import {
  create,
  getById,
  list,
  resetPassword,
  setStatus,
  update,
} from '../controllers/users.controller';

/**
 * Router del modulo users (montado en /api/users). Solo ADMINISTRADOR.
 * Sin DELETE fisico (DEC-4): la baja se hace con PATCH /:id/status.
 */
const router = Router();

// Sentinel estructural (Fase 1/B1.4)
router.get('/status', statusController('users'));

// A partir de aca: autenticacion + primer acceso (U2.8) + rol admin
router.use(authenticate);
router.use(passwordChangeRequired);
router.use(requireRole(UserRole.ADMINISTRADOR));

// Listado filtrable (RF-27)
router.get('/', listUsersValidators, validate, list);

// Alta de usuario (RF-24/25)
router.post('/', createUserValidators, validate, create);

// Detalle / edicion / baja logica / reset (RF-23/25/26)
router.get('/:id', idParamValidators, validate, getById);
router.patch('/:id', idParamValidators, validate, updateUserValidators, validate, update);
router.patch('/:id/status', idParamValidators, validate, setActiveValidators, validate, setStatus);
router.post(
  '/:id/reset-password',
  idParamValidators,
  validate,
  resetPasswordValidators,
  validate,
  resetPassword,
);

export default router;
