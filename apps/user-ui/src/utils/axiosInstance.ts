import axios, { AxiosError } from 'axios';
import type { CustomAxiosRequestConfig } from './axiosInstance.types';
import { runRedirectToLogin } from './redirect';

const serverUri = process.env.NEXT_PUBLIC_SERVER_URI;

const axiosInstance = axios.create({
  baseURL: serverUri,
  withCredentials: true,
});

let refreshPromise: Promise<void> | null = null;

const authenticatedPaths = [
  '/api/logged-in-user',
  '/api/user-profile',
  '/api/change-password-user',
  '/api/user-addresses',
  '/api/logout-user',
  '/order/api/get-user-orders',
  '/order/api/create-payment-session',
  '/order/api/create-payment-intent',
  '/order/api/verify-payment-session',
];

const requiresAuthentication = (config: CustomAxiosRequestConfig) => {
  if (config.requireAuth !== undefined) {
    return config.requireAuth;
  }
  return authenticatedPaths.some((path) => config.url?.includes(path));
};

const handleLogout = () => {
  if (
    typeof window !== 'undefined' &&
    !['/login', '/signup', '/forgot-password'].includes(window.location.pathname)
  ) {
    runRedirectToLogin();
  }
};

const refreshAccessToken = () => {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(
        `${serverUri}/api/refresh-token`,
        { role: 'user' },
        { withCredentials: true },
      )
      .then(() => undefined)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as
      | CustomAxiosRequestConfig
      | undefined;

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      !requiresAuthentication(originalRequest)
    ) {
      return Promise.reject(error);
    }

    if (originalRequest._retry) {
      handleLogout();
      return Promise.reject(error);
    }

    originalRequest._retry = true;
    try {
      await refreshAccessToken();
      return await axiosInstance(originalRequest);
    } catch (refreshError) {
      handleLogout();
      return Promise.reject(refreshError);
    }
  },
);

export default axiosInstance;
