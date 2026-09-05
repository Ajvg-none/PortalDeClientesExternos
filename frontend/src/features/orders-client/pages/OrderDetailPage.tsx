import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ordersApi } from '../api/orders';
import { useAuth } from '../../../app/AuthContext';
import { StatusBadge } from '../../../shared/StatusBadge';
import type { OrderDetail } from '../../../core/types';

/** Detalle completo en solo lectura (RF-16/21/31 + REM-2026-09). */
export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState('');
  const isAdmin = user?.role === 'ADMINISTRADOR';

  useEffect(() => {
    if (!id) return;
    ordersApi.get(id).then(setOrder).catch((e) => setError(e instanceof Error ? e.message : 'Error'));
  }, [id]);

  if (error) return <p role="alert" style={{ color: 'var(--color-badge-error-text)' }}>{error}</p>;
  if (!order) return <p>Cargando…</p>;

  const eyeRows: { label: string; od: string | number | null; oi: string | number | null }[] = [
    { label: 'Esfera', od: order.od.sphere, oi: order.oi.sphere },
    { label: 'Cilindro', od: order.od.cylinder, oi: order.oi.cylinder },
    { label: 'Eje', od: order.od.axis, oi: order.oi.axis },
    { label: 'Add', od: order.od.addition, oi: order.oi.addition },
    { label: 'DNP', od: order.od.dnp, oi: order.oi.dnp },
    { label: 'Altura', od: order.od.height, oi: order.oi.height },
    { label: 'Código producto', od: order.od.productCode, oi: order.oi.productCode },
  ];

  return (
    <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-card)', padding: '24px', maxWidth: '860px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 style={{ margin: 0 }}>Orden {order.orderNumber}</h2>
        {isAdmin && order.syncStatus && <StatusBadge status={order.syncStatus} />}
      </div>

      {isAdmin && (
        <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
          {order.syncStatus === 'PENDIENTE' && order.pendingSinceMinutes != null
            ? `Pendiente desde hace ${Math.floor(order.pendingSinceMinutes / 60)} h`
            : order.syncStatus === 'SINCRONIZADA' && order.syncedAt
              ? `Sincronizada el ${new Date(order.syncedAt).toLocaleString()}`
              : ''}
        </p>
      )}

      <section>
        <h3>Datos generales</h3>
        <DetailRow label="Cliente" value={order.company} />
        <DetailRow label="Paciente" value={order.patient} />
        <DetailRow label="Fecha de creación" value={new Date(order.createdAt).toLocaleString()} />
      </section>

      <section>
        <h3>Fórmula óptica</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr>
              <th style={th}>Campo</th>
              <th style={th}>OD</th>
              <th style={th}>OI</th>
            </tr>
          </thead>
          <tbody>
            {eyeRows.map((r) => (
              <tr key={r.label} style={{ borderTop: '1px solid var(--color-border)' }}>
                <td style={td}>{r.label}</td>
                <td style={td}>{r.od ?? '—'}</td>
                <td style={td}>{r.oi ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h3>Tratamiento</h3>
        <p>{order.treatment ?? '—'}</p>
      </section>

      <section>
        <h3>Montura</h3>
        <DetailRow label="Tipo" value={order.mount.type} />
        <DetailRow label="Marca" value={order.mount.brand} />
        <DetailRow label="Modelo" value={order.mount.model} />
        <DetailRow label="Color" value={order.mount.color} />
      </section>

      <section>
        <h3>Coloración</h3>
        <DetailRow label="Color" value={order.coloration.color} />
        <DetailRow label="Unicolor" value={order.coloration.unicolor ? 'Sí' : 'No'} />
        <DetailRow label="Degradado %" value={order.coloration.degradadoPercent} />
      </section>

      <section>
        <h3>Observaciones</h3>
        <p>{order.observations ?? '—'}</p>
      </section>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string | number | null }) {
  return (
    <p style={{ margin: '6px 0' }}>
      <span style={{ color: 'var(--color-text-secondary)' }}>{label}: </span>
      <strong>{value ?? '—'}</strong>
    </p>
  );
}

const th: React.CSSProperties = { textAlign: 'left', padding: '8px 12px', fontSize: '12px', textTransform: 'uppercase', color: 'var(--color-text-secondary)' };
const td: React.CSSProperties = { padding: '8px 12px' };
