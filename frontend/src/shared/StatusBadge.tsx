import type { ReactNode } from 'react';

/**
 * Badge de estado (anexo v1.4): PENDIENTE dorado / SINCRONIZADA verde /
 * ERROR rojo (reservado). Usa clases del design system.
 */
type Variant = 'PENDIENTE' | 'SINCRONIZADA' | 'ERROR';

const CLASS: Record<Variant, string> = {
  PENDIENTE: 'pill pill--pendiente',
  SINCRONIZADA: 'pill pill--sync',
  ERROR: 'pill pill--error',
};

export function StatusBadge({ status, children }: { status: Variant; children?: ReactNode }) {
  return (
    <span className={CLASS[status]}>
      {/* ✅ NUEVO: dot indicador visual */}
      <span className="pill__dot" aria-hidden="true" />
      {children ?? status}
    </span>
  );
}