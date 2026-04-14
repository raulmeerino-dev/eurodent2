/**
 * Cliente Axios base con interceptors JWT.
 *
 * - Anade Authorization header en cada request si hay token en memoria
 * - Renueva automaticamente el access_token usando cookie HttpOnly si expira
 * - Redirige al login si la sesion tambien expiro
 */
import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from "axios";

import { useAuthStore } from "../store/authStore";

const rawBaseUrl = import.meta.env.VITE_API_URL?.trim();

function normalizeBaseUrl(baseUrl?: string) {
  if (!baseUrl) {
    return "/api";
  }

  const trimmed = baseUrl.replace(/\/+$/, "");
  const normalized = trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;

  if (typeof window === "undefined") {
    return normalized;
  }

  try {
    const parsed = new URL(normalized);
    const isLocalLoopback =
      (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") &&
      (window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1");

    if (isLocalLoopback) {
      parsed.hostname = window.location.hostname;
      return parsed.toString().replace(/\/+$/, "");
    }
  } catch {
    return normalized;
  }

  return normalized;
}

const BASE_URL = normalizeBaseUrl(rawBaseUrl);

export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
      return;
    }
    resolve(token!);
  });
  failedQueue = [];
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };
    const requestUrl = originalRequest?.url ?? "";
    const isAuthRefreshRequest = requestUrl.includes("/auth/refresh");
    const isAuthLoginRequest = requestUrl.includes("/auth/login");
    const isAuthLogoutRequest = requestUrl.includes("/auth/logout");

    if (
      error.response?.status !== 401 ||
      originalRequest._retry ||
      isAuthRefreshRequest ||
      isAuthLoginRequest ||
      isAuthLogoutRequest
    ) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return apiClient(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const { data } = await axios.post(
        `${BASE_URL}/auth/refresh`,
        {},
        {
          withCredentials: true,
          headers: { "Content-Type": "application/json" },
        },
      );
      useAuthStore.getState().setSession(data.access_token);
      apiClient.defaults.headers.common.Authorization = `Bearer ${data.access_token}`;
      processQueue(null, data.access_token);
      originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
      return apiClient(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      clearSession();
      redirectToLogin();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

function clearSession() {
  useAuthStore.getState().clearSession();
}

function redirectToLogin() {
  if (!window.location.pathname.startsWith("/login")) {
    window.location.href = "/login";
  }
}
