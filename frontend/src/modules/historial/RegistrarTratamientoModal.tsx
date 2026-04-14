/**
 * RegistrarTratamientoModal — Modal para añadir un tratamiento al historial.
 * Flujo: seleccionar familia → seleccionar tratamiento → (si requiere_pieza) ya elegido en odontograma
 *        → (si requiere_caras) seleccionar caras → fecha + observaciones → guardar
 */
import { useState } from "react";
import { format } from "date-fns";
import { useFamilias, useTratamientos, useRegistrarTratamiento } from "../../hooks/useTratamientos";
import { useDoctores } from "../../hooks/useDoctores";
import { SelectorCaras } from "../../components/odontograma/Odontograma";
import type { Cara } from "../../components/odontograma/dientes";

interface Props {
  pacienteId: string;
  piezaPreseleccionada?: number | null;
  onClose: () => void;
}

export default function RegistrarTratamientoModal({ pacienteId, piezaPreseleccionada, onClose }: Props) {
  const hoy = format(new Date(), "yyyy-MM-dd");

  const [familiaId, setFamiliaId] = useState("");
  const [tratamientoId, setTratamientoId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [pieza, setPieza] = useState<number | "">(piezaPreseleccionada ?? "");
  const [caras, setCaras] = useState<Cara[]>([]);
  const [fecha, setFecha] = useState(hoy);
  const [observaciones, setObservaciones] = useState("");

  const { data: familias = [] } = useFamilias();
  const { data: tratamientos = [] } = useTratamientos({ familia_id: familiaId || undefined });
  const { data: doctores = [] } = useDoctores();
  const mutation = useRegistrarTratamiento();

  const tratamientoSel = tratamientos.find((t) => t.id === tratamientoId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tratamientoId || !doctorId || !fecha) return;

    await mutation.mutateAsync({
      paciente_id: pacienteId,
      tratamiento_id: tratamientoId,
      doctor_id: doctorId,
      pieza_dental: pieza !== "" ? pieza : undefined,
      caras: caras.length > 0 ? caras.join("") : undefined,
      fecha,
      observaciones: observaciones || undefined,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-800">Registrar tratamiento</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {/* Familia */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Familia</label>
            <select
              value={familiaId}
              onChange={(e) => { setFamiliaId(e.target.value); setTratamientoId(""); }}
              className={cls}
              required
            >
              <option value="">Seleccionar familia...</option>
              {familias.map((f) => (
                <option key={f.id} value={f.id}>{f.nombre}</option>
              ))}
            </select>
          </div>

          {/* Tratamiento */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Tratamiento</label>
            <select
              value={tratamientoId}
              onChange={(e) => setTratamientoId(e.target.value)}
              className={cls}
              required
              disabled={!familiaId}
            >
              <option value="">Seleccionar tratamiento...</option>
              {tratamientos.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}{t.codigo ? ` (${t.codigo})` : ""}
                </option>
              ))}
            </select>
            {tratamientoSel && (
              <p className="mt-1 text-xs text-gray-400">
                Precio base: {tratamientoSel.precio} € (IVA {tratamientoSel.iva_porcentaje}%)
              </p>
            )}
          </div>

          {/* Pieza dental */}
          {(tratamientoSel?.requiere_pieza || piezaPreseleccionada) && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Pieza dental (FDI)</label>
              <input
                type="number"
                value={pieza}
                onChange={(e) => setPieza(e.target.value ? Number(e.target.value) : "")}
                min={11} max={85}
                className={cls}
                placeholder="Ej: 16"
              />
            </div>
          )}

          {/* Caras */}
          {tratamientoSel?.requiere_caras && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Caras</label>
              <SelectorCaras seleccionadas={caras} onChange={setCaras} />
            </div>
          )}

          {/* Doctor */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Doctor</label>
            <select
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              className={cls}
              required
            >
              <option value="">Seleccionar doctor...</option>
              {doctores.map((d) => (
                <option key={d.id} value={d.id}>{d.nombre}</option>
              ))}
            </select>
          </div>

          {/* Fecha */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Fecha</label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className={cls}
              required
            />
          </div>

          {/* Observaciones */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Observaciones</label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={2}
              className={`${cls} resize-none`}
              placeholder="Opcional..."
            />
          </div>

          {mutation.error && (
            <p className="text-sm text-red-600">{mutation.error.message}</p>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={mutation.isPending || !tratamientoId || !doctorId}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {mutation.isPending ? "Guardando..." : "Registrar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const cls = "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
