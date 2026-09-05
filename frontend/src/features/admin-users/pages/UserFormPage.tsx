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
  const invalid =
    !form.username.trim() ||
    (isClient && !form.companyName?.trim()) ||
    (!isEdit && (form.password?.length ?? 0) < 6);

  if (loading) return <p className="muted">Cargando…</p>;

  return (
    <div className="card card--form">
      <div className="page-head">
        <h1>{isEdit ? 'Editar usuario' : 'Nuevo usuario'}</h1>
        <Link to="/usuarios" className="btn">← Volver</Link>
      </div>

      {error && <p role="alert" className="error">{error}</p>}

      <form onSubmit={submit} noValidate>
        <div className="grid-2">
          <div className="form-field">
            <label htmlFor="user-username">Username *</label>
            <input id="user-username" className="control" value={form.username} onChange={(e) => set('username', e.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="user-role">Rol *</label>
            <select id="user-role" className="control" value={form.role} onChange={(e) => set('role', e.target.value as UserInput['role'])}>
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {isClient && (
            <div className="form-field">
              <label htmlFor="user-company">Empresa / cliente *</label>
              <input id="user-company" className="control" value={form.companyName ?? ''} onChange={(e) => set('companyName', e.target.value)} />
            </div>
          )}

          {!isEdit && (
            <div className="form-field">
              <label htmlFor="user-password">Contraseña temporal * (mín. 6)</label>
              <input id="user-password" className="control" type="text" value={form.password ?? ''} onChange={(e) => set('password', e.target.value)} autoComplete="new-password" />
            </div>
          )}

          <div className="form-field">
            <label htmlFor="user-email">Email (contacto interno)</label>
            <input id="user-email" className="control" type="email" value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="user-phone">Teléfono</label>
            <input id="user-phone" className="control" value={form.phone ?? ''} onChange={(e) => set('phone', e.target.value)} />
          </div>
          <div className="form-field" style={{ gridColumn: '1 / -1' }}>
            <label htmlFor="user-address">Dirección</label>
            <textarea id="user-address" className="control" rows={2} value={form.address ?? ''} onChange={(e) => set('address', e.target.value)} />
          </div>
        </div>

        <button type="submit" className="btn btn--primary" disabled={saving || invalid} style={{ marginTop: 24 }}>
          {saving ? 'Guardando…' : isEdit ? 'Guardar cambios' : 'Crear usuario'}
        </button>
      </form>
    </div>
  );
}
