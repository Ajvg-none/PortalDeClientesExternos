import { useState } from 'react';
import { BrowserRouter, Link, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { AuthContext, useAuth, type AuthSession } from './app/AuthContext';
import { RequireAuth, RequirePasswordChange, RequireRole } from './app/guards';
import { TopBar, Layout } from './app/TopBar';
import { session } from './core/http';
import type { AuthUser } from './core/types';
import { LoginPage } from './features/auth/pages/LoginPage';
import { ChangePasswordPage } from './features/auth/pages/ChangePasswordPage';
import { OrdersPage } from './features/orders-client/pages/OrdersPage';
import { OrderDetailPage } from './features/orders-client/pages/OrderDetailPage';
import { NewOrderPage } from './features/orders-client/pages/NewOrderPage';
import { UsersPage } from './features/admin-users/pages/UsersPage';
import { UserFormPage } from './features/admin-users/pages/UserFormPage';
import { StatsPage } from './features/admin-stats/pages/StatsPage';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';

/** App raiz (Fase 6): rutas por rol + Top Header Layout (anexo v1.4). */
export function App() {
  // REM-2026-09: la sesion persiste token + usuario; al recargar la SPA se
  // restaura el usuario desde storage (sin logout forzado pese al token vivo).
  const [user, setUser] = useState<AuthUser | null>(() => session.getUser<AuthUser>());

  const authValue: AuthSession = {
    user,
    token: session.getToken(),
    setSession: (token, u) => {
      session.setToken(token);
      session.setUser(u);
      setUser(u);
    },
    clear: () => {
      session.clear();
      setUser(null);
    },
  };

  return (
    <AuthContext.Provider value={authValue}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/cambiar-contrasena"
            element={
              <RequirePasswordChange>
                <ChangePasswordPage />
              </RequirePasswordChange>
            }
          />
          <Route path="/" element={<RequireAuth><AppShell /></RequireAuth>}>
            <Route index element={<Navigate to="/ordenes" replace />} />
            <Route path="ordenes" element={<Layout><OrdersPage /></Layout>} />
            <Route
              path="ordenes/nueva"
              element={
                <RequireRole role="CLIENTE_EXTERNO">
                  <Layout><NewOrderPage /></Layout>
                </RequireRole>
              }
            />
            <Route path="ordenes/:id" element={<Layout><OrderDetailPage /></Layout>} />
            <Route
              path="usuarios"
              element={
                <RequireRole role="ADMINISTRADOR">
                  <Layout><UsersPage /></Layout>
                </RequireRole>
              }
            />
            <Route
              path="usuarios/nuevo"
              element={
                <RequireRole role="ADMINISTRADOR">
                  <Layout><UserFormPage /></Layout>
                </RequireRole>
              }
            />
            <Route
              path="usuarios/:id/editar"
              element={
                <RequireRole role="ADMINISTRADOR">
                  <Layout><UserFormPage /></Layout>
                </RequireRole>
              }
            />
            <Route
              path="estadisticas"
              element={
                <RequireRole role="ADMINISTRADOR">
                  <Layout><StatsPage /></Layout>
                </RequireRole>
              }
            />
            <Route
              path="*"
              element={
                <Layout>
                  <div className="card card--narrow" style={{ textAlign: 'center', padding: '48px 24px', margin: '32px auto' }}>
                    <h1 style={{ fontSize: 40, color: 'var(--color-primary)', marginBottom: 8 }}>404</h1>
                    <p style={{ fontSize: 16, color: 'var(--color-text-secondary)', marginBottom: 16 }}>Página no encontrada.</p>
                    <Link to="/ordenes" className="btn btn--primary" style={{ display: 'inline-flex' }}>
                      Ir a mis órdenes
                    </Link>
                  </div>
                </Layout>
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}

/** Shell autenticado: Top Header (64px) + area de contenido por ruta. */
function AppShell() {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <>
      <a className="skip-link" href="#contenido">Saltar al contenido</a>
      <TopBar role={user.role} username={user.username} />
      <Outlet />
    </>
  );
}
