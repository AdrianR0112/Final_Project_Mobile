import { apiRequest, buildQueryString } from '../api/client';

export function getDashboard() {
  return apiRequest('/admin/dashboard');
}

export function getReports() {
  return apiRequest('/admin/reports');
}

export function getUsers(params: Record<string, unknown> = {}) {
  return apiRequest(`/admin/users${buildQueryString(params)}`);
}

export function getUser(userId: number) {
  return apiRequest(`/admin/users/${userId}`);
}

export function updateUser(userId: number, payload: Record<string, unknown>) {
  return apiRequest(`/admin/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteUser(userId: number) {
  return apiRequest(`/admin/users/${userId}`, {
    method: 'DELETE',
  });
}

export function toggleUserStatus(userId: number, payload: { activo?: boolean; bloqueado?: boolean }) {
  return apiRequest(`/admin/users/${userId}/status`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function getServices(params: Record<string, unknown> = {}) {
  return apiRequest(`/admin/services${buildQueryString(params)}`);
}

export function getService(serviceId: number) {
  return apiRequest(`/admin/services/${serviceId}`);
}

export function assignTechnician(serviceId: number, payload: { tecnico_id: number }) {
  return apiRequest(`/admin/services/${serviceId}/assign`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function getTechnicians(params: Record<string, unknown> = {}) {
  return apiRequest(`/admin/technicians${buildQueryString(params)}`);
}

export function updateTechnician(technicianId: number, payload: Record<string, unknown>) {
  return apiRequest(`/admin/technicians/${technicianId}/profile`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function approveTechnician(technicianId: number, payload: { approve: boolean; motivoRechazo?: string }) {
  return apiRequest(`/admin/technicians/${technicianId}/approval`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteTechnician(technicianId: number) {
  return apiRequest(`/admin/technicians/${technicianId}/profile`, {
    method: 'DELETE',
  });
}

export function getRatings(params: Record<string, unknown> = {}) {
  return apiRequest(`/admin/ratings${buildQueryString(params)}`);
}

export function updateRatingVisibility(ratingId: number, payload: { visible: boolean }) {
  return apiRequest(`/admin/ratings/${ratingId}/visibility`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}
