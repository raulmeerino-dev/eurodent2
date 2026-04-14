/**
 * LaboratorioPage — Gestión de trabajos de laboratorio dental.
 * Tabs: Trabajos en curso | Todos | Laboratorios (catálogo)
 */
import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO, differenceInDays } from "date-fns";
import { apiClient } from "../../api/client";
import type {
  TrabajoLaboratorio,
  Laboratorio,
  EstadoTrabajo,
  TrabajoCreate,
  TrabajoUpdate,
} from "../../api/laboratorio";
import {
  getLaboratorios,
  getTrabajos,
  crearTrabajo,
  actualizarTrabajo,
  eliminarTrabajo,
  crearLaboratorio,
  actualizarLaboratorio,
  abrirWhatsappLab,
} from "../../api/laboratorio";
import type { Doctor } from "../../types";
import { buscarPacientes } from "../../api/pacientes";

// ─── Constantes ───────────────────────────────────────────────────────────────

type PageTab = "en_curso" | "todos" | "laboratorios";

const ESTADOS: { value: EstadoTrabajo; label: string; color: string; bg: string }[] = [
  { value: "pendiente",  label: "Pendiente",  color: "text-gray-600",   bg: "bg-gray-100" },
  { value: "enviado",    label: "Enviado",     color: "text-blue-700",   bg: "bg-blue-100" },
  { value: "en_proceso", label: "En proceso",  color: "text-amber-700",  bg: "bg-amber-100" },
  { value: "recibido",   label: "Recibido",    color: "text-teal-700",   bg: "bg-teal-100" },
  { value: "entregado",  label: "Entregado",   color: "text-green-700",  bg: "bg-green-100" },
  { value: "incidencia", label: "Incidencia",  color: "text-red-700",    bg: "bg-red-100" },
];


function estadoInfo(estado: EstadoTrabajo) {
  return ESTADOS.find((e) => e.value === estado) ?? ESTADOS[0];
}

function formatFechaCorta(f: string | null) {
  if (!f) return "—";
  try { return format(parseISO(f), "dd/MM/yy"); } catch { return f; }
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function LaboratorioPage() {
  const [tab, setTab] = useState<PageTab>("en_curso");
  const [modalTrabajo, setModalTrabajo] = useState<{
    trabajo?: TrabajoLaboratorio;
  } | null>(null);
  const [modalLab, setModalLab] = useState<{ lab?: Laboratorio } | null>(null);
  const qc = useQueryClient();

  const { data: laboratorios = [] } = useQuery({
    queryKey: ["laboratorios"],
    queryFn: () => getLaboratorios(false),
    staleTime: 60_000,
  });

  const { data: trabajosEnCurso = [], isLoading: loadingCurso } = useQuery({
    queryKey: ["trabajos-lab", "en_curso"],
    queryFn: () => getTrabajos({ pendientes: true }),
    staleTime: 30_000,
    enabled: tab === "en_curso",
  });

  const { data: todosTrabajos = [], isLoading: loadingTodos } = useQuery({
    queryKey: ["trabajos-lab", "todos"],
    queryFn: () => getTrabajos(),
    staleTime: 30_000,
    enabled: tab === "todos",
  });

  const trabajos = tab === "en_curso" ? trabajosEnCurso : todosTrabajos;
  const isLoading = tab === "en_curso" ? loadingCurso : loadingTodos;

  const numCurso = trabajosEnCurso.length;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Cabecera */}
      <div className="shrink-0 border-b border-gray-200 bg-white px-5 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-gray-900">Laboratorio</h1>
          <p className="text-xs text-gray-400 mt-0.5">Gestión de encargos a laboratorios dentales</p>
        </div>
        <button
          onClick={() => setModalTrabajo({})}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Nuevo encargo
        </button>
      </div>

      {/* Tabs */}
      <div className="shrink-0 flex border-b border-gray-200 bg-white px-5">
        {(
          [
            { id: "en_curso" as PageTab, label: "En curso", badge: numCurso },
            { id: "todos" as PageTab, label: "Todos" },
            { id: "laboratorios" as PageTab, label: "Laboratorios" },
          ] as { id: PageTab; label: string; badge?: number }[]
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.id ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
            {t.badge != null && t.badge > 0 && (
              <span className="ml-1.5 rounded-full bg-blue-100 text-blue-700 px-1.5 py-0.5 text-[10px] font-semibold">
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Contenido */}
      <div className="flex-1 overflow-hidden">
        {tab === "laboratorios" ? (
          <TabLaboratorios
            laboratorios={laboratorios}
            onNuevo={() => setModalLab({})}
            onEditar={(lab) => setModalLab({ lab })}
            onRefresh={() => qc.invalidateQueries({ queryKey: ["laboratorios"] })}
          />
        ) : isLoading ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">
            <div className="text-center">
              <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2" />
              Cargando...
            </div>
          </div>
        ) : (
          <TabTrabajos
            trabajos={trabajos}
            laboratorios={laboratorios}
            onEditar={(t) => setModalTrabajo({ trabajo: t })}
            onRefresh={() => {
              qc.invalidateQueries({ queryKey: ["trabajos-lab"] });
            }}
          />
        )}
      </div>

      {/* Modal trabajo */}
      {modalTrabajo !== null && (
        <TrabajoModal
          trabajo={modalTrabajo.trabajo}
          laboratorios={laboratorios.filter((l) => l.activo)}
          onClose={() => setModalTrabajo(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["trabajos-lab"] });
            setModalTrabajo(null);
          }}
        />
      )}

      {/* Modal laboratorio */}
      {modalLab !== null && (
        <LaboratorioModal
          lab={modalLab.lab}
          onClose={() => setModalLab(null)}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["laboratorios"] });
            setModalLab(null);
          }}
        />
      )}
    </div>
  );
}

// ─── Tab Trabajos ─────────────────────────────────────────────────────────────

function TabTrabajos({
  trabajos,
  laboratorios,
  onEditar,
  onRefresh,
}: {
  trabajos: TrabajoLaboratorio[];
  laboratorios: Laboratorio[];
  onEditar: (t: TrabajoLaboratorio) => void;
  onRefresh: () => void;
}) {
  const [filtroLab, setFiltroLab] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<EstadoTrabajo | "">("");
  const [busqueda, setBusqueda] = useState("");

  const filtrados = useMemo(() => {
    return trabajos.filter((t) => {
      if (filtroLab && t.laboratorio_id !== filtroLab) return false;
      if (filtroEstado && t.estado !== filtroEstado) return false;
      if (busqueda) {
        const q = busqueda.toLowerCase();
        const pac = t.paciente ? `${t.paciente.apellidos} ${t.paciente.nombre}`.toLowerCase() : "";
        if (!pac.includes(q) && !t.descripcion.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [trabajos, filtroLab, filtroEstado, busqueda]);

  if (trabajos.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-400">
        <div className="text-center">
          <p className="text-3xl mb-3">🔬</p>
          <p className="font-medium text-gray-600">No hay encargos registrados</p>
          <p className="text-xs mt-1">Crea el primero con el botón "+ Nuevo encargo"</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Filtros */}
      <div className="shrink-0 flex items-center gap-3 px-5 py-2.5 border-b border-gray-100 bg-gray-50">
        <input
          type="text"
          placeholder="Buscar paciente o descripción..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 w-52"
        />
        <select
          value={filtroLab}
          onChange={(e) => setFiltroLab(e.target.value)}
          className="rounded-md border border-gray-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos los laboratorios</option>
          {laboratorios.map((l) => (
            <option key={l.id} value={l.id}>{l.nombre}</option>
          ))}
        </select>
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value as EstadoTrabajo | "")}
          className="rounded-md border border-gray-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos los estados</option>
          {ESTADOS.map((e) => (
            <option key={e.value} value={e.value}>{e.label}</option>
          ))}
        </select>
        <span className="text-xs text-gray-400 ml-auto">{filtrados.length} resultado{filtrados.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Tabla */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-gray-50 border-b border-gray-200 z-10">
            <tr>
              <th className="text-left px-4 py-2.5 font-semibold text-gray-500">Paciente</th>
              <th className="text-left px-3 py-2.5 font-semibold text-gray-500">Descripción</th>
              <th className="text-left px-3 py-2.5 font-semibold text-gray-500">Laboratorio</th>
              <th className="text-center px-3 py-2.5 font-semibold text-gray-500">Salida</th>
              <th className="text-center px-3 py-2.5 font-semibold text-gray-500">Entrega prev.</th>
              <th className="text-center px-3 py-2.5 font-semibold text-gray-500">Recepción</th>
              <th className="text-center px-3 py-2.5 font-semibold text-gray-500">Estado</th>
              <th className="text-right px-4 py-2.5 font-semibold text-gray-500">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtrados.map((t) => {
              const est = estadoInfo(t.estado);
              const hoy = new Date();
              const diasRestantes = t.fecha_entrega_prevista && t.estado !== "recibido" && t.estado !== "entregado"
                ? differenceInDays(parseISO(t.fecha_entrega_prevista), hoy)
                : null;
              const retrasado = diasRestantes !== null && diasRestantes < 0;
              const urgente = diasRestantes !== null && diasRestantes >= 0 && diasRestantes <= 2;

              return (
                <tr key={t.id} className="hover:bg-gray-50 group">
                  <td className="px-4 py-2.5">
                    {t.paciente ? (
                      <div>
                        <p className="font-medium text-gray-800">
                          {t.paciente.apellidos}, {t.paciente.nombre}
                        </p>
                        <p className="text-gray-400 font-mono">Hx{t.paciente.num_historial}</p>
                      </div>
                    ) : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-3 py-2.5 max-w-[200px]">
                    <p className="text-gray-800 truncate">{t.descripcion}</p>
                    {t.pieza_dental && <p className="text-gray-400">Pieza {t.pieza_dental}{t.color ? ` · ${t.color}` : ""}</p>}
                  </td>
                  <td className="px-3 py-2.5">
                    <div>
                      <p className="font-medium text-gray-700 truncate max-w-[130px]">{t.laboratorio?.nombre ?? "—"}</p>
                      {t.laboratorio?.whatsapp && (
                        <button
                          onClick={() => abrirWhatsappLab(
                            t.laboratorio!.whatsapp!,
                            `Hola, os consulto sobre el encargo de ${t.paciente ? `${t.paciente.apellidos}, ${t.paciente.nombre}` : "paciente"}: ${t.descripcion}`
                          )}
                          className="text-[10px] text-green-600 hover:text-green-800 hover:underline"
                        >
                          WhatsApp →
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-center text-gray-500">{formatFechaCorta(t.fecha_salida)}</td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={retrasado ? "text-red-600 font-semibold" : urgente ? "text-amber-600 font-semibold" : "text-gray-500"}>
                      {formatFechaCorta(t.fecha_entrega_prevista)}
                      {retrasado && " ⚠"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center text-gray-500">{formatFechaCorta(t.fecha_recepcion)}</td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${est.bg} ${est.color}`}>
                      {est.label}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <EstadoRapido trabajo={t} onUpdated={onRefresh} />
                      <button
                        onClick={() => onEditar(t)}
                        className="rounded px-2 py-1 text-[11px] bg-gray-100 hover:bg-blue-100 text-gray-600 hover:text-blue-700"
                      >
                        Editar
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm("¿Eliminar este encargo?")) return;
                          await eliminarTrabajo(t.id);
                          onRefresh();
                        }}
                        className="rounded px-2 py-1 text-[11px] bg-red-50 hover:bg-red-100 text-red-500"
                      >
                        ✕
                      </button>
                    </div>
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

// ─── Botón avance de estado rápido ───────────────────────────────────────────

const FLUJO_ESTADO: Record<EstadoTrabajo, EstadoTrabajo | null> = {
  pendiente:  "enviado",
  enviado:    "en_proceso",
  en_proceso: "recibido",
  recibido:   "entregado",
  entregado:  null,
  incidencia: "pendiente",
};

function EstadoRapido({ trabajo, onUpdated }: { trabajo: TrabajoLaboratorio; onUpdated: () => void }) {
  const [loading, setLoading] = useState(false);
  const siguiente = FLUJO_ESTADO[trabajo.estado];
  if (!siguiente) return null;
  const est = estadoInfo(siguiente);

  const avanzar = async () => {
    setLoading(true);
    try {
      const update: TrabajoUpdate = { estado: siguiente };
      // Rellenar fechas automáticamente
      if (siguiente === "enviado" && !trabajo.fecha_salida) {
        update.fecha_salida = format(new Date(), "yyyy-MM-dd");
      }
      if (siguiente === "recibido" && !trabajo.fecha_recepcion) {
        update.fecha_recepcion = format(new Date(), "yyyy-MM-dd");
      }
      if (siguiente === "entregado" && !trabajo.fecha_entrega_paciente) {
        update.fecha_entrega_paciente = format(new Date(), "yyyy-MM-dd");
      }
      await actualizarTrabajo(trabajo.id, update);
      onUpdated();
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={avanzar}
      disabled={loading}
      className={`rounded px-2 py-1 text-[11px] font-medium ${est.bg} ${est.color} hover:brightness-95 disabled:opacity-50`}
      title={`Avanzar a: ${est.label}`}
    >
      {loading ? "..." : `→ ${est.label}`}
    </button>
  );
}

// ─── Tab Laboratorios (catálogo) ──────────────────────────────────────────────

function TabLaboratorios({
  laboratorios,
  onNuevo,
  onEditar,
  onRefresh,
}: {
  laboratorios: Laboratorio[];
  onNuevo: () => void;
  onEditar: (l: Laboratorio) => void;
  onRefresh: () => void;
}) {
  return (
    <div className="h-full overflow-y-auto p-5">
      <div className="max-w-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700">Laboratorios registrados</h2>
          <button
            onClick={onNuevo}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
          >
            + Nuevo laboratorio
          </button>
        </div>

        {laboratorios.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
            <p className="text-sm text-gray-400">No hay laboratorios registrados todavía.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {laboratorios.map((lab) => (
              <div key={lab.id} className={`rounded-lg border px-4 py-3 flex items-center gap-4 ${lab.activo ? "border-gray-200 bg-white" : "border-gray-100 bg-gray-50 opacity-60"}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-800 truncate">{lab.nombre}</p>
                    {!lab.activo && <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">Inactivo</span>}
                  </div>
                  <div className="flex gap-3 mt-0.5 text-xs text-gray-400 flex-wrap">
                    {lab.contacto && <span>{lab.contacto}</span>}
                    {lab.telefono && <span>{lab.telefono}</span>}
                    {lab.email && <span>{lab.email}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {lab.whatsapp && (
                    <button
                      onClick={() => abrirWhatsappLab(lab.whatsapp!, `Hola ${lab.nombre}, os escribimos desde la clínica.`)}
                      className="rounded px-2.5 py-1 text-[11px] bg-green-50 text-green-700 hover:bg-green-100 font-medium"
                    >
                      WhatsApp
                    </button>
                  )}
                  <button
                    onClick={() => onEditar(lab)}
                    className="rounded px-2.5 py-1 text-[11px] bg-gray-100 hover:bg-blue-100 text-gray-600 hover:text-blue-700"
                  >
                    Editar
                  </button>
                  <button
                    onClick={async () => {
                      await actualizarLaboratorio(lab.id, { activo: !lab.activo });
                      onRefresh();
                    }}
                    className="rounded px-2.5 py-1 text-[11px] bg-gray-100 hover:bg-gray-200 text-gray-500"
                  >
                    {lab.activo ? "Desactivar" : "Activar"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Modal Trabajo ────────────────────────────────────────────────────────────

function TrabajoModal({
  trabajo,
  laboratorios,
  onClose,
  onSaved,
}: {
  trabajo?: TrabajoLaboratorio;
  laboratorios: Laboratorio[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const esEdicion = !!trabajo;
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Búsqueda de paciente
  const [pacienteQuery, setPacienteQuery] = useState("");
  const [pacienteId, setPacienteId] = useState(trabajo?.paciente_id ?? "");
  const [pacienteLabel, setPacienteLabel] = useState(
    trabajo?.paciente ? `${trabajo.paciente.apellidos}, ${trabajo.paciente.nombre}` : ""
  );
  const [busquedaAbierta, setBusquedaAbierta] = useState(false);

  const { data: resultadosBusqueda } = useQuery({
    queryKey: ["pacientes-buscar", pacienteQuery],
    queryFn: () => buscarPacientes(pacienteQuery),
    enabled: pacienteQuery.length >= 2,
    staleTime: 5_000,
    select: (d) => (Array.isArray(d) ? d : []),
  });

  // Doctor
  const { data: doctoresData } = useQuery({
    queryKey: ["doctores"],
    queryFn: async () => {
      const r = await apiClient.get("/doctores");
      return Array.isArray(r.data) ? (r.data as Doctor[]).filter((d) => d.activo) : [];
    },
    staleTime: 5 * 60_000,
  });
  const doctores = doctoresData ?? [];

  const [doctorId, setDoctorId] = useState(trabajo?.doctor_id ?? "");
  const [laboratorioId, setLaboratorioId] = useState(trabajo?.laboratorio_id ?? "");
  const [descripcion, setDescripcion] = useState(trabajo?.descripcion ?? "");
  const [pieza, setPieza] = useState(trabajo?.pieza_dental?.toString() ?? "");
  const [color, setColor] = useState(trabajo?.color ?? "");
  const [observaciones, setObservaciones] = useState(trabajo?.observaciones ?? "");
  const [fechaSalida, setFechaSalida] = useState(trabajo?.fecha_salida ?? "");
  const [fechaEntrega, setFechaEntrega] = useState(trabajo?.fecha_entrega_prevista ?? "");
  const [fechaRecepcion, setFechaRecepcion] = useState(trabajo?.fecha_recepcion ?? "");
  const [fechaEntregaPac, setFechaEntregaPac] = useState(trabajo?.fecha_entrega_paciente ?? "");
  const [estado, setEstado] = useState<EstadoTrabajo>(trabajo?.estado ?? "pendiente");
  const [precio, setPrecio] = useState(trabajo?.precio?.toString() ?? "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pacienteId || !doctorId || !laboratorioId || !descripcion.trim()) return;
    setGuardando(true);
    setError(null);
    try {
      const base = {
        doctor_id: doctorId,
        laboratorio_id: laboratorioId,
        descripcion: descripcion.trim(),
        pieza_dental: pieza ? parseInt(pieza) : undefined,
        color: color || undefined,
        observaciones: observaciones || undefined,
        fecha_salida: fechaSalida || undefined,
        fecha_entrega_prevista: fechaEntrega || undefined,
        fecha_recepcion: fechaRecepcion || undefined,
        fecha_entrega_paciente: fechaEntregaPac || undefined,
        precio: precio ? parseFloat(precio) : undefined,
      };
      if (esEdicion && trabajo) {
        await actualizarTrabajo(trabajo.id, { ...base, estado });
      } else {
        const create: TrabajoCreate = { paciente_id: pacienteId, ...base };
        await crearTrabajo(create);
      }
      onSaved();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(msg ?? "Error al guardar");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-xl rounded-xl bg-white shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-gray-50 shrink-0">
          <h2 className="text-base font-semibold text-gray-800">
            {esEdicion ? "Editar encargo" : "Nuevo encargo de laboratorio"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100">
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 px-5 py-4 space-y-3">
          {/* Paciente */}
          {!esEdicion ? (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Paciente</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar paciente..."
                  value={pacienteId ? pacienteLabel : pacienteQuery}
                  onChange={(e) => {
                    setPacienteQuery(e.target.value);
                    setPacienteLabel("");
                    setPacienteId("");
                    setBusquedaAbierta(true);
                  }}
                  onFocus={() => setBusquedaAbierta(true)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8"
                  required={!pacienteId}
                />
                {pacienteId && <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-green-500">✓</span>}
                {busquedaAbierta && !pacienteId && Array.isArray(resultadosBusqueda) && resultadosBusqueda.length > 0 && (
                  <ul className="absolute z-20 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg max-h-40 overflow-y-auto">
                    {resultadosBusqueda.map((p) => (
                      <li
                        key={p.id}
                        className="cursor-pointer px-3 py-2 text-sm hover:bg-blue-50 flex justify-between"
                        onMouseDown={() => {
                          setPacienteId(p.id);
                          setPacienteLabel(`${p.apellidos}, ${p.nombre}`);
                          setPacienteQuery("");
                          setBusquedaAbierta(false);
                        }}
                      >
                        <span className="font-medium">{p.apellidos}, {p.nombre}</span>
                        <span className="text-gray-400 text-xs">Hx{p.num_historial}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : (
            <div className="text-sm font-medium text-gray-700 bg-gray-50 px-3 py-2 rounded-md">
              {trabajo.paciente ? `${trabajo.paciente.apellidos}, ${trabajo.paciente.nombre}` : "Paciente"}
            </div>
          )}

          {/* Doctor + Lab */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Doctor</label>
              <select value={doctorId} onChange={(e) => setDoctorId(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                <option value="">Seleccionar...</option>
                {doctores.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Laboratorio</label>
              <select value={laboratorioId} onChange={(e) => setLaboratorioId(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                <option value="">Seleccionar...</option>
                {laboratorios.map((l) => <option key={l.id} value={l.id}>{l.nombre}</option>)}
              </select>
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Descripción del trabajo</label>
            <input type="text" value={descripcion} onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej: Corona de porcelana, Prótesis parcial removible, Carilla..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
          </div>

          {/* Pieza + Color + Precio */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Pieza dental</label>
              <input type="number" value={pieza} onChange={(e) => setPieza(e.target.value)}
                min={11} max={48} placeholder="FDI"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Color dental</label>
              <input type="text" value={color} onChange={(e) => setColor(e.target.value)}
                placeholder="A2, B1, OM3..."
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Precio lab. (€)</label>
              <input type="number" value={precio} onChange={(e) => setPrecio(e.target.value)}
                min={0} step={0.01} placeholder="0.00"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Fecha de salida</label>
              <input type="date" value={fechaSalida} onChange={(e) => setFechaSalida(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Entrega prevista</label>
              <input type="date" value={fechaEntrega} onChange={(e) => setFechaEntrega(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Fecha de recepción</label>
              <input type="date" value={fechaRecepcion} onChange={(e) => setFechaRecepcion(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Entrega al paciente</label>
              <input type="date" value={fechaEntregaPac} onChange={(e) => setFechaEntregaPac(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          {/* Estado (solo edición) */}
          {esEdicion && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Estado</label>
              <div className="flex flex-wrap gap-1.5">
                {ESTADOS.map((e) => (
                  <button type="button" key={e.value} onClick={() => setEstado(e.value)}
                    className={`rounded-full px-3 py-1 text-xs font-medium border-2 transition-all ${
                      estado === e.value
                        ? `${e.bg} ${e.color} border-current`
                        : "border-transparent bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}>
                    {e.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Observaciones */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Observaciones</label>
            <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)}
              rows={2} placeholder="Instrucciones especiales, notas..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded">{error}</p>}

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">
              Cancelar
            </button>
            <button type="submit" disabled={guardando || !pacienteId || !doctorId || !laboratorioId}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {guardando ? "Guardando..." : esEdicion ? "Guardar cambios" : "Crear encargo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Modal Laboratorio ────────────────────────────────────────────────────────

function LaboratorioModal({
  lab,
  onClose,
  onSaved,
}: {
  lab?: Laboratorio;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [guardando, setGuardando] = useState(false);
  const [nombre, setNombre] = useState(lab?.nombre ?? "");
  const [telefono, setTelefono] = useState(lab?.telefono ?? "");
  const [whatsapp, setWhatsapp] = useState(lab?.whatsapp ?? "");
  const [email, setEmail] = useState(lab?.email ?? "");
  const [contacto, setContacto] = useState(lab?.contacto ?? "");
  const [notas, setNotas] = useState(lab?.notas ?? "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    try {
      const data = {
        nombre: nombre.trim(),
        telefono: telefono || undefined,
        whatsapp: whatsapp || undefined,
        email: email || undefined,
        contacto: contacto || undefined,
        notas: notas || undefined,
      };
      if (lab) {
        await actualizarLaboratorio(lab.id, data);
      } else {
        await crearLaboratorio(data);
      }
      onSaved();
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-base font-semibold text-gray-800">{lab ? "Editar laboratorio" : "Nuevo laboratorio"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Nombre</label>
            <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Teléfono</label>
              <input type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                WhatsApp <span className="text-gray-400 font-normal">(para mensajes directos)</span>
              </label>
              <input type="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="34612345678"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Persona de contacto</label>
            <input type="text" value={contacto} onChange={(e) => setContacto(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notas</label>
            <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={guardando || !nombre.trim()}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {guardando ? "Guardando..." : lab ? "Guardar" : "Crear"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
