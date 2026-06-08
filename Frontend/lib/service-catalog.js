import { buildApiUrl } from '../services/api';

function formatRange(min, max, unit) {
  if (min == null && max == null) {
    return unit === 'hours' ? 'A coordinar' : 'Segun diagnostico';
  }

  if (unit === 'hours') {
    if (min != null && max != null) {
      return `${min} a ${max} horas`;
    }

    return `${min ?? max} horas`;
  }

  if (min != null && max != null) {
    return `$${min} a $${max}`;
  }

  return `$${min ?? max}`;
}

function normalizeSpecialty(specialty) {
  return {
    id: specialty.id,
    title: specialty.nombre,
    description: specialty.descripcion || 'Servicio especializado con tiempos y precios estimados segun el tipo de equipo y la complejidad del caso.',
    imageUrl: specialty.imagenUrl || '',
    eta: formatRange(specialty.horasMinimas, specialty.horasMaximas, 'hours'),
    priceRange: formatRange(specialty.precioMinimo, specialty.precioMaximo, 'price'),
    equipmentTypes: Array.isArray(specialty.tiposEquipo) ? specialty.tiposEquipo : [],
    totalSolicitudes: Number(specialty.totalSolicitudes || 0),
  };
}

export async function getCatalogServices() {
  try {
    const response = await fetch(buildApiUrl('/technicians/specialties'), { cache: 'no-store' });
    const data = await response.json().catch(() => ({}));

    if (!response.ok || !Array.isArray(data.specialties)) {
      return [];
    }

    return data.specialties.map(normalizeSpecialty);
  } catch {
    return [];
  }
}
