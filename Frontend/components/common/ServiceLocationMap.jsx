'use client';

import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';

const DEFAULT_CENTER = { lat: -0.180653, lng: -78.467834 };

export default function ServiceLocationMap({ location }) {
  const center = location?.lat && location?.lng
    ? [Number(location.lat), Number(location.lng)]
    : [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng];

  return (
    <div className="h-[320px] overflow-hidden rounded-[24px] border border-[#d8dbeb] service-map-container">
      <MapContainer center={center} zoom={location ? 15 : 12} scrollWheelZoom className="h-full w-full">
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {location ? (
          <CircleMarker center={center} pathOptions={{ color: '#003ec7', fillColor: '#003ec7', fillOpacity: 0.85 }} radius={10}>
            <Popup>{location.address || `${Number(location.lat).toFixed(5)}, ${Number(location.lng).toFixed(5)}`}</Popup>
          </CircleMarker>
        ) : null}
      </MapContainer>
    </div>
  );
}
