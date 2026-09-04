/**
 * Errores de dominio de la API (capa transversal core).
 * ApiError permite responder con status HTTP, codigo maquina legible
 * para el frontend/middleware y mensaje humano en espanol.
 */
export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const httpErrors = {
  notFound(message = 'Ruta no encontrada'): ApiError {
    return new ApiError(404, 'NOT_FOUND', message);
  },
  badRequest(message = 'Solicitud invalida'): ApiError {
    return new ApiError(400, 'BAD_REQUEST', message);
  },
  internal(message = 'Error interno del servidor'): ApiError {
    return new ApiError(500, 'INTERNAL_ERROR', message);
  },
} as const;
