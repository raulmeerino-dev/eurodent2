import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  listarPacientes,
  getPaciente,
  crearPaciente,
  actualizarPaciente,
  getReferenciasCatalogo,
  asignarReferencias,
  type PacienteCreate,
  type PacienteUpdate,
} from "../api/pacientes";

export function usePacientes(params?: { q?: string; solo_activos?: boolean; limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ["pacientes", params],
    queryFn: () => listarPacientes(params),
    staleTime: 30_000,
    select: (data) => (Array.isArray(data) ? data : []),
  });
}

export function usePaciente(id: string | null) {
  return useQuery({
    queryKey: ["paciente", id],
    queryFn: () => getPaciente(id!),
    enabled: id !== null,
    staleTime: 30_000,
  });
}

export function useCrearPaciente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: PacienteCreate) => crearPaciente(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pacientes"] });
      toast.success("Paciente creado");
    },
    onError: () => toast.error("Error al crear el paciente"),
  });
}

export function useActualizarPaciente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: PacienteUpdate }) =>
      actualizarPaciente(id, data),
    onSuccess: (_res, { id }) => {
      qc.invalidateQueries({ queryKey: ["pacientes"] });
      qc.invalidateQueries({ queryKey: ["paciente", id] });
      toast.success("Paciente guardado");
    },
    onError: () => toast.error("Error al guardar el paciente"),
  });
}

export function useReferenciasCatalogo() {
  return useQuery({
    queryKey: ["referencias-catalogo"],
    queryFn: getReferenciasCatalogo,
    staleTime: 120_000,
    select: (data) => (Array.isArray(data) ? data : []),
  });
}

export function useAsignarReferencias() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ pacienteId, ids }: { pacienteId: string; ids: string[] }) =>
      asignarReferencias(pacienteId, ids),
    onSuccess: (_res, { pacienteId }) =>
      qc.invalidateQueries({ queryKey: ["paciente", pacienteId] }),
  });
}
