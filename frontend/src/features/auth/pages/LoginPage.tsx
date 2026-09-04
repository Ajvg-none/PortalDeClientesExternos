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
      setSession(res.token, res.user);
      navigate(res.user.mustChangePassword ? '/cambiar-contrasena' : '/ordenes');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de inicio de sesion');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-canvas)',
      }}
    >
      <form
        onSubmit={onSubmit}
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-card)',
          padding: '32px',
          width: '360px',
        }}
      >
        <h1 style={{ margin: '0 0 4px' }}>CROVEN</h1>
        <p style={{ color: 'var(--color-text-secondary)', margin: '0 0 24px' }}>
          Portal de Clientes Externos
        </p>

        <label htmlFor="login-username" style={{ display: 'block', fontSize: '12px', textTransform: 'uppercase', color: 'var(--color-primary)', marginBottom: '6px' }}>
          Usuario
        </label>
        <input
          id="login-username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          style={inputStyle}
        />

        <label htmlFor="login-password" style={{ display: 'block', fontSize: '12px', textTransform: 'uppercase', color: 'var(--color-primary)', margin: '16px 0 6px' }}>
          Contraseña
        </label>
        <input
          id="login-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          style={inputStyle}
        />

        {error && (
          <p role="alert" style={{ color: 'var(--color-badge-error-text)', fontSize: '13px', marginTop: '12px' }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !username || !password}
          style={{
            marginTop: '24px',
            width: '100%',
            height: '42px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            background: 'var(--color-primary)',
            color: '#fff',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {loading ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: '42px',
  padding: '0 12px',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-sm)',
  fontSize: '14px',
};
