/**
 * PresupuestosPage — Lista de presupuestos con filtros y acceso al editor.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { usePresupuestos, useCrearPresupuesto } from "../../hooks/usePresupuestos";
import { useDoctores } from "../../hooks/useDoctores";
import BuscadorPacientes from "../pacientes/BuscadorPacientes";
import { formatEUR } from "../../utils";
import type { Paciente } from "../../types";

const COLOR_ESTADO: Record<string, string> = {
  borrador: "bg-gray-100 text-gray-600",
  presentado: "bg-blue-100 text-blue-700",
  aceptado: "bg-green-100 text-green-700",
  rechazado: "bg-red-100 text-red-600",
  parcial: "bg-amber-100 text-amber-700",
};

export default function PresupuestosPage() {
  const navigate = useNavigate();
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroPacienteId, setFiltroPacienteId] = useState<string | undefined>();
  const [filtroPacienteLabel, setFiltroPacienteLabel] = useState("");
  const [creandoModal, setCreandoModal] = useState(false);

  const { data: presupuestos = [], isLoading } = usePresupuestos({
    estado: filtroEstado || undefined,
    paciente_id: filtroPacienteId,
  });

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="shrink-0 flex items-center gap-3 mb-3 flex-wrap">
        <div className="w-64">
          <BuscadorPacientes
            onSelect={(p: Paciente) => {
              setFiltroPacienteId(p.id);
              setFiltroPacienteLabel(`${p.apellidos}, ${p.nombre}`);
            }}
            placeholder="Filtrar por paciente..."
          />
        </div>
        {filtroPacienteId && (
          <div className="flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs text-blue-700">
            {filtroPacienteLabel}
            <button
              onClick={() => { setFiltroPacienteId(undefined); setFiltroPacienteLabel(""); }}
              className="ml-1 hover:text-blue-900"
            >×</button>
          </div>
        )}
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos los estados</option>
          {["borrador", "presentado", "aceptado", "rechazado", "parcial"].map((e) => (
            <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>
          ))}
        </select>
        <div className="flex-1" />
        <button
          onClick={() => setCreandoModal(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Nuevo presupuesto
        </button>
      </div>

      {/* Tabla */}
      <div className="flex-1 overflow-auto rounded-lg border border-gray-200 bg-white">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center text-sm text-gray-400">Cargando...</div>
        ) : presupuestos.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-gray-400">
            Sin presupuestos.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">#</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Paciente</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Doctor</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Fecha</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Estado</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500">Total</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500">Aceptado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {presupuestos.map((p) => (
                <tr
                  key={p.id}
                  className="cursor-pointer hover:bg-blue-50 transition-colors"
                  onClick={() => navigate(`/presupuestos/${p.id}`)}
                >
                  <td className="px-4 py-2.5 text-xs text-gray-400 tabular-nums">{p.numero}</td>
                  <td className="px-4 py-2.5 font-medium text-gray-800">
                    {p.paciente ? `${p.paciente.apellidos}, ${p.paciente.nombre}` : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">{p.doctor?.nombre ?? "—"}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-500 tabular-nums">
                    {format(new Date(p.fecha), "dd/MM/yyyy")}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${COLOR_ESTADO[p.estado]}`}>
                      {p.estado}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-right tabular-nums font-medium">
                    {formatEUR(p.total)}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-right tabular-nums text-green-700">
                    {p.total_aceptado > 0 ? formatEUR(p.total_aceptado) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {creandoModal && (
        <NuevoPresupuestoModal onClose={() => setCreandoModal(false)} />
      )}
    </div>
  );
}

// ─── Modal nuevo presupuesto ──────────────────────────────────────────────────
export function NuevoPresupuestoModal({
  onClose,
  pacienteInicial = null,
}: {
  onClose: () => void;
  pacienteInicial?: Pick<Paciente, "id" | "nombre" | "apellidos"> | null;
}) {
  const navigate = useNavigate();
  const { data: doctores = [] } = useDoctores();
  const crearMut = useCrearPresupuesto();

  const [pacienteId, setPacienteId] = useState(pacienteInicial?.id ?? "");
  const [pacienteLabel, setPacienteLabel] = useState(
    pacienteInicial ? `${pacienteInicial.apellidos}, ${pacienteInicial.nombre}` : "",
  );
  const [doctorId, setDoctorId] = useState(doctores[0]?.id ?? "");
  const [fecha, setFecha] = useState(format(new Date(), "yyyy-MM-dd"));
  const [piePagina, setPiePagina] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pacienteId || !doctorId) return;
    const p = await crearMut.mutateAsync({
      paciente_id: pacienteId,
      doctor_id: doctorId,
      fecha,
      pie_pagina: piePagina || undefined,
    });
    onClose();
    navigate(`/presupuestos/${p.id}`);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-800">Nuevo presupuesto</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Paciente *</label>
            {pacienteId ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-800">{pacienteLabel}</span>
                <button type="button" onClick={() => { setPacienteId(""); setPacienteLabel(""); }}
                  className="text-xs text-gray-400 hover:text-red-500">cambiar</button>
              </div>
            ) : (
              <BuscadorPacientes
                autoFocus
                onSelect={(p: Paciente) => { setPacienteId(p.id); setPacienteLabel(`${p.apellidos}, ${p.nombre}`); }}
              />
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Doctor *</label>
            <select value={doctorId} onChange={(e) => setDoctorId(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required>
              <option value="">Seleccionar...</option>
              {doctores.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Fecha</label>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Pie de página</label>
            <input type="text" value={piePagina} onChange={(e) => setPiePagina(e.target.value)}
              placeholder="Texto opcional al pie del presupuesto..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={!pacienteId || !doctorId || crearMut.isPending}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {crearMut.isPending ? "Creando..." : "Crear presupuesto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
