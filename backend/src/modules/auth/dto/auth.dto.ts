import { body } from 'express-validator';

/** DTOs del modulo auth (U2.5, U2.8) con express-validator. */

export const loginValidators = [
  body('username').trim().isLength({ min: 1, max: 100 }).withMessage('username es obligatorio'),
  body('password').isString().withMessage('password es obligatoria'),
];

export const changePasswordValidators = [
  body('currentPassword').isString().withMessage('currentPassword es obligatoria'),
  body('newPassword')
    .isString()
    .isLength({ min: 6, max: 72 })
    .withMessage('newPassword debe tener entre 6 y 72 caracteres'),
];
