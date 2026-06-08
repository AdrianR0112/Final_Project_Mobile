'use client';

import { useEffect } from 'react';
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet';

const DEFAULT_CENTER = { lat: -0.180653, lng: -78.467834 };

function RecenterMap({ center }) {
  const map = useMap();

  useEffect(() => {
    if (center) {
      map.setView([center.lat, center.lng], Math.max(map.getZoom(), 13));
    }
  }, [center, map]);

  return null;
}

export default function NearbyTechniciansMap({ technicians = [], lastServiceLocation = null }) {
  const workshopMarkers = technicians.filter((technician) => technician.latitud_taller && technician.longitud_taller);
  const center = lastServiceLocation || (workshopMarkers[0] ? {
    lat: Number(workshopMarkers[0].latitud_taller),
    lng: Number(workshopMarkers[0].longitud_taller),
  } : DEFAULT_CENTER);

  return (
    <div className="overflow-hidden rounded-[28px] border border-[#d8dbeb] bg-white p-4 shadow-[0_12px_36px_rgba(11,28,48,0.08)]">
      <div className="mb-4">
        <h2 className="text-[20px] font-semibold text-[#0b1c30]">Mapa de talleres cercanos</h2>
        <div className="mt-2 flex flex-wrap gap-3 text-sm text-[#434656]">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#eefaf5] px-3 py-1.5">
            <span className="h-3 w-3 rounded-full bg-[#12805c]" />
            <span>Tu ultimo servicio</span>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-[#eff4ff] px-3 py-1.5">
            <span className="h-3 w-3 rounded-full bg-[#003ec7]" />
            <span>Talleres de tecnicos disponibles</span>
          </div>
        </div>
      </div>
      <div className="h-[360px] overflow-hidden rounded-[24px] border border-[#d8dbeb] service-map-container">
        <MapContainer center={[center.lat, center.lng]} zoom={13} scrollWheelZoom className="h-full w-full">
          <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <RecenterMap center={center} />
          {lastServiceLocation ? (
            <CircleMarker center={[lastServiceLocation.lat, lastServiceLocation.lng]} pathOptions={{ color: '#12805c', fillColor: '#12805c', fillOpacity: 0.9 }} radius={10}>
              <Popup>{lastServiceLocation.address || 'Último servicio del cliente'}</Popup>
            </CircleMarker>
          ) : null}
          {workshopMarkers.map((technician) => (
            <CircleMarker
              key={technician.usuario_id}
              center={[Number(technician.latitud_taller), Number(technician.longitud_taller)]}
              pathOptions={{ color: '#003ec7', fillColor: '#003ec7', fillOpacity: 0.85 }}
              radius={9}
            >
              <Popup>
                <div className="space-y-1 text-sm text-[#0b1c30]">
                  <p className="font-semibold">{[technician.nombre, technician.apellido].filter(Boolean).join(' ')}</p>
                  <p>{technician.especialidades || 'Sin especialidades registradas'}</p>
                  <p>{technician.direccion_taller || 'Dirección de taller no registrada'}</p>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
