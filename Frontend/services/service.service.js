import { apiRequest, buildQueryString } from './api';

export function getServiceTypes() {
  return apiRequest('/services/types');
}

export function getServices() {
  return getServiceTypes();
}

export function getServiceHistoryById(id) {
  return apiRequest(`/services/history/${id}`);
}

export function getServiceById(id) {
  return getServiceHistoryById(id);
}

export function getServiceHistory(params = {}) {
  return apiRequest(`/services/history${buildQueryString(params)}`);
}

export function getMyServices(params = {}) {
  return apiRequest(`/services/me${buildQueryString(params)}`);
}

export function getMyServiceById(id) {
  return apiRequest(`/services/me/${id}`);
}

export function requestService(payload) {
  return apiRequest('/services/request', {
    method: 'POST',
    body: payload instanceof FormData ? payload : JSON.stringify(payload),
  });
}

export function cancelServiceRequest(id) {
  return apiRequest(`/services/${id}/cancel`, {
    method: 'PATCH',
    body: JSON.stringify({}),
  });
}

export function getOpenServiceRequests(params = {}) {
  return apiRequest(`/services/open${buildQueryString(params)}`);
}

export function getOpenServiceRequestById(id) {
  return apiRequest(`/services/open/${id}`);
}

export function getAssignedServiceRequests(params = {}) {
  return apiRequest(`/services/assigned${buildQueryString(params)}`);
}

export function getAssignedServiceRequestById(id) {
  return apiRequest(`/services/assigned/${id}`);
}

export function acceptServiceRequest(id) {
  return apiRequest(`/services/${id}/accept`, {
    method: 'PATCH',
  });
}

export function sendInitialQuote(id, payload) {
  return apiRequest(`/services/${id}/initial-quote`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function acceptInitialQuote(id) {
  return apiRequest(`/services/${id}/accept-initial-quote`, {
    method: 'PATCH',
  });
}

export function rejectInitialQuote(id) {
  return apiRequest(`/services/${id}/reject-initial-quote`, {
    method: 'PATCH',
  });
}

export function updateAssignedServiceStatus(id, payload) {
  return apiRequest(`/services/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}
