import { apiRequest, buildQueryString } from './api';

export function getNotifications() {
  return apiRequest('/notifications/me');
}

export function getUnreadNotificationCount() {
  return apiRequest('/notifications/me/unread');
}

export function markAllNotificationsAsRead() {
  return apiRequest('/notifications/me/read-all', {
    method: 'PATCH',
  });
}

export function markNotificationAsRead(id) {
  return apiRequest(`/notifications/${id}/read`, {
    method: 'PATCH',
  });
}

export function getNotificationsWithFilters(params = {}) {
  return apiRequest(`/notifications/me${buildQueryString(params)}`);
}
