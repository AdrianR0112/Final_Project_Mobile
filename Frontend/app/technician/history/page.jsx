'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getServiceHistory } from '../../../services/service.service';
import { getTechnicianProfile } from '../../../services/technician.service';
import { getTechnicianRatings } from '../../../services/rating.service';

const HISTORY_STATES = new Set(['cancelado', 'finalizado']);

function formatStatus(status) {
  return String(status || 'sin estado').replaceAll('_', ' ');
}

function getServiceTitle(service) {
  const type = service.tipo_equipo || 'Servicio';
  const brandModel = [service.marca_equipo, service.modelo_equipo].filter(Boolean).join(' ');
  return brandModel ? `${type} ${brandModel}` : type;
}

export default function TechnicianHistoryPage() {
  const [history, setHistory] = useState([]);
  const [ratingsByServiceId, setRatingsByServiceId] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function loadRatings() {
    const profileResponse = await getTechnicianProfile();
    const profileData = await profileResponse.json().catch(() => ({}));

    if (!profileResponse.ok) {
      throw new Error(profileData.message || 'No se pudo cargar el perfil del tecnico');
    }

    const technicianId = profileData.profile?.usuarioId;
    if (!technicianId) {
      setRatingsByServiceId({});
      return;
    }

    const ratingsResponse = await getTechnicianRatings(technicianId, { limit: 100 });
    const ratingsData = await ratingsResponse.json().catch(() => ({}));

    if (!ratingsResponse.ok) {
      throw new Error(ratingsData.message || 'No se pudieron cargar las calificaciones');
    }

    setRatingsByServiceId(Object.fromEntries((ratingsData.ratings || []).map((rating) => [Number(rating.serviceId), rating])));
  }

  useEffect(() => {
    async function loadHistory() {
      try {
        setLoading(true);
        const response = await getServiceHistory();
        const data = await response.json().catch(() => ({ serviceHistory: [] }));

        if (!response.ok) {
          throw new Error(data.message || 'No se pudo cargar el historial');
        }

        setHistory((data.serviceHistory || []).filter((service) => HISTORY_STATES.has(service.estado)));
        await loadRatings();
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
  }, []);

  return (
    <section className="mx-auto max-w-[1280px] px-5 py-8 md:px-10">
      <h1 className="section-title mb-6">Historial de servicios</h1>
      {loading ? (
        <div className="text-center text-[#737688]">Cargando historial...</div>
      ) : error ? (
        <div className="text-center text-[#93000a]">{error}</div>
      ) : history.length === 0 ? (
        <div className="text-center text-[#737688]">No tienes servicios finalizados o cancelados en tu historial</div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {history.map((service) => {
            const rating = ratingsByServiceId[Number(service.id)] || null;

            return (
              <article key={service.id} className="surface-card surface-card-hover overflow-hidden">
                <div className="flex flex-1 flex-col p-6">
                  <p className="text-xs uppercase tracking-[0.05em] text-[#737688]">{service.codigo_servicio || `#${service.id}`}</p>
                  <h2 className="mt-2 text-[18px] font-semibold leading-tight text-[#0b1c30]">{getServiceTitle(service)}</h2>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#434656]">{service.descripcion_problema}</p>
                  <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-[#737688]">
                    <span className="rounded-full bg-[#eff4ff] px-3 py-1 font-semibold text-[#003ec7]">{formatStatus(service.estado)}</span>
                    {service.ultimo_cambio_fecha ? <span>{new Date(service.ultimo_cambio_fecha).toLocaleDateString()}</span> : null}
                  </div>
                  {service.cliente_nombre ? <p className="mt-2 text-xs text-[#737688]">Cliente: {`${service.cliente_nombre} ${service.cliente_apellido || ''}`.trim()}</p> : null}
                  {rating ? (
                    <div className="mt-4 rounded-2xl bg-[#eff4ff] px-4 py-3 text-sm text-[#434656]">
                      <p className="font-semibold text-[#0b1c30]">Calificacion recibida: {rating.score} / 5</p>
                      {rating.comment ? <p className="mt-1">{rating.comment}</p> : null}
                      <p className="mt-1 text-xs text-[#737688]">{rating.date ? new Date(rating.date).toLocaleString() : 'Sin fecha'}</p>
                    </div>
                  ) : null}
                  <div className="mt-auto flex flex-wrap items-center gap-3 pt-4">
                    <Link href={`/technician/history/${service.id}`} className="inline-flex rounded-full border border-[#c3c5d9] px-4 py-2 text-xs font-semibold text-[#0b1c30] transition-colors hover:bg-[#eff4ff]">
                      Ver detalle
                    </Link>
                    <Link href={`/technician/chat/${service.id}`} className="inline-flex items-center gap-1.5 rounded-full bg-[#003ec7] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#0052ff]">
                      <span className="material-symbols-outlined text-[16px]">chat</span>
                      Abrir chat
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
