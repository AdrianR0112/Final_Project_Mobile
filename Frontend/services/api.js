import { expireAuthSession, getStoredToken, isTokenExpired } from '../utils/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

function isJsonBodyWithoutContentType(body) {
  return body != null && !(body instanceof FormData);
}

export function buildApiUrl(path = '') {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${API_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export function buildQueryString(params = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return;
      }

      searchParams.set(key, value.join(','));
      return;
    }

    searchParams.set(key, String(value));
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

export async function apiRequest(path, options = {}) {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});

  if (token && isTokenExpired(token)) {
    expireAuthSession();
    throw new Error('La sesion ha expirado');
  }

  if (!headers.has('Content-Type') && isJsonBodyWithoutContentType(options.body)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(buildApiUrl(path), {
    ...options,
    headers,
  });

  if (response.status === 401 && token) {
    expireAuthSession();
  }

  return response;
}

export async function apiJsonRequest(path, options = {}) {
  const response = await apiRequest(path, options);
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(data?.message || 'La peticion no se pudo completar');
    error.response = response;
    error.data = data;
    throw error;
  }

  return data;
}

export default API_URL;
