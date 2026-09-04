import { body, param, query } from 'express-validator';
import { UserRole } from '@prisma/client';

/** DTOs del modulo users (U2.6/U2.7, RF-23…27) con express-validator. */

const USER_ROLES = Object.values(UserRole);

export const createUserValidators = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('username debe tener entre 3 y 100 caracteres'),
  body('password')
    .isString()
    .isLength({ min: 6, max: 72 })
    .withMessage('password debe tener entre 6 y 72 caracteres'),
  body('role').isIn(USER_ROLES).withMessage(`role debe ser uno de: ${USER_ROLES.join(', ')}`),
  body('companyName')
    .optional({ values: 'null' })
    .trim()
    .isLength({ max: 255 })
    .custom((value: string, { req }) => {
      // DEC-2: el cliente externo SIEMPRE tiene empresa (RF-24)
      if (req.body.role === UserRole.CLIENTE_EXTERNO && !value?.trim()) {
        throw new Error('companyName es obligatorio para CLIENTE_EXTERNO');
      }
      return true;
    }),
  body('email').optional({ values: 'null' }).trim().isEmail().withMessage('email invalido'),
  body('phone').optional({ values: 'null' }).trim().isLength({ max: 50 }),
  body('address').optional({ values: 'null' }).trim().isLength({ max: 2000 }),
];

export const updateUserValidators = [
  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('username debe tener entre 3 y 100 caracteres'),
  body('role').optional().isIn(USER_ROLES).withMessage(`role debe ser uno de: ${USER_ROLES.join(', ')}`),
  body('companyName')
    .optional({ values: 'null' })
    .trim()
    .isLength({ max: 255 })
    .custom((value: string, { req }) => {
      // Si se cambia el rol a CLIENTE_EXTERNO, la empresa pasa a ser obligatoria
      const role = req.body.role ?? undefined;
      if (role === UserRole.CLIENTE_EXTERNO && !value?.trim()) {
        throw new Error('companyName es obligatorio para CLIENTE_EXTERNO');
      }
      return true;
    }),
  body('email').optional({ values: 'null' }).trim().isEmail().withMessage('email invalido'),
  body('phone').optional({ values: 'null' }).trim().isLength({ max: 50 }),
  body('address').optional({ values: 'null' }).trim().isLength({ max: 2000 }),
];

export const listUsersValidators = [
  query('q').optional().trim().isLength({ max: 100 }),
  query('role').optional().isIn(USER_ROLES).withMessage('role invalido'),
  query('isActive').optional().isIn(['true', 'false']).withMessage('isActive debe ser true|false'),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('offset').optional().isInt({ min: 0 }).toInt(),
];

// El id de BD es BIGINT: valido como secuencia de digitos
export const idParamValidators = [
  param('id').custom((v) => /^\d+$/.test(String(v))).withMessage('id invalido'),
];

export const setActiveValidators = [
  body('isActive').isBoolean().withMessage('isActive es obligatorio (true|false)'),
];

export const resetPasswordValidators = [
  body('newPassword')
    .isString()
    .isLength({ min: 6, max: 72 })
    .withMessage('newPassword debe tener entre 6 y 72 caracteres'),
];
