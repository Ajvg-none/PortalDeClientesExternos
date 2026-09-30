import { healthFragment, type OpenApiFragment } from '../core/openapi';
import authOpenApi from '../modules/auth/openapi';
import usersOpenApi from '../modules/users/openapi';
import ordersOpenApi from '../modules/orders/openapi';
import externalOrdersOpenApi from '../modules/external-orders/openapi';
import reportsOpenApi from '../modules/reports/openapi';

/**
 * Registro de fragmentos OpenAPI (X7.1). La capa de documentacion IMPORTA los
 * fragmentos publicos de cada modulo; los modulos nunca importan `docs/`
 * (bajo acoplamiento, ARQ-1/R7).
 */
export function collectFragments(): OpenApiFragment[] {
  return [
    healthFragment,
    authOpenApi,
    usersOpenApi,
    ordersOpenApi,
    externalOrdersOpenApi,
    reportsOpenApi,
  ];
}
