import { useEffect, useState } from 'react';
import { reportsApi } from '../api/reports';
import { httpDownload } from '../../../core/http';
import type { DashboardData } from '../../../core/types';

/** F6.9 - Dashboard de estadisticas (RF-33) + boton de exportacion (RF-34). */
export function StatsPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    reportsApi.dashboard().then(setData).catch((e) => setError(e instanceof Error ? e.message : 'Error'));
  }, []);

  // REM-2026-09/RF-34: descarga autenticada (fetch + Authorization). Un
  // window.open no adjunta el JWT y el endpoint protegido responderia 401.
  async function exportCsv() {
    setError('');
    setExporting(true);
    try {
      const stamp = new Date().toISOString().slice(0, 10);
      await httpDownload('/reports/orders/export', `reporte-ordenes-${stamp}.csv`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo exportar el reporte');
    } finally {
      setExporting(false);
    }
  }

  if (error) return <p role="alert" style={{ color: 'var(--color-badge-error-text)' }}>{error}</p>;
  if (!data) return <p>Cargando…</p>;

  const maxMonth = Math.max(1, ...data.ordersByMonth.map((m: { total: number }) => m.total));

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2>Estadísticas</h2>
        <button onClick={exportCsv} disabled={exporting} style={{ height: '42px', padding: '0 20px', borderRadius: 'var(--radius-sm)', border: 'none', background: 'var(--color-primary)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
          {exporting ? 'Exportando…' : 'Exportar CSV'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <Card label="Total órdenes" value={String(data.statusSummary.total)} />
        <Card label="Pendientes" value={String(data.statusSummary.pendiente)} />
        <Card label="Sincronizadas" value={String(data.statusSummary.sincronizadas)} />
      </div>

      <section>
        <h3>Órdenes por mes</h3>
        <div role="img" aria-label="Gráfico de órdenes por mes">
          {data.ordersByMonth.map((m: { month: string; total: number }) => (
            <div key={m.month} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <span style={{ width: '80px', color: 'var(--color-text-secondary)', fontSize: '13px' }}>{m.month}</span>
              <div style={{ flex: 1, background: 'var(--color-canvas)', borderRadius: '4px', height: '20px' }}>
                <div style={{ width: `${(m.total / maxMonth) * 100}%`, height: '100%', background: 'var(--color-primary)', borderRadius: '4px' }} />
              </div>
              <span style={{ width: '24px', textAlign: 'right' }}>{m.total}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3>Top clientes</h3>
        <ol>
          {data.topClients.map((c: { company: string; total: number }) => (
            <li key={c.company}>{c.company} — {c.total}</li>
          ))}
        </ol>
      </section>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-card)', padding: '20px' }}>
      <div style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--color-primary)' }}>{label}</div>
      <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-text)' }}>{value}</div>
    </div>
  );
}
