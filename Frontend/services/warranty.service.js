import { apiRequest } from './api';

export function getServiceWarranty(serviceId) {
  return apiRequest(`/warranties/services/${serviceId}`);
}

export function createServiceWarranty(serviceId, payload) {
  return apiRequest(`/warranties/services/${serviceId}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateWarranty(warrantyId, payload) {
  return apiRequest(`/warranties/${warrantyId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}
