'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import RequestCard from '../../../components/technician/RequestCard';
import { cancelServiceRequest, getAssignedServiceRequests, updateAssignedServiceStatus } from '../../../services/service.service';
import { getStateLabel } from '../../../utils/serviceStatus';

const ACTIVE_SERVICE_STATES = new Set(['solicitado', 'cotizacion_inicial_enviada', 'aceptado', 'en_camino', 'en_reparacion', 'pendiente_pago', 'pago_enviado']);

const STATUS_FLOW = {
  aceptado: ['en_camino'],
  en_camino: ['en_reparacion'],
  en_reparacion: ['pendiente_pago'],
  pago_enviado: ['finalizado', 'pendiente_pago'],
};

const STATUS_LABELS = {
  en_camino: 'En camino',
  en_reparacion: 'En reparacion',
  pendiente_pago: 'Pendiente de pago',
  finalizado: 'Validar pago',
};

export default function TechnicianActiveServicesPage() {
  const router = useRouter();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyServiceId, setBusyServiceId] = useState(null);

  useEffect(() => {
    async function loadServices() {
      try {
        setLoading(true);
        const response = await getAssignedServiceRequests({ limit: 50 });
        const data = await response.json().catch(() => ({ serviceRequests: [] }));

        if (!response.ok) {
          throw new Error(data.message || 'No se pudieron cargar los servicios activos');
        }

        const activeServices = (data.serviceRequests || []).filter((service) => ACTIVE_SERVICE_STATES.has(service.estado));
        setServices(activeServices);
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setLoading(false);
      }
    }

    loadServices();
  }, []);

  async function handleStatusUpdate(serviceId, nextState) {
    setError(null);
    setBusyServiceId(serviceId);

    try {
      if (nextState === 'pendiente_pago' && services.find((service) => service.id === serviceId)?.estado !== 'pago_enviado') {
        router.push(`/technician/active-service/${serviceId}?openFinalPayment=1`);
        return;
      }

      const response = await updateAssignedServiceStatus(serviceId, { estado: nextState });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || 'No se pudo actualizar el estado');
      }

      setServices((current) => current.map((service) => (
        service.id === serviceId
          ? { ...service, estado: data.serviceRequest?.estado || nextState }
          : service
      )));
    } catch (updateError) {
      setError(updateError.message);
    } finally {
      setBusyServiceId(null);
    }
  }

  async function handleCancelService(serviceId) {
    setError(null);
    setBusyServiceId(serviceId);

    try {
      const response = await cancelServiceRequest(serviceId);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || 'No se pudo cancelar el servicio');
      }

      setServices((current) => current.filter((service) => service.id !== serviceId));
    } catch (cancelError) {
      setError(cancelError.message);
    } finally {
      setBusyServiceId(null);
    }
  }

  return (
    <section className="mx-auto max-w-[1280px] px-5 py-8 md:px-10">
      <div className="mb-6">
        <p className="text-sm uppercase tracking-[0.05em] text-[#737688]">Operaciones</p>
        <h1 className="section-title mt-2">Servicios activos</h1>
      </div>
      {loading ? (
        <div className="text-center text-[#737688]">Cargando servicios activos...</div>
      ) : error ? (
        <div className="text-center text-[#93000a]">Error: {error}</div>
      ) : services.length === 0 ? (
        <div className="text-center text-[#737688]">No tienes servicios activos en este momento</div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {services.map((service) => (
            <RequestCard
              key={service.id}
              title={service.tipo_equipo || service.codigo_servicio || `Servicio #${service.id}`}
              detail={service.descripcion_problema || 'Sin descripcion'}
              badge={getStateLabel(service.estado)}
              meta={[
                `Cliente: ${`${service.cliente_nombre || ''} ${service.cliente_apellido || ''}`.trim() || 'Cliente no disponible'}`,
                service.direccion ? `Direccion: ${service.direccion}` : null,
              ].filter(Boolean)}
              actions={[
                {
                  key: 'detail',
                  label: 'Ver detalle',
                  onClick: () => router.push(`/technician/active-service/${service.id}`),
                  disabled: busyServiceId === service.id,
                  variant: 'secondary',
                },
                ...((STATUS_FLOW[service.estado] || []).map((nextState) => ({
                  key: nextState,
                  label: busyServiceId === service.id ? 'Procesando...' : (STATUS_LABELS[nextState] || nextState),
                  onClick: () => handleStatusUpdate(service.id, nextState),
                  disabled: busyServiceId === service.id,
                }))),
                ...(!['en_reparacion', 'pendiente_pago', 'pago_enviado', 'finalizado', 'cancelado'].includes(service.estado)
                  ? [{
                    key: 'cancel',
                    label: busyServiceId === service.id ? 'Procesando...' : 'Cancelar',
                    onClick: () => handleCancelService(service.id),
                    disabled: busyServiceId === service.id,
                    variant: 'secondary',
                  }]
                  : []),
              ]}
            />
          ))}
        </div>
      )}
    </section>
  );
}
