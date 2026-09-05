import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ordersApi, type OrderCreateInput } from '../api/orders';
import { useAuth } from '../../../app/AuthContext';
import { Modal } from '../../../shared/Modal';
import type { OrderDetail } from '../../../core/types';

/**
 * F6.4 + REM-2026-09 - Formulario de nueva orden con TODOS los campos de
 * RF-08 (generales, formula OD/OI completa, tratamiento, montura, coloracion,
 * observaciones). Empresa autopoblada en solo lectura (DEC-3); unico
 * obligatorio N de Orden + Paciente (RF-09); validacion asincrona de unicidad
 * del N de Orden (RF-10/REM-5); resumen modal antes de enviar (RF-12); sin
 * adjuntos (RF-11).
 */

const TREATMENTS = ['ECO (AR Verde)', 'OCEAN (AR Azul)', 'SOLERX SILVER', 'SOLERX BLUE'];
const MOUNT_TYPES = ['METAL ARO COMPLETO', 'METAL SEMI-AEREA', 'PASTA ARO COMPLETO', 'PASTA SEMI-AEREA', 'AL AIRE'];

type EyeField = 'sphere' | 'cylinder' | 'axis' | 'addition' | 'dnp' | 'height' | 'productCode';

type Draft = OrderCreateInput;

const initialDraft: Draft = { orderNumber: '', patient: '' };

export function NewOrderPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<Draft>(initialDraft);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [numberError, setNumberError] = useState('');
  const [checkingNumber, setCheckingNumber] = useState(false);

  function set<K extends keyof Draft>(k: K, v: Draft[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function setEye(side: 'od' | 'oi', field: EyeField, v: string) {
    setForm((f) => ({ ...f, [`${side}${field[0].toUpperCase()}${field.slice(1)}`]: v }));
  }

  function eyeValue(side: 'od' | 'oi', field: EyeField): string {
    const key = `${side}${field[0].toUpperCase()}${field.slice(1)}` as keyof Draft;
    const v = form[key];
    return typeof v === 'string' ? v : '';
  }

  // REM-5/RF-10: validacion asincrona de unicidad al salir del campo
  async function checkNumber() {
    const value = String(form.orderNumber ?? '').trim();
    if (!value) {
      setNumberError('');
      return;
    }
    setCheckingNumber(true);
    try {
      const { available } = await ordersApi.checkOrderNumber(value);
      setNumberError(available ? '' : 'El número de orden ya existe. Usa otro.');
    } catch {
      // sin red el backend sigue protegiendo con el 409 al confirmar
      setNumberError('');
    } finally {
      setCheckingNumber(false);
    }
  }

  async function submit() {
    setError('');
    setSaving(true);
    try {
      const created = await ordersApi.create(form);
      navigate('/ordenes', { state: { createdNumber: (created as OrderDetail).orderNumber } });
    } catch (e) {
      const apiErr = e as { code?: string; message?: string };
      setError(apiErr?.code === 'ORDER_ALREADY_EXISTS' ? 'El número de orden ya existe' : apiErr?.message ?? 'No se pudo enviar la orden');
      setSaving(false);
    }
  }

  const numberInvalid = !String(form.orderNumber ?? '').trim();
  const patientInvalid = !String(form.patient ?? '').trim();
  const canReview = !numberInvalid && !patientInvalid && !numberError && !checkingNumber && !saving;

  return (
    <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-card)', padding: '24px', maxWidth: '860px' }}>
      <h2 style={{ marginTop: 0 }}>Nueva orden</h2>

      <h3>Datos generales</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0 16px' }}>
        <div style={{ margin: '12px 0' }}>
          <label htmlFor="order-company" style={labelStyle}>Empresa (autopoblada)</label>
          <input
            id="order-company"
            value={user?.companyName ?? ''}
            disabled
            style={{ ...inputStyle, background: 'var(--color-canvas)', color: 'var(--color-text-secondary)' }}
          />
        </div>
        <div style={{ margin: '12px 0' }}>
          <label htmlFor="order-number" style={labelStyle}>Número de orden *</label>
          <input
            id="order-number"
            value={String(form.orderNumber ?? '')}
            onChange={(e) => set('orderNumber', e.target.value)}
            onBlur={checkNumber}
            style={inputStyle}
          />
          {numberError && (
            <p role="alert" style={{ color: 'var(--color-badge-error-text)', fontSize: '12px', margin: '4px 0 0' }}>
              {numberError}
            </p>
          )}
          {checkingNumber && (
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '12px', margin: '4px 0 0' }}>Verificando disponibilidad…</p>
          )}
        </div>
        <div style={{ margin: '12px 0' }}>
          <label htmlFor="order-patient" style={labelStyle}>Paciente *</label>
          <input id="order-patient" value={String(form.patient ?? '')} onChange={(e) => set('patient', e.target.value)} style={inputStyle} />
        </div>
      </div>

      <h3>Fórmula óptica — Ojo derecho (OD)</h3>
      <EyeSection side="od" get={eyeValue} set={setEye} />
      <h3>Fórmula óptica — Ojo izquierdo (OI)</h3>
      <EyeSection side="oi" get={eyeValue} set={setEye} />

      <h3>Tratamiento</h3>
      <select value={typeof form.treatment === 'string' ? form.treatment : ''} onChange={(e) => set('treatment', e.target.value)} style={inputStyle}>
        <option value="">Sin tratamiento</option>
        {TREATMENTS.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>

      <h3>Montura</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0 16px' }}>
        <Field label="Tipo de montura">
          <select value={typeof form.mountType === 'string' ? form.mountType : ''} onChange={(e) => set('mountType', e.target.value)} style={inputStyle}>
            <option value="">Sin tipo</option>
            {MOUNT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Marca">
          <input value={typeof form.mountBrand === 'string' ? form.mountBrand : ''} onChange={(e) => set('mountBrand', e.target.value)} style={inputStyle} />
        </Field>
        <Field label="Modelo">
          <input value={typeof form.mountModel === 'string' ? form.mountModel : ''} onChange={(e) => set('mountModel', e.target.value)} style={inputStyle} />
        </Field>
        <Field label="Color">
          <input value={typeof form.mountColor === 'string' ? form.mountColor : ''} onChange={(e) => set('mountColor', e.target.value)} style={inputStyle} />
        </Field>
      </div>

      <h3>Coloración</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0 16px', alignItems: 'end' }}>
        <Field label="Color">
          <input value={typeof form.colorationColor === 'string' ? form.colorationColor : ''} onChange={(e) => set('colorationColor', e.target.value)} style={inputStyle} />
        </Field>
        <Field label="Unicolor">
          <input
            type="checkbox"
            checked={form.colorationUnicolor === true}
            onChange={(e) => set('colorationUnicolor', e.target.checked)}
            style={{ width: '20px', height: '20px', cursor: 'pointer' }}
          />
        </Field>
        <Field label="Degradado %">
          <input type="number" step="any" value={typeof form.colorationDegradadoPercent === 'string' ? form.colorationDegradadoPercent : ''} onChange={(e) => set('colorationDegradadoPercent', e.target.value)} style={inputStyle} />
        </Field>
      </div>

      <h3>Observaciones</h3>
      <textarea rows={3} value={typeof form.observations === 'string' ? form.observations : ''} onChange={(e) => set('observations', e.target.value)} style={{ ...inputStyle, height: 'auto' }} />

      {error && <p role="alert" style={{ color: 'var(--color-badge-error-text)' }}>{error}</p>}

      <button
        disabled={!canReview}
        onClick={() => setConfirming(true)}
        style={{ marginTop: '24px', height: '42px', padding: '0 24px', borderRadius: 'var(--radius-sm)', border: 'none', background: 'var(--color-primary)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
      >
        Revisar orden
      </button>

      {confirming && (
        <Modal onClose={() => setConfirming(false)} width={480}>
          <h3 style={{ marginTop: 0 }}>Resumen de la orden</h3>
          <p>N° de orden: <strong>{String(form.orderNumber ?? '')}</strong></p>
          <p>Empresa: <strong>{user?.companyName}</strong></p>
          <p>Paciente: <strong>{String(form.patient ?? '')}</strong></p>
          <SummaryEye side="OD" get={eyeValue} />
          <SummaryEye side="OI" get={eyeValue} />
          {form.treatment ? <p>Tratamiento: {String(form.treatment)}</p> : null}
          {form.mountType || form.mountBrand ? (
            <p>Montura: {[form.mountType, form.mountBrand, form.mountModel, form.mountColor].filter(Boolean).join(' · ')}</p>
          ) : null}
          {form.colorationColor ? <p>Coloración: {[form.colorationColor, form.colorationUnicolor ? 'unicolor' : null, form.colorationDegradadoPercent ? `${String(form.colorationDegradadoPercent)}% degradado` : null].filter(Boolean).join(' · ')}</p> : null}
          {form.observations ? <p>Observaciones: {String(form.observations)}</p> : null}
          <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setConfirming(false)}
              style={{ height: '42px', padding: '0 20px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', background: 'var(--color-surface)', fontWeight: 600, cursor: 'pointer' }}
            >
              Atrás
            </button>
            <button
              onClick={submit}
              disabled={saving}
              style={{ height: '42px', padding: '0 20px', borderRadius: 'var(--radius-sm)', border: 'none', background: 'var(--color-primary)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
            >
              {saving ? 'Enviando…' : 'Confirmar envío'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function EyeSection({
  side,
  get,
  set,
}: {
  side: 'od' | 'oi';
  get: (side: 'od' | 'oi', f: EyeField) => string;
  set: (side: 'od' | 'oi', f: EyeField, v: string) => void;
}) {
  const nums: { field: EyeField; label: string }[] = [
    { field: 'sphere', label: 'Esfera' },
    { field: 'cylinder', label: 'Cilindro' },
    { field: 'axis', label: 'Eje' },
    { field: 'addition', label: 'Add' },
    { field: 'dnp', label: 'DNP' },
    { field: 'height', label: 'Altura' },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0 16px' }}>
      {nums.map((n) => (
        <Field key={n.field} label={n.label}>
          <input type="number" step="any" value={get(side, n.field)} onChange={(e) => set(side, n.field, e.target.value)} style={inputStyle} />
        </Field>
      ))}
      <Field label="Código producto">
        <input value={get(side, 'productCode')} onChange={(e) => set(side, 'productCode', e.target.value)} style={inputStyle} />
      </Field>
    </div>
  );
}

function SummaryEye({ side, get }: { side: string; get: (s: 'od' | 'oi', f: EyeField) => string }) {
  const s = side === 'OD' ? 'od' : 'oi';
  const parts = ['sphere', 'cylinder', 'axis', 'addition', 'dnp', 'height']
    .map((f) => get(s, f as EyeField))
    .filter((v) => v !== '');
  const code = get(s, 'productCode');
  if (parts.length === 0 && !code) return null;
  return <p>{side}: {parts.join(' / ')}{code ? ` · código ${code}` : ''}</p>;
}

function Field({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return (
    <div style={{ margin: '12px 0' }}>
      <span style={labelStyle}>{label}</span>
      {children}
      {error && <p role="alert" style={{ color: 'var(--color-badge-error-text)', fontSize: '12px', margin: '4px 0 0' }}>{error}</p>}
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: '12px', textTransform: 'uppercase', color: 'var(--color-primary)', marginBottom: '6px' };
const inputStyle: React.CSSProperties = { width: '100%', height: '42px', padding: '0 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: '14px' };
