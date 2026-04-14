/**
 * AgendaDayView — Vista de agenda por día.
 * Columnas = doctores, filas = franjas de 10 min (08:00 a 21:00).
 * Clic en hueco vacío => onSlotClick para crear cita.
 * Clic en cita existente => onCitaClick para editar.
 * Línea de hora actual + scroll automático a hora actual.
 */
import { useMemo, useEffect, useRef, useState, useCallback } from "react";
import { parseISO, isToday, format } from "date-fns";
import type { Cita, Doctor } from "../../types";
import { COLORES_ESTADO_CITA } from "../../utils";
import { DRAG_TYPE } from "./TelefonearPanel";

const ETIQUETAS_ESTADO: Record<string, string> = {
  programada: "Prog.",
  confirmada: "Conf.",
  en_clinica: "En clínica",
  atendida: "Atendida",
  falta: "Falta",
  anulada: "Anulada",
};

const HORA_INICIO = 8;
const HORA_FIN = 21;
const INTERVALO = 10;
const ROW_H = 22;

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

function franjaIndex(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return ((h - HORA_INICIO) * 60 + m) / INTERVALO;
}

function citaAFranja(fechaHora: string): number {
  const d = parseISO(fechaHora);
  const hora = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return franjaIndex(hora);
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

export interface DropTelefonear {
  entradaId: string;
  pacienteId: string;
  doctorId: string;
  pacienteLabel: string;
}

export type AccionRapidaCita = "anular" | "telefonear";

interface Props {
  fecha: Date;
  doctores: Doctor[];
  citas: Cita[];
  onSlotClick: (doctorId: string, fechaHora: Date) => void;
  onCitaClick: (cita: Cita) => void;
  onDropTelefonear?: (data: DropTelefonear, doctorId: string, fechaHora: Date) => void;
  onAccionRapida?: (cita: Cita, accion: AccionRapidaCita) => void;
}

interface CitaEnGrid {
  cita: Cita;
  filaInicio: number;
  filas: number;
}

export default function AgendaDayView({ fecha, doctores, citas, onSlotClick, onCitaClick, onDropTelefonear, onAccionRapida }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [dropTarget, setDropTarget] = useState<{ docId: string; franja: string } | null>(null);
  const [menu, setMenu] = useState<{ cita: Cita; x: number; y: number } | null>(null);

  // Cerrar menú al hacer clic en cualquier sitio
  const cerrarMenu = useCallback(() => setMenu(null), []);
  useEffect(() => {
    if (!menu) return;
    window.addEventListener("mousedown", cerrarMenu);
    return () => window.removeEventListener("mousedown", cerrarMenu);
  }, [menu, cerrarMenu]);

  useEffect(() => {
    if (!isToday(fecha)) return;
    const px = horaActualPx();
    if (px !== null && scrollRef.current) {
      scrollRef.current.scrollTop = Math.max(0, px - 120);
    }
  }, [fecha]);

  const citasPorDoctor = useMemo(() => {
    const map: Record<string, CitaEnGrid[]> = {};
    for (const doc of doctores) {
      map[doc.id] = [];
    }
    for (const cita of citas) {
      if (!map[cita.doctor_id]) continue;
      const filaInicio = citaAFranja(cita.fecha_hora);
      const filas = duracionFilas(cita.duracion_min);
      map[cita.doctor_id].push({ cita, filaInicio, filas });
    }
    return map;
  }, [doctores, citas]);

  const handleSlotClick = (doctorId: string, franja: string) => {
    const [h, m] = franja.split(":").map(Number);
    const dt = new Date(fecha);
    dt.setHours(h, m, 0, 0);
    onSlotClick(doctorId, dt);
  };

  const franjaToDate = (franja: string): Date => {
    const [h, m] = franja.split(":").map(Number);
    const dt = new Date(fecha);
    dt.setHours(h, m, 0, 0);
    return dt;
  };

  const handleDragOver = (e: React.DragEvent, docId: string, franja: string) => {
    if (!e.dataTransfer.types.includes(DRAG_TYPE)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setDropTarget({ docId, franja });
  };

  const handleDrop = (e: React.DragEvent, docId: string, franja: string) => {
    e.preventDefault();
    setDropTarget(null);
    const raw = e.dataTransfer.getData(DRAG_TYPE);
    if (!raw || !onDropTelefonear) return;
    try {
      const data = JSON.parse(raw);
      onDropTelefonear(data, docId, franjaToDate(franja));
    } catch {
      // malformed drag data — ignore
    }
  };

  const horaActual = isToday(fecha) ? horaActualPx() : null;

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
      {/* Cabecera con nombres de doctores */}
      <div className="flex shrink-0 border-b border-gray-200 bg-gray-50" style={{ paddingLeft: 52 }}>
        {doctores.map((doc) => {
          const nCitas = (citasPorDoctor[doc.id] ?? []).length;
          return (
            <div key={doc.id} className="flex-1 min-w-0 border-l border-gray-200 px-2 py-2 text-center">
              <div className="flex items-center justify-center gap-1.5">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: doc.color_agenda ?? "#9ca3af" }}
                />
                <span className="text-xs font-semibold text-gray-700 truncate">{doc.nombre}</span>
                {nCitas > 0 && (
                  <span className="inline-flex items-center justify-center text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-white"
                    style={{ backgroundColor: doc.color_agenda ?? "#9ca3af" }}>
                    {nCitas}
                  </span>
                )}
              </div>
              {doc.especialidad && (
                <p className="text-[10px] text-gray-400 truncate mt-0.5">{doc.especialidad}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Grid scrollable */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="relative flex" style={{ minHeight: FRANJAS.length * ROW_H }}>
          {/* Columna de horas */}
          <div className="sticky left-0 z-10 w-[52px] shrink-0 bg-white border-r border-gray-200">
            {FRANJAS.map((franja) => (
              <div key={franja} className="flex items-start justify-end pr-2" style={{ height: ROW_H }}>
                {franja.endsWith(":00") && (
                  <span className="text-[10px] text-gray-400 leading-none -mt-0.5 font-medium">
                    {franja}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Línea de hora actual */}
          {horaActual !== null && (
            <div
              className="absolute z-20 pointer-events-none"
              style={{ top: horaActual, left: 52, right: 0 }}
            >
              <div className="relative flex items-center">
                <div className="w-2 h-2 rounded-full bg-red-500 -ml-1 shrink-0" />
                <div className="flex-1 h-px bg-red-400 opacity-70" />
              </div>
            </div>
          )}

          {/* Columna por doctor */}
          {doctores.map((doc) => {
            const entriesDoctor = citasPorDoctor[doc.id] ?? [];
            return (
              <div
                key={doc.id}
                className="relative flex-1 min-w-0 border-l border-gray-200"
              >
                {/* Fondo con líneas */}
                {FRANJAS.map((franja, i) => {
                  const isDragOver = dropTarget?.docId === doc.id && dropTarget?.franja === franja;
                  return (
                    <div
                      key={franja}
                      className={`absolute w-full cursor-pointer transition-colors ${
                        isDragOver
                          ? "bg-amber-100 border-t-2 border-amber-400"
                          : franja.endsWith(":00")
                          ? "hover:bg-blue-50/60 border-t border-gray-200"
                          : franja.endsWith(":30")
                          ? "hover:bg-blue-50/60 border-t border-dashed border-gray-100"
                          : "hover:bg-blue-50/60"
                      }`}
                      style={{ top: i * ROW_H, height: ROW_H }}
                      onClick={() => handleSlotClick(doc.id, franja)}
                      onDragOver={(e) => handleDragOver(e, doc.id, franja)}
                      onDragLeave={() => setDropTarget(null)}
                      onDrop={(e) => handleDrop(e, doc.id, franja)}
                    />
                  );
                })}

                {/* Citas posicionadas absolutamente */}
                {entriesDoctor.map(({ cita, filaInicio, filas }) => {
                  const top = filaInicio * ROW_H;
                  const height = filas * ROW_H - 2;
                  const colorEstado = COLORES_ESTADO_CITA[cita.estado] ?? "#6B7280";
                  const colorDoctor = doc.color_agenda ?? "#6B7280";
                  const horaStr = format(parseISO(cita.fecha_hora), "HH:mm");

                  return (
                    <div
                      key={cita.id}
                      className="absolute left-0.5 right-0.5 rounded overflow-hidden cursor-pointer z-10 shadow-sm hover:shadow-md hover:brightness-95 transition-all"
                      style={{
                        top,
                        height,
                        backgroundColor: colorEstado + "22",
                        borderLeft: `3px solid ${colorDoctor}`,
                        borderTop: `1px solid ${colorEstado}44`,
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onCitaClick(cita);
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setMenu({ cita, x: e.clientX, y: e.clientY });
                      }}
                      title={`${cita.paciente ? `${cita.paciente.apellidos}, ${cita.paciente.nombre}` : "—"} · ${horaStr} · ${cita.duracion_min}min · ${cita.motivo ?? cita.estado}`}
                    >
                      <div className="px-1 py-0.5 h-full overflow-hidden flex flex-col">
                        {/* Fila superior: hora + estado */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <span className="text-[9px] font-bold tabular-nums" style={{ color: colorDoctor }}>{horaStr}</span>
                          <span className="text-[8px] font-medium px-1 rounded-sm leading-tight"
                            style={{ backgroundColor: colorEstado + "33", color: colorEstado }}>
                            {ETIQUETAS_ESTADO[cita.estado] ?? cita.estado}
                          </span>
                          {cita.es_urgencia && (
                            <span className="text-[8px] font-bold text-red-600 ml-auto">URG</span>
                          )}
                        </div>
                        {/* Nombre paciente */}
                        <p className="text-[10px] font-semibold leading-tight text-gray-800 truncate mt-px">
                          {cita.paciente
                            ? `${cita.paciente.apellidos}, ${cita.paciente.nombre}`
                            : "—"}
                        </p>
                        {filas >= 3 && cita.motivo && (
                          <p className="text-[9px] text-gray-500 truncate leading-tight mt-0.5">
                            {cita.motivo}
                          </p>
                        )}
                        {filas >= 3 && cita.paciente?.telefono && (
                          <p className="text-[9px] text-gray-400 truncate">{cita.paciente.telefono}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Menú contextual flotante */}
      {menu && (
        <MenuContextualCita
          cita={menu.cita}
          x={menu.x}
          y={menu.y}
          onCerrar={cerrarMenu}
          onEditar={() => { cerrarMenu(); onCitaClick(menu.cita); }}
          onAccion={onAccionRapida ? (accion) => { cerrarMenu(); onAccionRapida(menu.cita, accion); } : undefined}
        />
      )}
    </div>
  );
}

// ─── Menú contextual ──────────────────────────────────────────────────────────

function MenuContextualCita({
  cita,
  x,
  y,
  onEditar,
  onAccion,
}: {
  cita: Cita;
  x: number;
  y: number;
  onCerrar: () => void;
  onEditar: () => void;
  onAccion?: (accion: AccionRapidaCita) => void;
}) {
  // Ajustar posición para que no se salga de la ventana
  const menuW = 200;
  const left = x + menuW > window.innerWidth ? x - menuW : x;
  const top = y + 140 > window.innerHeight ? y - 140 : y;

  const yaAnulada = cita.estado === "anulada";

  return (
    <div
      className="fixed z-50 rounded-lg border border-gray-200 bg-white shadow-xl py-1 text-sm"
      style={{ left, top, minWidth: menuW }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Cabecera de contexto */}
      <div className="px-3 py-1.5 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-800 truncate">
          {cita.paciente ? `${cita.paciente.apellidos}, ${cita.paciente.nombre}` : "Cita"}
        </p>
        <p className="text-[10px] text-gray-400">{cita.motivo ?? cita.estado}</p>
      </div>

      <button
        className="w-full text-left px-3 py-1.5 text-gray-700 hover:bg-gray-50 flex items-center gap-2"
        onClick={onEditar}
      >
        <span className="text-gray-400">✏️</span> Editar cita
      </button>

      {onAccion && !yaAnulada && (
        <>
          <button
            className="w-full text-left px-3 py-1.5 text-amber-700 hover:bg-amber-50 flex items-center gap-2"
            onClick={() => onAccion("telefonear")}
          >
            <span>📞</span> Pasar a Telefonear
          </button>
          <div className="border-t border-gray-100 my-0.5" />
          <button
            className="w-full text-left px-3 py-1.5 text-red-600 hover:bg-red-50 flex items-center gap-2"
            onClick={() => onAccion("anular")}
          >
            <span>✕</span> Anular cita
          </button>
        </>
      )}
    </div>
  );
}
