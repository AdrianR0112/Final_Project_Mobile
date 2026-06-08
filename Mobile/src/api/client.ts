import { getStoredToken, isTokenExpired, clearAuthSession } from '../utils/auth';
import { API_URL } from './config';

function buildApiUrl(path = ''): string {
  if (/^https?:\/\//i.test(path)) return path;

  return `${API_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export function buildQueryString(params: Record<string, unknown> = {}): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;

    if (Array.isArray(value)) {
      if (value.length === 0) return;
      searchParams.set(key, value.join(','));
      return;
    }

    searchParams.set(key, String(value));
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

function isJsonBodyWithoutContentType(body: unknown): boolean {
  return body != null && !(body instanceof FormData);
}

const REQUEST_TIMEOUT_MS = 15000;

function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(timeoutId)
  );
}

export async function apiRequest(path: string, options: RequestInit = {}): Promise<Response> {
  const token = await getStoredToken();
  const headers = new Headers(options.headers || {});

  if (token && isTokenExpired(token)) {
    await clearAuthSession();
    throw new Error('La sesión ha expirado');
  }

  if (!headers.has('Content-Type') && isJsonBodyWithoutContentType(options.body)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetchWithTimeout(buildApiUrl(path), {
    ...options,
    headers,
  }, REQUEST_TIMEOUT_MS);

  if (response.status === 401 && token) {
    await clearAuthSession();
  }

  return response;
}

export async function apiJsonRequest<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await apiRequest(path, options);
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(data?.message || 'La petición no se pudo completar') as Error & {
      response: Response;
      data: unknown;
    };
    error.response = response;
    error.data = data;
    throw error;
  }

  return data as T;
}
