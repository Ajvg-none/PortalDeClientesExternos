import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { http } from '../../../core/http';
import { useAuth } from '../../../app/AuthContext';

/** F6.10/DEC-6 - Cambio de contraseña obligatorio en primer acceso. */
export function ChangePasswordPage() {
  const navigate = useNavigate();
  const { user, setSession } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await http.post<{ user: { mustChangePassword: boolean } }>('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      if (user && res.user) setSession(session_token(), { ...user, mustChangePassword: false });
      navigate('/ordenes');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cambiar la contraseña');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-canvas)' }}>
      <form
        onSubmit={onSubmit}
        style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-card)', padding: '32px', width: '380px' }}
      >
        <h1 style={{ margin: '0 0 8px' }}>Cambio de contraseña</h1>
        <p style={{ color: 'var(--color-text-secondary)', margin: '0 0 24px' }}>
          Por seguridad, debes cambiar tu contraseña temporal antes de continuar.
        </p>

        <label style={labelStyle}>Contraseña actual</label>
        <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password" style={inputStyle} />

        <label style={{ ...labelStyle, marginTop: '16px' }}>Nueva contraseña</label>
        <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" style={inputStyle} />

        {error && <p role="alert" style={{ color: 'var(--color-badge-error-text)', fontSize: '13px', marginTop: '12px' }}>{error}</p>}

        <button type="submit" disabled={loading || !currentPassword || newPassword.length < 6} style={submitStyle}>
          {loading ? 'Guardando…' : 'Guardar y continuar'}
        </button>
      </form>
    </div>
  );
}

// helper para no reintroducir la lectura del token (session.getToken)
function session_token(): string {
  return localStorage.getItem('portal_token') ?? '';
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: '12px', textTransform: 'uppercase', color: 'var(--color-primary)', marginBottom: '6px' };
const inputStyle: React.CSSProperties = { width: '100%', height: '42px', padding: '0 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: '14px' };
const submitStyle: React.CSSProperties = { marginTop: '24px', width: '100%', height: '42px', borderRadius: 'var(--radius-sm)', border: 'none', background: 'var(--color-primary)', color: '#fff', fontWeight: 600, cursor: 'pointer' };
