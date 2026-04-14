import { useQuery } from "@tanstack/react-query";
import { getDoctores } from "../api/doctores";

export function useDoctores(soloActivos = true) {
  return useQuery({
    queryKey: ["doctores", soloActivos],
    queryFn: () => getDoctores(soloActivos),
    staleTime: 60_000,
    select: (data) => (Array.isArray(data) ? data : []),
  });
}
