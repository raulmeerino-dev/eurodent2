import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePacientes } from "../../hooks/usePacientes";
import PacienteFormModal from "./PacienteFormModal";
import { calcularEdad } from "../../utils";
import type { Paciente } from "../../types";

function StatPill({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: string | number;
  tone?: "slate" | "emerald" | "amber";
}) {
  const tones = {
    slate: "border-slate-200/70 bg-white/80 text-slate-700",
    emerald: "border-emerald-200/70 bg-emerald-50/80 text-emerald-700",
    amber: "border-amber-200/70 bg-amber-50/80 text-amber-700",
  };

  return (
    <div className={`rounded-full border px-3 py-1.5 ${tones[tone]}`}>
      <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
        {label}
      </span>
      <span className="ml-2 text-sm font-semibold text-slate-900">{value}</span>
    </div>
  );
}

export default function PacientesPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [soloActivos, setSoloActivos] = useState(true);
  const [creando, setCreando] = useState(false);
  const [pagina, setPagina] = useState(0);

  const LIMITE = 50;

  const { data: pacientes = [], isLoading } = usePacientes({
    q: query.length >= 2 ? query : undefined,
    solo_activos: soloActivos,
    limit: LIMITE,
    offset: pagina * LIMITE,
  });

  const activosVisibles = pacientes.filter((paciente) => paciente.activo).length;
  const conTelefono = pacientes.filter((paciente) => Boolean(paciente.telefono)).length;
  const conEmail = pacientes.filter((paciente) => Boolean(paciente.email)).length;
  const rangoInicio = pagina * LIMITE + 1;
  const rangoFin = pagina * LIMITE + pacientes.length;

  function handleRowClick(paciente: Paciente) {
    navigate(`/pacientes/${paciente.id}`);
  }

  return (
    <div className="flex h-full flex-col gap-5 overflow-hidden">
      <section className="glass-panel overflow-hidden rounded-[28px] border border-white/70 px-6 py-6 shadow-[0_28px_80px_-42px_rgba(15,23,42,0.45)]">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-cyan-200/80 bg-cyan-50/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-cyan-700">
                Pacientes
              </span>
              <span className="text-xs text-slate-400">
                Busqueda, seguimiento y acceso rapido a historia clinica.
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-[2.2rem]">
                Base clinica ordenada para recepcion y equipo asistencial
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Consulta historiales, encuentra pacientes en segundos y abre
                cada ficha desde una lista mas limpia y mas facil de escanear.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <StatPill label="Visibles" value={pacientes.length} />
            <StatPill label="Activos" value={activosVisibles} tone="emerald" />
            <StatPill label="Con telefono" value={conTelefono} />
            <StatPill label="Con email" value={conEmail} tone="amber" />
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_auto_auto_auto]">
          <label className="flex min-w-0 items-center gap-3 rounded-[24px] border border-slate-200/70 bg-white/85 px-4 py-3 shadow-[0_20px_50px_-38px_rgba(15,23,42,0.55)]">
            <span className="text-slate-400">Buscar</span>
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPagina(0);
              }}
              placeholder="Nombre, apellidos o codigo de historia"
              className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-0"
            />
          </label>

          <button
            type="button"
            onClick={() => {
              setSoloActivos((value) => !value);
              setPagina(0);
            }}
            className={`inline-flex items-center justify-center rounded-[22px] border px-4 py-3 text-sm font-medium transition ${
              soloActivos
                ? "border-emerald-200/80 bg-emerald-50/80 text-emerald-700 shadow-[0_16px_40px_-28px_rgba(5,150,105,0.55)]"
                : "border-slate-200/80 bg-white/85 text-slate-600 hover:border-slate-300 hover:text-slate-900"
            }`}
          >
            {soloActivos ? "Solo activos" : "Todos los pacientes"}
          </button>

          <div className="inline-flex items-center justify-center rounded-[22px] border border-slate-200/70 bg-slate-50/80 px-4 py-3 text-sm text-slate-500">
            {query.length >= 2 ? `Filtro: ${query}` : "Vista general"}
          </div>

          <button
            onClick={() => setCreando(true)}
            className="inline-flex items-center justify-center rounded-[22px] bg-slate-950 px-5 py-3 text-sm font-medium text-white shadow-[0_24px_50px_-30px_rgba(15,23,42,0.85)] transition hover:bg-slate-800"
          >
            Nuevo paciente
          </button>
        </div>
      </section>

      <section className="glass-panel flex min-h-0 flex-1 flex-col overflow-hidden rounded-[30px] border border-white/70 shadow-[0_30px_90px_-50px_rgba(15,23,42,0.4)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 px-6 py-4">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
              Registro visible
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {isLoading
                ? "Actualizando listado..."
                : pacientes.length > 0
                ? `Mostrando ${rangoInicio}-${rangoFin} en la pagina actual.`
                : "No hay pacientes que coincidan con el filtro actual."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="rounded-full border border-slate-200/70 bg-white/80 px-3 py-1">
              Hx = Numero de historial
            </span>
            <span className="rounded-full border border-slate-200/70 bg-white/80 px-3 py-1">
              Click en fila para abrir la ficha
            </span>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto px-3 pb-3 pt-3">
          {isLoading ? (
            <div className="flex h-48 items-center justify-center rounded-[24px] border border-dashed border-slate-200 bg-white/70 text-sm text-slate-400">
              Cargando pacientes...
            </div>
          ) : (
            <table className="w-full min-w-[920px] table-fixed border-separate border-spacing-0 text-sm">
              <thead className="sticky top-0 z-10">
                <tr className="text-left">
                  <th className="rounded-l-[18px] border-y border-l border-slate-200/70 bg-slate-950 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300">
                    Hx
                  </th>
                  <th className="border-y border-slate-200/70 bg-slate-950 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300">
                    Paciente
                  </th>
                  <th className="border-y border-slate-200/70 bg-slate-950 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300">
                    Contacto
                  </th>
                  <th className="border-y border-slate-200/70 bg-slate-950 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300">
                    Edad
                  </th>
                  <th className="rounded-r-[18px] border-y border-r border-slate-200/70 bg-slate-950 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300">
                    Estado
                  </th>
                </tr>
              </thead>

              <tbody>
                {pacientes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-14">
                      <div className="rounded-[24px] border border-dashed border-slate-200 bg-white/75 px-6 py-10 text-center">
                        <p className="text-base font-medium text-slate-700">
                          {query.length >= 2
                            ? `Sin resultados para "${query}"`
                            : "No hay pacientes registrados."}
                        </p>
                        <p className="mt-2 text-sm text-slate-500">
                          Ajusta el filtro o crea un nuevo paciente desde esta
                          misma pantalla.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pacientes.map((paciente) => (
                    <tr
                      key={paciente.id}
                      className="group cursor-pointer"
                      onClick={() => handleRowClick(paciente)}
                    >
                      <td className="border-b border-slate-100 px-4 py-3.5 align-top">
                        <div className="inline-flex rounded-full border border-slate-200/70 bg-white px-3 py-1 font-mono text-xs text-slate-500 shadow-[0_16px_40px_-34px_rgba(15,23,42,0.45)]">
                          {paciente.num_historial}
                        </div>
                      </td>

                      <td className="border-b border-slate-100 px-4 py-3.5">
                        <div className="space-y-1">
                          <div className="font-medium text-slate-900 transition group-hover:text-cyan-700">
                            {paciente.apellidos}, {paciente.nombre}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            {paciente.codigo ? (
                              <span className="rounded-full border border-slate-200/70 bg-slate-50 px-2.5 py-1">
                                Codigo {paciente.codigo}
                              </span>
                            ) : null}
                            {paciente.ciudad ? (
                              <span>{paciente.ciudad}</span>
                            ) : (
                              <span>Ciudad pendiente</span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="border-b border-slate-100 px-4 py-3.5">
                        <div className="space-y-1.5 text-xs text-slate-500">
                          <div className="font-medium text-slate-700">
                            {paciente.telefono || "Telefono pendiente"}
                          </div>
                          <div>{paciente.email || "Email no registrado"}</div>
                        </div>
                      </td>

                      <td className="border-b border-slate-100 px-4 py-3.5">
                        <div className="text-sm font-medium text-slate-800">
                          {paciente.fecha_nacimiento
                            ? `${calcularEdad(paciente.fecha_nacimiento)} anos`
                            : "--"}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {paciente.fecha_nacimiento || "Fecha de nacimiento pendiente"}
                        </div>
                      </td>

                      <td className="border-b border-slate-100 px-4 py-3.5">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                            paciente.activo
                              ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/80"
                              : "bg-slate-100 text-slate-500 ring-1 ring-slate-200/80"
                          }`}
                        >
                          {paciente.activo ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {pacientes.length === LIMITE && (
          <div className="flex items-center justify-between gap-3 border-t border-slate-200/70 px-6 py-4 text-sm text-slate-500">
            <span>
              Mostrando {rangoInicio}-{rangoFin}
            </span>

            <div className="flex items-center gap-2">
              <button
                disabled={pagina === 0}
                onClick={() => setPagina((value) => value - 1)}
                className="rounded-full border border-slate-200/80 bg-white/85 px-4 py-2 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Anterior
              </button>
              <button
                onClick={() => setPagina((value) => value + 1)}
                className="rounded-full border border-slate-900 bg-slate-950 px-4 py-2 text-xs font-medium text-white transition hover:bg-slate-800"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </section>

      {creando ? <PacienteFormModal onClose={() => setCreando(false)} /> : null}
    </div>
  );
}
