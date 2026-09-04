/**
 * Configuracion del backend (capa transversal core).
 * Lee variables de entorno con valores por defecto seguros para desarrollo.
 */
export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  isTest: (process.env.NODE_ENV ?? 'development') === 'test',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-jwt-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
} as const;
