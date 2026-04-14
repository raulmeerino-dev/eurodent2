/**
 * FacturacionPage — Lista de facturas con filtros.
 * Acceso al FacturaEditor para ver/editar una factura.
 * Botón para crear factura rápida desde cero.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { useFacturas, useCrearFactura, useFormasPago, useRegistrarCobro } from "../../hooks/useFacturas";
import BuscadorPacientes from "../pacientes/BuscadorPacientes";
import { formatEUR } from "../../utils";
import { getHistorialSinFacturar, type HistorialSinFacturar } from "../../api/facturas";
import type { Paciente, Factura } from "../../types";

type EstadoFilter = "" | "emitida" | "cobrada" | "parcial" | "anulada";

const COLOR_ESTADO: Record<string, string> = {
  emitida: "bg-blue-100 text-blue-700",
  cobrada: "bg-green-100 text-green-700",
  parcial: "bg-amber-100 text-amber-700",
  anulada: "bg-gray-100 text-gray-500",
};

export default function FacturacionPage() {
  const navigate = useNavigate();
  const [filtroEstado, setFiltroEstado] = useState<EstadoFilter>("");
  const [filtroPacienteId, setFiltroPacienteId] = useState<string | undefined>();
  const [filtroPacienteLabel, setFiltroPacienteLabel] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [creandoModal, setCreandoModal] = useState(false);
  const [cobrandoFactura, setCobrandoFactura] = useState<Factura | null>(null);

  const { data: facturas = [], isLoading } = useFacturas({
    estado: filtroEstado || undefined,
    paciente_id: filtroPacienteId,
    fecha_desde: fechaDesde || undefined,
    fecha_hasta: fechaHasta || undefined,
  });

  const totalEmitido = facturas.reduce((s, f) => s + Number(f.total), 0);
  const totalCobrado = facturas.reduce((s, f) => s + Number(f.total_cobrado), 0);

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
          onChange={(e) => setFiltroEstado(e.target.value as EstadoFilter)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos los estados</option>
          {(["emitida", "cobrada", "parcial", "anulada"] as const).map((e) => (
            <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>
          ))}
        </select>
        <input
          type="date"
          value={fechaDesde}
          onChange={(e) => setFechaDesde(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          title="Desde"
        />
        <input
          type="date"
          value={fechaHasta}
          onChange={(e) => setFechaHasta(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          title="Hasta"
        />
        <div className="flex-1" />
        {/* Totales rápidos */}
        {facturas.length > 0 && (
          <div className="flex gap-4 text-xs text-gray-500 tabular-nums">
            <span>Total: <strong className="text-gray-800">{formatEUR(totalEmitido)}</strong></span>
            <span>Cobrado: <strong className="text-green-700">{formatEUR(totalCobrado)}</strong></span>
            <span>Pendiente: <strong className="text-red-600">{formatEUR(totalEmitido - totalCobrado)}</strong></span>
          </div>
        )}
        <button
          onClick={() => setCreandoModal(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Nueva factura
        </button>
      </div>

      {/* Tabla */}
      <div className="flex-1 overflow-auto rounded-lg border border-gray-200 bg-white">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center text-sm text-gray-400">Cargando...</div>
        ) : facturas.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-gray-400">Sin facturas.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Nº</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Paciente</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Fecha</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Tipo</th>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Estado</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500">Total</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500">Cobrado</th>
                <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500">Pendiente</th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-gray-500">Cobrar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {facturas.map((f) => (
                <tr
                  key={f.id}
                  className="cursor-pointer hover:bg-blue-50 transition-colors"
                  onClick={() => navigate(`/facturacion/${f.id}`)}
                >
                  <td className="px-4 py-2.5 text-xs text-gray-500 tabular-nums font-mono">
                    {f.serie}{String(f.numero).padStart(5, "0")}
                  </td>
                  <td className="px-4 py-2.5 font-medium text-gray-800">
                    {f.paciente ? `${f.paciente.apellidos}, ${f.paciente.nombre}` : "—"}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-500 tabular-nums">
                    {format(new Date(f.fecha), "dd/MM/yyyy")}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-500 capitalize">{f.tipo}</td>
                  <td className="px-4 py-2.5">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${COLOR_ESTADO[f.estado]}`}>
                      {f.estado}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-right tabular-nums font-medium">
                    {formatEUR(Number(f.total))}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-right tabular-nums text-green-700">
                    {Number(f.total_cobrado) > 0 ? formatEUR(Number(f.total_cobrado)) : "—"}
                  </td>
                  <td className={`px-4 py-2.5 text-xs text-right tabular-nums font-medium ${Number(f.pendiente) > 0 ? "text-red-600" : "text-gray-400"}`}>
                    {Number(f.pendiente) > 0 ? formatEUR(Number(f.pendiente)) : "✓"}
                  </td>
                  <td className="px-4 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                    {Number(f.pendiente) > 0 && f.estado !== "anulada" ? (
                      <button
                        onClick={() => setCobrandoFactura(f)}
                        className="rounded-md bg-green-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-green-700"
                      >
                        Cobrar
                      </button>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {creandoModal && (
        <NuevaFacturaModal onClose={() => setCreandoModal(false)} pacienteInicial={null} />
      )}
      {cobrandoFactura && (
        <CobrarModal
          factura={cobrandoFactura}
          onClose={() => setCobrandoFactura(null)}
        />
      )}
    </div>
  );
}

// ─── Modal cobro rápido ───────────────────────────────────────────────────────
function CobrarModal({ factura, onClose }: { factura: Factura; onClose: () => void }) {
  const { data: formasPago = [] } = useFormasPago();
  const registrarMut = useRegistrarCobro();
  const [importe, setImporte] = useState(String(Number(factura.pendiente ?? factura.total).toFixed(2)));
  const [formaPagoId, setFormaPagoId] = useState(formasPago[0]?.id ?? "");
  const [notas, setNotas] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await registrarMut.mutateAsync({ facturaId: factura.id, cobro: { importe: Number(importe), forma_pago_id: formaPagoId, notas: notas || undefined } });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-800">Registrar cobro</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {factura.paciente ? `${factura.paciente.apellidos}, ${factura.paciente.nombre}` : ""}
              {" · "}Pendiente: <span className="text-red-600 font-medium">{formatEUR(Number(factura.pendiente))}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Importe (€) *</label>
            <input
              type="number" min="0.01" step="0.01" required
              value={importe} onChange={(e) => setImporte(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Forma de pago *</label>
            <select
              value={formaPagoId} onChange={(e) => setFormaPagoId(e.target.value)} required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Seleccionar...</option>
              {formasPago.map((fp) => <option key={fp.id} value={fp.id}>{fp.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notas</label>
            <input
              value={notas} onChange={(e) => setNotas(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Opcional..."
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={registrarMut.isPending || !formaPagoId}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">
              {registrarMut.isPending ? "Guardando..." : "Registrar cobro"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Modal nueva factura ──────────────────────────────────────────────────────
export function NuevaFacturaModal({
  onClose,
  pacienteInicial,
}: {
  onClose: () => void;
  pacienteInicial?: Pick<Paciente, "id" | "nombre" | "apellidos"> | null;
}) {
  const navigate = useNavigate();
  const crearMut = useCrearFactura();
  const { data: formasPago = [] } = useFormasPago();

  // Paso 1: datos generales | Paso 2: selección de tratamientos
  const [paso, setPaso] = useState<1 | 2>(1);

  const [pacienteId, setPacienteId] = useState(pacienteInicial?.id ?? "");
  const [pacienteLabel, setPacienteLabel] = useState(
    pacienteInicial ? `${pacienteInicial.apellidos}, ${pacienteInicial.nombre}` : ""
  );
  const pacienteBloqueado = Boolean(pacienteInicial);
  const [fecha, setFecha] = useState(format(new Date(), "yyyy-MM-dd"));
  const [tipo, setTipo] = useState<"paciente" | "iguala" | "entidad">("paciente");
  const [formaPagoId, setFormaPagoId] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());

  const { data: sinFacturar = [], isLoading: cargandoHistorial } = useQuery({
    queryKey: ["historial-sin-facturar", pacienteId],
    queryFn: () => getHistorialSinFacturar(pacienteId),
    enabled: !!pacienteId && paso === 2,
  });

  function toggleTodo() {
    if (seleccionados.size === sinFacturar.length) {
      setSeleccionados(new Set());
    } else {
      setSeleccionados(new Set(sinFacturar.map((h) => h.id)));
    }
  }

  function toggleItem(id: string) {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const lineasSeleccionadas = sinFacturar.filter((h) => seleccionados.has(h.id));
  const totalSeleccionado = lineasSeleccionadas.reduce(
    (s, h) => s + Number(h.tratamiento_precio) * (1 + Number(h.tratamiento_iva) / 100),
    0
  );

  async function handleCrear() {
    if (!pacienteId) return;
    const lineas = lineasSeleccionadas.map((h) => ({
      historial_id: h.id,
      concepto: h.tratamiento_nombre + (h.pieza_dental ? ` (${h.pieza_dental}${h.caras ? `-${h.caras}` : ""})` : ""),
      precio_unitario: Number(h.tratamiento_precio),
      iva_porcentaje: Number(h.tratamiento_iva),
      cantidad: 1,
    }));
    const f = await crearMut.mutateAsync({
      paciente_id: pacienteId,
      fecha,
      tipo,
      forma_pago_id: formaPagoId || undefined,
      observaciones: observaciones || undefined,
      lineas,
    });
    onClose();
    navigate(`/facturacion/${f.id}`);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-800">Nueva factura</h2>
            {pacienteLabel && (
              <p className="text-xs text-gray-400 mt-0.5">{pacienteLabel}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">Paso {paso} de 2</span>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
          </div>
        </div>

        {/* Paso 1: Datos generales */}
        {paso === 1 && (
          <div className="px-5 py-4 space-y-4 overflow-y-auto">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Paciente *</label>
              {pacienteId ? (
                <div className="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
                  <span className="text-sm text-gray-800 flex-1">{pacienteLabel}</span>
                  {!pacienteBloqueado && (
                    <button type="button" onClick={() => { setPacienteId(""); setPacienteLabel(""); setSeleccionados(new Set()); }}
                      className="text-xs text-gray-400 hover:text-red-500">cambiar</button>
                  )}
                </div>
              ) : (
                <BuscadorPacientes
                  autoFocus
                  onSelect={(p: Paciente) => { setPacienteId(p.id); setPacienteLabel(`${p.apellidos}, ${p.nombre}`); }}
                />
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Fecha</label>
                <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Tipo</label>
                <select value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="paciente">Paciente</option>
                  <option value="iguala">Iguala</option>
                  <option value="entidad">Entidad</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Forma de pago</label>
              <select value={formaPagoId} onChange={(e) => setFormaPagoId(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Sin especificar</option>
                {formasPago.map((fp) => <option key={fp.id} value={fp.id}>{fp.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Observaciones</label>
              <input type="text" value={observaciones} onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Opcional..."
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        )}

        {/* Paso 2: Selección de tratamientos */}
        {paso === 2 && (
          <div className="flex flex-col overflow-hidden flex-1">
            {cargandoHistorial ? (
              <div className="flex flex-1 items-center justify-center text-sm text-gray-400 py-10">
                Cargando tratamientos...
              </div>
            ) : sinFacturar.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 py-10 text-sm text-gray-400">
                <span>Este paciente no tiene tratamientos pendientes de facturar.</span>
                <span className="text-xs">Puedes crear la factura vacía y añadir líneas manualmente.</span>
              </div>
            ) : (
              <>
                {/* Cabecera tabla */}
                <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-2 bg-gray-50 shrink-0">
                  <input
                    type="checkbox"
                    checked={seleccionados.size === sinFacturar.length && sinFacturar.length > 0}
                    onChange={toggleTodo}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600"
                  />
                  <span className="text-xs font-semibold text-gray-500 flex-1">Tratamiento</span>
                  <span className="text-xs font-semibold text-gray-500 w-24 text-center">Fecha</span>
                  <span className="text-xs font-semibold text-gray-500 w-16 text-center">Pieza</span>
                  <span className="text-xs font-semibold text-gray-500 w-20 text-right">Precio</span>
                </div>
                {/* Filas */}
                <div className="overflow-y-auto flex-1">
                  {sinFacturar.map((h: HistorialSinFacturar) => (
                    <label
                      key={h.id}
                      className={`flex items-center gap-3 px-4 py-2.5 border-b border-gray-100 cursor-pointer transition-colors ${
                        seleccionados.has(h.id) ? "bg-blue-50" : "hover:bg-gray-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={seleccionados.has(h.id)}
                        onChange={() => toggleItem(h.id)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-gray-800 font-medium">{h.tratamiento_nombre}</span>
                        {h.observaciones && (
                          <span className="ml-2 text-xs text-gray-400 italic truncate">{h.observaciones}</span>
                        )}
                        <span className="ml-2 text-xs text-gray-400">— {h.doctor_nombre}</span>
                      </div>
                      <span className="text-xs text-gray-500 w-24 text-center tabular-nums">
                        {format(new Date(h.fecha), "dd/MM/yyyy")}
                      </span>
                      <span className="text-xs text-gray-500 w-16 text-center">
                        {h.pieza_dental ? `${h.pieza_dental}${h.caras ? `-${h.caras}` : ""}` : "—"}
                      </span>
                      <span className="text-xs text-gray-700 font-medium w-20 text-right tabular-nums">
                        {formatEUR(Number(h.tratamiento_precio) * (1 + Number(h.tratamiento_iva) / 100))}
                      </span>
                    </label>
                  ))}
                </div>
                {/* Resumen selección */}
                <div className="shrink-0 border-t border-gray-200 px-4 py-2 bg-gray-50 flex items-center gap-4 text-xs text-gray-500">
                  <span>{seleccionados.size} de {sinFacturar.length} seleccionados</span>
                  {seleccionados.size > 0 && (
                    <span className="font-semibold text-gray-800">
                      Total: {formatEUR(totalSeleccionado)}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Footer botones */}
        <div className="shrink-0 flex justify-between gap-2 border-t border-gray-100 px-5 py-4">
          {paso === 1 ? (
            <>
              <button type="button" onClick={onClose}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">
                Cancelar
              </button>
              <button
                type="button"
                disabled={!pacienteId}
                onClick={() => setPaso(2)}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Siguiente: elegir tratamientos →
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => setPaso(1)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">
                ← Volver
              </button>
              <button
                type="button"
                disabled={crearMut.isPending}
                onClick={handleCrear}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {crearMut.isPending
                  ? "Creando..."
                  : seleccionados.size > 0
                  ? `Crear factura con ${seleccionados.size} tratamiento${seleccionados.size > 1 ? "s" : ""}`
                  : "Crear factura vacía"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
