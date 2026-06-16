import { useEffect, useState } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from 'react-router-dom';

import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';

import { Toaster } from 'react-hot-toast';

import { AuthLayout } from './components/layout/AuthLayout';
import LoginPage from './pages/auth/LoginPage';

import DashboardPage from './pages/dashboard/DashboardPage';
import SucursalesPage from './pages/sucursales/SucursalesPage';
import SucursalDetallePage from './pages/sucursales/SucursalDetallePage';
import UsuariosPage from './pages/usuarios/UsuariosPage';
import ConfiguracionPage from './pages/configuracion/ConfiguracionPage';

import PedidosCocinaPage from './pages/pedidos-cocina/PedidosCocinaPage';

import MesasPageMesero from './pages/mesero/MesasPage';
import PedidoPage from './pages/mesero/PedidoPage';
import PedidosActivosPage from './pages/mesero/PedidosActivosPage';

import AsistenciasPage from './pages/administrador/asistencias/AsistenciasPages';
import MenuPage from './pages/administrador/menu/MenuPage';
import ReportesPage from './pages/reportes/ReportesPage';
import MesasPage from './pages/administrador/Mesas/MesasPage';
import PedidosPage from './pages/administrador/pedidos/PedidosPage';

import { useAuthStore } from './store/authStore';
import { useVistaAdministradorStore } from './store/vistaAdministradorStore';
import type { AuthUser } from './types';

const qc = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
      refetchOnWindowFocus: false,
    },
  },
});

function RequireAuth({
  user,
}: {
  user: AuthUser | null;
}) {
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

function RequireRole({
  user,
  roles,
  children,
}: {
  user: AuthUser | null;
  roles: AuthUser['rol'][];
  children: React.ReactNode;
}) {
  if (!user || !roles.includes(user.rol)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function RequireAdminOrDuenoVistaAdministrador({
  user,
  children,
}: {
  user: AuthUser | null;
  children: React.ReactNode;
}) {
  const {
    activo: vistaAdministradorActiva,
    sucursalActivaId,
  } = useVistaAdministradorStore();

  const isAdmin = user?.rol === 'ADMIN';

  const isDuenoEnVistaAdministrador =
    user?.rol === 'DUENO' &&
    vistaAdministradorActiva &&
    Boolean(sucursalActivaId);

  if (!user || (!isAdmin && !isDuenoEnVistaAdministrador)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function HomeRedirect({
  user,
}: {
  user: AuthUser | null;
}) {
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.rol === 'COCINERO') {
    return <Navigate to="/pedidos-cocina" replace />;
  }

  if (user.rol === 'MESERO') {
    return <Navigate to="/mesero/mesas" replace />;
  }

  return <Navigate to="/dashboard" replace />;
}

function AppRoutes() {
  const {
    user,
    initAuth,
    listenToAuthEvents,
  } = useAuthStore();

  const [authReady, setAuthReady] =
    useState(false);

  useEffect(() => {
    initAuth().finally(() =>
      setAuthReady(true)
    );
  }, [initAuth]);

  useEffect(() => {
    const unsubscribe =
      listenToAuthEvents();

    return unsubscribe;
  }, [listenToAuthEvents]);

  if (!authReady) {
    return null;
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={<LoginPage />}
      />

      <Route element={<AuthLayout />}>
        <Route
          element={<RequireAuth user={user} />}
        >
          <Route
            index
            element={
              <HomeRedirect user={user} />
            }
          />

          <Route
            path="/dashboard"
            element={
              <RequireRole
                user={user}
                roles={['DUENO', 'ADMIN']}
              >
                <DashboardPage />
              </RequireRole>
            }
          />

          <Route
            path="/sucursales"
            element={
              <RequireRole
                user={user}
                roles={['DUENO']}
              >
                <SucursalesPage />
              </RequireRole>
            }
          />

          <Route
            path="/sucursales/:id"
            element={
              <RequireRole
                user={user}
                roles={['DUENO']}
              >
                <SucursalDetallePage />
              </RequireRole>
            }
          />

          <Route
            path="/usuarios"
            element={
              <RequireRole
                user={user}
                roles={['DUENO', 'ADMIN']}
              >
                <UsuariosPage />
              </RequireRole>
            }
          />

          <Route
            path="/mesero/mesas"
            element={
              <RequireRole
                user={user}
                roles={['MESERO']}
              >
                <MesasPageMesero />
              </RequireRole>
            }
          />

          <Route
            path="/mesero/pedido"
            element={
              <RequireRole
                user={user}
                roles={['MESERO']}
              >
                <PedidoPage />
              </RequireRole>
            }
          />

          <Route
            path="/mesero/pedidos"
            element={
              <RequireRole
                user={user}
                roles={['MESERO']}
              >
                <PedidosActivosPage />
              </RequireRole>
            }
          />

          <Route
            path="/pedidos-cocina"
            element={
              <RequireRole
                user={user}
                roles={['COCINERO']}
              >
                <PedidosCocinaPage />
              </RequireRole>
            }
          />

          <Route
            path="/configuracion"
            element={
              <RequireRole
                user={user}
                roles={[
                  'DUENO',
                  'ADMIN',
                  'MESERO',
                  'COCINERO',
                ]}
              >
                <ConfiguracionPage />
              </RequireRole>
            }
          />

          <Route
            path="/asistencias"
            element={
              <RequireAdminOrDuenoVistaAdministrador user={user}>
                <AsistenciasPage />
              </RequireAdminOrDuenoVistaAdministrador>
            }
          />

          <Route
            path="/menu"
            element={
              <RequireRole
                user={user}
                roles={['ADMIN']}
              >
                <MenuPage />
              </RequireRole>
            }
          />

          <Route
            path="/reportes"
            element={
              <RequireRole
                user={user}
                roles={['DUENO', 'ADMIN']}
              >
                <ReportesPage />
              </RequireRole>
            }
          />

          <Route
            path="/mesas"
            element={
              <RequireAdminOrDuenoVistaAdministrador user={user}>
                <MesasPage />
              </RequireAdminOrDuenoVistaAdministrador>
            }
          />

          <Route
            path="/pedidos"
            element={
              <RequireAdminOrDuenoVistaAdministrador user={user}>
                <PedidosPage />
              </RequireAdminOrDuenoVistaAdministrador>
            }
          />

          <Route
            path="*"
            element={
              <HomeRedirect user={user} />
            }
          />
        </Route>
      </Route>

      <Route
        path="*"
        element={
          <Navigate
            to="/login"
            replace
          />
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            fontSize: '14px',
            borderRadius: '10px',
          },
        }}
      />
    </QueryClientProvider>
  );
}