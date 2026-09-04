import { Router } from 'express';
import { statusController } from '../controllers/status.controller';
import { changeMyPassword, login } from '../controllers/auth.controller';
import { changePasswordValidators, loginValidators } from '../dto/auth.dto';
import { validate } from '../../../core/middlewares/validate';
import { authenticate } from '../middlewares/authenticate';

/**
 * Router del modulo auth (montado en /api/auth).
 * - /status: sentinel estructural (Fase 1/B1.4)
 * - POST /login: publico (U2.5)
 * - POST /change-password: autenticado; es el UNICO recurso accesible cuando
 *   must_change_password = true (U2.8 / DEC-6)
 */
const router = Router();

router.get('/status', statusController('auth'));

router.post('/login', loginValidators, validate, login);
router.post(
  '/change-password',
  authenticate,
  changePasswordValidators,
  validate,
  changeMyPassword,
);

export default router;
