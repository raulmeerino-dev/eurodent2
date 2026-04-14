/**
 * PacienteFormModal — Modal para crear o editar un paciente.
 */
import { useState } from "react";
import type { Paciente } from "../../types";
import { useCrearPaciente, useActualizarPaciente } from "../../hooks/usePacientes";
import type { PacienteCreate } from "../../api/pacientes";

interface Props {
  paciente?: Paciente | null;
  onClose: () => void;
}

export default function PacienteFormModal({ paciente, onClose }: Props) {
  const esEdicion = !!paciente;

  const [form, setForm] = useState<PacienteCreate>({
    nombre: paciente?.nombre ?? "",
    apellidos: paciente?.apellidos ?? "",
    fecha_nacimiento: paciente?.fecha_nacimiento ?? undefined,
    dni_nie: paciente?.dni_nie ?? "",
    telefono: paciente?.telefono ?? "",
    telefono2: paciente?.telefono2 ?? "",
    email: paciente?.email ?? "",
    direccion: paciente?.direccion ?? "",
    codigo_postal: paciente?.codigo_postal ?? "",
    ciudad: paciente?.ciudad ?? "",
    provincia: paciente?.provincia ?? "",
    no_correo: paciente?.no_correo ?? false,
    observaciones: paciente?.observaciones ?? "",
  });

  const crearMutation = useCrearPaciente();
  const actualizarMutation = useActualizarPaciente();
  const isPending = crearMutation.isPending || actualizarMutation.isPending;
  const error = crearMutation.error?.message ?? actualizarMutation.error?.message ?? null;

  function set(field: keyof PacienteCreate, value: string | boolean) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Limpiar cadenas vacías → undefined para no sobrescribir con ""
    const payload: PacienteCreate = Object.fromEntries(
      Object.entries(form).map(([k, v]) => [k, v === "" ? undefined : v]),
    ) as PacienteCreate;

    if (esEdicion && paciente) {
      await actualizarMutation.mutateAsync({ id: paciente.id, data: payload });
    } else {
      await crearMutation.mutateAsync(payload);
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 shrink-0">
          <h2 className="text-base font-semibold text-gray-800">
            {esEdicion ? "Editar paciente" : "Nuevo paciente"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">
            &times;
          </button>
        </div>

        {/* Formulario scrollable */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
          <div className="px-6 py-4 space-y-5">
            {/* Datos personales */}
            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Datos personales
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 grid grid-cols-2 gap-3">
                  <Field label="Apellidos *">
                    <input
                      type="text" required maxLength={150}
                      value={form.apellidos}
                      onChange={(e) => set("apellidos", e.target.value)}
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Nombre *">
                    <input
                      type="text" required maxLength={100}
                      value={form.nombre}
                      onChange={(e) => set("nombre", e.target.value)}
                      className={inputCls}
                    />
                  </Field>
                </div>
                <Field label="Fecha nacimiento">
                  <input
                    type="date"
                    value={form.fecha_nacimiento ?? ""}
                    onChange={(e) => set("fecha_nacimiento", e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Field label="DNI / NIE">
                  <input
                    type="text" maxLength={20}
                    value={form.dni_nie ?? ""}
                    onChange={(e) => set("dni_nie", e.target.value)}
                    className={inputCls}
                    placeholder="12345678A"
                  />
                </Field>
              </div>
            </section>

            {/* Contacto */}
            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Contacto
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Teléfono">
                  <input
                    type="tel" maxLength={20}
                    value={form.telefono ?? ""}
                    onChange={(e) => set("telefono", e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Field label="Teléfono 2">
                  <input
                    type="tel" maxLength={20}
                    value={form.telefono2 ?? ""}
                    onChange={(e) => set("telefono2", e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Field label="Email" className="col-span-2">
                  <input
                    type="email" maxLength={200}
                    value={form.email ?? ""}
                    onChange={(e) => set("email", e.target.value)}
                    className={inputCls}
                  />
                </Field>
              </div>
            </section>

            {/* Dirección */}
            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Dirección
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Dirección" className="col-span-2">
                  <input
                    type="text"
                    value={form.direccion ?? ""}
                    onChange={(e) => set("direccion", e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Field label="C.P.">
                  <input
                    type="text" maxLength={10}
                    value={form.codigo_postal ?? ""}
                    onChange={(e) => set("codigo_postal", e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Field label="Ciudad">
                  <input
                    type="text" maxLength={100}
                    value={form.ciudad ?? ""}
                    onChange={(e) => set("ciudad", e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <Field label="Provincia">
                  <input
                    type="text" maxLength={100}
                    value={form.provincia ?? ""}
                    onChange={(e) => set("provincia", e.target.value)}
                    className={inputCls}
                  />
                </Field>
              </div>
            </section>

            {/* Observaciones */}
            <section>
              <Field label="Observaciones">
                <textarea
                  rows={3}
                  value={form.observaciones ?? ""}
                  onChange={(e) => set("observaciones", e.target.value)}
                  className={`${inputCls} resize-none`}
                />
              </Field>
              <label className="mt-3 flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.no_correo}
                  onChange={(e) => set("no_correo", e.target.checked)}
                  className="rounded border-gray-300"
                />
                <span className="text-gray-700">No enviar correspondencia / circulares</span>
              </label>
            </section>

            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-6 py-3 shrink-0">
          <button
            type="button" onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit as any}
            disabled={isPending}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? "Guardando..." : esEdicion ? "Guardar cambios" : "Crear paciente"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const inputCls =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}
