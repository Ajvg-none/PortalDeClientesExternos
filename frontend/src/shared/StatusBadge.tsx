import type { ReactNode } from 'react';

/** Badge de estado (anexo v1.4): PENDIENTE dorado / SINCRONIZADA verde / ERROR rojo. */
type Variant = 'PENDIENTE' | 'SINCRONIZADA' | 'ERROR';

const STYLES: Record<Variant, React.CSSProperties> = {
  PENDIENTE: {
    background: 'var(--color-badge-pendiente-bg)',
    color: 'var(--color-badge-pendiente-text)',
    border: '1px solid var(--color-badge-pendiente-border)',
  },
  SINCRONIZADA: {
    background: 'var(--color-badge-sync-bg)',
    color: 'var(--color-badge-sync-text)',
    border: '1px solid var(--color-badge-sync-bg)',
  },
  ERROR: {
    background: 'var(--color-badge-error-bg)',
    color: 'var(--color-badge-error-text)',
    border: '1px solid var(--color-badge-error-bg)',
  },
};

export function StatusBadge({ status, children }: { status: Variant; children?: ReactNode }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 10px',
        borderRadius: '999px',
        fontSize: '12px',
        fontWeight: 600,
        ...STYLES[status],
      }}
    >
      {children ?? status}
    </span>
  );
}
