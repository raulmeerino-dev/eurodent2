/**
 * CitaModal — Modal para crear o editar una cita.
 * Incluye búsqueda de paciente en línea y botones de estado rápido.
 * En modo edición: doctor editable, observaciones textarea, badge de estado en header.
 */
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import type { Cita, Doctor, EstadoCita } from "../../types";
import { buscarPacientes } from "../../api/pacientes";
import { useCrearCita, useActualizarCita, useAnularCita } from "../../hooks/useCitas";
import { marcarReubicada } from "../../api/citas";
import { COLORES_ESTADO_CITA } from "../../utils";

interface Props {
  cita?: Cita | null;
  fechaHoraInicial?: Date | null;
  doctorIdInicial?: string;
  pacienteIdInicial?: string;
  pacienteLabelInicial?: string;
  telefonearEntradaId?: string;   // si viene del panel Telefonear, marca como reubicada al crear
  doctores: Doctor[];
  onClose: () => void;
}

const ESTADOS: EstadoCita[] = ["programada", "confirmada", "en_clinica", "atendida", "falta", "anulada"];
const ETIQUETAS_ESTADO: Record<EstadoCita, string> = {
  programada: "Programada",
  confirmada: "Confirmada",
  en_clinica: "En clínica",
  atendida: "Atendida",
  falta: "Falta",
  anulada: "Anulada",
};
const DURACIONES = [10, 20, 30, 40, 60, 90, 120];

export default function CitaModal({ cita, fechaHoraInicial, doctorIdInicial, pacienteIdInicial, pacienteLabelInicial, telefonearEntradaId, doctores, onClose }: Props) {
  const esEdicion = !!cita;

  const [pacienteQuery, setPacienteQuery] = useState("");
  const [pacienteId, setPacienteId] = useState(cita?.paciente_id ?? pacienteIdInicial ?? "");
  const [pacienteLabel, setPacienteLabel] = useState(
    cita?.paciente ? `${cita.paciente.apellidos}, ${cita.paciente.nombre}` : (pacienteLabelInicial ?? ""),
  );
  const [doctorId, setDoctorId] = useState(cita?.doctor_id ?? doctorIdInicial ?? "");
  const [fechaHora, setFechaHora] = useState(
    cita
      ? format(new Date(cita.fecha_hora), "yyyy-MM-dd'T'HH:mm")
      : fechaHoraInicial
      ? format(fechaHoraInicial, "yyyy-MM-dd'T'HH:mm")
      : "",
  );
  const [duracion, setDuracion] = useState(cita?.duracion_min ?? 30);
  const [motivo, setMotivo] = useState(cita?.motivo ?? "");
  const [observaciones, setObservaciones] = useState(cita?.observaciones ?? "");
  const [esUrgencia, setEsUrgencia] = useState(cita?.es_urgencia ?? false);
  const [estado, setEstado] = useState<EstadoCita>(cita?.estado ?? "programada");
  const [busquedaAbierta, setBusquedaAbierta] = useState(false);

  const qc = useQueryClient();
  const crearMutation = useCrearCita();
  const actualizarMutation = useActualizarCita();
  const anularMutation = useAnularCita();

  const { data: resultadosBusqueda } = useQuery({
    queryKey: ["pacientes-buscar", pacienteQuery],
    queryFn: () => buscarPacientes(pacienteQuery),
    enabled: pacienteQuery.length >= 2,
    staleTime: 5_000,
    select: (data) => (Array.isArray(data) ? data : []),
  });

  const error =
    crearMutation.error?.message ?? actualizarMutation.error?.message ?? null;
  const isPending = crearMutation.isPending || actualizarMutation.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pacienteId || !doctorId || !fechaHora) return;

    if (esEdicion && cita) {
      await actualizarMutation.mutateAsync({
        id: cita.id,
        data: {
          doctor_id: doctorId,
          fecha_hora: new Date(fechaHora).toISOString(),
          duracion_min: duracion,
          estado,
          es_urgencia: esUrgencia,
          motivo: motivo || undefined,
          observaciones: observaciones || undefined,
        },
      });
    } else {
      const nuevaCita = await crearMutation.mutateAsync({
        paciente_id: pacienteId,
        doctor_id: doctorId,
        fecha_hora: new Date(fechaHora).toISOString(),
        duracion_min: duracion,
        es_urgencia: esUrgencia,
        motivo: motivo || undefined,
        observaciones: observaciones || undefined,
      });
      // Si viene del panel Telefonear, marcar la entrada como reubicada
      if (telefonearEntradaId && nuevaCita?.id) {
        try {
          await marcarReubicada(telefonearEntradaId, nuevaCita.id);
          qc.invalidateQueries({ queryKey: ["telefonear"] });
        } catch {
          // No bloquear el flujo si falla el marcado
        }
      }
    }
    onClose();
  }

  async function handleAnular() {
    if (!cita) return;
    if (!confirm("¿Anular esta cita?")) return;
    await anularMutation.mutateAsync(cita.id);
    onClose();
  }

  const estadoColor = COLORES_ESTADO_CITA[estado] ?? "#6B7280";
  const fechaEsPasada = fechaHora && new Date(fechaHora) < new Date() && !esEdicion;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg rounded-xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-gray-800">
              {esEdicion ? "Editar cita" : "Nueva cita"}
            </h2>
            {esEdicion && (
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-full"
                style={{ backgroundColor: estadoColor + "22", color: estadoColor }}
              >
                {ETIQUETAS_ESTADO[estado]}
              </span>
            )}
            {(cita?.es_urgencia || esUrgencia) && (
              <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                URG
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100">
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {/* Paciente */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Paciente</label>
            {esEdicion ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-800 font-medium">{pacienteLabel || "—"}</span>
                {cita?.paciente?.num_historial && (
                  <span className="text-xs text-gray-400">Hx{cita.paciente.num_historial}</span>
                )}
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar por nombre, código o historial..."
                  value={pacienteId ? pacienteLabel : pacienteQuery}
                  onChange={(e) => {
                    setPacienteQuery(e.target.value);
                    setPacienteLabel("");
                    setPacienteId("");
                    setBusquedaAbierta(true);
                  }}
                  onFocus={() => setBusquedaAbierta(true)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8"
                  required={!pacienteId}
                />
                {pacienteId && (
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-green-500 text-sm">✓</span>
                )}
                {busquedaAbierta && !pacienteId && Array.isArray(resultadosBusqueda) && resultadosBusqueda.length > 0 && (
                  <ul className="absolute z-20 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg max-h-48 overflow-y-auto">
                    {resultadosBusqueda.map((p) => (
                      <li
                        key={p.id}
                        className="cursor-pointer px-3 py-2 text-sm hover:bg-blue-50 flex items-center justify-between"
                        onMouseDown={() => {
                          setPacienteId(p.id);
                          setPacienteLabel(`${p.apellidos}, ${p.nombre}`);
                          setPacienteQuery("");
                          setBusquedaAbierta(false);
                        }}
                      >
                        <span className="font-medium">{p.apellidos}, {p.nombre}</span>
                        <span className="text-gray-400 text-xs">Hx{p.num_historial}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Doctor — editable en ambos modos */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Doctor</label>
            <select
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Seleccionar doctor...</option>
              {doctores.map((d) => (
                <option key={d.id} value={d.id}>{d.nombre}</option>
              ))}
            </select>
          </div>

          {/* Fecha/hora + duración */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Fecha y hora</label>
              <input
                type="datetime-local"
                value={fechaHora}
                onChange={(e) => setFechaHora(e.target.value)}
                className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  fechaEsPasada ? "border-amber-400 bg-amber-50" : "border-gray-300"
                }`}
                required
              />
              {fechaEsPasada && (
                <p className="text-[10px] text-amber-600 mt-0.5">La fecha está en el pasado</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Duración</label>
              <select
                value={duracion}
                onChange={(e) => setDuracion(Number(e.target.value))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {DURACIONES.map((m) => (
                  <option key={m} value={m}>{m} min</option>
                ))}
              </select>
            </div>
          </div>

          {/* Estado (solo en edición) */}
          {esEdicion && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Estado</label>
              <div className="flex flex-wrap gap-1.5">
                {ESTADOS.map((e) => (
                  <button
                    type="button"
                    key={e}
                    onClick={() => setEstado(e)}
                    className="rounded-full px-3 py-1 text-xs font-medium transition-all"
                    style={{
                      backgroundColor: COLORES_ESTADO_CITA[e] + (estado === e ? "33" : "15"),
                      color: COLORES_ESTADO_CITA[e],
                      outline: estado === e ? `2px solid ${COLORES_ESTADO_CITA[e]}` : "2px solid transparent",
                      outlineOffset: "1px",
                      opacity: estado === e ? 1 : 0.65,
                    }}
                  >
                    {ETIQUETAS_ESTADO[e]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Motivo */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Motivo</label>
            <input
              type="text"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              maxLength={500}
              placeholder="Motivo de la visita..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Observaciones</label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={2}
              maxLength={1000}
              placeholder="Notas internas..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Urgencia */}
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <input
              type="checkbox"
              checked={esUrgencia}
              onChange={(e) => setEsUrgencia(e.target.checked)}
              className="rounded border-gray-300 text-red-600 focus:ring-red-500"
            />
            <span className="text-gray-700">Marcar como urgencia</span>
          </label>

          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>}

          {/* Botones */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            {esEdicion ? (
              <button
                type="button"
                onClick={handleAnular}
                disabled={isPending || cita?.estado === "anulada"}
                className="text-sm text-red-600 hover:text-red-800 disabled:opacity-40"
              >
                Anular cita
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isPending || !pacienteId || !doctorId}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isPending ? "Guardando..." : esEdicion ? "Guardar cambios" : "Crear cita"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
