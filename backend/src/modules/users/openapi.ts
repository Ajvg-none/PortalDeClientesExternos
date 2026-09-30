import type { OpenApiFragment } from '../../core/openapi';
import { errorResponses } from '../../core/openapi';

/** Fragmento OpenAPI del modulo users (X7.1, RF-23…RF-27 / DEC-4). */
const usersOpenApi: OpenApiFragment = {
  tag: { name: 'users', description: 'Gestion de usuarios (solo ADMINISTRADOR)' },
  schemas: {
    UserList: {
      type: 'object',
      required: ['data', 'total', 'limit', 'offset'],
      properties: {
        data: { type: 'array', items: { $ref: '#/components/schemas/PublicUser' } },
        total: { type: 'integer' },
        limit: { type: 'integer' },
        offset: { type: 'integer' },
      },
    },
    CreateUserRequest: {
      type: 'object',
      required: ['username', 'password', 'role'],
      properties: {
        username: { type: 'string', minLength: 3, maxLength: 100 },
        password: { type: 'string', minLength: 6, maxLength: 72 },
        role: { type: 'string', enum: ['CLIENTE_EXTERNO', 'LABORATORIO', 'ADMINISTRADOR'] },
        companyName: { type: 'string', nullable: true, description: 'Obligatorio si role=CLIENTE_EXTERNO' },
        email: { type: 'string', nullable: true },
        phone: { type: 'string', nullable: true },
        address: { type: 'string', nullable: true },
      },
    },
    UpdateUserRequest: {
      type: 'object',
      properties: {
        username: { type: 'string', minLength: 3, maxLength: 100 },
        role: { type: 'string', enum: ['CLIENTE_EXTERNO', 'LABORATORIO', 'ADMINISTRADOR'] },
        companyName: { type: 'string', nullable: true },
        email: { type: 'string', nullable: true },
        phone: { type: 'string', nullable: true },
        address: { type: 'string', nullable: true },
      },
    },
    SetStatusRequest: {
      type: 'object',
      required: ['isActive'],
      properties: { isActive: { type: 'boolean' } },
    },
    ResetPasswordRequest: {
      type: 'object',
      required: ['newPassword'],
      properties: { newPassword: { type: 'string', minLength: 6, maxLength: 72 } },
    },
  },
  paths: {
    '/users': {
      get: {
        tags: ['users'],
        summary: 'Listado filtrable de usuarios (RF-27)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'q', in: 'query', schema: { type: 'string' } },
          { name: 'role', in: 'query', schema: { type: 'string', enum: ['CLIENTE_EXTERNO', 'LABORATORIO', 'ADMINISTRADOR'] } },
          { name: 'isActive', in: 'query', schema: { type: 'string', enum: ['true', 'false'] } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100 } },
          { name: 'offset', in: 'query', schema: { type: 'integer', minimum: 0 } },
        ],
        responses: {
          '200': {
            description: 'Listado paginado',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/UserList' } } },
          },
          ...errorResponses('400', '401', '403'),
        },
      },
      post: {
        tags: ['users'],
        summary: 'Alta de usuario (RF-24/25)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateUserRequest' } } },
        },
        responses: {
          '201': {
            description: 'Usuario creado',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/PublicUser' } } },
          },
          ...errorResponses('400', '401', '403', '409'),
        },
      },
    },
    '/users/{id}': {
      get: {
        tags: ['users'],
        summary: 'Detalle de usuario (RF-23)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', pattern: '^\\d+$' } }],
        responses: {
          '200': {
            description: 'Usuario',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/PublicUser' } } },
          },
          ...errorResponses('401', '403', '404'),
        },
      },
      patch: {
        tags: ['users'],
        summary: 'Edicion de usuario (RF-25)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', pattern: '^\\d+$' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/UpdateUserRequest' } } },
        },
        responses: {
          '200': {
            description: 'Usuario actualizado',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/PublicUser' } } },
          },
          ...errorResponses('400', '401', '403', '404', '409'),
        },
      },
    },
    '/users/{id}/status': {
      patch: {
        tags: ['users'],
        summary: 'Baja logica / reactivacion (DEC-4)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', pattern: '^\\d+$' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/SetStatusRequest' } } },
        },
        responses: {
          '200': {
            description: 'Estado actualizado',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/PublicUser' } } },
          },
          ...errorResponses('400', '401', '403', '404'),
        },
      },
    },
    '/users/{id}/reset-password': {
      post: {
        tags: ['users'],
        summary: 'Reset de contrasena (RF-26 / DEC-6)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', pattern: '^\\d+$' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ResetPasswordRequest' } } },
        },
        responses: {
          '200': {
            description: 'Contrasena reseteada',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/MessageWithUser' } } },
          },
          ...errorResponses('400', '401', '403', '404'),
        },
      },
    },
  },
};

export default usersOpenApi;
