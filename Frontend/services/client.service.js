import { apiRequest } from './api';

export function getMyClientProfile() {
  return apiRequest('/clients/me');
}

export function updateMyClientProfile(payload) {
  return apiRequest('/clients/me', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}
