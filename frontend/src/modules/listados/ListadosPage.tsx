/**
 * ListadosPage â€” Dashboard de reportes y listados.
 * Tabs: KPIs | FacturaciÃ³n mensual | Top tratamientos | Citas por doctor | Pacientes | Faltas
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, startOfWeek, endOfWeek, startOfDay, endOfDay } from "date-fns";
import { useNavigate } from "react-router-dom";
import {
  getKPIs,
  getFacturacionMensual,
  getTopTratamientos,
  getCitasPorDoctor,
  getListadoPacientes,
  getListadoFaltas,
} from "../../api/reportes";
import { formatEUR } from "../../utils";

type Tab = "kpis" | "facturacion" | "tratamientos" | "doctores" | "pacientes" | "faltas";

const TABS: { id: Tab; label: string }[] = [
  { id: "kpis", label: "Resumen" },
  { id: "facturacion", label: "FacturaciÃ³n mensual" },
  { id: "tratamientos", label: "Top tratamientos" },
  { id: "doctores", label: "Citas por doctor" },
  { id: "pacientes", label: "Listado pacientes" },
  { id: "faltas", label: "Faltas" },
];

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

type Periodo = "hoy" | "semana" | "mes" | "anno" | "personalizado";

function periodoAFechas(p: Periodo): [string, string] {
  const hoy = new Date();
  const fmt = (d: Date) => format(d, "yyyy-MM-dd");
  switch (p) {
    case "hoy":    return [fmt(startOfDay(hoy)), fmt(endOfDay(hoy))];
    case "semana": return [fmt(startOfWeek(hoy, { weekStartsOn: 1 })), fmt(endOfWeek(hoy, { weekStartsOn: 1 }))];
    case "mes":    return [fmt(startOfMonth(hoy)), fmt(endOfMonth(hoy))];
    case "anno":   return [fmt(startOfYear(hoy)), fmt(endOfYear(hoy))];
    default:       return [fmt(startOfMonth(hoy)), fmt(endOfMonth(hoy))];
  }
}

export default function ListadosPage() {
  const [tab, setTab] = useState<Tab>("kpis");
  const hoy = new Date();
  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const [desde, setDesde] = useState(format(startOfMonth(hoy), "yyyy-MM-dd"));
  const [hasta, setHasta] = useState(format(endOfMonth(hoy), "yyyy-MM-dd"));
  const [anno, setAnno] = useState(hoy.getFullYear());

  function aplicarPeriodo(p: Periodo) {
    setPeriodo(p);
    if (p !== "personalizado") {
      const [d, h] = periodoAFechas(p);
      setDesde(d);
      setHasta(h);
    }
  }

  const desdeDate = new Date(desde + "T00:00:00");
  const hastaDate = new Date(hasta + "T23:59:59");

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="mb-4 rounded-[1.75rem] border border-slate-200/80 bg-white/88 px-5 py-4 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
        <p className="text-[0.68rem] font-medium uppercase tracking-[0.3em] text-slate-400">
          Listados operativos
        </p>
        <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">Actividad, caja y seguimiento global</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Controla produccion, cobros, pacientes con saldo pendiente y faltas, y salta desde cada fila a la ficha o a la agenda.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-slate-500">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
              Rango: {format(desdeDate, "dd/MM/yyyy")} - {format(hastaDate, "dd/MM/yyyy")}
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5">
              Vista activa: {TABS.find((item) => item.id === tab)?.label}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="shrink-0 flex items-center gap-1 mb-3 border-b border-gray-200 pb-0">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t.id
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            {t.label}
          </button>
        ))}

        <div className="flex-1" />

        {/* Filtro de fechas (para tabs que lo usan) */}
        {tab !== "facturacion" && tab !== "pacientes" && (
          <div className="flex items-center gap-2 pb-1">
            {/* PerÃ­odos rÃ¡pidos */}
            <div className="flex rounded-md border border-gray-300 overflow-hidden text-xs">
              {(["hoy", "semana", "mes", "anno"] as Periodo[]).map((p) => (
                <button
                  key={p}
                  onClick={() => aplicarPeriodo(p)}
                  className={`px-2.5 py-1 border-r border-gray-300 last:border-r-0 transition-colors ${
                    periodo === p ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {({ hoy: "Hoy", semana: "Semana", mes: "Mes", anno: "AÃ±o" } as Record<string, string>)[p]}
                </button>
              ))}
            </div>
            <input
              type="date"
              value={desde}
              onChange={(e) => { setDesde(e.target.value); setPeriodo("personalizado"); }}
              className="rounded-md border border-gray-300 px-2 py-1 text-xs"
            />
            <span className="text-gray-400 text-xs">â€”</span>
            <input
              type="date"
              value={hasta}
              onChange={(e) => { setHasta(e.target.value); setPeriodo("personalizado"); }}
              className="rounded-md border border-gray-300 px-2 py-1 text-xs"
            />
          </div>
        )}
        {tab === "facturacion" && (
          <div className="flex items-center gap-2 pb-1">
            <label className="text-xs text-gray-500">AÃ±o:</label>
            <select value={anno} onChange={(e) => setAnno(Number(e.target.value))}
              className="rounded-md border border-gray-300 px-2 py-1 text-xs">
              {[hoy.getFullYear(), hoy.getFullYear() - 1, hoy.getFullYear() - 2].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Contenido del tab activo */}
      <div className="flex-1 overflow-y-auto">
        {tab === "kpis" && <TabKPIs desde={desdeDate} hasta={hastaDate} />}
        {tab === "facturacion" && <TabFacturacionMensual anno={anno} />}
        {tab === "tratamientos" && <TabTopTratamientos desde={desdeDate} hasta={hastaDate} />}
        {tab === "doctores" && <TabCitasPorDoctor desde={desdeDate} hasta={hastaDate} />}
        {tab === "pacientes" && <TabPacientes />}
        {tab === "faltas" && <TabFaltas desde={desdeDate} hasta={hastaDate} />}
      </div>
    </div>
  );
}

// â”€â”€â”€ Tab KPIs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function TabKPIs({ desde, hasta }: { desde: Date; hasta: Date }) {
  const { data, isLoading } = useQuery({
    queryKey: ["reportes-kpis", desde.toISOString(), hasta.toISOString()],
    queryFn: () => getKPIs(desde, hasta),
  });

  if (isLoading) return <Spinner />;
  if (!data) return null;

  const tasaAsistencia = data.citas.total > 0
    ? Math.round((data.citas.asistencia / data.citas.total) * 100)
    : 0;

  return (
    <div className="space-y-4">
      {/* Tarjetas KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Citas totales" value={data.citas.total} sub={`${tasaAsistencia}% asistencia`} color="blue" />
        <KPICard title="Pacientes nuevos" value={data.pacientes_nuevos} color="green" />
        <KPICard title="Tratamientos realizados" value={data.tratamientos_realizados} color="purple" />
        <KPICard title="Facturas emitidas" value={data.facturacion.num_facturas} color="orange" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* FacturaciÃ³n */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">FacturaciÃ³n</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Total facturado</span>
              <span className="font-semibold tabular-nums">{formatEUR(data.facturacion.total_facturado)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Total cobrado</span>
              <span className="font-semibold text-green-700 tabular-nums">{formatEUR(data.facturacion.total_cobrado)}</span>
            </div>
            <div className="flex justify-between border-t border-gray-100 pt-2">
              <span className="text-gray-500">Pendiente</span>
              <span className={`font-semibold tabular-nums ${data.facturacion.pendiente > 0 ? "text-red-600" : "text-gray-400"}`}>
                {formatEUR(data.facturacion.pendiente)}
              </span>
            </div>
            {data.facturacion.total_facturado > 0 && (
              <div className="mt-2">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Cobrado</span>
                  <span>{Math.round((data.facturacion.total_cobrado / data.facturacion.total_facturado) * 100)}%</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100">
                  <div
                    className="h-2 rounded-full bg-green-500"
                    style={{ width: `${Math.min(100, (data.facturacion.total_cobrado / data.facturacion.total_facturado) * 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Citas por estado */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Citas por estado</h3>
          <div className="space-y-1.5 text-sm">
            {Object.entries(data.citas.por_estado).map(([estado, cantidad]) => (
              <div key={estado} className="flex items-center justify-between">
                <span className="capitalize text-gray-500">{estado.replace("_", " ")}</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-24 rounded-full bg-gray-100">
                    <div
                      className="h-2 rounded-full bg-blue-400"
                      style={{ width: `${data.citas.total > 0 ? (cantidad / data.citas.total) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="tabular-nums w-6 text-right text-gray-700 text-xs">{cantidad}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Presupuestos */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Presupuestos ({data.presupuestos.total})</h3>
          <div className="space-y-1.5 text-sm">
            {Object.entries(data.presupuestos.por_estado).map(([estado, cantidad]) => (
              <div key={estado} className="flex items-center justify-between">
                <span className="capitalize text-gray-500">{estado}</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-24 rounded-full bg-gray-100">
                    <div
                      className="h-2 rounded-full bg-purple-400"
                      style={{ width: `${data.presupuestos.total > 0 ? (cantidad / data.presupuestos.total) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="tabular-nums w-6 text-right text-gray-700 text-xs">{cantidad}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// â”€â”€â”€ Tab FacturaciÃ³n Mensual â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function TabFacturacionMensual({ anno }: { anno: number }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ["reportes-facturacion-mensual", anno],
    queryFn: () => getFacturacionMensual(anno),
  });

  if (isLoading) return <Spinner />;

  // Llenar los 12 meses
  const porMes = Array.from({ length: 12 }, (_, i) => {
    const found = data.find((d) => d.mes === i + 1);
    return { mes: i + 1, facturado: found?.facturado ?? 0, num_facturas: found?.num_facturas ?? 0 };
  });
  const maxVal = Math.max(...porMes.map((m) => m.facturado), 1);
  const total = porMes.reduce((s, m) => s + m.facturado, 0);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700">FacturaciÃ³n mensual {anno}</h3>
        <span className="text-sm text-gray-500">Total: <strong>{formatEUR(total)}</strong></span>
      </div>
      <div className="flex items-end gap-2 h-48">
        {porMes.map((m) => (
          <div key={m.mes} className="flex-1 flex flex-col items-center gap-1 group">
            <div className="text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity tabular-nums">
              {formatEUR(m.facturado)}
            </div>
            <div
              className="w-full rounded-t bg-blue-400 hover:bg-blue-500 transition-colors cursor-default"
              style={{ height: `${(m.facturado / maxVal) * 180}px`, minHeight: m.facturado > 0 ? 4 : 0 }}
              title={`${MESES[m.mes - 1]}: ${formatEUR(m.facturado)} (${m.num_facturas} facturas)`}
            />
            <div className="text-xs text-gray-400">{MESES[m.mes - 1]}</div>
          </div>
        ))}
      </div>
      {/* Tabla resumen */}
      <table className="w-full text-xs mt-4 border-t border-gray-100">
        <thead>
          <tr className="text-gray-400">
            <th className="text-left py-1">Mes</th>
            <th className="text-right py-1">Facturas</th>
            <th className="text-right py-1">Facturado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {porMes.filter((m) => m.facturado > 0).map((m) => (
            <tr key={m.mes} className="hover:bg-gray-50">
              <td className="py-1 text-gray-700">{MESES[m.mes - 1]}</td>
              <td className="py-1 text-right tabular-nums text-gray-500">{m.num_facturas}</td>
              <td className="py-1 text-right tabular-nums font-medium">{formatEUR(m.facturado)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// â”€â”€â”€ Tab Top Tratamientos â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function TabTopTratamientos({ desde, hasta }: { desde: Date; hasta: Date }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ["reportes-top-tratamientos", desde, hasta],
    queryFn: () => getTopTratamientos(desde, hasta, 15),
  });

  if (isLoading) return <Spinner />;
  const maxVal = Math.max(...data.map((d) => d.cantidad), 1);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Tratamientos mÃ¡s realizados</h3>
      {data.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">Sin datos en el perÃ­odo seleccionado.</p>
      ) : (
        <div className="space-y-2">
          {data.map((t, idx) => (
            <div key={idx} className="flex items-center gap-3">
              <span className="text-xs text-gray-400 w-5 text-right tabular-nums">{idx + 1}.</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-sm text-gray-700 truncate">{t.tratamiento}</span>
                  <span className="text-sm font-semibold tabular-nums ml-2 shrink-0">{t.cantidad}</span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-100">
                  <div
                    className="h-1.5 rounded-full bg-purple-400"
                    style={{ width: `${(t.cantidad / maxVal) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// â”€â”€â”€ Tab Citas por Doctor â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function TabCitasPorDoctor({ desde, hasta }: { desde: Date; hasta: Date }) {
  const navigate = useNavigate();
  const { data = [], isLoading } = useQuery({
    queryKey: ["reportes-citas-doctor", desde, hasta],
    queryFn: () => getCitasPorDoctor(desde, hasta),
  });

  if (isLoading) return <Spinner />;
  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-400">
        Sin datos en el perÃ­odo seleccionado.
      </div>
    );
  }

  const maxTotal = Math.max(...data.map((d) => d.total), 1);

  return (
    <div className="space-y-4">
      {/* GrÃ¡fico de barras apiladas */}
      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">DistribuciÃ³n de citas por doctor</h3>
        <div className="space-y-3">
          {data.map((d, idx) => {
            const pAtendidas = d.total > 0 ? (d.atendidas / d.total) * 100 : 0;
            const pFaltas = d.total > 0 ? (d.faltas / d.total) * 100 : 0;
            const pOtras = Math.max(0, 100 - pAtendidas - pFaltas);
            const barWidth = (d.total / maxTotal) * 100;
            const color = d.color ?? "#6b7280";
            return (
              <div key={idx} className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 w-32 shrink-0">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-xs text-gray-700 truncate">{d.doctor.split(" ")[0]}</span>
                </div>
                <div className="flex-1 relative h-5 rounded overflow-hidden bg-gray-100">
                  <div className="absolute inset-0 flex" style={{ width: `${barWidth}%` }}>
                    <div
                      className="h-full bg-green-400"
                      style={{ width: `${pAtendidas}%` }}
                      title={`Atendidas: ${d.atendidas}`}
                    />
                    <div
                      className="h-full bg-amber-300"
                      style={{ width: `${pOtras}%` }}
                      title={`Otras: ${d.total - d.atendidas - d.faltas}`}
                    />
                    <div
                      className="h-full bg-red-400"
                      style={{ width: `${pFaltas}%` }}
                      title={`Faltas: ${d.faltas}`}
                    />
                  </div>
                </div>
                <span className="text-xs tabular-nums text-gray-500 w-8 text-right">{d.total}</span>
              </div>
            );
          })}
        </div>
        {/* Leyenda */}
        <div className="flex items-center gap-4 mt-3 text-[11px] text-gray-500">
          <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-green-400 inline-block" />Atendidas</span>
          <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-amber-300 inline-block" />Programadas/otras</span>
          <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-red-400 inline-block" />Faltas</span>
        </div>
      </div>

      {/* Tabla detalle */}
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-5 py-2.5 text-left text-xs font-semibold text-gray-500">Doctor</th>
              <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-500">Total</th>
              <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-500">Atendidas</th>
              <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-500">Faltas</th>
              <th className="px-5 py-2.5 text-right text-xs font-semibold text-gray-500">% asist.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.map((d, idx) => {
              const tasa = d.total > 0 ? Math.round((d.atendidas / d.total) * 100) : 0;
              return (
                <tr
                  key={idx}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => d.doctor_id && navigate(`/agenda?doctor=${d.doctor_id}`)}
                >
                  <td className="px-5 py-2.5 flex items-center gap-2">
                    {d.color && <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: d.color }} />}
                    <span className="font-medium text-gray-800">{d.doctor}</span>
                  </td>
                  <td className="px-5 py-2.5 text-right tabular-nums text-gray-700">{d.total}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums text-green-700">{d.atendidas}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums text-red-500">{d.faltas}</td>
                  <td className="px-5 py-2.5 text-right tabular-nums">
                    <span className={`font-medium ${tasa >= 80 ? "text-green-600" : tasa >= 60 ? "text-amber-600" : "text-red-500"}`}>
                      {tasa}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// â”€â”€â”€ Tab Pacientes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function TabPacientes() {
  const navigate = useNavigate();
  const [soloActivos, setSoloActivos] = useState(true);
  const { data = [], isLoading } = useQuery({
    queryKey: ["reportes-pacientes", soloActivos],
    queryFn: () => getListadoPacientes(soloActivos, 200),
  });

  function exportarCSV() {
    const headers = ["HC", "Apellidos", "Nombre", "F. Nacimiento", "Citas", "Saldo pendiente", "Activo"];
    const rows = data.map((p) => [
      p.num_historial,
      p.apellidos,
      p.nombre,
      p.fecha_nacimiento ? format(new Date(p.fecha_nacimiento + "T00:00:00"), "dd/MM/yyyy") : "",
      p.total_citas,
      formatEUR(p.saldo_pendiente),
      p.activo ? "Si" : "No",
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(";")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pacientes_${format(new Date(), "yyyyMMdd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (isLoading) return <Spinner />;

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center gap-4 border-b border-gray-100 px-5 py-3">
        <h3 className="text-sm font-semibold text-gray-700">Listado de pacientes</h3>
        <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-500">
          <input
            type="checkbox"
            checked={soloActivos}
            onChange={(e) => setSoloActivos(e.target.checked)}
            className="rounded"
          />
          Solo activos
        </label>
        <span className="text-xs text-gray-400">{data.length} pacientes</span>
        <button
          onClick={exportarCSV}
          disabled={data.length === 0}
          className="ml-auto flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40"
        >
          Exportar CSV
        </button>
      </div>
      <table className="w-full text-sm">
        <thead className="sticky top-0 border-b border-gray-100 bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">HC</th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Nombre</th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">F. Nacimiento</th>
            <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">Citas</th>
            <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">Pendiente</th>
            <th className="px-4 py-2 text-center text-xs font-semibold text-gray-500">Activo</th>
            <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">Abrir</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {data.map((p) => (
            <tr key={p.id} className="cursor-pointer hover:bg-gray-50" onClick={() => navigate(`/pacientes/${p.id}`)}>
              <td className="px-4 py-2 font-mono text-xs text-gray-400 tabular-nums">{p.num_historial}</td>
              <td className="px-4 py-2 font-medium text-gray-800">{p.apellidos}, {p.nombre}</td>
              <td className="px-4 py-2 text-xs text-gray-500">
                {p.fecha_nacimiento ? format(new Date(p.fecha_nacimiento + "T00:00:00"), "dd/MM/yyyy") : "—"}
              </td>
              <td className="px-4 py-2 text-right text-gray-600 tabular-nums">{p.total_citas}</td>
              <td className={`px-4 py-2 text-right font-medium tabular-nums ${p.saldo_pendiente > 0 ? "text-red-600" : "text-gray-400"}`}>
                {p.saldo_pendiente > 0 ? formatEUR(p.saldo_pendiente) : "—"}
              </td>
              <td className="px-4 py-2 text-center">
                {p.activo ? <span className="text-xs text-green-600">✓</span> : <span className="text-xs text-gray-300">—</span>}
              </td>
              <td className="px-4 py-2 text-right">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/pacientes/${p.id}`);
                  }}
                  className="rounded-md border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                >
                  Ficha
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// â”€â”€â”€ Tab Faltas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function TabFaltas({ desde, hasta }: { desde: Date; hasta: Date }) {
  const navigate = useNavigate();
  const { data = [], isLoading } = useQuery({
    queryKey: ["reportes-faltas", desde, hasta],
    queryFn: () => getListadoFaltas(desde, hasta),
  });

  if (isLoading) return <Spinner />;

  const COLOR_TIPO: Record<string, string> = {
    falta: "bg-red-100 text-red-700",
    anulacion_paciente: "bg-amber-100 text-amber-700",
    anulacion_clinica: "bg-gray-100 text-gray-600",
  };

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
        <h3 className="text-sm font-semibold text-gray-700">Faltas y anulaciones</h3>
        <span className="text-xs text-gray-400">{data.length} registros</span>
      </div>
      {data.length === 0 ? (
        <p className="py-8 text-center text-sm text-gray-400">Sin faltas en el período seleccionado.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="border-b border-gray-100 bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Fecha</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Tipo</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Paciente</th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">HC</th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">Abrir</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.map((f, idx) => (
              <tr key={idx} className="cursor-pointer hover:bg-gray-50" onClick={() => navigate(`/pacientes/${f.paciente_id}`)}>
                <td className="px-4 py-2 text-xs text-gray-500 tabular-nums">
                  {format(new Date(f.fecha), "dd/MM/yyyy HH:mm")}
                </td>
                <td className="px-4 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${COLOR_TIPO[f.tipo] ?? "bg-gray-100 text-gray-600"}`}>
                    {f.tipo.replace("_", " ")}
                  </span>
                </td>
                <td className="px-4 py-2 text-gray-800">{f.paciente}</td>
                <td className="px-4 py-2 text-right font-mono text-xs text-gray-400 tabular-nums">{f.num_historial}</td>
                <td className="px-4 py-2 text-right">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/pacientes/${f.paciente_id}`);
                    }}
                    className="rounded-md border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  >
                    Ficha
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// â”€â”€â”€ Componentes auxiliares â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function Spinner() {
  return (
    <div className="flex h-40 items-center justify-center text-sm text-gray-400">Cargando...</div>
  );
}

function KPICard({ title, value, sub, color }: {
  title: string;
  value: number;
  sub?: string;
  color: "blue" | "green" | "purple" | "orange";
}) {
  const colors = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-green-50 text-green-700",
    purple: "bg-purple-50 text-purple-700",
    orange: "bg-orange-50 text-orange-700",
  };
  return (
    <div className={`rounded-lg border border-gray-200 bg-white p-4`}>
      <div className="text-xs text-gray-500 mb-1">{title}</div>
      <div className={`text-3xl font-bold tabular-nums ${colors[color].split(" ")[1]}`}>{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}

