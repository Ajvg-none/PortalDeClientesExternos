import request from 'supertest';
import { createApp } from '../src/app';
import { buildDocument } from '../src/docs/document';
import { collectFragments } from '../src/docs/registry';
import type { JsonValue } from '../src/core/openapi';

/**
 * X7.1 - Pruebas unitarias del documento OpenAPI (sin BD): ensamblado de
 * fragmentos, resolucion de $ref, seguridad y servido de la spec.
 */
const doc = buildDocument(collectFragments());
const app = createApp();

function collectRefs(value: JsonValue, refs: string[] = []): string[] {
  if (Array.isArray(value)) {
    for (const item of value) collectRefs(item, refs);
  } else if (value !== null && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      if (key === '$ref' && typeof child === 'string') refs.push(child);
      else collectRefs(child, refs);
    }
  }
  return refs;
}

function schemaNamesFromRef(ref: string): string {
  return ref.replace('#/components/schemas/', '');
}

describe('X7.1 - documento OpenAPI', () => {
  test('cabecera y servidores', () => {
    expect(doc.openapi).toBe('3.0.3');
    expect(doc.info.title).toContain('Portal de Clientes Externos');
    expect(doc.servers).toEqual([{ url: '/api' }]);
  });

  test('integra los fragmentos de todos los modulos', () => {
    const tags = doc.tags.map((t) => t.name).sort();
    expect(tags).toEqual(
      ['auth', 'external-orders', 'health', 'orders', 'reports', 'users'].sort(),
    );
    const expectedPaths = [
      '/health',
      '/auth/login',
      '/auth/change-password',
      '/users',
      '/users/{id}',
      '/users/{id}/status',
      '/users/{id}/reset-password',
      '/orders',
      '/orders/order-number/{value}',
      '/orders/{id}',
      '/external-orders/pending',
      '/external-orders/{externalId}/sync',
      '/reports/dashboard',
      '/reports/orders/export',
    ];
    for (const path of expectedPaths) {
      expect(doc.paths[path]).toBeDefined();
    }
  });

  test('todos los $ref apuntan a schemas existentes', () => {
    const refs = collectRefs(doc as unknown as JsonValue);
    expect(refs.length).toBeGreaterThan(0);
    for (const ref of refs) {
      expect(ref.startsWith('#/components/schemas/')).toBe(true);
      expect(doc.components.schemas[schemaNamesFromRef(ref)]).toBeDefined();
    }
  });

  test('define esquemas de seguridad bearerAuth y apiKeyAuth', () => {
    expect(doc.components.securitySchemes.bearerAuth).toMatchObject({ type: 'http', scheme: 'bearer' });
    expect(doc.components.securitySchemes.apiKeyAuth).toMatchObject({
      type: 'apiKey',
      in: 'header',
      name: 'X-API-Key',
    });
  });

  test('GET /api/docs sirve la spec JSON', async () => {
    const res = await request(app).get('/api/docs');
    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe('3.0.3');
    expect(res.body.paths['/health']).toBeDefined();
  });

  test('GET /api/docs/ui responde HTML de Swagger UI', async () => {
    const res = await request(app).get('/api/docs/ui/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('Swagger UI');
  });
});
