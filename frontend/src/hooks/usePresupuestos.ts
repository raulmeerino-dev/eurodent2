import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  getPresupuestos,
  getPresupuesto,
  crearPresupuesto,
  actualizarPresupuesto,
  eliminarPresupuesto,
  añadirLinea,
  actualizarLinea,
  eliminarLinea,
  pasarATrabajosPendientes,
  getTrabajosPendientes,
  type PresupuestoCreate,
  type PresupuestoLineaCreate,
  type PresupuestoLineaUpdate,
} from "../api/presupuestos";

export function usePresupuestos(params?: { paciente_id?: string; estado?: string }) {
  return useQuery({
    queryKey: ["presupuestos", params],
    queryFn: () => getPresupuestos(params),
    staleTime: 30_000,
    select: (data) => (Array.isArray(data) ? data : []),
  });
}

export function usePresupuesto(id: string | null) {
  return useQuery({
    queryKey: ["presupuesto", id],
    queryFn: () => getPresupuesto(id!),
    enabled: id !== null,
    staleTime: 30_000,
  });
}

export function useCrearPresupuesto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: PresupuestoCreate) => crearPresupuesto(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["presupuestos"] });
      toast.success("Presupuesto creado");
    },
    onError: () => toast.error("Error al crear el presupuesto"),
  });
}

export function useActualizarPresupuesto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof actualizarPresupuesto>[1] }) =>
      actualizarPresupuesto(id, data),
    onSuccess: (_r, { id }) => {
      qc.invalidateQueries({ queryKey: ["presupuestos"] });
      qc.invalidateQueries({ queryKey: ["presupuesto", id] });
      toast.success("Presupuesto guardado");
    },
    onError: () => toast.error("Error al guardar el presupuesto"),
  });
}

export function useEliminarPresupuesto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => eliminarPresupuesto(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["presupuestos"] });
      toast.success("Presupuesto eliminado");
    },
    onError: () => toast.error("Error al eliminar el presupuesto"),
  });
}

export function useAñadirLinea(presupuestoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: PresupuestoLineaCreate) => añadirLinea(presupuestoId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["presupuesto", presupuestoId] }),
    onError: () => toast.error("Error al añadir tratamiento"),
  });
}

export function useActualizarLinea(presupuestoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ lineaId, data }: { lineaId: string; data: PresupuestoLineaUpdate }) =>
      actualizarLinea(presupuestoId, lineaId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["presupuesto", presupuestoId] }),
    onError: () => toast.error("Error al actualizar línea"),
  });
}

export function useEliminarLinea(presupuestoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (lineaId: string) => eliminarLinea(presupuestoId, lineaId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["presupuesto", presupuestoId] }),
    onError: () => toast.error("Error al eliminar línea"),
  });
}

export function usePasarTrabajosPendientes(presupuestoId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => pasarATrabajosPendientes(presupuestoId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["presupuesto", presupuestoId] });
      toast.success("Trabajos pasados a pendientes");
    },
    onError: () => toast.error("Error al pasar trabajos"),
  });
}

export function useTrabajosPendientes(pacienteId: string | null) {
  return useQuery({
    queryKey: ["trabajos-pendientes", pacienteId],
    queryFn: () => getTrabajosPendientes(pacienteId!),
    enabled: pacienteId !== null,
    staleTime: 30_000,
    select: (data) => (Array.isArray(data) ? data : []),
  });
}
