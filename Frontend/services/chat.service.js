import { apiRequest, buildQueryString } from './api';

export function getServiceMessages(serviceId) {
  return apiRequest(`/chat/services/${serviceId}/messages`);
}

export function sendServiceMessage(serviceId, payload) {
  return apiRequest(`/chat/services/${serviceId}/messages`, {
    method: 'POST',
    body: payload instanceof FormData ? payload : JSON.stringify(payload),
  });
}

export function markServiceMessagesAsRead(serviceId) {
  return apiRequest(`/chat/services/${serviceId}/read`, {
    method: 'PATCH',
  });
}

export function getUnreadMessageCount(params = {}) {
  return apiRequest(`/chat/unread${buildQueryString(params)}`);
}
