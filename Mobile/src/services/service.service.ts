import { apiRequest, buildQueryString } from '../api/client';

export function getServiceTypes() {
  return apiRequest('/services/types');
}

export function getServiceHistory(params: Record<string, unknown> = {}) {
  return apiRequest(`/services/history${buildQueryString(params)}`);
}

export function getServiceHistoryById(id: number) {
  return apiRequest(`/services/history/${id}`);
}

export function getMyServices(params: Record<string, unknown> = {}) {
  return apiRequest(`/services/me${buildQueryString(params)}`);
}

export function getMyServiceById(id: number) {
  return apiRequest(`/services/me/${id}`);
}

export function requestService(payload: FormData | Record<string, unknown>) {
  return apiRequest('/services/request', {
    method: 'POST',
    body: payload instanceof FormData ? payload : JSON.stringify(payload),
  });
}

export function cancelServiceRequest(id: number) {
  return apiRequest(`/services/${id}/cancel`, {
    method: 'PATCH',
    body: JSON.stringify({}),
  });
}

export function getOpenServiceRequests(params: Record<string, unknown> = {}) {
  return apiRequest(`/services/open${buildQueryString(params)}`);
}

export function getOpenServiceRequestById(id: number) {
  return apiRequest(`/services/open/${id}`);
}

export function getAssignedServiceRequests(params: Record<string, unknown> = {}) {
  return apiRequest(`/services/assigned${buildQueryString(params)}`);
}

export function getAssignedServiceRequestById(id: number) {
  return apiRequest(`/services/assigned/${id}`);
}

export function acceptServiceRequest(id: number) {
  return apiRequest(`/services/${id}/accept`, {
    method: 'PATCH',
  });
}

export function sendInitialQuote(id: number, payload: { precioManoObra: number; precioDomicilio: number; precioDiagnostico: number; notaPrecio?: string }) {
  return apiRequest(`/services/${id}/initial-quote`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function acceptInitialQuote(id: number) {
  return apiRequest(`/services/${id}/accept-initial-quote`, {
    method: 'PATCH',
  });
}

export function rejectInitialQuote(id: number) {
  return apiRequest(`/services/${id}/reject-initial-quote`, {
    method: 'PATCH',
  });
}

export function updateAssignedServiceStatus(id: number, payload: { estado: string; precioManoObra?: number; precioRepuestos?: number; precioDomicilio?: number; precioDiagnostico?: number; notaPrecio?: string; garantia?: Record<string, unknown>; repuestos?: Record<string, unknown>[] }) {
  return apiRequest(`/services/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}
