import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ordersApi, type OrdersList } from '../api/orders';
import { useAuth } from '../../../app/AuthContext';
import { StatusBadge } from '../../../shared/StatusBadge';
import type { OrderListItem } from '../../../core/types';

/**
 * F6.3 (cliente) / F6.6 (laboratorio) / F6.8 (admin): listado de ordenes segun rol.
 * - CLIENTE_EXTERNO: su historial (sin estado).
 * - LABORATORIO: todas, solo lectura, sin estado.
 * - ADMINISTRADOR: todas, con estado + "pendiente desde".
 */
export function OrdersPage() {
  const { user } = useAuth();
  const [list, setList] = useState<OrdersList | null>(null);
  const [error, setError] = useState('');
  const isAdmin = user?.role === 'ADMINISTRADOR';

  useEffect(() => {
    ordersApi
      .list()
      .then(setList)
      .catch((e) => setError(e instanceof Error ? e.message : 'Error al cargar órdenes'));
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2>{user?.role === 'CLIENTE_EXTERNO' ? 'Mis órdenes' : 'Órdenes'}</h2>
        {user?.role === 'CLIENTE_EXTERNO' && (
          <Link to="/ordenes/nueva" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
            + Nueva orden
          </Link>
        )}
      </div>

      {error && <p role="alert" style={{ color: 'var(--color-badge-error-text)' }}>{error}</p>}
      {!list && !error && <p>Cargando…</p>}
      {list && (
        <p style={{ color: 'var(--color-text-secondary)' }}>
          Total de órdenes: <strong>{list.total}</strong>
        </p>
      )}

      {list && (
        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--color-surface)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-card)' }}>
          <thead>
            <tr style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--color-text-secondary)' }}>
              <th style={th}>N° orden</th>
              <th style={th}>Cliente</th>
              <th style={th}>Paciente</th>
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
                <td style={td}>{o.company}</td>
                <td style={td}>{o.patient}</td>
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
    </div>
  );
}

const th: React.CSSProperties = { textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid var(--color-border)' };
const td: React.CSSProperties = { padding: '12px 16px' };
