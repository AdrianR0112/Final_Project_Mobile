const API_HOST = process.env.EXPO_PUBLIC_API_HOST || '192.168.100.13';
const API_PORT = process.env.EXPO_PUBLIC_API_PORT || '3001';

const getBaseUrl = (): string => {
  return `http://${API_HOST}:${API_PORT}`;
};

export const API_BASE_URL = getBaseUrl();
export const API_URL = `${API_BASE_URL}/api`;
export const SOCKET_URL = API_BASE_URL;
