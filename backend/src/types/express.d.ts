import type { AuthContext } from '../modules/auth/context';

// Ampliacion del tipo Request de Express: req.auth (seteado por el
// middleware de autenticacion del modulo auth).
declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

export {};
