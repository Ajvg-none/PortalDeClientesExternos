import type { OpenApiFragment } from '../../core/openapi';
import { errorResponses } from '../../core/openapi';

/** Fragmento OpenAPI del contrato PULL con el middleware (X7.1, RF-35…52 / R1-R5). */
const externalOrdersOpenApi: OpenApiFragment = {
  tag: { name: 'external-orders', description: 'Contrato PULL del middleware (X-API-Key)' },
  schemas: {
    OpticalData: {
      type: 'object',
      required: ['sphere', 'cylinder', 'axis', 'addition', 'dnp', 'height', 'productCode'],
      properties: {
        sphere: { type: 'number', nullable: true },
        cylinder: { type: 'number', nullable: true },
        axis: { type: 'number', nullable: true },
        addition: { type: 'number', nullable: true },
        dnp: { type: 'number', nullable: true },
        height: { type: 'number', nullable: true },
        productCode: { type: 'string', nullable: true },
      },
    },
    CanonicalOrder: {
      type: 'object',
      required: [
        'externalId',
        'number',
        'date',
        'orderFromSupplier',
        'status',
        'customer',
        'opticalDataOD',
        'opticalDataOI',
        'mount',
        'coloration',
      ],
      properties: {
        externalId: { type: 'string', format: 'uuid' },
        number: { type: 'string' },
        date: { type: 'string', format: 'date-time' },
        orderFromSupplier: { type: 'boolean', enum: [true] },
        status: { type: 'string', enum: ['CONFIRMED'] },
        customer: {
          type: 'object',
          required: ['company', 'patient'],
          properties: { company: { type: 'string' }, patient: { type: 'string' } },
        },
        opticalDataOD: { $ref: '#/components/schemas/OpticalData' },
        opticalDataOI: { $ref: '#/components/schemas/OpticalData' },
        treatment: { type: 'string', nullable: true },
        mount: {
          type: 'object',
          properties: {
            type: { type: 'string', nullable: true },
            brand: { type: 'string', nullable: true },
            model: { type: 'string', nullable: true },
            color: { type: 'string', nullable: true },
          },
        },
        coloration: {
          type: 'object',
          required: ['unicolor'],
          properties: {
            color: { type: 'string', nullable: true },
            unicolor: { type: 'boolean' },
            degradadoPercent: { type: 'number', nullable: true },
          },
        },
        observations: { type: 'string', nullable: true },
      },
    },
    PendingResponse: {
      type: 'object',
      required: ['data', 'pagination'],
      properties: {
        data: { type: 'array', items: { $ref: '#/components/schemas/CanonicalOrder' } },
        pagination: {
          type: 'object',
          required: ['total', 'limit', 'offset'],
          properties: {
            total: { type: 'integer' },
            limit: { type: 'integer' },
            offset: { type: 'integer' },
          },
        },
      },
    },
    SyncResponse: {
      type: 'object',
      required: ['message', 'externalId', 'status', 'syncedAt'],
      properties: {
        message: { type: 'string' },
        externalId: { type: 'string', format: 'uuid' },
        status: { type: 'string', enum: ['SINCRONIZADA'] },
        syncedAt: { type: 'string', nullable: true, format: 'date-time' },
      },
    },
  },
  paths: {
    '/external-orders/pending': {
      get: {
        tags: ['external-orders'],
        summary: 'Ordenes PENDIENTES en FIFO (solo lectura; entregar no sincroniza)',
        security: [{ apiKeyAuth: [] }],
        parameters: [
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 } },
          { name: 'offset', in: 'query', schema: { type: 'integer', minimum: 0, default: 0 } },
        ],
        responses: {
          '200': {
            description: 'Lote de ordenes pendientes',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/PendingResponse' } } },
          },
          ...errorResponses('400', '401'),
        },
      },
    },
    '/external-orders/{externalId}/sync': {
      put: {
        tags: ['external-orders'],
        summary: 'Confirma la sincronizacion de una orden (idempotente)',
        security: [{ apiKeyAuth: [] }],
        parameters: [
          { name: 'externalId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
        responses: {
          '200': {
            description: 'Orden sincronizada (o ya estaba sincronizada)',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/SyncResponse' } } },
          },
          ...errorResponses('400', '401', '404'),
        },
      },
    },
  },
};

export default externalOrdersOpenApi;
