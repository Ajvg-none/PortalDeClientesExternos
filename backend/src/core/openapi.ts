/**
 * Contrato OpenAPI compartido (capa transversal core, X7.1).
 * Aqui viven los TIPOS del fragmento (contrato publico que cada modulo
 * expone en su `openapi.ts`) y las definiciones reutilizables. La composicion
 * (agregar fragmentos y construir el documento) vive en `docs/`; asi los
 * modulos de negocio no dependen de la capa de composicion (ARQ-1/R7).
 */

/** Valor JSON generico para describir schemas/paths sin acoplar a una libreria. */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface OpenApiTag {
  name: string;
  description: string;
}

/** Operacion OpenAPI (objeto libre: summary, parameters, requestBody, responses). */
export type OpenApiOperation = Record<string, JsonValue>;

export interface OpenApiFragment {
  tag: OpenApiTag;
  schemas?: Record<string, JsonValue>;
  paths: Record<string, Record<string, OpenApiOperation>>;
}

/** Schema reutilizable de error estandar de la API (RF comun). */
export const ERROR_SCHEMA: JsonValue = {
  type: 'object',
  required: ['code', 'message'],
  properties: {
    code: { type: 'string' },
    message: { type: 'string' },
  },
};

/** Error de validacion (400 VALIDATION_ERROR) con detalle por campo. */
export const VALIDATION_ERROR_SCHEMA: JsonValue = {
  allOf: [
    { $ref: '#/components/schemas/Error' },
    {
      type: 'object',
      required: ['errors'],
      properties: {
        errors: {
          type: 'array',
          items: {
            type: 'object',
            required: ['field', 'message'],
            properties: { field: { type: 'string' }, message: { type: 'string' } },
          },
        },
      },
    },
  ],
};

/** Respuesta generica { message, user } usada por cambio/reset de contrasena. */
export const MESSAGE_WITH_USER_SCHEMA: JsonValue = {
  type: 'object',
  required: ['message', 'user'],
  properties: {
    message: { type: 'string' },
    user: { $ref: '#/components/schemas/PublicUser' },
  },
};

/** Respuesta de error documentada de forma uniforme para multiples codigos. */
export function errorResponses(...statuses: string[]): Record<string, JsonValue> {
  const responses: Record<string, JsonValue> = {};
  for (const status of statuses) {
    const isValidation = status === '400';
    // 400 puede ser VALIDATION_ERROR (express-validator) o BAD_REQUEST de
    // negocio; se documenta como anyOf(Error, ValidationError).
    const schema: JsonValue = isValidation
      ? {
          anyOf: [
            { $ref: '#/components/schemas/Error' },
            { $ref: '#/components/schemas/ValidationError' },
          ],
        }
      : { $ref: '#/components/schemas/Error' };
    responses[status] = {
      description: isValidation ? 'Datos de entrada invalidos o solicitud invalida' : 'Error',
      content: { 'application/json': { schema } },
    };
  }
  return responses;
}

/** Healthcheck del servicio (sin logica de negocio). */
export const healthFragment: OpenApiFragment = {
  tag: { name: 'health', description: 'Estado del servicio' },
  paths: {
    '/health': {
      get: {
        tags: ['health'],
        summary: 'Healthcheck',
        responses: {
          '200': {
            description: 'Servicio operativo',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['status'],
                  properties: { status: { type: 'string', enum: ['ok'] } },
                },
              },
            },
          },
        },
      },
    },
  },
};
