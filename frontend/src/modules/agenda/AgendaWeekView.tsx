/**
 * AgendaWeekView — Vista semanal de agenda.
 * Columnas = días (Lun–Dom), filas = franjas de 30 min.
 * Sub-columnas por doctor dentro de cada día.
 * Línea de hora actual + scroll a hora actual.
 */
import { useMemo, useEffect, useRef } from "react";
import { parseISO, format, startOfWeek, addDays, isSameDay, isToday as dateFnsIsToday } from "date-fns";
import { es } from "date-fns/locale";
import type { Cita, Doctor } from "../../types";
import { COLORES_ESTADO_CITA } from "../../utils";

const HORA_INICIO = 8;
const HORA_FIN = 21;
const INTERVALO = 30;
const ROW_H = 28;

function generarFranjas(): string[] {
  const franjas: string[] = [];
  for (let h = HORA_INICIO; h < HORA_FIN; h++) {
    for (let m = 0; m < 60; m += INTERVALO) {
      franjas.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return franjas;
}

const FRANJAS = generarFranjas();
const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function citaAFranja(fechaHora: string): number {
  const d = parseISO(fechaHora);
  const totalMin = (d.getHours() - HORA_INICIO) * 60 + d.getMinutes();
  return Math.floor(totalMin / INTERVALO);
}

function duracionFilas(duracionMin: number): number {
  return Math.max(1, Math.round(duracionMin / INTERVALO));
}

function horaActualPx(): number | null {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();
  if (h < HORA_INICIO || h >= HORA_FIN) return null;
  const totalMin = (h - HORA_INICIO) * 60 + m;
  return (totalMin / INTERVALO) * ROW_H;
}

interface Props {
  fecha: Date;
  doctores: Doctor[];
  citas: Cita[];
  onSlotClick: (doctorId: string, fechaHora: Date) => void;
  onCitaClick: (cita: Cita) => void;
}

interface CitaEnGrid {
  cita: Cita;
  filaInicio: number;
  filas: number;
}

export default function AgendaWeekView({ fecha, doctores, citas, onSlotClick, onCitaClick }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const lunes = useMemo(() => startOfWeek(fecha, { weekStartsOn: 1 }), [fecha]);
  const dias: Date[] = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(lunes, i)), [lunes]);

  // Scroll a hora actual si la semana actual contiene hoy
  useEffect(() => {
    const semanaContienHoy = dias.some((d) => dateFnsIsToday(d));
    if (!semanaContienHoy) return;
    const px = horaActualPx();
    if (px !== null && scrollRef.current) {
      scrollRef.current.scrollTop = Math.max(0, px - 100);
    }
  }, [dias]);

  const citasPorDiaDoctor = useMemo(() => {
    const map: Record<string, Record<string, CitaEnGrid[]>> = {};
    for (const dia of dias) {
      const key = format(dia, "yyyy-MM-dd");
      map[key] = {};
      for (const doc of doctores) map[key][doc.id] = [];
    }
    for (const cita of citas) {
      const d = parseISO(cita.fecha_hora);
      const key = format(d, "yyyy-MM-dd");
      if (!map[key]?.[cita.doctor_id]) continue;
      map[key][cita.doctor_id].push({
        cita,
        filaInicio: citaAFranja(cita.fecha_hora),
        filas: duracionFilas(cita.duracion_min),
      });
    }
    return map;
  }, [dias, doctores, citas]);

  const handleSlotClick = (dia: Date, doctorId: string, franja: string) => {
    const [h, m] = franja.split(":").map(Number);
    const dt = new Date(dia);
    dt.setHours(h, m, 0, 0);
    onSlotClick(doctorId, dt);
  };

  const horaActual = horaActualPx();
  const today = new Date();

  if (doctores.length === 0) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-gray-200 bg-white">
        <div className="text-center">
          <div className="text-4xl mb-3">👨‍⚕️</div>
          <p className="text-sm font-medium text-gray-700 mb-1">No hay doctores configurados</p>
          <p className="text-xs text-gray-400">Ve a <strong>Ajustes → Doctores</strong> para añadir el equipo médico</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-white">
      {/* Cabecera con días */}
      <div className="flex border-b border-gray-200 bg-gray-50 shrink-0" style={{ paddingLeft: 52 }}>
        {dias.map((dia, i) => {
          const isToday = isSameDay(dia, today);
          const diaKey = format(dia, "yyyy-MM-dd");
          const nCitasDia = Object.values(citasPorDiaDoctor[diaKey] ?? {}).reduce((acc, arr) => acc + arr.length, 0);
          return (
            <div key={i} className="flex-1 min-w-0 border-l border-gray-200 px-1 py-2 text-center">
              <div className={`text-[11px] font-medium uppercase tracking-wide ${isToday ? "text-blue-600" : "text-gray-400"}`}>
                {DIAS_SEMANA[i]}
              </div>
              <div className={`text-sm font-bold mt-0.5 ${
                isToday
                  ? "bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center mx-auto"
                  : "text-gray-800"
              }`}>
                {format(dia, "d")}
              </div>
              <div className="flex items-center justify-center gap-1 mt-0.5">
                <span className={`text-[9px] ${isToday ? "text-blue-400" : "text-gray-300"}`}>
                  {format(dia, "MMM", { locale: es })}
                </span>
                {nCitasDia > 0 && (
                  <span className={`text-[8px] font-bold px-1 rounded-full ${isToday ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-500"}`}>
                    {nCitasDia}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Leyenda de doctores */}
      {doctores.length > 1 && (
        <div className="flex items-center gap-3 px-4 py-1 border-b border-gray-100 bg-gray-50 shrink-0 flex-wrap" style={{ paddingLeft: 60 }}>
          {doctores.map((doc) => (
            <div key={doc.id} className="flex items-center gap-1 text-[10px] text-gray-500">
              <span
                className="w-2 h-2 rounded-full inline-block shrink-0"
                style={{ backgroundColor: doc.color_agenda ?? "#9ca3af" }}
              />
              <span className="truncate max-w-[90px]">{doc.nombre.split(" ")[0]}</span>
            </div>
          ))}
        </div>
      )}

      {/* Grid scrollable */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="relative flex" style={{ minHeight: FRANJAS.length * ROW_H }}>
          {/* Columna de horas */}
          <div className="sticky left-0 z-10 w-[52px] shrink-0 bg-white border-r border-gray-200">
            {FRANJAS.map((franja) => (
              <div key={franja} className="flex items-start justify-end pr-1.5" style={{ height: ROW_H }}>
                <span className="text-[10px] text-gray-400 leading-none -mt-0.5 font-medium">
                  {franja}
                </span>
              </div>
            ))}
          </div>

          {/* Una columna por día */}
          {dias.map((dia, dIdx) => {
            const diaKey = format(dia, "yyyy-MM-dd");
            const isToday = isSameDay(dia, today);
            const mostrarLineaHoy = isToday && horaActual !== null;

            return (
              <div
                key={dIdx}
                className={`relative flex-1 min-w-0 border-l border-gray-200 ${isToday ? "bg-blue-50/20" : ""}`}
              >
                {/* Fondo con líneas */}
                {FRANJAS.map((franja, fi) => (
                  <div
                    key={franja}
                    className={`absolute w-full ${
                      franja.endsWith(":00")
                        ? "border-t border-gray-200"
                        : "border-t border-dashed border-gray-100"
                    }`}
                    style={{ top: fi * ROW_H, height: ROW_H }}
                  />
                ))}

                {/* Línea de hora actual */}
                {mostrarLineaHoy && (
                  <div
                    className="absolute z-20 pointer-events-none left-0 right-0"
                    style={{ top: horaActual! }}
                  >
                    <div className="h-px bg-red-400 opacity-70" />
                  </div>
                )}

                {/* Citas de todos los doctores */}
                {doctores.map((doc, docIdx) => {
                  const entradasDoc = citasPorDiaDoctor[diaKey]?.[doc.id] ?? [];
                  const numDoctores = doctores.length;
                  const leftPct = (docIdx / numDoctores) * 100;
                  const widthPct = (1 / numDoctores) * 100;

                  return entradasDoc.map(({ cita, filaInicio, filas }) => {
                    const top = filaInicio * ROW_H;
                    const height = filas * ROW_H - 2;
                    const colorEstado = COLORES_ESTADO_CITA[cita.estado] ?? "#6B7280";
                    const colorDoctor = doc.color_agenda ?? "#6B7280";
                    const horaStr = format(parseISO(cita.fecha_hora), "HH:mm");

                    return (
                      <div
                        key={cita.id}
                        className="absolute rounded overflow-hidden cursor-pointer z-10 shadow-sm hover:shadow-md hover:brightness-95 transition-all"
                        style={{
                          top,
                          height,
                          left: `calc(${leftPct}% + 1px)`,
                          width: `calc(${widthPct}% - 2px)`,
                          backgroundColor: colorEstado + "22",
                          borderLeft: `3px solid ${colorDoctor}`,
                          borderTop: `1px solid ${colorEstado}44`,
                        }}
                        onClick={(e) => { e.stopPropagation(); onCitaClick(cita); }}
                        title={`${cita.paciente ? `${cita.paciente.apellidos}, ${cita.paciente.nombre}` : "—"} · ${horaStr} · ${cita.duracion_min}min · ${cita.motivo ?? cita.estado}`}
                      >
                        <div className="px-0.5 py-0.5 overflow-hidden h-full flex flex-col">
                          <div className="flex items-center gap-0.5">
                            <span className="text-[8px] font-bold tabular-nums shrink-0" style={{ color: colorDoctor }}>{horaStr}</span>
                            {cita.es_urgencia && (
                              <span className="text-[7px] font-bold text-red-600 ml-auto">URG</span>
                            )}
                          </div>
                          <p className="text-[9px] font-semibold leading-tight text-gray-800 truncate">
                            {cita.paciente
                              ? `${cita.paciente.apellidos}, ${cita.paciente.nombre}`
                              : "—"}
                          </p>
                          {filas >= 2 && cita.motivo && (
                            <p className="text-[8px] text-gray-500 truncate leading-tight">{cita.motivo}</p>
                          )}
                        </div>
                      </div>
                    );
                  });
                })}

                {/* Slots clickables */}
                {FRANJAS.map((franja, fi) =>
                  doctores.map((doc, docIdx) => {
                    const widthPct = (1 / doctores.length) * 100;
                    const leftPct = (docIdx / doctores.length) * 100;
                    return (
                      <div
                        key={`${franja}-${doc.id}`}
                        className="absolute hover:bg-blue-100/30 transition-colors cursor-pointer"
                        style={{
                          top: fi * ROW_H,
                          height: ROW_H,
                          left: `${leftPct}%`,
                          width: `${widthPct}%`,
                        }}
                        onClick={() => handleSlotClick(dia, doc.id, franja)}
                      />
                    );
                  })
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
