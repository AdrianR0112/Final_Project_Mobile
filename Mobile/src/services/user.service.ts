import { apiRequest } from '../api/client';

export function getCurrentUser() {
  return apiRequest('/users/me');
}

export function updateCurrentUser(payload: FormData | Record<string, unknown>) {
  return apiRequest('/users/me', {
    method: 'PATCH',
    body: payload instanceof FormData ? payload : JSON.stringify(payload),
  });
}

export function uploadProfilePhoto(file: { uri: string; name: string; type: string }) {
  const formData = new FormData();
  formData.append('foto', file as unknown as Blob);

  return apiRequest('/users/me/photo', {
    method: 'POST',
    body: formData,
  });
}

export function updateCurrentUserPassword(payload: { currentPassword: string; newPassword: string }) {
  return apiRequest('/users/me/password', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}
