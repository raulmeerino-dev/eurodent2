import { Component, type ReactNode, Suspense, lazy, useEffect, useRef } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import MainLayout from "@/components/layout/MainLayout";
import { useAuth } from "@/hooks/useAuth";
import { useAuthStore } from "@/store/authStore";

const AgendaPage = lazy(() => import("@/modules/agenda/AgendaPage"));
const AdminPage = lazy(() => import("@/modules/admin/AdminPage"));
const LoginPage = lazy(() => import("@/modules/auth/LoginPage"));
const FacturaEditor = lazy(() => import("@/modules/facturacion/FacturaEditor"));
const FacturacionPage = lazy(() => import("@/modules/facturacion/FacturacionPage"));
const GestionPage = lazy(() => import("@/modules/gestion/GestionPage"));
const LaboratorioPage = lazy(() => import("@/modules/laboratorio/LaboratorioPage"));
const ListadosPage = lazy(() => import("@/modules/listados/ListadosPage"));
const FichaPaciente = lazy(() => import("@/modules/pacientes/FichaPaciente"));
const PacientesPage = lazy(() => import("@/modules/pacientes/PacientesPage"));
const PresupuestoEditor = lazy(() => import("@/modules/presupuestos/PresupuestoEditor"));
const PresupuestosPage = lazy(() => import("@/modules/presupuestos/PresupuestosPage"));

function AuthScreen({ title, message }: { title: string; message: string }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-6 text-slate-50">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(15,118,110,0.24),transparent_30%)]" />
      <div className="relative w-full max-w-md rounded-[32px] border border-white/10 bg-white/7 p-8 shadow-2xl shadow-cyan-950/20 backdrop-blur-xl">
        <p className="text-[0.68rem] font-medium uppercase tracking-[0.34em] text-cyan-200/74">
          DentOrg
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">{message}</p>
        <div className="mt-6 flex gap-2">
          <span className="h-2 w-14 rounded-full bg-cyan-300/85" />
          <span className="h-2 w-2 rounded-full bg-white/24" />
          <span className="h-2 w-2 rounded-full bg-white/18" />
        </div>
      </div>
    </div>
  );
}

class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-screen items-center justify-center bg-[var(--app-bg)] px-6">
          <div className="glass-panel w-full max-w-2xl rounded-[2rem] p-8">
            <p className="text-[0.68rem] font-medium uppercase tracking-[0.34em] text-rose-500/72">
              Error de interfaz
            </p>
            <h1 className="mb-4 mt-3 text-2xl font-semibold tracking-tight text-slate-950">
              La vista ha fallado durante el render
            </h1>
            <pre className="max-h-[45vh] overflow-auto rounded-[1.4rem] bg-slate-950 p-4 text-sm text-slate-200">
              {(this.state.error as Error).message}
              {"\n"}
              {(this.state.error as Error).stack}
            </pre>
            <button
              className="mt-5 rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
              onClick={() => {
                localStorage.clear();
                window.location.href = "/login";
              }}
            >
              Limpiar sesion e ir al login
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function SessionBootstrap({ children }: { children: React.ReactNode }) {
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping);
  const { bootstrapSession } = useAuth();
  const hasBootstrapped = useRef(false);

  useEffect(() => {
    if (hasBootstrapped.current) {
      return;
    }
    hasBootstrapped.current = true;
    void bootstrapSession();
  }, [bootstrapSession]);

  if (isBootstrapping) {
    return (
      <AuthScreen
        title="Preparando el puesto clinico"
        message="Estamos restaurando tu sesion segura y cargando el area de trabajo."
      />
    );
  }

  return <>{children}</>;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping);

  if (isBootstrapping) {
    return (
      <AuthScreen
        title="Cargando area de trabajo"
        message="Un momento, estamos validando la sesion antes de abrir la agenda."
      />
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function RouteScreen() {
  return (
    <AuthScreen
      title="Abriendo modulo"
      message="Estamos cargando la superficie de trabajo y preparando la vista."
    />
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <SessionBootstrap>
          <Suspense fallback={<RouteScreen />}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />

              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <MainLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/agenda" replace />} />
                <Route path="agenda" element={<AgendaPage />} />
                <Route path="pacientes" element={<PacientesPage />} />
                <Route path="pacientes/:id" element={<FichaPaciente />} />
                <Route path="pacientes/:id/historial" element={<FichaPaciente />} />
                <Route path="gestion" element={<GestionPage />} />
                <Route path="presupuestos" element={<PresupuestosPage />} />
                <Route path="presupuestos/:id" element={<PresupuestoEditor />} />
                <Route path="facturacion" element={<FacturacionPage />} />
                <Route path="facturacion/:id" element={<FacturaEditor />} />
                <Route path="listados" element={<ListadosPage />} />
                <Route path="laboratorio" element={<LaboratorioPage />} />
                <Route path="configuracion" element={<AdminPage initialTab="usuarios" />} />
                <Route path="cumplimiento" element={<AdminPage initialTab="cumplimiento" />} />
                <Route path="admin" element={<AdminPage initialTab="usuarios" />} />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </SessionBootstrap>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
