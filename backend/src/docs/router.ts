import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import type { OpenApiDocument } from './types';

/**
 * Router de documentacion (X7.1): `GET /` devuelve la spec JSON y `/ui` sirve
 * Swagger UI. Se monta en `/api/docs` solo cuando `OPENAPI_ENABLED` lo permite.
 */
export function createDocsRouter(doc: OpenApiDocument): Router {
  const router = Router();
  router.get('/', (_req, res) => {
    res.json(doc);
  });
  router.use('/ui', swaggerUi.serve, swaggerUi.setup(doc));
  return router;
}
