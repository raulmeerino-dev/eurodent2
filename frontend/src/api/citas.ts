import { apiClient } from "./client";
import type { Cita, EstadoCita } from "../types";

export interface CitaCreate {
  paciente_id: string;
  doctor_id: string;
  gabinete_id?: string;
  fecha_hora: string;
  duracion_min: number;
  es_urgencia?: boolean;
  motivo?: string;
  observaciones?: string;
}

export interface CitaUpdate {
  doctor_id?: string;
  gabinete_id?: string;
  fecha_hora?: string;
  duracion_min?: number;
  estado?: EstadoCita;
  es_urgencia?: boolean;
  motivo?: string;
  observaciones?: string;
}

export interface HuecoLibre {
  doctor_id: string;
  fecha_hora_inicio: string;
  fecha_hora_fin: string;
  duracion_min: number;
}

export interface BuscarHuecoRequest {
  doctor_id: string;
  duracion_min: number;
  desde: string;
  hasta: string;
  solo_manana?: boolean;
  solo_tarde?: boolean;
}

export interface CitaTelefonear {
  id: string;
  cita_original_id: string;
  paciente_id: string;
  doctor_id: string;
  motivo: string | null;
  reubicada: boolean;
  nueva_cita_id: string | null;
  paciente?: { id: string; nombre: string; apellidos: string; num_historial: number };
  doctor?: { id: string; nombre: string; color_agenda: string | null };
}

export async function getCitas(params: {
  doctor_id?: string;
  paciente_id?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  estado?: string;
}): Promise<Cita[]> {
  const { data } = await apiClient.get<Cita[]>("/citas", { params });
  return data;
}

export async function getCita(id: string): Promise<Cita> {
  const { data } = await apiClient.get<Cita>(`/citas/${id}`);
  return data;
}

export async function crearCita(payload: CitaCreate): Promise<Cita> {
  const { data } = await apiClient.post<Cita>("/citas", payload);
  return data;
}

export async function actualizarCita(id: string, payload: CitaUpdate): Promise<Cita> {
  const { data } = await apiClient.patch<Cita>(`/citas/${id}`, payload);
  return data;
}

export async function anularCita(id: string): Promise<void> {
  await apiClient.delete(`/citas/${id}`);
}

export async function buscarHuecos(req: BuscarHuecoRequest): Promise<HuecoLibre[]> {
  const { data } = await apiClient.post<HuecoLibre[]>("/citas/buscar-hueco", req);
  return data;
}

export async function getTelefonearPendientes(doctorId?: string): Promise<CitaTelefonear[]> {
  const { data } = await apiClient.get<CitaTelefonear[]>("/citas/telefonear/pendientes", {
    params: doctorId ? { doctor_id: doctorId } : undefined,
  });
  return data;
}

export async function crearEntradaTelefonear(
  citaOriginalId: string,
  pacienteId: string,
  doctorId: string,
  motivo?: string,
): Promise<CitaTelefonear> {
  const { data } = await apiClient.post<CitaTelefonear>("/citas/telefonear", {
    cita_original_id: citaOriginalId,
    paciente_id: pacienteId,
    doctor_id: doctorId,
    motivo: motivo ?? null,
  });
  return data;
}

export async function marcarReubicada(entradaId: string, nuevaCitaId: string): Promise<CitaTelefonear> {
  const { data } = await apiClient.patch<CitaTelefonear>(
    `/citas/telefonear/${entradaId}/reubicar`,
    null,
    { params: { nueva_cita_id: nuevaCitaId } },
  );
  return data;
}
