import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ordersApi, type OrdersList } from '../api/orders';
import { useAuth } from '../../../app/AuthContext';
import { StatusBadge } from '../../../shared/StatusBadge';
import { Pager } from '../../../shared/Pager';
import type { OrderListItem } from '../../../core/types';

const PAGE = 20;

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
 * Paginacion por offset (REM-6) y filtros con Aplicar/Limpiar (REM-7).
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
      const params: Record<string, string> = { limit: String(PAGE), offset: String(nextOffset) };
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

  const anyFilter = filters.from !== '' || filters.to !== '' || filters.company !== '' || filters.syncStatus !== '';

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2>{isClient ? 'Mis órdenes' : 'Órdenes'}</h2>
        {isClient && (
          <Link to="/ordenes/nueva" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
            + Nueva orden
          </Link>
        )}
      </div>

      <form onSubmit={applyFilters} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '16px' }}>
        <FilterField label="Desde">
          <input type="date" value={filters.from} onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))} style={filterInput} />
        </FilterField>
        <FilterField label="Hasta">
          <input type="date" value={filters.to} onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))} style={filterInput} />
        </FilterField>
        {!isClient && (
          <FilterField label="Cliente">
            <input value={filters.company} onChange={(e) => setFilters((f) => ({ ...f, company: e.target.value }))} style={filterInput} />
          </FilterField>
        )}
        {isAdmin && (
          <FilterField label="Estado">
            <select value={filters.syncStatus} onChange={(e) => setFilters((f) => ({ ...f, syncStatus: e.target.value }))} style={filterInput}>
              <option value="">Todos</option>
              <option>PENDIENTE</option>
              <option>SINCRONIZADA</option>
            </select>
          </FilterField>
        )}
        <button type="submit" style={filterBtn}>Aplicar filtros</button>
        <button type="button" onClick={clearFilters} disabled={!anyFilter} style={filterBtn}>Limpiar</button>
      </form>

      {error && <p role="alert" style={{ color: 'var(--color-badge-error-text)' }}>{error}</p>}
      {notice && <p role="status" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>{notice}</p>}
      {!list && !error && <p>Cargando…</p>}
      {list && (
        <>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            Total de órdenes: <strong>{list.total}</strong>
          </p>

          {list.data.length === 0 && <p>No hay órdenes que coincidan.</p>}
          {list.data.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--color-surface)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-card)' }}>
              <thead>
                <tr style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--color-text-secondary)' }}>
                  <th style={th}>N° orden</th>
                  {!isClient && <th style={th}>Cliente</th>}
                  <th style={th}>Fecha</th>
                  <th style={th}>Resumen</th>
                  {isAdmin && <th style={th}>Estado</th>}
                  <th style={th}></th>
                </tr>
              </thead>
              <tbody>
                {list.data.map((o: OrderListItem) => (
                  <tr key={o.id} style={{ fontSize: '14px', borderTop: '1px solid var(--color-border)' }}>
                    <td style={td}>{o.orderNumber}</td>
                    {!isClient && <td style={td}>{o.company}</td>}
                    <td style={td}>{new Date(o.createdAt).toLocaleDateString()}</td>
                    <td style={td}>{o.summary || '—'}</td>
                    {isAdmin && (
                      <td style={td}>
                        <StatusBadge status={o.syncStatus ?? 'PENDIENTE'} />
                        {o.syncStatus === 'PENDIENTE' && o.pendingSinceMinutes != null && (
                          <span style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                            {Math.floor(o.pendingSinceMinutes / 60)} h pendiente
                          </span>
                        )}
                      </td>
                    )}
                    <td style={td}>
                      <Link to={`/ordenes/${o.id}`} style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <Pager total={list.total} limit={PAGE} offset={offset} onPage={(o) => load(o)} />
        </>
      )}
    </div>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '12px', textTransform: 'uppercase', color: 'var(--color-primary)', marginBottom: '4px' }}>{label}</label>
      {children}
    </div>
  );
}

const th: React.CSSProperties = { textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid var(--color-border)' };
const td: React.CSSProperties = { padding: '12px 16px' };
const filterInput: React.CSSProperties = { height: '38px', padding: '0 10px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: '14px' };
const filterBtn: React.CSSProperties = { height: '38px', padding: '0 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', background: 'var(--color-surface)', fontWeight: 600, cursor: 'pointer' };
