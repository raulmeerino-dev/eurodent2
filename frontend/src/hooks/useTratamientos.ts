import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  getFamilias,
  getTratamientos,
  getHistorialPaciente,
  registrarTratamiento,
  eliminarEntradaHistorial,
  type HistorialCreate,
} from "../api/tratamientos";

export function useFamilias() {
  return useQuery({
    queryKey: ["familias"],
    queryFn: getFamilias,
    staleTime: 120_000,
    select: (data) => (Array.isArray(data) ? data : []),
  });
}

export function useTratamientos(params?: { familia_id?: string; q?: string }) {
  return useQuery({
    queryKey: ["tratamientos", params],
    queryFn: () => getTratamientos(params),
    staleTime: 120_000,
    select: (data) => (Array.isArray(data) ? data : []),
  });
}

export function useHistorialPaciente(pacienteId: string | null, pieza?: number) {
  return useQuery({
    queryKey: ["historial", pacienteId, pieza],
    queryFn: () => getHistorialPaciente(pacienteId!, pieza),
    enabled: pacienteId !== null,
    staleTime: 30_000,
    select: (data) => (Array.isArray(data) ? data : []),
  });
}

export function useRegistrarTratamiento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: HistorialCreate) => registrarTratamiento(data),
    onSuccess: (_res, data) => {
      qc.invalidateQueries({ queryKey: ["historial", data.paciente_id] });
      toast.success("Tratamiento registrado");
    },
    onError: () => toast.error("Error al registrar el tratamiento"),
  });
}

export function useEliminarEntradaHistorial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => eliminarEntradaHistorial(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["historial"] });
      toast.success("Entrada eliminada");
    },
    onError: () => toast.error("Error al eliminar la entrada"),
  });
}
