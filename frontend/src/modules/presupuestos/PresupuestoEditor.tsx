/**
 * PresupuestoEditor — Editor de presupuesto con odontograma interactivo.
 * Flujo: clic en diente → se preselecciona pieza → buscar tratamiento → añadir.
 */
import { useState, useMemo } from "react";
import { format } from "date-fns";
import { useParams, useNavigate } from "react-router-dom";
import {
  usePresupuesto,
  useActualizarPresupuesto,
  useAñadirLinea,
  useActualizarLinea,
  useEliminarLinea,
  usePasarTrabajosPendientes,
} from "../../hooks/usePresupuestos";
import { useTratamientos, useFamilias } from "../../hooks/useTratamientos";
import { formatEUR } from "../../utils";
import type { PresupuestoLinea } from "../../api/presupuestos";
import Odontograma, { type TratamientoMarca } from "../../components/odontograma/Odontograma";

const ESTADOS = ["borrador", "presentado", "aceptado", "rechazado", "parcial"] as const;
const ETIQUETA_ESTADO: Record<string, string> = {
  borrador: "Borrador", presentado: "Presentado", aceptado: "Aceptado",
  rechazado: "Rechazado", parcial: "Parcial",
};
const COLOR_ESTADO: Record<string, string> = {
  borrador: "bg-gray-100 text-gray-600", presentado: "bg-blue-100 text-blue-700",
  aceptado: "bg-green-100 text-green-700", rechazado: "bg-red-100 text-red-600",
  parcial: "bg-amber-100 text-amber-700",
};
const CARAS_OPCIONES = ["M", "O", "D", "V", "L"];
const cls = "rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

export default function PresupuestoEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: presupuesto, isLoading } = usePresupuesto(id ?? null);
  const actualizarMut = useActualizarPresupuesto();
  const añadirLineaMut = useAñadirLinea(id!);
  const actualizarLineaMut = useActualizarLinea(id!);
  const eliminarLineaMut = useEliminarLinea(id!);
  const pasarTPMut = usePasarTrabajosPendientes(id!);

  const { data: familias = [] } = useFamilias();
  const { data: todosLosTratamientos = [] } = useTratamientos({});

  const [piezaSeleccionada, setPiezaSeleccionada] = useState<number | null>(null);
  const [busquedaTrat, setBusquedaTrat] = useState("");
  const [familiaFiltro, setFamiliaFiltro] = useState("");
  const [nuevaLinea, setNuevaLinea] = useState({
    tratamiento_id: "",
    pieza_dental: "",
    caras: "",
    precio_unitario: "",
    descuento_porcentaje: "0",
  });

  // Tratamientos filtrados por búsqueda y familia
  const tratamientosFiltrados = useMemo(() => {
    let lista = todosLosTratamientos.filter((t) => t.activo);
    if (familiaFiltro) lista = lista.filter((t) => t.familia_id === familiaFiltro);
    if (busquedaTrat.trim()) {
      const q = busquedaTrat.toLowerCase();
      lista = lista.filter(
        (t) => t.nombre.toLowerCase().includes(q) || (t.codigo?.toLowerCase().includes(q) ?? false)
      );
    }
    return lista.slice(0, 30);
  }, [todosLosTratamientos, familiaFiltro, busquedaTrat]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2" />
          <p className="text-sm text-gray-400">Cargando presupuesto...</p>
        </div>
      </div>
    );
  }
  if (!presupuesto) return <div className="p-6 text-red-600 text-sm">Presupuesto no encontrado.</div>;

  const esBorrador = presupuesto.estado === "borrador";
  const lineasAceptadas = presupuesto.lineas.filter((l) => l.aceptado && !l.pasado_trabajo_pendiente);

  const marcasOdontograma: TratamientoMarca[] = presupuesto.lineas
    .filter((l) => l.pieza_dental != null)
    .map((l) => ({
      fdi: l.pieza_dental!,
      caras: l.caras || "",
      color: l.aceptado ? "#16A34A" : "#2563EB",
      label: l.tratamiento?.nombre ?? "Tratamiento",
    }));

  function handlePiezaClick(fdi: number) {
    const next = fdi === piezaSeleccionada ? null : fdi;
    setPiezaSeleccionada(next);
    setNuevaLinea((n) => ({ ...n, pieza_dental: next ? String(next) : "" }));
  }

  function handleTratamientoSelect(tratId: string) {
    const trat = todosLosTratamientos.find((t) => t.id === tratId);
    setNuevaLinea((n) => ({
      ...n,
      tratamiento_id: tratId,
      precio_unitario: trat ? String(trat.precio) : "",
    }));
    setBusquedaTrat(trat?.nombre ?? "");
  }

  function toggleCara(cara: string) {
    const actual = nuevaLinea.caras;
    setNuevaLinea((n) => ({
      ...n,
      caras: actual.includes(cara) ? actual.replace(cara, "") : actual + cara,
    }));
  }

  async function handleEstado(estado: string) {
    await actualizarMut.mutateAsync({ id: presupuesto!.id, data: { estado } });
  }

  async function handleAñadirLinea(e: React.FormEvent) {
    e.preventDefault();
    if (!nuevaLinea.tratamiento_id || !nuevaLinea.precio_unitario) return;
    await añadirLineaMut.mutateAsync({
      tratamiento_id: nuevaLinea.tratamiento_id,
      pieza_dental: nuevaLinea.pieza_dental ? Number(nuevaLinea.pieza_dental) : undefined,
      caras: nuevaLinea.caras || undefined,
      precio_unitario: Number(nuevaLinea.precio_unitario),
      descuento_porcentaje: Number(nuevaLinea.descuento_porcentaje),
    });
    setNuevaLinea({ tratamiento_id: "", pieza_dental: "", caras: "", precio_unitario: "", descuento_porcentaje: "0" });
    setBusquedaTrat("");
    setPiezaSeleccionada(null);
  }

  async function toggleAceptado(linea: PresupuestoLinea) {
    await actualizarLineaMut.mutateAsync({ lineaId: linea.id, data: { aceptado: !linea.aceptado } });
  }

  async function handleEliminarLinea(lineaId: string) {
    if (!confirm("¿Eliminar esta línea?")) return;
    await eliminarLineaMut.mutateAsync(lineaId);
  }

  const tratamientoActual = todosLosTratamientos.find((t) => t.id === nuevaLinea.tratamiento_id);
  const neto = nuevaLinea.precio_unitario
    ? Number(nuevaLinea.precio_unitario) * (1 - Number(nuevaLinea.descuento_porcentaje || 0) / 100)
    : 0;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Cabecera */}
      <div className="shrink-0 bg-white border-b border-gray-200 px-5 py-2.5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600 text-sm shrink-0">
              ← Volver
            </button>
            <h1 className="text-sm font-bold text-gray-900 shrink-0">Presupuesto #{presupuesto.numero}</h1>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0 ${COLOR_ESTADO[presupuesto.estado]}`}>
              {ETIQUETA_ESTADO[presupuesto.estado]}
            </span>
            <span className="text-xs text-gray-400 truncate hidden sm:block">
              {presupuesto.paciente ? `${presupuesto.paciente.apellidos}, ${presupuesto.paciente.nombre} · Hx${presupuesto.paciente.num_historial}` : ""}
              {" · "}{format(new Date(presupuesto.fecha), "dd/MM/yyyy")}
              {presupuesto.doctor && ` · ${presupuesto.doctor.nombre}`}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <select
              value={presupuesto.estado}
              onChange={(e) => handleEstado(e.target.value)}
              className="rounded border border-gray-300 px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {ESTADOS.map((e) => <option key={e} value={e}>{ETIQUETA_ESTADO[e]}</option>)}
            </select>
            {lineasAceptadas.length > 0 && (
              <button
                onClick={() => pasarTPMut.mutateAsync()}
                disabled={pasarTPMut.isPending}
                className="rounded bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                → Trabajo Pendiente ({lineasAceptadas.length})
              </button>
            )}
            <button
              onClick={() => window.open(`/api/pdf/presupuestos/${presupuesto.id}`, "_blank")}
              className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
            >
              PDF
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Panel izquierdo: odontograma + formulario */}
        {esBorrador && (
          <div className="w-[540px] shrink-0 border-r border-slate-200 bg-slate-50/80 flex flex-col overflow-hidden">

            {/* Odontograma */}
            <div className="shrink-0 border-b border-slate-100 bg-white px-4 pt-4 pb-3">
              <div className="mb-2 flex items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Odontograma</span>
                  <p className="mt-1 text-sm text-slate-600">Selecciona la pieza directamente sobre la arcada.</p>
                </div>
                {piezaSeleccionada && (
                  <span className="text-xs text-blue-600 font-medium">Pieza {piezaSeleccionada} ✓</span>
                )}
              </div>
              <Odontograma
                marcas={marcasOdontograma}
                seleccionado={piezaSeleccionada}
                onSelect={handlePiezaClick}
              />
            </div>

            {/* Formulario añadir tratamiento */}
            <div className="flex-1 overflow-y-auto px-3 py-3">
              <form onSubmit={handleAñadirLinea} className="space-y-2.5">

                {/* Búsqueda de tratamiento */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Tratamiento *
                  </label>
                  {/* Filtro familia */}
                  <select
                    value={familiaFiltro}
                    onChange={(e) => { setFamiliaFiltro(e.target.value); setNuevaLinea((n) => ({ ...n, tratamiento_id: "" })); setBusquedaTrat(""); }}
                    className={cls + " w-full mb-1.5 text-xs py-1.5"}
                  >
                    <option value="">Todas las familias</option>
                    {familias.map((f) => (
                      <option key={f.id} value={f.id}>{f.icono} {f.nombre}</option>
                    ))}
                  </select>
                  {/* Búsqueda libre */}
                  <input
                    type="text"
                    placeholder="Buscar por nombre o código..."
                    value={busquedaTrat}
                    onChange={(e) => { setBusquedaTrat(e.target.value); setNuevaLinea((n) => ({ ...n, tratamiento_id: "" })); }}
                    className={cls + " w-full text-xs py-1.5"}
                  />
                  {/* Lista de resultados */}
                  {busquedaTrat && !nuevaLinea.tratamiento_id && tratamientosFiltrados.length > 0 && (
                    <div className="border border-gray-200 rounded-md mt-1 bg-white shadow-sm max-h-44 overflow-y-auto">
                      {tratamientosFiltrados.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => handleTratamientoSelect(t.id)}
                          className="w-full text-left px-3 py-1.5 text-xs hover:bg-blue-50 flex items-center justify-between border-b border-gray-50 last:border-0"
                        >
                          <span className="font-medium text-gray-800">{t.nombre}</span>
                          <span className="text-gray-400 shrink-0 ml-2">{formatEUR(t.precio)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {nuevaLinea.tratamiento_id && (
                    <div className="mt-1 flex items-center gap-1 text-xs text-green-700 bg-green-50 rounded px-2 py-1">
                      <span className="font-medium">{tratamientoActual?.nombre}</span>
                      <button type="button" onClick={() => { setNuevaLinea((n) => ({ ...n, tratamiento_id: "", precio_unitario: "" })); setBusquedaTrat(""); }}
                        className="ml-auto text-gray-400 hover:text-red-500">×</button>
                    </div>
                  )}
                </div>

                {/* Pieza dental */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Pieza FDI</label>
                    <input
                      type="number" min={11} max={85}
                      value={nuevaLinea.pieza_dental}
                      onChange={(e) => {
                        setNuevaLinea((n) => ({ ...n, pieza_dental: e.target.value }));
                        setPiezaSeleccionada(e.target.value ? Number(e.target.value) : null);
                      }}
                      className={cls + " w-full"}
                      placeholder="ej. 16"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Precio €</label>
                    <input
                      type="number" min={0} step="0.01"
                      value={nuevaLinea.precio_unitario}
                      onChange={(e) => setNuevaLinea((n) => ({ ...n, precio_unitario: e.target.value }))}
                      className={cls + " w-full"}
                      required
                      placeholder="0.00"
                    />
                  </div>
                </div>

                {/* Caras (solo si hay pieza) */}
                {nuevaLinea.pieza_dental && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Caras</label>
                    <div className="flex gap-1">
                      {CARAS_OPCIONES.map((cara) => (
                        <button
                          key={cara} type="button" onClick={() => toggleCara(cara)}
                          className={`w-8 h-8 rounded text-xs font-bold border transition-colors ${
                            nuevaLinea.caras.includes(cara)
                              ? "bg-blue-600 text-white border-blue-600"
                              : "bg-white text-gray-600 border-gray-300 hover:border-blue-400"
                          }`}
                        >
                          {cara}
                        </button>
                      ))}
                      {nuevaLinea.caras && (
                        <span className="flex items-center text-xs text-gray-500 font-mono ml-1">→ {nuevaLinea.caras}</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Descuento */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Descuento %</label>
                  <input
                    type="number" min={0} max={100}
                    value={nuevaLinea.descuento_porcentaje}
                    onChange={(e) => setNuevaLinea((n) => ({ ...n, descuento_porcentaje: e.target.value }))}
                    className={cls + " w-full"}
                  />
                </div>

                {/* Preview neto */}
                {neto > 0 && (
                  <div className="rounded bg-blue-50 px-3 py-1.5 text-xs flex justify-between">
                    <span className="text-gray-500">Neto a añadir:</span>
                    <span className="font-bold text-blue-700">{formatEUR(neto)}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={añadirLineaMut.isPending || !nuevaLinea.tratamiento_id || !nuevaLinea.precio_unitario}
                  className="w-full rounded-md bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
                >
                  {añadirLineaMut.isPending ? "Añadiendo..." : "+ Añadir línea"}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Panel derecho: tabla de líneas */}
        <div className="flex-1 overflow-y-auto bg-white">
          <div className="p-4">
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-3 py-2.5 text-left w-8">
                      {esBorrador && (
                        <input
                          type="checkbox"
                          className="rounded border-gray-300"
                          checked={presupuesto.lineas.length > 0 && presupuesto.lineas.every((l) => l.aceptado)}
                          onChange={async (e) => {
                            for (const linea of presupuesto.lineas) {
                              if (linea.aceptado !== e.target.checked) {
                                await actualizarLineaMut.mutateAsync({ lineaId: linea.id, data: { aceptado: e.target.checked } });
                              }
                            }
                          }}
                          title="Aceptar/rechazar todas"
                        />
                      )}
                    </th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500">Tratamiento</th>
                    <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 w-14">Pieza</th>
                    <th className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 w-16">Caras</th>
                    <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-500 w-20">PVP</th>
                    <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-500 w-16">Dto.</th>
                    <th className="px-3 py-2.5 text-right text-xs font-semibold text-gray-500 w-20">Neto</th>
                    {esBorrador && <th className="px-3 py-2.5 w-8" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {presupuesto.lineas.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-sm text-gray-400">
                        {esBorrador
                          ? "Sin líneas. Haz clic en un diente y selecciona el tratamiento."
                          : "Sin líneas."}
                      </td>
                    </tr>
                  ) : (
                    presupuesto.lineas.map((linea) => (
                      <tr
                        key={linea.id}
                        className={`transition-colors ${
                          linea.aceptado ? "bg-green-50/60" : "hover:bg-gray-50"
                        } ${linea.pieza_dental ? "cursor-pointer" : ""}`}
                        onClick={() => { if (linea.pieza_dental) setPiezaSeleccionada(linea.pieza_dental); }}
                      >
                        <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={linea.aceptado}
                            onChange={() => toggleAceptado(linea)}
                            className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <span className="font-medium text-gray-800 text-xs">{linea.tratamiento?.nombre ?? "—"}</span>
                          {linea.tratamiento?.codigo && (
                            <span className="ml-1.5 text-[10px] text-gray-400">{linea.tratamiento.codigo}</span>
                          )}
                          {linea.pasado_trabajo_pendiente && (
                            <span className="ml-2 text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">TP</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs text-center text-gray-600 font-mono">
                          {linea.pieza_dental ?? "—"}
                        </td>
                        <td className="px-3 py-2 text-xs text-center font-mono text-gray-500">
                          {linea.caras || "—"}
                        </td>
                        <td className="px-3 py-2 text-xs text-right tabular-nums text-gray-500">
                          {formatEUR(linea.precio_unitario)}
                        </td>
                        <td className="px-3 py-2 text-xs text-right tabular-nums text-gray-400">
                          {linea.descuento_porcentaje > 0 ? `${linea.descuento_porcentaje}%` : "—"}
                        </td>
                        <td className="px-3 py-2 text-sm font-semibold text-right tabular-nums">
                          {formatEUR(linea.importe_neto)}
                        </td>
                        {esBorrador && (
                          <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleEliminarLinea(linea.id)}
                              className="text-gray-300 hover:text-red-500 text-lg leading-none"
                              title="Eliminar"
                            >×</button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
                {presupuesto.lineas.length > 0 && (
                  <tfoot className="border-t-2 border-gray-200 bg-gray-50">
                    <tr>
                      <td colSpan={6} className="px-3 py-2.5 text-xs text-right text-gray-500 font-medium">
                        Total presupuesto:
                      </td>
                      <td className="px-3 py-2.5 text-sm font-bold text-right tabular-nums">
                        {formatEUR(presupuesto.total)}
                      </td>
                      {esBorrador && <td />}
                    </tr>
                    {presupuesto.total_aceptado > 0 && presupuesto.total_aceptado !== presupuesto.total && (
                      <tr>
                        <td colSpan={6} className="px-3 py-1.5 text-xs text-right text-green-600 font-medium">
                          Total aceptado:
                        </td>
                        <td className="px-3 py-1.5 text-sm font-bold text-right tabular-nums text-green-700">
                          {formatEUR(presupuesto.total_aceptado)}
                        </td>
                        {esBorrador && <td />}
                      </tr>
                    )}
                  </tfoot>
                )}
              </table>
            </div>

            {presupuesto.pie_pagina && (
              <p className="text-xs text-gray-400 italic px-1 mt-3">{presupuesto.pie_pagina}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
