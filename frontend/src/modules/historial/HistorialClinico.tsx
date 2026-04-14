/**
 * HistorialClinico - historial cronologico del paciente.
 * El odontograma operativo vive en presupuestos/planes, no como acumulado historico.
 */
import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import RegistrarTratamientoModal from "./RegistrarTratamientoModal";
import { useHistorialPaciente, useEliminarEntradaHistorial } from "../../hooks/useTratamientos";
import { COLOR_TRATAMIENTO } from "../../components/odontograma/dientes";
import { useAuthStore } from "../../store/authStore";

interface Props {
  pacienteId: string;
}

function colorParaTratamiento(nombre: string): string {
  const n = nombre.toLowerCase();
  if (n.includes("extrac")) return COLOR_TRATAMIENTO.extraccion;
  if (n.includes("endod")) return COLOR_TRATAMIENTO.endodoncia;
  if (n.includes("corona") || n.includes("puente")) return COLOR_TRATAMIENTO.corona;
  if (n.includes("implant")) return COLOR_TRATAMIENTO.implante;
  if (n.includes("ortod")) return COLOR_TRATAMIENTO.ortodoncia;
  return COLOR_TRATAMIENTO.obturacion;
}

export default function HistorialClinico({ pacienteId }: Props) {
  const [piezaFiltro, setPiezaFiltro] = useState<number | null>(null);
  const [registrando, setRegistrando] = useState(false);
  const user = useAuthStore((s) => s.user);
  const esAdmin = user?.rol === "admin";

  const { data: historial = [], isLoading } = useHistorialPaciente(pacienteId, piezaFiltro ?? undefined);
  const eliminarMutation = useEliminarEntradaHistorial();

  const piezasDisponibles = useMemo(
    () =>
      Array.from(
        new Set(
          historial
            .map((entrada) => entrada.pieza_dental)
            .filter((pieza): pieza is number => pieza !== null),
        ),
      ).sort((a, b) => a - b),
    [historial],
  );

  async function handleEliminar(id: string) {
    if (!confirm("¿Eliminar esta entrada del historial?")) return;
    await eliminarMutation.mutateAsync(id);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              Historial Clinico
            </p>
            <h3 className="text-lg font-semibold text-slate-900">
              Registro cronologico de actos clinicos
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              El odontograma operativo del plan se trabaja en presupuestos. Aquí se prioriza la lectura
              profesional por fecha, tratamiento, pieza y detalle.
            </p>
          </div>
          <button
            onClick={() => setRegistrando(true)}
            className="rounded-full bg-slate-900 px-4 py-2 text-xs font-medium text-white transition hover:bg-slate-800"
          >
            + Registrar tratamiento
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setPiezaFiltro(null)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              piezaFiltro === null
                ? "bg-slate-900 text-white"
                : "border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
            }`}
          >
            Todas las piezas
          </button>
          {piezasDisponibles.map((pieza) => (
            <button
              key={pieza}
              onClick={() => setPiezaFiltro(pieza)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                piezaFiltro === pieza
                  ? "bg-sky-600 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              Pieza {pieza}
            </button>
          ))}
          <span className="ml-auto text-xs text-slate-400">
            {historial.length} registro{historial.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-700">
            Evolucion clinica
            {piezaFiltro && <span className="ml-2 text-xs font-normal text-blue-600">Pieza {piezaFiltro}</span>}
          </h3>
        </div>

        {isLoading ? (
          <div className="py-8 text-center text-sm text-gray-400">Cargando historial...</div>
        ) : historial.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-400">
            {piezaFiltro
              ? `Sin tratamientos registrados para la pieza ${piezaFiltro}.`
              : "Sin tratamientos registrados."}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Fecha</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Tratamiento</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Pieza</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Caras</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Doctor</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Observaciones</th>
                {esAdmin && <th className="px-4 py-2" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {historial.map((h) => (
                <tr key={h.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-2 text-xs tabular-nums text-gray-500">
                    {format(parseISO(h.fecha), "dd/MM/yyyy")}
                  </td>
                  <td className="px-4 py-2 font-medium text-gray-800">
                    <span
                      className="mr-1.5 inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: colorParaTratamiento(h.tratamiento?.nombre ?? "") }}
                    />
                    {h.tratamiento?.nombre ?? "—"}
                    {h.tratamiento?.codigo && (
                      <span className="ml-1 text-xs text-gray-400">({h.tratamiento.codigo})</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-xs tabular-nums text-gray-600">{h.pieza_dental ?? "—"}</td>
                  <td className="px-4 py-2 font-mono text-xs text-gray-600">{h.caras || "—"}</td>
                  <td className="px-4 py-2 text-xs text-gray-500">{h.doctor?.nombre ?? "—"}</td>
                  <td className="max-w-xs px-4 py-2 text-xs text-gray-400">{h.observaciones || ""}</td>
                  {esAdmin && (
                    <td className="px-4 py-2">
                      <button
                        onClick={() => handleEliminar(h.id)}
                        className="text-xs text-red-400 hover:text-red-600"
                        title="Eliminar entrada"
                      >
                        ×
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {registrando && (
        <RegistrarTratamientoModal
          pacienteId={pacienteId}
          piezaPreseleccionada={piezaFiltro}
          onClose={() => setRegistrando(false)}
        />
      )}
    </div>
  );
}
