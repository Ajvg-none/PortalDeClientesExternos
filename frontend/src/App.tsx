import { useState } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
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

/** App raiz (Fase 6): rutas por rol + Top Header Layout (anexo v1.4). */
export function App() {
  // REM-2026-09: la sesion persiste token + usuario; al recargar la SPA se
  // restaura el usuario desde storage (sin logout forzado pese al token vivo).
  const [user, setUser] = useState<AuthUser | null>(() => session.getUser<AuthUser>());

  const authValue: AuthSession = {
    user,
    token: session.getToken(),
    setSession: (_token, u) => {
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
                  <h1>404</h1>
                  <p>Página no encontrada.</p>
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
      <TopBar role={user.role} username={user.username} />
      <Outlet />
    </>
  );
}
