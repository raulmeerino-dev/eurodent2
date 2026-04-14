import { apiClient } from "./client";
import type { Doctor } from "../types";

export interface HorarioBloque {
  inicio: string;
  fin: string;
}

export interface HorarioDoctor {
  id: string;
  doctor_id: string;
  dia_semana: number;
  tipo_dia: string;
  bloques: HorarioBloque[];
  intervalo_min: number;
}

export async function getDoctores(soloActivos = true): Promise<Doctor[]> {
  const { data } = await apiClient.get<Doctor[]>("/doctores", {
    params: { solo_activos: soloActivos },
  });
  return data;
}

export async function getHorarioDoctor(doctorId: string): Promise<HorarioDoctor[]> {
  const { data } = await apiClient.get<HorarioDoctor[]>(`/doctores/${doctorId}/horarios`);
  return data;
}
