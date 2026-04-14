/**
 * Interactive SVG odontogram.
 * Layout FDI in frontal patient view:
 * Upper: [18->11 | 21->28]
 * Lower: [48->41 | 31->38]
 */
import { useId, useState } from "react";
import { DIENTES, type Cara, CARAS, CARA_LABEL } from "./dientes";

const TOOTH_W = 58;
const TOOTH_H = 96;
const GAP = 12;
const STEP = TOOTH_W + GAP;
const MID_GAP = 34;
const PADDING_X = 34;
const TOP_MARGIN = 48;
const TOP_ROW_Y = 68;
const BOTTOM_ROW_Y = 274;
const NUMBER_OFFSET = 20;
const CARD_W = 16 * STEP + MID_GAP + PADDING_X * 2;
const CARD_H = 426;
const CENTER_X = PADDING_X + 8 * STEP + MID_GAP / 2;
const ARCH_OFFSETS = [2, 8, 14, 20, 16, 10, 6, 4];

type RegionKey = "M" | "D" | "O" | "V" | "INNER";

interface ToothSpec {
  outline: string;
  regions: Record<RegionKey, string>;
}

const TOOTH_SPECS: Record<string, ToothSpec> = {
  incisivo: {
    outline:
      "M29 6 C17 6 9 14 9 28 C9 40 14 54 18 66 C20 73 24 82 29 90 C34 82 38 73 40 66 C44 54 49 40 49 28 C49 14 41 6 29 6 Z",
    regions: {
      INNER: "M18 13 L40 13 L37 29 L21 29 Z",
      M: "M12 24 L26 28 L24 64 L16 74 L12 56 Z",
      O: "M21 30 L37 30 L40 48 L29 61 L18 48 Z",
      D: "M46 24 L32 28 L34 64 L42 74 L46 56 Z",
      V: "M18 60 L40 60 L36 83 L22 83 Z",
    },
  },
  canino: {
    outline:
      "M29 4 C18 6 11 15 12 28 C13 42 18 56 21 67 C23 75 26 83 29 92 C32 83 35 75 37 67 C40 56 45 42 46 28 C47 15 40 6 29 4 Z",
    regions: {
      INNER: "M19 13 L39 13 L35 29 L23 29 Z",
      M: "M13 24 L25 28 L25 63 L18 74 L14 54 Z",
      O: "M22 31 L36 31 L38 47 L29 58 L20 47 Z",
      D: "M45 24 L33 28 L33 63 L40 74 L44 54 Z",
      V: "M20 60 L38 60 L35 84 L23 84 Z",
    },
  },
  premolar: {
    outline:
      "M29 6 C16 6 8 14 7 28 C7 43 13 57 18 68 C21 76 24 84 29 92 C34 84 37 76 40 68 C45 57 51 43 51 28 C50 14 42 6 29 6 Z",
    regions: {
      INNER: "M16 15 L42 15 L38 31 L20 31 Z",
      M: "M10 26 L24 30 L24 64 L16 76 L11 56 Z",
      O: "M20 31 L38 31 L41 49 L29 63 L17 49 Z",
      D: "M48 26 L34 30 L34 64 L42 76 L47 56 Z",
      V: "M17 62 L41 62 L38 85 L20 85 Z",
    },
  },
  molar: {
    outline:
      "M29 6 C13 6 4 15 5 29 C6 41 11 53 16 64 C20 73 24 82 29 91 C34 82 38 73 42 64 C47 53 52 41 53 29 C54 15 45 6 29 6 Z",
    regions: {
      INNER: "M14 15 L44 15 L40 32 L18 32 Z",
      M: "M8 26 L22 30 L22 65 L15 78 L9 58 Z",
      O: "M18 31 L40 31 L43 51 L29 66 L15 51 Z",
      D: "M50 26 L36 30 L36 65 L43 78 L49 58 Z",
      V: "M16 64 L42 64 L39 86 L19 86 Z",
    },
  },
};

function hexToRgba(hex: string, alpha: number): string {
  const value = hex.replace("#", "");
  if (value.length !== 6) return hex;
  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function toothX(fdi: number): number {
  const q = Math.floor(fdi / 10);
  const n = (fdi % 10) - 1;

  if (q === 1 || q === 4) {
    return CENTER_X - (n + 1) * STEP;
  }
  return CENTER_X + n * STEP;
}

function toothY(fdi: number, numberRow = false): number {
  const q = Math.floor(fdi / 10);
  const n = (fdi % 10) - 1;
  const archOffset = ARCH_OFFSETS[n] ?? 0;
  const y = q === 1 || q === 2 ? TOP_ROW_Y + archOffset : BOTTOM_ROW_Y - archOffset;
  return numberRow ? y + TOOTH_H + NUMBER_OFFSET : y;
}

function isMesialOnLeft(fdi: number): boolean {
  const q = Math.floor(fdi / 10);
  return q === 2 || q === 3;
}

function faceMatches(marcaCaras: string, faceKeys: string[]): boolean {
  if (!marcaCaras) return true;
  return faceKeys.some((key) => marcaCaras.includes(key));
}

function resolveFaceColor(
  marcas: TratamientoMarca[],
  faceKeys: string[],
): string | null {
  for (let index = marcas.length - 1; index >= 0; index -= 1) {
    const marca = marcas[index];
    if (faceMatches(marca.caras, faceKeys)) {
      return marca.color;
    }
  }
  return null;
}

function toothSpec(tipo: string): ToothSpec {
  return TOOTH_SPECS[tipo] ?? TOOTH_SPECS.premolar;
}

function surfacePath(
  spec: ToothSpec,
  region: RegionKey,
  mesialOnLeft: boolean,
): string {
  if (region === "M") {
    return mesialOnLeft ? spec.regions.M : spec.regions.D;
  }
  if (region === "D") {
    return mesialOnLeft ? spec.regions.D : spec.regions.M;
  }
  return spec.regions[region];
}

export interface TratamientoMarca {
  fdi: number;
  caras: string;
  color: string;
  label: string;
}

interface Props {
  marcas?: TratamientoMarca[];
  seleccionado?: number | null;
  onSelect?: (fdi: number) => void;
  readonly?: boolean;
}

export default function Odontograma({
  marcas = [],
  seleccionado,
  onSelect,
  readonly = false,
}: Props) {
  const [hovered, setHovered] = useState<number | null>(null);
  const idPrefix = useId().replace(/:/g, "");

  const marcasPorFdi = new Map<number, TratamientoMarca[]>();
  for (const marca of marcas) {
    if (!marcasPorFdi.has(marca.fdi)) marcasPorFdi.set(marca.fdi, []);
    marcasPorFdi.get(marca.fdi)?.push(marca);
  }

  return (
    <div className="w-full overflow-x-auto pb-2">
      <div className="min-w-[900px] rounded-[28px] border border-slate-200/80 bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_35%,#fbfdff_100%)] p-4 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3 px-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
              Vista dental
            </p>
            <p className="text-sm text-slate-600">
              Arcadas ampliadas con piezas anatomicas y lectura visual por caras.
            </p>
          </div>
        </div>

        <svg
          viewBox={`0 0 ${CARD_W} ${CARD_H}`}
          width="100%"
          className="select-none"
          style={{ minWidth: 860 }}
        >
          <defs>
            <linearGradient id={`${idPrefix}-shell`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="100%" stopColor="#eef4ff" />
            </linearGradient>
            <linearGradient id={`${idPrefix}-highlight`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.92)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>
          </defs>

          <path
            d={`M ${PADDING_X} ${TOP_MARGIN + 46} Q ${CARD_W / 2} 6 ${CARD_W - PADDING_X} ${TOP_MARGIN + 46}`}
            fill="none"
            stroke="#d9e5f5"
            strokeWidth="2"
            strokeDasharray="5 8"
          />
          <path
            d={`M ${PADDING_X} ${BOTTOM_ROW_Y + 114} Q ${CARD_W / 2} ${CARD_H - 4} ${CARD_W - PADDING_X} ${BOTTOM_ROW_Y + 114}`}
            fill="none"
            stroke="#d9e5f5"
            strokeWidth="2"
            strokeDasharray="5 8"
          />
          <line
            x1={CENTER_X}
            y1={22}
            x2={CENTER_X}
            y2={CARD_H - 24}
            stroke="#d7e3f3"
            strokeWidth="1.5"
            strokeDasharray="4 6"
          />

          <text x={PADDING_X} y={28} fontSize="12" fontWeight="700" fill="#475569">
            Arcada superior
          </text>
          <text x={PADDING_X} y={CARD_H - 14} fontSize="12" fontWeight="700" fill="#475569">
            Arcada inferior
          </text>
          <text x={CENTER_X} y={18} fontSize="11" textAnchor="middle" fill="#94a3b8">
            Linea media
          </text>

          {DIENTES.map((diente) => {
            const x = toothX(diente.fdi);
            const y = toothY(diente.fdi);
            const labelY = toothY(diente.fdi, true);
            const spec = toothSpec(diente.tipo);
            const dMarcas = marcasPorFdi.get(diente.fdi) ?? [];
            const firstColor = dMarcas[0]?.color ?? "#3b82f6";
            const selected = seleccionado === diente.fdi;
            const hoveredTooth = hovered === diente.fdi;
            const mesialLeft = isMesialOnLeft(diente.fdi);
            const clipId = `${idPrefix}-clip-${diente.fdi}`;
            const hasMarca = dMarcas.length > 0;
            const allLabels = dMarcas.map((marca) => marca.label).join(", ");

            const baseFill = selected
              ? "#dbeafe"
              : hasMarca
              ? hexToRgba(firstColor, 0.14)
              : hoveredTooth
              ? "#f8fafc"
              : `url(#${idPrefix}-shell)`;
            const strokeColor = selected ? "#0f172a" : hasMarca ? firstColor : "#94a3b8";
            const innerFaceKeys = diente.arcada === "superior" ? ["P", "L"] : ["L", "P"];
            const faceColors = {
              INNER: resolveFaceColor(dMarcas, innerFaceKeys),
              M: resolveFaceColor(dMarcas, ["M"]),
              O: resolveFaceColor(dMarcas, ["O", "I"]),
              D: resolveFaceColor(dMarcas, ["D"]),
              V: resolveFaceColor(dMarcas, ["V", "B"]),
            };
            const surfaceEntries: RegionKey[] = ["INNER", "M", "O", "D", "V"];
            const toothTransform =
              diente.arcada === "inferior"
                ? `translate(${x}, ${y + TOOTH_H}) scale(1 -1)`
                : `translate(${x}, ${y})`;

            return (
              <g
                key={diente.fdi}
                onClick={() => !readonly && onSelect?.(diente.fdi)}
                onMouseEnter={() => setHovered(diente.fdi)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: readonly ? "default" : "pointer" }}
              >
                <g transform={toothTransform}>
                  <defs>
                    <clipPath id={clipId}>
                      <path d={spec.outline} />
                    </clipPath>
                  </defs>

                  <path
                    d={spec.outline}
                    fill={baseFill}
                    stroke={strokeColor}
                    strokeWidth={selected ? 2.5 : 1.65}
                    strokeLinejoin="round"
                  />

                  {surfaceEntries.map((region) => {
                    const regionColor = faceColors[region];
                    if (!regionColor) return null;
                    return (
                      <path
                        key={region}
                        d={surfacePath(spec, region, mesialLeft)}
                        clipPath={`url(#${clipId})`}
                        fill={hexToRgba(regionColor, region === "O" ? 0.88 : 0.74)}
                        stroke={hexToRgba(regionColor, 0.95)}
                        strokeWidth={region === "O" ? 1.4 : 1.15}
                        strokeLinejoin="round"
                      />
                    );
                  })}

                  <path
                    d={spec.outline}
                    clipPath={`url(#${clipId})`}
                    fill={`url(#${idPrefix}-highlight)`}
                    opacity={hoveredTooth || selected ? 0.8 : 0.55}
                  />

                  <path
                    d={surfacePath(spec, "INNER", mesialLeft)}
                    fill="none"
                    stroke={hexToRgba(selected ? "#0f172a" : "#cbd5e1", 0.72)}
                    strokeWidth="1"
                    strokeLinejoin="round"
                  />
                </g>

                {hasMarca && (
                  <g transform={`translate(${x + TOOTH_W - 10}, ${y + 4})`}>
                    <circle r="8" fill="#ffffff" stroke={hexToRgba(firstColor, 0.3)} />
                    <circle r="4.5" fill={firstColor} />
                  </g>
                )}

                <text
                  x={x + TOOTH_W / 2}
                  y={labelY}
                  fontSize={selected ? 13 : 12}
                  textAnchor="middle"
                  fill={selected ? "#0f172a" : "#64748b"}
                  fontWeight={selected ? "700" : "600"}
                >
                  {diente.fdi}
                </text>

                <title>{`${diente.fdi} - ${diente.nombre}${hasMarca ? `\n${allLabels}` : ""}`}</title>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

interface SelectorCarasProps {
  seleccionadas: Cara[];
  onChange: (caras: Cara[]) => void;
}

export function SelectorCaras({ seleccionadas, onChange }: SelectorCarasProps) {
  function toggle(cara: Cara) {
    onChange(
      seleccionadas.includes(cara)
        ? seleccionadas.filter((current) => current !== cara)
        : [...seleccionadas, cara],
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {CARAS.map((cara) => (
        <button
          key={cara}
          type="button"
          onClick={() => toggle(cara)}
          className={`h-9 w-9 rounded-xl border text-xs font-bold transition-all ${
            seleccionadas.includes(cara)
              ? "border-slate-900 bg-slate-900 text-white shadow-sm"
              : "border-slate-300 bg-white text-slate-600 hover:border-sky-500 hover:text-sky-600"
          }`}
          title={CARA_LABEL[cara]}
        >
          {cara}
        </button>
      ))}
    </div>
  );
}
