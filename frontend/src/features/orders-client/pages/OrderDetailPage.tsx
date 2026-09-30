import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { User, Glasses, Sparkles, Layers, Palette, FileText, ArrowLeft, Clock, CheckCircle2 } from 'lucide-react';
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
    let active = true;
    ordersApi.get(id).then((o) => { if (active) setOrder(o); }).catch((e) => { if (active) setError(e instanceof Error ? e.message : 'Error'); });
    return () => { active = false; };
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
      <div style={{ marginBottom: 16 }}>
        <Link to="/ordenes" className="btn btn--sm btn--link" style={{ paddingLeft: 0 }}>
          <ArrowLeft size={15} aria-hidden="true" />
          <span>Volver al listado</span>
        </Link>
      </div>

      <div className="page-head">
        <h1>Orden {order.orderNumber}</h1>
        {isAdmin && order.syncStatus && <StatusBadge status={order.syncStatus} />}
      </div>

      {isAdmin && (
        <p className="muted" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
          {order.syncStatus === 'PENDIENTE' && order.pendingSinceMinutes != null ? (
            <>
              <Clock size={14} aria-hidden="true" />
              <span>Pendiente desde hace {Math.floor(order.pendingSinceMinutes / 60)} h</span>
            </>
          ) : order.syncStatus === 'SINCRONIZADA' && order.syncedAt ? (
            <>
              <CheckCircle2 size={14} aria-hidden="true" style={{ color: 'var(--color-badge-sync-text)' }} />
              <span>Sincronizada el {new Date(order.syncedAt).toLocaleString()}</span>
            </>
          ) : null}
        </p>
      )}

      <section className="section">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <User size={16} aria-hidden="true" color="var(--color-primary)" />
          <span>Datos generales</span>
        </h2>
        <DetailRow label="Cliente" value={order.company} />
        <DetailRow label="Paciente" value={order.patient} />
        <DetailRow label="Fecha de creación" value={new Date(order.createdAt).toLocaleString()} />
      </section>

      <section className="section">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Glasses size={16} aria-hidden="true" color="var(--color-primary)" />
          <span>Fórmula óptica</span>
        </h2>
        <div className="table-scroll">
          <table className="table tabular-nums">
            <thead>
              <tr>
                <th>Campo</th>
                <th>OD (Ojo Derecho)</th>
                <th>OI (Ojo Izquierdo)</th>
              </tr>
            </thead>
            <tbody>
              {eyeRows.map((r) => (
                <tr key={r.label}>
                  <td><strong>{r.label}</strong></td>
                  <td>{r.od ?? '—'}</td>
                  <td>{r.oi ?? '—'}</td>
                </tr>
              ))}
              <tr>
                <td><strong>Código producto</strong></td>
                <td>{order.od.productCode ?? '—'}</td>
                <td>{order.oi.productCode ?? '—'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="section">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sparkles size={16} aria-hidden="true" color="var(--color-primary)" />
          <span>Tratamiento</span>
        </h2>
        <p>{order.treatment ?? '—'}</p>
      </section>

      <section className="section">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Layers size={16} aria-hidden="true" color="var(--color-primary)" />
          <span>Montura</span>
        </h2>
        <DetailRow label="Tipo" value={order.mount.type} />
        <DetailRow label="Marca" value={order.mount.brand} />
        <DetailRow label="Modelo" value={order.mount.model} />
        <DetailRow label="Color" value={order.mount.color} />
      </section>

      <section className="section">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Palette size={16} aria-hidden="true" color="var(--color-primary)" />
          <span>Coloración</span>
        </h2>
        <DetailRow label="Color" value={order.coloration.color} />
        <DetailRow label="Unicolor" value={order.coloration.unicolor ? 'Sí' : 'No'} />
        <DetailRow label="Degradado %" value={order.coloration.degradadoPercent} />
      </section>

      <section className="section">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileText size={16} aria-hidden="true" color="var(--color-primary)" />
          <span>Observaciones</span>
        </h2>
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
