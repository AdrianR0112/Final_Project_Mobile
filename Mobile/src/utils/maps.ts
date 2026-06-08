import { Linking, Platform } from 'react-native';

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface AddressMatch extends Coordinates {
  display_name?: string;
  name?: string;
}

function mapHeaders() {
  return {
    Accept: 'application/json',
    'Accept-Language': 'es-ES,es;q=0.9',
  };
}

export function formatCoordinatesLabel(coords: Coordinates, address?: string | null): string {
  if (address && address.trim()) {
    return address.trim();
  }

  return `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`;
}

export async function searchAddress(query: string): Promise<AddressMatch[]> {
  const response = await fetch(
    `${NOMINATIM_BASE_URL}/search?format=jsonv2&limit=6&q=${encodeURIComponent(query)}`,
    { headers: mapHeaders() },
  );

  if (!response.ok) {
    throw new Error('No se pudo buscar la direccion');
  }

  const data = await response.json().catch(() => []);
  return Array.isArray(data)
    ? data.map((item) => ({
      lat: Number(item.lat),
      lng: Number(item.lon),
      display_name: item.display_name,
      name: item.name,
    }))
    : [];
}

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const response = await fetch(
    `${NOMINATIM_BASE_URL}/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
    { headers: mapHeaders() },
  );

  if (!response.ok) {
    throw new Error('No se pudo resolver la direccion');
  }

  const data = await response.json().catch(() => null);
  return data?.display_name || '';
}

export async function openCoordinatesInMaps(coords: Coordinates, label?: string | null): Promise<void> {
  const query = encodeURIComponent(formatCoordinatesLabel(coords, label));
  const url = Platform.select({
    ios: `maps:0,0?q=${query}&ll=${coords.lat},${coords.lng}`,
    android: `geo:0,0?q=${coords.lat},${coords.lng}(${query})`,
    default: `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`,
  });

  if (url) {
    await Linking.openURL(url);
  }
}
