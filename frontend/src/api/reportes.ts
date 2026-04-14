import { apiClient } from "./client";

export interface KPIs {
  citas: {
    total: number;
    por_estado: Record<string, number>;
    asistencia: number;
    faltas: number;
  };
  pacientes_nuevos: number;
  facturacion: {
    num_facturas: number;
    total_facturado: number;
    total_cobrado: number;
    pendiente: number;
  };
  tratamientos_realizados: number;
  presupuestos: {
    total: number;
    por_estado: Record<string, number>;
  };
}

export interface MesFacturacion {
  mes: number;
  facturado: number;
  num_facturas: number;
}

export interface TopTratamiento {
  tratamiento: string;
  cantidad: number;
}

export interface CitasDoctor {
  doctor_id?: string | null;
  doctor: string;
  color: string | null;
  total: number;
  atendidas: number;
  faltas: number;
}

export interface PacienteListado {
  id: string;
  num_historial: number;
  nombre: string;
  apellidos: string;
  fecha_nacimiento: string | null;
  activo: boolean;
  total_citas: number;
  saldo_pendiente: number;
}

export interface FaltaListado {
  tipo: string;
  fecha: string;
  paciente_id: string;
  paciente: string;
  num_historial: number;
}

function fmt(d: Date): string {
  return d.toISOString().split("T")[0];
}

export async function getKPIs(desde: Date, hasta: Date): Promise<KPIs> {
  const { data } = await apiClient.get<KPIs>(
    `/reportes/kpis?fecha_desde=${fmt(desde)}&fecha_hasta=${fmt(hasta)}`
  );
  return data;
}

export async function getFacturacionMensual(anno: number): Promise<MesFacturacion[]> {
  const { data } = await apiClient.get<MesFacturacion[]>(
    `/reportes/facturacion-mensual?anno=${anno}`
  );
  return data;
}

export async function getTopTratamientos(desde: Date, hasta: Date, limit = 10): Promise<TopTratamiento[]> {
  const { data } = await apiClient.get<TopTratamiento[]>(
    `/reportes/top-tratamientos?fecha_desde=${fmt(desde)}&fecha_hasta=${fmt(hasta)}&limit=${limit}`
  );
  return data;
}

export async function getCitasPorDoctor(desde: Date, hasta: Date): Promise<CitasDoctor[]> {
  const { data } = await apiClient.get<CitasDoctor[]>(
    `/reportes/citas-por-doctor?fecha_desde=${fmt(desde)}&fecha_hasta=${fmt(hasta)}`
  );
  return data;
}

export async function getListadoPacientes(soloActivos = true, limit = 100, offset = 0): Promise<PacienteListado[]> {
  const { data } = await apiClient.get<PacienteListado[]>(
    `/reportes/pacientes?solo_activos=${soloActivos}&limit=${limit}&offset=${offset}`
  );
  return data;
}

export async function getListadoFaltas(desde: Date, hasta: Date): Promise<FaltaListado[]> {
  const { data } = await apiClient.get<FaltaListado[]>(
    `/reportes/faltas?fecha_desde=${fmt(desde)}&fecha_hasta=${fmt(hasta)}`
  );
  return data;
}
