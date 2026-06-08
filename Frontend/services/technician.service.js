import { apiRequest, buildQueryString } from './api';

export function getNearbyTechnicians() {
  return apiRequest('/technicians/available');
}

export function getTechnicianProfile() {
  return apiRequest('/technicians/me');
}

export function updateTechnicianProfile(payload) {
  return apiRequest('/technicians/me', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function updateTechnicianLocation(payload) {
  return apiRequest('/technicians/me/location', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function updateTechnicianSpecialties(payload) {
  return apiRequest('/technicians/me/specialties', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function getTechnicianSpecialties() {
  return apiRequest('/technicians/specialties');
}

export function getAvailableTechnicians(params = {}) {
  return apiRequest(`/technicians/available${buildQueryString(params)}`);
}
