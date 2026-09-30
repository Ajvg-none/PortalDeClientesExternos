import OpenAPIResponseValidator from 'openapi-response-validator';
import { buildDocument } from '../../src/docs/document';
import { collectFragments } from '../../src/docs/registry';
import type { JsonValue } from '../../src/core/openapi';

/** Documento ensamblado a partir de los fragmentos reales (X7.1). */
export const openApiDocument = buildDocument(collectFragments());

type Operation = {
  responses: Record<string, { content?: Record<string, { schema?: JsonValue }> }>;
};

function operationFor(method: string, path: string): Operation {
  const pathItem = openApiDocument.paths[path] as Record<string, unknown> | undefined;
  const operation = pathItem?.[method] as Operation | undefined;
  if (!operation) {
    throw new Error(`Endpoint no documentado en OpenAPI: ${method.toUpperCase()} ${path}`);
  }
  return operation;
}

/**
 * Valida un body real contra la spec del endpoint documentado.
 * Devuelve undefined si cumple; un error legible si no.
 */
export function validateApiResponse(
  method: string,
  path: string,
  statusCode: number,
  body: unknown,
): string | undefined {
  const operation = operationFor(method, path);
  const validator = new OpenAPIResponseValidator({
    responses: operation.responses as never,
    components: openApiDocument.components as never,
  });
  const result = validator.validateResponse(String(statusCode), body);
  if (!result) return undefined;
  return `${method.toUpperCase()} ${path} [${statusCode}]: ${result.message} ${JSON.stringify(result.errors)}`;
}
