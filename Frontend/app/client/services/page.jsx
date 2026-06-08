'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { cancelServiceRequest, getMyServices } from '../../../services/service.service';

const ACTIVE_STATES = new Set(['solicitado', 'cotizacion_inicial_enviada', 'aceptado', 'en_camino', 'en_reparacion', 'pendiente_pago', 'pago_enviado']);

function formatStatus(status) {
  return String(status || 'sin estado').replaceAll('_', ' ');
}

function getServiceTitle(service) {
  const type = service.tipo_equipo || 'Servicio';
  const brandModel = [service.marca_equipo, service.modelo_equipo].filter(Boolean).join(' ');
  return brandModel ? `${type} ${brandModel}` : type;
}

function canCancelService(service) {
  return !['en_camino', 'en_reparacion', 'pendiente_pago', 'pago_enviado', 'cancelado', 'finalizado'].includes(service.estado);
}

export default function ClientServicesPage() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cancelingId, setCancelingId] = useState(null);

  useEffect(() => {
    async function loadServices() {
      try {
        setLoading(true);
        const response = await getMyServices();
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.message || 'No se pudieron cargar los servicios');
        }

        setServices((data.serviceRequests || []).filter((service) => ACTIVE_STATES.has(service.estado)));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadServices();
  }, []);

  async function handleCancelService(serviceId) {
    setError(null);
    setCancelingId(serviceId);

    try {
      const response = await cancelServiceRequest(serviceId);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || 'No se pudo cancelar la solicitud');
      }

      setServices((current) => current
        .map((service) => (service.id === serviceId ? { ...service, ...data.serviceRequest } : service))
        .filter((service) => ACTIVE_STATES.has(service.estado)));
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setCancelingId(null);
    }
  }

  return (
    <section className="mx-auto max-w-[1280px] px-5 py-8 md:px-10">
      <div className="mb-6">
        <p className="text-sm uppercase tracking-[0.05em] text-[#737688]">Seguimiento</p>
        <h1 className="section-title mt-2">Mis servicios</h1>
      </div>
      {loading ? (
        <div className="text-center text-[#737688]">Cargando servicios...</div>
      ) : error ? (
        <div className="text-center text-[#93000a]">Error: {error}</div>
      ) : services.length === 0 ? (
        <div className="text-center text-[#737688]">
          No tienes servicios activos actualmente. <Link href="/client/request-service" className="text-[#003ec7] font-semibold">Solicita uno ahora</Link>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {services.map((service) => (
            <div key={service.id} className="surface-card p-6">
              <div className="mb-4 flex items-center justify-between gap-4">
                <h3 className="text-[20px] font-semibold text-[#0b1c30]">{getServiceTitle(service)}</h3>
                <span className="rounded-full bg-[#e5eeff] px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.05em] text-[#003ec7]">{formatStatus(service.estado)}</span>
              </div>
              <p className="text-[16px] leading-6 text-[#434656]">{service.descripcion_problema}</p>
              <div className="mt-4 space-y-1 text-sm text-[#737688]">
                <p>Codigo: {service.codigo_servicio || `#${service.id}`}</p>
                <p>Modalidad: {service.modalidad}</p>
                <p>Solicitado: {service.fecha_solicitud ? new Date(service.fecha_solicitud).toLocaleString() : 'N/A'}</p>
                {service.tecnico_nombre_completo ? <p>Tecnico: {service.tecnico_nombre_completo}</p> : null}
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href={`/client/services/${service.id}`} className="inline-flex rounded-full bg-[#003ec7] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0052ff]">
                  Ver detalle
                </Link>
                {service.tecnico_id ? (
                  <Link href={`/client/chat/${service.id}`} className="inline-flex rounded-full border border-[#c3c5d9] px-4 py-2 text-sm font-semibold text-[#0b1c30] transition-colors hover:bg-[#eff4ff]">
                    Abrir chat
                  </Link>
                ) : null}
                {canCancelService(service) ? (
                  <button
                    type="button"
                    className="inline-flex rounded-full border border-[#c3c5d9] px-4 py-2 text-sm font-semibold text-[#93000a] transition-colors hover:bg-[#ffdad6] disabled:cursor-not-allowed disabled:opacity-70"
                    onClick={() => handleCancelService(service.id)}
                    disabled={cancelingId === service.id}
                  >
                    {cancelingId === service.id ? 'Cancelando...' : 'Cancelar solicitud'}
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
