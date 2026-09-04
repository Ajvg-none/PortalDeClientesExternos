import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ordersApi } from '../api/orders';
import { useAuth } from '../../../app/AuthContext';
import { StatusBadge } from '../../../shared/StatusBadge';
import type { OrderDetail } from '../../../core/types';

/** Detalle de orden en modo solo lectura (RF-16/21/31). Sin editar/cancelar. */
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

  return (
    <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-card)', padding: '24px' }}>
      <h2 style={{ marginTop: 0 }}>Orden {order.orderNumber}</h2>
      {isAdmin && order.syncStatus && <StatusBadge status={order.syncStatus} />}

      <section>
        <h3>Datos generales</h3>
        <p>Cliente: <strong>{order.company}</strong></p>
        <p>Paciente: <strong>{order.patient}</strong></p>
        <p>Fecha: {new Date(order.createdAt).toLocaleString()}</p>
      </section>

      <section>
        <h3>Fórmula óptica</h3>
        <p>OD: {order.od.sphere ?? '—'} / OI: {order.oi.sphere ?? '—'}</p>
        <p>Resumen: {order.summary || 'Sin fórmula'}</p>
      </section>

      {order.treatment && <p>Tratamiento: <strong>{order.treatment}</strong></p>}
      {order.mount.type && <p>Montura: {[order.mount.type, order.mount.brand, order.mount.model].filter(Boolean).join(' · ')}</p>}
      {order.observations && <p>Observaciones: {order.observations}</p>}
    </div>
  );
}
