import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  getFacturas,
  getFactura,
  crearFactura,
  actualizarFactura,
  anularFactura,
  añadirLinea,
  eliminarLinea,
  registrarCobro,
  anularCobro,
  getFormasPago,
  type FacturaFiltros,
  type FacturaCreate,
  type FacturaUpdate,
  type FacturaLineaCreate,
  type CobroCreate,
} from "../api/facturas";

export function useFacturas(filtros: FacturaFiltros = {}) {
  return useQuery({
    queryKey: ["facturas", filtros],
    queryFn: () => getFacturas(filtros),
    select: (data) => (Array.isArray(data) ? data : []),
  });
}

export function useFactura(id: string | undefined) {
  return useQuery({
    queryKey: ["facturas", id],
    queryFn: () => getFactura(id!),
    enabled: !!id,
  });
}

export function useFormasPago() {
  return useQuery({
    queryKey: ["formas-pago"],
    queryFn: getFormasPago,
    staleTime: 5 * 60 * 1000,
    select: (data) => (Array.isArray(data) ? data : []),
  });
}

export function useCrearFactura() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: FacturaCreate) => crearFactura(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["facturas"] });
      toast.success("Factura creada");
    },
    onError: () => toast.error("Error al crear la factura"),
  });
}

export function useActualizarFactura() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: FacturaUpdate }) =>
      actualizarFactura(id, data),
    onSuccess: (factura) => {
      qc.invalidateQueries({ queryKey: ["facturas"] });
      qc.setQueryData(["facturas", factura.id], factura);
    },
    onError: () => toast.error("Error al actualizar la factura"),
  });
}

export function useAnularFactura() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => anularFactura(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["facturas"] });
      toast.success("Factura anulada");
    },
    onError: () => toast.error("Error al anular la factura"),
  });
}

export function useAñadirLineaFactura() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ facturaId, linea }: { facturaId: string; linea: FacturaLineaCreate }) =>
      añadirLinea(facturaId, linea),
    onSuccess: (factura) => {
      qc.setQueryData(["facturas", factura.id], factura);
      qc.invalidateQueries({ queryKey: ["facturas"] });
    },
    onError: () => toast.error("Error al añadir línea"),
  });
}

export function useEliminarLineaFactura() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ facturaId, lineaId }: { facturaId: string; lineaId: string }) =>
      eliminarLinea(facturaId, lineaId),
    onSuccess: (_v, { facturaId }) => {
      qc.invalidateQueries({ queryKey: ["facturas", facturaId] });
    },
    onError: () => toast.error("Error al eliminar línea"),
  });
}

export function useRegistrarCobro() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ facturaId, cobro }: { facturaId: string; cobro: CobroCreate }) =>
      registrarCobro(facturaId, cobro),
    onSuccess: (factura) => {
      qc.setQueryData(["facturas", factura.id], factura);
      qc.invalidateQueries({ queryKey: ["facturas"] });
      toast.success("Cobro registrado");
    },
    onError: () => toast.error("Error al registrar cobro"),
  });
}

export function useAnularCobro() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ facturaId, cobroId }: { facturaId: string; cobroId: string }) =>
      anularCobro(facturaId, cobroId),
    onSuccess: (_v, { facturaId }) => {
      qc.invalidateQueries({ queryKey: ["facturas", facturaId] });
      qc.invalidateQueries({ queryKey: ["facturas"] });
      toast.success("Cobro anulado");
    },
    onError: () => toast.error("Error al anular cobro"),
  });
}
