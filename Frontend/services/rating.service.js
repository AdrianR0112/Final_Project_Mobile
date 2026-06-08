import { apiRequest, buildQueryString } from './api';

export function createRating(serviceId, payload) {
  return apiRequest(`/ratings/services/${serviceId}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function getRatingForService(serviceId) {
  return apiRequest(`/ratings/services/${serviceId}`);
}

export function getMyRatings(params = {}) {
  return apiRequest(`/ratings/me${buildQueryString(params)}`);
}

export function getTechnicianRatings(technicianId, params = {}) {
  return apiRequest(`/ratings/technicians/${technicianId}${buildQueryString(params)}`);
}
