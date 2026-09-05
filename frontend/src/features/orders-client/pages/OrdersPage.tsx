import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ordersApi, type OrdersList } from '../api/orders';
import { useAuth } from '../../../app/AuthContext';
import { StatusBadge } from '../../../shared/StatusBadge';
import { Pager } from '../../../shared/Pager';
import { PAGE_SIZE } from '../../../core/constants';
import type { OrderListItem } from '../../../core/types';

interface Filters {
  from: string;
  to: string;
  company: string;
  syncStatus: string;
}

const EMPTY: Filters = { from: '', to: '', company: '', syncStatus: '' };

/**
 * F6.3/6.6/6.8 + REM-2026-09 - Listado de ordenes por rol.
 * - CLIENTE_EXTERNO: su historial (filtro de fechas) sin estado.
 * - LABORATORIO: todas, solo lectura, sin estado (filtros fechas + cliente).
 * - ADMINISTRADOR: todas, con estado + "pendiente desde" (fechas + cliente + estado).
 */
export function OrdersPage() {
  const { user } = useAuth();
  const role = user?.role;
  const isClient = role === 'CLIENTE_EXTERNO';
  const isAdmin = role === 'ADMINISTRADOR';

  const [list, setList] = useState<OrdersList | null>(null);
  const [error, setError] = useState('');
  const [offset, setOffset] = useState(0);
  const [notice, setNotice] = useState('');
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [active, setActive] = useState<Filters>(EMPTY);
  const location = useLocation();
  const navigate = useNavigate();

  // REM-8/RF-13: mensaje de exito al volver del formulario de nueva orden
  useEffect(() => {
    const created = (location.state as { createdNumber?: string } | null)?.createdNumber;
    if (created) {
      setNotice(`Orden ${created} creada correctamente.`);
      navigate('.', { replace: true, state: null });
    }
  }, [location.state, navigate]);

  const load = useCallback(
    (nextOffset: number) => {
      const params: Record<string, string> = { limit: String(PAGE_SIZE), offset: String(nextOffset) };
      if (active.from) params.from = active.from;
      if (active.to) params.to = active.to;
      if (!isClient && active.company.trim()) params.company = active.company.trim();
      if (isAdmin && active.syncStatus) params.syncStatus = active.syncStatus;
      ordersApi
        .list(params)
        .then((r) => {
          setList(r);
          setOffset(nextOffset);
        })
        .catch((e) => setError(e instanceof Error ? e.message : 'Error al cargar órdenes'));
    },
    [active, isClient, isAdmin],
  );

  useEffect(() => {
    load(0);
  }, [load]);

  function applyFilters(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setActive(filters);
    load(0);
  }

  function clearFilters() {
    setFilters(EMPTY);
    setActive(EMPTY);
    setError('');
    load(0);
  }

  const anyFilter =
    filters.from !== '' || filters.to !== '' || filters.company !== '' || filters.syncStatus !== '';

  return (
    <div>
      <div className="page-head">
        <h1>{isClient ? 'Mis órdenes' : 'Órdenes'}</h1>
        {isClient && (
          <Link to="/ordenes/nueva" className="btn btn--primary">
            + Nueva orden
          </Link>
        )}
      </div>

      <form onSubmit={applyFilters} className="toolbar" aria-label="Filtros de órdenes">
        <div className="form-field form-field--inline">
          <label htmlFor="f-from">Desde</label>
          <input id="f-from" className="control" type="date" value={filters.from} onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))} />
        </div>
        <div className="form-field form-field--inline">
          <label htmlFor="f-to">Hasta</label>
          <input id="f-to" className="control" type="date" value={filters.to} onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))} />
        </div>
        {!isClient && (
          <div className="form-field form-field--inline">
            <label htmlFor="f-company">Cliente</label>
            <input id="f-company" className="control" value={filters.company} onChange={(e) => setFilters((f) => ({ ...f, company: e.target.value }))} />
          </div>
        )}
        {isAdmin && (
          <div className="form-field form-field--inline">
            <label htmlFor="f-status">Estado</label>
            <select id="f-status" className="control" value={filters.syncStatus} onChange={(e) => setFilters((f) => ({ ...f, syncStatus: e.target.value }))}>
              <option value="">Todos</option>
              <option>PENDIENTE</option>
              <option>SINCRONIZADA</option>
            </select>
          </div>
        )}
        <button type="submit" className="btn">
          Aplicar filtros
        </button>
        <button type="button" className="btn" onClick={clearFilters} disabled={!anyFilter}>
          Limpiar
        </button>
      </form>

      {error && <p role="alert" className="error">{error}</p>}
      {notice && <p role="status" className="notice">{notice}</p>}
      {!list && !error && <p className="muted">Cargando…</p>}
      {list && (
        <>
          <p className="muted">
            Total de órdenes: <strong style={{ color: 'var(--color-text)' }}>{list.total}</strong>
          </p>

          {list.data.length === 0 ? (
            <p className="empty">No hay órdenes que coincidan.</p>
          ) : (
            <div className="table-scroll">
              <table className="table">
                <thead>
                  <tr>
                    <th>N° orden</th>
                    {!isClient && <th>Cliente</th>}
                    <th>Fecha</th>
                    <th>Resumen</th>
                    {isAdmin && <th>Estado</th>}
                    <th className="is-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {list.data.map((o: OrderListItem) => (
                    <tr key={o.id}>
                      <td>{o.orderNumber}</td>
                      {!isClient && <td>{o.company}</td>}
                      <td>{new Date(o.createdAt).toLocaleDateString()}</td>
                      <td>{o.summary || '—'}</td>
                      {isAdmin && (
                        <td>
                          <StatusBadge status={o.syncStatus ?? 'PENDIENTE'} />
                          {o.syncStatus === 'PENDIENTE' && o.pendingSinceMinutes != null && (
                            <span className="badge-meta">{Math.floor(o.pendingSinceMinutes / 60)} h pendiente</span>
                          )}
                        </td>
                      )}
                      <td className="is-actions">
                        <Link to={`/ordenes/${o.id}`} className="btn btn--link">
                          Ver
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pager total={list.total} limit={PAGE_SIZE} offset={offset} onPage={(o) => load(o)} />
        </>
      )}
    </div>
  );
}
