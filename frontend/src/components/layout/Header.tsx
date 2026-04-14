import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import BuscadorPacientes from "@/modules/pacientes/BuscadorPacientes";
import { useAuth } from "@/hooks/useAuth";
import type { Paciente } from "@/types";

const TITLES: Record<string, { title: string; subtitle: string }> = {
  "/agenda": {
    title: "Agenda clinica",
    subtitle: "Planificacion diaria, recordatorios y gestion de huecos en tiempo real.",
  },
  "/pacientes": {
    title: "Pacientes",
    subtitle: "Ficha centralizada, seguimiento y acceso rapido a cada historial.",
  },
  "/presupuestos": {
    title: "Presupuestos",
    subtitle: "Propuestas claras, aceptaciones y conversion a facturacion.",
  },
  "/facturacion": {
    title: "Facturacion",
    subtitle: "Emision, rectificacion y trazabilidad fiscal en una sola vista.",
  },
  "/laboratorio": {
    title: "Laboratorio",
    subtitle: "Trabajos externos, control de entregas y estado por caso.",
  },
  "/listados": {
    title: "Listados",
    subtitle: "Revision operativa y analitica de la actividad del centro.",
  },
  "/admin": {
    title: "Administracion",
    subtitle: "Usuarios, parametros y controles internos del sistema.",
  },
};

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const headerCopy = useMemo(() => {
    return (
      Object.entries(TITLES).find(([path]) => location.pathname.startsWith(path))?.[1] ??
      TITLES["/agenda"]
    );
  }, [location.pathname]);

  function handleSeleccionarPaciente(p: Paciente) {
    navigate(`/pacientes/${p.id}`);
  }

  return (
    <header className="sticky top-0 z-20 shrink-0 border-b border-slate-200/70 bg-white/78 px-3 py-3 backdrop-blur-xl md:px-5 xl:px-7">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-cyan-200/60 bg-cyan-100/70 text-[0.7rem] font-semibold tracking-[0.18em] text-cyan-800 shadow-sm md:flex">
            HUB
          </div>
          <div className="min-w-0">
            <p className="text-[0.68rem] font-medium uppercase tracking-[0.34em] text-slate-400">
              Puesto clinico
            </p>
            <h2 className="mt-1 truncate text-xl font-semibold tracking-tight text-slate-950">
              {headerCopy.title}
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-5 text-slate-500">
              {headerCopy.subtitle}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="w-full md:w-[25rem]">
            <div className="rounded-[1.35rem] border border-slate-200/70 bg-white/90 p-1.5 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
              <div className="rounded-[1rem] bg-slate-50/90 px-1.5 py-1">
                <BuscadorPacientes
                  onSelect={handleSeleccionarPaciente}
                  placeholder="Buscar paciente por nombre, codigo o historial"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-[1.35rem] border border-slate-200/70 bg-white/90 px-4 py-3 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-slate-900">{user?.nombre ?? "Usuario"}</div>
              <div className="mt-1 text-[0.68rem] uppercase tracking-[0.28em] text-slate-400">
                {user?.rol ?? "Sesion"}
              </div>
            </div>
            <button
              onClick={() => logout()}
              className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-100 hover:text-slate-950"
            >
              Salir
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
