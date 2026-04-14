/**
 * FacturaEditor — Vista completa de una factura.
 * - Muestra cabecera, líneas y cobros
 * - Permite añadir/eliminar líneas (si no está anulada)
 * - Permite registrar cobros
 * - Botón anular (admin)
 */
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { useFactura, useAñadirLineaFactura, useEliminarLineaFactura, useRegistrarCobro, useAnularCobro, useAnularFactura, useFormasPago } from "../../hooks/useFacturas";
import { formatEUR } from "../../utils";
import type { FacturaLineaCreate, CobroCreate } from "../../api/facturas";

const COLOR_ESTADO: Record<string, string> = {
  emitida: "bg-blue-100 text-blue-700",
  cobrada: "bg-green-100 text-green-700",
  parcial: "bg-amber-100 text-amber-700",
  anulada: "bg-gray-100 text-gray-500",
};

export default function FacturaEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: factura, isLoading } = useFactura(id);
  const { data: formasPago = [] } = useFormasPago();

  const añadirLineaMut = useAñadirLineaFactura();
  const eliminarLineaMut = useEliminarLineaFactura();
  const registrarCobroMut = useRegistrarCobro();
  const anularCobroMut = useAnularCobro();
  const anularMut = useAnularFactura();

  // Estado del formulario de nueva línea
  const [nuevaLinea, setNuevaLinea] = useState<FacturaLineaCreate>({
    concepto: "",
    cantidad: 1,
    precio_unitario: 0,
    iva_porcentaje: 0,
  });
  const [mostrarFormLinea, setMostrarFormLinea] = useState(false);

  // Estado del formulario de cobro
  const [nuevoCobro, setNuevoCobro] = useState<CobroCreate>({
    importe: 0,
    forma_pago_id: "",
  });
  const [mostrarFormCobro, setMostrarFormCobro] = useState(false);

  if (isLoading) {
    return <div className="flex h-40 items-center justify-center text-sm text-gray-400">Cargando factura...</div>;
  }
  if (!factura) {
    return <div className="flex h-40 items-center justify-center text-sm text-red-500">Factura no encontrada.</div>;
  }

  const esAnulada = factura.estado === "anulada";

  async function handleAñadirLinea(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevaLinea.concepto || !nuevaLinea.precio_unitario) return;
    await añadirLineaMut.mutateAsync({ facturaId: factura!.id, linea: nuevaLinea });
    setNuevaLinea({ concepto: "", cantidad: 1, precio_unitario: 0, iva_porcentaje: 0 });
    setMostrarFormLinea(false);
  }

  async function handleCobro(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevoCobro.forma_pago_id || !nuevoCobro.importe) return;
    await registrarCobroMut.mutateAsync({ facturaId: factura!.id, cobro: nuevoCobro });
    setNuevoCobro({ importe: 0, forma_pago_id: "" });
    setMostrarFormCobro(false);
  }

  async function handleAnular() {
    if (!confirm("¿Seguro que quieres anular esta factura? Esta acción no se puede deshacer.")) return;
    await anularMut.mutateAsync(factura!.id);
    navigate("/facturacion");
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto space-y-4 pb-8">
      {/* Cabecera */}
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <button onClick={() => navigate("/facturacion")} className="text-gray-400 hover:text-gray-600 text-sm">← Volver</button>
              <h1 className="text-lg font-bold text-gray-800">
                Factura {factura.serie}{String(factura.numero).padStart(5, "0")}
              </h1>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${COLOR_ESTADO[factura.estado]}`}>
                {factura.estado}
              </span>
            </div>
            <div className="text-sm text-gray-600 space-y-0.5">
              <div>
                <strong>Paciente:</strong>{" "}
                {factura.paciente
                  ? `${factura.paciente.apellidos}, ${factura.paciente.nombre} (HC ${factura.paciente.num_historial})`
                  : "—"}
              </div>
              <div>
                <strong>Fecha:</strong> {format(new Date(factura.fecha), "dd/MM/yyyy")} &nbsp;|&nbsp;
                <strong>Tipo:</strong> <span className="capitalize">{factura.tipo}</span>
                {factura.forma_pago && <> &nbsp;|&nbsp; <strong>Forma de pago:</strong> {factura.forma_pago.nombre}</>}
              </div>
              {factura.observaciones && (
                <div className="text-gray-500 italic">{factura.observaciones}</div>
              )}
            </div>
          </div>

          {/* Resumen económico */}
          <div className="text-right text-sm space-y-0.5 tabular-nums shrink-0">
            <div className="text-gray-500">Base: {formatEUR(Number(factura.subtotal))}</div>
            <div className="text-gray-500">IVA: {formatEUR(Number(factura.iva_total))}</div>
            <div className="text-lg font-bold text-gray-900">Total: {formatEUR(Number(factura.total))}</div>
            <div className="text-green-700">Cobrado: {formatEUR(Number(factura.total_cobrado))}</div>
            {Number(factura.pendiente) > 0 && (
              <div className="text-red-600 font-semibold">Pendiente: {formatEUR(Number(factura.pendiente))}</div>
            )}
          </div>
        </div>
      </div>

      {/* Líneas */}
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Líneas de factura</h2>
          {!esAnulada && (
            <button
              onClick={() => setMostrarFormLinea((v) => !v)}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              {mostrarFormLinea ? "Cancelar" : "+ Añadir línea"}
            </button>
          )}
        </div>

        {mostrarFormLinea && (
          <form onSubmit={handleAñadirLinea} className="px-5 py-3 bg-blue-50 border-b border-blue-100 flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-40">
              <label className="block text-xs font-medium text-gray-600 mb-1">Concepto *</label>
              <input
                type="text"
                value={nuevaLinea.concepto}
                onChange={(e) => setNuevaLinea((n) => ({ ...n, concepto: e.target.value }))}
                required
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
              />
            </div>
            <div className="w-16">
              <label className="block text-xs font-medium text-gray-600 mb-1">Cant.</label>
              <input
                type="number"
                min={1}
                value={nuevaLinea.cantidad}
                onChange={(e) => setNuevaLinea((n) => ({ ...n, cantidad: Number(e.target.value) }))}
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
              />
            </div>
            <div className="w-28">
              <label className="block text-xs font-medium text-gray-600 mb-1">Precio unit. *</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={nuevaLinea.precio_unitario}
                onChange={(e) => setNuevaLinea((n) => ({ ...n, precio_unitario: Number(e.target.value) }))}
                required
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
              />
            </div>
            <div className="w-20">
              <label className="block text-xs font-medium text-gray-600 mb-1">IVA %</label>
              <input
                type="number"
                min={0}
                max={100}
                step={0.01}
                value={nuevaLinea.iva_porcentaje}
                onChange={(e) => setNuevaLinea((n) => ({ ...n, iva_porcentaje: Number(e.target.value) }))}
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
              />
            </div>
            <div className="w-52">
              <label className="block text-xs font-medium text-gray-600 mb-1">Concepto impresión</label>
              <input
                type="text"
                value={nuevaLinea.concepto_ficticio ?? ""}
                onChange={(e) => setNuevaLinea((n) => ({ ...n, concepto_ficticio: e.target.value || undefined }))}
                placeholder="Opcional..."
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={añadirLineaMut.isPending}
              className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Añadir
            </button>
          </form>
        )}

        {factura.lineas.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-gray-400">Sin líneas.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Concepto</th>
                <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500">Cant.</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">Precio unit.</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">IVA %</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">Subtotal</th>
                {!esAnulada && <th className="px-4 py-2 w-10"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {factura.lineas.map((linea) => (
                <tr key={linea.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-800">
                    {linea.concepto_ficticio ? (
                      <span title={`Impresión: ${linea.concepto_ficticio}`}>
                        {linea.concepto} <span className="text-gray-400 text-xs">[{linea.concepto_ficticio}]</span>
                      </span>
                    ) : linea.concepto}
                  </td>
                  <td className="px-4 py-2 text-center text-gray-600 tabular-nums">{linea.cantidad}</td>
                  <td className="px-4 py-2 text-right text-gray-600 tabular-nums">{formatEUR(Number(linea.precio_unitario))}</td>
                  <td className="px-4 py-2 text-right text-gray-500 tabular-nums">{Number(linea.iva_porcentaje)}%</td>
                  <td className="px-4 py-2 text-right font-medium text-gray-800 tabular-nums">{formatEUR(Number(linea.subtotal))}</td>
                  {!esAnulada && (
                    <td className="px-4 py-2 text-center">
                      <button
                        onClick={() => eliminarLineaMut.mutate({ facturaId: factura.id, lineaId: linea.id })}
                        disabled={eliminarLineaMut.isPending}
                        className="text-gray-300 hover:text-red-500 text-lg leading-none"
                        title="Eliminar línea"
                      >×</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Cobros */}
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Cobros</h2>
          {!esAnulada && factura.estado !== "cobrada" && (
            <button
              onClick={() => setMostrarFormCobro((v) => !v)}
              className="text-xs text-green-600 hover:text-green-800 font-medium"
            >
              {mostrarFormCobro ? "Cancelar" : "+ Registrar cobro"}
            </button>
          )}
        </div>

        {mostrarFormCobro && (
          <form onSubmit={handleCobro} className="px-5 py-3 bg-green-50 border-b border-green-100 flex flex-wrap gap-3 items-end">
            <div className="w-40">
              <label className="block text-xs font-medium text-gray-600 mb-1">Importe *</label>
              <input
                type="number"
                min={0.01}
                step={0.01}
                value={nuevoCobro.importe || ""}
                onChange={(e) => setNuevoCobro((n) => ({ ...n, importe: Number(e.target.value) }))}
                required
                placeholder={formatEUR(Number(factura.pendiente))}
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
              />
            </div>
            <div className="w-48">
              <label className="block text-xs font-medium text-gray-600 mb-1">Forma de pago *</label>
              <select
                value={nuevoCobro.forma_pago_id}
                onChange={(e) => setNuevoCobro((n) => ({ ...n, forma_pago_id: e.target.value }))}
                required
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
              >
                <option value="">Seleccionar...</option>
                {formasPago.map((fp) => <option key={fp.id} value={fp.id}>{fp.nombre}</option>)}
              </select>
            </div>
            <div className="w-48">
              <label className="block text-xs font-medium text-gray-600 mb-1">Notas</label>
              <input
                type="text"
                value={nuevoCobro.notas ?? ""}
                onChange={(e) => setNuevoCobro((n) => ({ ...n, notas: e.target.value || undefined }))}
                placeholder="Opcional..."
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={registrarCobroMut.isPending}
              className="rounded-md bg-green-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              Registrar
            </button>
          </form>
        )}

        {factura.cobros.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-gray-400">Sin cobros registrados.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Fecha</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Forma de pago</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Notas</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">Importe</th>
                <th className="px-4 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {factura.cobros.map((cobro) => (
                <tr key={cobro.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-600 tabular-nums text-xs">
                    {format(new Date(cobro.fecha), "dd/MM/yyyy HH:mm")}
                  </td>
                  <td className="px-4 py-2 text-gray-700">{cobro.forma_pago?.nombre ?? "—"}</td>
                  <td className="px-4 py-2 text-gray-500 text-xs">{cobro.notas ?? ""}</td>
                  <td className="px-4 py-2 text-right font-medium text-green-700 tabular-nums">
                    {formatEUR(Number(cobro.importe))}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <button
                      onClick={() => anularCobroMut.mutate({ facturaId: factura.id, cobroId: cobro.id })}
                      disabled={anularCobroMut.isPending}
                      className="text-gray-300 hover:text-red-500 text-lg leading-none"
                      title="Anular cobro"
                    >×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Acciones */}
      {!esAnulada && (
        <div className="flex justify-end">
          <button
            onClick={handleAnular}
            disabled={anularMut.isPending}
            className="rounded-md border border-red-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            Anular factura
          </button>
        </div>
      )}
    </div>
  );
}
