import { apiRequest } from '../api/client';

export function getWarrantyForService(serviceId: number) {
  return apiRequest(`/warranties/services/${serviceId}`);
}

export function createWarranty(serviceId: number, payload: Record<string, unknown>) {
  return apiRequest(`/warranties/services/${serviceId}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateWarranty(warrantyId: number, payload: Record<string, unknown>) {
  return apiRequest(`/warranties/${warrantyId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}
