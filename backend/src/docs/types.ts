import type { JsonValue } from '../core/openapi';

/** Documento OpenAPI 3.0 ensamblado por `docs/document.ts` (X7.1). */
export interface OpenApiDocument {
  openapi: string;
  info: { title: string; version: string; description: string };
  servers: { url: string }[];
  tags: { name: string; description: string }[];
  components: {
    securitySchemes: Record<string, JsonValue>;
    schemas: Record<string, JsonValue>;
  };
  paths: Record<string, Record<string, JsonValue>>;
}
