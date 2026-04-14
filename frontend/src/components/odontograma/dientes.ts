/**
 * Definición de las 32 piezas dentales adulto en notación FDI.
 * Cuadrante 1: 11-18 (superior derecho del paciente → izquierda en pantalla)
 * Cuadrante 2: 21-28 (superior izquierdo del paciente → derecha)
 * Cuadrante 3: 31-38 (inferior izquierdo del paciente → derecha)
 * Cuadrante 4: 41-48 (inferior derecho del paciente → izquierda)
 *
 * Layout en pantalla (vista frontal del paciente):
 *   [18 17 16 15 14 13 12 11] [21 22 23 24 25 26 27 28]
 *   [48 47 46 45 44 43 42 41] [31 32 33 34 35 36 37 38]
 */

export interface Diente {
  fdi: number;
  nombre: string;
  arcada: "superior" | "inferior";
  lado: "derecho" | "izquierdo"; // lado del PACIENTE
  tipo: "incisivo" | "canino" | "premolar" | "molar";
  /** Posición X en el SVG (0 = centro) */
  col: number;
}

const NOMBRES: Record<string, string> = {
  incisivo_central: "Incisivo central",
  incisivo_lateral: "Incisivo lateral",
  canino: "Canino",
  primer_premolar: "1er premolar",
  segundo_premolar: "2º premolar",
  primer_molar: "1er molar",
  segundo_molar: "2º molar",
  tercer_molar: "Muela del juicio",
};

function makeDiente(
  fdi: number,
  arcada: "superior" | "inferior",
  lado: "derecho" | "izquierdo",
  tipo: Diente["tipo"],
  col: number,
): Diente {
  const nombres: Record<Diente["tipo"], string> = {
    incisivo: fdi % 10 === 1 ? NOMBRES.incisivo_central : NOMBRES.incisivo_lateral,
    canino: NOMBRES.canino,
    premolar: fdi % 10 === 4 ? NOMBRES.primer_premolar : NOMBRES.segundo_premolar,
    molar:
      fdi % 10 === 6
        ? NOMBRES.primer_molar
        : fdi % 10 === 7
        ? NOMBRES.segundo_molar
        : NOMBRES.tercer_molar,
  };
  return { fdi, nombre: nombres[tipo], arcada, lado, tipo, col };
}

// Columnas: 0=centro, aumenta hacia afuera
// En pantalla: derecho del paciente = lado IZQUIERDO de la imagen
export const DIENTES: Diente[] = [
  // ── Superior derecho paciente (cuadrante 1, aparece a la IZQUIERDA en pantalla)
  makeDiente(11, "superior", "derecho", "incisivo", 1),
  makeDiente(12, "superior", "derecho", "incisivo", 2),
  makeDiente(13, "superior", "derecho", "canino", 3),
  makeDiente(14, "superior", "derecho", "premolar", 4),
  makeDiente(15, "superior", "derecho", "premolar", 5),
  makeDiente(16, "superior", "derecho", "molar", 6),
  makeDiente(17, "superior", "derecho", "molar", 7),
  makeDiente(18, "superior", "derecho", "molar", 8),

  // ── Superior izquierdo paciente (cuadrante 2, aparece a la DERECHA en pantalla)
  makeDiente(21, "superior", "izquierdo", "incisivo", 1),
  makeDiente(22, "superior", "izquierdo", "incisivo", 2),
  makeDiente(23, "superior", "izquierdo", "canino", 3),
  makeDiente(24, "superior", "izquierdo", "premolar", 4),
  makeDiente(25, "superior", "izquierdo", "premolar", 5),
  makeDiente(26, "superior", "izquierdo", "molar", 6),
  makeDiente(27, "superior", "izquierdo", "molar", 7),
  makeDiente(28, "superior", "izquierdo", "molar", 8),

  // ── Inferior izquierdo paciente (cuadrante 3, aparece a la DERECHA en pantalla)
  makeDiente(31, "inferior", "izquierdo", "incisivo", 1),
  makeDiente(32, "inferior", "izquierdo", "incisivo", 2),
  makeDiente(33, "inferior", "izquierdo", "canino", 3),
  makeDiente(34, "inferior", "izquierdo", "premolar", 4),
  makeDiente(35, "inferior", "izquierdo", "premolar", 5),
  makeDiente(36, "inferior", "izquierdo", "molar", 6),
  makeDiente(37, "inferior", "izquierdo", "molar", 7),
  makeDiente(38, "inferior", "izquierdo", "molar", 8),

  // ── Inferior derecho paciente (cuadrante 4, aparece a la IZQUIERDA en pantalla)
  makeDiente(41, "inferior", "derecho", "incisivo", 1),
  makeDiente(42, "inferior", "derecho", "incisivo", 2),
  makeDiente(43, "inferior", "derecho", "canino", 3),
  makeDiente(44, "inferior", "derecho", "premolar", 4),
  makeDiente(45, "inferior", "derecho", "premolar", 5),
  makeDiente(46, "inferior", "derecho", "molar", 6),
  makeDiente(47, "inferior", "derecho", "molar", 7),
  makeDiente(48, "inferior", "derecho", "molar", 8),
];

/** Colores por tipo de tratamiento (para marcar el odontograma) */
export const COLOR_TRATAMIENTO: Record<string, string> = {
  obturacion: "#2563EB",     // azul
  endodoncia: "#DC2626",     // rojo
  corona: "#D97706",         // naranja
  extraccion: "#6B7280",     // gris
  implante: "#059669",       // verde
  ortodoncia: "#7C3AED",     // violeta
  default: "#9CA3AF",
};

/** Caras posibles de una pieza */
export type Cara = "M" | "O" | "D" | "V" | "L" | "P";
export const CARAS: Cara[] = ["M", "O", "D", "V", "L"];
export const CARA_LABEL: Record<Cara, string> = {
  M: "Mesial",
  O: "Oclusal",
  D: "Distal",
  V: "Vestibular",
  L: "Lingual",
  P: "Palatino",
};
