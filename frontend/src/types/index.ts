// Tipos globales TypeScript para Eurodent 2.0

export type Rol = "recepcion" | "doctor" | "admin";

export type EstadoCita =
  | "programada"
  | "confirmada"
  | "en_clinica"
  | "atendida"
  | "falta"
  | "anulada";

export type EstadoPresupuesto =
  | "borrador"
  | "presentado"
  | "aceptado"
  | "rechazado"
  | "parcial";

export type TipoFactura = "paciente" | "iguala" | "entidad";
export type EstadoFactura = "emitida" | "cobrada" | "parcial" | "anulada";

// Auth
export interface Usuario {
  id: string;
  username: string;
  nombre: string;
  rol: Rol;
  doctor_id: string | null;
}

export interface TokenResponse {
  access_token: string;
  refresh_token?: string | null;
  token_type: string;
  expires_in: number;
}

export interface Referencia {
  id: string;
  nombre: string;
  color: string | null;
}

// Paciente (campos sensibles descifrados por el backend, llegan como string)
export interface Paciente {
  id: string;
  codigo: string | null;
  num_historial: number;
  nombre: string;
  apellidos: string;
  fecha_nacimiento: string | null;  // ISO date
  dni_nie?: string | null;
  telefono?: string | null;
  telefono2?: string | null;
  email?: string | null;
  direccion: string | null;
  codigo_postal: string | null;
  ciudad: string | null;
  provincia: string | null;
  entidad_id: string | null;
  entidad_alt_id: string | null;
  no_correo: boolean;
  foto_path: string | null;
  observaciones: string | null;
  datos_salud?: Record<string, string> | null;
  activo: boolean;
  referencias?: Referencia[];
}

// Doctor
export interface Doctor {
  id: string;
  nombre: string;
  especialidad: string | null;
  color_agenda: string | null;
  es_auxiliar: boolean;
  porcentaje: number | null;
  activo: boolean;
}

// Cita
export interface Cita {
  id: string;
  paciente_id: string;
  doctor_id: string;
  gabinete_id: string | null;
  fecha_hora: string;  // ISO datetime
  duracion_min: number;
  estado: EstadoCita;
  es_urgencia: boolean;
  motivo: string | null;
  observaciones: string | null;
  // Datos denormalizados para UI
  paciente?: Pick<Paciente, "id" | "nombre" | "apellidos" | "telefono" | "num_historial">;
  doctor?: Pick<Doctor, "id" | "nombre" | "color_agenda">;
}

// Facturación
export interface FormaPago {
  id: string;
  nombre: string;
  activo: boolean;
}

export interface FacturaLinea {
  id: string;
  factura_id: string;
  historial_id: string | null;
  concepto: string;
  concepto_ficticio: string | null;
  cantidad: number;
  precio_unitario: number;
  iva_porcentaje: number;
  subtotal: number;
}

export interface Cobro {
  id: string;
  factura_id: string;
  fecha: string;
  importe: number;
  forma_pago_id: string;
  forma_pago: FormaPago | null;
  usuario_id: string;
  notas: string | null;
}

export interface Factura {
  id: string;
  paciente_id: string;
  entidad_id: string | null;
  serie: string;
  numero: number;
  fecha: string;
  tipo: TipoFactura;
  subtotal: number;
  iva_total: number;
  total: number;
  total_cobrado: number;
  pendiente: number;
  estado: EstadoFactura;
  forma_pago_id: string | null;
  forma_pago: FormaPago | null;
  observaciones: string | null;
  paciente?: { id: string; nombre: string; apellidos: string; num_historial: number } | null;
  entidad?: { id: string; nombre: string } | null;
  lineas: FacturaLinea[];
  cobros: Cobro[];
}

// Respuesta paginada genérica
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

// Error de API
export interface ApiError {
  detail: string;
  status_code?: number;
}
