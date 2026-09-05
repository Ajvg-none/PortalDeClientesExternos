/** Pager minimalista (REM-2026-09/F6.3): paginacion por offset/total. */
export function Pager({
  total,
  limit,
  offset,
  onPage,
}: {
  total: number;
  limit: number;
  offset: number;
  onPage: (offset: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / limit));
  const current = Math.floor(offset / limit) + 1;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '16px' }}>
      <button
        disabled={offset <= 0}
        onClick={() => onPage(Math.max(0, offset - limit))}
        style={btnStyle}
      >
        ← Anterior
      </button>
      <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
        Página {current} de {pages}
      </span>
      <button
        disabled={offset + limit >= total}
        onClick={() => onPage(offset + limit)}
        style={btnStyle}
      >
        Siguiente →
      </button>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  height: '34px',
  padding: '0 14px',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--color-border)',
  background: 'var(--color-surface)',
  fontWeight: 600,
  cursor: 'pointer',
};
