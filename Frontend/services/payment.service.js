import { apiRequest } from './api';

export function getPaymentStates() {
  return apiRequest('/payments/states');
}

export function getServicePayments(serviceId) {
  return apiRequest(`/payments/services/${serviceId}`);
}

export function createServicePayment(serviceId, payload) {
  return apiRequest(`/payments/services/${serviceId}`, {
    method: 'POST',
    body: payload instanceof FormData ? payload : JSON.stringify(payload),
  });
}

export function updatePayment(paymentId, payload) {
  return apiRequest(`/payments/${paymentId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}
