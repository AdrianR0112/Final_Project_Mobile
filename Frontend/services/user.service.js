import { apiRequest } from './api';

export function getCurrentUser() {
  return apiRequest('/users/me');
}

export function updateCurrentUser(payload) {
  return apiRequest('/users/me', {
    method: 'PATCH',
    body: payload instanceof FormData ? payload : JSON.stringify(payload),
  });
}

export function uploadProfilePhoto(file) {
  const formData = new FormData();
  formData.set('foto', file);

  return apiRequest('/users/me/photo', {
    method: 'POST',
    body: formData,
  });
}

export function updateCurrentUserPassword(payload) {
  return apiRequest('/users/me/password', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}
