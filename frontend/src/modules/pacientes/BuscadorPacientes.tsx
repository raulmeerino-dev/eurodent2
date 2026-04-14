/**
 * BuscadorPacientes — Barra de búsqueda global con resultados en dropdown.
 * Se usa tanto en la cabecera global como en la página de pacientes.
 */
import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { listarPacientes } from "../../api/pacientes";
import type { Paciente } from "../../types";
import { calcularEdad } from "../../utils";

interface Props {
  onSelect: (paciente: Paciente) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export default function BuscadorPacientes({
  onSelect,
  placeholder = "Buscar paciente...",
  autoFocus = false,
}: Props) {
  const [query, setQuery] = useState("");
  const [abierto, setAbierto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data: resultados = [] } = useQuery({
    queryKey: ["pacientes-search", query],
    queryFn: () => listarPacientes({ q: query, limit: 15 }),
    enabled: query.length >= 2,
    staleTime: 5_000,
    select: (d) => (Array.isArray(d) ? d : []),
  });

  // Cerrar al hacer click fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative w-full">
      <input
        type="text"
        value={query}
        autoFocus={autoFocus}
        placeholder={placeholder}
        onChange={(e) => {
          setQuery(e.target.value);
          setAbierto(true);
        }}
        onFocus={() => setAbierto(true)}
        className="w-full rounded-[18px] border border-slate-200/80 bg-white/85 px-4 py-3 text-sm text-slate-800 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.45)] outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-100"
      />

      {abierto && query.length >= 2 && Array.isArray(resultados) && resultados.length > 0 && (
        <ul className="absolute z-50 mt-2 max-h-72 w-full overflow-y-auto rounded-[20px] border border-slate-200/80 bg-white/95 p-1.5 shadow-[0_26px_60px_-32px_rgba(15,23,42,0.4)] backdrop-blur">
          {resultados.map((p) => (
            <li
              key={p.id}
              className="cursor-pointer rounded-[16px] border border-transparent px-3 py-3 transition hover:border-cyan-100 hover:bg-cyan-50/80"
              onMouseDown={() => {
                onSelect(p);
                setQuery("");
                setAbierto(false);
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-slate-900">
                    {p.apellidos}, {p.nombre}
                  </span>
                  {p.fecha_nacimiento && (
                    <span className="ml-2 text-xs text-slate-400">
                      {calcularEdad(p.fecha_nacimiento)} años
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500">Hx{p.num_historial}</span>
                  {p.telefono && (
                    <p className="text-xs text-slate-400">{p.telefono}</p>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {abierto && query.length >= 2 && Array.isArray(resultados) && resultados.length === 0 && (
        <div className="absolute z-50 mt-2 w-full rounded-[20px] border border-slate-200/80 bg-white/95 px-4 py-4 text-sm text-slate-500 shadow-[0_26px_60px_-32px_rgba(15,23,42,0.4)] backdrop-blur">
          Sin resultados para "{query}"
        </div>
      )}
    </div>
  );
}
