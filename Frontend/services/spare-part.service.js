import { apiRequest } from './api';

export function getServiceParts(serviceId) {
  return apiRequest(`/spare-parts/services/${serviceId}`);
}

export function createServicePart(serviceId, payload) {
  return apiRequest(`/spare-parts/services/${serviceId}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateServicePart(partId, payload) {
  return apiRequest(`/spare-parts/${partId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteServicePart(partId) {
  return apiRequest(`/spare-parts/${partId}`, {
    method: 'DELETE',
  });
}
