'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ChatBox from '../../../../components/chat/ChatBox';
import MessageInput from '../../../../components/chat/MessageInput';
import RatingForm from '../../../../components/client/RatingForm';
import Modal from '../../../../components/common/Modal';
import { getServiceHistoryById } from '../../../../services/service.service';
import { getServicePayments } from '../../../../services/payment.service';
import { getServiceWarranty } from '../../../../services/warranty.service';
import { getServiceFiles } from '../../../../services/service-file.service';
import { getServiceParts } from '../../../../services/spare-part.service';
import { getTechnicianProfile } from '../../../../services/technician.service';
import { getRatingForService, getTechnicianRatings } from '../../../../services/rating.service';
import { getStateLabel } from '../../../../utils/serviceStatus';

const ServiceLocationMap = dynamic(() => import('../../../../components/common/ServiceLocationMap'), { ssr: false });

function SectionCard({ title, description, children }) {
  return (
    <div className="surface-card p-6">
      {title ? <h2 className="text-[20px] font-semibold text-[#0b1c30]">{title}</h2> : null}
      {description ? <p className="mt-2 text-sm leading-6 text-[#434656]">{description}</p> : null}
      <div className={title || description ? 'mt-4' : ''}>{children}</div>
    </div>
  );
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(toNumber(value));
}

function getPartSubtotal(part) {
  if (!part) return 0;
  const explicitSubtotal = part.subtotal ?? part.subTotal;
  if (explicitSubtotal !== undefined && explicitSubtotal !== null) {
    return toNumber(explicitSubtotal);
  }

  const quantity = part.quantity ?? part.cantidad;
  const unitPrice = part.unitPrice ?? part.priceUnitary ?? part.precioUnitario;
  return toNumber(quantity) * toNumber(unitPrice);
}

function getPartName(part) {
  return part?.name || part?.nombre || 'Repuesto sin nombre';
}

function getPartQuantity(part) {
  return part?.quantity ?? part?.cantidad ?? 0;
}

function getPartSupplier(part) {
  return part?.supplier || part?.proveedor || null;
}

function getPartWarrantyDays(part) {
  return part?.warrantyDays ?? part?.garantiaDias ?? 0;
}

function getServiceTitle(service) {
  const type = service?.tipo_equipo || 'Servicio';
  const brandModel = [service?.marca_equipo, service?.modelo_equipo].filter(Boolean).join(' ');
  return brandModel ? `${type} ${brandModel}` : type;
}

export default function TechnicianHistoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const serviceId = params?.id;
  const [service, setService] = useState(null);
  const [history, setHistory] = useState([]);
  const [payments, setPayments] = useState([]);
  const [warranty, setWarranty] = useState(null);
  const [files, setFiles] = useState([]);
  const [parts, setParts] = useState([]);
  const [clientRating, setClientRating] = useState(null);
  const [myRating, setMyRating] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    async function loadDetail() {
      if (!serviceId) {
        setError('ID de servicio no disponible');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const [detailRes, paymentsRes, warrantyRes, filesRes, partsRes, profileRes] = await Promise.all([
          getServiceHistoryById(serviceId),
          getServicePayments(serviceId),
          getServiceWarranty(serviceId),
          getServiceFiles(serviceId),
          getServiceParts(serviceId),
          getTechnicianProfile(),
        ]);

        const detailData = await detailRes.json().catch(() => ({}));
        const paymentsData = await paymentsRes.json().catch(() => ({}));
        const warrantyData = await warrantyRes.json().catch(() => ({}));
        const filesData = await filesRes.json().catch(() => ({}));
        const partsData = await partsRes.json().catch(() => ({}));
        const profileData = await profileRes.json().catch(() => ({}));

        if (!detailRes.ok) throw new Error(detailData.message || 'No se pudo cargar el historial del servicio');
        if (!paymentsRes.ok && paymentsRes.status !== 404) throw new Error(paymentsData.message || 'No se pudieron cargar los pagos');
        if (![200, 404].includes(warrantyRes.status)) throw new Error(warrantyData.message || 'No se pudo cargar la garantia');
        if (!filesRes.ok && filesRes.status !== 404) throw new Error(filesData.message || 'No se pudieron cargar los archivos');
        if (!partsRes.ok && partsRes.status !== 404) throw new Error(partsData.message || 'No se pudieron cargar los repuestos');
        if (!profileRes.ok) throw new Error(profileData.message || 'No se pudo cargar el perfil del tecnico');

        setService(detailData.service || null);
        setHistory(detailData.history || []);
        setPayments(paymentsData.payments || []);
        setWarranty(warrantyRes.ok ? warrantyData.warranty || null : null);
        setFiles(filesData.files || []);
        setParts(partsData.parts || []);

        const technicianId = profileData.profile?.usuarioId;
        if (technicianId) {
          const [ratingsRes, myRatingRes] = await Promise.all([
            getTechnicianRatings(technicianId, { limit: 50 }),
            getRatingForService(serviceId),
          ]);
          const ratingsData = await ratingsRes.json().catch(() => ({}));
          const myRatingData = await myRatingRes.json().catch(() => ({}));
          if (!ratingsRes.ok) throw new Error(ratingsData.message || 'No se pudieron cargar las calificaciones');
          if (!myRatingRes.ok) throw new Error(myRatingData.message || 'No se pudo cargar tu calificacion para el cliente');
          setClientRating((ratingsData.ratings || []).find((item) => Number(item.serviceId) === Number(serviceId)) || null);
          setMyRating(myRatingData.rating || null);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadDetail();
  }, [refreshTick, serviceId]);

  const imageFiles = files.filter((file) => String(file.type).toLowerCase() === 'imagen');
  const extraFiles = files.filter((file) => String(file.type).toLowerCase() !== 'imagen');
  const currentDomicilioAmount = toNumber(service?.precio_domicilio ?? 0);
  const currentDiagnosticoAmount = toNumber(service?.precio_diagnostico ?? 0);
  const currentLaborAmount = toNumber(service?.precio_mano_obra ?? 0);
  const currentPartsAmount = parts.reduce((total, part) => total + getPartSubtotal(part), 0) || toNumber(service?.precio_repuestos ?? 0);
  const currentTotalAmount = toNumber(service?.precio_acordado ?? (currentLaborAmount + currentPartsAmount + currentDomicilioAmount + currentDiagnosticoAmount));

  if (loading) {
    return <section className="mx-auto max-w-[1280px] px-5 py-8 text-center text-[#737688] md:px-10">Cargando detalle del historial...</section>;
  }

  if (error && !service) {
    return <section className="mx-auto max-w-[1280px] px-5 py-8 text-center text-[#93000a] md:px-10">{error}</section>;
  }

  if (!service) {
    return <section className="mx-auto max-w-[1280px] px-5 py-8 text-center text-[#737688] md:px-10">Servicio no encontrado</section>;
  }

  return (
    <section className="mx-auto max-w-[1280px] px-5 py-8 md:px-10">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <button type="button" onClick={() => router.push('/technician/history')} className="text-sm font-semibold text-[#003ec7]">Volver al historial</button>
          <h1 className="section-title mt-2">Detalle de historial {service.codigo_servicio || `#${service.id}`}</h1>
          <p className="mt-2 text-sm text-[#737688]">Consulta el resumen completo del servicio cerrado, su historial, montos, repuestos, garantía y calificaciones.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => setChatOpen(true)} className="inline-flex items-center justify-center rounded-2xl bg-[#003ec7] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0052ff]">Abrir chat</button>
        </div>
      </div>

      {error ? <div className="mb-4 rounded-2xl bg-[#ffdad6] px-4 py-3 text-sm text-[#93000a]">{error}</div> : null}

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
        <div className="space-y-6">
          <SectionCard title="Resumen del servicio" description="Información general del equipo, cliente y estado final del trabajo.">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-[22px] font-semibold text-[#0b1c30]">{getServiceTitle(service)}</h2>
              <span className="rounded-full bg-[#eff4ff] px-3 py-1 text-xs font-semibold uppercase tracking-[0.05em] text-[#003ec7]">{service.modalidad || 'Sin modalidad'}</span>
              <span className="rounded-full bg-[#fff3d6] px-3 py-1 text-xs font-semibold uppercase tracking-[0.05em] text-[#805b00]">{getStateLabel(service.estado)}</span>
            </div>
            <p className="mt-4 text-[16px] leading-7 text-[#434656]">{service.descripcion_problema}</p>
            <div className="mt-6 grid gap-3 text-sm text-[#434656] md:grid-cols-2">
              <p><span className="font-semibold text-[#0b1c30]">Cliente:</span> {`${service.cliente_nombre || ''} ${service.cliente_apellido || ''}`.trim() || 'No disponible'}</p>
              <p><span className="font-semibold text-[#0b1c30]">Correo:</span> {service.cliente_correo || 'No disponible'}</p>
              <p><span className="font-semibold text-[#0b1c30]">Solicitado:</span> {service.fecha_solicitud ? new Date(service.fecha_solicitud).toLocaleString() : 'No disponible'}</p>
              <p><span className="font-semibold text-[#0b1c30]">Finalizado:</span> {service.fecha_finalizacion ? new Date(service.fecha_finalizacion).toLocaleString() : 'No disponible'}</p>
              <p><span className="font-semibold text-[#0b1c30]">Marca:</span> {service.marca_equipo || 'No especificada'}</p>
              <p><span className="font-semibold text-[#0b1c30]">Modelo:</span> {service.modelo_equipo || 'No especificado'}</p>
              {service.direccion ? <p className="md:col-span-2"><span className="font-semibold text-[#0b1c30]">Direccion:</span> {service.direccion}</p> : null}
            </div>
          </SectionCard>

          <SectionCard title="Ubicación del servicio" description="Punto registrado del servicio o referencia del caso.">
            <ServiceLocationMap location={service.latitud && service.longitud ? { lat: Number(service.latitud), lng: Number(service.longitud), address: service.direccion || '' } : null} />
          </SectionCard>

          <SectionCard title="Montos y pagos" description="Desglose económico final y pagos relacionados al servicio.">
            <div className="grid gap-3 text-sm text-[#434656] md:grid-cols-2">
              <p><span className="font-semibold text-[#0b1c30]">Mano de obra:</span> {formatMoney(currentLaborAmount)}</p>
              <p><span className="font-semibold text-[#0b1c30]">Repuestos:</span> {formatMoney(currentPartsAmount)}</p>
              <p><span className="font-semibold text-[#0b1c30]">Domicilio:</span> {formatMoney(currentDomicilioAmount)}</p>
              <p><span className="font-semibold text-[#0b1c30]">Diagnóstico:</span> {formatMoney(currentDiagnosticoAmount)}</p>
              <p><span className="font-semibold text-[#0b1c30]">Total acordado:</span> {formatMoney(currentTotalAmount)}</p>
            </div>
            <div className="mt-5 border-t border-[#d8dbeb] pt-5">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#737688]">Pagos registrados</p>
              <div className="mt-3">
                {payments.length === 0 ? <p className="text-sm text-[#737688]">No hay pagos registrados.</p> : (
                  <div className="space-y-3">
                    {payments.map((payment) => (
                      <div key={payment.id} className="rounded-2xl bg-[#eff4ff] px-4 py-3 text-sm text-[#434656]">
                        <p className="font-semibold text-[#0b1c30]">{payment.method} · {payment.amount} {payment.currency}</p>
                        <p className="mt-1">Estado: {payment.state}</p>
                        {payment.reference ? <p className="mt-1">Referencia: {payment.reference}</p> : null}
                        {payment.receiptUrl ? <a href={payment.receiptUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex font-semibold text-[#003ec7] hover:underline">Ver comprobante</a> : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Evidencias y archivos" description="Archivos guardados durante la atención del servicio.">
            {imageFiles.length === 0 && extraFiles.length === 0 ? (
              <p className="text-sm text-[#737688]">No hay archivos adjuntos.</p>
            ) : (
              <div className="space-y-5">
                {imageFiles.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {imageFiles.map((file) => (
                      <a key={file.id} href={file.url} target="_blank" rel="noreferrer" className="overflow-hidden rounded-[24px] border border-[#d8dbeb] bg-[#eff4ff]">
                        <img src={file.url} alt={file.description || `Imagen ${file.id}`} className="h-56 w-full object-cover" />
                        <div className="px-4 py-3 text-sm text-[#434656]">{file.description || 'Imagen adjunta'}</div>
                      </a>
                    ))}
                  </div>
                ) : null}
                {extraFiles.length > 0 ? (
                  <div className="space-y-3">
                    {extraFiles.map((file) => (
                      <a key={file.id} href={file.url} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-2xl bg-[#eff4ff] px-4 py-3 text-sm text-[#0b1c30]">
                        <span>{file.description || `${file.type} adjunto`}</span>
                        <span className="font-semibold text-[#003ec7]">Abrir</span>
                      </a>
                    ))}
                  </div>
                ) : null}
              </div>
            )}
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard title="Repuestos" description="Listado de repuestos registrados para este servicio.">
            {parts.length === 0 ? <p className="text-sm text-[#737688]">No hay repuestos registrados.</p> : (
              <div className="space-y-3">
                {parts.map((part) => (
                  <div key={part.id} className="rounded-2xl bg-[#eff4ff] px-4 py-3 text-sm text-[#434656]">
                    <p className="font-semibold text-[#0b1c30]">{getPartName(part)}</p>
                    <p className="mt-1">Cantidad: {getPartQuantity(part)} · Subtotal: {formatMoney(getPartSubtotal(part))}</p>
                    {getPartSupplier(part) ? <p className="mt-1">Proveedor: {getPartSupplier(part)}</p> : null}
                    {getPartWarrantyDays(part) ? <p className="mt-1">Garantía: {getPartWarrantyDays(part)} días</p> : null}
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard title="Garantía" description="Cobertura registrada para este servicio.">
            {!warranty ? <p className="text-sm text-[#737688]">No hay garantía registrada.</p> : (
              <div className="space-y-3 text-sm text-[#434656]">
                <p><span className="font-semibold text-[#0b1c30]">Qué cubre:</span> {warranty.description}</p>
                <p><span className="font-semibold text-[#0b1c30]">Duración:</span> {warranty.durationDays} días</p>
                {warranty.observations ? <p><span className="font-semibold text-[#0b1c30]">Observaciones:</span> {warranty.observations}</p> : null}
                <p><span className="font-semibold text-[#0b1c30]">Fin:</span> {warranty.endDate || 'No disponible'}</p>
              </div>
            )}
          </SectionCard>

          <SectionCard title="Calificaciones" description="Valoraciones registradas al cerrar el servicio.">
            {clientRating ? (
              <div className="rounded-2xl bg-[#eff4ff] px-4 py-3 text-sm text-[#434656]">
                <p className="font-semibold text-[#0b1c30]">Calificación del cliente: {clientRating.score} / 5</p>
                {clientRating.comment ? <p className="mt-2">{clientRating.comment}</p> : null}
              </div>
            ) : <p className="text-sm text-[#737688]">Este servicio no tiene calificación del cliente.</p>}
            {myRating ? (
              <div className="mt-4 rounded-2xl bg-[#eff4ff] px-4 py-3 text-sm text-[#434656]">
                <p className="font-semibold text-[#0b1c30]">Tu calificación para el cliente: {myRating.score} / 5</p>
                {myRating.comment ? <p className="mt-2">{myRating.comment}</p> : null}
              </div>
            ) : (
              <div className="mt-4">
                <p className="text-sm text-[#737688]">No has calificado al cliente en este servicio.</p>
                <button
                  type="button"
                  onClick={() => setRatingModalOpen(true)}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#003ec7] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#0052ff]"
                >
                  <span className="material-symbols-outlined text-[16px]">star</span>
                  Calificar cliente
                </button>
              </div>
            )}
          </SectionCard>

          <SectionCard title="Historial del servicio" description="Cambios de estado y eventos registrados.">
            {history.length === 0 ? <p className="text-sm text-[#737688]">No hay movimientos registrados.</p> : (
              <div className="max-h-[308px] space-y-3 overflow-y-auto pr-2">
                {history.map((item) => (
                  <div key={item.id} className="rounded-2xl bg-[#eff4ff] px-4 py-3 text-sm text-[#434656]">
                    <p className="font-semibold text-[#0b1c30]">{item.estado}</p>
                    <p className="mt-1">{item.observacion || 'Sin observacion'}</p>
                    <p className="mt-1 text-xs text-[#737688]">{item.fecha ? new Date(item.fecha).toLocaleString() : 'Sin fecha'}</p>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </div>

      <Modal open={chatOpen} onClose={() => setChatOpen(false)} title={`Chat del servicio ${service.codigo_servicio || `#${service.id}`}`} widthClassName="max-w-5xl">
        <div className="flex h-[70vh] min-h-0 flex-col gap-4">
          <p className="text-sm leading-6 text-[#434656]">Revisa la conversación completa con el cliente asociada a este servicio.</p>
          <ChatBox serviceId={service.id} reloadKey={reloadKey} />
          <MessageInput serviceId={service.id} onMessageSent={() => setReloadKey((current) => current + 1)} />
        </div>
      </Modal>

      <Modal
        open={ratingModalOpen}
        title="Calificar cliente"
        onClose={() => setRatingModalOpen(false)}
        widthClassName="max-w-lg"
      >
        <RatingForm
          serviceId={service.id}
          description="Califica al cliente para dejar registro de la experiencia de trabajo entre ambas partes."
          placeholder="Escribe un comentario sobre el cliente"
          submitLabel="Calificar cliente"
          successMessage="Calificacion del cliente enviada correctamente"
          onSuccess={() => {
            setRatingModalOpen(false);
            setRefreshTick((current) => current + 1);
          }}
        />
      </Modal>
    </section>
  );
}
