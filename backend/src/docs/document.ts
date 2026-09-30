import type { JsonValue, OpenApiFragment } from '../core/openapi';
import { ERROR_SCHEMA, MESSAGE_WITH_USER_SCHEMA, VALIDATION_ERROR_SCHEMA } from '../core/openapi';
import type { OpenApiDocument } from './types';

/**
 * Construye el documento OpenAPI 3.0 a partir de los fragmentos (X7.1).
 * Funcion PURA (sin Express ni BD): se puede probar de forma aislada.
 */
export function buildDocument(fragments: OpenApiFragment[]): OpenApiDocument {
  const schemas: Record<string, JsonValue> = {
    Error: ERROR_SCHEMA,
    ValidationError: VALIDATION_ERROR_SCHEMA,
    MessageWithUser: MESSAGE_WITH_USER_SCHEMA,
  };
  const paths: Record<string, Record<string, JsonValue>> = {};
  const tags: { name: string; description: string }[] = [];

  for (const fragment of fragments) {
    tags.push(fragment.tag);
    for (const [name, schema] of Object.entries(fragment.schemas ?? {})) {
      schemas[name] = schema;
    }
    for (const [path, methods] of Object.entries(fragment.paths)) {
      paths[path] = { ...(paths[path] ?? {}), ...methods };
    }
  }

  return {
    openapi: '3.0.3',
    info: {
      title: 'Portal de Clientes Externos API',
      version: '1.0.0',
      description:
        'Contrato interno (JWT) e integracion PULL con el middleware (X-API-Key). Los codigos de error siguen el formato { code, message }.',
    },
    servers: [{ url: '/api' }],
    tags,
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        apiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' },
      },
      schemas,
    },
    paths,
  };
}
