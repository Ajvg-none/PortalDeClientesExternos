/**
 * Listas cerradas del dominio de ordenes (R6 del AGENTS / anexo TXT).
 * Strings IDENTICAS a las del CHECK de la BD y al contrato JSON del middleware.
 */
export const TREATMENTS = [
  'ECO (AR Verde)',
  'OCEAN (AR Azul)',
  'SOLERX SILVER',
  'SOLERX BLUE',
] as const;

export const MOUNT_TYPES = [
  'METAL ARO COMPLETO',
  'METAL SEMI-AEREA',
  'PASTA ARO COMPLETO',
  'PASTA SEMI-AEREA',
  'AL AIRE',
] as const;

/** Campos numericos opcionales de la formula (OD/OI) y coloracion. */
export const NUMERIC_FIELDS = [
  'odSphere',
  'odCylinder',
  'odAxis',
  'odAddition',
  'odDnp',
  'odHeight',
  'oiSphere',
  'oiCylinder',
  'oiAxis',
  'oiAddition',
  'oiDnp',
  'oiHeight',
  'colorationDegradadoPercent',
] as const;
