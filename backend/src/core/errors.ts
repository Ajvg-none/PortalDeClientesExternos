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

/** Fabrica de errores de ruta no encontrada (404 JSON estandar). */
export function httpNotFound(message = 'Ruta no encontrada'): ApiError {
  return new ApiError(404, 'NOT_FOUND', message);
}
