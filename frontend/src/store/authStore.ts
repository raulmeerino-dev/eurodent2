import { create } from "zustand";

import type { Usuario } from "@/types";

interface AuthState {
  user: Usuario | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  setSession: (accessToken: string) => void;
  setUser: (user: Usuario) => void;
  finishBootstrap: () => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isBootstrapping: true,

  setSession: (accessToken) => {
    set({ accessToken, isAuthenticated: true });
  },

  setUser: (user) => set({ user }),

  finishBootstrap: () => set({ isBootstrapping: false }),

  clearSession: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isBootstrapping: false,
    });
  },
}));
