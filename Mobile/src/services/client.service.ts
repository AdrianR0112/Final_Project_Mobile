import { apiRequest } from '../api/client';

export function getClientProfile() {
  return apiRequest('/clients/me');
}

export function updateClientProfile(payload: Record<string, unknown>) {
  return apiRequest('/clients/me', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}
