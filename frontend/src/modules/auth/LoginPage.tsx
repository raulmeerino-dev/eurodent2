import { useState } from "react";
import { Navigate } from "react-router-dom";

import { useAuth } from "@/hooks/useAuth";
import { useAuthStore } from "@/store/authStore";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isBootstrapping = useAuthStore((s) => s.isBootstrapping);
  const { login, isLoggingIn } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/agenda" replace />;
  }

  if (isBootstrapping) {
    return null;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    login({ username, password });
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-50">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.22),_transparent_32%),radial-gradient(circle_at_80%_20%,_rgba(245,158,11,0.16),_transparent_22%),linear-gradient(135deg,_#020617_0%,_#0f172a_48%,_#082f49_100%)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-white/20" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col justify-between px-6 py-8 lg:px-10 lg:py-10">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-cyan-200/70">
              Eurodent Workspace
            </p>
            <h1 className="mt-3 font-serif text-3xl tracking-tight text-white sm:text-4xl">
              Eurodent 2.0
            </h1>
          </div>
          <div className="hidden rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs text-slate-300 md:block">
            Acceso interno de clinica
          </div>
        </header>

        <main className="grid gap-10 pb-8 pt-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
          <section className="max-w-2xl">
            <p className="mb-5 text-sm uppercase tracking-[0.32em] text-cyan-200/70">
              Agenda, pacientes y facturacion en un mismo puesto
            </p>
            <h2 className="max-w-xl font-serif text-5xl leading-[0.94] text-white sm:text-6xl lg:text-7xl">
              Gestion dental mas clara, rapida y segura.
            </h2>
            <p className="mt-6 max-w-lg text-base leading-7 text-slate-300 sm:text-lg">
              Pensado para recepcion, direccion clinica y gabinete, con menos ruido y mas foco en la
              operativa diaria.
            </p>

            <div className="mt-10 grid gap-6 sm:grid-cols-3">
              <div className="border-l border-cyan-300/50 pl-4">
                <p className="text-2xl font-semibold text-white">01</p>
                <p className="mt-2 text-sm text-slate-300">
                  Acceso inmediato a agenda, pacientes y cobros.
                </p>
              </div>
              <div className="border-l border-white/20 pl-4">
                <p className="text-2xl font-semibold text-white">02</p>
                <p className="mt-2 text-sm text-slate-300">
                  Sesion endurecida con refresco seguro en cookie.
                </p>
              </div>
              <div className="border-l border-amber-300/45 pl-4">
                <p className="text-2xl font-semibold text-white">03</p>
                <p className="mt-2 text-sm text-slate-300">
                  Diseno mas limpio para trabajar rapido durante todo el dia.
                </p>
              </div>
            </div>
          </section>

          <section>
            <form
              onSubmit={handleSubmit}
              className="relative overflow-hidden rounded-[32px] border border-white/12 bg-white/10 p-8 shadow-[0_30px_80px_rgba(2,6,23,0.55)] backdrop-blur-xl sm:p-10"
            >
              <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent" />
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.32em] text-cyan-200/70">
                    Inicio de sesion
                  </p>
                  <h3 className="mt-3 text-2xl font-semibold text-white">
                    Entrar al puesto clinico
                  </h3>
                </div>
                <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                  Solo personal autorizado
                </div>
              </div>

              <div className="mt-8 space-y-5">
                <label className="block">
                  <span className="mb-2 block text-xs uppercase tracking-[0.28em] text-slate-300">
                    Usuario
                  </span>
                  <input
                    type="text"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-base text-white outline-none transition focus:border-cyan-300/70 focus:bg-slate-950/75"
                    placeholder="usuario"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-xs uppercase tracking-[0.28em] text-slate-300">
                    Contrasena
                  </span>
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-base text-white outline-none transition focus:border-cyan-300/70 focus:bg-slate-950/75"
                    placeholder="••••••••"
                  />
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="mt-8 inline-flex w-full items-center justify-center rounded-full bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-65"
              >
                {isLoggingIn ? "Entrando..." : "Entrar"}
              </button>

              <p className="mt-6 text-xs leading-6 text-slate-400">
                Esta copia de trabajo prioriza privacidad, sesiones mas seguras y una operativa mas
                limpia para la clinica.
              </p>
            </form>
          </section>
        </main>

        <footer className="flex flex-col gap-2 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <p>Uso exclusivo del personal autorizado de la clinica.</p>
          <p>Sesion segura y recuperacion controlada del acceso.</p>
        </footer>
      </div>
    </div>
  );
}
