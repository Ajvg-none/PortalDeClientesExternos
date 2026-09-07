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
    // ✅ NUEVO: contenedor .pager en lugar de .toolbar con inline styles
    <div className="pager">
      <button className="btn btn--sm" disabled={offset <= 0} onClick={() => onPage(Math.max(0, offset - limit))}>
        ← Anterior
      </button>
      {/* ✅ NUEVO: muted--sm en lugar de style={{ fontSize: 13 }} */}
      <span className="muted--sm">
        Página {current} de {pages}
      </span>
      <button className="btn btn--sm" disabled={offset + limit >= total} onClick={() => onPage(offset + limit)}>
        Siguiente →
      </button>
    </div>
  );
}