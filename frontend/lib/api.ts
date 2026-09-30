// ============================================================
// OmniCast - Axios API Client (JWT interceptor)
// ============================================================

import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

export function getApiBaseUrl(): string {
  let url = process.env.NEXT_PUBLIC_API_URL;
  if (!url || url.includes('localhost')) {
    if (typeof window !== 'undefined') {
      if (window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1')) {
        url = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
      } else {
        url = 'https://omnicast-api.vercel.app/api/v1';
      }
    } else if (process.env.NODE_ENV === 'production' || process.env.VERCEL) {
      url = 'https://omnicast-api.vercel.app/api/v1';
    } else {
      url = 'http://localhost:3000/api/v1';
    }
  }

  // Normalize: ensure it ends with /api/v1
  url = url.replace(/\/$/, '');
  if (!url.endsWith('/v1')) {
    if (url.endsWith('/api')) {
      url = `${url}/v1`;
    } else if (!url.includes('/api/')) {
      url = `${url}/api/v1`;
    }
  }
  return url;
}

export const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// ----- Request interceptor: attach Bearer token and dynamic baseURL -----
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    config.baseURL = getApiBaseUrl();
    const token =
      typeof window !== 'undefined'
        ? localStorage.getItem('accessToken')
        : null;

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ----- Response interceptor: refresh on 401 -----
let isRefreshing = false;
let pendingQueue: Array<(token: string | null) => void> = [];

function flushQueue(token: string | null) {
  pendingQueue.forEach((cb) => cb(token));
  pendingQueue = [];
}

apiClient.interceptors.response.use(
  (response) => {
    // If backend returns wrapped ApiResponse { success: true, data: ... }
    if (
      response.data &&
      typeof response.data === 'object' &&
      'success' in response.data &&
      'data' in response.data
    ) {
      // Non-paginated endpoints: unwrap directly to the inner data
      if (!('meta' in response.data)) {
        response.data = response.data.data;
      }
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      typeof window !== 'undefined'
    ) {
      // Do not try to refresh on the auth endpoints themselves
      const url = originalRequest.url || '';
      if (url.includes('/auth/login') || url.includes('/auth/refresh')) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');

      if (!refreshToken) {
        // No refresh token → force logout redirect only if not already on auth pages
        if (
          !window.location.pathname.startsWith('/login') &&
          !window.location.pathname.startsWith('/register')
        ) {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push((token) => {
            if (!token) return reject(error);
            originalRequest.headers!.Authorization = `Bearer ${token}`;
            resolve(apiClient(originalRequest));
          });
        });
      }

      isRefreshing = true;
      try {
        const res = await axios.post(`${getApiBaseUrl()}/auth/refresh`, {
          refreshToken,
        });
        const newAccess: string = res.data?.accessToken;
        const newRefresh: string = res.data?.refreshToken;
        if (!newAccess || !newRefresh) {
          throw new Error('Invalid refresh response');
        }
        localStorage.setItem('accessToken', newAccess);
        localStorage.setItem('refreshToken', newRefresh);
        flushQueue(newAccess);
        originalRequest.headers!.Authorization = `Bearer ${newAccess}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        flushQueue(null);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        if (
          !window.location.pathname.startsWith('/login') &&
          !window.location.pathname.startsWith('/register')
        ) {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
