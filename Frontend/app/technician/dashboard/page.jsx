'use client';

import { useEffect, useState } from 'react';
import AvailabilityToggle from '../../../components/technician/AvailabilityToggle';
import Link from 'next/link';
import { getAssignedServiceRequests, getServiceHistory, updateAssignedServiceStatus } from '../../../services/service.service';
import { getTechnicianProfile } from '../../../services/technician.service';
import { getNotificationsWithFilters } from '../../../services/notification.service';
import { useSocket } from '../../../hooks/useSocket';
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

function isSameDay(dateA, dateB) {
  return dateA.getFullYear() === dateB.getFullYear()
    && dateA.getMonth() === dateB.getMonth()
    && dateA.getDate() === dateB.getDate();
}

function getServiceEarnedAmount(service) {
  const value = service?.precio_acordado ?? service?.precio_total_final ?? service?.precio_total ?? 0;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function formatMoney(amount, currency) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: currency || 'USD',
    minimumFractionDigits: 2,
  }).format(Number(amount || 0));
}

export default function TechnicianDashboardPage() {
  const [profile, setProfile] = useState(null);
  const [services, setServices] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingServiceId, setUpdatingServiceId] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const { socket } = useSocket();

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [profileRes, servicesRes, notificationsRes, historyRes] = await Promise.all([
          getTechnicianProfile(),
          getAssignedServiceRequests({ limit: 20 }),
          getNotificationsWithFilters({ limit: 4 }),
          getServiceHistory({ limit: 200 }),
        ]);
        const profileData = await profileRes.json().catch(() => ({}));
        const servicesData = await servicesRes.json().catch(() => ({ serviceRequests: [] }));
        const notificationsData = await notificationsRes.json().catch(() => ({}));
        const historyData = await historyRes.json().catch(() => ({ serviceHistory: [] }));

        if (!profileRes.ok) {
          throw new Error(profileData.message || 'No se pudo cargar el perfil');
        }

        if (!servicesRes.ok) {
          throw new Error(servicesData.message || 'No se pudieron cargar los servicios asignados');
        }

        if (!notificationsRes.ok) {
          throw new Error(notificationsData.message || 'No se pudieron cargar las notificaciones');
        }

        if (!historyRes.ok) {
          throw new Error(historyData.message || 'No se pudo cargar el historial del tecnico');
        }

        const profile = profileData.profile || null;
        setProfile(profile);
        const activeServices = (servicesData.serviceRequests || []).filter((service) => ACTIVE_SERVICE_STATES.has(service.estado));

        const today = new Date();
        const earnedToday = (historyData.serviceHistory || []).reduce((total, service) => {
          if (service.estado !== 'finalizado' || !service.fecha_finalizacion) {
            return total;
          }

          const completedAt = new Date(service.fecha_finalizacion);
          if (Number.isNaN(completedAt.getTime()) || !isSameDay(completedAt, today)) {
            return total;
          }

          return total + getServiceEarnedAmount(service);
        }, 0);

        setNotifications(notificationsData.notifications || []);
        setTodayEarnings(earnedToday);
        setServices(activeServices.slice(0, 2));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [refreshTick]);

  useEffect(() => {
    if (!socket) {
      return undefined;
    }

    const handleRealtimeRefresh = () => {
      setRefreshTick((current) => current + 1);
    };

    socket.on('service:updated', handleRealtimeRefresh);

    return () => {
      socket.off('service:updated', handleRealtimeRefresh);
    };
  }, [socket]);

  async function handleStatusUpdate(serviceId, nextState) {
    setUpdatingServiceId(serviceId);
    try {
      const response = await updateAssignedServiceStatus(serviceId, { estado: nextState });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message);
      setServices((current) => {
        const updated = data.serviceRequest || null;
        return current.map((s) => (s.id === serviceId && updated ? { ...s, estado: updated.estado } : s));
      });
    } catch {
      // silencioso
    } finally {
      setUpdatingServiceId(null);
    }
  }

  const stats = [
    { title: 'Servicios completados', value: profile?.totalServicios || 0, accent: 'Total acumulado' },
    { title: 'Calificacion promedio', value: profile?.calificacionProm || '0', accent: `${profile?.totalCancelaciones || 0} cancelaciones` },
    { title: 'Total ganado hoy', value: formatMoney(todayEarnings, profile?.moneda), accent: 'Servicios finalizados hoy' },
  ];

  return (
    <div className="mx-auto max-w-[1280px] px-5 py-8 md:px-10">
      <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="section-title">Bienvenido de nuevo, {profile?.usuario?.nombre || 'Tecnico'}.</h1>
          <p className="muted-copy mt-2">Aqui tienes tu rendimiento y el resumen de tus servicios actuales.</p>
        </div>
        <AvailabilityToggle
          initialAvailable={profile?.disponible}
          onChange={(nextProfile, nextValue) => {
            setProfile((current) => nextProfile || (current ? { ...current, disponible: nextValue } : current));
          }}
        />
      </header>
      {loading ? (
        <div className="text-center text-[#737688]">Cargando datos...</div>
      ) : error ? (
        <div className="text-center text-[#93000a]">Error: {error}</div>
      ) : (
        <>
          <section className="grid gap-6 md:grid-cols-3">
            {stats.map((stat, index) => (
              <article key={stat.title} className={`${index === 2 ? 'bg-[#003ec7] text-white' : 'surface-card'} p-6`}>
                <p className={`text-sm uppercase tracking-[0.05em] ${index === 2 ? 'text-[#dde1ff]' : 'text-[#434656]'}`}>{stat.title}</p>
                <p className="mt-4 text-[32px] font-bold leading-[1.2] tracking-[-0.01em]">{stat.value}</p>
                <p className={`mt-2 text-sm font-semibold ${index === 2 ? 'text-white/80' : 'text-[#003ec7]'}`}>{stat.accent}</p>
              </article>
            ))}
          </section>
          <section className="mt-8 grid gap-6 xl:grid-cols-3">
            <div className="surface-card xl:col-span-2">
              <div className="flex items-center justify-between border-b border-[#c3c5d9] bg-[#eff4ff] px-6 py-4">
                <h2 className="text-[20px] font-semibold text-[#0b1c30]">Servicios activos</h2>
                <Link href="/technician/active-services" className="text-sm font-semibold text-[#003ec7]">Ver todos</Link>
              </div>
              <div className="space-y-4 p-6">
                {services.length === 0 ? (
                  <p className="text-center text-[#737688]">No tienes servicios activos en este momento</p>
                ) : (
                  services.map((service) => (
                    <div key={service.id} className="rounded-3xl border border-[#c3c5d9] bg-white p-5">
                      <Link href={`/technician/active-service/${service.id}`} className="surface-card-hover block cursor-pointer">
                        <h3 className="text-[20px] font-semibold text-[#0b1c30]">{service.tipo_equipo || service.codigo_servicio || `Servicio #${service.id}`}</h3>
                        <p className="mt-2 text-sm text-[#434656]">{service.descripcion_problema || 'Sin descripcion'}</p>
                        {service.cliente_nombre ? <p className="mt-2 text-xs text-[#737688]">Cliente: {`${service.cliente_nombre} ${service.cliente_apellido || ''}`.trim()}</p> : null}
                      </Link>
                      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[#d8dbeb] pt-4">
                        <span className="rounded-full bg-[#eff4ff] px-3 py-1 text-xs font-semibold text-[#003ec7]">{getStateLabel(service.estado)}</span>
                        {(STATUS_FLOW[service.estado] || []).map((ns) => (
                          <button
                            key={ns}
                            type="button"
                            onClick={(e) => { e.preventDefault(); handleStatusUpdate(service.id, ns); }}
                            disabled={updatingServiceId === service.id}
                            className="rounded-full bg-[#003ec7] px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-[#0052ff] disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            {updatingServiceId === service.id ? '...' : STATUS_LABELS[ns] || ns}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            <aside className="space-y-6">
              <div className="surface-card p-6">
                <h2 className="text-[20px] font-semibold text-[#0b1c30]">Perfil</h2>
                <p className="mt-4 text-sm text-[#434656]">Email: {profile?.usuario?.correo || 'N/A'}</p>
                <p className="mt-2 text-sm text-[#434656]">Especializaciones: {profile?.especialidades?.join(', ') || 'N/A'}</p>
                <p className="mt-2 text-sm text-[#434656]">Disponible: {profile?.disponible ? 'Si' : 'No'}</p>
              </div>
              <div className="surface-card p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-[20px] font-semibold text-[#0b1c30]">Alertas recientes</h2>
                  <Link href="/technician/notifications" className="text-sm font-semibold text-[#003ec7]">Ver todas</Link>
                </div>
                {notifications.length === 0 ? <p className="text-sm text-[#737688]">No tienes notificaciones recientes.</p> : (
                  <div className="space-y-3">
                    {notifications.map((notification) => (
                      <div key={notification.id} className={`rounded-2xl px-4 py-3 text-sm ${notification.read ? 'border border-[#c3c5d9] bg-white text-[#434656]' : 'bg-[#eff4ff] text-[#0b1c30]'}`}>
                        <p className="font-semibold">{notification.title}</p>
                        <p className="mt-1">{notification.message}</p>
                        <p className="mt-1 text-xs text-[#737688]">{notification.date ? new Date(notification.date).toLocaleString() : 'Sin fecha'}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </aside>
          </section>
        </>
      )}
    </div>
  );
}
