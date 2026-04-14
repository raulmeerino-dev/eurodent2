import { apiClient } from "./client";

export interface PresupuestoLineaCreate {
  tratamiento_id: string;
  pieza_dental?: number;
  caras?: string;
  precio_unitario: number;
  descuento_porcentaje?: number;
}

export interface PresupuestoLineaUpdate {
  precio_unitario?: number;
  descuento_porcentaje?: number;
  aceptado?: boolean;
  pieza_dental?: number | null;
  caras?: string | null;
}

export interface PresupuestoLinea {
  id: string;
  presupuesto_id: string;
  tratamiento_id: string;
  tratamiento?: { id: string; nombre: string; codigo: string | null };
  pieza_dental: number | null;
  caras: string | null;
  precio_unitario: number;
  descuento_porcentaje: number;
  importe_neto: number;
  aceptado: boolean;
  pasado_trabajo_pendiente: boolean;
}

export interface Presupuesto {
  id: string;
  paciente_id: string;
  numero: number;
  fecha: string;
  estado: string;
  pie_pagina: string | null;
  doctor_id: string;
  paciente?: { id: string; nombre: string; apellidos: string; num_historial: number };
  doctor?: { id: string; nombre: string };
  lineas: PresupuestoLinea[];
  total: number;
  total_aceptado: number;
}

export interface PresupuestoCreate {
  paciente_id: string;
  doctor_id: string;
  fecha: string;
  pie_pagina?: string;
  lineas?: PresupuestoLineaCreate[];
}

export interface TrabajoPendiente {
  id: string;
  paciente_id: string;
  presupuesto_linea_id: string;
  tratamiento_id: string;
  tratamiento?: { id: string; nombre: string; codigo: string | null };
  pieza_dental: number | null;
  caras: string | null;
  realizado: boolean;
  historial_id: string | null;
}

export async function getPresupuestos(params?: {
  paciente_id?: string;
  estado?: string;
  desde?: string;
  hasta?: string;
}): Promise<Presupuesto[]> {
  const { data } = await apiClient.get<Presupuesto[]>("/presupuestos", { params });
  return data;
}

export async function getPresupuesto(id: string): Promise<Presupuesto> {
  const { data } = await apiClient.get<Presupuesto>(`/presupuestos/${id}`);
  return data;
}

export async function crearPresupuesto(payload: PresupuestoCreate): Promise<Presupuesto> {
  const { data } = await apiClient.post<Presupuesto>("/presupuestos", payload);
  return data;
}

export async function actualizarPresupuesto(
  id: string,
  payload: { fecha?: string; estado?: string; pie_pagina?: string; doctor_id?: string },
): Promise<Presupuesto> {
  const { data } = await apiClient.patch<Presupuesto>(`/presupuestos/${id}`, payload);
  return data;
}

export async function eliminarPresupuesto(id: string): Promise<void> {
  await apiClient.delete(`/presupuestos/${id}`);
}

export async function añadirLinea(
  presupuestoId: string,
  payload: PresupuestoLineaCreate,
): Promise<PresupuestoLinea> {
  const { data } = await apiClient.post<PresupuestoLinea>(
    `/presupuestos/${presupuestoId}/lineas`,
    payload,
  );
  return data;
}

export async function actualizarLinea(
  presupuestoId: string,
  lineaId: string,
  payload: PresupuestoLineaUpdate,
): Promise<PresupuestoLinea> {
  const { data } = await apiClient.patch<PresupuestoLinea>(
    `/presupuestos/${presupuestoId}/lineas/${lineaId}`,
    payload,
  );
  return data;
}

export async function eliminarLinea(presupuestoId: string, lineaId: string): Promise<void> {
  await apiClient.delete(`/presupuestos/${presupuestoId}/lineas/${lineaId}`);
}

export async function pasarATrabajosPendientes(presupuestoId: string): Promise<TrabajoPendiente[]> {
  const { data } = await apiClient.post<TrabajoPendiente[]>(
    `/presupuestos/${presupuestoId}/pasar-trabajo-pendiente`,
  );
  return data;
}

export async function getTrabajosPendientes(
  pacienteId: string,
  soloPendiente = true,
): Promise<TrabajoPendiente[]> {
  const { data } = await apiClient.get<TrabajoPendiente[]>(
    `/presupuestos/trabajo-pendiente/${pacienteId}`,
    { params: { solo_pendiente: soloPendiente } },
  );
  return data;
}
