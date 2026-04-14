/**
 * AdminPage — Configuración y administración del sistema.
 * Tabs: Usuarios | Doctores | Horarios | Gabinetes | Entidades | Tratamientos
 */
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { apiClient } from "../../api/client";
import type { Rol, Doctor } from "../../types";

type Tab = "usuarios" | "doctores" | "horarios" | "gabinetes" | "entidades" | "tratamientos" | "cumplimiento";

const TABS: { id: Tab; label: string }[] = [
  { id: "usuarios",     label: "Usuarios" },
  { id: "doctores",     label: "Doctores" },
  { id: "horarios",     label: "Horarios" },
  { id: "gabinetes",    label: "Gabinetes" },
  { id: "entidades",    label: "Entidades" },
  { id: "tratamientos", label: "Tratamientos" },
  { id: "cumplimiento", label: "Cumplimiento SIF" },
];

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("usuarios");

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Tabs */}
      <div className="shrink-0 flex border-b border-gray-200 mb-4 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
              tab === t.id
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto">
        {tab === "usuarios"     && <TabUsuarios />}
        {tab === "doctores"     && <TabDoctores />}
        {tab === "horarios"     && <TabHorarios />}
        {tab === "gabinetes"    && <TabGabinetes />}
        {tab === "entidades"    && <TabEntidades />}
        {tab === "tratamientos" && <TabTratamientos />}
        {tab === "cumplimiento" && <TabCumplimientoSif />}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TAB USUARIOS
// ═══════════════════════════════════════════════════════════════════

interface Usuario {
  id: string; username: string; nombre: string; rol: Rol;
  activo: boolean; doctor_id: string | null;
}
interface UsuarioCreate { username: string; password: string; nombre: string; rol: Rol; }

const ROL_COLOR: Record<Rol, string> = {
  admin: "bg-red-100 text-red-700",
  doctor: "bg-blue-100 text-blue-700",
  recepcion: "bg-green-100 text-green-700",
};

function TabUsuarios() {
  const qc = useQueryClient();
  const [modalCrear, setModalCrear] = useState(false);

  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ["admin-usuarios"],
    queryFn: async () => (await apiClient.get<Usuario[]>("/admin/usuarios")).data,
    select: (d) => Array.isArray(d) ? d : [],
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, activo }: { id: string; activo: boolean }) =>
      apiClient.patch(`/admin/usuarios/${id}`, { activo }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-usuarios"] }); toast.success("Usuario actualizado"); },
    onError: () => toast.error("Error al actualizar"),
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{usuarios.length} usuario{usuarios.length !== 1 ? "s" : ""}</p>
        <button onClick={() => setModalCrear(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          + Nuevo usuario
        </button>
      </div>
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        {isLoading ? <LoadingRow /> : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <Th>Usuario</Th><Th>Nombre</Th><Th>Rol</Th><Th center>Estado</Th><Th center>Acciones</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {usuarios.map((u) => (
                <tr key={u.id} className={`hover:bg-gray-50 ${!u.activo ? "opacity-50" : ""}`}>
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-600">{u.username}</td>
                  <td className="px-4 py-2.5 font-medium text-gray-800">{u.nombre}</td>
                  <td className="px-4 py-2.5">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${ROL_COLOR[u.rol]}`}>{u.rol}</span>
                  </td>
                  <td className="px-4 py-2.5 text-center text-xs">{u.activo ? <Ok /> : <span className="text-gray-400">—</span>}</td>
                  <td className="px-4 py-2.5 text-center">
                    <button onClick={() => toggleMut.mutate({ id: u.id, activo: !u.activo })}
                      className={`text-xs px-2 py-1 rounded ${u.activo ? "text-red-500 hover:bg-red-50" : "text-green-600 hover:bg-green-50"}`}>
                      {u.activo ? "Desactivar" : "Activar"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {modalCrear && <CrearUsuarioModal onClose={() => setModalCrear(false)}
        onCreated={() => { qc.invalidateQueries({ queryKey: ["admin-usuarios"] }); setModalCrear(false); }} />}
    </div>
  );
}

function CrearUsuarioModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState<UsuarioCreate>({ username: "", password: "", nombre: "", rol: "recepcion" });
  const mut = useMutation({
    mutationFn: (d: UsuarioCreate) => apiClient.post("/admin/usuarios", d),
    onSuccess: () => { toast.success("Usuario creado"); onCreated(); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Error"),
  });
  return (
    <Modal title="Nuevo usuario" onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); mut.mutate(form); }} className="space-y-3">
        {(["username", "password", "nombre"] as const).map((f) => (
          <Field key={f} label={f === "username" ? "Usuario" : f === "password" ? "Contraseña (mín. 8)" : "Nombre mostrado"}>
            <input type={f === "password" ? "password" : "text"} value={form[f]} required
              minLength={f === "password" ? 8 : 1}
              onChange={(e) => setForm((p) => ({ ...p, [f]: e.target.value }))}
              className={INPUT_CLS} />
          </Field>
        ))}
        <Field label="Rol">
          <select value={form.rol} onChange={(e) => setForm((p) => ({ ...p, rol: e.target.value as Rol }))} className={INPUT_CLS}>
            <option value="recepcion">Recepción</option>
            <option value="doctor">Doctor</option>
            <option value="admin">Admin</option>
          </select>
        </Field>
        <ModalFooter onClose={onClose} loading={mut.isPending} label="Crear usuario" />
      </form>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TAB DOCTORES
// ═══════════════════════════════════════════════════════════════════

interface DoctorForm {
  nombre: string; especialidad: string; color_agenda: string;
  es_auxiliar: boolean; porcentaje: string;
}

const DOCTOR_DEFAULTS: DoctorForm = {
  nombre: "", especialidad: "", color_agenda: "#2563EB",
  es_auxiliar: false, porcentaje: "0",
};

function TabDoctores() {
  const qc = useQueryClient();
  const [editando, setEditando] = useState<Doctor | null>(null);
  const [creando, setCreando] = useState(false);

  const { data: doctores = [], isLoading } = useQuery({
    queryKey: ["doctores", false],
    queryFn: async () => (await apiClient.get<Doctor[]>("/doctores?solo_activos=false")).data,
    select: (d) => Array.isArray(d) ? d : [],
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, activo }: { id: string; activo: boolean }) =>
      apiClient.patch(`/doctores/${id}`, { activo }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["doctores"] }); toast.success("Doctor actualizado"); },
    onError: () => toast.error("Error al actualizar"),
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{doctores.length} doctor{doctores.length !== 1 ? "es" : ""}</p>
        <button onClick={() => setCreando(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          + Nuevo doctor
        </button>
      </div>
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        {isLoading ? <LoadingRow /> : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <Th>Color</Th><Th>Nombre</Th><Th>Especialidad</Th><Th>Tipo</Th>
                <Th center>%</Th><Th center>Activo</Th><Th center>Acciones</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {doctores.map((d) => (
                <tr key={d.id} className={`hover:bg-gray-50 ${!d.activo ? "opacity-50" : ""}`}>
                  <td className="px-4 py-2.5">
                    <span className="inline-block w-5 h-5 rounded-full border border-gray-300"
                      style={{ backgroundColor: d.color_agenda ?? "#9ca3af" }} />
                  </td>
                  <td className="px-4 py-2.5 font-medium text-gray-800">{d.nombre}</td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs">{d.especialidad ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${d.es_auxiliar ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
                      {d.es_auxiliar ? "Auxiliar" : "Doctor"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-center text-xs tabular-nums">{d.porcentaje}%</td>
                  <td className="px-4 py-2.5 text-center">{d.activo ? <Ok /> : <span className="text-gray-400 text-xs">—</span>}</td>
                  <td className="px-4 py-2.5 text-center space-x-1">
                    <button onClick={() => setEditando(d)} className="text-xs px-2 py-1 rounded text-blue-600 hover:bg-blue-50">Editar</button>
                    <button onClick={() => toggleMut.mutate({ id: d.id, activo: !d.activo })}
                      className={`text-xs px-2 py-1 rounded ${d.activo ? "text-red-500 hover:bg-red-50" : "text-green-600 hover:bg-green-50"}`}>
                      {d.activo ? "Desactivar" : "Activar"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {(creando || editando) && (
        <DoctorModal doctor={editando ?? undefined}
          onClose={() => { setCreando(false); setEditando(null); }}
          onSaved={() => { qc.invalidateQueries({ queryKey: ["doctores"] }); setCreando(false); setEditando(null); }} />
      )}
    </div>
  );
}

function DoctorModal({ doctor, onClose, onSaved }: { doctor?: Doctor; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<DoctorForm>(
    doctor
      ? { nombre: doctor.nombre, especialidad: doctor.especialidad ?? "", color_agenda: doctor.color_agenda ?? "#2563EB",
          es_auxiliar: doctor.es_auxiliar, porcentaje: String(doctor.porcentaje ?? 0) }
      : DOCTOR_DEFAULTS
  );
  const mut = useMutation({
    mutationFn: (d: DoctorForm) => doctor
      ? apiClient.patch(`/doctores/${doctor.id}`, d)
      : apiClient.post("/doctores", d),
    onSuccess: () => { toast.success(doctor ? "Doctor actualizado" : "Doctor creado"); onSaved(); },
    onError: () => toast.error("Error al guardar"),
  });

  return (
    <Modal title={doctor ? "Editar doctor" : "Nuevo doctor"} onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); mut.mutate(form); }} className="space-y-3">
        <Field label="Nombre *">
          <input value={form.nombre} required onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))} className={INPUT_CLS} />
        </Field>
        <Field label="Especialidad">
          <input value={form.especialidad} onChange={(e) => setForm((p) => ({ ...p, especialidad: e.target.value }))} className={INPUT_CLS} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Color en agenda">
            <div className="flex items-center gap-2">
              <input type="color" value={form.color_agenda}
                onChange={(e) => setForm((p) => ({ ...p, color_agenda: e.target.value }))}
                className="h-9 w-12 rounded border border-gray-300 cursor-pointer p-0.5" />
              <span className="text-xs text-gray-500 font-mono">{form.color_agenda}</span>
            </div>
          </Field>
          <Field label="% comisión">
            <input type="number" min="0" max="100" step="0.5" value={form.porcentaje}
              onChange={(e) => setForm((p) => ({ ...p, porcentaje: e.target.value }))}
              className={INPUT_CLS} />
          </Field>
        </div>
        <Field label="Tipo">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.es_auxiliar}
              onChange={(e) => setForm((p) => ({ ...p, es_auxiliar: e.target.checked }))}
              className="rounded" />
            <span className="text-sm text-gray-700">Es auxiliar (no aparece como doctor principal)</span>
          </label>
        </Field>
        <ModalFooter onClose={onClose} loading={mut.isPending} label={doctor ? "Guardar cambios" : "Crear doctor"} />
      </form>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TAB HORARIOS
// ═══════════════════════════════════════════════════════════════════

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

interface BloqueHorario { inicio: string; fin: string; }
interface HorarioDoctor2 {
  id: string; doctor_id: string; dia_semana: number;
  tipo_dia: string; bloques: BloqueHorario[]; intervalo_min: number;
}
interface HorarioExcepcion2 {
  id: string;
  doctor_id: string;
  fecha: string;
  tipo_dia: string;
  bloques: BloqueHorario[] | null;
  no_trabaja: boolean;
}

function TabHorarios() {
  const { data: doctores = [] } = useQuery({
    queryKey: ["doctores", false],
    queryFn: async () => (await apiClient.get<Doctor[]>("/doctores?solo_activos=false")).data,
    select: (d) => Array.isArray(d) ? d.filter((d) => d.activo) : [],
  });

  const [doctorId, setDoctorId] = useState<string>("");
  const [editandoDia, setEditandoDia] = useState<number | null>(null);
  const [creandoExcepcion, setCreandoExcepcion] = useState(false);

  useEffect(() => {
    if (doctores.length > 0 && !doctorId) setDoctorId(doctores[0].id);
  }, [doctores, doctorId]);

  const { data: horarios = [], refetch } = useQuery({
    queryKey: ["horarios-doctor", doctorId],
    queryFn: async () => (await apiClient.get<HorarioDoctor2[]>(`/doctores/${doctorId}/horarios`)).data,
    enabled: !!doctorId,
    select: (d) => Array.isArray(d) ? d : [],
  });
  const { data: excepciones = [], refetch: refetchExcepciones } = useQuery({
    queryKey: ["horarios-excepciones", doctorId],
    queryFn: async () => (await apiClient.get<HorarioExcepcion2[]>(`/doctores/${doctorId}/excepciones`)).data,
    enabled: !!doctorId,
    select: (d) => Array.isArray(d) ? d : [],
  });

  const horarioMap: Record<number, HorarioDoctor2 | undefined> = {};
  for (const h of horarios) horarioMap[h.dia_semana] = h;

  const doctorActual = doctores.find((d) => d.id === doctorId);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700">Doctor:</label>
        <select
          value={doctorId}
          onChange={(e) => setDoctorId(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {doctores.map((d) => (
            <option key={d.id} value={d.id}>{d.nombre}</option>
          ))}
        </select>
        {doctorActual && (
          <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: doctorActual.color_agenda ?? "#9ca3af" }} />
        )}
        <p className="text-xs text-gray-400">Configura los bloques de trabajo de cada día de la semana</p>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <Th>Día</Th>
              <Th>Horario</Th>
              <Th>Intervalo</Th>
              <Th center>Acciones</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {DIAS.map((dia, idx) => {
              const h = horarioMap[idx];
              return (
                <tr key={idx} className={`hover:bg-gray-50 ${idx >= 5 ? "bg-gray-50/50" : ""}`}>
                  <td className="px-4 py-3 font-medium text-gray-700 w-32">
                    {dia}
                    {idx >= 5 && <span className="ml-1 text-[10px] text-gray-400">(fin semana)</span>}
                  </td>
                  <td className="px-4 py-3">
                    {h && h.bloques.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {h.bloques.map((b, bi) => (
                          <span key={bi} className="rounded-full bg-blue-100 text-blue-700 px-2.5 py-0.5 text-xs font-medium">
                            {b.inicio} – {b.fin}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 italic">Sin horario (día libre)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{h ? `${h.intervalo_min} min` : "—"}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => setEditandoDia(idx)}
                      className="text-xs px-3 py-1 rounded text-blue-600 hover:bg-blue-50 border border-blue-200"
                    >
                      {h ? "Editar" : "Configurar"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-700">Excepciones por día</h3>
            <p className="text-xs text-gray-400">Festivos, vacaciones o cambios puntuales del doctor</p>
          </div>
          <button
            onClick={() => setCreandoExcepcion(true)}
            className="rounded-md border border-blue-200 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50"
          >
            + Nueva excepción
          </button>
        </div>
        {excepciones.length === 0 ? (
          <div className="px-4 py-6 text-sm text-gray-400">Sin excepciones configuradas.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {excepciones.map((ex) => (
              <div key={ex.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-gray-800">{ex.fecha}</p>
                  <p className="text-xs text-gray-400">
                    {ex.no_trabaja
                      ? "No trabaja"
                      : ex.bloques?.map((b) => `${b.inicio}-${b.fin}`).join(" · ") || "Horario especial"}
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${ex.no_trabaja ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>
                  {ex.no_trabaja ? "Bloqueado" : "Horario especial"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {editandoDia !== null && doctorId && (
        <HorarioModal
          doctorId={doctorId}
          diaSemana={editandoDia}
          diaNombre={DIAS[editandoDia]}
          horarioActual={horarioMap[editandoDia]}
          onClose={() => setEditandoDia(null)}
          onSaved={() => { refetch(); setEditandoDia(null); }}
        />
      )}
      {creandoExcepcion && doctorId && (
        <ExcepcionHorarioModal
          doctorId={doctorId}
          onClose={() => setCreandoExcepcion(false)}
          onSaved={() => { refetchExcepciones(); setCreandoExcepcion(false); }}
        />
      )}
    </div>
  );
}

function HorarioModal({
  doctorId, diaSemana, diaNombre, horarioActual, onClose, onSaved,
}: {
  doctorId: string; diaSemana: number; diaNombre: string;
  horarioActual?: HorarioDoctor2; onClose: () => void; onSaved: () => void;
}) {
  const [bloques, setBloques] = useState<BloqueHorario[]>(
    horarioActual?.bloques ?? []
  );
  const [intervalo, setIntervalo] = useState(horarioActual?.intervalo_min ?? 10);

  const mut = useMutation({
    mutationFn: () => apiClient.put(`/doctores/${doctorId}/horarios/${diaSemana}`, {
      bloques, intervalo_min: intervalo,
    }),
    onSuccess: () => { toast.success("Horario guardado"); onSaved(); },
    onError: () => toast.error("Error al guardar"),
  });

  function addBloque() { setBloques((p) => [...p, { inicio: "09:00", fin: "14:00" }]); }
  function removeBloque(i: number) { setBloques((p) => p.filter((_, idx) => idx !== i)); }
  function updateBloque(i: number, field: "inicio" | "fin", val: string) {
    setBloques((p) => p.map((b, idx) => idx === i ? { ...b, [field]: val } : b));
  }

  return (
    <Modal title={`Horario — ${diaNombre}`} onClose={onClose} wide>
      <div className="space-y-4">
        <div className="space-y-2">
          {bloques.length === 0 && (
            <p className="text-sm text-gray-400 italic text-center py-2">Día libre (sin bloques)</p>
          )}
          {bloques.map((b, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-16">Bloque {i + 1}</span>
              <input type="time" value={b.inicio} onChange={(e) => updateBloque(i, "inicio", e.target.value)}
                className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <span className="text-gray-400 text-sm">→</span>
              <input type="time" value={b.fin} onChange={(e) => updateBloque(i, "fin", e.target.value)}
                className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <button type="button" onClick={() => removeBloque(i)} className="text-red-400 hover:text-red-600 text-lg leading-none ml-1">×</button>
            </div>
          ))}
          <button type="button" onClick={addBloque}
            className="text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-1 rounded border border-blue-200">
            + Añadir bloque horario
          </button>
        </div>
        <Field label="Intervalo mínimo de cita (minutos)">
          <select value={intervalo} onChange={(e) => setIntervalo(Number(e.target.value))} className={INPUT_CLS}>
            {[10, 15, 20, 30].map((v) => <option key={v} value={v}>{v} min</option>)}
          </select>
        </Field>
        <ModalFooter onClose={onClose} loading={mut.isPending} label="Guardar horario" />
      </div>
    </Modal>
  );
}

function ExcepcionHorarioModal({
  doctorId,
  onClose,
  onSaved,
}: {
  doctorId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [fecha, setFecha] = useState("");
  const [noTrabaja, setNoTrabaja] = useState(true);
  const [bloques, setBloques] = useState<BloqueHorario[]>([{ inicio: "09:00", fin: "14:00" }]);

  const mut = useMutation({
    mutationFn: () =>
      apiClient.post(`/doctores/${doctorId}/excepciones`, {
        fecha,
        tipo_dia: noTrabaja ? "festivo" : "laborable",
        no_trabaja: noTrabaja,
        bloques: noTrabaja ? [] : bloques,
      }),
    onSuccess: () => { toast.success("Excepción guardada"); onSaved(); },
    onError: () => toast.error("Error al guardar la excepción"),
  });

  function addBloque() { setBloques((p) => [...p, { inicio: "16:00", fin: "20:00" }]); }
  function removeBloque(i: number) { setBloques((p) => p.filter((_, idx) => idx !== i)); }
  function updateBloque(i: number, field: "inicio" | "fin", val: string) {
    setBloques((p) => p.map((b, idx) => (idx === i ? { ...b, [field]: val } : b)));
  }

  return (
    <Modal title="Nueva excepción de horario" onClose={onClose} wide>
      <form onSubmit={(e) => { e.preventDefault(); mut.mutate(); }} className="space-y-4">
        <Field label="Fecha">
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required className={INPUT_CLS} />
        </Field>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={noTrabaja} onChange={(e) => setNoTrabaja(e.target.checked)} />
          El doctor no trabaja este día
        </label>
        {!noTrabaja && (
          <div className="space-y-2">
            {bloques.map((b, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="time" value={b.inicio} onChange={(e) => updateBloque(i, "inicio", e.target.value)} className={INPUT_CLS} />
                <input type="time" value={b.fin} onChange={(e) => updateBloque(i, "fin", e.target.value)} className={INPUT_CLS} />
                <button type="button" onClick={() => removeBloque(i)} className="text-red-500">×</button>
              </div>
            ))}
            <button type="button" onClick={addBloque} className="text-sm text-blue-600 hover:text-blue-700">
              + Añadir bloque
            </button>
          </div>
        )}
        <ModalFooter onClose={onClose} loading={mut.isPending} label="Guardar excepción" />
      </form>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TAB GABINETES
// ═══════════════════════════════════════════════════════════════════

interface Gabinete { id: string; nombre: string; activo: boolean; }

function TabGabinetes() {
  const qc = useQueryClient();
  const [editando, setEditando] = useState<Gabinete | null>(null);
  const [creando, setCreando] = useState(false);
  const [nombreNuevo, setNombreNuevo] = useState("");

  const { data: gabinetes = [], isLoading } = useQuery({
    queryKey: ["gabinetes-admin"],
    queryFn: async () => (await apiClient.get<Gabinete[]>("/doctores/gabinetes/")).data,
    select: (d) => Array.isArray(d) ? d : [],
  });

  const crearMut = useMutation({
    mutationFn: (nombre: string) => apiClient.post("/doctores/gabinetes/", { nombre }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["gabinetes-admin"] }); toast.success("Gabinete creado"); setCreando(false); setNombreNuevo(""); },
    onError: () => toast.error("Error al crear gabinete"),
  });

  const editarMut = useMutation({
    mutationFn: ({ id, nombre, activo }: { id: string; nombre: string; activo: boolean }) =>
      apiClient.patch(`/doctores/gabinetes/${id}`, { nombre, activo }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["gabinetes-admin"] }); toast.success("Gabinete actualizado"); setEditando(null); },
    onError: () => toast.error("Error al actualizar"),
  });

  return (
    <div className="space-y-3 max-w-lg">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{gabinetes.length} gabinete{gabinetes.length !== 1 ? "s" : ""}</p>
        <button onClick={() => setCreando(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          + Nuevo gabinete
        </button>
      </div>

      {creando && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 flex items-center gap-2">
          <input autoFocus value={nombreNuevo} onChange={(e) => setNombreNuevo(e.target.value)}
            placeholder="Nombre del gabinete"
            onKeyDown={(e) => e.key === "Enter" && nombreNuevo && crearMut.mutate(nombreNuevo)}
            className={INPUT_CLS + " flex-1"} />
          <button onClick={() => nombreNuevo && crearMut.mutate(nombreNuevo)} disabled={!nombreNuevo}
            className="rounded-md bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-40">
            Guardar
          </button>
          <button onClick={() => setCreando(false)} className="text-gray-400 hover:text-gray-600 px-2">✕</button>
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        {isLoading ? <LoadingRow /> : (
          <ul className="divide-y divide-gray-100">
            {gabinetes.map((g) => (
              <li key={g.id} className={`flex items-center justify-between px-4 py-3 hover:bg-gray-50 ${!g.activo ? "opacity-50" : ""}`}>
                {editando?.id === g.id ? (
                  <input autoFocus value={editando.nombre}
                    onChange={(e) => setEditando({ ...editando, nombre: e.target.value })}
                    onKeyDown={(e) => e.key === "Enter" && editarMut.mutate({ id: g.id, nombre: editando.nombre, activo: g.activo })}
                    className={INPUT_CLS + " flex-1 mr-2"} />
                ) : (
                  <span className="font-medium text-gray-800 text-sm">{g.nombre}</span>
                )}
                <div className="flex items-center gap-1">
                  {editando?.id === g.id ? (
                    <>
                      <button onClick={() => editarMut.mutate({ id: g.id, nombre: editando.nombre, activo: g.activo })}
                        className="text-xs px-2 py-1 rounded text-green-600 hover:bg-green-50">Guardar</button>
                      <button onClick={() => setEditando(null)} className="text-xs px-2 py-1 rounded text-gray-500 hover:bg-gray-100">Cancelar</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => setEditando(g)} className="text-xs px-2 py-1 rounded text-blue-600 hover:bg-blue-50">Renombrar</button>
                      <button onClick={() => editarMut.mutate({ id: g.id, nombre: g.nombre, activo: !g.activo })}
                        className={`text-xs px-2 py-1 rounded ${g.activo ? "text-red-500 hover:bg-red-50" : "text-green-600 hover:bg-green-50"}`}>
                        {g.activo ? "Desactivar" : "Activar"}
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TAB TRATAMIENTOS
// ═══════════════════════════════════════════════════════════════════

interface Familia { id: string; nombre: string; icono: string; orden: number; }
interface TratamientoCatalogo {
  id: string; familia_id: string; codigo: string; nombre: string;
  precio: number; iva_porcentaje: number; requiere_pieza: boolean;
  requiere_caras: boolean; activo: boolean;
}

const ICONOS_DISPONIBLES = [
  "🦷", "🔧", "💊", "🩺", "⚕️", "🩻", "💉", "🔬", "🪥", "✨",
  "🔩", "🌡️", "🩹", "❤️", "⭐", "🎯", "📋", "🏥",
];

function TabTratamientos() {
  const qc = useQueryClient();
  const [familiaSeleccionada, setFamiliaSeleccionada] = useState<string | null>(null);
  const [modalFamilia, setModalFamilia] = useState<Familia | null | "new">(null);
  const [modalTrat, setModalTrat] = useState<TratamientoCatalogo | null | "new">(null);

  const { data: familias = [], isLoading: loadFam } = useQuery({
    queryKey: ["familias-admin"],
    queryFn: async () => (await apiClient.get<Familia[]>("/tratamientos/familias")).data,
    select: (d) => Array.isArray(d) ? d : [],
  });

  const { data: tratamientos = [], isLoading: loadTrat } = useQuery({
    queryKey: ["tratamientos-admin", familiaSeleccionada],
    queryFn: async () => {
      const url = familiaSeleccionada
        ? `/tratamientos?familia_id=${familiaSeleccionada}`
        : "/tratamientos";
      const res = await apiClient.get<TratamientoCatalogo[]>(url);
      return res.data;
    },
    select: (d) => Array.isArray(d) ? d : [],
  });

  const toggleTratMut = useMutation({
    mutationFn: ({ id, activo }: { id: string; activo: boolean }) =>
      apiClient.patch(`/tratamientos/${id}`, { activo }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tratamientos-admin"] }); toast.success("Tratamiento actualizado"); },
    onError: () => toast.error("Error al actualizar"),
  });

  const familiaActual = familias.find((f) => f.id === familiaSeleccionada);

  return (
    <div className="flex gap-4 h-full">
      {/* Panel izquierdo — Familias */}
      <div className="w-52 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Familias</span>
          <button onClick={() => setModalFamilia("new")} className="text-xs text-blue-600 hover:underline">+ Nueva</button>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          {loadFam ? <div className="p-3 text-xs text-gray-400">Cargando...</div> : (
            <ul className="divide-y divide-gray-100">
              <li>
                <button onClick={() => setFamiliaSeleccionada(null)}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-blue-50 text-left ${familiaSeleccionada === null ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-700"}`}>
                  <span className="text-base">📋</span> Todos
                </button>
              </li>
              {familias.map((f) => (
                <li key={f.id}>
                  <button onClick={() => setFamiliaSeleccionada(f.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-blue-50 text-left ${familiaSeleccionada === f.id ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-700"}`}>
                    <span className="text-base">{f.icono || "🦷"}</span>
                    <span className="truncate">{f.nombre}</span>
                    <button onClick={(e) => { e.stopPropagation(); setModalFamilia(f); }}
                      className="ml-auto text-gray-400 hover:text-blue-500 text-xs">✏️</button>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Panel derecho — Tratamientos */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            {familiaActual ? `${familiaActual.icono || "🦷"} ${familiaActual.nombre}` : "Todos los tratamientos"}
            <span className="ml-2 text-xs text-gray-400">({tratamientos.length})</span>
          </span>
          <button onClick={() => { if (!familiaSeleccionada) { toast.error("Selecciona una familia primero"); return; } setModalTrat("new"); }}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700">
            + Nuevo tratamiento
          </button>
        </div>
        <div className="flex-1 rounded-lg border border-gray-200 bg-white overflow-auto">
          {loadTrat ? <LoadingRow /> : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                <tr>
                  <Th>Código</Th><Th>Nombre</Th><Th>Familia</Th>
                  <Th center>Precio</Th><Th center>IVA%</Th>
                  <Th center>Pieza</Th><Th center>Activo</Th><Th center>Acciones</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tratamientos.map((t) => {
                  const fam = familias.find((f) => f.id === t.familia_id);
                  return (
                    <tr key={t.id} className={`hover:bg-gray-50 ${!t.activo ? "opacity-50" : ""}`}>
                      <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{t.codigo || "—"}</td>
                      <td className="px-4 py-2.5 font-medium text-gray-800">{t.nombre}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-500">{fam ? `${fam.icono || ""} ${fam.nombre}` : "—"}</td>
                      <td className="px-4 py-2.5 text-center text-sm tabular-nums font-medium text-green-700">
                        {Number(t.precio).toFixed(2)} €
                      </td>
                      <td className="px-4 py-2.5 text-center text-xs">{t.iva_porcentaje}%</td>
                      <td className="px-4 py-2.5 text-center text-xs">{t.requiere_pieza ? <Ok /> : <span className="text-gray-300">—</span>}</td>
                      <td className="px-4 py-2.5 text-center">{t.activo ? <Ok /> : <span className="text-gray-400 text-xs">—</span>}</td>
                      <td className="px-4 py-2.5 text-center space-x-1">
                        <button onClick={() => setModalTrat(t)} className="text-xs px-2 py-1 rounded text-blue-600 hover:bg-blue-50">Editar</button>
                        <button onClick={() => toggleTratMut.mutate({ id: t.id, activo: !t.activo })}
                          className={`text-xs px-2 py-1 rounded ${t.activo ? "text-red-500 hover:bg-red-50" : "text-green-600 hover:bg-green-50"}`}>
                          {t.activo ? "Desactivar" : "Activar"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {tratamientos.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">Sin tratamientos</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modales */}
      {modalFamilia !== null && (
        <FamiliaModal
          familia={modalFamilia === "new" ? undefined : modalFamilia}
          onClose={() => setModalFamilia(null)}
          onSaved={() => { qc.invalidateQueries({ queryKey: ["familias-admin"] }); setModalFamilia(null); }}
        />
      )}
      {modalTrat !== null && familiaSeleccionada && (
        <TratamientoModal
          tratamiento={modalTrat === "new" ? undefined : modalTrat}
          familiaId={familiaSeleccionada}
          onClose={() => setModalTrat(null)}
          onSaved={() => { qc.invalidateQueries({ queryKey: ["tratamientos-admin"] }); setModalTrat(null); }}
        />
      )}
    </div>
  );
}

function FamiliaModal({ familia, onClose, onSaved }: { familia?: Familia; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ nombre: familia?.nombre ?? "", icono: familia?.icono ?? "🦷", orden: String(familia?.orden ?? 0) });
  const mut = useMutation({
    mutationFn: (d: typeof form) => familia
      ? apiClient.patch(`/tratamientos/familias/${familia.id}`, { nombre: d.nombre, icono: d.icono, orden: Number(d.orden) })
      : apiClient.post("/tratamientos/familias", { nombre: d.nombre, icono: d.icono, orden: Number(d.orden) }),
    onSuccess: () => { toast.success(familia ? "Familia actualizada" : "Familia creada"); onSaved(); },
    onError: () => toast.error("Error al guardar"),
  });
  return (
    <Modal title={familia ? "Editar familia" : "Nueva familia"} onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); mut.mutate(form); }} className="space-y-3">
        <Field label="Nombre *">
          <input value={form.nombre} required onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))} className={INPUT_CLS} />
        </Field>
        <Field label="Icono">
          <div className="grid grid-cols-9 gap-1 mb-2">
            {ICONOS_DISPONIBLES.map((ic) => (
              <button key={ic} type="button" onClick={() => setForm((p) => ({ ...p, icono: ic }))}
                className={`text-xl p-1 rounded hover:bg-gray-100 ${form.icono === ic ? "bg-blue-100 ring-2 ring-blue-400" : ""}`}>
                {ic}
              </button>
            ))}
          </div>
          <input value={form.icono} onChange={(e) => setForm((p) => ({ ...p, icono: e.target.value }))}
            placeholder="O escribe un emoji personalizado" className={INPUT_CLS} />
        </Field>
        <Field label="Orden de visualización">
          <input type="number" min="0" value={form.orden} onChange={(e) => setForm((p) => ({ ...p, orden: e.target.value }))} className={INPUT_CLS} />
        </Field>
        <ModalFooter onClose={onClose} loading={mut.isPending} label={familia ? "Guardar" : "Crear familia"} />
      </form>
    </Modal>
  );
}

function TratamientoModal({ tratamiento, familiaId, onClose, onSaved }: {
  tratamiento?: TratamientoCatalogo; familiaId: string; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm] = useState({
    codigo: tratamiento?.codigo ?? "",
    nombre: tratamiento?.nombre ?? "",
    precio: String(tratamiento?.precio ?? "0"),
    iva_porcentaje: String(tratamiento?.iva_porcentaje ?? "0"),
    requiere_pieza: tratamiento?.requiere_pieza ?? true,
    requiere_caras: tratamiento?.requiere_caras ?? false,
    familia_id: familiaId,
  });
  const mut = useMutation({
    mutationFn: (d: typeof form) => tratamiento
      ? apiClient.patch(`/tratamientos/${tratamiento.id}`, { ...d, precio: Number(d.precio), iva_porcentaje: Number(d.iva_porcentaje) })
      : apiClient.post("/tratamientos", { ...d, precio: Number(d.precio), iva_porcentaje: Number(d.iva_porcentaje) }),
    onSuccess: () => { toast.success(tratamiento ? "Tratamiento actualizado" : "Tratamiento creado"); onSaved(); },
    onError: (e: unknown) => toast.error((e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Error"),
  });
  return (
    <Modal title={tratamiento ? "Editar tratamiento" : "Nuevo tratamiento"} onClose={onClose} wide>
      <form onSubmit={(e) => { e.preventDefault(); mut.mutate(form); }} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Código">
            <input value={form.codigo} onChange={(e) => setForm((p) => ({ ...p, codigo: e.target.value }))}
              placeholder="Ej: OB01" className={INPUT_CLS} />
          </Field>
          <Field label="Nombre *">
            <input value={form.nombre} required onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))} className={INPUT_CLS} />
          </Field>
          <Field label="Precio base (€) *">
            <input type="number" min="0" step="0.01" value={form.precio} required
              onChange={(e) => setForm((p) => ({ ...p, precio: e.target.value }))} className={INPUT_CLS} />
          </Field>
          <Field label="IVA (%)">
            <input type="number" min="0" max="100" step="0.01" value={form.iva_porcentaje}
              onChange={(e) => setForm((p) => ({ ...p, iva_porcentaje: e.target.value }))} className={INPUT_CLS} />
          </Field>
        </div>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
            <input type="checkbox" checked={form.requiere_pieza}
              onChange={(e) => setForm((p) => ({ ...p, requiere_pieza: e.target.checked }))} className="rounded" />
            Requiere pieza dental
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
            <input type="checkbox" checked={form.requiere_caras}
              onChange={(e) => setForm((p) => ({ ...p, requiere_caras: e.target.checked }))} className="rounded" />
            Requiere selección de caras
          </label>
        </div>
        <ModalFooter onClose={onClose} loading={mut.isPending} label={tratamiento ? "Guardar cambios" : "Crear tratamiento"} />
      </form>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TAB ENTIDADES
// ═══════════════════════════════════════════════════════════════════

interface Entidad {
  id: string; nombre: string; cif: string | null; direccion: string | null;
  telefono: string | null; contacto: string | null; activo: boolean;
}
interface EntidadForm { nombre: string; cif: string; direccion: string; telefono: string; contacto: string; }
const ENTIDAD_DEFAULTS: EntidadForm = { nombre: "", cif: "", direccion: "", telefono: "", contacto: "" };

function TabEntidades() {
  const qc = useQueryClient();
  const [editando, setEditando] = useState<Entidad | null>(null);
  const [creando, setCreando] = useState(false);

  const { data: entidades = [], isLoading } = useQuery({
    queryKey: ["entidades-admin"],
    queryFn: async () => (await apiClient.get<Entidad[]>("/admin/entidades")).data,
    select: (d) => Array.isArray(d) ? d : [],
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, activo }: { id: string; activo: boolean }) =>
      apiClient.patch(`/admin/entidades/${id}`, { activo }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["entidades-admin"] }); toast.success("Entidad actualizada"); },
    onError: () => toast.error("Error al actualizar"),
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{entidades.length} entidad{entidades.length !== 1 ? "es" : ""}</p>
        <button onClick={() => setCreando(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          + Nueva entidad
        </button>
      </div>
      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        {isLoading ? <LoadingRow /> : entidades.length === 0 ? (
          <div className="flex h-24 items-center justify-center text-sm text-gray-400">Sin entidades registradas</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <Th>Nombre</Th><Th>CIF</Th><Th>Teléfono</Th><Th>Contacto</Th>
                <Th center>Activa</Th><Th center>Acciones</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entidades.map((e) => (
                <tr key={e.id} className={`hover:bg-gray-50 ${!e.activo ? "opacity-50" : ""}`}>
                  <td className="px-4 py-2.5 font-medium text-gray-800">{e.nombre}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-500 font-mono">{e.cif ?? "—"}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">{e.telefono ?? "—"}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">{e.contacto ?? "—"}</td>
                  <td className="px-4 py-2.5 text-center">{e.activo ? <Ok /> : <span className="text-gray-400 text-xs">—</span>}</td>
                  <td className="px-4 py-2.5 text-center space-x-1">
                    <button onClick={() => setEditando(e)} className="text-xs px-2 py-1 rounded text-blue-600 hover:bg-blue-50">Editar</button>
                    <button onClick={() => toggleMut.mutate({ id: e.id, activo: !e.activo })}
                      className={`text-xs px-2 py-1 rounded ${e.activo ? "text-red-500 hover:bg-red-50" : "text-green-600 hover:bg-green-50"}`}>
                      {e.activo ? "Desactivar" : "Activar"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {(creando || editando) && (
        <EntidadModal
          entidad={editando ?? undefined}
          onClose={() => { setCreando(false); setEditando(null); }}
          onSaved={() => { qc.invalidateQueries({ queryKey: ["entidades-admin"] }); setCreando(false); setEditando(null); }}
        />
      )}
    </div>
  );
}

function EntidadModal({ entidad, onClose, onSaved }: { entidad?: Entidad; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<EntidadForm>(
    entidad
      ? { nombre: entidad.nombre, cif: entidad.cif ?? "", direccion: entidad.direccion ?? "", telefono: entidad.telefono ?? "", contacto: entidad.contacto ?? "" }
      : ENTIDAD_DEFAULTS
  );
  const mut = useMutation({
    mutationFn: (d: EntidadForm) => entidad
      ? apiClient.patch(`/admin/entidades/${entidad.id}`, d)
      : apiClient.post("/admin/entidades", d),
    onSuccess: () => { toast.success(entidad ? "Entidad actualizada" : "Entidad creada"); onSaved(); },
    onError: () => toast.error("Error al guardar"),
  });
  return (
    <Modal title={entidad ? "Editar entidad" : "Nueva entidad"} onClose={onClose} wide>
      <form onSubmit={(e) => { e.preventDefault(); mut.mutate(form); }} className="space-y-3">
        <Field label="Nombre *">
          <input value={form.nombre} required onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))} className={INPUT_CLS} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="CIF">
            <input value={form.cif} onChange={(e) => setForm((p) => ({ ...p, cif: e.target.value }))} className={INPUT_CLS} />
          </Field>
          <Field label="Teléfono">
            <input value={form.telefono} onChange={(e) => setForm((p) => ({ ...p, telefono: e.target.value }))} className={INPUT_CLS} />
          </Field>
        </div>
        <Field label="Persona de contacto">
          <input value={form.contacto} onChange={(e) => setForm((p) => ({ ...p, contacto: e.target.value }))} className={INPUT_CLS} />
        </Field>
        <Field label="Dirección">
          <input value={form.direccion} onChange={(e) => setForm((p) => ({ ...p, direccion: e.target.value }))} className={INPUT_CLS} />
        </Field>
        <ModalFooter onClose={onClose} loading={mut.isPending} label={entidad ? "Guardar cambios" : "Crear entidad"} />
      </form>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TAB CUMPLIMIENTO SIF
// ═══════════════════════════════════════════════════════════════════

interface CumplimientoSif {
  modo: string;
  sif_codigo: string;
  sif_version: string;
  sif_nombre_producto: string;
  declaracion_responsable: string;
  resumen: {
    total_facturas: number;
    total_registros_facturacion: number;
    total_eventos_sif: number;
    facturas_pendientes_remision: number;
    facturas_rechazadas: number;
  };
  diagnostico_series: { serie: string; ok: boolean; total_registros: number; errores: unknown[] }[];
  ultimos_registros: {
    id: string;
    serie: string;
    numero_factura: number;
    tipo_registro: string;
    secuencia: number;
    estado_remision: string | null;
    huella: string;
    created_at: string;
  }[];
}

function TabCumplimientoSif() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-cumplimiento-sif"],
    queryFn: async () => (await apiClient.get<CumplimientoSif>("/admin/cumplimiento-sif")).data,
  });

  async function exportar() {
    const response = await apiClient.get("/admin/cumplimiento-sif/export", { responseType: "blob" });
    const blob = new Blob([response.data], { type: "application/json" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "cumplimiento_sif.json";
    link.click();
    window.URL.revokeObjectURL(url);
  }

  if (isLoading || !data) return <LoadingRow />;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Cumplimiento</p>
            <h2 className="text-lg font-semibold text-slate-900">{data.sif_nombre_producto}</h2>
            <p className="mt-1 text-sm text-slate-500">
              Código {data.sif_codigo} · versión {data.sif_version} · modo {data.modo}
            </p>
          </div>
          <button
            onClick={exportar}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Exportar JSON
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        <KpiMini label="Facturas" value={String(data.resumen.total_facturas)} />
        <KpiMini label="RF encadenados" value={String(data.resumen.total_registros_facturacion)} />
        <KpiMini label="Eventos SIF" value={String(data.resumen.total_eventos_sif)} />
        <KpiMini label="Pendientes AEAT" value={String(data.resumen.facturas_pendientes_remision)} />
        <KpiMini label="Rechazadas" value={String(data.resumen.facturas_rechazadas)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr,0.9fr]">
        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-gray-700">Diagnóstico de cadena</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {data.diagnostico_series.length === 0 ? (
              <div className="px-4 py-6 text-sm text-gray-400">Sin registros fiscales todavía.</div>
            ) : (
              data.diagnostico_series.map((serie) => (
                <div key={serie.serie} className="flex items-center justify-between px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium text-gray-800">Serie {serie.serie}</p>
                    <p className="text-xs text-gray-400">{serie.total_registros} registros</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${serie.ok ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {serie.ok ? "Cadena OK" : `Errores: ${serie.errores.length}`}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-gray-700">Declaración responsable</h3>
          </div>
          <div className="px-4 py-4">
            <p className="whitespace-pre-wrap text-sm leading-6 text-gray-600">{data.declaracion_responsable}</p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
        <div className="border-b border-gray-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-700">Últimos registros de facturación</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <Th>Serie</Th>
              <Th>Número</Th>
              <Th>Tipo</Th>
              <Th center>Secuencia</Th>
              <Th>Estado</Th>
              <Th>Huella</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.ultimos_registros.map((registro) => (
              <tr key={registro.id} className="hover:bg-gray-50">
                <td className="px-4 py-2.5 font-medium text-gray-800">{registro.serie}</td>
                <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{registro.numero_factura}</td>
                <td className="px-4 py-2.5 text-xs capitalize text-gray-500">{registro.tipo_registro}</td>
                <td className="px-4 py-2.5 text-center text-xs tabular-nums text-gray-500">{registro.secuencia}</td>
                <td className="px-4 py-2.5 text-xs text-gray-500">{registro.estado_remision ?? "—"}</td>
                <td className="px-4 py-2.5 font-mono text-[11px] text-gray-400">{registro.huella.slice(0, 16)}...</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function KpiMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-1 text-lg font-semibold text-gray-900">{value}</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// COMPONENTES COMPARTIDOS
// ═══════════════════════════════════════════════════════════════════

const INPUT_CLS = "w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

function Th({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return (
    <th className={`px-4 py-2.5 text-xs font-semibold text-gray-500 ${center ? "text-center" : "text-left"}`}>
      {children}
    </th>
  );
}

function Ok() {
  return <span className="text-green-600 font-bold">✓</span>;
}

function LoadingRow() {
  return <div className="flex h-24 items-center justify-center text-sm text-gray-400">Cargando...</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className={`w-full rounded-xl bg-white shadow-2xl ${wide ? "max-w-xl" : "max-w-sm"}`}>
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-800">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

function ModalFooter({ onClose, loading, label }: { onClose: () => void; loading: boolean; label: string }) {
  return (
    <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
      <button type="button" onClick={onClose}
        className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">Cancelar</button>
      <button type="submit" disabled={loading}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
        {loading ? "Guardando..." : label}
      </button>
    </div>
  );
}
