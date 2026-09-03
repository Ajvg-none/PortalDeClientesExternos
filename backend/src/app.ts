import express, { type Express } from 'express';
import { requestLogger } from './core/logger';
import { errorHandler, notFoundHandler } from './core/middlewares/error-handler';
import authRouter from './modules/auth/routes';
import usersRouter from './modules/users/routes';
import ordersRouter from './modules/orders/routes';
import externalOrdersRouter from './modules/external-orders/routes';
import reportsRouter from './modules/reports/routes';

/**
 * Fabrica de la aplicacion Express (B1.4, ARQ-1).
 * Monta la capa transversal y el router de cada modulo en /api/<modulo>.
 * Los modulos de negocio quedan registrados aqui como unica responsabilidad
 * de composicion (bajo acoplamiento: un modulo no conoce a los demas).
 */
export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));
  app.use(requestLogger());

  // Salud (sin logica de negocio)
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Routers modulares (aun sin endpoints de negocio en Fase 1)
  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/orders', ordersRouter);
  app.use('/api/external-orders', externalOrdersRouter);
  app.use('/api/reports', reportsRouter);

  // Errores (404 + manejador global, formato JSON { code, message })
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
