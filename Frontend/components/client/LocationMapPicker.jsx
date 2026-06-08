'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMapEvents } from 'react-leaflet';

const DEFAULT_CENTER = { lat: -0.180653, lng: -78.467834 };

function ClickHandler({ onPickLocation }) {
  useMapEvents({
    click(event) {
      onPickLocation({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
  });

  return null;
}

function RecenterMap({ center }) {
  const map = useMapEvents({});

  useEffect(() => {
    if (center) {
      map.setView([center.lat, center.lng], Math.max(map.getZoom(), 15));
    }
  }, [center, map]);

  return null;
}

async function searchAddress(query) {
  const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(query)}`);
  if (!response.ok) {
    throw new Error('No se pudo buscar la direccion');
  }
  return response.json();
}

async function reverseGeocode(lat, lng) {
  const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
  if (!response.ok) {
    throw new Error('No se pudo resolver la direccion');
  }
  return response.json();
}

export default function LocationMapPicker({ value, onChange, allowUseCurrentLocation = true, defaultToCurrentLocation = false }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');

  async function resolveAndSetLocation(coordinates) {
    setError('');

    try {
      const data = await reverseGeocode(coordinates.lat, coordinates.lng);
      onChange({
        lat: coordinates.lat,
        lng: coordinates.lng,
        address: data.display_name || '',
      });
    } catch {
      onChange({
        lat: coordinates.lat,
        lng: coordinates.lng,
        address: value?.address || '',
      });
    }
  }

  function handleUseCurrentLocation() {
    if (!navigator.geolocation) {
      setError('Tu navegador no soporta geolocalizacion');
      return;
    }

    setError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolveAndSetLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (geolocationError) => {
        if (geolocationError.code === 1) {
          setError('Permiso de ubicacion denegado. Activalo en tu navegador.');
          return;
        }

        if (geolocationError.code === 2) {
          setError('No se pudo obtener tu ubicacion actual.');
          return;
        }

        if (geolocationError.code === 3) {
          setError('La ubicacion tardó demasiado en responder.');
          return;
        }

        setError('No se pudo obtener tu ubicacion actual.');
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000,
      },
    );
  }

  useEffect(() => {
    if (!defaultToCurrentLocation || value) {
      return;
    }

    handleUseCurrentLocation();
  }, [defaultToCurrentLocation, value]);

  async function handleSearch() {
    if (!query.trim()) {
      return;
    }

    setSearching(true);
    setError('');

    try {
      const data = await searchAddress(query.trim());
      setResults(Array.isArray(data) ? data : []);
    } catch (searchError) {
      setResults([]);
      setError(searchError.message);
    } finally {
      setSearching(false);
    }
  }

  function handlePickSearchResult(result) {
    setResults([]);
    setQuery(result.display_name || '');
    onChange({
      lat: Number(result.lat),
      lng: Number(result.lon),
      address: result.display_name || '',
    });
  }

  return (
    <div className="space-y-4 rounded-[28px] border border-[#d8dbeb] bg-white p-4 md:p-5">
      <div>
        <h3 className="text-[18px] font-semibold text-[#0b1c30]">Ubicacion del servicio</h3>
        <p className="mt-1 text-sm text-[#434656]">Puedes usar tu ubicacion actual, buscar una direccion o hacer clic en el mapa.</p>
      </div>
      <div className="flex flex-col gap-3 md:flex-row">
        <input
          className="w-full rounded-2xl border border-[#c3c5d9] bg-white px-4 py-3 text-[16px] text-[#0b1c30] outline-none"
          placeholder="Buscar calle, barrio o direccion"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {allowUseCurrentLocation ? (
          <button type="button" onClick={handleUseCurrentLocation} className="rounded-2xl border border-[#c3c5d9] px-5 py-3 text-sm font-semibold text-[#0b1c30] transition-colors hover:bg-[#eff4ff]">
            Usar ubicacion actual
          </button>
        ) : null}
        <button type="button" onClick={handleSearch} className="rounded-2xl bg-[#003ec7] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0052ff]" disabled={searching}>
          {searching ? 'Buscando...' : 'Buscar'}
        </button>
      </div>
      {results.length > 0 ? (
        <div className="grid gap-2 rounded-2xl bg-[#eff4ff] p-3">
          {results.map((result) => (
            <button key={`${result.place_id}-${result.lat}-${result.lon}`} type="button" onClick={() => handlePickSearchResult(result)} className="rounded-2xl bg-white px-4 py-3 text-left text-sm text-[#434656] transition-colors hover:bg-[#dfe9ff]">
              {result.display_name}
            </button>
          ))}
        </div>
      ) : null}
      {error ? <p className="text-sm text-[#93000a]">{error}</p> : null}
      <div className="h-[320px] overflow-hidden rounded-[24px] border border-[#d8dbeb] service-map-container">
        <MapContainer center={[value?.lat || DEFAULT_CENTER.lat, value?.lng || DEFAULT_CENTER.lng]} zoom={value ? 15 : 12} scrollWheelZoom className="h-full w-full">
          <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <RecenterMap center={value} />
          <ClickHandler onPickLocation={resolveAndSetLocation} />
          {value ? (
            <CircleMarker center={[value.lat, value.lng]} pathOptions={{ color: '#003ec7', fillColor: '#003ec7', fillOpacity: 0.85 }} radius={10}>
              <Popup>{value.address || `${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}`}</Popup>
            </CircleMarker>
          ) : null}
        </MapContainer>
      </div>
      {value ? <p className="text-sm text-[#434656]">Ubicacion seleccionada: {value.address || `${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}`}</p> : null}
    </div>
  );
}
