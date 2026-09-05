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

  // REM-2026-09/RF-34: descarga autenticada (fetch + Authorization).
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

  if (error) return <p role="alert" className="error">{error}</p>;
  if (!data) return <p className="muted">Cargando…</p>;

  const maxMonth = Math.max(1, ...data.ordersByMonth.map((m) => m.total));

  return (
    <div>
      <div className="page-head">
        <h1>Estadísticas</h1>
        <button className="btn btn--primary" onClick={exportCsv} disabled={exporting}>
          {exporting ? 'Exportando…' : 'Exportar CSV'}
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card__label">Total órdenes</div>
          <div className="stat-card__value">{data.statusSummary.total}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Pendientes</div>
          <div className="stat-card__value">{data.statusSummary.pendiente}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">Sincronizadas</div>
          <div className="stat-card__value">{data.statusSummary.sincronizadas}</div>
        </div>
      </div>

      <section className="section">
        <h2>Órdenes por mes</h2>
        <div role="img" aria-label="Gráfico de órdenes por mes">
          {data.ordersByMonth.map((m) => (
            <div key={m.month} className="bar">
              <span className="bar__label">{m.month}</span>
              <div className="bar__track">
                <div className="bar__fill" style={{ width: `${(m.total / maxMonth) * 100}%` }} />
              </div>
              <span style={{ width: 24, textAlign: 'right' }}>{m.total}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <h2>Top clientes</h2>
        <ol style={{ paddingLeft: 20 }}>
          {data.topClients.map((c) => (
            <li key={c.company}>
              {c.company} — {c.total}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
