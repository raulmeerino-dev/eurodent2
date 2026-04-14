/**
 * TelefonearPanel — Panel lateral fijo con la cola de citas por reubicar.
 * Siempre visible en la agenda (como en Eurodent 2000).
 * - "Dar nueva cita" abre CitaModal con el paciente pre-seleccionado.
 * - Arrastrando una entrada al grid se pre-rellena también la fecha/hora y doctor.
 */
import { useTelefonearPendientes } from "../../hooks/useCitas";
import type { Doctor } from "../../types";

interface Props {
  doctorFiltro?: string;
  doctores: Doctor[];
  onReubicar: (entradaId: string, pacienteId: string, doctorId: string, pacienteLabel: string) => void;
}

export const DRAG_TYPE = "application/x-telefonear";

export default function TelefonearPanel({ doctorFiltro, doctores, onReubicar }: Props) {
  const { data: pendientes, isLoading } = useTelefonearPendientes(doctorFiltro);

  if (isLoading) {
    return (
      <div className="w-56 shrink-0 border-l border-gray-200 bg-white p-3">
        <p className="text-xs text-gray-400">Cargando...</p>
      </div>
    );
  }

  const lista = Array.isArray(pendientes) ? pendientes : [];

  return (
    <div className="w-56 shrink-0 border-l border-gray-200 bg-white flex flex-col overflow-hidden">
      {/* Cabecera */}
      <div className="border-b border-gray-200 px-3 py-2 bg-amber-50">
        <h3 className="text-xs font-semibold text-amber-800 uppercase tracking-wide">
          Telefonear
        </h3>
        <p className="text-[10px] text-amber-600">{lista.length} pendiente{lista.length !== 1 ? "s" : ""}</p>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto">
        {lista.length === 0 ? (
          <div className="flex h-full items-center justify-center p-4 text-center">
            <p className="text-xs text-gray-400">Sin citas pendientes de reubicar</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {lista.map((entrada) => {
              const doctor = doctores.find((d) => d.id === entrada.doctor_id);
              const paciente = entrada.paciente;
              const label = paciente
                ? `${paciente.apellidos}, ${paciente.nombre}`
                : "Paciente desconocido";

              return (
                <li
                  key={entrada.id}
                  className="px-3 py-2.5 hover:bg-gray-50 cursor-grab active:cursor-grabbing"
                  draggable
                  title="Arrastra al hueco de la agenda para asignar fecha y hora"
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = "copy";
                    e.dataTransfer.setData(
                      DRAG_TYPE,
                      JSON.stringify({
                        entradaId: entrada.id,
                        pacienteId: entrada.paciente_id,
                        doctorId: entrada.doctor_id,
                        pacienteLabel: label,
                      }),
                    );
                  }}
                >
                  <p className="text-xs font-medium text-gray-800 truncate">{label}</p>
                  <p className="text-[10px] text-gray-500 truncate mt-0.5">
                    {doctor?.nombre ?? "—"}
                  </p>
                  {entrada.motivo && (
                    <p className="text-[10px] text-gray-400 truncate">{entrada.motivo}</p>
                  )}
                  <button
                    className="mt-1.5 w-full rounded bg-amber-100 px-2 py-1 text-[10px] font-medium text-amber-800 hover:bg-amber-200 transition-colors"
                    onClick={() =>
                      onReubicar(entrada.id, entrada.paciente_id, entrada.doctor_id, label)
                    }
                  >
                    Dar nueva cita
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
