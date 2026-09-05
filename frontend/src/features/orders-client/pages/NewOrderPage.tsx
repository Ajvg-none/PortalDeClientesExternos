import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ordersApi, type OrderCreateInput } from '../api/orders';
import { useAuth } from '../../../app/AuthContext';
import { Modal } from '../../../shared/Modal';
import type { OrderDetail } from '../../../core/types';

/**
 * F6.4 + REM-2026-09 - Formulario de nueva orden con TODOS los campos de
 * RF-08. Empresa autopoblada en solo lectura (DEC-3); unicos obligatorios
 * N de Orden + Paciente (RF-09); validacion asincrona de unicidad (RF-10);
 * resumen modal antes de enviar (RF-12); sin adjuntos (RF-11).
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
    <div className="card card--form">
      <h1 style={{ fontSize: 24 }}>Nueva orden</h1>

      <section className="section">
        <h2>Datos generales</h2>
        <div className="grid-2">
          <div className="form-field">
            <label htmlFor="order-company">Empresa (autopoblada)</label>
            <input id="order-company" className="control" value={user?.companyName ?? ''} disabled />
          </div>
          <div className="form-field">
            <label htmlFor="order-number">Número de orden *</label>
            <input
              id="order-number"
              className={`control${numberError ? ' control-error' : ''}`}
              value={String(form.orderNumber ?? '')}
              onChange={(e) => set('orderNumber', e.target.value)}
              onBlur={checkNumber}
            />
            {numberError && (
              <p role="alert" className="field-error">{numberError}</p>
            )}
            {checkingNumber && <p className="muted" style={{ fontSize: 12, margin: '4px 0 0' }}>Verificando disponibilidad…</p>}
          </div>
          <div className="form-field">
            <label htmlFor="order-patient">Paciente *</label>
            <input id="order-patient" aria-required="true" className="control" value={String(form.patient ?? '')} onChange={(e) => set('patient', e.target.value)} />
          </div>
        </div>
      </section>

      <section className="section">
        <h2>Fórmula óptica — Ojo derecho (OD)</h2>
        <EyeSection side="od" get={eyeValue} set={setEye} />
      </section>
      <section className="section">
        <h2>Fórmula óptica — Ojo izquierdo (OI)</h2>
        <EyeSection side="oi" get={eyeValue} set={setEye} />
      </section>

      <section className="section">
        <h2>Tratamiento</h2>
        <select className="control" style={{ maxWidth: 420 }} value={typeof form.treatment === 'string' ? form.treatment : ''} onChange={(e) => set('treatment', e.target.value)}>
          <option value="">Sin tratamiento</option>
          {TREATMENTS.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </section>

      <section className="section">
        <h2>Montura</h2>
        <div className="grid-2">
          <div className="form-field">
            <label htmlFor="order-mount-type">Tipo de montura</label>
            <select id="order-mount-type" className="control" value={typeof form.mountType === 'string' ? form.mountType : ''} onChange={(e) => set('mountType', e.target.value)}>
              <option value="">Sin tipo</option>
              {MOUNT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor="order-mount-brand">Marca</label>
            <input id="order-mount-brand" className="control" value={typeof form.mountBrand === 'string' ? form.mountBrand : ''} onChange={(e) => set('mountBrand', e.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="order-mount-model">Modelo</label>
            <input id="order-mount-model" className="control" value={typeof form.mountModel === 'string' ? form.mountModel : ''} onChange={(e) => set('mountModel', e.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="order-mount-color">Color</label>
            <input id="order-mount-color" className="control" value={typeof form.mountColor === 'string' ? form.mountColor : ''} onChange={(e) => set('mountColor', e.target.value)} />
          </div>
        </div>
      </section>

      <section className="section">
        <h2>Coloración</h2>
        <div className="grid-3">
          <div className="form-field">
            <label htmlFor="order-color">Color</label>
            <input id="order-color" className="control" value={typeof form.colorationColor === 'string' ? form.colorationColor : ''} onChange={(e) => set('colorationColor', e.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="order-unicolor">Unicolor</label>
            <span className="check" style={{ height: 42 }}>
              <input id="order-unicolor" type="checkbox" checked={form.colorationUnicolor === true} onChange={(e) => set('colorationUnicolor', e.target.checked)} />
            </span>
          </div>
          <div className="form-field">
            <label htmlFor="order-degradado">Degradado %</label>
            <input id="order-degradado" className="control" type="number" step="any" value={typeof form.colorationDegradadoPercent === 'string' ? form.colorationDegradadoPercent : ''} onChange={(e) => set('colorationDegradadoPercent', e.target.value)} />
          </div>
        </div>
      </section>

      <section className="section">
        <h2>Observaciones</h2>
        <textarea className="control" rows={3} value={typeof form.observations === 'string' ? form.observations : ''} onChange={(e) => set('observations', e.target.value)} />
      </section>

      {error && <p role="alert" className="error">{error}</p>}

      <button className="btn btn--primary" disabled={!canReview} onClick={() => setConfirming(true)} style={{ marginTop: 8 }}>
        Revisar orden
      </button>

      {confirming && (
        <Modal onClose={() => setConfirming(false)} titleId="order-summary-title">
          <h3 id="order-summary-title" style={{ marginTop: 0 }}>Resumen de la orden</h3>
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
          <div className="modal-actions">
            <button className="btn" onClick={() => setConfirming(false)}>
              Atrás
            </button>
            <button className="btn btn--primary" onClick={submit} disabled={saving}>
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
    <div className="grid-3">
      {nums.map((n) => {
        const fieldId = `${side}-${n.field}`;
        return (
          <div className="form-field" key={n.field}>
            <label htmlFor={fieldId} className="form-field-label">{n.label}</label>
            <input id={fieldId} className="control" type="number" step="any" value={get(side, n.field)} onChange={(e) => set(side, n.field, e.target.value)} />
          </div>
        );
      })}
      <div className="form-field">
        <label htmlFor={`${side}-productCode`} className="form-field-label">Código producto</label>
        <input id={`${side}-productCode`} className="control" value={get(side, 'productCode')} onChange={(e) => set(side, 'productCode', e.target.value)} />
      </div>
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
