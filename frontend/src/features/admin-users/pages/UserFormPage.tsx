import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { usersApi, type UserInput } from '../api/users';
import type { AuthUser } from '../../../core/types';

const ROLES = ['CLIENTE_EXTERNO', 'LABORATORIO', 'ADMINISTRADOR'] as const;

/**
 * F6.7/REM-2026-09 - Alta (POST /api/users) y edicion (PATCH /api/users/:id)
 * de usuarios por el administrador (RF-23…25). username obligatorio (DEC-2);
 * companyName obligatorio si el rol es CLIENTE_EXTERNO; en alta se pide la
 * contrasena temporal (el flag de primer acceso lo activa el backend, DEC-6).
 */
export function UserFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState<UserInput>({
    username: '',
    password: '',
    role: 'CLIENTE_EXTERNO',
    companyName: '',
    email: '',
    phone: '',
    address: '',
  });
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    let active = true;
    usersApi
      .get(id)
      .then((u: AuthUser) => {
        if (!active) return;
        setForm({
          username: u.username,
          role: u.role,
          companyName: u.companyName ?? '',
          email: u.email ?? '',
          phone: u.phone ?? '',
          address: u.address ?? '',
        });
      })
      .catch((e) => active && setError(e instanceof Error ? e.message : 'Error al cargar el usuario'))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id]);

  function set<K extends keyof UserInput>(k: K, v: UserInput[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload: UserInput = {
        username: form.username.trim(),
        role: form.role,
        companyName: form.companyName?.trim() || null,
        email: form.email?.trim() || null,
        phone: form.phone?.trim() || null,
        address: form.address?.trim() || null,
      };
      if (!isEdit) payload.password = form.password;
      if (isEdit) {
        await usersApi.update(id!, payload);
      } else {
        await usersApi.create(payload);
      }
      navigate('/usuarios');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar el usuario');
      setSaving(false);
    }
  }

  const isClient = form.role === 'CLIENTE_EXTERNO';
  const invalid = !form.username.trim() || (isClient && !form.companyName?.trim()) || (!isEdit && (form.password?.length ?? 0) < 6);

  if (loading) return <p>Cargando…</p>;

  return (
    <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-card)', padding: '24px', maxWidth: '640px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>{isEdit ? 'Editar usuario' : 'Nuevo usuario'}</h2>
        <Link to="/usuarios" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>← Volver</Link>
      </div>

      {error && <p role="alert" style={{ color: 'var(--color-badge-error-text)' }}>{error}</p>}

      <form onSubmit={submit}>
        <label htmlFor="user-username" style={labelStyle}>Username *</label>
        <input id="user-username" value={form.username} onChange={(e) => set('username', e.target.value)} style={inputStyle} />

        <label htmlFor="user-role" style={labelStyle}>Rol *</label>
        <select id="user-role" value={form.role} onChange={(e) => set('role', e.target.value as UserInput['role'])} style={inputStyle}>
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>

        {isClient && (
          <>
            <label htmlFor="user-company" style={labelStyle}>Empresa / cliente *</label>
            <input id="user-company" value={form.companyName ?? ''} onChange={(e) => set('companyName', e.target.value)} style={inputStyle} />
          </>
        )}

        {!isEdit && (
          <>
            <label htmlFor="user-password" style={labelStyle}>Contraseña temporal * (mín. 6)</label>
            <input id="user-password" type="text" value={form.password ?? ''} onChange={(e) => set('password', e.target.value)} autoComplete="new-password" style={inputStyle} />
          </>
        )}

        <label htmlFor="user-email" style={labelStyle}>Email (contacto interno)</label>
        <input id="user-email" type="email" value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} style={inputStyle} />

        <label htmlFor="user-phone" style={labelStyle}>Teléfono</label>
        <input id="user-phone" value={form.phone ?? ''} onChange={(e) => set('phone', e.target.value)} style={inputStyle} />

        <label htmlFor="user-address" style={labelStyle}>Dirección</label>
        <textarea id="user-address" rows={2} value={form.address ?? ''} onChange={(e) => set('address', e.target.value)} style={{ ...inputStyle, height: 'auto' }} />

        <button type="submit" disabled={saving || invalid} style={{ marginTop: '24px', height: '42px', padding: '0 24px', borderRadius: 'var(--radius-sm)', border: 'none', background: 'var(--color-primary)', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
          {saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear usuario'}
        </button>
      </form>
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: '12px', textTransform: 'uppercase', color: 'var(--color-primary)', margin: '16px 0 6px' };
const inputStyle: React.CSSProperties = { width: '100%', height: '42px', padding: '0 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: '14px' };
