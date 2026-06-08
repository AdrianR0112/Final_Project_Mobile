import { apiRequest } from '../api/client';

export function rateService(serviceId: number, payload: { calificacion: number; comentario?: string }) {
  return apiRequest(`/ratings/services/${serviceId}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getMyRatingForService(serviceId: number) {
  return apiRequest(`/ratings/services/${serviceId}`);
}

export function getMyRatings() {
  return apiRequest('/ratings/me');
}

export function getTechnicianRatings(technicianId: number) {
  return apiRequest(`/ratings/technicians/${technicianId}`);
}
