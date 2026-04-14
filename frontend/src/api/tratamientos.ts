import { apiClient } from "./client";

export interface Familia {
  id: string;
  nombre: string;
  icono: string | null;
  orden: number;
}

export interface Tratamiento {
  id: string;
  familia_id: string;
  familia?: Familia;
  codigo: string | null;
  nombre: string;
  precio: number;
  iva_porcentaje: number;
  requiere_pieza: boolean;
  requiere_caras: boolean;
  activo: boolean;
}

export interface HistorialEntrada {
  id: string;
  paciente_id: string;
  tratamiento_id: string;
  doctor_id: string;
  gabinete_id: string | null;
  pieza_dental: number | null;
  caras: string | null;
  fecha: string;
  observaciones: string | null;
  tratamiento?: { id: string; nombre: string; codigo: string | null };
  doctor?: { id: string; nombre: string };
}

export interface HistorialCreate {
  paciente_id: string;
  tratamiento_id: string;
  doctor_id: string;
  gabinete_id?: string;
  pieza_dental?: number;
  caras?: string;
  fecha: string;
  observaciones?: string;
}

export async function getFamilias(): Promise<Familia[]> {
  const { data } = await apiClient.get<Familia[]>("/tratamientos/familias");
  return data;
}

export async function getTratamientos(params?: {
  familia_id?: string;
  q?: string;
  solo_activos?: boolean;
}): Promise<Tratamiento[]> {
  const { data } = await apiClient.get<Tratamiento[]>("/tratamientos", { params });
  return data;
}

export async function getHistorialPaciente(
  pacienteId: string,
  pieza?: number,
): Promise<HistorialEntrada[]> {
  const { data } = await apiClient.get<HistorialEntrada[]>(
    `/tratamientos/historial/${pacienteId}`,
    { params: pieza ? { pieza } : undefined },
  );
  return data;
}

export async function registrarTratamiento(payload: HistorialCreate): Promise<HistorialEntrada> {
  const { data } = await apiClient.post<HistorialEntrada>("/tratamientos/historial", payload);
  return data;
}

export async function eliminarEntradaHistorial(id: string): Promise<void> {
  await apiClient.delete(`/tratamientos/historial/${id}`);
}
