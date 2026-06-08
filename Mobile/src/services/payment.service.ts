import { apiRequest } from '../api/client';

export function getPaymentStates() {
  return apiRequest('/payments/states');
}

export function getPaymentsForService(serviceId: number) {
  return apiRequest(`/payments/services/${serviceId}`);
}

export function createPayment(serviceId: number, payload: FormData | Record<string, unknown>) {
  return apiRequest(`/payments/services/${serviceId}`, {
    method: 'POST',
    body: payload instanceof FormData ? payload : JSON.stringify(payload),
  });
}

export function updatePayment(paymentId: number, payload: Record<string, unknown>) {
  return apiRequest(`/payments/${paymentId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}
