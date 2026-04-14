import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  getCitas,
  crearCita,
  actualizarCita,
  anularCita,
  buscarHuecos,
  getTelefonearPendientes,
  type CitaCreate,
  type CitaUpdate,
  type BuscarHuecoRequest,
} from "../api/citas";

export function useCitas(params: {
  doctor_id?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  incluirAnuladas?: boolean;
}) {
  const { incluirAnuladas = false, ...apiParams } = params;
  return useQuery({
    queryKey: ["citas", params],
    queryFn: () => getCitas(apiParams),
    staleTime: 30_000,
    select: (data) => {
      const arr = Array.isArray(data) ? data : [];
      return incluirAnuladas ? arr : arr.filter((c) => c.estado !== "anulada");
    },
  });
}

export function useTelefonearPendientes(doctorId?: string) {
  return useQuery({
    queryKey: ["telefonear", doctorId],
    queryFn: () => getTelefonearPendientes(doctorId),
    staleTime: 15_000,
    select: (data) => (Array.isArray(data) ? data : []),
  });
}

export function useCrearCita() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CitaCreate) => crearCita(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["citas"] });
      toast.success("Cita creada");
    },
    onError: () => toast.error("Error al crear la cita"),
  });
}

export function useActualizarCita() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CitaUpdate }) =>
      actualizarCita(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["citas"] });
      toast.success("Cita actualizada");
    },
    onError: () => toast.error("Error al guardar la cita"),
  });
}

export function useAnularCita() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => anularCita(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["citas"] });
      toast.success("Cita anulada");
    },
    onError: () => toast.error("Error al anular la cita"),
  });
}

export function useBuscarHuecos(req: BuscarHuecoRequest | null) {
  return useQuery({
    queryKey: ["huecos", req],
    queryFn: () => buscarHuecos(req!),
    enabled: req !== null,
    staleTime: 10_000,
  });
}
