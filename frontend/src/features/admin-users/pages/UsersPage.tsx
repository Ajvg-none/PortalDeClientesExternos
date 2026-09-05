import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { usersApi, type UsersList } from '../api/users';
import { Pager } from '../../../shared/Pager';
import { Modal } from '../../../shared/Modal';
import { PAGE_SIZE } from '../../../core/constants';
import type { AuthUser } from '../../../core/types';

/**
 * F6.7/REM-2026-09 - Gestion de usuarios (RF-23…27): listado filtrable por
 * nombre/rol/estado, alta, edicion, reset de contrasena y dar de
 * baja/reactivar (desactivacion logica, DEC-4). SIN DELETE fisico.
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

  const activeFiltering = filters.q.trim() !== '' || filters.role !== '' || filters.isActive !== '';

  return (
    <div>
      <div className="page-head">
        <h1>Gestión de usuarios</h1>
        <Link to="/usuarios/nuevo" className="btn btn--primary">
          + Nuevo usuario
        </Link>
      </div>

      {notice && <p role="status" className="notice">{notice}</p>}
      {error && <p role="alert" className="error">{error}</p>}

      <form onSubmit={applyFilters} className="toolbar" aria-label="Filtros de usuarios">
        <div className="form-field form-field--inline">
          <label htmlFor="f-nombre">Nombre / empresa</label>
          <input id="f-nombre" className="control" value={filters.q} onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))} />
        </div>
        <div className="form-field form-field--inline">
          <label htmlFor="f-rol">Rol</label>
          <select id="f-rol" className="control" value={filters.role} onChange={(e) => setFilters((f) => ({ ...f, role: e.target.value }))}>
            <option value="">Todos</option>
            <option>CLIENTE_EXTERNO</option>
            <option>LABORATORIO</option>
            <option>ADMINISTRADOR</option>
          </select>
        </div>
        <div className="form-field form-field--inline">
          <label htmlFor="f-estado">Estado</label>
          <select id="f-estado" className="control" value={filters.isActive} onChange={(e) => setFilters((f) => ({ ...f, isActive: e.target.value }))}>
            <option value="">Todos</option>
            <option value="true">Activo</option>
            <option value="false">Inactivo</option>
          </select>
        </div>
        <button type="submit" className="btn">Aplicar filtros</button>
        <button type="button" className="btn" onClick={clearFilters} disabled={!activeFiltering}>
          Limpiar
        </button>
      </form>

      {!list && !error && <p className="muted">Cargando…</p>}
      {list && (
        <>
          {list.data.length === 0 ? (
            <p className="empty">No hay usuarios que coincidan.</p>
          ) : (
            <div className="table-scroll">
              <table className="table">
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Empresa</th>
                    <th>Rol</th>
                    <th>Estado</th>
                    <th className="is-actions">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {list.data.map((u: AuthUser) => (
                    <tr key={u.id}>
                      <td>{u.username}</td>
                      <td>{u.companyName ?? '—'}</td>
                      <td>{u.role}</td>
                      <td>
                        <span className={u.isActive ? 'pill pill--activo' : 'pill pill--inactivo'}>
                          {u.isActive ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="is-actions">
                        <div className="row-actions">
                          <Link to={`/usuarios/${u.id}/editar`} className="btn btn--link">
                            Editar
                          </Link>
                          <button className="btn btn--sm" onClick={() => setResetUser(u)}>
                            Reset contraseña
                          </button>
                          <button className="btn btn--sm" onClick={() => setActionUser(u)}>
                            {u.isActive ? 'Dar de baja' : 'Reactivar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pager total={list.total} limit={PAGE_SIZE} offset={offset} onPage={(o) => load(o)} />
        </>
      )}

      {actionUser && (
        <Modal onClose={() => setActionUser(null)} titleId="user-action-title">
          <h3 id="user-action-title" style={{ marginTop: 0 }}>
            {actionUser.isActive ? 'Dar de baja' : 'Reactivar'} usuario
          </h3>
          <p>
            {actionUser.isActive
              ? `El usuario "${actionUser.username}" perderá el acceso de inmediato. Sus órdenes históricas se conservan (baja lógica, DEC-4).`
              : `El usuario "${actionUser.username}" volverá a tener acceso.`}
          </p>
          <div className="modal-actions">
            <button className="btn" onClick={() => setActionUser(null)}>
              Cancelar
            </button>
            <button className="btn btn--danger" onClick={toggle}>
              {actionUser.isActive ? 'Dar de baja' : 'Reactivar'}
            </button>
          </div>
        </Modal>
      )}

      {resetUser && (
        <Modal
          onClose={() => { setResetUser(null); setNewPassword(''); }}
          titleId="user-reset-title"
        >
          <h3 id="user-reset-title" style={{ marginTop: 0 }}>
            Reset de contraseña — {resetUser.username}
          </h3>
          <div className="form-field">
            <label htmlFor="reset-pass">Nueva contraseña temporal (mín. 6)</label>
            <input id="reset-pass" className="control" type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" />
          </div>
          <p className="muted" style={{ fontSize: 13 }}>
            El usuario deberá cambiarla en su próximo inicio de sesión (DEC-6).
          </p>
          <div className="modal-actions">
            <button className="btn" onClick={() => { setResetUser(null); setNewPassword(''); }}>
              Cancelar
            </button>
            <button className="btn btn--primary" onClick={doReset} disabled={newPassword.length < 6}>
              Restablecer
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
