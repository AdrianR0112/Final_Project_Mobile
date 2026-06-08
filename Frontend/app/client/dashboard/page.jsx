'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getMyServices } from '../../../services/service.service';
import { getServicePayments } from '../../../services/payment.service';
import { getServiceWarranty } from '../../../services/warranty.service';

const ACTIVE_STATES = new Set(['solicitado', 'cotizacion_inicial_enviada', 'aceptado', 'en_camino', 'en_reparacion', 'pendiente_pago', 'pago_enviado']);

function formatStatus(status) {
  return String(status || 'sin estado').replaceAll('_', ' ');
}

function getServiceTitle(service) {
  const type = service.tipo_equipo || 'Servicio';
  const brandModel = [service.marca_equipo, service.modelo_equipo].filter(Boolean).join(' ');
  return brandModel ? `${type} ${brandModel}` : type;
}

export default function ClientDashboardPage() {
  const [services, setServices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [warrantyServices, setWarrantyServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const servicesRes = await getMyServices({ limit: 20 });
        const servicesData = await servicesRes.json().catch(() => ({}));

        if (!servicesRes.ok) {
          throw new Error(servicesData.message || 'No se pudieron cargar las solicitudes');
        }

        const serviceRequests = servicesData.serviceRequests || [];
        const serviceIds = serviceRequests.map((service) => service.id).filter(Boolean);
        const paymentResponses = await Promise.all(serviceIds.map((id) => getServicePayments(id)));
        const warrantyResponses = await Promise.all(serviceIds.map((id) => getServiceWarranty(id)));
        const paymentPayloads = await Promise.all(paymentResponses.map((response) => response.json().catch(() => ({}))));
        const warrantyPayloads = await Promise.all(warrantyResponses.map((response) => response.json().catch(() => ({}))));

        const paymentEntries = paymentPayloads.flatMap((payload, index) => {
          const service = serviceRequests[index];
          return (payload.payments || []).map((payment) => ({
            ...payment,
            serviceId: service?.id,
            serviceTitle: service ? getServiceTitle(service) : 'Servicio',
          }));
        });

        const warrantyEntries = warrantyPayloads.flatMap((payload, index) => {
          const service = serviceRequests[index];
          if (!payload.warranty || !service) {
            return [];
          }

          return [{
            id: `${service.id}-warranty`,
            serviceId: service.id,
            serviceTitle: getServiceTitle(service),
            description: payload.warranty.description || 'Garantia registrada',
            durationDays: payload.warranty.durationDays || null,
            active: Boolean(payload.warranty.active),
          }];
        });

        setServices(serviceRequests);
        setPayments(paymentEntries);
        setWarrantyServices(warrantyEntries);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const activeRequests = services.filter((service) => ACTIVE_STATES.has(service.estado));
  const finalizedRequests = services.filter((service) => service.estado === 'finalizado');
  const paymentEntries = payments.slice(0, 5);
  const warrantyEntries = warrantyServices.slice(0, 5);

  return (
    <div>
      <div className="mx-auto flex max-w-[1280px] flex-col gap-10 px-5 py-8 md:px-10">
        <section className="overflow-hidden rounded-[28px] border border-[#c3d4ff] bg-gradient-to-br from-[#003ec7] via-[#0052ff] to-[#0b1c30] shadow-[0_24px_60px_rgba(0,62,199,0.22)]">
          <div className="grid gap-6 p-6 md:grid-cols-[1.25fr_0.75fr] md:items-center md:p-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/90">Nueva solicitud</p>
              <h2 className="mt-2 text-[24px] font-bold leading-[1.15] text-white md:text-[32px]">¿Necesitas soporte técnico otra vez?</h2>
              <p className="mt-3 max-w-2xl text-[16px] leading-6 text-[#f3f6ff]">Crea una nueva solicitud para registrar un equipo, describir el problema y coordinar atención con un técnico.</p>
            </div>
            <div className="flex md:justify-end">
              <Link href="/client/request-service" className="inline-flex items-center justify-center rounded-full border border-white/30 bg-white px-6 py-3 text-[14px] font-semibold uppercase tracking-[0.05em] text-[#003ec7] shadow-[0_10px_24px_rgba(255,255,255,0.18)] transition-colors hover:bg-[#eff4ff]">
                Crear nueva solicitud
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <article className="surface-card p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#0b1c30]">Servicios activos</p>
            <p className="mt-2 text-[28px] font-bold text-[#003ec7]">{activeRequests.length}</p>
          </article>
          <article className="surface-card p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#0b1c30]">Servicios con garantía</p>
            <p className="mt-2 text-[28px] font-bold text-[#0b1c30]">{warrantyServices.length}</p>
          </article>
          <article className="surface-card p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#0b1c30]">Servicios finalizados</p>
            <p className="mt-2 text-[28px] font-bold text-[#0b1c30]">{finalizedRequests.length}</p>
          </article>
          <article className="surface-card p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#0b1c30]">Pagos registrados</p>
            <p className="mt-2 text-[28px] font-bold text-[#0b1c30]">{payments.length}</p>
          </article>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="surface-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[20px] font-semibold text-[#0b1c30]">Servicios activos</h2>
              <Link href="/client/history" className="text-sm font-semibold text-[#003ec7] hover:underline">Ver historial</Link>
            </div>
            {loading ? (
              <div className="text-center text-[#737688]">Cargando solicitudes...</div>
            ) : error ? (
              <div className="text-center text-[#93000a]">Error al cargar: {error}</div>
            ) : activeRequests.length === 0 ? (
              <div className="text-center text-[#737688]">No tienes solicitudes activas</div>
            ) : (
              <div className="space-y-3">
                {activeRequests.map((request) => (
                  <div key={request.id} className="rounded-2xl border border-[#d8dbeb] bg-white px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-[16px] font-semibold text-[#0b1c30]">{getServiceTitle(request)}</h3>
                        <p className="mt-1 text-sm text-[#434656]">{request.descripcion_problema}</p>
                        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.05em] text-[#737688]">{request.codigo_servicio || `#${request.id}`} • {formatStatus(request.estado)}</p>
                      </div>
                      <Link href={`/client/services/${request.id}`} className="text-sm font-semibold text-[#003ec7]">Detalle</Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="surface-card p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-[20px] font-semibold text-[#0b1c30]">Servicios con garantía</h2>
                <Link href="/client/services" className="text-sm font-semibold text-[#003ec7] hover:underline">Ver servicios</Link>
              </div>
              {loading ? (
                <div className="text-center text-[#737688]">Cargando garantías...</div>
              ) : warrantyEntries.length === 0 ? (
                <div className="text-center text-[#737688]">No tienes servicios con garantía registrada</div>
              ) : (
                <div className="space-y-3">
                  {warrantyEntries.map((warrantyItem) => (
                    <div key={warrantyItem.id} className="rounded-2xl bg-[#eff4ff] px-4 py-3 text-sm text-[#434656]">
                      <p className="font-semibold text-[#0b1c30]">{warrantyItem.serviceTitle}</p>
                      <p className="mt-1">{warrantyItem.description}</p>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.05em] text-[#737688]">
                        {warrantyItem.durationDays ? `${warrantyItem.durationDays} días` : 'Sin duración definida'} • {warrantyItem.active ? 'Activa' : 'Inactiva'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="surface-card p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-[20px] font-semibold text-[#0b1c30]">Pagos registrados</h2>
                <Link href="/client/services" className="text-sm font-semibold text-[#003ec7] hover:underline">Ver servicios</Link>
              </div>
              {loading ? (
                <div className="text-center text-[#737688]">Cargando pagos...</div>
              ) : paymentEntries.length === 0 ? (
                <div className="text-center text-[#737688]">No tienes pagos registrados</div>
              ) : (
                <div className="space-y-3">
                  {paymentEntries.map((payment) => (
                    <div key={payment.id} className="rounded-2xl border border-[#d8dbeb] bg-white px-4 py-3 text-sm text-[#434656]">
                      <p className="font-semibold text-[#0b1c30]">{payment.serviceTitle}</p>
                      <p className="mt-1">{payment.method} · {payment.amount} {payment.currency}</p>
                      <p className="mt-1 text-xs text-[#737688]">Estado: {payment.state}</p>
                      {payment.notes ? <p className="mt-1 text-xs text-[#737688]">{payment.notes}</p> : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="surface-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[20px] font-semibold text-[#0b1c30]">Servicios finalizados</h2>
            <Link href="/client/services" className="text-sm font-semibold text-[#003ec7] hover:underline">Ver todos</Link>
          </div>
          {loading ? (
            <div className="text-center text-[#737688]">Cargando servicios finalizados...</div>
          ) : finalizedRequests.length === 0 ? (
            <div className="text-center text-[#737688]">Aún no tienes servicios finalizados</div>
          ) : (
            <div className="space-y-3">
              {finalizedRequests.map((request) => (
                <div key={request.id} className="rounded-2xl border border-[#d8dbeb] bg-[#f8faff] px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-[16px] font-semibold text-[#0b1c30]">{getServiceTitle(request)}</h3>
                      <p className="mt-1 text-sm text-[#434656]">{request.descripcion_problema}</p>
                      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.05em] text-[#737688]">{request.codigo_servicio || `#${request.id}`}</p>
                    </div>
                    <Link href={`/client/services/${request.id}`} className="text-sm font-semibold text-[#003ec7]">Detalle</Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
