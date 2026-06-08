'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import ChatBox from '../../../../components/chat/ChatBox';
import MessageInput from '../../../../components/chat/MessageInput';
import RatingForm from '../../../../components/client/RatingForm';
import Modal from '../../../../components/common/Modal';
import { markServiceMessagesAsRead } from '../../../../services/chat.service';
import { acceptInitialQuote, cancelServiceRequest, getMyServiceById, getServiceHistoryById, rejectInitialQuote } from '../../../../services/service.service';
import { createServicePayment, getServicePayments } from '../../../../services/payment.service';
import { getServiceWarranty } from '../../../../services/warranty.service';
import { getServiceFiles } from '../../../../services/service-file.service';
import { getServiceParts } from '../../../../services/spare-part.service';
import { getRatingForService } from '../../../../services/rating.service';
import { useSocket } from '../../../../hooks/useSocket';
import { getStateLabel } from '../../../../utils/serviceStatus';

function getServiceTitle(service) {
  const type = service.tipo_equipo || 'Servicio';
  const brandModel = [service.marca_equipo, service.modelo_equipo].filter(Boolean).join(' ');
  return brandModel ? `${type} ${brandModel}` : type;
}

function getPartSubtotal(part) {
  if (!part) {
    return 0;
  }

  const explicitSubtotal = part.subtotal ?? part.subTotal;
  if (explicitSubtotal !== undefined && explicitSubtotal !== null) {
    return Number(explicitSubtotal || 0);
  }

  const quantity = part.quantity ?? part.cantidad;
  const unitPrice = part.unitPrice ?? part.priceUnitary ?? part.precioUnitario;
  return Number(quantity || 0) * Number(unitPrice || 0);
}

function formatAmount(value) {
  return Number(value || 0).toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function requiresPaymentReceipt(method) {
  return ['transferencia', 'tarjeta', 'otro'].includes(method);
}

function SectionCard({ title, description, children, className = '' }) {
  return (
    <section className={`surface-card p-6 ${className}`.trim()}>
      {title ? <h2 className="text-[20px] font-semibold text-[#0b1c30]">{title}</h2> : null}
      {description ? <p className="mt-2 text-sm leading-6 text-[#434656]">{description}</p> : null}
      <div className={title || description ? 'mt-4' : ''}>{children}</div>
    </section>
  );
}

export default function ClientServiceDetailPage() {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const serviceId = params?.id;
  const [service, setService] = useState(null);
  const [history, setHistory] = useState([]);
  const [payments, setPayments] = useState([]);
  const [warranty, setWarranty] = useState(null);
  const [files, setFiles] = useState([]);
  const [parts, setParts] = useState([]);
  const [rating, setRating] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('ubicacion');
  const [isCanceling, setIsCanceling] = useState(false);
  const [isAcceptingQuote, setIsAcceptingQuote] = useState(false);
  const [isRejectingQuote, setIsRejectingQuote] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    metodoPago: 'efectivo',
    referenciaTransaccion: '',
    notas: '',
  });
  const [paymentReceiptFile, setPaymentReceiptFile] = useState(null);
  const [paymentMessage, setPaymentMessage] = useState('');
  const [refreshTick, setRefreshTick] = useState(0);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [isFinalPaymentModalOpen, setIsFinalPaymentModalOpen] = useState(false);
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const { socket, joinServiceRoom } = useSocket();
  const latestLoadIdRef = useRef(0);
  const lastAutoOpenedQuoteRef = useRef(null);
  const lastAutoOpenedPaymentRef = useRef(null);
  const lastAutoOpenedRatingRef = useRef(null);

  const paymentState = service?.estado_pago || 'pendiente';
  const priceState = service?.estado_precio || 'sin_cotizar';
  const diagnosticPrice = Number(service?.precio_diagnostico || 0);
  const laborPrice = Number(service?.precio_mano_obra || 0);
  const partsPrice = parts.reduce((total, part) => total + getPartSubtotal(part), 0) || Number(service?.precio_repuestos || 0);
  const travelPrice = Number(service?.precio_domicilio || 0);
  const totalPrice = diagnosticPrice + laborPrice + partsPrice + travelPrice;
  const agreedPrice = service?.precio_acordado ?? null;
  const priceNote = service?.nota_precio || null;
  const hasRating = Boolean(rating);
  const imageFiles = useMemo(() => files.filter((file) => String(file.type).toLowerCase() === 'imagen'), [files]);
  const extraFiles = useMemo(() => files.filter((file) => String(file.type).toLowerCase() !== 'imagen'), [files]);
  const isHistoryView = pathname?.startsWith('/client/history/');
  const backHref = isHistoryView ? '/client/history' : '/client/services';
  const backLabel = isHistoryView ? 'Volver a historial' : 'Volver a mis servicios';

  const tabs = [
    { key: 'ubicacion', label: 'Ubicacion' },
    { key: 'historial', label: 'Historial' },
    { key: 'pagos', label: 'Pagos' },
    { key: 'repuestos', label: 'Repuestos' },
    { key: 'archivos', label: 'Archivos' },
    { key: 'garantia', label: 'Garantia' },
  ];

  const quoteSignature = service
    ? [
      service.id,
      service.estado,
      service.precio_diagnostico,
      service.precio_mano_obra,
      service.precio_domicilio,
      service.precio_repuestos,
      service.precio_acordado,
      service.nota_precio,
    ].join('|')
    : null;
  const finalPaymentSignature = service
    ? [
      service.id,
      service.estado,
      service.precio_diagnostico,
      service.precio_mano_obra,
      service.precio_domicilio,
      service.precio_repuestos,
      service.precio_acordado,
      service.nota_precio,
      totalPrice,
    ].join('|')
    : null;
  const ratingSignature = service
    ? [service.id, service.estado, hasRating ? 'rated' : 'pending'].join('|')
    : null;
  const paymentRequiresReceipt = requiresPaymentReceipt(paymentForm.metodoPago);

  useEffect(() => {
    if (!tabs.some((tab) => tab.key === activeTab) && tabs[0]) {
      setActiveTab(tabs[0].key);
    }
  }, [activeTab, tabs]);

  useEffect(() => {
    if (service?.estado !== 'cotizacion_inicial_enviada') {
      setIsQuoteModalOpen(false);
      return;
    }

    if (quoteSignature && lastAutoOpenedQuoteRef.current !== quoteSignature) {
      lastAutoOpenedQuoteRef.current = quoteSignature;
      setIsQuoteModalOpen(true);
    }
  }, [quoteSignature, service?.estado]);

  useEffect(() => {
    if (service?.estado !== 'pendiente_pago') {
      setIsFinalPaymentModalOpen(false);
      return;
    }

    if (finalPaymentSignature && lastAutoOpenedPaymentRef.current !== finalPaymentSignature) {
      lastAutoOpenedPaymentRef.current = finalPaymentSignature;
      setIsFinalPaymentModalOpen(true);
    }
  }, [finalPaymentSignature, service?.estado]);

  useEffect(() => {
    if (service?.estado !== 'finalizado' || hasRating) {
      setIsRatingModalOpen(false);
      return;
    }

    if (ratingSignature && lastAutoOpenedRatingRef.current !== ratingSignature) {
      lastAutoOpenedRatingRef.current = ratingSignature;
      setIsRatingModalOpen(true);
    }
  }, [hasRating, ratingSignature, service?.estado]);

  useEffect(() => {
    if (paymentForm.metodoPago === 'efectivo') {
      setPaymentForm((current) => (current.referenciaTransaccion
        ? { ...current, referenciaTransaccion: '' }
        : current));
      setPaymentReceiptFile(null);
    }
  }, [paymentForm.metodoPago]);

  useEffect(() => {
    if (!isChatModalOpen || isHistoryView || !serviceId) {
      return;
    }

    markServiceMessagesAsRead(serviceId).catch(() => null);
  }, [isChatModalOpen, isHistoryView, serviceId]);

  useEffect(() => {
    async function loadService() {
      if (!serviceId) {
        setError('ID de servicio no disponible');
        setLoading(false);
        return;
      }

      const loadId = latestLoadIdRef.current + 1;
      latestLoadIdRef.current = loadId;

      try {
        setError(null);
        setLoading(true);
        const [serviceRes, historyRes, paymentsRes, warrantyRes, filesRes, partsRes, ratingRes] = await Promise.all([
          getMyServiceById(serviceId),
          getServiceHistoryById(serviceId),
          getServicePayments(serviceId),
          getServiceWarranty(serviceId),
          getServiceFiles(serviceId),
          getServiceParts(serviceId),
          getRatingForService(serviceId),
        ]);
        const serviceData = await serviceRes.json().catch(() => ({}));
        const historyData = await historyRes.json().catch(() => ({}));
        const paymentsData = await paymentsRes.json().catch(() => ({}));
        const warrantyData = await warrantyRes.json().catch(() => ({}));
        const filesData = await filesRes.json().catch(() => ({}));
        const partsData = await partsRes.json().catch(() => ({}));
        const ratingData = await ratingRes.json().catch(() => ({}));

        if (!serviceRes.ok) {
          throw new Error(serviceData.message || 'No se pudo cargar el detalle del servicio');
        }

        if (!historyRes.ok) {
          throw new Error(historyData.message || 'No se pudo cargar el historial del servicio');
        }

        if (!paymentsRes.ok && paymentsRes.status !== 404) {
          throw new Error(paymentsData.message || 'No se pudieron cargar los pagos');
        }

        if (![200, 404].includes(warrantyRes.status)) {
          throw new Error(warrantyData.message || 'No se pudo cargar la garantia');
        }

        if (!filesRes.ok && filesRes.status !== 404) {
          throw new Error(filesData.message || 'No se pudieron cargar los archivos del servicio');
        }

        if (!partsRes.ok && partsRes.status !== 404) {
          throw new Error(partsData.message || 'No se pudieron cargar los repuestos');
        }

        if (![200, 404].includes(ratingRes.status)) {
          throw new Error(ratingData.message || 'No se pudo cargar la calificacion');
        }

        if (latestLoadIdRef.current !== loadId) {
          return;
        }

        setService(serviceData.serviceRequest || null);
        setHistory(historyData.history || []);
        setPayments(paymentsData.payments || []);
        setWarranty(warrantyRes.ok ? warrantyData.warranty || null : null);
        setFiles(filesData.files || []);
        setParts(partsData.parts || []);
        setRating(ratingRes.ok ? ratingData.rating || null : null);
      } catch (loadError) {
        if (latestLoadIdRef.current === loadId) {
          setError(loadError.message);
        }
      } finally {
        if (latestLoadIdRef.current === loadId) {
          setLoading(false);
        }
      }
    }

    loadService();
  }, [refreshTick, serviceId]);

  useEffect(() => {
    if (!serviceId) {
      return undefined;
    }

    joinServiceRoom?.(serviceId);

    const handleServiceUpdated = (payload) => {
      if (Number(payload?.serviceId) === Number(serviceId)) {
        if (payload?.service) {
          setService((current) => ({ ...(current || {}), ...payload.service }));
        }

        setRefreshTick((current) => current + 1);
      }
    };

    socket?.on('service:updated', handleServiceUpdated);

    return () => {
      socket?.off('service:updated', handleServiceUpdated);
    };
  }, [joinServiceRoom, serviceId, socket]);

  async function handleCancel() {
    if (!serviceId) {
      setError('ID de servicio no disponible');
      return;
    }

    setError(null);
    setIsCanceling(true);

    try {
      const response = await cancelServiceRequest(serviceId);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || 'No se pudo cancelar la solicitud');
      }

      setService(data.serviceRequest || null);
    } catch (cancelError) {
      setError(cancelError.message);
    } finally {
      setIsCanceling(false);
    }
  }

  async function handleAcceptQuote() {
    if (!serviceId) {
      setError('ID de servicio no disponible');
      return;
    }

    setError(null);
    setIsAcceptingQuote(true);

    try {
      const response = await acceptInitialQuote(serviceId);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || 'No se pudo aceptar la cotizacion');
      }
      setService(data.serviceRequest || null);
    } catch (acceptError) {
      setError(acceptError.message);
    } finally {
      setIsAcceptingQuote(false);
    }
  }

  async function handleRejectQuote() {
    if (!serviceId) {
      setError('ID de servicio no disponible');
      return;
    }

    setError(null);
    setIsRejectingQuote(true);

    try {
      const response = await rejectInitialQuote(serviceId);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || 'No se pudo rechazar la cotizacion');
      }
      setService(data.serviceRequest || null);
    } catch (rejectError) {
      setError(rejectError.message);
    } finally {
      setIsRejectingQuote(false);
    }
  }

  async function handlePaymentSubmit(event) {
    event.preventDefault();

    if (!serviceId) {
      setPaymentMessage('ID de servicio no disponible');
      return;
    }

    setError(null);
    setPaymentMessage('');

    if (paymentRequiresReceipt && !paymentReceiptFile) {
      setPaymentMessage('Debes agregar el comprobante de pago para este metodo.');
      return;
    }

    try {
      const payload = new FormData();
      payload.append('metodoPago', paymentForm.metodoPago);
      payload.append('monto', String(totalPrice));

      if (paymentForm.metodoPago !== 'efectivo' && paymentForm.referenciaTransaccion.trim()) {
        payload.append('referenciaTransaccion', paymentForm.referenciaTransaccion.trim());
      }

      if (paymentForm.notas.trim()) {
        payload.append('notas', paymentForm.notas.trim());
      }

      if (paymentRequiresReceipt && paymentReceiptFile) {
        payload.append('comprobante', paymentReceiptFile);
      }

      const response = await createServicePayment(serviceId, payload);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || 'No se pudo registrar el pago');
      }

      setPayments((current) => {
        const nextPayment = data.payment;

        if (!nextPayment || current.some((payment) => payment.id === nextPayment.id)) {
          return current;
        }

        return [nextPayment, ...current];
      });
      setService(data.serviceRequest || null);
      setPaymentForm({ metodoPago: 'efectivo', referenciaTransaccion: '', notas: '' });
      setPaymentReceiptFile(null);
      setPaymentMessage(data.message || 'Pago registrado correctamente');
    } catch (submitError) {
      setPaymentMessage(submitError.message || 'No se pudo registrar el pago');
    }
  }

  const canCancel = service && !['en_camino', 'en_reparacion', 'pendiente_pago', 'pago_enviado', 'finalizado', 'cancelado'].includes(service.estado);

  if (loading) return <section className="mx-auto max-w-[1280px] px-5 py-8 text-center text-[#737688] md:px-10">Cargando servicio...</section>;

  if (error && !service) return <section className="mx-auto max-w-[1280px] px-5 py-8 text-center text-[#93000a] md:px-10">{error}</section>;

  if (!service) return <section className="mx-auto max-w-[1280px] px-5 py-8 text-center text-[#737688] md:px-10">Servicio no encontrado</section>;

  return (
    <section className="mx-auto max-w-[1280px] px-5 py-8 md:px-10">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <button type="button" onClick={() => router.push(backHref)} className="text-sm font-semibold text-[#003ec7]">{backLabel}</button>
          <h1 className="section-title mt-2">Servicio {service.codigo_servicio || `#${service.id}`}</h1>
          <p className="mt-2 text-sm text-[#737688]">Detalle del servicio, estado actual y acciones importantes en un solo lugar.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {!isHistoryView ? <button type="button" onClick={() => setIsChatModalOpen(true)} className="inline-flex items-center justify-center rounded-2xl bg-[#003ec7] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0052ff]">Abrir chat</button> : null}
        </div>
      </div>

      {error ? <div className="mb-4 rounded-2xl bg-[#ffdad6] px-4 py-3 text-sm text-[#93000a]">{error}</div> : null}

      <div className="mb-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <SectionCard title="Resumen del servicio" description="Datos principales del equipo, cliente y estado actual del trabajo.">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <h2 className="text-[22px] font-semibold text-[#0b1c30]">{getServiceTitle(service)}</h2>
            <span className="rounded-full bg-[#eff4ff] px-3 py-1 text-xs font-semibold uppercase tracking-[0.05em] text-[#003ec7]">{getStateLabel(service.estado)}</span>
          </div>
          <p className="mb-4 text-[16px] leading-7 text-[#434656]">{service.descripcion_problema || 'Sin descripcion'}</p>
          <div className="grid gap-3 text-sm text-[#434656] md:grid-cols-2">
            <div className="flex flex-wrap items-center justify-between gap-3 md:col-span-2">
              <p><span className="font-semibold text-[#0b1c30]">Codigo:</span> {service.codigo_servicio || '—'}</p>
            </div>
            <p><span className="font-semibold text-[#0b1c30]">Estado de pago:</span> {paymentState}</p>
            <p><span className="font-semibold text-[#0b1c30]">Estado del precio:</span> {priceState}</p>
            <p><span className="font-semibold text-[#0b1c30]">Tecnico:</span> {service.tecnico_nombre_completo || 'Aun sin asignar'}</p>
            <p><span className="font-semibold text-[#0b1c30]">Modalidad:</span> {service.modalidad || 'No definida'}</p>
            <p><span className="font-semibold text-[#0b1c30]">Prioridad:</span> {service.prioridad || 'normal'}</p>
            <p><span className="font-semibold text-[#0b1c30]">Solicitado:</span> {service.fecha_solicitud ? new Date(service.fecha_solicitud).toLocaleString() : 'N/A'}</p>
            {service.direccion ? <p className="md:col-span-2"><span className="font-semibold text-[#0b1c30]">Direccion:</span> {service.direccion}</p> : null}
            {service.notas_tecnico ? <p className="md:col-span-2"><span className="font-semibold text-[#0b1c30]">Notas del tecnico:</span> {service.notas_tecnico}</p> : null}
          </div>
        </SectionCard>

        <div className="space-y-6">
          <SectionCard title="Acciones rapidas" description="Lo principal que necesitas hacer sobre este servicio.">
            <div className="flex flex-col gap-3">
              {service.estado === 'cotizacion_inicial_enviada' ? (
                <div className="flex flex-col gap-3">
                  <button type="button" className="rounded-full border border-[#003ec7] px-4 py-2 text-sm font-semibold text-[#003ec7] transition-colors hover:bg-[#eff4ff] disabled:cursor-not-allowed disabled:opacity-70" onClick={() => setIsQuoteModalOpen(true)} disabled={isAcceptingQuote || isRejectingQuote}>
                    Ver cotizacion
                  </button>
                  <button type="button" className="rounded-full bg-[#003ec7] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0052ff] disabled:cursor-not-allowed disabled:opacity-70" onClick={handleAcceptQuote} disabled={isAcceptingQuote || isRejectingQuote}>{isAcceptingQuote ? 'Aceptando...' : 'Aceptar cotizacion'}</button>
                  <button type="button" className="rounded-full border border-[#93000a] px-4 py-2 text-sm font-semibold text-[#93000a] transition-colors hover:bg-[#ffdad6] disabled:cursor-not-allowed disabled:opacity-70" onClick={handleRejectQuote} disabled={isRejectingQuote || isAcceptingQuote}>{isRejectingQuote ? 'Rechazando...' : 'Rechazar cotizacion'}</button>
                </div>
              ) : null}
              {service.estado === 'pendiente_pago' ? (
                <button type="button" className="rounded-full border border-[#003ec7] px-4 py-2 text-sm font-semibold text-[#003ec7] transition-colors hover:bg-[#eff4ff]" onClick={() => setIsFinalPaymentModalOpen(true)}>
                  Ver cobro final
                </button>
              ) : null}
              {service.estado === 'pago_enviado' ? (
                <div className="rounded-2xl bg-[#eff4ff] px-4 py-3 text-sm text-[#434656]">
                  El pago ya fue enviado. Ahora el tecnico debe validarlo para finalizar el servicio.
                </div>
              ) : null}
              {service.estado === 'finalizado' && !hasRating ? (
                <button type="button" className="rounded-full border border-[#003ec7] px-4 py-2 text-sm font-semibold text-[#003ec7] transition-colors hover:bg-[#eff4ff]" onClick={() => setIsRatingModalOpen(true)}>
                  Calificar
                </button>
              ) : null}
              {canCancel ? <button type="button" className="rounded-full border border-[#93000a] px-4 py-2 text-sm font-semibold text-[#93000a] transition-colors hover:bg-[#ffdad6] disabled:cursor-not-allowed disabled:opacity-70" onClick={handleCancel} disabled={isCanceling}>{isCanceling ? 'Cancelando...' : 'Cancelar solicitud'}</button> : null}
            </div>
            {(isCanceling || isAcceptingQuote || isRejectingQuote) ? <p className="mt-3 text-sm text-[#434656]">Procesando solicitud...</p> : null}
          </SectionCard>

        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2 rounded-[28px] border border-[#d8dbeb] bg-white p-3">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${activeTab === tab.key ? 'bg-[#003ec7] text-white' : 'bg-[#eff4ff] text-[#0b1c30] hover:bg-[#dfe9ff]'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {activeTab === 'ubicacion' ? (
          <SectionCard title="Ubicacion del servicio" description="Punto de visita o referencia del caso.">
            <div className="rounded-[24px] border border-[#d8dbeb] bg-[#eff4ff] p-4 text-sm text-[#434656]">
              {service.latitud && service.longitud ? (
                <>
                  <p><span className="font-semibold text-[#0b1c30]">Latitud:</span> {service.latitud}</p>
                  <p className="mt-1"><span className="font-semibold text-[#0b1c30]">Longitud:</span> {service.longitud}</p>
                  {service.direccion ? <p className="mt-1"><span className="font-semibold text-[#0b1c30]">Direccion:</span> {service.direccion}</p> : null}
                </>
              ) : (
                <p>No hay coordenadas registradas para este servicio.</p>
              )}
            </div>
          </SectionCard>
        ) : null}

        {activeTab === 'historial' ? (
          <SectionCard title="Historial del servicio" description="Cambios de estado y eventos registrados.">
            {history.length === 0 ? (
              <p className="text-sm text-[#737688]">No hay movimientos registrados.</p>
            ) : (
              <div className="max-h-[18rem] space-y-3 overflow-y-auto pr-2">
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
        ) : null}

        {activeTab === 'pagos' ? (
          <SectionCard title="Pagos y montos" description="Desglose de valores estimados, finales y pagos registrados.">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#737688]">Estimado inicial</p>
                <div className="mt-3 grid gap-3 text-sm text-[#434656]">
                  <p><span className="font-semibold text-[#0b1c30]">Mano de obra:</span> {laborPrice}</p>
                  <p><span className="font-semibold text-[#0b1c30]">Domicilio:</span> {travelPrice}</p>
                  <p><span className="font-semibold text-[#0b1c30]">Diagnostico:</span> {diagnosticPrice}</p>
                  <p><span className="font-semibold text-[#0b1c30]">Total estimado:</span> {totalPrice}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#737688]">Montos actuales</p>
                <div className="mt-3 grid gap-3 text-sm text-[#434656]">
                  <p><span className="font-semibold text-[#0b1c30]">Mano de obra:</span> {laborPrice}</p>
                  <p><span className="font-semibold text-[#0b1c30]">Repuestos:</span> {partsPrice}</p>
                  <p><span className="font-semibold text-[#0b1c30]">Domicilio:</span> {travelPrice}</p>
                  <p><span className="font-semibold text-[#0b1c30]">Diagnostico:</span> {diagnosticPrice}</p>
                  <p><span className="font-semibold text-[#0b1c30]">Total:</span> {totalPrice}</p>
                  <p><span className="font-semibold text-[#0b1c30]">Acordado:</span> {service.precio_acordado ?? totalPrice}</p>
                </div>
              </div>
            </div>
            <div className="mt-5 border-t border-[#d8dbeb] pt-5">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#737688]">Pagos registrados</p>
              <div className="mt-3 max-h-[18rem] space-y-3 overflow-y-auto pr-2">
                {payments.length === 0 ? (
                  <p className="text-sm text-[#737688]">No hay pagos registrados.</p>
                ) : (
                  payments.map((payment) => (
                    <div key={payment.id} className="rounded-2xl bg-[#eff4ff] px-4 py-3 text-sm text-[#434656]">
                      <p className="font-semibold text-[#0b1c30]">{payment.method} · {payment.amount} {payment.currency}</p>
                      <p className="mt-1">Estado: {payment.state}</p>
                      {payment.reference ? <p className="mt-1">Referencia: {payment.reference}</p> : null}
                      {payment.receiptUrl ? <a href={payment.receiptUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex font-semibold text-[#003ec7] hover:underline">Ver comprobante</a> : null}
                      {payment.notes ? <p className="mt-1">{payment.notes}</p> : null}
                    </div>
                  ))
                )}
              </div>
            </div>
          </SectionCard>
        ) : null}

        {activeTab === 'repuestos' ? (
          <SectionCard title="Repuestos" description="Repuestos registrados en el servicio.">
            {parts.length === 0 ? (
              <p className="text-sm text-[#737688]">No se registraron repuestos.</p>
            ) : (
              <div className="max-h-[18rem] space-y-3 overflow-y-auto pr-2">
                {parts.map((part) => (
                  <div key={part.id} className="rounded-2xl bg-[#eff4ff] px-4 py-3 text-sm text-[#434656]">
                    <p className="font-semibold text-[#0b1c30]">{part.name}</p>
                    <p className="mt-1">Cantidad: {part.quantity} · Subtotal: {part.subtotal}</p>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        ) : null}

        {activeTab === 'archivos' ? (
          <SectionCard title="Archivos" description="Evidencias visuales y documentos del servicio.">
            {imageFiles.length === 0 && extraFiles.length === 0 ? (
              <p className="text-sm text-[#737688]">No hay archivos adjuntos.</p>
            ) : (
              <div className="space-y-5">
                {imageFiles.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2">
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
        ) : null}

        {activeTab === 'garantia' ? (
          <SectionCard title="Garantia" description="Cobertura registrada para este servicio.">
            {!warranty ? (
              <p className="text-sm text-[#737688]">Este servicio no tiene garantia registrada.</p>
            ) : (
              <div className="space-y-2 text-sm text-[#434656]">
                <p><span className="font-semibold text-[#0b1c30]">Cobertura:</span> {warranty.description}</p>
                <p><span className="font-semibold text-[#0b1c30]">Duracion:</span> {warranty.durationDays} dias</p>
                <p><span className="font-semibold text-[#0b1c30]">Inicio:</span> {warranty.startDate}</p>
                <p><span className="font-semibold text-[#0b1c30]">Fin:</span> {warranty.endDate}</p>
                <p><span className="font-semibold text-[#0b1c30]">Activa:</span> {warranty.active ? 'Si' : 'No'}</p>
                {warranty.observations ? <p><span className="font-semibold text-[#0b1c30]">Observaciones:</span> {warranty.observations}</p> : null}
              </div>
            )}
          </SectionCard>
        ) : null}

      </div>

      <Modal open={isQuoteModalOpen && service.estado === 'cotizacion_inicial_enviada'} onClose={() => setIsQuoteModalOpen(false)} title="Cotizacion inicial" widthClassName="max-w-2xl">
        <div className="space-y-6">
          <div className="rounded-[24px] bg-[#eff4ff] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.05em] text-[#003ec7]">Estimacion inicial</p>
            <h3 className="mt-2 text-[24px] font-semibold text-[#0b1c30]">Total estimado: {formatAmount(totalPrice)}</h3>
            <p className="mt-2 text-sm leading-6 text-[#434656]">Revisa el detalle enviado por el tecnico antes de aceptar o rechazar la cotizacion.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-[#d8dbeb] bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.05em] text-[#737688]">Diagnostico</p>
              <p className="mt-2 text-xl font-semibold text-[#0b1c30]">{formatAmount(diagnosticPrice)}</p>
            </div>
            <div className="rounded-2xl border border-[#d8dbeb] bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.05em] text-[#737688]">Mano de obra</p>
              <p className="mt-2 text-xl font-semibold text-[#0b1c30]">{formatAmount(laborPrice)}</p>
            </div>
            <div className="rounded-2xl border border-[#d8dbeb] bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.05em] text-[#737688]">Repuestos estimados</p>
              <p className="mt-2 text-xl font-semibold text-[#0b1c30]">{formatAmount(partsPrice)}</p>
            </div>
            <div className="rounded-2xl border border-[#d8dbeb] bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.05em] text-[#737688]">Domicilio</p>
              <p className="mt-2 text-xl font-semibold text-[#0b1c30]">{formatAmount(travelPrice)}</p>
            </div>
          </div>

          {agreedPrice !== null ? (
            <div className="rounded-2xl border border-[#bfd3ff] bg-[#f8faff] p-4 text-sm text-[#434656]">
              <p><span className="font-semibold text-[#0b1c30]">Monto acordado para continuar:</span> {formatAmount(agreedPrice)}</p>
            </div>
          ) : null}

          {priceNote ? (
            <div className="rounded-2xl border border-[#d8dbeb] bg-white p-4 text-sm leading-6 text-[#434656]">
              <p className="font-semibold text-[#0b1c30]">Nota del tecnico</p>
              <p className="mt-2">{priceNote}</p>
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-3 border-t border-[#d8dbeb] pt-4 sm:flex-row sm:justify-end">
            {canCancel ? <button type="button" className="rounded-full border border-[#93000a] px-4 py-2 text-sm font-semibold text-[#93000a] transition-colors hover:bg-[#ffdad6] disabled:cursor-not-allowed disabled:opacity-70" onClick={handleCancel} disabled={isCanceling}>{isCanceling ? 'Cancelando...' : 'Cancelar solicitud'}</button> : null}
            <button type="button" className="rounded-full border border-[#93000a] px-4 py-2 text-sm font-semibold text-[#93000a] transition-colors hover:bg-[#ffdad6] disabled:cursor-not-allowed disabled:opacity-70" onClick={handleRejectQuote} disabled={isRejectingQuote || isAcceptingQuote}>{isRejectingQuote ? 'Rechazando...' : 'Rechazar cotizacion'}</button>
            <button type="button" className="rounded-full bg-[#003ec7] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0052ff] disabled:cursor-not-allowed disabled:opacity-70" onClick={handleAcceptQuote} disabled={isAcceptingQuote || isRejectingQuote}>{isAcceptingQuote ? 'Aceptando...' : 'Aceptar cotizacion'}</button>
          </div>
        </div>
      </Modal>

      <Modal open={isChatModalOpen && !isHistoryView} onClose={() => setIsChatModalOpen(false)} title={`Chat del servicio ${service.codigo_servicio || `#${service.id}`}`} widthClassName="max-w-5xl">
        <div className="flex h-[70vh] min-h-0 flex-col gap-4">
          <p className="text-sm leading-6 text-[#434656]">Usa este chat para coordinar detalles, aclarar sintomas o notificar avances directamente con el tecnico.</p>
          <ChatBox serviceId={service.id} reloadKey={reloadKey} />
          <MessageInput serviceId={service.id} onMessageSent={() => setReloadKey((current) => current + 1)} />
        </div>
      </Modal>

      <Modal open={isFinalPaymentModalOpen && service.estado === 'pendiente_pago'} onClose={() => setIsFinalPaymentModalOpen(false)} title="Cobro final" widthClassName="max-w-4xl">
        <form onSubmit={handlePaymentSubmit} className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-4 rounded-[24px] border border-[#d8dbeb] bg-white p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.05em] text-[#737688]">Metodo de pago</p>
                <select className="mt-2 w-full rounded-2xl border border-[#c3c5d9] bg-white px-4 py-3 text-[16px] text-[#0b1c30] outline-none" value={paymentForm.metodoPago} onChange={(event) => setPaymentForm((current) => ({ ...current, metodoPago: event.target.value }))}>
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="otro">Otro</option>
                </select>
              </div>

              {paymentForm.metodoPago !== 'efectivo' ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.05em] text-[#737688]">Referencia de pago</p>
                  <input
                    type="text"
                    className="mt-2 w-full rounded-2xl border border-[#c3c5d9] bg-white px-4 py-3 text-[16px] text-[#0b1c30] outline-none"
                    placeholder="Numero de referencia, ultimos 4 digitos o identificador"
                    value={paymentForm.referenciaTransaccion}
                    onChange={(event) => setPaymentForm((current) => ({ ...current, referenciaTransaccion: event.target.value }))}
                  />
                </div>
              ) : null}

              {paymentRequiresReceipt ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.05em] text-[#737688]">Comprobante de pago</p>
                  <label className="mt-2 flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-[#c3c5d9] bg-[#f8faff] px-4 py-5 text-center text-sm text-[#434656] transition-colors hover:border-[#003ec7] hover:bg-[#eff4ff]">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(event) => setPaymentReceiptFile(event.target.files?.[0] || null)}
                    />
                    <span className="material-symbols-outlined text-[28px] text-[#003ec7]">upload</span>
                    <span className="mt-2 font-semibold text-[#0b1c30]">Subir comprobante</span>
                    <span className="mt-1 text-xs text-[#737688]">Solo imagenes JPG, PNG o WEBP.</span>
                    {paymentReceiptFile ? <span className="mt-3 rounded-full bg-[#eff4ff] px-3 py-1 text-xs font-semibold text-[#003ec7]">{paymentReceiptFile.name}</span> : null}
                  </label>
                  <p className="mt-2 text-xs text-[#737688]">Obligatorio para transferencia, tarjeta y otros metodos distintos de efectivo.</p>
                </div>
              ) : null}

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.05em] text-[#737688]">Notas del pago</p>
                <textarea className="mt-2 min-h-24 w-full rounded-2xl border border-[#c3c5d9] bg-white px-4 py-3 text-[16px] text-[#0b1c30]" placeholder="Notas adicionales del pago" value={paymentForm.notas} onChange={(event) => setPaymentForm((current) => ({ ...current, notas: event.target.value }))} />
              </div>
            </div>

            <div className="rounded-[24px] border border-[#bfd3ff] bg-[#f8faff] p-5 text-[#0b1c30]">
              <p className="text-xs font-semibold uppercase tracking-[0.05em] text-[#737688]">Resumen final</p>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3"><span>Diagnostico</span><span className="font-semibold">{formatAmount(diagnosticPrice)}</span></div>
                <div className="flex items-center justify-between gap-3"><span>Mano de obra</span><span className="font-semibold">{formatAmount(laborPrice)}</span></div>
                <div className="flex items-center justify-between gap-3"><span>Repuestos</span><span className="font-semibold">{formatAmount(partsPrice)}</span></div>
                <div className="flex items-center justify-between gap-3"><span>Domicilio</span><span className="font-semibold">{formatAmount(travelPrice)}</span></div>
              </div>
              <div className="mt-4 border-t border-[#d8dbeb] pt-4">
                <p className="text-xs font-semibold uppercase tracking-[0.05em] text-[#737688]">Monto pagado</p>
                <p className="mt-2 text-[28px] font-semibold text-[#003ec7]">{formatAmount(totalPrice)}</p>
                {priceNote ? <p className="mt-3 text-sm leading-6 text-[#434656]">{priceNote}</p> : null}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button type="submit" className="rounded-full bg-[#003ec7] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0052ff]">Registrar pago</button>
            <button type="button" onClick={() => router.push('/client/history')} className="rounded-full border border-[#c3c5d9] px-5 py-3 text-sm font-semibold text-[#0b1c30] transition-colors hover:bg-[#eff4ff]">Ver historial</button>
          </div>
        </form>
        {paymentMessage ? <p className="mt-3 text-sm text-[#434656]">{paymentMessage}</p> : null}
      </Modal>

      <Modal open={isRatingModalOpen && service.estado === 'finalizado'} onClose={() => setIsRatingModalOpen(false)} title="Calificacion del servicio" widthClassName="max-w-2xl">
        {!rating ? (
          <RatingForm
            serviceId={service.id}
            onSuccess={() => {
              setIsRatingModalOpen(false);
              setRefreshTick((current) => current + 1);
            }}
          />
        ) : (
          <div className="space-y-4 text-sm text-[#434656]">
            <div className="rounded-[24px] bg-[#eff4ff] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.05em] text-[#003ec7]">Calificacion registrada</p>
              <p className="mt-2 text-[24px] font-semibold text-[#0b1c30]">{rating.score} / 5</p>
              {rating.comment ? <p className="mt-2 leading-6">{rating.comment}</p> : null}
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
}
