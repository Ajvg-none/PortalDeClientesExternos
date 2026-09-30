import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { PlusCircle, Filter, RotateCcw, Eye, Clock, FileSpreadsheet, Inbox, Calendar, Building2, Layers } from 'lucide-react';
import { ordersApi, type OrdersList } from '../api/orders';
import { useAuth } from '../../../app/AuthContext';
import { StatusBadge } from '../../../shared/StatusBadge';
import { Pager } from '../../../shared/Pager';
import { Select } from '../../../shared/Select';
import { PAGE_SIZE } from '../../../core/constants';
import type { OrderListItem } from '../../../core/types';

interface Filters {
  from: string;
  to: string;
  company: string;
  syncStatus: string;
}

const EMPTY: Filters = { from: '', to: '', company: '', syncStatus: '' };

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'PENDIENTE', label: 'PENDIENTE' },
  { value: 'SINCRONIZADA', label: 'SINCRONIZADA' },
];

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
    (nextOffset: number, f: Filters) => {
      const params: Record<string, string> = { limit: String(PAGE_SIZE), offset: String(nextOffset) };
      if (f.from) params.from = f.from;
      if (f.to) params.to = f.to;
      if (!isClient && f.company.trim()) params.company = f.company.trim();
      if (isAdmin && f.syncStatus) params.syncStatus = f.syncStatus;

      ordersApi
        .list(params)
        .then((r) => {
          setList(r);
          setOffset(nextOffset);
        })
        .catch((e) => setError(e instanceof Error ? e.message : 'Error al cargar órdenes'));
    },
    [isClient, isAdmin],
  );

  useEffect(() => {
    load(0, active);
  }, [load, active]);

  function applyFilters(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setActive(filters);
  }

  function clearFilters() {
    setFilters(EMPTY);
    setActive(EMPTY);
    setError('');
  }

  const anyFilter =
    filters.from !== '' || filters.to !== '' || filters.company !== '' || filters.syncStatus !== '';

  return (
    <div>
      <div className="page-head">
        <h1>{isClient ? 'Mis órdenes' : 'Órdenes'}</h1>
        {isClient && (
          <Link to="/ordenes/nueva" className="btn btn--primary">
            <PlusCircle size={16} aria-hidden="true" />
            <span>Nueva orden</span>
          </Link>
        )}
      </div>

      {/* Contenedor .panel para agrupar filtros + tabla + pager */}
      <div className="panel">
        {notice && <p role="status" className="notice">{notice}</p>}
        {error && <p role="alert" className="error">{error}</p>}

        <form onSubmit={applyFilters} className="toolbar panel__toolbar" aria-label="Filtros de órdenes">
          <div className="form-field form-field--inline">
            <label htmlFor="f-from">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Calendar size={12} aria-hidden="true" /> Desde
              </span>
            </label>
            <input id="f-from" className="control" type="date" value={filters.from} onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))} />
          </div>
          <div className="form-field form-field--inline">
            <label htmlFor="f-to">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Calendar size={12} aria-hidden="true" /> Hasta
              </span>
            </label>
            <input id="f-to" className="control" type="date" value={filters.to} onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))} />
          </div>
          {!isClient && (
            <div className="form-field form-field--inline">
              <label htmlFor="f-company">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Building2 size={12} aria-hidden="true" /> Cliente
                </span>
              </label>
              <input id="f-company" className="control" placeholder="Nombre de óptica" value={filters.company} onChange={(e) => setFilters((f) => ({ ...f, company: e.target.value }))} />
            </div>
          )}
          {isAdmin && (
            <div className="form-field form-field--inline">
              <label htmlFor="f-status">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Layers size={12} aria-hidden="true" /> Estado
                </span>
              </label>
              <Select
                id="f-status"
                value={filters.syncStatus}
                onChange={(v) => setFilters((f) => ({ ...f, syncStatus: v }))}
                options={STATUS_OPTIONS}
              />
            </div>
          )}
          <button type="submit" className="btn">
            <Filter size={15} aria-hidden="true" />
            <span>Aplicar filtros</span>
          </button>
          <button type="button" className="btn" onClick={clearFilters} disabled={!anyFilter}>
            <RotateCcw size={15} aria-hidden="true" />
            <span>Limpiar</span>
          </button>
        </form>

        {!list && !error && <p className="muted">Cargando…</p>}

        {list && (
          <>
            <div className="list-summary">
              <FileSpreadsheet size={15} aria-hidden="true" />
              <span>Total de órdenes: <strong>{list.total}</strong></span>
            </div>

            {list.data.length === 0 ? (
              <div className="empty-state">
                <Inbox size={42} className="empty-state__icon" aria-hidden="true" />
                <p className="empty-state__title empty">No hay órdenes que coincidan.</p>
                <p className="empty-state__text">Ajusta o limpia los filtros para ver otros resultados.</p>
              </div>
            ) : (
              <div className="table-scroll panel__body">
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
                        <td><strong>{o.orderNumber}</strong></td>
                        {!isClient && <td>{o.company}</td>}
                        <td className="tabular-nums">{new Date(o.createdAt).toLocaleDateString()}</td>
                        <td>{o.summary || '—'}</td>
                        {isAdmin && (
                          <td>
                            <StatusBadge status={o.syncStatus ?? 'PENDIENTE'} />
                            {o.syncStatus === 'PENDIENTE' && o.pendingSinceMinutes != null && (
                              <span className="badge-meta badge-meta--inline">
                                <Clock size={11} aria-hidden="true" style={{ verticalAlign: -1, marginRight: 3 }} />
                                {Math.floor(o.pendingSinceMinutes / 60)} h pendiente
                              </span>
                            )}
                          </td>
                        )}
                        <td className="is-actions">
                          <Link to={`/ordenes/${o.id}`} className="btn btn--sm btn--link">
                            <Eye size={14} aria-hidden="true" />
                            <span>Ver</span>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="panel__footer">
              <Pager total={list.total} limit={PAGE_SIZE} offset={offset} onPage={(o) => load(o, active)} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}