import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, User, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { http, session } from '../../../core/http';
import { useAuth } from '../../../app/AuthContext';
import type { LoginResponse } from '../../../core/types';
import logoCroven from '../../../assets/logo-croven.png';

/** F6.2 - Pantalla de login por username + contraseña (DEC-2). */
export function LoginPage() {
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await http.post<LoginResponse>('/auth/login', { username, password });
      session.setToken(res.token);
      session.setUser(res.user);
      setSession(res.token, res.user);
      navigate(res.user.mustChangePassword ? '/cambiar-contrasena' : '/ordenes');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de inicio de sesión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <form onSubmit={onSubmit} className="auth-card" noValidate>
        <img src={logoCroven} alt="Logo de Croven" className="auth-logo" />
        <h1 className="sr-only">Croven</h1>

        <div className="form-field">
          <label htmlFor="login-username">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <User size={14} aria-hidden="true" /> Usuario
            </span>
          </label>
          <input
            id="login-username"
            className="control"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            placeholder="Ingresa tu usuario"
          />
        </div>

        <div className="form-field">
          <label htmlFor="login-password">
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Lock size={14} aria-hidden="true" /> Contraseña
            </span>
          </label>
          <input
            id="login-password"
            className="control"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <p role="alert" className="error" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <AlertCircle size={16} aria-hidden="true" />
            <span>{error}</span>
          </p>
        )}

        <button type="submit" className="btn btn--primary" disabled={loading || !username || !password} style={{ width: '100%', marginTop: 24 }}>
          {loading ? (
            <>
              <Loader2 size={16} className="btn__spinner" aria-hidden="true" />
              <span>Ingresando…</span>
            </>
          ) : (
            <>
              <LogIn size={16} aria-hidden="true" />
              <span>Ingresar</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
