import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ordersApi, type OrderCreateInput } from '../api/orders';
import { useAuth } from '../../../app/AuthContext';
import type { OrderDetail } from '../../../core/types';

/**
 * F6.4 - Formulario de nueva orden (RF-07…13).
 * Empresa autopoblada en solo lectura (DEC-3); N° de Orden y Paciente
 * obligatorios; validacion de unicidad la hace el backend (409); resumen
 * modal antes de enviar; sin adjuntos.
 */
export function NewOrderPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<OrderCreateInput>({ orderNumber: '', patient: '' });
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function setField(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit() {
    setError('');
    setSaving(true);
    try {
      const created = await ordersApi.create(form);
      navigate('/ordenes', { state: { createdNumber: (created as OrderDetail).orderNumber } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo enviar la orden');
      setSaving(false);
    }
  }

  return (
    <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-card)', padding: '24px', maxWidth: '720px' }}>
      <h2 style={{ marginTop: 0 }}>Nueva orden</h2>

      <h3>Datos generales</h3>
      <label htmlFor="order-company" style={labelStyle}>Empresa (autopoblada)</label>
      <input id="order-company" value={user?.companyName ?? ''} disabled style={{ ...inputStyle, background: 'var(--color-canvas)', color: 'var(--color-text-secondary)' }} />

      <label htmlFor="order-number" style={labelStyle}>Número de orden *</label>
      <input id="order-number" value={form.orderNumber} onChange={(e) => setField('orderNumber', e.target.value)} style={inputStyle} />

      <label htmlFor="order-patient" style={labelStyle}>Paciente *</label>
      <input id="order-patient" value={form.patient} onChange={(e) => setField('patient', e.target.value)} style={inputStyle} />

      <h3>Fórmula óptica</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <input type="number" step="any" placeholder="OD Esfera" onChange={(e) => setField('odSphere', e.target.value)} style={inputStyle} />
        <input type="number" step="any" placeholder="OI Esfera" onChange={(e) => setField('oiSphere', e.target.value)} style={inputStyle} />
        <input type="number" step="any" placeholder="OD Cilindro" onChange={(e) => setField('odCylinder', e.target.value)} style={inputStyle} />
        <input type="number" step="any" placeholder="OI Cilindro" onChange={(e) => setField('oiCylinder', e.target.value)} style={inputStyle} />
      </div>

      <h3>Tratamiento</h3>
      <select onChange={(e) => setField('treatment', e.target.value)} defaultValue="" style={inputStyle}>
        <option value="">Sin tratamiento</option>
        <option>ECO (AR Verde)</option>
        <option>OCEAN (AR Azul)</option>
        <option>SOLERX SILVER</option>
        <option>SOLERX BLUE</option>
      </select>

      <h3>Observaciones</h3>
      <textarea rows={3} onChange={(e) => setField('observations', e.target.value)} style={{ ...inputStyle, height: 'auto' }} />

      {error && <p role="alert" style={{ color: 'var(--color-badge-error-text)' }}>{error}</p>}

      <button
        disabled={!form.orderNumber.trim() || !form.patient.trim()}
        onClick={() => setConfirming(true)}
        style={{ marginTop: '24px', height: '42px', padding: '0 24px', borderRadius: 'var(--radius-sm)', border: 'none', background: 'var(--color-primary)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
      >
        Revisar orden
      </button>

      {confirming && (
        <div
          role="dialog"
          aria-modal="true"
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-xl)', padding: '24px', width: '420px' }}>
            <h3 style={{ marginTop: 0 }}>Resumen de la orden</h3>
            <p>N° de orden: <strong>{form.orderNumber}</strong></p>
            <p>Empresa: <strong>{user?.companyName}</strong></p>
            <p>Paciente: <strong>{form.patient}</strong></p>
            {form.odSphere ? <p>OD: {String(form.odSphere)} / OI: {form.oiSphere ? String(form.oiSphere) : '—'}</p> : null}
            {form.treatment ? <p>Tratamiento: {String(form.treatment)}</p> : null}
            {form.observations ? <p>Observaciones: {String(form.observations)}</p> : null}
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <button
                onClick={() => setConfirming(false)}
                style={{ flex: 1, height: '42px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', background: 'var(--color-surface)', fontWeight: 600, cursor: 'pointer' }}
              >
                Atrás
              </button>
              <button
                onClick={submit}
                disabled={saving}
                style={{ flex: 1, height: '42px', borderRadius: 'var(--radius-sm)', border: 'none', background: 'var(--color-primary)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
              >
                {saving ? 'Enviando…' : 'Confirmar envío'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: '12px', textTransform: 'uppercase', color: 'var(--color-primary)', margin: '16px 0 6px' };
const inputStyle: React.CSSProperties = { width: '100%', height: '42px', padding: '0 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: '14px' };
