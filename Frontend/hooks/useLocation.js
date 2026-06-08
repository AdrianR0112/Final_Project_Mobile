'use client';

import { useEffect, useState } from 'react';

export function useLocation() {
  const [location, setLocation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  function requestLocation() {
    if (!navigator.geolocation) {
      setError('Tu navegador no soporta geolocalizacion');
      return;
    }

    setIsLoading(true);
    setError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setIsLoading(false);
        setError('');
      },
      (err) => {
        if (err.code === 1) {
          setError('Permiso de ubicacion denegado. Activalo en tu navegador.');
        } else if (err.code === 2) {
          setError('No se pudo obtener tu ubicacion. Verifica tu conexion.');
        } else if (err.code === 3) {
          setError('Tiempo de espera agotado. Intenta de nuevo.');
        } else {
          setError('No se pudo obtener tu ubicacion.');
        }
        setIsLoading(false);
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000,
      },
    );
  }

  useEffect(() => {
    requestLocation();
  }, []);

  return {
    location,
    isLoading,
    error,
    requestLocation,
    setLocation,
  };
}
