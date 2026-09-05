/** Pager minimalista (F6.3/REM-6): paginacion por offset/total. */
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
    <div className="toolbar" style={{ marginTop: 16 }}>
      <button className="btn btn--sm" disabled={offset <= 0} onClick={() => onPage(Math.max(0, offset - limit))}>
        ← Anterior
      </button>
      <span className="muted" style={{ fontSize: 13 }}>
        Página {current} de {pages}
      </span>
      <button className="btn btn--sm" disabled={offset + limit >= total} onClick={() => onPage(offset + limit)}>
        Siguiente →
      </button>
    </div>
  );
}
