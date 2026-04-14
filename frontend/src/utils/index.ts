import { format, parseISO, differenceInYears } from "date-fns";
import { es } from "date-fns/locale";

/** Formatea fecha ISO a string legible: "9 de abril de 2026" */
export function formatFecha(iso: string): string {
  return format(parseISO(iso), "d 'de' MMMM 'de' yyyy", { locale: es });
}

/** Formatea fecha-hora ISO: "09/04/2026 10:30" */
export function formatFechaHora(iso: string): string {
  return format(parseISO(iso), "dd/MM/yyyy HH:mm");
}

/** Calcula edad en años a partir de fecha de nacimiento ISO */
export function calcularEdad(fechaNacimiento: string): number {
  return differenceInYears(new Date(), parseISO(fechaNacimiento));
}

/** Valida formato NIF/NIE español */
export function validarDNI(dni: string): boolean {
  const nifRegex = /^[0-9]{8}[A-Z]$/;
  const nieRegex = /^[XYZ][0-9]{7}[A-Z]$/;
  const upper = dni.toUpperCase().trim();
  return nifRegex.test(upper) || nieRegex.test(upper);
}

/** Formatea número a moneda EUR */
export function formatEUR(importe: number): string {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(importe);
}

/** Color CSS para cada estado de cita */
export const COLORES_ESTADO_CITA: Record<string, string> = {
  programada: "#6B7280",
  confirmada: "#2563EB",
  en_clinica: "#D97706",
  atendida: "#16A34A",
  falta: "#DC2626",
  anulada: "#9CA3AF",
};
