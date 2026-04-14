import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

import { getMe, login as apiLogin, logout as apiLogout, refreshTokens } from "@/api/auth";
import { useAuthStore } from "@/store/authStore";

export function useAuth() {
  const {
    user,
    isAuthenticated,
    isBootstrapping,
    setSession,
    setUser,
    clearSession,
    finishBootstrap,
  } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function loadCurrentUser() {
    const me = await getMe();
    setUser(me);
    return me;
  }

  const loginMutation = useMutation({
    mutationFn: ({ username, password }: { username: string; password: string }) =>
      apiLogin(username, password),
    onSuccess: async (tokens) => {
      setSession(tokens.access_token);
      const me = await loadCurrentUser();
      toast.success(`Bienvenido, ${me.nombre}`);
      navigate("/agenda");
    },
    onError: () => {
      toast.error("Usuario o contrasena incorrectos");
    },
  });

  const logoutMutation = useMutation({
    mutationFn: apiLogout,
    onSettled: () => {
      clearSession();
      queryClient.clear();
      navigate("/login");
    },
  });

  async function bootstrapSession() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");

    try {
      const tokens = await refreshTokens();
      setSession(tokens.access_token);
      await loadCurrentUser();
    } catch {
      clearSession();
    } finally {
      finishBootstrap();
    }
  }

  return {
    user,
    isAuthenticated,
    isBootstrapping,
    login: loginMutation.mutate,
    logout: logoutMutation.mutate,
    bootstrapSession,
    isLoggingIn: loginMutation.isPending,
  };
}
