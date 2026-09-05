import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { http, session } from '../../../core/http';
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
      if (user && res.user) {
        const updated = { ...user, mustChangePassword: false };
        session.setUser(updated);
        setSession(session.getToken() ?? '', updated);
      }
      navigate('/ordenes');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cambiar la contraseña');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <form onSubmit={onSubmit} className="auth-card" noValidate>
        <h1>Cambio de contraseña</h1>
        <p className="auth-card__sub">Por seguridad, debes cambiar tu contraseña temporal antes de continuar.</p>

        <div className="form-field">
          <label htmlFor="current-password">Contraseña actual</label>
          <input
            id="current-password"
            className="control"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>

        <div className="form-field">
          <label htmlFor="new-password">Nueva contraseña</label>
          <input
            id="new-password"
            className="control"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
          />
        </div>

        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}

        <button type="submit" className="btn btn--primary" disabled={loading || !currentPassword || newPassword.length < 6} style={{ width: '100%', marginTop: 24 }}>
          {loading ? 'Guardando…' : 'Guardar y continuar'}
        </button>
      </form>
    </div>
  );
}
