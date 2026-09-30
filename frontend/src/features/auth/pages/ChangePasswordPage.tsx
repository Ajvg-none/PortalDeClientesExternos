import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Lock, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { http, session } from '../../../core/http';
import { PASSWORD_POLICY_MESSAGE, isValidPassword } from '../../../core/password-policy';
import { useAuth } from '../../../app/AuthContext';
import logoCroven from '../../../assets/logo-croven.png';

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
        <img src={logoCroven} alt="Logo de Croven" className="auth-logo" />
        <h1>Cambio de contraseña</h1>
        <p className="auth-card__sub">Por seguridad, debes cambiar tu contraseña temporal antes de continuar.</p>

        <div className="form-field">
          <label htmlFor="current-password">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Lock size={14} aria-hidden="true" /> Contraseña actual
            </span>
          </label>
          <input
            id="current-password"
            className="control"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
            placeholder="••••••••"
          />
        </div>

        <div className="form-field">
          <label htmlFor="new-password">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <KeyRound size={14} aria-hidden="true" /> Nueva contraseña
            </span>
          </label>
          <input
            id="new-password"
            className="control"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            placeholder={PASSWORD_POLICY_MESSAGE}
          />
        </div>

        {error && (
          <p role="alert" className="error" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <AlertCircle size={16} aria-hidden="true" />
            <span>{error}</span>
          </p>
        )}

        <button type="submit" className="btn btn--primary" disabled={loading || !currentPassword || !isValidPassword(newPassword)} style={{ width: '100%', marginTop: 24 }}>
          {loading ? (
            <>
              <Loader2 size={16} className="btn__spinner" aria-hidden="true" />
              <span>Guardando…</span>
            </>
          ) : (
            <>
              <ShieldCheck size={16} aria-hidden="true" />
              <span>Guardar y continuar</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
