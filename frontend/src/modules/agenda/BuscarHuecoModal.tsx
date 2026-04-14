/**
 * BuscarHuecoModal — Busca huecos libres en la agenda de un doctor.
 * Muestra lista de slots disponibles; al seleccionar uno abre CitaModal.
 */
import { useState } from "react";
import { format, addDays } from "date-fns";
import { es } from "date-fns/locale";
import type { Doctor } from "../../types";
import { useBuscarHuecos } from "../../hooks/useCitas";
import type { BuscarHuecoRequest } from "../../api/citas";

interface Props {
  doctores: Doctor[];
  onSeleccionar: (doctorId: string, fechaHora: Date, duracion: number) => void;
  onClose: () => void;
}

export default function BuscarHuecoModal({ doctores, onSeleccionar, onClose }: Props) {
  const hoy = new Date();
  const [doctorId, setDoctorId] = useState(doctores[0]?.id ?? "");
  const [duracion, setDuracion] = useState(30);
  const [desde, setDesde] = useState(format(hoy, "yyyy-MM-dd"));
  const [hasta, setHasta] = useState(format(addDays(hoy, 14), "yyyy-MM-dd"));
  const [soloManana, setSoloManana] = useState(false);
  const [soloTarde, setSoloTarde] = useState(false);
  const [buscarReq, setBuscarReq] = useState<BuscarHuecoRequest | null>(null);

  const { data: huecos, isFetching, error } = useBuscarHuecos(buscarReq);

  function handleBuscar() {
    if (!doctorId) return;
    setBuscarReq({
      doctor_id: doctorId,
      duracion_min: duracion,
      desde: new Date(desde + "T00:00:00").toISOString(),
      hasta: new Date(hasta + "T23:59:59").toISOString(),
      solo_manana: soloManana,
      solo_tarde: soloTarde,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-800">Buscar hueco libre</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">
            &times;
          </button>
        </div>

        {/* Formulario */}
        <div className="px-5 py-4 space-y-3 border-b border-gray-100">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Doctor</label>
              <select
                value={doctorId}
                onChange={(e) => setDoctorId(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {doctores.map((d) => (
                  <option key={d.id} value={d.id}>{d.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Duración</label>
              <select
                value={duracion}
                onChange={(e) => setDuracion(Number(e.target.value))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {[10, 20, 30, 40, 60, 90].map((m) => (
                  <option key={m} value={m}>{m} min</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Desde</label>
              <input
                type="date"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Hasta</label>
              <input
                type="date"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={soloManana}
                onChange={(e) => {
                  setSoloManana(e.target.checked);
                  if (e.target.checked) setSoloTarde(false);
                }}
                className="rounded border-gray-300 text-blue-600"
              />
              <span className="text-gray-700">Solo mañana</span>
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={soloTarde}
                onChange={(e) => {
                  setSoloTarde(e.target.checked);
                  if (e.target.checked) setSoloManana(false);
                }}
                className="rounded border-gray-300 text-blue-600"
              />
              <span className="text-gray-700">Solo tarde</span>
            </label>
          </div>

          <button
            onClick={handleBuscar}
            disabled={!doctorId || isFetching}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isFetching ? "Buscando..." : "Buscar huecos"}
          </button>
        </div>

        {/* Resultados */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          {error && (
            <p className="text-sm text-red-600">Error al buscar huecos.</p>
          )}
          {huecos && huecos.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">
              No se encontraron huecos libres en ese rango.
            </p>
          )}
          {huecos && huecos.length > 0 && (
            <ul className="space-y-1">
              {huecos.map((h, i) => {
                const inicio = new Date(h.fecha_hora_inicio);
                const doctor = doctores.find((d) => d.id === h.doctor_id);
                return (
                  <li
                    key={i}
                    className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 hover:bg-blue-50 cursor-pointer"
                    onClick={() => {
                      onSeleccionar(h.doctor_id, inicio, h.duracion_min);
                      onClose();
                    }}
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {format(inicio, "EEEE d MMM", { locale: es })}
                        {" · "}
                        {format(inicio, "HH:mm")}
                      </p>
                      <p className="text-xs text-gray-500">{doctor?.nombre} — {h.duracion_min} min</p>
                    </div>
                    <span className="text-blue-600 text-sm font-medium">Seleccionar</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
