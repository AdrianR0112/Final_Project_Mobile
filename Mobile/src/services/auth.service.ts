import { apiRequest } from '../api/client';

export function login(payload: { correo: string; password: string }) {
  return apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function register(payload: FormData | Record<string, unknown>) {
  return apiRequest('/auth/register', {
    method: 'POST',
    body: payload instanceof FormData ? payload : JSON.stringify(payload),
  });
}

export function getAuthUser() {
  return apiRequest('/auth/me');
}

export function forgotPassword(payload: { correo: string }) {
  return apiRequest('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function resetPassword(payload: { token: string; password: string }) {
  return apiRequest('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
