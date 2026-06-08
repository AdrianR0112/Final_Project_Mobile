import { apiRequest } from '../api/client';

export function getMyNotifications() {
  return apiRequest('/notifications/me');
}

export function getUnreadNotificationCount() {
  return apiRequest('/notifications/me/unread');
}

export function markAllNotificationsRead() {
  return apiRequest('/notifications/me/read-all', {
    method: 'PATCH',
  });
}

export function markNotificationRead(id: number) {
  return apiRequest(`/notifications/${id}/read`, {
    method: 'PATCH',
  });
}
