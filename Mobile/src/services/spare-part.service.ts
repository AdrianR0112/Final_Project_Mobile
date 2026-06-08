import { apiRequest } from '../api/client';

export function getSparePartsForService(serviceId: number) {
  return apiRequest(`/spare-parts/services/${serviceId}`);
}

export function addSparePart(serviceId: number, payload: Record<string, unknown>) {
  return apiRequest(`/spare-parts/services/${serviceId}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateSparePart(partId: number, payload: Record<string, unknown>) {
  return apiRequest(`/spare-parts/${partId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteSparePart(partId: number) {
  return apiRequest(`/spare-parts/${partId}`, {
    method: 'DELETE',
  });
}
