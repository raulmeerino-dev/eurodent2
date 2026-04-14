/**
 * FichaPaciente — Vista completa de un paciente.
 * Tabs: Datos | Salud | Historial | Pendiente | Citas | Presupuestos | Facturación
 */
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { usePaciente, useReferenciasCatalogo, useAsignarReferencias } from "../../hooks/usePacientes";
import { usePresupuestos } from "../../hooks/usePresupuestos";
import { useFacturas, useFormasPago, useRegistrarCobro } from "../../hooks/useFacturas";
import { getCitas } from "../../api/citas";
import { apiClient } from "../../api/client";
import { calcularEdad, formatFecha, COLORES_ESTADO_CITA, formatEUR } from "../../utils";
import PacienteFormModal from "./PacienteFormModal";
import HistorialClinico from "../historial/HistorialClinico";
import { abrirPdfFactura, abrirPdfPresupuesto } from "../../api/facturas";
import CitaModal from "../agenda/CitaModal";
import { NuevaFacturaModal } from "../facturacion/FacturacionPage";
import type { Factura, Doctor } from "../../types";
import type { Presupuesto } from "../../api/presupuestos";
import type { DocumentoPaciente, CategoriaDocumento } from "../../api/documentos";
import { getDocumentos, subirDocumento, eliminarDocumento, descargarDocumento, verDocumento } from "../../api/documentos";
import type { EstadoTrabajo } from "../../api/laboratorio";
import { getTrabajos, actualizarTrabajo, abrirWhatsappLab } from "../../api/laboratorio";

/** Convierte strings decimales de la API a number */
const n = (v: unknown): number => Number(v) || 0;

type Tab = "datos" | "salud" | "historial" | "pendiente" | "citas" | "presupuestos" | "facturacion" | "archivos" | "laboratorio";

const TABS: { id: Tab; label: string }[] = [
  { id: "datos",         label: "Datos" },
  { id: "salud",         label: "Salud" },
  { id: "historial",     label: "Historial" },
  { id: "pendiente",     label: "Pendiente" },
  { id: "citas",         label: "Citas" },
  { id: "presupuestos",  label: "Presupuestos" },
  { id: "facturacion",   label: "Facturación" },
  { id: "archivos",      label: "Archivos" },
  { id: "laboratorio",   label: "Laboratorio" },
];

const COLORES_ESTADO_PRESUP: Record<string, string> = {
  borrador:   "bg-gray-100 text-gray-600",
  presentado: "bg-blue-100 text-blue-700",
  aceptado:   "bg-green-100 text-green-700",
  rechazado:  "bg-red-100 text-red-600",
  parcial:    "bg-yellow-100 text-yellow-700",
};

const COLORES_ESTADO_FACT: Record<string, string> = {
  emitida: "bg-blue-100 text-blue-700",
  cobrada: "bg-green-100 text-green-700",
  parcial: "bg-yellow-100 text-yellow-700",
  anulada: "bg-red-100 text-red-500",
};

// ─── Componente principal ─────────────────────────────────────────────────────

export default function FichaPaciente() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [editando, setEditando] = useState(false);
  const [tab, setTab] = useState<Tab>("datos");
  const [nuevaCitaModal, setNuevaCitaModal] = useState(false);
  const [nuevaFacturaModal, setNuevaFacturaModal] = useState(false);
  const [cobrandoFactura, setCobrandoFactura] = useState<Factura | null>(null);

  const { data: paciente, isLoading } = usePaciente(id ?? null);
  const { data: refsCatalogo = [] } = useReferenciasCatalogo();
  const asignarMutation = useAsignarReferencias();

  // Doctores para CitaModal
  const { data: doctoresData } = useQuery({
    queryKey: ["doctores"],
    queryFn: async () => {
      const r = await apiClient.get("/doctores");
      return Array.isArray(r.data) ? r.data as Doctor[] : [];
    },
    staleTime: 5 * 60_000,
  });
  const doctores = doctoresData ?? [];

  const { data: citas = [] } = useQuery({
    queryKey: ["citas-paciente", id],
    queryFn: () => getCitas({ paciente_id: id }),
    enabled: !!id,
    staleTime: 30_000,
    select: (data) => (Array.isArray(data) ? data : []),
  });

  const { data: presupuestos = [] } = usePresupuestos(id ? { paciente_id: id } : undefined);

  const { data: trabajoPendiente = [], refetch: refetchTrabajo } = useQuery({
    queryKey: ["trabajo-pendiente", id],
    queryFn: async () => {
      const r = await apiClient.get(`/presupuestos/trabajo-pendiente/${id}?solo_pendiente=true`);
      return Array.isArray(r.data) ? r.data : [];
    },
    enabled: !!id,
    staleTime: 30_000,
  });

  const numPendiente = trabajoPendiente.length;

  const { data: facturas = [], refetch: refetchFacturas } = useFacturas(
    id ? { paciente_id: id, limit: 200 } : {}
  );

  if (isLoading) {
    return <div className="flex h-full items-center justify-center text-sm text-gray-400">Cargando...</div>;
  }
  if (!paciente) {
    return <div className="text-sm text-red-600 p-4">Paciente no encontrado.</div>;
  }

  const edad = paciente.fecha_nacimiento ? calcularEdad(paciente.fecha_nacimiento) : null;
  const citasPasadas = citas.filter((c) => new Date(c.fecha_hora) < new Date()).slice(0, 50);
  const citasFuturas = citas.filter((c) => new Date(c.fecha_hora) >= new Date());
  const numFaltas = citas.filter((c) => c.estado === "falta").length;
  const saldoPendiente = facturas
    .filter((f) => f.estado !== "anulada")
    .reduce((acc, f) => acc + n(f.pendiente ?? 0), 0);

  function toggleReferencia(refId: string) {
    const actuales = paciente!.referencias?.map((r) => r.id) ?? [];
    const nuevas = actuales.includes(refId)
      ? actuales.filter((id) => id !== refId)
      : [...actuales, refId];
    asignarMutation.mutate({ pacienteId: paciente!.id, ids: nuevas });
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* ── Cabecera ── */}
      <div className="shrink-0 bg-white border-b border-gray-200 px-5 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* Identidad */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-11 w-11 rounded-full bg-blue-100 flex items-center justify-center text-lg font-bold text-blue-600 shrink-0">
              {paciente.apellidos[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-gray-900 truncate">
                {paciente.apellidos}, {paciente.nombre}
              </h1>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500 flex-wrap">
                <span className="font-mono">Hx{paciente.num_historial}</span>
                {edad !== null && <span>{edad} años</span>}
                {paciente.telefono && (
                  <a href={`tel:${paciente.telefono}`} className="text-blue-600 hover:underline">
                    {paciente.telefono}
                  </a>
                )}
                {numFaltas > 0 && (
                  <span className="text-red-600 font-semibold">! {numFaltas} falta{numFaltas !== 1 ? "s" : ""}</span>
                )}
                {saldoPendiente > 0.01 && (
                  <span className="text-red-600 font-semibold">$ {saldoPendiente.toFixed(2)} €</span>
                )}
                {/* Tags */}
                {paciente.referencias?.map((r) => (
                  <span key={r.id} className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                    style={{ backgroundColor: (r.color ?? "#6B7280") + "22", color: r.color ?? "#6B7280" }}>
                    {r.nombre}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Acciones rápidas */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setNuevaCitaModal(true)}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
            >
              + Cita
            </button>
            <button
              onClick={() => {
                setTab("facturacion");
                setNuevaFacturaModal(true);
              }}
              className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700"
            >
              + Factura
            </button>
            {saldoPendiente > 0.01 && (
              <button
                onClick={() => {
                  const primera = facturas.find((f) => n(f.pendiente) > 0 && f.estado !== "anulada");
                  if (primera) setCobrandoFactura(primera);
                }}
                className="rounded-md bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-600"
              >
                Cobrar {formatEUR(saldoPendiente)}
              </button>
            )}
            <button onClick={() => setEditando(true)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-xs hover:bg-gray-50">
              Editar
            </button>
            <button onClick={() => navigate(-1)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-xs hover:bg-gray-50">
              ← Volver
            </button>
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="shrink-0 border-b border-gray-200 bg-slate-50/70 px-5 py-3">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <HubShortcutCard
            label="Presupuestos"
            value={String(presupuestos.length)}
            hint="Planes, aceptaciones y odontograma"
            action="Abrir planes"
            onClick={() => setTab("presupuestos")}
          />
          <HubShortcutCard
            label="Pendiente"
            value={String(numPendiente)}
            hint="Tratamientos pendientes de realizar"
            action="Revisar trabajo"
            onClick={() => setTab("pendiente")}
          />
          <HubShortcutCard
            label="Agenda"
            value={String(citasFuturas.length)}
            hint="Proximas citas y seguimiento del paciente"
            action="Ver citas"
            onClick={() => setTab("citas")}
          />
          <HubShortcutCard
            label="Facturacion"
            value={formatEUR(saldoPendiente)}
            hint="Cobros, saldo pendiente y documentos fiscales"
            action="Abrir cobros"
            onClick={() => setTab("facturacion")}
            emphasis={saldoPendiente > 0.01}
          />
        </div>
      </div>

      <div className="shrink-0 flex border-b border-gray-200 bg-white px-5 overflow-x-auto">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-3 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
              tab === t.id ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
            {t.id === "pendiente" && numPendiente > 0 && (
              <span className="ml-1.5 rounded-full bg-amber-100 text-amber-700 px-1.5 py-0.5 text-[10px] font-semibold">{numPendiente}</span>
            )}
            {t.id === "presupuestos" && presupuestos.length > 0 && (
              <span className="ml-1.5 rounded-full bg-gray-100 text-gray-600 px-1.5 py-0.5 text-[10px]">{presupuestos.length}</span>
            )}
            {t.id === "facturacion" && facturas.length > 0 && (
              <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${saldoPendiente > 0.01 ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-600"}`}>
                {facturas.length}
              </span>
            )}
            {t.id === "citas" && citasFuturas.length > 0 && (
              <span className="ml-1.5 rounded-full bg-blue-100 text-blue-600 px-1.5 py-0.5 text-[10px]">{citasFuturas.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Contenido ── */}
      <div className="flex-1 overflow-hidden">
        {tab === "datos" && (
          <TabDatos paciente={paciente} refsCatalogo={refsCatalogo}
            citasFuturas={citasFuturas} citasPasadas={citasPasadas}
            numFaltas={numFaltas} saldoPendiente={saldoPendiente}
            onToggleReferencia={toggleReferencia}
          />
        )}
        {tab === "salud" && id && (
          <TabSalud pacienteId={id} datosSaludIniciales={paciente.datos_salud ?? null} />
        )}
        {tab === "historial" && id && (
          <div className="h-full overflow-y-auto p-4">
            <HistorialClinico pacienteId={id} />
          </div>
        )}
        {tab === "pendiente" && (
          <TabPendiente items={trabajoPendiente} onRealizado={() => refetchTrabajo()} />
        )}
        {tab === "citas" && (
          <TabCitas
            citasFuturas={citasFuturas as CitaRow[]}
            citasPasadas={citasPasadas as CitaRow[]}
            onNuevaCita={() => setNuevaCitaModal(true)}
          />
        )}
        {tab === "presupuestos" && (
          <TabPresupuestos presupuestos={presupuestos} />
        )}
        {tab === "facturacion" && (
          <TabFacturacion
            facturas={facturas}
            onCobrar={(f) => setCobrandoFactura(f)}
          />
        )}
        {tab === "archivos" && id && (
          <TabArchivos pacienteId={id} />
        )}
        {tab === "laboratorio" && id && (
          <TabLaboratorioPaciente pacienteId={id} />
        )}
      </div>

      {/* ── Modales ── */}
      {editando && (
        <PacienteFormModal paciente={paciente} onClose={() => setEditando(false)} />
      )}
      {nuevaCitaModal && (
        <CitaModal
          doctores={doctores}
          doctorIdInicial={doctores[0]?.id}
          onClose={() => setNuevaCitaModal(false)}
        />
      )}
      {nuevaFacturaModal && (
        <NuevaFacturaModal
          onClose={() => {
            setNuevaFacturaModal(false);
            refetchFacturas();
          }}
          pacienteInicial={{
            id: paciente.id,
            nombre: paciente.nombre,
            apellidos: paciente.apellidos,
          }}
        />
      )}
      {cobrandoFactura && (
        <CobrarModal
          factura={cobrandoFactura}
          onClose={() => { setCobrandoFactura(null); refetchFacturas(); }}
        />
      )}
    </div>
  );
}

// ─── Tab Datos ────────────────────────────────────────────────────────────────

function HubShortcutCard({
  label,
  value,
  hint,
  action,
  onClick,
  emphasis = false,
}: {
  label: string;
  value: string;
  hint: string;
  action: string;
  onClick: () => void;
  emphasis?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "rounded-2xl border bg-white px-4 py-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md",
        emphasis ? "border-amber-200 bg-amber-50/70" : "border-slate-200",
      ].join(" ")}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">{label}</p>
      <p className={["mt-3 text-2xl font-semibold tracking-tight", emphasis ? "text-amber-700" : "text-slate-900"].join(" ")}>
        {value}
      </p>
      <p className="mt-2 text-sm leading-5 text-slate-500">{hint}</p>
      <span className="mt-4 inline-flex rounded-full bg-slate-900 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-white">
        {action}
      </span>
    </button>
  );
}

function TabDatos({
  paciente, refsCatalogo, citasFuturas, citasPasadas, numFaltas, saldoPendiente, onToggleReferencia,
}: {
  paciente: NonNullable<ReturnType<typeof usePaciente>["data"]>;
  refsCatalogo: { id: string; nombre: string; color: string | null }[];
  citasFuturas: unknown[];
  citasPasadas: unknown[];
  numFaltas: number;
  saldoPendiente: number;
  onToggleReferencia: (id: string) => void;
}) {
  return (
    <div className="flex h-full overflow-hidden">
      {/* Columna izquierda — datos personales */}
      <div className="w-72 shrink-0 border-r border-gray-200 overflow-y-auto p-4 space-y-5">
        <Section title="Datos personales">
          <DatoRow label="DNI/NIE" value={paciente.dni_nie} />
          <DatoRow label="F. nacimiento" value={(() => {
            if (!paciente.fecha_nacimiento) return undefined;
            const e = calcularEdad(paciente.fecha_nacimiento);
            return `${formatFecha(paciente.fecha_nacimiento)}${e !== null ? ` (${e} años)` : ""}`;
          })()} />
          <DatoRow label="Email" value={paciente.email} />
          <DatoRow label="Teléfono 2" value={paciente.telefono2} />
          {paciente.no_correo && <p className="text-[11px] text-amber-600">Sin correo circular</p>}
        </Section>

        <Section title="Dirección">
          <DatoRow label="Dirección" value={paciente.direccion} />
          <DatoRow label="C.P." value={paciente.codigo_postal} />
          <DatoRow label="Ciudad" value={paciente.ciudad} />
          <DatoRow label="Provincia" value={paciente.provincia} />
        </Section>

        {(paciente.entidad_id || paciente.entidad_alt_id) && (
          <Section title="Entidades">
            <DatoRow label="Principal" value={(paciente as any).entidad?.nombre} />
            <DatoRow label="Alternativa" value={(paciente as any).entidad_alt?.nombre} />
          </Section>
        )}

        {paciente.observaciones && (
          <Section title="Observaciones">
            <p className="text-xs text-gray-600 whitespace-pre-wrap">{paciente.observaciones}</p>
          </Section>
        )}

        <Section title="Etiquetas">
          <div className="flex flex-wrap gap-1.5">
            {refsCatalogo.map((r) => {
              const activa = paciente.referencias?.some((pr) => pr.id === r.id);
              return (
                <button key={r.id} onClick={() => onToggleReferencia(r.id)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium border transition-all ${activa ? "opacity-100" : "opacity-35 hover:opacity-60"}`}
                  style={{ backgroundColor: activa ? (r.color ?? "#6B7280") + "22" : "transparent", borderColor: r.color ?? "#6B7280", color: r.color ?? "#6B7280" }}
                >
                  {r.nombre}
                </button>
              );
            })}
          </div>
        </Section>
      </div>

      {/* Columna derecha — resumen */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <KpiCard label="Citas futuras" value={String(citasFuturas.length)} />
          <KpiCard label="Historial" value={String(citasPasadas.length)} />
          <KpiCard label="Faltas" value={String(numFaltas)} color={numFaltas > 0 ? "text-red-600" : undefined} />
          <KpiCard label="Saldo pendiente" value={`${saldoPendiente.toFixed(2)} €`} color={saldoPendiente > 0.01 ? "text-red-600" : undefined} />
        </div>
      </div>
    </div>
  );
}

// ─── Tab Salud ────────────────────────────────────────────────────────────────

interface DatosSalud {
  alergias?: string;
  medicacion?: string;
  operaciones?: string;
  enfermedades?: string;
  observaciones_medicas?: string;
}

function TabSalud({ pacienteId, datosSaludIniciales }: {
  pacienteId: string;
  datosSaludIniciales: DatosSalud | null;
}) {
  const qc = useQueryClient();
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [datos, setDatos] = useState<DatosSalud>(datosSaludIniciales ?? {});
  const [borrador, setBorrador] = useState<DatosSalud>(datosSaludIniciales ?? {});

  async function guardar() {
    setGuardando(true);
    try {
      await apiClient.patch(`/pacientes/${pacienteId}/salud`, borrador);
      setDatos(borrador);
      qc.invalidateQueries({ queryKey: ["paciente", pacienteId] });
      setEditando(false);
    } catch {
      // silencioso
    } finally {
      setGuardando(false);
    }
  }

  function cancelar() {
    setBorrador(datos);
    setEditando(false);
  }

  const campos: { key: keyof DatosSalud; label: string; placeholder: string }[] = [
    { key: "alergias",             label: "Alergias",                placeholder: "Penicilina, látex, contrastes yodados..." },
    { key: "medicacion",           label: "Medicación habitual",      placeholder: "Nombre del medicamento, dosis, frecuencia..." },
    { key: "enfermedades",         label: "Enfermedades / Patologías",placeholder: "Diabetes, hipertensión, cardiopatía..." },
    { key: "operaciones",          label: "Operaciones / Intervenciones", placeholder: "Descripción y fecha aproximada..." },
    { key: "observaciones_medicas",label: "Otras observaciones",      placeholder: "Información relevante para el tratamiento..." },
  ];

  const hayDatos = campos.some((c) => datos[c.key]);

  return (
    <div className="h-full overflow-y-auto p-5">
      <div className="max-w-2xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-800">Historia médica</h2>
            <p className="text-xs text-gray-400 mt-0.5">Información de salud relevante para el tratamiento dental</p>
          </div>
          {!editando ? (
            <button onClick={() => { setBorrador(datos); setEditando(true); }}
              className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700">
              {hayDatos ? "Editar" : "Añadir datos"}
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={cancelar}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-xs hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={guardar} disabled={guardando}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                {guardando ? "Guardando..." : "Guardar"}
              </button>
            </div>
          )}
        </div>

        {!hayDatos && !editando ? (
          <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
            <p className="text-sm text-gray-400">No hay datos de salud registrados.</p>
            <button onClick={() => { setBorrador(datos); setEditando(true); }}
              className="mt-3 text-xs text-blue-600 hover:underline">
              Añadir historia médica →
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {campos.map(({ key, label, placeholder }) => (
              <div key={key} className="rounded-lg border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                  <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{label}</h3>
                </div>
                <div className="p-4">
                  {editando ? (
                    <textarea
                      rows={3}
                      value={borrador[key] ?? ""}
                      onChange={(e) => setBorrador((prev) => ({ ...prev, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="w-full text-sm text-gray-700 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  ) : datos[key] ? (
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{datos[key]}</p>
                  ) : (
                    <p className="text-sm text-gray-400 italic">Sin datos</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Adjuntos de historia médica */}
        <div className="mt-6">
          <AdjuntosSeccion pacienteId={pacienteId} categoria="historia_medica" titulo="Archivos adjuntos" />
        </div>
      </div>
    </div>
  );
}

// ─── Tab Citas ────────────────────────────────────────────────────────────────

type CitaRow = {
  id: string;
  fecha_hora: string;
  estado: string;
  motivo: string | null;
  doctor?: { nombre: string } | null;
};

function TabCitas({ citasFuturas, citasPasadas, onNuevaCita }: {
  citasFuturas: CitaRow[];
  citasPasadas: CitaRow[];
  onNuevaCita: () => void;
}) {
  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Próximas citas ({citasFuturas.length})
        </h3>
        <button onClick={onNuevaCita}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700">
          + Nueva cita
        </button>
      </div>

      {citasFuturas.length > 0 ? (
        <CitasList citas={citasFuturas} />
      ) : (
        <p className="text-xs text-gray-400">Sin citas próximas.</p>
      )}

      <div className="border-t border-gray-100 pt-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Historial de citas ({citasPasadas.length})
        </h3>
        {citasPasadas.length === 0 ? (
          <p className="text-xs text-gray-400">Sin historial.</p>
        ) : (
          <CitasList citas={citasPasadas} />
        )}
      </div>
    </div>
  );
}

// ─── Tab Presupuestos ─────────────────────────────────────────────────────────

function TabPresupuestos({ presupuestos }: { presupuestos: Presupuesto[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (presupuestos.length === 0) {
    return <div className="flex h-full items-center justify-center text-sm text-gray-400">Sin presupuestos.</div>;
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-2">
      {presupuestos.map((p) => {
        const isOpen = expanded === p.id;
        const badge = COLORES_ESTADO_PRESUP[p.estado] ?? "bg-gray-100 text-gray-600";
        return (
          <div key={p.id} className="border border-gray-200 rounded-lg overflow-hidden">
            <button onClick={() => setExpanded(isOpen ? null : p.id)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-gray-50 text-left">
              <div className="flex items-center gap-3">
                <span className="font-mono text-gray-500 text-xs">#{p.numero}</span>
                <span className="text-gray-700">{format(parseISO(p.fecha), "dd/MM/yyyy")}</span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${badge}`}>{p.estado}</span>
                {p.doctor && <span className="text-gray-400 text-xs">{p.doctor.nombre}</span>}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-gray-800 font-medium">{n(p.total).toFixed(2)} €</span>
                <button onClick={(e) => { e.stopPropagation(); abrirPdfPresupuesto(p.id); }}
                  className="rounded px-2 py-0.5 text-[11px] bg-gray-100 hover:bg-blue-100 text-gray-600 hover:text-blue-700">
                  PDF
                </button>
                <span className="text-gray-400 text-xs">{isOpen ? "▲" : "▼"}</span>
              </div>
            </button>
            {isOpen && (
              <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
                {p.lineas.length === 0 ? (
                  <p className="text-xs text-gray-400">Sin líneas.</p>
                ) : (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-gray-400 border-b border-gray-200">
                        <th className="text-left pb-1 font-medium">Tratamiento</th>
                        <th className="text-center pb-1 font-medium w-16">Pieza</th>
                        <th className="text-right pb-1 font-medium w-20">Precio</th>
                        <th className="text-center pb-1 font-medium w-16">Desc.</th>
                        <th className="text-right pb-1 font-medium w-20">Neto</th>
                        <th className="text-center pb-1 font-medium w-16">Acept.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {p.lineas.map((l) => (
                        <tr key={l.id} className="border-b border-gray-100 last:border-0">
                          <td className="py-1 text-gray-700">{l.tratamiento?.nombre ?? "—"}</td>
                          <td className="py-1 text-center text-gray-500">
                            {l.pieza_dental ?? "—"}{l.caras && <span className="ml-1 text-gray-400">{l.caras}</span>}
                          </td>
                          <td className="py-1 text-right text-gray-700">{n(l.precio_unitario).toFixed(2)} €</td>
                          <td className="py-1 text-center text-gray-500">
                            {n(l.descuento_porcentaje) > 0 ? `${l.descuento_porcentaje}%` : "—"}
                          </td>
                          <td className="py-1 text-right font-medium text-gray-800">{n(l.importe_neto).toFixed(2)} €</td>
                          <td className="py-1 text-center">
                            {l.aceptado ? <span className="text-green-600 font-bold">Sí</span> : <span className="text-gray-400">No</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-gray-200">
                        <td colSpan={4} className="pt-2 text-right text-gray-500 font-medium">Total:</td>
                        <td className="pt-2 text-right font-bold text-gray-800">{n(p.total).toFixed(2)} €</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Tab Facturación ──────────────────────────────────────────────────────────

function TabFacturacion({ facturas, onCobrar }: {
  facturas: Factura[];
  onCobrar: (f: Factura) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (facturas.length === 0) {
    return <div className="flex h-full items-center justify-center text-sm text-gray-400">Sin facturas.</div>;
  }

  const totalFacturado = facturas.filter((f) => f.estado !== "anulada").reduce((acc, f) => acc + n(f.total), 0);
  const totalCobrado   = facturas.filter((f) => f.estado !== "anulada").reduce((acc, f) => acc + n(f.total_cobrado ?? 0), 0);
  const totalPendiente = totalFacturado - totalCobrado;

  return (
    <div className="h-full overflow-y-auto p-4">
      {/* KPIs */}
      <div className="flex gap-3 mb-4">
        <KpiCard label="Facturado" value={`${totalFacturado.toFixed(2)} €`} />
        <KpiCard label="Cobrado" value={`${totalCobrado.toFixed(2)} €`} color="text-green-700" />
        <KpiCard label="Pendiente" value={`${totalPendiente.toFixed(2)} €`} color={totalPendiente > 0.01 ? "text-red-600" : undefined} />
      </div>

      <div className="space-y-2">
        {facturas.map((f) => {
          const isOpen = expanded === f.id;
          const badge = COLORES_ESTADO_FACT[f.estado] ?? "bg-gray-100 text-gray-600";
          const pendiente = n(f.pendiente ?? 0);
          return (
            <div key={f.id} className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="flex items-center px-4 py-2.5 text-sm hover:bg-gray-50">
                {/* Info factura */}
                <button onClick={() => setExpanded(isOpen ? null : f.id)} className="flex-1 flex items-center gap-3 text-left">
                  <span className="font-mono text-gray-500 text-xs">{f.serie}-{String(f.numero).padStart(4, "0")}</span>
                  <span className="text-gray-700 text-xs">{format(parseISO(f.fecha), "dd/MM/yyyy")}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${badge}`}>{f.estado}</span>
                  {f.forma_pago && <span className="text-gray-400 text-xs">{f.forma_pago.nombre}</span>}
                </button>
                {/* Importes y acciones */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <div className="font-medium text-gray-800 text-xs">{n(f.total).toFixed(2)} €</div>
                    {pendiente > 0.01 && <div className="text-[11px] text-red-600">Pte: {pendiente.toFixed(2)} €</div>}
                  </div>
                  {pendiente > 0.01 && f.estado !== "anulada" && (
                    <button onClick={() => onCobrar(f)}
                      className="rounded-md bg-green-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-green-700">
                      Cobrar
                    </button>
                  )}
                  <button onClick={(e) => { e.stopPropagation(); abrirPdfFactura(f.id); }}
                    className="rounded px-2 py-1 text-[11px] bg-gray-100 hover:bg-blue-100 text-gray-600 hover:text-blue-700">
                    PDF
                  </button>
                  <span className="text-gray-400 text-xs cursor-pointer" onClick={() => setExpanded(isOpen ? null : f.id)}>
                    {isOpen ? "▲" : "▼"}
                  </span>
                </div>
              </div>

              {isOpen && (
                <div className="border-t border-gray-100 px-4 py-3 bg-gray-50 space-y-3">
                  {f.lineas.length > 0 && (
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase font-semibold mb-1">Conceptos</p>
                      <table className="w-full text-xs">
                        <tbody>
                          {f.lineas.map((l) => (
                            <tr key={l.id} className="border-b border-gray-100 last:border-0">
                              <td className="py-0.5 text-gray-700">{l.concepto_ficticio || l.concepto}</td>
                              <td className="py-0.5 text-center text-gray-400 w-8">{l.cantidad}</td>
                              <td className="py-0.5 text-right text-gray-600 w-20">{n(l.precio_unitario).toFixed(2)} €</td>
                              <td className="py-0.5 text-right font-medium text-gray-800 w-20">{n(l.subtotal).toFixed(2)} €</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-gray-200">
                            <td colSpan={2} className="pt-1 text-right text-gray-500 text-[11px]">
                              Subtotal: {n(f.subtotal).toFixed(2)} € · IVA: {n(f.iva_total).toFixed(2)} €
                            </td>
                            <td colSpan={2} className="pt-1 text-right font-bold text-gray-800">{n(f.total).toFixed(2)} €</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                  {f.cobros.length > 0 && (
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase font-semibold mb-1">Cobros</p>
                      <ul className="space-y-0.5">
                        {f.cobros.map((c) => (
                          <li key={c.id} className="flex justify-between text-xs text-gray-600">
                            <span>
                              {format(parseISO(c.fecha), "dd/MM/yyyy")}
                              {c.forma_pago && <span className="ml-2 text-gray-400">{c.forma_pago.nombre}</span>}
                              {c.notas && <span className="ml-2 text-gray-400 italic">{c.notas}</span>}
                            </span>
                            <span className="font-medium text-green-700">+{n(c.importe).toFixed(2)} €</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {f.observaciones && <p className="text-xs text-gray-500 italic">{f.observaciones}</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Tab Trabajo Pendiente ────────────────────────────────────────────────────

interface TrabajoPendienteItem {
  id: string;
  tratamiento: { nombre: string; codigo: string } | null;
  pieza_dental: number | null;
  caras: string | null;
}

function TabPendiente({ items, onRealizado }: { items: TrabajoPendienteItem[]; onRealizado: () => void }) {
  const { invalidateQueries } = useQueryClient();
  const [realizandoId, setRealizandoId] = useState<string | null>(null);

  async function marcarRealizado(id: string) {
    setRealizandoId(id);
    try {
      await apiClient.patch(`/presupuestos/trabajo-pendiente/${id}/realizar`);
      invalidateQueries({ queryKey: ["trabajo-pendiente"] });
      onRealizado();
    } catch { /* silencioso */ } finally {
      setRealizandoId(null);
    }
  }

  if (items.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-400">
        Sin tratamientos pendientes.
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      <p className="text-xs text-gray-400 mb-3">
        {items.length} tratamiento{items.length !== 1 ? "s" : ""} pendiente{items.length !== 1 ? "s" : ""}
      </p>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-gray-800">
                {item.tratamiento?.nombre ?? "—"}
                {item.pieza_dental && <span className="ml-2 text-xs text-gray-500">· Pieza {item.pieza_dental}</span>}
                {item.caras && <span className="ml-1 text-xs text-gray-400">({item.caras})</span>}
              </p>
              {item.tratamiento?.codigo && (
                <p className="text-xs text-gray-400 font-mono">{item.tratamiento.codigo}</p>
              )}
            </div>
            <button onClick={() => marcarRealizado(item.id)} disabled={realizandoId === item.id}
              className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50 shrink-0 ml-3">
              {realizandoId === item.id ? "..." : "Marcar realizado"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Modal Cobro Rápido ───────────────────────────────────────────────────────

function CobrarModal({ factura, onClose }: { factura: Factura; onClose: () => void }) {
  const { data: formasPago = [] } = useFormasPago();
  const registrarMut = useRegistrarCobro();
  const pendiente = n(factura.pendiente ?? factura.total);
  const [importe, setImporte] = useState(pendiente.toFixed(2));
  const [formaPagoId, setFormaPagoId] = useState("");
  const [notas, setNotas] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formaPagoId) return;
    await registrarMut.mutateAsync({
      facturaId: factura.id,
      cobro: { importe: Number(importe), forma_pago_id: formaPagoId, notas: notas || undefined },
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-sm rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-gray-800">Registrar cobro</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Factura {factura.serie}-{String(factura.numero).padStart(4, "0")} · Pendiente:{" "}
              <span className="text-red-600 font-medium">{formatEUR(pendiente)}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Importe (€) *</label>
            <input type="number" min="0.01" step="0.01" required value={importe}
              onChange={(e) => setImporte(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Forma de pago *</label>
            <select value={formaPagoId} onChange={(e) => setFormaPagoId(e.target.value)} required
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Seleccionar...</option>
              {formasPago.map((fp) => <option key={fp.id} value={fp.id}>{fp.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notas</label>
            <input value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Opcional..."
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
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

// ─── Helpers compartidos ──────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{title}</h3>
      {children}
    </div>
  );
}

function DatoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start py-0.5">
      <span className="w-24 shrink-0 text-xs text-gray-400">{label}</span>
      <span className="text-xs text-gray-700 break-all">{value}</span>
    </div>
  );
}

function CitasList({ citas }: { citas: CitaRow[] }) {
  return (
    <ul className="space-y-1.5">
      {citas.map((c) => {
        const color = COLORES_ESTADO_CITA[c.estado] ?? "#6B7280";
        return (
          <li key={c.id} className="flex items-center gap-2 text-xs">
            <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
            <span className="text-gray-500 w-28 shrink-0">{format(parseISO(c.fecha_hora), "dd/MM/yyyy HH:mm")}</span>
            <span className="text-gray-700 truncate">{c.motivo ?? c.estado}</span>
            {c.doctor && <span className="text-gray-400 shrink-0">{c.doctor.nombre}</span>}
          </li>
        );
      })}
    </ul>
  );
}

function KpiCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex-1 bg-white border border-gray-200 rounded-lg px-4 py-3">
      <p className="text-[11px] text-gray-400 uppercase font-semibold">{label}</p>
      <p className={`text-base font-bold mt-0.5 ${color ?? "text-gray-800"}`}>{value}</p>
    </div>
  );
}

// ─── Tab Archivos ─────────────────────────────────────────────────────────────

const CATEGORIAS: { value: CategoriaDocumento; label: string; color: string }[] = [
  { value: "radiografia",    label: "Radiografía",      color: "bg-purple-100 text-purple-700" },
  { value: "implante",       label: "Implante",         color: "bg-blue-100 text-blue-700" },
  { value: "consentimiento", label: "Consentimiento",   color: "bg-green-100 text-green-700" },
  { value: "presupuesto",    label: "Presupuesto",      color: "bg-yellow-100 text-yellow-700" },
  { value: "historia_medica",label: "Historia médica",  color: "bg-rose-100 text-rose-700" },
  { value: "otro",           label: "Otro",             color: "bg-gray-100 text-gray-600" },
];

function TabArchivos({ pacienteId }: { pacienteId: string }) {
  const qc = useQueryClient();
  const [filtro, setFiltro] = useState<CategoriaDocumento | "todos">("todos");
  const [subiendo, setSubiendo] = useState(false);
  const [errorSubida, setErrorSubida] = useState<string | null>(null);
  const [categoriaSubida, setCategoriaSubida] = useState<CategoriaDocumento>("otro");
  const [descripcionSubida, setDescripcionSubida] = useState("");

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["documentos", pacienteId, filtro],
    queryFn: () => getDocumentos(pacienteId, filtro !== "todos" ? filtro : undefined),
    staleTime: 30_000,
  });

  async function handleArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    setSubiendo(true);
    setErrorSubida(null);
    try {
      await subirDocumento(pacienteId, archivo, categoriaSubida, descripcionSubida || undefined);
      qc.invalidateQueries({ queryKey: ["documentos", pacienteId] });
      setDescripcionSubida("");
      e.target.value = "";
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setErrorSubida(msg ?? "Error al subir el archivo");
    } finally {
      setSubiendo(false);
    }
  }

  async function handleEliminar(doc: DocumentoPaciente) {
    if (!confirm(`¿Eliminar "${doc.nombre_original}"?`)) return;
    try {
      await eliminarDocumento(pacienteId, doc.id);
      qc.invalidateQueries({ queryKey: ["documentos", pacienteId] });
    } catch { /* silencioso */ }
  }

  const categoriasConDocs = CATEGORIAS.filter((c) =>
    docs.some((d) => d.categoria === c.value),
  );

  const docsFiltrados = filtro === "todos" ? docs : docs.filter((d) => d.categoria === filtro);

  return (
    <div className="h-full overflow-y-auto p-5">
      <div className="max-w-3xl space-y-5">

        {/* Zona de subida */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Subir archivo</h3>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Categoría</label>
              <select
                value={categoriaSubida}
                onChange={(e) => setCategoriaSubida(e.target.value as CategoriaDocumento)}
                className="rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CATEGORIAS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[180px]">
              <label className="block text-xs text-gray-500 mb-1">Descripción (opcional)</label>
              <input
                type="text"
                value={descripcionSubida}
                onChange={(e) => setDescripcionSubida(e.target.value)}
                placeholder="Ej: Rx panorámica 2025, Plan de implante..."
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <label className={`cursor-pointer rounded-md px-4 py-1.5 text-sm font-medium text-white transition-colors ${subiendo ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}`}>
              {subiendo ? "Subiendo..." : "Seleccionar archivo"}
              <input
                type="file"
                className="hidden"
                disabled={subiendo}
                accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.tiff,.bmp,.doc,.docx"
                onChange={handleArchivo}
              />
            </label>
          </div>
          <p className="mt-2 text-[11px] text-gray-400">PDF, imágenes (JPG, PNG, TIFF...) o documentos Word. Máx. 50 MB.</p>
          {errorSubida && <p className="mt-2 text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded">{errorSubida}</p>}
        </div>

        {/* Filtros por categoría */}
        {docs.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setFiltro("todos")}
              className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${filtro === "todos" ? "bg-gray-800 text-white border-gray-800" : "border-gray-300 text-gray-500 hover:border-gray-400"}`}
            >
              Todos ({docs.length})
            </button>
            {categoriasConDocs.map((c) => {
              const count = docs.filter((d) => d.categoria === c.value).length;
              return (
                <button
                  key={c.value}
                  onClick={() => setFiltro(c.value)}
                  className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${filtro === c.value ? "ring-2 ring-offset-1 ring-blue-500 " + c.color : "border-gray-200 " + c.color + " opacity-70 hover:opacity-100"}`}
                >
                  {c.label} ({count})
                </button>
              );
            })}
          </div>
        )}

        {/* Lista de documentos */}
        {isLoading ? (
          <p className="text-sm text-gray-400">Cargando archivos...</p>
        ) : docsFiltrados.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center">
            <p className="text-sm text-gray-400">
              {docs.length === 0 ? "No hay archivos adjuntos para este paciente." : "No hay archivos en esta categoría."}
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {docsFiltrados.map((doc) => {
              const cat = CATEGORIAS.find((c) => c.value === doc.categoria);
              const esImagen = doc.mime_type.startsWith("image/");
              const esPdf = doc.mime_type === "application/pdf";
              const tamanoKb = (doc.tamano_bytes / 1024).toFixed(0);
              const tamano = doc.tamano_bytes > 1024 * 1024
                ? `${(doc.tamano_bytes / 1024 / 1024).toFixed(1)} MB`
                : `${tamanoKb} KB`;
              return (
                <div key={doc.id} className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 hover:bg-gray-50">
                  {/* Icono */}
                  <div className="text-xl shrink-0 w-7 text-center">
                    {esPdf ? "📄" : esImagen ? "🖼️" : "📎"}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{doc.nombre_original}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {cat && (
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${cat.color}`}>
                          {cat.label}
                        </span>
                      )}
                      <span className="text-[11px] text-gray-400">{tamano}</span>
                      <span className="text-[11px] text-gray-400">
                        {new Date(doc.created_at).toLocaleDateString("es-ES")}
                      </span>
                      {doc.descripcion && (
                        <span className="text-[11px] text-gray-500 truncate">{doc.descripcion}</span>
                      )}
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {(esImagen || esPdf) && (
                      <button
                        onClick={() => verDocumento(pacienteId, doc.id)}
                        className="rounded px-2 py-1 text-[11px] bg-blue-50 hover:bg-blue-100 text-blue-700"
                        title="Ver"
                      >
                        Ver
                      </button>
                    )}
                    <button
                      onClick={() => descargarDocumento(pacienteId, doc.id, doc.nombre_original)}
                      className="rounded px-2 py-1 text-[11px] bg-gray-100 hover:bg-gray-200 text-gray-700"
                      title="Descargar"
                    >
                      ↓ Descargar
                    </button>
                    <button
                      onClick={() => handleEliminar(doc)}
                      className="rounded px-2 py-1 text-[11px] bg-red-50 hover:bg-red-100 text-red-600"
                      title="Eliminar"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Adjuntos mini-sección (reutilizable) ─────────────────────────────────────

function AdjuntosSeccion({
  pacienteId,
  categoria,
  titulo,
}: {
  pacienteId: string;
  categoria: CategoriaDocumento;
  titulo: string;
}) {
  const qc = useQueryClient();
  const [subiendo, setSubiendo] = useState(false);

  const { data: docs = [] } = useQuery({
    queryKey: ["documentos", pacienteId, categoria],
    queryFn: () => getDocumentos(pacienteId, categoria),
    staleTime: 30_000,
  });

  async function handleArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    setSubiendo(true);
    try {
      await subirDocumento(pacienteId, archivo, categoria);
      qc.invalidateQueries({ queryKey: ["documentos", pacienteId] });
      e.target.value = "";
    } catch { /* silencioso */ } finally {
      setSubiendo(false);
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{titulo}</h3>
        <label className={`cursor-pointer rounded px-2.5 py-1 text-[11px] font-medium transition-colors ${subiendo ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-700"}`}>
          {subiendo ? "Subiendo..." : "+ Adjuntar"}
          <input
            type="file"
            className="hidden"
            disabled={subiendo}
            accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.tiff,.bmp,.doc,.docx"
            onChange={handleArchivo}
          />
        </label>
      </div>
      <div className="p-3">
        {docs.length === 0 ? (
          <p className="text-xs text-gray-400 italic">Sin archivos adjuntos</p>
        ) : (
          <ul className="space-y-1">
            {docs.map((doc) => {
              const esImagen = doc.mime_type.startsWith("image/");
              const esPdf = doc.mime_type === "application/pdf";
              return (
                <li key={doc.id} className="flex items-center gap-2 text-xs">
                  <span>{esPdf ? "📄" : esImagen ? "🖼️" : "📎"}</span>
                  <span className="flex-1 truncate text-gray-700">{doc.nombre_original}</span>
                  {(esImagen || esPdf) && (
                    <button onClick={() => verDocumento(pacienteId, doc.id)}
                      className="text-blue-600 hover:underline shrink-0">Ver</button>
                  )}
                  <button onClick={() => descargarDocumento(pacienteId, doc.id, doc.nombre_original)}
                    className="text-gray-500 hover:text-gray-700 shrink-0">↓</button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

// ─── Tab Laboratorio (desde ficha paciente) ───────────────────────────────────

const ESTADOS_LAB: { value: EstadoTrabajo; label: string; color: string; bg: string }[] = [
  { value: "pendiente",  label: "Pendiente",  color: "text-gray-600",  bg: "bg-gray-100" },
  { value: "enviado",    label: "Enviado",    color: "text-blue-700",  bg: "bg-blue-100" },
  { value: "en_proceso", label: "En proceso", color: "text-amber-700", bg: "bg-amber-100" },
  { value: "recibido",   label: "Recibido",   color: "text-teal-700",  bg: "bg-teal-100" },
  { value: "entregado",  label: "Entregado",  color: "text-green-700", bg: "bg-green-100" },
  { value: "incidencia", label: "Incidencia", color: "text-red-700",   bg: "bg-red-100" },
];

function estadoLabInfo(estado: EstadoTrabajo) {
  return ESTADOS_LAB.find((e) => e.value === estado) ?? ESTADOS_LAB[0];
}

function TabLaboratorioPaciente({ pacienteId }: { pacienteId: string }) {
  const qc = useQueryClient();

  const { data: trabajos = [], isLoading } = useQuery({
    queryKey: ["trabajos-lab-paciente", pacienteId],
    queryFn: () => getTrabajos({ paciente_id: pacienteId }),
    staleTime: 30_000,
  });

  if (isLoading) return <div className="flex h-full items-center justify-center text-sm text-gray-400">Cargando...</div>;

  if (trabajos.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-gray-400">
        <div className="text-center">
          <p className="text-2xl mb-2">🔬</p>
          <p>Sin encargos de laboratorio para este paciente.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="space-y-2 max-w-3xl">
        {trabajos.map((t) => {
          const est = estadoLabInfo(t.estado);
          return (
            <div key={t.id} className="rounded-lg border border-gray-200 bg-white px-4 py-3 flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-gray-800">{t.descripcion}</p>
                  {t.pieza_dental && <span className="text-xs text-gray-400">Pieza {t.pieza_dental}</span>}
                  {t.color && <span className="text-xs text-gray-400">· {t.color}</span>}
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${est.bg} ${est.color}`}>{est.label}</span>
                </div>
                <div className="flex gap-4 mt-1 text-xs text-gray-500 flex-wrap">
                  {t.laboratorio && <span className="font-medium">{t.laboratorio.nombre}</span>}
                  {t.fecha_salida && <span>Salida: {t.fecha_salida}</span>}
                  {t.fecha_entrega_prevista && <span>Prevista: {t.fecha_entrega_prevista}</span>}
                  {t.fecha_recepcion && <span className="text-teal-600">Recibido: {t.fecha_recepcion}</span>}
                  {t.precio != null && <span>{Number(t.precio).toFixed(2)} €</span>}
                </div>
                {t.observaciones && <p className="text-xs text-gray-400 mt-0.5 italic">{t.observaciones}</p>}
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                {t.laboratorio?.whatsapp && (
                  <button
                    onClick={() => abrirWhatsappLab(
                      t.laboratorio!.whatsapp!,
                      `Hola, consulto sobre el encargo de ${t.paciente ? `${t.paciente.apellidos}, ${t.paciente.nombre}` : "paciente"}: ${t.descripcion}`
                    )}
                    className="rounded px-2 py-1 text-[11px] bg-green-50 text-green-700 hover:bg-green-100"
                  >
                    WhatsApp
                  </button>
                )}
                {/* Avance rápido de estado */}
                {t.estado !== "entregado" && t.estado !== "incidencia" && (() => {
                  const FLUJO: Partial<Record<EstadoTrabajo, EstadoTrabajo>> = {
                    pendiente: "enviado", enviado: "en_proceso",
                    en_proceso: "recibido", recibido: "entregado",
                  };
                  const sig = FLUJO[t.estado];
                  if (!sig) return null;
                  const sigEst = estadoLabInfo(sig);
                  return (
                    <button
                      onClick={async () => {
                        const update: Parameters<typeof actualizarTrabajo>[1] = { estado: sig };
                        if (sig === "enviado" && !t.fecha_salida) update.fecha_salida = format(new Date(), "yyyy-MM-dd");
                        if (sig === "recibido" && !t.fecha_recepcion) update.fecha_recepcion = format(new Date(), "yyyy-MM-dd");
                        if (sig === "entregado" && !t.fecha_entrega_paciente) update.fecha_entrega_paciente = format(new Date(), "yyyy-MM-dd");
                        await actualizarTrabajo(t.id, update);
                        qc.invalidateQueries({ queryKey: ["trabajos-lab-paciente", pacienteId] });
                      }}
                      className={`rounded px-2 py-1 text-[11px] font-medium ${sigEst.bg} ${sigEst.color} hover:brightness-95`}
                    >
                      → {sigEst.label}
                    </button>
                  );
                })()}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
