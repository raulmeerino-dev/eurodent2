/**
 * RecordatoriosModal — Envío de recordatorios por WhatsApp.
 *
 * Carga las citas del rango seleccionado, permite personalizar la plantilla
 * y abre WhatsApp (app o web) con el mensaje listo para cada paciente.
 * El envío es secuencial con delay configurable para no saturar el navegador.
 */
import { useState, useMemo } from "react";
import { format, addDays, startOfToday } from "date-fns";
import { es } from "date-fns/locale";
import { useQuery } from "@tanstack/react-query";
import { getCitas } from "../../api/citas";
import type { Cita } from "../../types";

// ─── Plantilla por defecto ────────────────────────────────────────────────────

const PLANTILLA_DEFAULT =
  "Hola {nombre}, le recordamos su cita en la clínica dental el {fecha} a las {hora} con {doctor}. Por favor, avísenos con antelación si no puede asistir. ¡Hasta pronto!";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function limpiarTelefono(tel: string): string {
  // Elimina espacios, guiones, paréntesis. Añade prefijo España si no tiene.
  const limpio = tel.replace(/[\s\-().+]/g, "");
  if (limpio.startsWith("6") || limpio.startsWith("7") || limpio.startsWith("9")) {
    return "34" + limpio;
  }
  return limpio;
}

function construirMensaje(plantilla: string, cita: Cita): string {
  const nombre = cita.paciente
    ? `${cita.paciente.nombre} ${cita.paciente.apellidos ?? ""}`.trim()
    : "paciente";
  const fechaObj = new Date(cita.fecha_hora);
  const fecha = format(fechaObj, "EEEE d 'de' MMMM", { locale: es });
  const hora = format(fechaObj, "HH:mm");
  const doctor = cita.doctor?.nombre ?? "su doctor";

  return plantilla
    .replace(/{nombre}/g, nombre)
    .replace(/{fecha}/g, fecha)
    .replace(/{hora}/g, hora)
    .replace(/{doctor}/g, doctor);
}

function urlWhatsApp(telefono: string, mensaje: string): string {
  const tel = limpiarTelefono(telefono);
  const msg = encodeURIComponent(mensaje);
  // wa.me funciona en móvil y escritorio (abre WhatsApp Desktop si está instalado)
  return `https://wa.me/${tel}?text=${msg}`;
}

// ─── Tipos internos ───────────────────────────────────────────────────────────

type RangoPreset = "hoy" | "manana" | "semana" | "personalizado";

interface CitaConEstado extends Cita {
  enviado: boolean;
  sinTelefono: boolean;
}

// ─── Componente principal ─────────────────────────────────────────────────────

interface Props {
  onClose: () => void;
}

export default function RecordatoriosModal({ onClose }: Props) {
  const hoy = startOfToday();

  const [preset, setPreset] = useState<RangoPreset>("manana");
  const [fechaDesdeCustom, setFechaDesdeCustom] = useState(format(hoy, "yyyy-MM-dd"));
  const [fechaHastaCustom, setFechaHastaCustom] = useState(format(addDays(hoy, 6), "yyyy-MM-dd"));
  const [plantilla, setPlantilla] = useState(PLANTILLA_DEFAULT);
  const [enviados, setEnviados] = useState<Set<string>>(new Set());
  const [enviando, setEnviando] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [excluidos, setExcluidos] = useState<Set<string>>(new Set());

  // Calcular rango de fechas según preset
  const { desde, hasta } = useMemo(() => {
    switch (preset) {
      case "hoy":
        return {
          desde: format(hoy, "yyyy-MM-dd") + "T00:00:00",
          hasta: format(hoy, "yyyy-MM-dd") + "T23:59:59",
        };
      case "manana": {
        const m = addDays(hoy, 1);
        return {
          desde: format(m, "yyyy-MM-dd") + "T00:00:00",
          hasta: format(m, "yyyy-MM-dd") + "T23:59:59",
        };
      }
      case "semana":
        return {
          desde: format(addDays(hoy, 1), "yyyy-MM-dd") + "T00:00:00",
          hasta: format(addDays(hoy, 7), "yyyy-MM-dd") + "T23:59:59",
        };
      case "personalizado":
        return {
          desde: fechaDesdeCustom + "T00:00:00",
          hasta: fechaHastaCustom + "T23:59:59",
        };
    }
  }, [preset, fechaDesdeCustom, fechaHastaCustom, hoy]);

  const { data: citasRaw = [], isLoading } = useQuery({
    queryKey: ["citas-recordatorios", desde, hasta],
    queryFn: () => getCitas({ fecha_desde: desde, fecha_hasta: hasta }),
    select: (d) => (Array.isArray(d) ? d : []),
  });

  // Filtrar: solo programadas/confirmadas, ordenar por fecha
  const citas = useMemo((): CitaConEstado[] => {
    return citasRaw
      .filter((c) => c.estado === "programada" || c.estado === "confirmada")
      .sort((a, b) => new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime())
      .map((c) => ({
        ...c,
        enviado: enviados.has(c.id),
        sinTelefono: !c.paciente?.telefono,
      }));
  }, [citasRaw, enviados]);

  const citasEnviables = citas.filter((c) => !c.sinTelefono && !excluidos.has(c.id));
  const pendientes = citasEnviables.filter((c) => !c.enviado);

  // Abre WhatsApp para una cita y marca como enviada
  function abrirWhatsApp(cita: CitaConEstado) {
    if (!cita.paciente?.telefono) return;
    const mensaje = construirMensaje(plantilla, cita);
    const url = urlWhatsApp(cita.paciente.telefono, mensaje);
    window.open(url, "_blank");
    setEnviados((prev) => new Set([...prev, cita.id]));
  }

  // Envío secuencial con delay de 1.5s entre cada uno
  async function enviarTodos() {
    setEnviando(true);
    setProgreso(0);
    const lista = pendientes;
    for (let i = 0; i < lista.length; i++) {
      abrirWhatsApp(lista[i]);
      setProgreso(i + 1);
      if (i < lista.length - 1) {
        await new Promise((r) => setTimeout(r, 1500));
      }
    }
    setEnviando(false);
  }

  const variablesDisponibles = ["{nombre}", "{fecha}", "{hora}", "{doctor}"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-xl bg-white shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 shrink-0">
          <div className="flex items-center gap-3">
            {/* Icono WhatsApp */}
            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-800">Recordatorios WhatsApp</h2>
              <p className="text-xs text-gray-400">Abre WhatsApp con el mensaje listo para enviar</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Panel izquierdo — configuración */}
          <div className="w-72 shrink-0 border-r border-gray-200 overflow-y-auto p-4 space-y-4">

            {/* Rango */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Rango de fechas</label>
              <div className="grid grid-cols-2 gap-1.5">
                {([
                  { id: "hoy",          label: "Hoy" },
                  { id: "manana",       label: "Mañana" },
                  { id: "semana",       label: "Próx. 7 días" },
                  { id: "personalizado",label: "Personalizado" },
                ] as { id: RangoPreset; label: string }[]).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPreset(p.id)}
                    className={`rounded-md px-3 py-2 text-xs font-medium transition-colors ${
                      preset === p.id
                        ? "bg-green-600 text-white"
                        : "border border-gray-300 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {preset === "personalizado" && (
                <div className="mt-2 space-y-2">
                  <div>
                    <label className="text-[11px] text-gray-400 mb-1 block">Desde</label>
                    <input type="date" value={fechaDesdeCustom}
                      onChange={(e) => setFechaDesdeCustom(e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-500" />
                  </div>
                  <div>
                    <label className="text-[11px] text-gray-400 mb-1 block">Hasta</label>
                    <input type="date" value={fechaHastaCustom}
                      onChange={(e) => setFechaHastaCustom(e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-500" />
                  </div>
                </div>
              )}
            </div>

            {/* Plantilla */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Mensaje</label>
              <p className="text-[11px] text-gray-400 mb-2">Variables disponibles:</p>
              <div className="flex flex-wrap gap-1 mb-2">
                {variablesDisponibles.map((v) => (
                  <button
                    key={v}
                    onClick={() => setPlantilla((p) => p + v)}
                    className="rounded bg-gray-100 hover:bg-green-50 hover:text-green-700 text-gray-600 px-1.5 py-0.5 text-[11px] font-mono transition-colors"
                    title={`Insertar ${v}`}
                  >
                    {v}
                  </button>
                ))}
              </div>
              <textarea
                rows={7}
                value={plantilla}
                onChange={(e) => setPlantilla(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              />
              <button
                onClick={() => setPlantilla(PLANTILLA_DEFAULT)}
                className="mt-1 text-[11px] text-gray-400 hover:text-gray-600 hover:underline"
              >
                Restaurar plantilla original
              </button>
            </div>

            {/* Vista previa */}
            {citas.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Vista previa</label>
                <div className="rounded-lg bg-green-50 border border-green-200 p-3">
                  <p className="text-[11px] text-green-800 leading-relaxed whitespace-pre-wrap">
                    {construirMensaje(plantilla, citas[0])}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Panel derecho — lista de citas */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Barra de estado */}
            <div className="shrink-0 border-b border-gray-200 px-4 py-2 bg-gray-50 flex items-center justify-between">
              {isLoading ? (
                <span className="text-xs text-gray-400">Cargando citas...</span>
              ) : (
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span><strong className="text-gray-800">{citas.length}</strong> citas</span>
                  <span className="text-gray-300">|</span>
                  <span className="text-green-700 font-medium">{enviados.size} enviados</span>
                  <span className="text-gray-300">|</span>
                  <span>{citas.filter((c) => c.sinTelefono).length} sin teléfono</span>
                </div>
              )}
              {/* Barra de progreso durante envío */}
              {enviando && (
                <div className="flex items-center gap-2 text-xs text-green-700">
                  <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 transition-all"
                      style={{ width: `${(progreso / pendientes.length) * 100}%` }}
                    />
                  </div>
                  <span>{progreso}/{pendientes.length}</span>
                </div>
              )}
            </div>

            {/* Lista */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="flex h-full items-center justify-center text-sm text-gray-400">
                  <div className="text-center">
                    <div className="animate-spin w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full mx-auto mb-2" />
                    Cargando...
                  </div>
                </div>
              ) : citas.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-gray-400">
                  No hay citas programadas en este rango.
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-400 w-8">
                        <input
                          type="checkbox"
                          className="h-3.5 w-3.5 rounded border-gray-300"
                          checked={excluidos.size === 0 && citas.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) setExcluidos(new Set());
                            else setExcluidos(new Set(citas.map((c) => c.id)));
                          }}
                          title="Seleccionar/deseleccionar todos"
                        />
                      </th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-400">Paciente</th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-400 w-28">Fecha/Hora</th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-400 w-24">Doctor</th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold text-gray-400 w-28">Teléfono</th>
                      <th className="px-3 py-2 text-center text-[11px] font-semibold text-gray-400 w-20">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {citas.map((cita) => {
                      const excluida = excluidos.has(cita.id);
                      const enviada = enviados.has(cita.id);
                      return (
                        <tr
                          key={cita.id}
                          className={`transition-colors ${
                            enviada
                              ? "bg-green-50"
                              : excluida
                              ? "bg-gray-50 opacity-50"
                              : "hover:bg-gray-50"
                          }`}
                        >
                          {/* Checkbox incluir/excluir */}
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              className="h-3.5 w-3.5 rounded border-gray-300"
                              checked={!excluida}
                              onChange={(e) => {
                                setExcluidos((prev) => {
                                  const next = new Set(prev);
                                  e.target.checked ? next.delete(cita.id) : next.add(cita.id);
                                  return next;
                                });
                              }}
                            />
                          </td>
                          {/* Nombre */}
                          <td className="px-3 py-2">
                            <span className="text-xs font-medium text-gray-800">
                              {cita.paciente
                                ? `${cita.paciente.apellidos ?? ""}, ${cita.paciente.nombre}`
                                : "—"}
                            </span>
                          </td>
                          {/* Fecha */}
                          <td className="px-3 py-2 text-xs text-gray-500 tabular-nums">
                            {format(new Date(cita.fecha_hora), "dd/MM HH:mm")}
                          </td>
                          {/* Doctor */}
                          <td className="px-3 py-2 text-xs text-gray-500 truncate max-w-[96px]">
                            {cita.doctor?.nombre ?? "—"}
                          </td>
                          {/* Teléfono */}
                          <td className="px-3 py-2 text-xs tabular-nums">
                            {cita.paciente?.telefono ? (
                              <span className="text-gray-600">{cita.paciente.telefono}</span>
                            ) : (
                              <span className="text-red-400 text-[11px]">Sin teléfono</span>
                            )}
                          </td>
                          {/* Acción individual */}
                          <td className="px-3 py-2 text-center">
                            {enviada ? (
                              <span className="text-[11px] font-medium text-green-600">✓ Enviado</span>
                            ) : cita.sinTelefono ? (
                              <span className="text-[11px] text-gray-300">—</span>
                            ) : (
                              <button
                                onClick={() => abrirWhatsApp(cita)}
                                disabled={excluida}
                                className="rounded-md bg-green-500 px-2 py-1 text-[11px] font-medium text-white hover:bg-green-600 disabled:opacity-30 transition-colors"
                                title="Abrir WhatsApp"
                              >
                                WA
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer — botón enviar todos */}
            <div className="shrink-0 border-t border-gray-200 px-4 py-3 bg-white flex items-center justify-between gap-3">
              <p className="text-xs text-gray-400">
                {pendientes.length > 0
                  ? `${pendientes.length} pendiente${pendientes.length !== 1 ? "s" : ""} de enviar · Se abrirá WhatsApp con el mensaje listo`
                  : citas.length > 0
                  ? "Todos los recordatorios enviados ✓"
                  : ""}
              </p>
              <div className="flex gap-2">
                <button onClick={onClose}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">
                  Cerrar
                </button>
                <button
                  onClick={enviarTodos}
                  disabled={enviando || pendientes.length === 0}
                  className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {enviando ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Enviando {progreso}/{pendientes.length}...
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                      Enviar {pendientes.length} recordatorio{pendientes.length !== 1 ? "s" : ""}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
