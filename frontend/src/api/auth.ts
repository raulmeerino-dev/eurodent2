import { apiClient } from "./client";
import type { TokenResponse, Usuario } from "@/types";

export async function login(username: string, password: string): Promise<TokenResponse> {
  const { data } = await apiClient.post<TokenResponse>("/auth/login", {
    username,
    password,
  });
  return data;
}

export async function refreshTokens(): Promise<TokenResponse> {
  const { data } = await apiClient.post<TokenResponse>("/auth/refresh");
  return data;
}

export async function logout(): Promise<void> {
  await apiClient.post("/auth/logout");
}

export async function getMe(): Promise<Usuario> {
  const { data } = await apiClient.get<Usuario>("/auth/me");
  return data;
}
