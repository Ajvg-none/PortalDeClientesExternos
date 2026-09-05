import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { http, session } from '../../../core/http';
import { useAuth } from '../../../app/AuthContext';
import type { LoginResponse } from '../../../core/types';

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
        <h1>CROVEN</h1>
        <p className="auth-card__sub">Portal de Clientes Externos</p>

        <div className="form-field">
          <label htmlFor="login-username">Usuario</label>
          <input
            id="login-username"
            className="control"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
          />
        </div>

        <div className="form-field">
          <label htmlFor="login-password">Contraseña</label>
          <input
            id="login-password"
            className="control"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>

        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}

        <button type="submit" className="btn btn--primary" disabled={loading || !username || !password} style={{ width: '100%', marginTop: 24 }}>
          {loading ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
    </div>
  );
}
