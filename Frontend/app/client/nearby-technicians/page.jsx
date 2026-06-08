'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import TechnicianCard from '../../../components/client/TechnicianCard';
import { getAvailableTechnicians } from '../../../services/technician.service';
import { getMyServices } from '../../../services/service.service';

const NearbyTechniciansMap = dynamic(() => import('../../../components/client/NearbyTechniciansMap'), { ssr: false });

export default function NearbyTechniciansPage() {
  const [technicians, setTechnicians] = useState([]);
  const [lastServiceLocation, setLastServiceLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadTechnicians() {
      try {
        setLoading(true);
        const [techniciansResponse, servicesResponse] = await Promise.all([
          getAvailableTechnicians(),
          getMyServices({ limit: 20 }),
        ]);
        const data = await techniciansResponse.json().catch(() => ({ technicians: [] }));
        const servicesData = await servicesResponse.json().catch(() => ({ serviceRequests: [] }));

        if (!techniciansResponse.ok) {
          throw new Error(data.message || 'No se pudieron cargar los tecnicos disponibles');
        }

        if (!servicesResponse.ok) {
          throw new Error(servicesData.message || 'No se pudieron cargar tus servicios recientes');
        }

        setTechnicians(data.technicians || []);

        const lastServiceWithLocation = (servicesData.serviceRequests || []).find((service) => service.latitud && service.longitud);
        if (lastServiceWithLocation) {
          setLastServiceLocation({
            lat: Number(lastServiceWithLocation.latitud),
            lng: Number(lastServiceWithLocation.longitud),
            address: lastServiceWithLocation.direccion || '',
          });
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadTechnicians();
  }, []);

  return (
    <section className="mx-auto max-w-[1280px] px-5 py-8 md:px-10">
      <div className="mb-6">
        <p className="text-sm uppercase tracking-[0.05em] text-[#737688]">Descubrir</p>
        <h1 className="section-title mt-2">Tecnicos disponibles cerca de ti</h1>
      </div>
      {loading ? (
        <div className="text-center text-[#737688]">Cargando técnicos...</div>
      ) : error ? (
        <div className="text-center text-[#93000a]">Error: {error}</div>
      ) : technicians.length === 0 ? (
        <div className="text-center text-[#737688]">No hay técnicos disponibles en este momento</div>
      ) : (
        <div className="space-y-6">
          <NearbyTechniciansMap technicians={technicians} lastServiceLocation={lastServiceLocation} />
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {technicians.map((tech) => (
              <TechnicianCard
                key={tech.usuario_id}
                name={[tech.nombre, tech.apellido].filter(Boolean).join(' ')}
                specialty={tech.especialidades || 'Sin especialidades registradas'}
                distance={tech.direccion_taller || tech.ciudad || 'Cobertura disponible'}
                rating={tech.calificacion_prom || '0'}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
