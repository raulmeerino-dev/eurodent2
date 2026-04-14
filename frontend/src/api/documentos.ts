import { apiClient } from "./client";

export type CategoriaDocumento =
  | "historia_medica"
  | "radiografia"
  | "implante"
  | "consentimiento"
  | "presupuesto"
  | "otro";

export interface DocumentoPaciente {
  id: string;
  paciente_id: string;
  nombre_original: string;
  mime_type: string;
  tamano_bytes: number;
  categoria: CategoriaDocumento;
  descripcion: string | null;
  created_at: string;
}

export async function getDocumentos(
  pacienteId: string,
  categoria?: CategoriaDocumento,
): Promise<DocumentoPaciente[]> {
  const params: Record<string, string> = {};
  if (categoria) params.categoria = categoria;
  const r = await apiClient.get(`/pacientes/${pacienteId}/documentos`, { params });
  return Array.isArray(r.data) ? r.data : [];
}

export async function subirDocumento(
  pacienteId: string,
  archivo: File,
  categoria: CategoriaDocumento,
  descripcion?: string,
): Promise<DocumentoPaciente> {
  const fd = new FormData();
  fd.append("archivo", archivo);
  fd.append("categoria", categoria);
  if (descripcion) fd.append("descripcion", descripcion);
  const r = await apiClient.post(`/pacientes/${pacienteId}/documentos`, fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return r.data;
}

/** Descarga via Blob para mantener el header JWT (no link directo). */
export async function descargarDocumento(
  pacienteId: string,
  docId: string,
  nombreOriginal: string,
): Promise<void> {
  const r = await apiClient.get(
    `/pacientes/${pacienteId}/documentos/${docId}/descargar`,
    { responseType: "blob" },
  );
  const url = URL.createObjectURL(r.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreOriginal;
  a.click();
  URL.revokeObjectURL(url);
}

/** Abre el archivo en nueva pestaña (PDF/imágenes). */
export async function verDocumento(
  pacienteId: string,
  docId: string,
): Promise<void> {
  const r = await apiClient.get(
    `/pacientes/${pacienteId}/documentos/${docId}/descargar`,
    { responseType: "blob" },
  );
  const url = URL.createObjectURL(r.data);
  window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function eliminarDocumento(pacienteId: string, docId: string): Promise<void> {
  await apiClient.delete(`/pacientes/${pacienteId}/documentos/${docId}`);
}
