/**
 * Configuracion del backend (capa transversal core).
 * Lee variables de entorno con valores por defecto seguros para desarrollo.
 */

const DEV_JWT = 'dev-jwt-secret-change-me';

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  isTest: (process.env.NODE_ENV ?? 'development') === 'test',
  jwtSecret: process.env.JWT_SECRET ?? DEV_JWT,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
  // Zona horaria para agrupar las estadisticas mensuales (E5.1/RF-33) y
  // para interpretar los filtros por rango de fechas (REM-2026-09/R2.8)
  analyticsTimezone: process.env.ANALYTICS_TIMEZONE ?? 'UTC',
  databaseUrl: process.env.DATABASE_URL ?? '',
} as const;

/**
 * REM-2026-09 (R2.3): en produccion no se admite arrancar con secretos por
 * defecto de desarrollo ni sin conexion de BD definida. Fail-fast al boot.
 */
export function assertEnv(): void {
  if (env.nodeEnv === 'production') {
    const problems: string[] = [];
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET === DEV_JWT) {
      problems.push('JWT_SECRET debe definirse con un valor aleatorio en produccion');
    }
    if (!env.databaseUrl) {
      problems.push('DATABASE_URL debe definirse en produccion');
    }
    if (problems.length > 0) {
      // eslint-disable-next-line no-console
      console.error('[env] Configuracion de produccion invalida:');
      for (const p of problems) console.error(`  - ${p}`);
      throw new Error('Configuracion de produccion invalida (ver JWT_SECRET / DATABASE_URL)');
    }
  }
}
