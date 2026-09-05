import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { usersApi, type UsersList } from '../api/users';
import { Pager } from '../../../shared/Pager';
import { Modal } from '../../../shared/Modal';
import { PAGE_SIZE } from '../../../core/constants';
import type { AuthUser } from '../../../core/types';

/**
 * F6.7/REM-2026-09 - Gestion de usuarios (RF-23…27): listado filtrable por
 * nombre/rol/estado, alta (link a formulario), edicion, reset de contrasena y
 * dar de baja/reactivar (desactivacion logica, DEC-4). SIN DELETE fisico.
 */
export function UsersPage() {
  const [list, setList] = useState<UsersList | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [filters, setFilters] = useState<{ q: string; role: string; isActive: string }>({
    q: '',
    role: '',
    isActive: '',
  });
  const [offset, setOffset] = useState(0);

  const [actionUser, setActionUser] = useState<AuthUser | null>(null); // modal baja/reactivar
  const [resetUser, setResetUser] = useState<AuthUser | null>(null); // modal reset
  const [newPassword, setNewPassword] = useState('');

  async function load(nextOffset: number) {
    try {
      setError('');
      const params: Record<string, string> = { limit: String(PAGE_SIZE), offset: String(nextOffset) };
      if (filters.q.trim()) params.q = filters.q.trim();
      if (filters.role) params.role = filters.role;
      if (filters.isActive) params.isActive = filters.isActive;
      setList(await usersApi.list(params));
      setOffset(nextOffset);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar usuarios');
    }
  }

  useEffect(() => {
    load(0);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function applyFilters(e: React.FormEvent) {
    e.preventDefault();
    load(0);
  }

  function clearFilters() {
    setFilters({ q: '', role: '', isActive: '' });
    setTimeout(() => load(0), 0);
  }

  async function toggle() {
    if (!actionUser) return;
    try {
      await usersApi.setStatus(actionUser.id, !actionUser.isActive);
      setNotice(`${actionUser.username} ${actionUser.isActive ? 'dado de baja' : 'reactivado'}`);
      setActionUser(null);
      await load(offset);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cambiar estado');
    }
  }

  async function doReset() {
    if (!resetUser) return;
    try {
      await usersApi.resetPassword(resetUser.id, newPassword);
      setNotice(`Contraseña de ${resetUser.username} restablecida (deberá cambiarla al iniciar sesión)`);
      setResetUser(null);
      setNewPassword('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al restablecer la contraseña');
    }
  }

  const activeFiltering =
    filters.q.trim() !== '' || filters.role !== '' || filters.isActive !== '';

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2>Gestión de usuarios</h2>
        <Link
          to="/usuarios/nuevo"
          style={{ height: '42px', display: 'inline-flex', alignItems: 'center', padding: '0 20px', borderRadius: 'var(--radius-sm)', background: 'var(--color-primary)', color: '#fff', fontWeight: 600 }}
        >
          + Nuevo usuario
        </Link>
      </div>

      {notice && <p style={{ color: 'var(--color-primary)' }}>{notice}</p>}
      {error && <p role="alert" style={{ color: 'var(--color-badge-error-text)' }}>{error}</p>}

      <form onSubmit={applyFilters} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '16px' }}>
        <div>
          <label htmlFor="f-nombre" style={filterLabel}>Nombre / empresa</label>
          <input id="f-nombre" value={filters.q} onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))} style={filterInput} />
        </div>
        <div>
          <label htmlFor="f-rol" style={filterLabel}>Rol</label>
          <select id="f-rol" value={filters.role} onChange={(e) => setFilters((f) => ({ ...f, role: e.target.value }))} style={filterInput}>
            <option value="">Todos</option>
            <option>CLIENTE_EXTERNO</option>
            <option>LABORATORIO</option>
            <option>ADMINISTRADOR</option>
          </select>
        </div>
        <div>
          <label htmlFor="f-estado" style={filterLabel}>Estado</label>
          <select id="f-estado" value={filters.isActive} onChange={(e) => setFilters((f) => ({ ...f, isActive: e.target.value }))} style={filterInput}>
            <option value="">Todos</option>
            <option value="true">Activo</option>
            <option value="false">Inactivo</option>
          </select>
        </div>
        <button type="submit" style={filterBtn}>Aplicar filtros</button>
        <button type="button" onClick={clearFilters} disabled={!activeFiltering} style={filterBtn}>Limpiar</button>
      </form>

      {!list && !error && <p>Cargando…</p>}
      {list && (
        <>
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
                  <td style={td}>
                    <span style={u.isActive ? badgeActive : badgeInactive}>
                      {u.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td style={td}>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <Link to={`/usuarios/${u.id}/editar`} style={linkStyle}>Editar</Link>
                      <button onClick={() => setResetUser(u)} style={miniBtn}>Reset contraseña</button>
                      <button onClick={() => setActionUser(u)} style={miniBtn}>
                        {u.isActive ? 'Dar de baja' : 'Reactivar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pager total={list.total} limit={PAGE_SIZE} offset={offset} onPage={(o) => load(o)} />
        </>
      )}

      {actionUser && (
        <Modal onClose={() => setActionUser(null)}>
          <h3 style={{ marginTop: 0 }}>{actionUser.isActive ? 'Dar de baja' : 'Reactivar'} usuario</h3>
          <p>
            {actionUser.isActive
              ? `El usuario "${actionUser.username}" perderá el acceso de inmediato. Sus órdenes históricas se conservan (baja lógica, DEC-4).`
              : `El usuario "${actionUser.username}" volverá a tener acceso.`}
          </p>
          <div style={footerStyle}>
            <button onClick={() => setActionUser(null)} style={ghostBtn}>Cancelar</button>
            <button onClick={toggle} style={dangerBtn}>{actionUser.isActive ? 'Dar de baja' : 'Reactivar'}</button>
          </div>
        </Modal>
      )}

      {resetUser && (
        <Modal onClose={() => { setResetUser(null); setNewPassword(''); }}>
          <h3 style={{ marginTop: 0 }}>Reset de contraseña — {resetUser.username}</h3>
          <label htmlFor="reset-pass" style={filterLabel}>Nueva contraseña temporal (mín. 6)</label>
          <input id="reset-pass" type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" style={filterInput} />
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
            El usuario deberá cambiarla en su próximo inicio de sesión (DEC-6).
          </p>
          <div style={footerStyle}>
            <button onClick={() => { setResetUser(null); setNewPassword(''); }} style={ghostBtn}>Cancelar</button>
            <button onClick={doReset} disabled={newPassword.length < 6} style={primaryBtn}>Restablecer</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

const th: React.CSSProperties = { textAlign: 'left', padding: '12px 16px', borderBottom: '1px solid var(--color-border)' };
const td: React.CSSProperties = { padding: '12px 16px' };
const footerStyle: React.CSSProperties = { display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'flex-end' };
const filterLabel: React.CSSProperties = { display: 'block', fontSize: '12px', textTransform: 'uppercase', color: 'var(--color-primary)', marginBottom: '4px' };
const filterInput: React.CSSProperties = { height: '38px', padding: '0 10px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: '14px' };
const filterBtn: React.CSSProperties = { height: '38px', padding: '0 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', background: 'var(--color-surface)', fontWeight: 600, cursor: 'pointer' };
const miniBtn: React.CSSProperties = { height: '34px', padding: '0 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', background: 'var(--color-surface)', fontWeight: 600, cursor: 'pointer', fontSize: '13px' };
const linkStyle: React.CSSProperties = { color: 'var(--color-primary)', fontWeight: 600, fontSize: '13px', alignSelf: 'center' };
const ghostBtn: React.CSSProperties = { height: '42px', padding: '0 20px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', background: 'var(--color-surface)', fontWeight: 600, cursor: 'pointer' };
const dangerBtn: React.CSSProperties = { height: '42px', padding: '0 20px', borderRadius: 'var(--radius-sm)', border: 'none', background: 'var(--color-badge-error-text)', color: '#fff', fontWeight: 600, cursor: 'pointer' };
const primaryBtn: React.CSSProperties = { ...dangerBtn, background: 'var(--color-primary)' };
const badgeBase: React.CSSProperties = { display: 'inline-block', padding: '3px 10px', borderRadius: '999px', fontSize: '12px', fontWeight: 600 };
const badgeActive: React.CSSProperties = { ...badgeBase, background: 'var(--color-badge-sync-bg)', color: 'var(--color-badge-sync-text)' };
const badgeInactive: React.CSSProperties = { ...badgeBase, background: 'var(--color-badge-pendiente-bg)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' };
