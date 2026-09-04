import { useEffect, useState } from 'react';
import { usersApi, type UsersList } from '../api/users';
import { StatusBadge } from '../../../shared/StatusBadge';
import type { AuthUser } from '../../../core/types';

/** F6.7 - Gestion de usuarios: listado + dar de baja/reactivar (sin DELETE). */
export function UsersPage() {
  const [list, setList] = useState<UsersList | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function load() {
    try {
      setList(await usersApi.list());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar usuarios');
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function toggle(user: AuthUser) {
    try {
      setError('');
      await usersApi.setStatus(user.id, !user.isActive);
      setNotice(`${user.username} ${user.isActive ? 'dado de baja' : 'reactivado'}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cambiar estado');
    }
  }

  return (
    <div>
      <h2>Gestión de usuarios</h2>
      {notice && <p style={{ color: 'var(--color-primary)' }}>{notice}</p>}
      {error && <p role="alert" style={{ color: 'var(--color-badge-error-text)' }}>{error}</p>}
      {!list && !error && <p>Cargando…</p>}
      {list && (
        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--color-surface)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-card)' }}>
          <thead>
            <tr style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--color-text-secondary)' }}>
              <th style={th}>Usuario</th>
              <th style={th}>Empresa</th>
              <th style={th}>Rol</th>
              <th style={th}>Estado</th>
              <th style={th}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {list.data.map((u: AuthUser) => (
              <tr key={u.id} style={{ borderTop: '1px solid var(--color-border)' }}>
                <td style={td}>{u.username}</td>
                <td style={td}>{u.companyName ?? '—'}</td>
                <td style={td}>{u.role}</td>
                <td style={td}>{u.isActive ? <StatusBadge status="SINCRONIZADA">Activo</StatusBadge> : <StatusBadge status="ERROR">Inactivo</StatusBadge>}</td>
                <td style={td}>
                  <button
                    onClick={() => toggle(u)}
                    style={{ height: '34px', padding: '0 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', background: 'var(--color-surface)', fontWeight: 600, cursor: 'pointer', color: u.isActive ? 'var(--color-badge-error-text)' : 'var(--color-badge-sync-text)' }}
                  >
                    {u.isActive ? 'Dar de baja' : 'Reactivar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const th: React.CSSProperties = { textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid var(--color-border)' };
const td: React.CSSProperties = { padding: '12px 16px' };
