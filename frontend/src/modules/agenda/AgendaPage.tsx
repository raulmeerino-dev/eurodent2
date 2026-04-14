/**
 * AgendaPage - Pantalla principal de inicio.
 * Vistas: dia | semana
 * Filtro por doctor.
 * Layout: cabecera operativa | superficie de agenda | panel telefonear
 */
import { useEffect, useMemo, useState } from "react";
import {
  addDays,
  addWeeks,
  endOfWeek,
  format,
  startOfToday,
  startOfWeek,
  subDays,
  subWeeks,
} from "date-fns";
import { es } from "date-fns/locale";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useSearchParams } from "react-router-dom";

import { anularCita, crearEntradaTelefonear } from "../../api/citas";
import { useCitas } from "../../hooks/useCitas";
import { useDoctores } from "../../hooks/useDoctores";
import type { Cita } from "../../types";
import AgendaDayView, { type AccionRapidaCita, type DropTelefonear } from "./AgendaDayView";
import AgendaWeekView from "./AgendaWeekView";
import BuscarHuecoModal from "./BuscarHuecoModal";
import CitaModal from "./CitaModal";
import RecordatoriosModal from "./RecordatoriosModal";
import TelefonearPanel from "./TelefonearPanel";

type Vista = "dia" | "semana";

export default function AgendaPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const doctorParam = searchParams.get("doctor") || "todos";
  const [fecha, setFecha] = useState<Date>(startOfToday());
  const [vista, setVista] = useState<Vista>("dia");
  const [doctorFiltro, setDoctorFiltro] = useState<string>(doctorParam);
  const [modalCita, setModalCita] = useState<{
    cita?: Cita;
    fechaHoraInicial?: Date;
    doctorIdInicial?: string;
    pacienteIdInicial?: string;
    pacienteLabelInicial?: string;
    telefonearEntradaId?: string;
  } | null>(null);
  const [mostrarBuscarHueco, setMostrarBuscarHueco] = useState(false);
  const [mostrarRecordatorios, setMostrarRecordatorios] = useState(false);

  const qc = useQueryClient();

  useEffect(() => {
    if (doctorParam !== doctorFiltro) {
      setDoctorFiltro(doctorParam);
    }
  }, [doctorFiltro, doctorParam]);

  useEffect(() => {
    if (doctorFiltro === doctorParam) return;
    const next = new URLSearchParams(searchParams);
    if (doctorFiltro === "todos") next.delete("doctor");
    else next.set("doctor", doctorFiltro);
    setSearchParams(next, { replace: true });
  }, [doctorFiltro, doctorParam, searchParams, setSearchParams]);

  const { data: todosDoctores = [] } = useDoctores(false);
  const doctoresActivos = useMemo(() => todosDoctores.filter((d) => d.activo), [todosDoctores]);

  const doctoresMostrados = useMemo(() => {
    if (doctorFiltro === "todos") return doctoresActivos;
    return doctoresActivos.filter((d) => d.id === doctorFiltro);
  }, [doctoresActivos, doctorFiltro]);

  const { fechaDesde, fechaHasta } = useMemo(() => {
    if (vista === "semana") {
      const lunes = startOfWeek(fecha, { weekStartsOn: 1 });
      const domingo = endOfWeek(fecha, { weekStartsOn: 1 });
      return {
        fechaDesde: `${format(lunes, "yyyy-MM-dd")}T00:00:00.000Z`,
        fechaHasta: `${format(domingo, "yyyy-MM-dd")}T23:59:59.000Z`,
      };
    }

    return {
      fechaDesde: `${format(fecha, "yyyy-MM-dd")}T00:00:00.000Z`,
      fechaHasta: `${format(fecha, "yyyy-MM-dd")}T23:59:59.000Z`,
    };
  }, [fecha, vista]);

  const { data: citas = [], isLoading } = useCitas({
    fecha_desde: fechaDesde,
    fecha_hasta: fechaHasta,
  });

  function irAHoy() {
    setFecha(startOfToday());
  }

  function irAnterior() {
    setFecha((d) => (vista === "semana" ? subWeeks(d, 1) : subDays(d, 1)));
  }

  function irSiguiente() {
    setFecha((d) => (vista === "semana" ? addWeeks(d, 1) : addDays(d, 1)));
  }

  function handleSlotClick(doctorId: string, fechaHora: Date) {
    setModalCita({ fechaHoraInicial: fechaHora, doctorIdInicial: doctorId });
  }

  function handleCitaClick(cita: Cita) {
    setModalCita({ cita });
  }

  function handleHuecoSeleccionado(doctorId: string, fechaHora: Date, _duracion: number) {
    setModalCita({ fechaHoraInicial: fechaHora, doctorIdInicial: doctorId });
  }

  function handleReubicarTelefonear(
    entradaId: string,
    pacienteId: string,
    doctorId: string,
    pacienteLabel: string,
  ) {
    setModalCita({
      doctorIdInicial: doctorId,
      pacienteIdInicial: pacienteId,
      pacienteLabelInicial: pacienteLabel,
      telefonearEntradaId: entradaId,
    });
  }

  async function handleAccionRapida(cita: Cita, accion: AccionRapidaCita) {
    if (accion === "anular") {
      const nombre = cita.paciente ? `${cita.paciente.apellidos}, ${cita.paciente.nombre}` : "esta cita";
      if (!confirm(`¿Anular la cita de ${nombre}?`)) return;
      try {
        await anularCita(cita.id);
        qc.invalidateQueries({ queryKey: ["citas"] });
        toast.success("Cita anulada");
      } catch {
        toast.error("Error al anular la cita");
      }
    } else if (accion === "telefonear") {
      try {
        await crearEntradaTelefonear(cita.id, cita.paciente_id, cita.doctor_id, cita.motivo ?? undefined);
        qc.invalidateQueries({ queryKey: ["telefonear"] });
        await anularCita(cita.id);
        qc.invalidateQueries({ queryKey: ["citas"] });
        toast.success("Cita pasada a Telefonear");
      } catch {
        toast.error("Error al pasar la cita a Telefonear");
      }
    }
  }

  function handleDropTelefonear(data: DropTelefonear, doctorId: string, fechaHora: Date) {
    setModalCita({
      doctorIdInicial: doctorId,
      fechaHoraInicial: fechaHora,
      pacienteIdInicial: data.pacienteId,
      pacienteLabelInicial: data.pacienteLabel,
      telefonearEntradaId: data.entradaId,
    });
  }

  const tituloFecha = useMemo(() => {
    if (vista === "semana") {
      const lunes = startOfWeek(fecha, { weekStartsOn: 1 });
      const domingo = endOfWeek(fecha, { weekStartsOn: 1 });
      const mismoMes = format(lunes, "MM") === format(domingo, "MM");
      if (mismoMes) {
        return `${format(lunes, "d")}-${format(domingo, "d 'de' MMMM 'de' yyyy", { locale: es })}`;
      }
      return `${format(lunes, "d 'de' MMMM", { locale: es })} - ${format(domingo, "d 'de' MMMM yyyy", { locale: es })}`;
    }
    return format(fecha, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es });
  }, [fecha, vista]);

  const resumenAgenda = useMemo(() => {
    const total = citas.length;
    const pendientes = citas.filter((cita) => ["programada", "confirmada"].includes(cita.estado)).length;
    const enClinica = citas.filter((cita) => cita.estado === "en_clinica").length;
    const atendidas = citas.filter((cita) => cita.estado === "atendida").length;
    return {
      total,
      pendientes,
      enClinica,
      atendidas,
    };
  }, [citas]);

  const nombreDoctorActivo = useMemo(() => {
    if (doctorFiltro === "todos") return "Equipo completo";
    return doctoresActivos.find((doctor) => doctor.id === doctorFiltro)?.nombre ?? "Doctor";
  }, [doctorFiltro, doctoresActivos]);

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-hidden" style={{ minHeight: 0 }}>
      <section className="glass-panel relative overflow-hidden rounded-[2rem] px-5 py-5 md:px-6 md:py-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(8,145,178,0.16),transparent_26%),linear-gradient(135deg,rgba(255,255,255,0.78),rgba(255,255,255,0.58))]" />
        <div className="relative flex flex-col gap-5">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-3xl">
              <p className="text-[0.68rem] font-medium uppercase tracking-[0.34em] text-cyan-700/72">
                Centro de mando diario
              </p>
              <h1 className="app-section-title mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                Agenda viva del equipo
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Controla el pulso del dia, reubica pacientes con rapidez y mantén la operacion clinica ordenada sin perder contexto.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 xl:min-w-[26rem] xl:max-w-[29rem] xl:grid-cols-2">
              <MetricCard label="Citas visibles" value={resumenAgenda.total} tone="default" />
              <MetricCard label="Pendientes" value={resumenAgenda.pendientes} tone="cyan" />
              <MetricCard label="En clinica" value={resumenAgenda.enClinica} tone="amber" />
              <MetricCard label="Atendidas" value={resumenAgenda.atendidas} tone="emerald" />
            </div>
          </div>

          <div className="grid gap-3 xl:grid-cols-[1.3fr_1fr_auto]">
            <div className="rounded-[1.7rem] border border-white/65 bg-white/76 px-4 py-4 shadow-[0_18px_40px_rgba(15,23,42,0.05)] backdrop-blur">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={irAHoy}
                  className="rounded-full border border-slate-200 bg-slate-950 px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-white transition hover:border-slate-900 hover:bg-slate-900"
                >
                  Hoy
                </button>
                <button
                  onClick={irAnterior}
                  className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
                >
                  Anterior
                </button>
                <button
                  onClick={irSiguiente}
                  className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
                >
                  Siguiente
                </button>

                <div className="ml-auto flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 p-1">
                  <ToggleButton active={vista === "dia"} onClick={() => setVista("dia")}>
                    Dia
                  </ToggleButton>
                  <ToggleButton active={vista === "semana"} onClick={() => setVista("semana")}>
                    Semana
                  </ToggleButton>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-[0.68rem] font-medium uppercase tracking-[0.28em] text-slate-400">
                    Ventana activa
                  </p>
                  <div className="mt-2 text-lg font-semibold capitalize tracking-tight text-slate-950">
                    {tituloFecha}
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    Cobertura visible: <span className="font-medium text-slate-700">{nombreDoctorActivo}</span>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="date"
                    value={format(fecha, "yyyy-MM-dd")}
                    onChange={(e) => {
                      if (e.target.value) setFecha(new Date(`${e.target.value}T12:00:00`));
                    }}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
                    title="Ir a fecha"
                  />
                  <div className="relative">
                    <select
                      value={doctorFiltro}
                      onChange={(e) => setDoctorFiltro(e.target.value)}
                      className="rounded-full border border-slate-200 bg-white px-4 py-2 pr-9 text-sm text-slate-700 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100"
                    >
                      <option value="todos">Equipo completo</option>
                      {doctoresActivos.map((doctor) => (
                        <option key={doctor.id} value={doctor.id}>
                          {doctor.nombre}
                        </option>
                      ))}
                    </select>
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                      ▼
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[1.7rem] border border-white/65 bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(15,118,110,0.88))] px-4 py-4 text-white shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
              <p className="text-[0.68rem] font-medium uppercase tracking-[0.3em] text-cyan-100/70">
                Accion rapida
              </p>
              <div className="mt-2 text-lg font-semibold tracking-tight">Reacciona sin salir de agenda</div>
              <p className="mt-2 text-sm leading-6 text-slate-200/82">
                Programa, encuentra huecos y lanza recordatorios desde la misma superficie operativa.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <ActionButton tone="ghost" onClick={() => setMostrarRecordatorios(true)}>
                  Recordatorios
                </ActionButton>
                <ActionButton tone="ghost" onClick={() => setMostrarBuscarHueco(true)}>
                  Buscar hueco
                </ActionButton>
                <ActionButton tone="solid" onClick={() => setModalCita({})}>
                  Nueva cita
                </ActionButton>
              </div>
            </div>

            <div className="hidden xl:flex xl:flex-col xl:justify-between xl:rounded-[1.7rem] xl:border xl:border-white/65 xl:bg-white/72 xl:px-4 xl:py-4 xl:shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
              <p className="text-[0.68rem] font-medium uppercase tracking-[0.28em] text-slate-400">
                Vista
              </p>
              <div className="mt-2 text-sm font-medium text-slate-900">
                {vista === "dia" ? "Detalle de jornada" : "Panorama semanal"}
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Ajusta la agenda para recepcion o doctor sin perder contexto del flujo diario.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-1 overflow-hidden gap-4" style={{ minHeight: 0 }}>
        <section className="glass-panel flex flex-1 overflow-hidden rounded-[2rem] p-3 md:p-4" style={{ minHeight: 0 }}>
          <div className="flex flex-1 overflow-hidden rounded-[1.5rem] border border-slate-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(244,248,252,0.82))]">
            {isLoading ? (
              <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
                <div className="text-center">
                  <div className="mx-auto mb-3 h-7 w-7 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
                  Cargando agenda...
                </div>
              </div>
            ) : vista === "semana" ? (
              <AgendaWeekView
                fecha={fecha}
                doctores={doctoresMostrados}
                citas={citas}
                onSlotClick={handleSlotClick}
                onCitaClick={handleCitaClick}
              />
            ) : (
              <AgendaDayView
                fecha={fecha}
                doctores={doctoresMostrados}
                citas={citas}
                onSlotClick={handleSlotClick}
                onCitaClick={handleCitaClick}
                onDropTelefonear={handleDropTelefonear}
                onAccionRapida={handleAccionRapida}
              />
            )}
          </div>
        </section>

        <TelefonearPanel
          doctores={doctoresActivos}
          doctorFiltro={doctorFiltro !== "todos" ? doctorFiltro : undefined}
          onReubicar={handleReubicarTelefonear}
        />
      </div>

      {modalCita !== null && (
        <CitaModal
          cita={modalCita.cita}
          fechaHoraInicial={modalCita.fechaHoraInicial}
          doctorIdInicial={modalCita.doctorIdInicial}
          pacienteIdInicial={modalCita.pacienteIdInicial}
          pacienteLabelInicial={modalCita.pacienteLabelInicial}
          telefonearEntradaId={modalCita.telefonearEntradaId}
          doctores={doctoresActivos}
          onClose={() => setModalCita(null)}
        />
      )}

      {mostrarBuscarHueco && (
        <BuscarHuecoModal
          doctores={doctoresActivos}
          onSeleccionar={handleHuecoSeleccionado}
          onClose={() => setMostrarBuscarHueco(false)}
        />
      )}

      {mostrarRecordatorios && (
        <RecordatoriosModal onClose={() => setMostrarRecordatorios(false)} />
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "default" | "cyan" | "amber" | "emerald";
}) {
  const toneClasses: Record<typeof tone, string> = {
    default: "border-slate-200/70 bg-white/72 text-slate-900",
    cyan: "border-cyan-200/60 bg-cyan-50/88 text-cyan-950",
    amber: "border-amber-200/60 bg-amber-50/88 text-amber-950",
    emerald: "border-emerald-200/60 bg-emerald-50/88 text-emerald-950",
  };

  return (
    <div className={`rounded-[1.4rem] border px-4 py-4 shadow-[0_12px_24px_rgba(15,23,42,0.04)] ${toneClasses[tone]}`}>
      <div className="text-[0.68rem] font-medium uppercase tracking-[0.28em] text-slate-500/80">{label}</div>
      <div className="mt-3 text-3xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}

function ToggleButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "rounded-full px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] transition-all",
        active ? "bg-slate-950 text-white" : "bg-transparent text-slate-500 hover:text-slate-900",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function ActionButton({
  children,
  onClick,
  tone,
}: {
  children: React.ReactNode;
  onClick: () => void;
  tone: "solid" | "ghost";
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "rounded-full px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] transition-all",
        tone === "solid"
          ? "bg-white text-slate-950 hover:bg-slate-100"
          : "border border-white/18 bg-white/8 text-white hover:bg-white/14",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
