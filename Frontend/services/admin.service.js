import { apiRequest, buildQueryString } from './api';

export function getAdminDashboard() {
  return apiRequest('/admin/dashboard');
}

export function getAdminUsers(params = {}) {
  return apiRequest(`/admin/users${buildQueryString(params)}`);
}

export function getAdminUserById(userId) {
  return apiRequest(`/admin/users/${userId}`);
}

export function updateAdminUser(userId, payload) {
  return apiRequest(`/admin/users/${userId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteAdminUser(userId) {
  return apiRequest(`/admin/users/${userId}`, {
    method: 'DELETE',
  });
}

export function updateAdminUserStatus(userId, payload) {
  return apiRequest(`/admin/users/${userId}/status`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function getAdminServices(params = {}) {
  return apiRequest(`/admin/services${buildQueryString(params)}`);
}

export function getAdminServiceById(serviceId) {
  return apiRequest(`/admin/services/${serviceId}`);
}

export function assignTechnicianToService(serviceId, payload) {
  return apiRequest(`/admin/services/${serviceId}/assign`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function getAdminTechnicians(params = {}) {
  return apiRequest(`/admin/technicians${buildQueryString(params)}`);
}

export function updateAdminTechnicianApproval(technicianId, payload) {
  return apiRequest(`/admin/technicians/${technicianId}/approval`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function updateAdminTechnicianProfile(technicianId, payload) {
  return apiRequest(`/admin/technicians/${technicianId}/profile`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteAdminTechnicianProfile(technicianId) {
  return apiRequest(`/admin/technicians/${technicianId}/profile`, {
    method: 'DELETE',
  });
}

export function getAdminRatings(params = {}) {
  return apiRequest(`/admin/ratings${buildQueryString(params)}`);
}

export function updateRatingVisibility(ratingId, payload) {
  return apiRequest(`/admin/ratings/${ratingId}/visibility`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function getAdminReports() {
  return apiRequest('/admin/reports');
}

export function getAdminCoverageZones(params = {}) {
  return apiRequest(`/admin/coverage-zones${buildQueryString(params)}`);
}

export function createAdminCoverageZone(payload) {
  return apiRequest('/admin/coverage-zones', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateAdminCoverageZone(zoneId, payload) {
  return apiRequest(`/admin/coverage-zones/${zoneId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function getAdminSystemConfig() {
  return apiRequest('/admin/system-config');
}

export function updateAdminSystemConfig(payload) {
  return apiRequest('/admin/system-config', {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}
