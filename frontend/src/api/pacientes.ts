import { apiClient } from "./client";
import type { Paciente } from "../types";

export interface PacienteCreate {
  nombre: string;
  apellidos: string;
  fecha_nacimiento?: string;
  dni_nie?: string;
  telefono?: string;
  telefono2?: string;
  email?: string;
  direccion?: string;
  codigo_postal?: string;
  ciudad?: string;
  provincia?: string;
  entidad_id?: string;
  no_correo?: boolean;
  observaciones?: string;
}

export type PacienteUpdate = Partial<PacienteCreate & { activo: boolean }>;

export interface Referencia {
  id: string;
  nombre: string;
  color: string | null;
}

export async function buscarPacientes(q: string, limit = 50): Promise<Paciente[]> {
  const { data } = await apiClient.get<Paciente[]>("/pacientes", {
    params: { q, limit },
  });
  return data;
}

export async function listarPacientes(params?: {
  q?: string;
  solo_activos?: boolean;
  limit?: number;
  offset?: number;
}): Promise<Paciente[]> {
  const { data } = await apiClient.get<Paciente[]>("/pacientes", { params });
  return data;
}

export async function getPaciente(id: string): Promise<Paciente> {
  const { data } = await apiClient.get<Paciente>(`/pacientes/${id}`);
  return data;
}

export async function crearPaciente(payload: PacienteCreate): Promise<Paciente> {
  const { data } = await apiClient.post<Paciente>("/pacientes", payload);
  return data;
}

export async function actualizarPaciente(id: string, payload: PacienteUpdate): Promise<Paciente> {
  const { data } = await apiClient.patch<Paciente>(`/pacientes/${id}`, payload);
  return data;
}

export async function getReferenciasCatalogo(): Promise<Referencia[]> {
  const { data } = await apiClient.get<Referencia[]>("/pacientes/referencias/catalogo");
  return data;
}

export async function asignarReferencias(pacienteId: string, referenciaIds: string[]): Promise<Referencia[]> {
  const { data } = await apiClient.put<Referencia[]>(
    `/pacientes/${pacienteId}/referencias`,
    { referencia_ids: referenciaIds },
  );
  return data;
}
