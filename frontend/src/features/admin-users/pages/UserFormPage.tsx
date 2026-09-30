import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  UserPlus,
  UserCheck,
  ArrowLeft,
  Save,
  Building2,
  Lock,
  User,
  Mail,
  Phone,
  MapPin,
  Shield,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { usersApi, type UserInput } from '../api/users';
import { Select } from '../../../shared/Select';
import { PASSWORD_POLICY_MESSAGE, isValidPassword } from '../../../core/password-policy';
import type { AuthUser } from '../../../core/types';

const ROLES = ['CLIENTE_EXTERNO', 'LABORATORIO', 'ADMINISTRADOR'] as const;

const ROLE_OPTIONS = ROLES.map((r) => ({ value: r, label: r }));

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
    (!isEdit && !isValidPassword(form.password ?? ''));

  if (loading) return <p className="muted">Cargando…</p>;

  return (
    <div className="card card--form">
      <div className="page-head" style={{ marginBottom: 20 }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {isEdit ? (
            <UserCheck size={24} color="var(--color-primary)" aria-hidden="true" />
          ) : (
            <UserPlus size={24} color="var(--color-primary)" aria-hidden="true" />
          )}
          <span>{isEdit ? 'Editar usuario' : 'Nuevo usuario'}</span>
        </h1>
        <Link to="/usuarios" className="btn btn--sm">
          <ArrowLeft size={14} aria-hidden="true" />
          <span>Volver</span>
        </Link>
      </div>

      {error && (
        <p role="alert" className="error" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <AlertCircle size={16} aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}

      <form onSubmit={submit} noValidate>
        <div className="grid-2">
          <div className="form-field">
            <label htmlFor="user-username">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <User size={13} aria-hidden="true" /> Username *
              </span>
            </label>
            <input id="user-username" className="control" placeholder="Ej: optica_norte" value={form.username} onChange={(e) => set('username', e.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="user-role">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Shield size={13} aria-hidden="true" /> Rol *
              </span>
            </label>
            <Select
              id="user-role"
              value={form.role}
              onChange={(v) => set('role', v as UserInput['role'])}
              options={ROLE_OPTIONS}
            />
          </div>

          {isClient && (
            <div className="form-field">
              <label htmlFor="user-company">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Building2 size={13} aria-hidden="true" /> Empresa / cliente *
                </span>
              </label>
              <input id="user-company" className="control" placeholder="Nombre comercial de la óptica" value={form.companyName ?? ''} onChange={(e) => set('companyName', e.target.value)} />
            </div>
          )}

          {!isEdit && (
            <div className="form-field">
              <label htmlFor="user-password">
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Lock size={13} aria-hidden="true" /> Contraseña temporal *
                </span>
              </label>
              <input id="user-password" className="control" type="password" placeholder={PASSWORD_POLICY_MESSAGE} value={form.password ?? ''} onChange={(e) => set('password', e.target.value)} autoComplete="new-password" />
            </div>
          )}

          <div className="form-field">
            <label htmlFor="user-email">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Mail size={13} aria-hidden="true" /> Email (contacto interno)
              </span>
            </label>
            <input id="user-email" className="control" type="email" placeholder="contacto@optica.cl" value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} />
          </div>
          <div className="form-field">
            <label htmlFor="user-phone">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Phone size={13} aria-hidden="true" /> Teléfono
              </span>
            </label>
            <input id="user-phone" className="control" placeholder="+56 9 1234 5678" value={form.phone ?? ''} onChange={(e) => set('phone', e.target.value)} />
          </div>
          <div className="form-field" style={{ gridColumn: '1 / -1' }}>
            <label htmlFor="user-address">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <MapPin size={13} aria-hidden="true" /> Dirección
              </span>
            </label>
            <textarea id="user-address" className="control" rows={2} placeholder="Dirección de la sucursal..." value={form.address ?? ''} onChange={(e) => set('address', e.target.value)} />
          </div>
        </div>

        <button type="submit" className="btn btn--primary" disabled={saving || invalid} style={{ marginTop: 24 }}>
          {saving ? (
            <>
              <Loader2 size={16} className="btn__spinner" aria-hidden="true" />
              <span>Guardando…</span>
            </>
          ) : isEdit ? (
            <>
              <Save size={16} aria-hidden="true" />
              <span>Guardar cambios</span>
            </>
          ) : (
            <>
              <UserPlus size={16} aria-hidden="true" />
              <span>Crear usuario</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
