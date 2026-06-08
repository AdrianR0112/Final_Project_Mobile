import { apiRequest } from '../api/client';

export function getServiceMessages(serviceId: number) {
  return apiRequest(`/chat/services/${serviceId}/messages`);
}

export function sendServiceMessage(serviceId: number, payload: FormData | { mensaje: string }) {
  return apiRequest(`/chat/services/${serviceId}/messages`, {
    method: 'POST',
    body: payload instanceof FormData ? payload : JSON.stringify(payload),
  });
}

export function markServiceMessagesAsRead(serviceId: number) {
  return apiRequest(`/chat/services/${serviceId}/read`, {
    method: 'PATCH',
  });
}

export function getUnreadMessageCount() {
  return apiRequest('/chat/unread');
}
