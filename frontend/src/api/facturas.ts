import { apiClient } from "./client";
import type { Factura, FormaPago } from "../types";

export interface FacturaLineaCreate {
  historial_id?: string;
  concepto: string;
  concepto_ficticio?: string;
  cantidad?: number;
  precio_unitario: number;
  iva_porcentaje?: number;
}

export interface FacturaCreate {
  paciente_id: string;
  entidad_id?: string;
  serie?: string;
  fecha: string;
  tipo?: "paciente" | "iguala" | "entidad";
  forma_pago_id?: string;
  observaciones?: string;
  lineas?: FacturaLineaCreate[];
}

export interface FacturaUpdate {
  estado?: "emitida" | "cobrada" | "parcial" | "anulada";
  forma_pago_id?: string;
  observaciones?: string;
}

export interface FacturaFiltros {
  paciente_id?: string;
  estado?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  serie?: string;
  limit?: number;
  offset?: number;
}

export interface CobroCreate {
  importe: number;
  forma_pago_id: string;
  notas?: string;
}

export interface HistorialSinFacturar {
  id: string;
  fecha: string;
  pieza_dental: number | null;
  caras: string | null;
  observaciones: string | null;
  tratamiento_id: string;
  tratamiento_nombre: string;
  tratamiento_precio: number;
  tratamiento_iva: number;
  doctor_id: string;
  doctor_nombre: string;
}

// ─── Historial sin facturar ───────────────────────────────────────────────────

export async function getHistorialSinFacturar(pacienteId: string): Promise<HistorialSinFacturar[]> {
  const { data } = await apiClient.get<HistorialSinFacturar[]>(
    `/facturas/historial-sin-facturar?paciente_id=${pacienteId}`
  );
  return data;
}

// ─── Formas de pago ───────────────────────────────────────────────────────────

export async function getFormasPago(): Promise<FormaPago[]> {
  const { data } = await apiClient.get<FormaPago[]>("/facturas/formas-pago");
  return data;
}

export async function crearFormaPago(nombre: string): Promise<FormaPago> {
  const { data } = await apiClient.post<FormaPago>("/facturas/formas-pago", { nombre });
  return data;
}

// ─── Facturas ─────────────────────────────────────────────────────────────────

export async function getFacturas(filtros: FacturaFiltros = {}): Promise<Factura[]> {
  const params = new URLSearchParams();
  if (filtros.paciente_id) params.set("paciente_id", filtros.paciente_id);
  if (filtros.estado) params.set("estado", filtros.estado);
  if (filtros.fecha_desde) params.set("fecha_desde", filtros.fecha_desde);
  if (filtros.fecha_hasta) params.set("fecha_hasta", filtros.fecha_hasta);
  if (filtros.serie) params.set("serie", filtros.serie);
  if (filtros.limit) params.set("limit", String(filtros.limit));
  if (filtros.offset) params.set("offset", String(filtros.offset));
  const { data } = await apiClient.get<Factura[]>(`/facturas?${params}`);
  return data;
}

export async function getFactura(id: string): Promise<Factura> {
  const { data } = await apiClient.get<Factura>(`/facturas/${id}`);
  return data;
}

export async function crearFactura(payload: FacturaCreate): Promise<Factura> {
  const { data } = await apiClient.post<Factura>("/facturas", payload);
  return data;
}

export async function actualizarFactura(id: string, payload: FacturaUpdate): Promise<Factura> {
  const { data } = await apiClient.patch<Factura>(`/facturas/${id}`, payload);
  return data;
}

export async function anularFactura(id: string): Promise<void> {
  await apiClient.delete(`/facturas/${id}`);
}

// ─── Líneas ───────────────────────────────────────────────────────────────────

export async function añadirLinea(facturaId: string, linea: FacturaLineaCreate): Promise<Factura> {
  const { data } = await apiClient.post<Factura>(`/facturas/${facturaId}/lineas`, linea);
  return data;
}

export async function eliminarLinea(facturaId: string, lineaId: string): Promise<void> {
  await apiClient.delete(`/facturas/${facturaId}/lineas/${lineaId}`);
}

// ─── Cobros ───────────────────────────────────────────────────────────────────

export async function registrarCobro(facturaId: string, cobro: CobroCreate): Promise<Factura> {
  const { data } = await apiClient.post<Factura>(`/facturas/${facturaId}/cobros`, cobro);
  return data;
}

export async function anularCobro(facturaId: string, cobroId: string): Promise<void> {
  await apiClient.delete(`/facturas/${facturaId}/cobros/${cobroId}`);
}

// ─── PDF ──────────────────────────────────────────────────────────────────────

/** Descarga el PDF de una factura abriendo una nueva pestaña. */
export function abrirPdfFactura(facturaId: string): void {
  window.open(`/api/pdf/facturas/${facturaId}`, "_blank");
}

/** Descarga el PDF de un presupuesto abriendo una nueva pestaña. */
export function abrirPdfPresupuesto(presupuestoId: string): void {
  window.open(`/api/pdf/presupuestos/${presupuestoId}`, "_blank");
}
