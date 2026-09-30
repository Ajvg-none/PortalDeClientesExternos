import { ChevronLeft, ChevronRight } from 'lucide-react';

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
    <div className="pager">
      <button
        className="btn btn--sm"
        disabled={offset <= 0}
        onClick={() => onPage(Math.max(0, offset - limit))}
      >
        <ChevronLeft size={14} aria-hidden="true" />
        <span>Anterior</span>
      </button>
      <span className="muted--sm tabular-nums">
        Página {current} de {pages}
      </span>
      <button
        className="btn btn--sm"
        disabled={offset + limit >= total}
        onClick={() => onPage(offset + limit)}
      >
        <span>Siguiente</span>
        <ChevronRight size={14} aria-hidden="true" />
      </button>
    </div>
  );
}