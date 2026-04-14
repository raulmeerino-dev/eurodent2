import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        // Colores de estado de cita — consistentes en toda la UI
        cita: {
          programada: "#6B7280",    // gris
          confirmada: "#2563EB",    // azul
          en_clinica: "#D97706",    // ámbar
          atendida: "#16A34A",      // verde
          falta: "#DC2626",         // rojo
          anulada: "#9CA3AF",       // gris claro
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
