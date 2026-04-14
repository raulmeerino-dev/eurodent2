import { apiClient } from "./client";

export interface Laboratorio {
  id: string;
  nombre: string;
  telefono: string | null;
  whatsapp: string | null;
  email: string | null;
  contacto: string | null;
  notas: string | null;
  activo: boolean;
}

export interface LaboratorioCreate {
  nombre: string;
  telefono?: string;
  whatsapp?: string;
  email?: string;
  contacto?: string;
  notas?: string;
}

export type EstadoTrabajo =
  | "pendiente"
  | "enviado"
  | "en_proceso"
  | "recibido"
  | "entregado"
  | "incidencia";

export interface TrabajoLaboratorio {
  id: string;
  paciente_id: string;
  doctor_id: string;
  laboratorio_id: string;
  historial_id: string | null;
  descripcion: string;
  pieza_dental: number | null;
  color: string | null;
  observaciones: string | null;
  fecha_salida: string | null;
  fecha_entrega_prevista: string | null;
  fecha_recepcion: string | null;
  fecha_entrega_paciente: string | null;
  estado: EstadoTrabajo;
  precio: number | null;
  paciente?: { id: string; nombre: string; apellidos: string; num_historial: number } | null;
  doctor?: { id: string; nombre: string } | null;
  laboratorio?: Laboratorio | null;
}

export interface TrabajoCreate {
  paciente_id: string;
  doctor_id: string;
  laboratorio_id: string;
  historial_id?: string;
  descripcion: string;
  pieza_dental?: number;
  color?: string;
  observaciones?: string;
  fecha_salida?: string;
  fecha_entrega_prevista?: string;
  precio?: number;
}

export interface TrabajoUpdate {
  laboratorio_id?: string;
  descripcion?: string;
  pieza_dental?: number;
  color?: string;
  observaciones?: string;
  fecha_salida?: string;
  fecha_entrega_prevista?: string;
  fecha_recepcion?: string;
  fecha_entrega_paciente?: string;
  estado?: EstadoTrabajo;
  precio?: number;
}

export async function getLaboratorios(soloActivos = true): Promise<Laboratorio[]> {
  const r = await apiClient.get("/laboratorios", { params: { solo_activos: soloActivos } });
  return Array.isArray(r.data) ? r.data : [];
}

export async function crearLaboratorio(data: LaboratorioCreate): Promise<Laboratorio> {
  const r = await apiClient.post("/laboratorios", data);
  return r.data;
}

export async function actualizarLaboratorio(id: string, data: Partial<LaboratorioCreate & { activo: boolean }>): Promise<Laboratorio> {
  const r = await apiClient.patch(`/laboratorios/${id}`, data);
  return r.data;
}

export async function getTrabajos(params?: {
  laboratorio_id?: string;
  paciente_id?: string;
  doctor_id?: string;
  estado?: EstadoTrabajo;
  pendientes?: boolean;
}): Promise<TrabajoLaboratorio[]> {
  const r = await apiClient.get("/laboratorio/trabajos", { params });
  return Array.isArray(r.data) ? r.data : [];
}

export async function crearTrabajo(data: TrabajoCreate): Promise<TrabajoLaboratorio> {
  const r = await apiClient.post("/laboratorio/trabajos", data);
  return r.data;
}

export async function actualizarTrabajo(id: string, data: TrabajoUpdate): Promise<TrabajoLaboratorio> {
  const r = await apiClient.patch(`/laboratorio/trabajos/${id}`, data);
  return r.data;
}

export async function eliminarTrabajo(id: string): Promise<void> {
  await apiClient.delete(`/laboratorio/trabajos/${id}`);
}

/** Abre WhatsApp con el número del laboratorio y un mensaje prefabricado. */
export function abrirWhatsappLab(whatsapp: string, mensaje: string): void {
  const numero = whatsapp.replace(/\D/g, "");
  const url = `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
  window.open(url, "_blank");
}
