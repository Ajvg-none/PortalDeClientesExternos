import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  User,
  Eye,
  Sparkles,
  Layers,
  Palette,
  FileText,
  FileCheck,
  Send,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { ordersApi, type OrderCreateInput } from '../api/orders';
import { useAuth } from '../../../app/AuthContext';
import { Modal } from '../../../shared/Modal';
import { Select } from '../../../shared/Select';
import type { OrderDetail } from '../../../core/types';

/**
 * F6.4 + REM-2026-09 - Formulario de nueva orden con TODOS los campos de
 * RF-08. Empresa autopoblada en solo lectura (DEC-3); unicos obligatorios
 * N de Orden + Paciente (RF-09); validacion asincrona de unicidad (RF-10);
 * resumen modal antes de enviar (RF-12); sin adjuntos (RF-11).
 */

const TREATMENTS = ['ECO (AR Verde)', 'OCEAN (AR Azul)', 'SOLERX SILVER', 'SOLERX BLUE'];
const MOUNT_TYPES = ['METAL ARO COMPLETO', 'METAL SEMI-AEREA', 'PASTA ARO COMPLETO', 'PASTA SEMI-AEREA', 'AL AIRE'];

const TREATMENT_OPTIONS = [{ value: '', label: 'Sin tratamiento' }, ...TREATMENTS.map((t) => ({ value: t, label: t }))];
const MOUNT_OPTIONS = [{ value: '', label: 'Sin tipo' }, ...MOUNT_TYPES.map((t) => ({ value: t, label: t }))];

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
      <div className="page-head" style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
          <ClipboardList size={24} color="var(--color-primary)" aria-hidden="true" />
          <span>Nueva orden</span>
        </h1>
      </div>

      <section className="section" style={{ marginTop: 0 }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <User size={16} color="var(--color-primary)" aria-hidden="true" />
          <span>Datos generales</span>
        </h2>
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
              placeholder="Ej: ORD-00123"
            />
            {numberError && (
              <p role="alert" className="field-error" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <AlertCircle size={13} aria-hidden="true" />
                <span>{numberError}</span>
              </p>
            )}
            {checkingNumber && (
              <p className="muted" style={{ fontSize: 12, margin: '4px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Loader2 size={12} className="btn__spinner" aria-hidden="true" />
                <span>Verificando disponibilidad…</span>
              </p>
            )}
          </div>
          <div className="form-field" style={{ gridColumn: 'span 2' }}>
            <label htmlFor="order-patient">Paciente *</label>
            <input id="order-patient" aria-required="true" className="control" placeholder="Nombre completo del paciente" value={String(form.patient ?? '')} onChange={(e) => set('patient', e.target.value)} />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="eye-card">
          <div className="eye-card__header">
            <span className="eye-badge eye-badge--od">
              <Eye size={14} aria-hidden="true" />
              <span>Ojo Derecho (OD)</span>
            </span>
            <span className="muted--sm">Fórmula óptica</span>
          </div>
          <EyeSection side="od" get={eyeValue} set={setEye} />
        </div>

        <div className="eye-card">
          <div className="eye-card__header">
            <span className="eye-badge eye-badge--oi">
              <Eye size={14} aria-hidden="true" />
              <span>Ojo Izquierdo (OI)</span>
            </span>
            <span className="muted--sm">Fórmula óptica</span>
          </div>
          <EyeSection side="oi" get={eyeValue} set={setEye} />
        </div>
      </section>

      <section className="section">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sparkles size={16} color="var(--color-primary)" aria-hidden="true" />
          <span>Tratamiento</span>
        </h2>
        <div style={{ maxWidth: 420 }}>
          <Select
            ariaLabel="Tratamiento"
            value={typeof form.treatment === 'string' ? form.treatment : ''}
            onChange={(v) => set('treatment', v)}
            options={TREATMENT_OPTIONS}
          />
        </div>
      </section>

      <section className="section">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Layers size={16} color="var(--color-primary)" aria-hidden="true" />
          <span>Montura</span>
        </h2>
        <div className="grid-2">
          <div className="form-field">
            <label htmlFor="order-mount-type">Tipo de montura</label>
            <Select
              id="order-mount-type"
              value={typeof form.mountType === 'string' ? form.mountType : ''}
              onChange={(v) => set('mountType', v)}
              options={MOUNT_OPTIONS}
            />
          </div>
          <div className="form-field">
            <label htmlFor="order-mount-brand">Marca</label>
            <input id="order-mount-brand" className="control" placeholder="Ej: Ray-Ban, Oakley..." value={typeof form.mountBrand === 'string' ? form.mountBrand : ''} onChange={(e) => set('mountBrand', e.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="order-mount-model">Modelo</label>
            <input id="order-mount-model" className="control" placeholder="Ej: RB-3025" value={typeof form.mountModel === 'string' ? form.mountModel : ''} onChange={(e) => set('mountModel', e.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="order-mount-color">Color</label>
            <input id="order-mount-color" className="control" placeholder="Ej: Dorado, Negro..." value={typeof form.mountColor === 'string' ? form.mountColor : ''} onChange={(e) => set('mountColor', e.target.value)} />
          </div>
        </div>
      </section>

      <section className="section">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Palette size={16} color="var(--color-primary)" aria-hidden="true" />
          <span>Coloración</span>
        </h2>
        <div className="grid-3">
          <div className="form-field">
            <label htmlFor="order-color">Color</label>
            <input id="order-color" className="control" placeholder="Ej: Gris, Marrón..." value={typeof form.colorationColor === 'string' ? form.colorationColor : ''} onChange={(e) => set('colorationColor', e.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="order-unicolor">Unicolor</label>
            <span className="check" style={{ height: 42 }}>
              <input id="order-unicolor" type="checkbox" checked={form.colorationUnicolor === true} onChange={(e) => set('colorationUnicolor', e.target.checked)} />
              <span style={{ fontSize: 14 }}>Tinte parejo</span>
            </span>
          </div>
          <div className="form-field">
            <label htmlFor="order-degradado">Degradado %</label>
            <input id="order-degradado" className="control tabular-nums" type="number" step="any" placeholder="0 - 100" value={typeof form.colorationDegradadoPercent === 'string' ? form.colorationDegradadoPercent : ''} onChange={(e) => set('colorationDegradadoPercent', e.target.value)} />
          </div>
        </div>
      </section>

      <section className="section">
        <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <FileText size={16} color="var(--color-primary)" aria-hidden="true" />
          <span>Observaciones</span>
        </h2>
        <textarea className="control" rows={3} placeholder="Instrucciones especiales para el laboratorio de producción..." value={typeof form.observations === 'string' ? form.observations : ''} onChange={(e) => set('observations', e.target.value)} />
      </section>

      {error && (
        <p role="alert" className="error" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <AlertCircle size={16} aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}

      <button className="btn btn--primary" disabled={!canReview} onClick={() => setConfirming(true)} style={{ marginTop: 8 }}>
        <FileCheck size={16} aria-hidden="true" />
        <span>Revisar orden</span>
      </button>

      {confirming && (
        <Modal onClose={() => setConfirming(false)} titleId="order-summary-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <CheckCircle2 size={22} color="var(--color-primary)" aria-hidden="true" />
            <h3 id="order-summary-title" style={{ margin: 0 }}>Resumen de la orden</h3>
          </div>
          <div style={{ background: 'var(--color-canvas)', padding: 16, borderRadius: 'var(--radius-md)', marginBottom: 16 }}>
            <p>N° de orden: <strong>{String(form.orderNumber ?? '')}</strong></p>
            <p>Empresa: <strong>{user?.companyName}</strong></p>
            <p>Paciente: <strong>{String(form.patient ?? '')}</strong></p>
            <SummaryEye side="OD" get={eyeValue} />
            <SummaryEye side="OI" get={eyeValue} />
            {form.treatment ? <p>Tratamiento: <strong>{String(form.treatment)}</strong></p> : null}
            {form.mountType || form.mountBrand ? (
              <p>Montura: <strong>{[form.mountType, form.mountBrand, form.mountModel, form.mountColor].filter(Boolean).join(' · ')}</strong></p>
            ) : null}
            {form.colorationColor ? <p>Coloración: <strong>{[form.colorationColor, form.colorationUnicolor ? 'unicolor' : null, form.colorationDegradadoPercent ? `${String(form.colorationDegradadoPercent)}% degradado` : null].filter(Boolean).join(' · ')}</strong></p> : null}
            {form.observations ? <p>Observaciones: <em>{String(form.observations)}</em></p> : null}
          </div>
          <div className="modal-actions">
            <button className="btn" onClick={() => setConfirming(false)}>
              <ArrowLeft size={15} aria-hidden="true" />
              <span>Atrás</span>
            </button>
            <button className="btn btn--primary" onClick={submit} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 size={15} className="btn__spinner" aria-hidden="true" />
                  <span>Enviando…</span>
                </>
              ) : (
                <>
                  <Send size={15} aria-hidden="true" />
                  <span>Confirmar envío</span>
                </>
              )}
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
            <input id={fieldId} className="control tabular-nums" type="number" step="any" value={get(side, n.field)} onChange={(e) => set(side, n.field, e.target.value)} />
          </div>
        );
      })}
      <div className="form-field">
        <label htmlFor={`${side}-productCode`} className="form-field-label">Código producto</label>
        <input id={`${side}-productCode`} className="control" placeholder="Texto libre" value={get(side, 'productCode')} onChange={(e) => set(side, 'productCode', e.target.value)} />
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
  return <p>{side}: <strong>{parts.join(' / ')}</strong>{code ? ` · código ${code}` : ''}</p>;
}
