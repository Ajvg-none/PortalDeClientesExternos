import { body } from 'express-validator';

/** DTOs del modulo auth (U2.5, U2.8) con express-validator. */

export const loginValidators = [
  body('username').trim().isLength({ min: 1, max: 100 }).withMessage('username es obligatorio'),
  // REM-2026-09/R2.4: cap de longitud para no forzar bcrypt con entradas enormes
  // (jsonwebtoken/bcryptjs truncan en 72 bytes; el max alinea login con change-password)
  body('password').isString().isLength({ min: 1, max: 72 }).withMessage('password es obligatoria'),
];

export const changePasswordValidators = [
  body('currentPassword').isString().withMessage('currentPassword es obligatoria'),
  body('newPassword')
    .isString()
    .isLength({ min: 6, max: 72 })
    .withMessage('newPassword debe tener entre 6 y 72 caracteres'),
];
