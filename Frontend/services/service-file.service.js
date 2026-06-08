import { apiRequest } from './api';

export function getServiceFiles(serviceId) {
  return apiRequest(`/service-files/services/${serviceId}`);
}

export function createServiceFile(serviceId, payload) {
  return apiRequest(`/service-files/services/${serviceId}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function deleteServiceFile(fileId) {
  return apiRequest(`/service-files/${fileId}`, {
    method: 'DELETE',
  });
}
