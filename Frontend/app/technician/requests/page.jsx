'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getAssignedServiceRequests, getOpenServiceRequests } from '../../../services/service.service';
import RequestCard from '../../../components/technician/RequestCard';

const CONCURRENT_ACTIVE_STATES = new Set(['solicitado', 'cotizacion_inicial_enviada', 'aceptado', 'en_camino', 'en_reparacion', 'pendiente_pago', 'pago_enviado']);

export default function TechnicianRequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [modalidad, setModalidad] = useState('todas');
  const [tipoEquipo, setTipoEquipo] = useState('todos');
  const [busyRequestId, setBusyRequestId] = useState(null);
  const [activeAssignedCount, setActiveAssignedCount] = useState(0);

  useEffect(() => {
    async function loadRequests() {
      try {
        setLoading(true);
        const [openResponse, assignedResponse] = await Promise.all([
          getOpenServiceRequests(),
          getAssignedServiceRequests({ limit: 50 }),
        ]);
        const data = await openResponse.json().catch(() => ({ serviceRequests: [] }));
        const assignedData = await assignedResponse.json().catch(() => ({ serviceRequests: [] }));

        if (!openResponse.ok) {
          throw new Error(data.message || 'No se pudieron cargar las solicitudes');
        }

        if (!assignedResponse.ok) {
          throw new Error(assignedData.message || 'No se pudieron cargar tus servicios activos');
        }

        setRequests(data.serviceRequests || []);
        setActiveAssignedCount((assignedData.serviceRequests || []).filter((service) => CONCURRENT_ACTIVE_STATES.has(service.estado)).length);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadRequests();
  }, []);

  async function handleOpenChatForEstimate(requestId) {
    router.push(`/technician/requests/${requestId}`);
  }

  const availableTypes = useMemo(() => {
    return Array.from(new Set(requests.map((request) => request.tipo_equipo).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  }, [requests]);

  const filteredRequests = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return requests.filter((request) => {
      const matchesSearch = !normalizedSearch || [
        request.tipo_equipo,
        request.descripcion_problema,
        request.cliente_nombre,
        request.cliente_apellido,
        request.direccion,
      ].some((value) => String(value || '').toLowerCase().includes(normalizedSearch));

      const matchesModalidad = modalidad === 'todas' || request.modalidad === modalidad;
      const matchesType = tipoEquipo === 'todos' || request.tipo_equipo === tipoEquipo;

      return matchesSearch && matchesModalidad && matchesType;
    });
  }, [modalidad, requests, search, tipoEquipo]);

  const reachedCapacity = activeAssignedCount >= 2;

  return (
    <section className="mx-auto max-w-[1280px] px-5 py-8 md:px-10">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="section-title">Solicitudes disponibles</h1>
          <p className="mt-2 text-sm text-[#737688]">Las solicitudes mas recientes aparecen primero. Filtra por cliente, problema, modalidad o tipo de equipo.</p>
        </div>
        <div className="rounded-3xl bg-[#eff4ff] px-4 py-3 text-sm font-semibold text-[#003ec7]">
          {filteredRequests.length} solicitud{filteredRequests.length === 1 ? '' : 'es'} visible{filteredRequests.length === 1 ? '' : 's'}
        </div>
      </div>
      <div className="surface-card mb-6 grid gap-4 p-5 md:grid-cols-3">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Buscar</label>
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cliente, direccion o problema"
            className="w-full rounded-2xl border border-[#c3c5d9] bg-white px-4 py-3 text-[16px] text-[#0b1c30] outline-none focus:border-[#003ec7]"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Modalidad</label>
          <select
            value={modalidad}
            onChange={(event) => setModalidad(event.target.value)}
            className="w-full rounded-2xl border border-[#c3c5d9] bg-white px-4 py-3 text-[16px] text-[#0b1c30] outline-none focus:border-[#003ec7]"
          >
            <option value="todas">Todas</option>
            <option value="domicilio">Domicilio</option>
            <option value="taller">Taller</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Tipo de equipo</label>
          <select
            value={tipoEquipo}
            onChange={(event) => setTipoEquipo(event.target.value)}
            className="w-full rounded-2xl border border-[#c3c5d9] bg-white px-4 py-3 text-[16px] text-[#0b1c30] outline-none focus:border-[#003ec7]"
          >
            <option value="todos">Todos</option>
            {availableTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
      </div>
      {reachedCapacity ? (
        <div className="mb-6 rounded-3xl border border-[#ffd8a8] bg-[#fff7e8] px-5 py-4 text-sm text-[#805b00]">
          Ya no puedes tomar mas solicitudes hasta completar las que ya tienes activas. Finaliza o cancela alguna de tus solicitudes actuales para volver a enviar estimados iniciales en nuevas solicitudes.
        </div>
      ) : null}
      {loading ? (
        <div className="text-center text-[#737688]">Cargando solicitudes...</div>
      ) : error ? (
        <div className="text-center text-[#93000a]">Error: {error}</div>
      ) : filteredRequests.length === 0 ? (
        <div className="text-center text-[#737688]">No hay solicitudes disponibles en este momento</div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredRequests.map((request) => (
            <RequestCard
              key={request.id}
              title={request.tipo_equipo || request.codigo_servicio || `Solicitud #${request.id}`}
              detail={request.descripcion_problema || 'Sin descripcion'}
              badge={request.modalidad || 'Sin modalidad'}
              meta={[
                `Cliente: ${`${request.cliente_nombre || ''} ${request.cliente_apellido || ''}`.trim() || 'No disponible'}`,
                request.direccion ? `Direccion: ${request.direccion}` : null,
                request.fecha_solicitud ? `Solicitado: ${new Date(request.fecha_solicitud).toLocaleString()}` : null,
              ].filter(Boolean)}
              actions={[
                {
                  key: 'detail',
                  label: 'Ver detalles',
                  onClick: () => router.push(`/technician/requests/${request.id}`),
                  disabled: busyRequestId === request.id,
                  variant: 'secondary',
                },
                {
                  key: 'chat',
                  label: 'Chat y estimado',
                  onClick: () => handleOpenChatForEstimate(request.id),
                  disabled: busyRequestId === request.id,
                  variant: 'secondary',
                },
              ]}
            />
          ))}
        </div>
      )}
    </section>
  );
}
