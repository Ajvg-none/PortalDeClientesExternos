import type { OpenApiFragment } from '../../core/openapi';
import { errorResponses } from '../../core/openapi';

/** Fragmento OpenAPI del modulo auth (X7.1, U2.5/U2.8/DEC-6). */
const authOpenApi: OpenApiFragment = {
  tag: { name: 'auth', description: 'Autenticacion y cambio de contrasena' },
  schemas: {
    PublicUser: {
      type: 'object',
      required: ['id', 'username', 'role', 'isActive', 'mustChangePassword', 'createdAt'],
      properties: {
        id: { type: 'string', example: '1' },
        username: { type: 'string' },
        email: { type: 'string', nullable: true },
        role: { type: 'string', enum: ['CLIENTE_EXTERNO', 'LABORATORIO', 'ADMINISTRADOR'] },
        companyName: { type: 'string', nullable: true },
        phone: { type: 'string', nullable: true },
        address: { type: 'string', nullable: true },
        isActive: { type: 'boolean' },
        mustChangePassword: { type: 'boolean' },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
    LoginRequest: {
      type: 'object',
      required: ['username', 'password'],
      properties: {
        username: { type: 'string', minLength: 1, maxLength: 100 },
        password: { type: 'string', minLength: 1, maxLength: 72 },
      },
    },
    LoginResponse: {
      type: 'object',
      required: ['token', 'user'],
      properties: {
        token: { type: 'string' },
        user: { $ref: '#/components/schemas/PublicUser' },
      },
    },
    ChangePasswordRequest: {
      type: 'object',
      required: ['currentPassword', 'newPassword'],
      properties: {
        currentPassword: { type: 'string' },
        newPassword: { type: 'string', minLength: 6, maxLength: 72 },
      },
    },
  },
  paths: {
    '/auth/login': {
      post: {
        tags: ['auth'],
        summary: 'Inicia sesion por username + contrasena (DEC-2)',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } },
        },
        responses: {
          '200': {
            description: 'Credenciales validas',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/LoginResponse' } },
            },
          },
          ...errorResponses('400', '401', '403'),
        },
      },
    },
    '/auth/change-password': {
      post: {
        tags: ['auth'],
        summary: 'Cambio de contrasena del usuario autenticado (unico recurso en primer acceso)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/ChangePasswordRequest' } },
          },
        },
        responses: {
          '200': {
            description: 'Contrasena actualizada',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/MessageWithUser' } },
            },
          },
          ...errorResponses('400', '401'),
        },
      },
    },
  },
};

export default authOpenApi;
