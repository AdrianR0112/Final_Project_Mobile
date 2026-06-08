import { apiRequest, buildQueryString } from '../api/client';

export function getSpecialties() {
  return apiRequest('/technicians/specialties');
}

export function getTechnicianProfile() {
  return apiRequest('/technicians/me');
}

export function updateTechnicianProfile(payload: Record<string, unknown>) {
  return apiRequest('/technicians/me', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function updateTechnicianLocation(payload: { latitud: number; longitud: number }) {
  return apiRequest('/technicians/me/location', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function updateTechnicianSpecialties(payload: { specialtyIds: number[] }) {
  return apiRequest('/technicians/me/specialties', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function getAvailableTechnicians(params: Record<string, unknown> = {}) {
  return apiRequest(`/technicians/available${buildQueryString(params)}`);
}
