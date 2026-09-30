import type { OpenApiFragment } from '../../core/openapi';
import { errorResponses } from '../../core/openapi';

/** Fragmento OpenAPI del modulo orders (X7.1, RF-05…RF-21 / RF-29/31). */
const ordersOpenApi: OpenApiFragment = {
  tag: { name: 'orders', description: 'Ordenes de trabajo optico' },
  schemas: {
    Eye: {
      type: 'object',
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
    Mount: {
      type: 'object',
      properties: {
        type: { type: 'string', nullable: true },
        brand: { type: 'string', nullable: true },
        model: { type: 'string', nullable: true },
        color: { type: 'string', nullable: true },
      },
    },
    Coloration: {
      type: 'object',
      required: ['unicolor'],
      properties: {
        color: { type: 'string', nullable: true },
        unicolor: { type: 'boolean' },
        degradadoPercent: { type: 'number', nullable: true },
      },
    },
    OrderListItem: {
      type: 'object',
      required: ['id', 'orderNumber', 'company', 'patient', 'createdAt', 'summary'],
      properties: {
        id: { type: 'string' },
        orderNumber: { type: 'string' },
        company: { type: 'string' },
        patient: { type: 'string' },
        createdAt: { type: 'string', format: 'date-time' },
        summary: { type: 'string' },
        syncStatus: { type: 'string', enum: ['PENDIENTE', 'SINCRONIZADA'] },
        syncedAt: { type: 'string', nullable: true, format: 'date-time' },
        pendingSinceMinutes: { type: 'integer', nullable: true },
      },
    },
    OrderList: {
      type: 'object',
      required: ['data', 'total', 'limit', 'offset'],
      properties: {
        data: { type: 'array', items: { $ref: '#/components/schemas/OrderListItem' } },
        total: { type: 'integer' },
        limit: { type: 'integer' },
        offset: { type: 'integer' },
      },
    },
    OrderDetail: {
      type: 'object',
      required: ['id', 'externalId', 'orderNumber', 'company', 'patient', 'createdAt', 'od', 'oi', 'mount', 'coloration', 'summary'],
      properties: {
        id: { type: 'string' },
        externalId: { type: 'string', format: 'uuid' },
        orderNumber: { type: 'string' },
        company: { type: 'string' },
        patient: { type: 'string' },
        createdAt: { type: 'string', format: 'date-time' },
        od: { $ref: '#/components/schemas/Eye' },
        oi: { $ref: '#/components/schemas/Eye' },
        treatment: { type: 'string', nullable: true },
        mount: { $ref: '#/components/schemas/Mount' },
        coloration: { $ref: '#/components/schemas/Coloration' },
        observations: { type: 'string', nullable: true },
        summary: { type: 'string' },
        syncStatus: { type: 'string', enum: ['PENDIENTE', 'SINCRONIZADA'] },
        syncedAt: { type: 'string', nullable: true, format: 'date-time' },
        pendingSinceMinutes: { type: 'integer', nullable: true },
      },
    },
    CreateOrderRequest: {
      type: 'object',
      required: ['orderNumber', 'patient'],
      properties: {
        orderNumber: { type: 'string', minLength: 1, maxLength: 100 },
        patient: { type: 'string', minLength: 1, maxLength: 255 },
        odSphere: { type: 'number', nullable: true },
        odCylinder: { type: 'number', nullable: true },
        odAxis: { type: 'number', nullable: true },
        odAddition: { type: 'number', nullable: true },
        odDnp: { type: 'number', nullable: true },
        odHeight: { type: 'number', nullable: true },
        odProductCode: { type: 'string', nullable: true },
        oiSphere: { type: 'number', nullable: true },
        oiCylinder: { type: 'number', nullable: true },
        oiAxis: { type: 'number', nullable: true },
        oiAddition: { type: 'number', nullable: true },
        oiDnp: { type: 'number', nullable: true },
        oiHeight: { type: 'number', nullable: true },
        oiProductCode: { type: 'string', nullable: true },
        treatment: {
          type: 'string',
          nullable: true,
          enum: ['ECO (AR Verde)', 'OCEAN (AR Azul)', 'SOLERX SILVER', 'SOLERX BLUE'],
        },
        mountType: {
          type: 'string',
          nullable: true,
          enum: ['METAL ARO COMPLETO', 'METAL SEMI-AEREA', 'PASTA ARO COMPLETO', 'PASTA SEMI-AEREA', 'AL AIRE'],
        },
        mountBrand: { type: 'string', nullable: true },
        mountModel: { type: 'string', nullable: true },
        mountColor: { type: 'string', nullable: true },
        colorationColor: { type: 'string', nullable: true },
        colorationUnicolor: { type: 'boolean' },
        colorationDegradadoPercent: { type: 'number', nullable: true },
        observations: { type: 'string', nullable: true },
      },
    },
    OrderNumberCheck: {
      type: 'object',
      required: ['available'],
      properties: { available: { type: 'boolean' } },
    },
  },
  paths: {
    '/orders': {
      post: {
        tags: ['orders'],
        summary: 'Crea una orden (solo CLIENTE_EXTERNO, RF-07…RF-13)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateOrderRequest' } } },
        },
        responses: {
          '201': {
            description: 'Orden creada',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/OrderDetail' } } },
          },
          ...errorResponses('400', '401', '403', '409'),
        },
      },
      get: {
        tags: ['orders'],
        summary: 'Historial del cliente o listado global por rol (RF-05/RF-18/RF-28)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'from', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'to', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'company', in: 'query', schema: { type: 'string' } },
          { name: 'syncStatus', in: 'query', schema: { type: 'string', enum: ['PENDIENTE', 'SINCRONIZADA'] } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100 } },
          { name: 'offset', in: 'query', schema: { type: 'integer', minimum: 0 } },
        ],
        responses: {
          '200': {
            description: 'Listado paginado',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/OrderList' } } },
          },
          ...errorResponses('400', '401', '403'),
        },
      },
    },
    '/orders/order-number/{value}': {
      get: {
        tags: ['orders'],
        summary: 'Check asincrono de unicidad del N de Orden (RF-10)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'value', in: 'path', required: true, schema: { type: 'string', maxLength: 100 } }],
        responses: {
          '200': {
            description: 'Disponibilidad',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/OrderNumberCheck' } } },
          },
          ...errorResponses('400', '401', '403'),
        },
      },
    },
    '/orders/{id}': {
      get: {
        tags: ['orders'],
        summary: 'Detalle de orden por rol (RF-16/RF-21/RF-31)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', pattern: '^\\d+$' } }],
        responses: {
          '200': {
            description: 'Detalle',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/OrderDetail' } } },
          },
          ...errorResponses('400', '401', '403', '404'),
        },
      },
    },
  },
};

export default ordersOpenApi;
