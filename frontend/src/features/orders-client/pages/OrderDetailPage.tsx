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

  if (error) return <p role="alert" className="error">{error}</p>;
  if (!order) return <p className="muted">Cargando…</p>;

  const eyeRows: { label: string; od: number | null; oi: number | null }[] = [
    { label: 'Esfera', od: order.od.sphere, oi: order.oi.sphere },
    { label: 'Cilindro', od: order.od.cylinder, oi: order.oi.cylinder },
    { label: 'Eje', od: order.od.axis, oi: order.oi.axis },
    { label: 'Add', od: order.od.addition, oi: order.oi.addition },
    { label: 'DNP', od: order.od.dnp, oi: order.oi.dnp },
    { label: 'Altura', od: order.od.height, oi: order.oi.height },
  ];

  return (
    <div className="card card--narrow">
      <div className="page-head">
        <h1>Orden {order.orderNumber}</h1>
        {isAdmin && order.syncStatus && <StatusBadge status={order.syncStatus} />}
      </div>

      {isAdmin && (
        <p className="muted" style={{ marginBottom: 16 }}>
          {order.syncStatus === 'PENDIENTE' && order.pendingSinceMinutes != null
            ? `Pendiente desde hace ${Math.floor(order.pendingSinceMinutes / 60)} h`
            : order.syncStatus === 'SINCRONIZADA' && order.syncedAt
              ? `Sincronizada el ${new Date(order.syncedAt).toLocaleString()}`
              : ''}
        </p>
      )}

      <section className="section">
        <h2>Datos generales</h2>
        <DetailRow label="Cliente" value={order.company} />
        <DetailRow label="Paciente" value={order.patient} />
        <DetailRow label="Fecha de creación" value={new Date(order.createdAt).toLocaleString()} />
      </section>

      <section className="section">
        <h2>Fórmula óptica</h2>
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>Campo</th>
                <th>OD</th>
                <th>OI</th>
              </tr>
            </thead>
            <tbody>
              {eyeRows.map((r) => (
                <tr key={r.label}>
                  <td>{r.label}</td>
                  <td>{r.od ?? '—'}</td>
                  <td>{r.oi ?? '—'}</td>
                </tr>
              ))}
              <tr>
                <td>Código producto</td>
                <td>{order.od.productCode ?? '—'}</td>
                <td>{order.oi.productCode ?? '—'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="section">
        <h2>Tratamiento</h2>
        <p>{order.treatment ?? '—'}</p>
      </section>

      <section className="section">
        <h2>Montura</h2>
        <DetailRow label="Tipo" value={order.mount.type} />
        <DetailRow label="Marca" value={order.mount.brand} />
        <DetailRow label="Modelo" value={order.mount.model} />
        <DetailRow label="Color" value={order.mount.color} />
      </section>

      <section className="section">
        <h2>Coloración</h2>
        <DetailRow label="Color" value={order.coloration.color} />
        <DetailRow label="Unicolor" value={order.coloration.unicolor ? 'Sí' : 'No'} />
        <DetailRow label="Degradado %" value={order.coloration.degradadoPercent} />
      </section>

      <section className="section">
        <h2>Observaciones</h2>
        <p>{order.observations ?? '—'}</p>
      </section>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string | number | null }) {
  return (
    <p className="detail-row">
      <span className="detail-row__label">{label}: </span>
      <strong>{value ?? '—'}</strong>
    </p>
  );
}
