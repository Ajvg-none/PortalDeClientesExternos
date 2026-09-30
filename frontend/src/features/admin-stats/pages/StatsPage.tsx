import { useEffect, useState } from 'react';
import {
  BarChart3,
  Download,
  TrendingUp,
  Clock,
  CheckCircle2,
  Calendar,
  Building2,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { reportsApi } from '../api/reports';
import { httpDownload } from '../../../core/http';
import type { DashboardData } from '../../../core/types';

/** F6.9 - Dashboard de estadisticas (RF-33) + boton de exportacion (RF-34). */
export function StatsPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let active = true;
    reportsApi.dashboard().then((d) => { if (active) setData(d); }).catch((e) => { if (active) setError(e instanceof Error ? e.message : 'Error'); });
    return () => { active = false; };
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

  if (error) {
    return (
      <p role="alert" className="error" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <AlertCircle size={16} aria-hidden="true" />
        <span>{error}</span>
      </p>
    );
  }

  if (!data) return <p className="muted">Cargando…</p>;

  const maxMonth = Math.max(1, ...data.ordersByMonth.map((m) => m.total));
  const maxClient = Math.max(1, ...data.topClients.map((c) => c.total));

  return (
    <div>
      <div className="page-head">
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <BarChart3 size={24} color="var(--color-primary)" aria-hidden="true" />
          <span>Estadísticas</span>
        </h1>
        <button className="btn btn--primary" onClick={exportCsv} disabled={exporting}>
          {exporting ? (
            <>
              <Loader2 size={16} className="btn__spinner" aria-hidden="true" />
              <span>Exportando…</span>
            </>
          ) : (
            <>
              <Download size={16} aria-hidden="true" />
              <span>Exportar CSV</span>
            </>
          )}
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div className="stat-card__label">Total órdenes</div>
            <TrendingUp size={18} color="var(--color-primary)" aria-hidden="true" />
          </div>
          <div className="stat-card__value tabular-nums">{data.statusSummary.total}</div>
        </div>
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div className="stat-card__label">Pendientes</div>
            <Clock size={18} color="var(--color-badge-pendiente-text)" aria-hidden="true" />
          </div>
          <div className="stat-card__value tabular-nums">{data.statusSummary.pendiente}</div>
        </div>
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div className="stat-card__label">Sincronizadas</div>
            <CheckCircle2 size={18} color="var(--color-badge-sync-text)" aria-hidden="true" />
          </div>
          <div className="stat-card__value tabular-nums">{data.statusSummary.sincronizadas}</div>
        </div>
      </div>

      <section className="section panel" style={{ marginBottom: 24 }}>
        <h2 className="section-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Calendar size={18} aria-hidden="true" />
          <span>Órdenes por mes</span>
        </h2>
        <div role="img" aria-label="Gráfico de órdenes por mes">
          {data.ordersByMonth.map((m) => (
            <div key={m.month} className="bar">
              <span className="bar__label">{m.month}</span>
              <div className="bar__track">
                <div className="bar__fill" style={{ width: `${(m.total / maxMonth) * 100}%` }} />
              </div>
              <span className="bar__value tabular-nums">{m.total}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="section panel">
        <h2 className="section-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Building2 size={18} aria-hidden="true" />
          <span>Top clientes</span>
        </h2>
        <div role="img" aria-label="Top clientes">
          {data.topClients.map((c) => (
            <div key={c.company} className="bar">
              <span className="bar__label" title={c.company} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {c.company}
              </span>
              <div className="bar__track">
                <div className="bar__fill" style={{ width: `${(c.total / maxClient) * 100}%` }} />
              </div>
              <span className="bar__value tabular-nums">{c.total}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}