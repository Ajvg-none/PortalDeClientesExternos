import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  UserPlus,
  Edit3,
  KeyRound,
  UserX,
  UserCheck,
  Filter,
  RotateCcw,
  Search,
  AlertTriangle,
  CheckCircle2,
  Inbox,
} from 'lucide-react';
import { usersApi, type UsersList } from '../api/users';
import { Pager } from '../../../shared/Pager';
import { Modal } from '../../../shared/Modal';
import { Select } from '../../../shared/Select';
import { PAGE_SIZE } from '../../../core/constants';
import { PASSWORD_POLICY_MESSAGE, isValidPassword } from '../../../core/password-policy';
import type { AuthUser } from '../../../core/types';

const ROLE_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'CLIENTE_EXTERNO', label: 'CLIENTE_EXTERNO' },
  { value: 'LABORATORIO', label: 'LABORATORIO' },
  { value: 'ADMINISTRADOR', label: 'ADMINISTRADOR' },
];

const ACTIVE_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'true', label: 'Activo' },
  { value: 'false', label: 'Inactivo' },
];

interface Filters {
  q: string;
  role: string;
  isActive: string;
}

const EMPTY: Filters = { q: '', role: '', isActive: '' };

/**
 * F6.7/REM-2026-09 - Gestion de usuarios (RF-23…27): listado filtrable por
 * nombre/rol/estado, alta, edicion, reset de contrasena y dar de
 * baja/reactivar (desactivacion logica, DEC-4). SIN DELETE fisico.
 */
export function UsersPage() {
  const [list, setList] = useState<UsersList | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  // 'filters': estado "borrador" que el usuario está editando en los inputs.
  // 'active': filtros realmente aplicados al último request.
  // Separar ambos (patrón de OrdersPage) evita el bug de closure estancada
  // al limpiar con setTimeout (hallazgo A.6).
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [active, setActive] = useState<Filters>(EMPTY);
  const [offset, setOffset] = useState(0);
  const [actionUser, setActionUser] = useState<AuthUser | null>(null);
  const [resetUser, setResetUser] = useState<AuthUser | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const load = useCallback(
    async (nextOffset: number, f: Filters) => {
      try {
        setError('');
        const params: Record<string, string> = {
          limit: String(PAGE_SIZE),
          offset: String(nextOffset),
        };
        if (f.q.trim()) params.q = f.q.trim();
        if (f.role) params.role = f.role;
        if (f.isActive) params.isActive = f.isActive;
        setList(await usersApi.list(params));
        setOffset(nextOffset);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al cargar usuarios');
      }
    },
    [],
  );

  // Recargar cada vez que 'active' cambia (montaje + aplicar/limpiar filtros).
  useEffect(() => {
    load(0, active);
  }, [load, active]);

  function applyFilters(e: React.FormEvent) {
    e.preventDefault();
    setActive(filters);
  }

  function clearFilters() {
    setFilters(EMPTY);
    setActive(EMPTY);
    setError('');
  }

  async function toggle() {
    if (!actionUser) return;
    try {
      await usersApi.setStatus(actionUser.id, !actionUser.isActive);
      setNotice(
        `${actionUser.username} ${actionUser.isActive ? 'dado de baja' : 'reactivado'}`,
      );
      setActionUser(null);
      await load(offset, active);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cambiar estado');
    }
  }

  async function doReset() {
    if (!resetUser) return;
    try {
      await usersApi.resetPassword(resetUser.id, newPassword);
      setNotice(
        `Contraseña de ${resetUser.username} restablecida (deberá cambiarla al iniciar sesión)`,
      );
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
      <div className="page-head">
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Users size={24} color="var(--color-primary)" aria-hidden="true" />
          <span>Gestión de usuarios</span>
        </h1>
        <Link to="/usuarios/nuevo" className="btn btn--primary">
          <UserPlus size={16} aria-hidden="true" />
          <span>+ Nuevo usuario</span>
        </Link>
      </div>

      <div className="panel">
        {notice && (
          <p role="status" className="notice" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle2 size={16} aria-hidden="true" />
            <span>{notice}</span>
          </p>
        )}
        {error && <p role="alert" className="error">{error}</p>}
        <form onSubmit={applyFilters} className="toolbar panel__toolbar" aria-label="Filtros de usuarios">
          <div className="form-field form-field--inline">
            <label htmlFor="f-nombre">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Search size={12} aria-hidden="true" /> Nombre / empresa
              </span>
            </label>
            <input
              id="f-nombre"
              className="control"
              placeholder="Buscar..."
              value={filters.q}
              onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
            />
          </div>
          <div className="form-field form-field--inline">
            <label htmlFor="f-rol">Rol</label>
            <Select
              id="f-rol"
              value={filters.role}
              onChange={(v) => setFilters((f) => ({ ...f, role: v }))}
              options={ROLE_OPTIONS}
            />
          </div>
          <div className="form-field form-field--inline">
            <label htmlFor="f-estado">Estado</label>
            <Select
              id="f-estado"
              value={filters.isActive}
              onChange={(v) => setFilters((f) => ({ ...f, isActive: v }))}
              options={ACTIVE_OPTIONS}
            />
          </div>
          <button type="submit" className="btn">
            <Filter size={15} aria-hidden="true" />
            <span>Aplicar filtros</span>
          </button>
          <button
            type="button"
            className="btn"
            onClick={clearFilters}
            disabled={!activeFiltering}
          >
            <RotateCcw size={15} aria-hidden="true" />
            <span>Limpiar</span>
          </button>
        </form>
        {!list && !error && <p className="muted">Cargando…</p>}
        {list && (
          <>
            {list.data.length === 0 ? (
              <div className="empty-state">
                <Inbox size={42} className="empty-state__icon" aria-hidden="true" />
                <p className="empty-state__title empty">No hay usuarios que coincidan.</p>
                <p className="empty-state__text">Ajusta o limpia los criterios de búsqueda.</p>
              </div>
            ) : (
              <div className="table-scroll panel__body">
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
                        <td><strong>{u.username}</strong></td>
                        <td>{u.companyName ?? '—'}</td>
                        <td>{u.role}</td>
                        <td>
                          <span className={u.isActive ? 'pill pill--activo' : 'pill pill--inactivo'}>
                            <span className="pill__dot" aria-hidden="true" />
                            {u.isActive ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="is-actions">
                          <div className="row-actions">
                            <Link to={`/usuarios/${u.id}/editar`} className="btn btn--sm">
                              <Edit3 size={13} aria-hidden="true" />
                              <span>Editar</span>
                            </Link>
                            <button className="btn btn--sm" onClick={() => setResetUser(u)}>
                              <KeyRound size={13} aria-hidden="true" />
                              <span>Reset contraseña</span>
                            </button>
                            <button className="btn btn--sm" onClick={() => setActionUser(u)}>
                              {u.isActive ? (
                                <UserX size={13} aria-hidden="true" />
                              ) : (
                                <UserCheck size={13} aria-hidden="true" />
                              )}
                              <span>{u.isActive ? 'Dar de baja' : 'Reactivar'}</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="panel__footer">
              <Pager
                total={list.total}
                limit={PAGE_SIZE}
                offset={offset}
                onPage={(o) => load(o, active)}
              />
            </div>
          </>
        )}
      </div>
      {actionUser && (
        <Modal onClose={() => setActionUser(null)} titleId="user-action-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <AlertTriangle
              size={22}
              color={
                actionUser.isActive
                  ? 'var(--color-badge-error-text)'
                  : 'var(--color-primary)'
              }
              aria-hidden="true"
            />
            <h3 id="user-action-title" className="mt-0" style={{ margin: 0 }}>
              {actionUser.isActive ? 'Dar de baja' : 'Reactivar'} usuario
            </h3>
          </div>
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
          onClose={() => {
            setResetUser(null);
            setNewPassword('');
          }}
          titleId="user-reset-title"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <KeyRound size={22} color="var(--color-primary)" aria-hidden="true" />
            <h3 id="user-reset-title" className="mt-0" style={{ margin: 0 }}>
              Reset de contraseña — {resetUser.username}
            </h3>
          </div>
          <div className="form-field">
            <label htmlFor="reset-pass">Nueva contraseña temporal</label>
            <input
              id="reset-pass"
              className="control"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              placeholder={PASSWORD_POLICY_MESSAGE}
            />
          </div>
          <p className="muted--sm">
            El usuario deberá cambiarla en su próximo inicio de sesión (DEC-6).
          </p>
          <div className="modal-actions">
            <button
              className="btn"
              onClick={() => {
                setResetUser(null);
                setNewPassword('');
              }}
            >
              Cancelar
            </button>
            <button
              className="btn btn--primary"
              onClick={doReset}
              disabled={!isValidPassword(newPassword)}
            >
              Restablecer
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}