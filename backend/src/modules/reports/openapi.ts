import type { OpenApiFragment } from '../../core/openapi';
import { errorResponses } from '../../core/openapi';

/** Fragmento OpenAPI del modulo reports (X7.1, RF-33/RF-34). */
const reportsOpenApi: OpenApiFragment = {
  tag: { name: 'reports', description: 'Estadisticas y exportacion (solo ADMINISTRADOR)' },
  schemas: {
    OrdersByMonth: {
      type: 'object',
      required: ['month', 'total'],
      properties: { month: { type: 'string', example: '2026-09' }, total: { type: 'integer' } },
    },
    TopClient: {
      type: 'object',
      required: ['company', 'total'],
      properties: { company: { type: 'string' }, total: { type: 'integer' } },
    },
    Dashboard: {
      type: 'object',
      required: ['ordersByMonth', 'topClients', 'statusSummary'],
      properties: {
        ordersByMonth: { type: 'array', items: { $ref: '#/components/schemas/OrdersByMonth' } },
        topClients: { type: 'array', items: { $ref: '#/components/schemas/TopClient' } },
        statusSummary: {
          type: 'object',
          required: ['pendiente', 'sincronizadas', 'total'],
          properties: {
            pendiente: { type: 'integer' },
            sincronizadas: { type: 'integer' },
            total: { type: 'integer' },
          },
        },
      },
    },
  },
  paths: {
    '/reports/dashboard': {
      get: {
        tags: ['reports'],
        summary: 'Agregados del dashboard (RF-33)',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Datos del dashboard',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Dashboard' } } },
          },
          ...errorResponses('401', '403'),
        },
      },
    },
    '/reports/orders/export': {
      get: {
        tags: ['reports'],
        summary: 'Exportacion CSV del listado con filtros (RF-34)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'from', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'to', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'company', in: 'query', schema: { type: 'string' } },
          { name: 'syncStatus', in: 'query', schema: { type: 'string', enum: ['PENDIENTE', 'SINCRONIZADA'] } },
        ],
        responses: {
          '200': {
            description: 'Archivo CSV',
            content: { 'text/csv': { schema: { type: 'string' } } },
          },
          ...errorResponses('400', '401', '403'),
        },
      },
    },
  },
};

export default reportsOpenApi;
