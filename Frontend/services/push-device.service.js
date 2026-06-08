import { apiRequest } from './api';

export function getMyPushDevices() {
  return apiRequest('/push-devices/me');
}

export function registerMyPushDevice(payload) {
  return apiRequest('/push-devices/me', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateMyPushDevice(deviceId, payload) {
  return apiRequest(`/push-devices/${deviceId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteMyPushDevice(deviceId) {
  return apiRequest(`/push-devices/${deviceId}`, {
    method: 'DELETE',
  });
}
