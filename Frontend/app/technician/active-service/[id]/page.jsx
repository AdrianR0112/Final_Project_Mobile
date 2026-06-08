'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Button from '../../../../components/common/Button';
import Modal from '../../../../components/common/Modal';
import ChatBox from '../../../../components/chat/ChatBox';
import MessageInput from '../../../../components/chat/MessageInput';
import RatingForm from '../../../../components/client/RatingForm';
import { cancelServiceRequest, getAssignedServiceRequestById, getServiceHistoryById, sendInitialQuote, updateAssignedServiceStatus } from '../../../../services/service.service';
import { getServicePayments } from '../../../../services/payment.service';
import { getServiceWarranty, createServiceWarranty, updateWarranty } from '../../../../services/warranty.service';
import { getServiceFiles, createServiceFile, deleteServiceFile } from '../../../../services/service-file.service';
import { getServiceParts, createServicePart, deleteServicePart } from '../../../../services/spare-part.service';
import { getTechnicianProfile } from '../../../../services/technician.service';
import { getRatingForService, getTechnicianRatings } from '../../../../services/rating.service';
import { useSocket } from '../../../../hooks/useSocket';
import { getStateLabel } from '../../../../utils/serviceStatus';

const ServiceLocationMap = dynamic(() => import('../../../../components/common/ServiceLocationMap'), { ssr: false });

const STATUS_FLOW = {
  aceptado: ['en_camino'],
  en_camino: ['en_reparacion'],
  en_reparacion: ['pendiente_pago'],
  pago_enviado: ['finalizado', 'pendiente_pago'],
};

const STATUS_FLOW_LABELS = {
  en_camino: 'En camino',
  en_reparacion: 'En reparacion',
  pendiente_pago: 'Pendiente de pago',
  finalizado: 'Validar pago y finalizar',
};

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

function getPartSubtotal(part) {
  if (!part) {
    return 0;
  }

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

export default function ActiveServicePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
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

  const [partForm, setPartForm] = useState({ nombre: '', cantidad: 1, precioUnitario: '', proveedor: '', garantiaDias: 0 });
  const [fileForm, setFileForm] = useState({ tipo: 'imagen', etapa: 'durante', url: '', descripcion: '' });
  const [warrantyForm, setWarrantyForm] = useState({ descripcion: '', duracionDias: 30, observaciones: '' });
  const [quoteForm, setQuoteForm] = useState({ precioManoObra: '', precioDomicilio: '0', precioDiagnostico: '0', notaPrecio: '' });
  const [finalAmountsForm, setFinalAmountsForm] = useState({ precioManoObra: '', precioDomicilio: '0', precioDiagnostico: '0', notaPrecio: '' });
  const [warrantyApplies, setWarrantyApplies] = useState(false);
  const [finalPartsApplies, setFinalPartsApplies] = useState(false);
  const [finalPartForm, setFinalPartForm] = useState({ nombre: '', cantidad: 1, precioUnitario: '', proveedor: '', garantiaDias: 0 });
  const [finalParts, setFinalParts] = useState([]);
  const [actionState, setActionState] = useState({ kind: '', loading: false, message: '' });

  const [chatOpen, setChatOpen] = useState(false);
  const [finalPaymentModalOpen, setFinalPaymentModalOpen] = useState(false);
  const [quoteSentModalOpen, setQuoteSentModalOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [refreshTick, setRefreshTick] = useState(0);
  const [activeTab, setActiveTab] = useState('ubicacion');
  const { socket, joinServiceRoom } = useSocket();

  const currentDomicilioAmount = toNumber(service?.precio_domicilio ?? 0);
  const currentDiagnosticoAmount = toNumber(service?.precio_diagnostico ?? 0);
  const currentLaborAmount = toNumber(service?.precio_mano_obra ?? 0);
  const persistedPartsTotal = parts.reduce((total, part) => total + getPartSubtotal(part), 0);
  const pendingFinalPartsTotal = finalPartsApplies ? finalParts.reduce((total, part) => total + getPartSubtotal(part), 0) : 0;
  const registeredPartsTotal = persistedPartsTotal + pendingFinalPartsTotal;
  const currentPartsAmount = registeredPartsTotal || toNumber(service?.precio_repuestos ?? 0);
  const currentTotalAmount = currentLaborAmount + currentPartsAmount + currentDomicilioAmount + currentDiagnosticoAmount;

  useEffect(() => {
    if (searchParams?.get('openFinalPayment') === '1') {
      setFinalPaymentModalOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (searchParams?.get('quoteSent') === '1') {
      setQuoteSentModalOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    async function loadService() {
      if (!serviceId) {
        setError('ID de servicio no disponible');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const [serviceRes, historyRes, paymentsRes, warrantyRes, filesRes, partsRes, profileRes] = await Promise.all([
          getAssignedServiceRequestById(serviceId),
          getServiceHistoryById(serviceId),
          getServicePayments(serviceId),
          getServiceWarranty(serviceId),
          getServiceFiles(serviceId),
          getServiceParts(serviceId),
          getTechnicianProfile(),
        ]);
        const serviceData = await serviceRes.json().catch(() => ({}));
        const historyData = await historyRes.json().catch(() => ({}));
        const paymentsData = await paymentsRes.json().catch(() => ({}));
        const warrantyData = await warrantyRes.json().catch(() => ({}));
        const filesData = await filesRes.json().catch(() => ({}));
        const partsData = await partsRes.json().catch(() => ({}));
        const profileData = await profileRes.json().catch(() => ({}));

        if (!serviceRes.ok) throw new Error(serviceData.message || 'No se pudo cargar el servicio');
        if (!historyRes.ok) throw new Error(historyData.message || 'No se pudo cargar el historial del servicio');
        if (!paymentsRes.ok && paymentsRes.status !== 404) throw new Error(paymentsData.message || 'No se pudieron cargar los pagos');
        if (![200, 404].includes(warrantyRes.status)) throw new Error(warrantyData.message || 'No se pudo cargar la garantia');
        if (!filesRes.ok && filesRes.status !== 404) throw new Error(filesData.message || 'No se pudieron cargar los archivos');
        if (!partsRes.ok && partsRes.status !== 404) throw new Error(partsData.message || 'No se pudieron cargar los repuestos');
        if (!profileRes.ok) throw new Error(profileData.message || 'No se pudo cargar el perfil del tecnico');

        setService(serviceData.serviceRequest || null);
        setHistory(historyData.history || []);
        setPayments(paymentsData.payments || []);
        const warrantyValue = warrantyRes.ok ? warrantyData.warranty || null : null;
        setWarranty(warrantyValue);
        setWarrantyApplies(Boolean(warrantyValue));
        if (warrantyValue) {
          setWarrantyForm({ descripcion: warrantyValue.description || '', duracionDias: warrantyValue.durationDays || 30, observaciones: warrantyValue.observations || '' });
        } else {
          setWarrantyForm({ descripcion: '', duracionDias: 30, observaciones: '' });
        }
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
           const matchedRating = (ratingsData.ratings || []).find((item) => Number(item.serviceId) === Number(serviceId)) || null;
           setClientRating(matchedRating);
           setMyRating(myRatingData.rating || null);
         }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadService();
  }, [refreshTick, serviceId]);

  useEffect(() => {
    if (!serviceId) return undefined;
    joinServiceRoom?.(serviceId);
    const handler = (payload) => {
      if (Number(payload?.serviceId) === Number(serviceId)) setRefreshTick((c) => c + 1);
    };
    socket?.on('service:updated', handler);
    return () => { socket?.off('service:updated', handler); };
  }, [joinServiceRoom, serviceId, socket]);

  async function handleStatusUpdate(nextState) {
    setActionState({ kind: 'status', loading: true, message: '' });
    try {
      const response = await updateAssignedServiceStatus(serviceId, { estado: nextState });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'No se pudo actualizar el estado');
      setService(data.serviceRequest || null);
      setActionState({ kind: 'status', loading: false, message: 'Estado actualizado correctamente' });
    } catch (err) {
      setActionState({ kind: 'status', loading: false, message: err.message });
    }
  }

  function handleOpenFinalPaymentModal() {
    setActionState({ kind: '', loading: false, message: '' });
    setFinalPaymentModalOpen(true);
  }

  async function handleInitialQuoteSubmit(event) {
    event.preventDefault();
    setActionState({ kind: 'quote', loading: true, message: '' });
    try {
      const response = await sendInitialQuote(serviceId, {
        precioManoObra: Number(quoteForm.precioManoObra || 0),
        precioDomicilio: Number(quoteForm.precioDomicilio || 0),
        precioDiagnostico: Number(quoteForm.precioDiagnostico || 0),
        notaPrecio: quoteForm.notaPrecio || null,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'No se pudo enviar la cotizacion inicial');
      setService(data.serviceRequest || null);
      setActionState({ kind: 'quote', loading: false, message: 'Cotizacion inicial enviada correctamente' });
      setQuoteSentModalOpen(true);
    } catch (err) {
      setActionState({ kind: 'quote', loading: false, message: err.message });
    }
  }

  function handleCloseQuoteSentModal() {
    setQuoteSentModalOpen(false);

    if (searchParams?.get('quoteSent') === '1') {
      router.replace(`/technician/active-service/${serviceId}`);
    }
  }

  async function handleFinalAmountsSubmit(event) {
    event.preventDefault();
    setActionState({ kind: 'final-amounts', loading: true, message: '' });
    try {
      const finalPartsPayload = finalPartsApplies
        ? finalParts.map((part) => ({
          nombre: part.nombre,
          cantidad: Number(part.cantidad),
          precioUnitario: Number(part.precioUnitario || 0),
          proveedor: part.proveedor || null,
          garantiaDias: Number(part.garantiaDias || 0),
        }))
        : [];

      const response = await updateAssignedServiceStatus(serviceId, {
        estado: 'pendiente_pago',
        precioManoObra: Number(finalAmountsForm.precioManoObra || 0),
        precioRepuestos: registeredPartsTotal,
        precioDomicilio: Number(finalAmountsForm.precioDomicilio || 0),
        precioDiagnostico: Number(finalAmountsForm.precioDiagnostico || 0),
        notaPrecio: finalAmountsForm.notaPrecio || null,
        garantia: warrantyApplies ? {
          descripcion: warrantyForm.descripcion.trim(),
          duracionDias: Number(warrantyForm.duracionDias || 0),
          observaciones: warrantyForm.observaciones.trim() || null,
        } : null,
        repuestos: finalPartsPayload,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'No se pudieron registrar los montos finales');

      setService(data.serviceRequest || null);
      setFinalParts([]);
      setFinalPartForm({ nombre: '', cantidad: 1, precioUnitario: '', proveedor: '', garantiaDias: 0 });
      setFinalPaymentModalOpen(false);
      setActionState({ kind: 'final-amounts', loading: false, message: 'Montos finales y garantia registrados correctamente' });
      setRefreshTick((current) => current + 1);
    } catch (err) {
      setActionState({ kind: 'final-amounts', loading: false, message: err.message });
    }
  }

  function handleAddFinalPart() {
    const nombre = finalPartForm.nombre.trim();

    if (!nombre) {
      setActionState({ kind: 'final-amounts', loading: false, message: 'Escribe el nombre del repuesto' });
      return;
    }

    setFinalPartsApplies(true);
    setFinalParts((current) => ([
      ...current,
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        nombre,
        cantidad: Number(finalPartForm.cantidad || 1),
        precioUnitario: finalPartForm.precioUnitario,
        proveedor: finalPartForm.proveedor,
        garantiaDias: Number(finalPartForm.garantiaDias || 0),
      },
    ]));
    setFinalPartForm({ nombre: '', cantidad: 1, precioUnitario: '', proveedor: '', garantiaDias: 0 });
    setActionState({ kind: '', loading: false, message: '' });
  }

  function handleRemoveFinalPart(partId) {
    setFinalParts((current) => current.filter((part) => part.id !== partId));
  }

  async function handleCancelService() {
    setActionState({ kind: 'cancel', loading: true, message: '' });
    try {
      const response = await cancelServiceRequest(serviceId);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'No se pudo cancelar');
      setService(data.serviceRequest || null);
      setActionState({ kind: 'cancel', loading: false, message: '' });
    } catch (err) {
      setActionState({ kind: 'cancel', loading: false, message: err.message });
    }
  }

  async function handleCreatePart(event) {
    event.preventDefault();
    setActionState({ kind: 'part', loading: true, message: '' });
    try {
      const response = await createServicePart(serviceId, { nombre: partForm.nombre, cantidad: Number(partForm.cantidad), precioUnitario: Number(partForm.precioUnitario || 0), proveedor: partForm.proveedor || null, garantiaDias: Number(partForm.garantiaDias || 0) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'No se pudo agregar el repuesto');
      setParts((c) => [...c, data.part]);
      setPartForm({ nombre: '', cantidad: 1, precioUnitario: '', proveedor: '', garantiaDias: 0 });
      setActionState({ kind: 'part', loading: false, message: 'Repuesto agregado correctamente' });
    } catch (err) {
      setActionState({ kind: 'part', loading: false, message: err.message });
    }
  }

  async function handleDeletePart(partId) {
    const response = await deleteServicePart(partId);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || 'No se pudo eliminar el repuesto');
    setParts((c) => c.filter((p) => p.id !== partId));
  }

  async function handleCreateFile(event) {
    event.preventDefault();
    setActionState({ kind: 'file', loading: true, message: '' });
    try {
      const response = await createServiceFile(serviceId, fileForm);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'No se pudo agregar el archivo');
      setFiles((c) => [data.file, ...c]);
      setFileForm({ tipo: 'imagen', etapa: 'durante', url: '', descripcion: '' });
      setActionState({ kind: 'file', loading: false, message: 'Archivo agregado correctamente' });
    } catch (err) {
      setActionState({ kind: 'file', loading: false, message: err.message });
    }
  }

  async function handleDeleteFile(fileId) {
    const response = await deleteServiceFile(fileId);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || 'No se pudo eliminar el archivo');
    setFiles((c) => c.filter((f) => f.id !== fileId));
  }

  async function handleWarrantySubmit(event) {
    event.preventDefault();
    setActionState({ kind: 'warranty', loading: true, message: '' });
    try {
      const payload = { descripcion: warrantyForm.descripcion, duracionDias: Number(warrantyForm.duracionDias), observaciones: warrantyForm.observaciones || null };
      const response = warranty ? await updateWarranty(warranty.id, payload) : await createServiceWarranty(serviceId, payload);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'No se pudo guardar la garantia');
      setWarranty(data.warranty);
      setWarrantyForm({ descripcion: data.warranty.description || '', duracionDias: data.warranty.durationDays || 30, observaciones: data.warranty.observations || '' });
      setActionState({ kind: 'warranty', loading: false, message: 'Garantia guardada correctamente' });
    } catch (err) {
      setActionState({ kind: 'warranty', loading: false, message: err.message });
    }
  }

  const imageFiles = files.filter((f) => String(f.type).toLowerCase() === 'imagen');
  const extraFiles = files.filter((f) => String(f.type).toLowerCase() !== 'imagen');
  const nextStates = STATUS_FLOW[service?.estado] || [];
  const canCancel = service && !['en_reparacion', 'pendiente_pago', 'pago_enviado', 'finalizado', 'cancelado'].includes(service.estado);

  const tabs = [
    { key: 'ubicacion', label: 'Ubicacion' },
    { key: 'imagenes', label: 'Imagenes' },
    { key: 'historial', label: 'Historial' },
    { key: 'pagos', label: 'Pagos' },
    { key: 'repuestos', label: 'Repuestos' },
    { key: 'archivos', label: 'Archivos' },
    { key: 'garantia', label: 'Garantia' },
    ...(service?.estado === 'solicitado' ? [{ key: 'cotizacion', label: 'Cotizacion' }] : []),
    ...(service?.estado === 'en_reparacion' ? [{ key: 'cierre', label: 'Cierre y cobro' }] : []),
    ...(service?.estado === 'finalizado' ? [{ key: 'calificacion', label: 'Calificacion' }] : []),
  ];

  useEffect(() => {
    if (!tabs.some((tab) => tab.key === activeTab) && tabs[0]) {
      setActiveTab(tabs[0].key);
    }
  }, [activeTab, tabs]);

  if (loading) return <section className="mx-auto max-w-[1280px] px-5 py-8 text-center text-[#737688] md:px-10">Cargando servicio...</section>;
  if (error && !service) return <section className="mx-auto max-w-[1280px] px-5 py-8 text-center text-[#93000a] md:px-10">{error}</section>;
  if (!service) return <section className="mx-auto max-w-[1280px] px-5 py-8 text-center text-[#737688] md:px-10">Servicio no encontrado</section>;

  return (
    <section className="mx-auto max-w-[1280px] px-5 py-8 md:px-10">
      {/* Cabecera */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <button type="button" onClick={() => router.push('/technician/active-services')} className="text-sm font-semibold text-[#003ec7]">Volver a servicios activos</button>
          <h1 className="section-title mt-2">Servicio {service.codigo_servicio || `#${service.id}`}</h1>
          <p className="mt-2 text-sm text-[#737688]">Resumen del servicio, estado actual y acciones rapidas siempre visibles.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => setChatOpen(true)} className="inline-flex items-center justify-center rounded-2xl bg-[#003ec7] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0052ff]">Abrir chat</button>
        </div>
      </div>

      {error ? <div className="mb-4 rounded-2xl bg-[#ffdad6] px-4 py-3 text-sm text-[#93000a]">{error}</div> : null}

      {/* Secciones siempre visibles: Resumen, Avanzar estado, Cancelar */}
      <div className="mb-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        {/* Resumen */}
        <SectionCard title="Resumen del servicio" description="Datos principales del equipo, cliente y estado actual del trabajo.">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <h2 className="text-[22px] font-semibold text-[#0b1c30]">{service.tipo_equipo || `Servicio #${service.id}`}</h2>
            <span className="rounded-full bg-[#eff4ff] px-3 py-1 text-xs font-semibold uppercase tracking-[0.05em] text-[#003ec7]">{getStateLabel(service.estado)}</span>
          </div>
          <p className="text-[16px] leading-7 text-[#434656] mb-4">{service.descripcion_problema || 'Sin descripcion'}</p>
          <div className="grid gap-3 text-sm text-[#434656] md:grid-cols-2">
            <p><span className="font-semibold text-[#0b1c30]">Codigo:</span> {service.codigo_servicio || '—'}</p>
            <p><span className="font-semibold text-[#0b1c30]">Estado de pago:</span> {service.estado_pago || 'pendiente'}</p>
            <p><span className="font-semibold text-[#0b1c30]">Estado del precio:</span> {service.estado_precio || 'sin_cotizar'}</p>
            <p><span className="font-semibold text-[#0b1c30]">Cliente:</span> {`${service.cliente_nombre || ''} ${service.cliente_apellido || ''}`.trim() || 'No disponible'}</p>
            <p><span className="font-semibold text-[#0b1c30]">Correo:</span> {service.cliente_correo || 'No disponible'}</p>
            <p><span className="font-semibold text-[#0b1c30]">Modalidad:</span> {service.modalidad || 'No definida'}</p>
            <p><span className="font-semibold text-[#0b1c30]">Prioridad:</span> {service.prioridad || 'normal'}</p>
            <p><span className="font-semibold text-[#0b1c30]">Marca:</span> {service.marca_equipo || '—'}</p>
            <p><span className="font-semibold text-[#0b1c30]">Modelo:</span> {service.modelo_equipo || '—'}</p>
            <p><span className="font-semibold text-[#0b1c30]">Serie:</span> {service.numero_serie_equipo || '—'}</p>
            {service.direccion ? <p className="md:col-span-2"><span className="font-semibold text-[#0b1c30]">Direccion:</span> {service.direccion}</p> : null}
            {service.referencia_direccion ? <p className="md:col-span-2"><span className="font-semibold text-[#0b1c30]">Referencia:</span> {service.referencia_direccion}</p> : null}
          </div>
        </SectionCard>

        {/* Avanzar estado + Cancelar */}
        <div className="space-y-6">
          {nextStates.length > 0 ? (
            <SectionCard title="Avanzar estado" description={`Estado actual: ${getStateLabel(service.estado)}.`}>
              <div className="flex flex-wrap gap-3">
                {nextStates.map((ns) => (
                  <button
                    key={ns}
                    type="button"
                    onClick={() => (ns === 'pendiente_pago' && service.estado !== 'pago_enviado' ? handleOpenFinalPaymentModal() : handleStatusUpdate(ns))}
                    disabled={actionState.kind === 'status' && actionState.loading}
                    className="rounded-full bg-[#003ec7] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#0052ff] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {actionState.kind === 'status' && actionState.loading ? 'Procesando...' : STATUS_FLOW_LABELS[ns] || ns}
                  </button>
                ))}
              </div>
              {actionState.kind === 'status' && actionState.message ? <p className="mt-3 text-sm text-[#434656]">{actionState.message}</p> : null}
            </SectionCard>
          ) : null}

          {canCancel ? (
            <SectionCard title="Cancelar servicio" description="Puedes cancelar mientras no hayas iniciado la reparacion.">
              <button type="button" onClick={handleCancelService} disabled={actionState.kind === 'cancel' && actionState.loading} className="rounded-full border border-[#93000a] px-4 py-2 text-sm font-semibold text-[#93000a] transition-colors hover:bg-[#ffdad6] disabled:cursor-not-allowed disabled:opacity-70">
                {actionState.kind === 'cancel' && actionState.loading ? 'Cancelando...' : 'Cancelar servicio'}
              </button>
              {actionState.kind === 'cancel' && actionState.message ? <p className="mt-3 text-sm text-[#434656]">{actionState.message}</p> : null}
            </SectionCard>
          ) : null}
        </div>
      </div>

      {/* Barra de pestañas */}
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

      {/* Contenido de pestañas */}
      <div className="space-y-6">

        {/* Ubicacion */}
        {activeTab === 'ubicacion' ? (
          <SectionCard title="Ubicacion del servicio" description="Punto de visita o referencia del caso.">
            <ServiceLocationMap location={service.latitud && service.longitud ? { lat: Number(service.latitud), lng: Number(service.longitud), address: service.direccion || '' } : null} />
          </SectionCard>
        ) : null}

        {/* Imagenes */}
        {activeTab === 'imagenes' ? (
          <SectionCard title="Evidencias visuales" description="Imagenes y archivos asociados al servicio.">
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
        ) : null}

        {/* Historial */}
        {activeTab === 'historial' ? (
          <SectionCard title="Historial del servicio" description="Cambios de estado y eventos registrados.">
            {history.length === 0 ? <p className="text-sm text-[#737688]">No hay movimientos registrados.</p> : (
              <div className="space-y-3">
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

        {/* Montos */}
        {activeTab === 'pagos' ? (
          <SectionCard title="Pagos y montos" description="Desglose de valores estimados, finales y pagos registrados.">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#737688]">Estimado inicial</p>
            <div className="mt-3 mb-5 grid gap-3 text-sm text-[#434656] md:grid-cols-2">
              <p><span className="font-semibold text-[#0b1c30]">Mano de obra:</span> {currentLaborAmount}</p>
              <p><span className="font-semibold text-[#0b1c30]">Domicilio:</span> {currentDomicilioAmount}</p>
              <p><span className="font-semibold text-[#0b1c30]">Diagnostico:</span> {currentDiagnosticoAmount}</p>
              <p><span className="font-semibold text-[#0b1c30]">Total estimado:</span> {currentTotalAmount}</p>
            </div>
            <div className="border-t border-[#d8dbeb] pt-5">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#737688]">Montos actuales</p>
              <div className="mt-3 grid gap-3 text-sm text-[#434656] md:grid-cols-2">
                <p><span className="font-semibold text-[#0b1c30]">Mano de obra:</span> {currentLaborAmount}</p>
                <p><span className="font-semibold text-[#0b1c30]">Repuestos:</span> {currentPartsAmount}</p>
                <p><span className="font-semibold text-[#0b1c30]">Domicilio:</span> {currentDomicilioAmount}</p>
                <p><span className="font-semibold text-[#0b1c30]">Diagnostico:</span> {currentDiagnosticoAmount}</p>
                <p><span className="font-semibold text-[#0b1c30]">Total:</span> {currentTotalAmount}</p>
                <p><span className="font-semibold text-[#0b1c30]">Acordado:</span> {service.precio_acordado ?? currentTotalAmount}</p>
              </div>
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
                        {payment.notes ? <p className="mt-1">{payment.notes}</p> : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {service.estado === 'pago_enviado' ? (
              <div className="mt-5 rounded-2xl border border-[#bfd3ff] bg-[#f8faff] px-4 py-4 text-sm text-[#434656]">
                El cliente ya reporto el pago. Revisa el comprobante y luego finaliza el servicio o devuelvelo a pendiente de pago.
              </div>
            ) : null}
          </SectionCard>
        ) : null}

        {/* Repuestos */}
        {activeTab === 'repuestos' ? (
          <SectionCard title="Repuestos usados o vendidos" description="Registra cada repuesto con cantidad, costo y proveedor.">
            <form onSubmit={handleCreatePart} className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Nombre del repuesto</label>
                <input className="w-full rounded-2xl border border-[#c3c5d9] bg-white px-4 py-3 text-[16px] text-[#0b1c30]" placeholder="Ej: Pantalla LCD, batería" value={partForm.nombre} onChange={(e) => setPartForm((c) => ({ ...c, nombre: e.target.value }))} required />
                <p className="text-xs text-[#737688]">Indica el nombre comercial del repuesto.</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Cantidad utilizada</label>
                <input className="w-full rounded-2xl border border-[#c3c5d9] bg-white px-4 py-3 text-[16px] text-[#0b1c30]" type="number" min="1" placeholder="Ej: 1" value={partForm.cantidad} onChange={(e) => setPartForm((c) => ({ ...c, cantidad: e.target.value }))} required />
                <p className="text-xs text-[#737688]">Cuántas unidades de ese repuesto se usaron.</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Precio unitario</label>
                <input className="w-full rounded-2xl border border-[#c3c5d9] bg-white px-4 py-3 text-[16px] text-[#0b1c30]" type="number" min="0" step="0.01" placeholder="Ej: 15.00" value={partForm.precioUnitario} onChange={(e) => setPartForm((c) => ({ ...c, precioUnitario: e.target.value }))} />
                <p className="text-xs text-[#737688]">Valor por unidad. Se usa para calcular el subtotal.</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Proveedor</label>
                <input className="w-full rounded-2xl border border-[#c3c5d9] bg-white px-4 py-3 text-[16px] text-[#0b1c30]" placeholder="Ej: Tienda local" value={partForm.proveedor} onChange={(e) => setPartForm((c) => ({ ...c, proveedor: e.target.value }))} />
                <p className="text-xs text-[#737688]">Opcional. Rastreo del origen del repuesto.</p>
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Garantía del repuesto en días</label>
                <input className="w-full rounded-2xl border border-[#c3c5d9] bg-white px-4 py-3 text-[16px] text-[#0b1c30]" type="number" min="0" placeholder="Ej: 30" value={partForm.garantiaDias} onChange={(e) => setPartForm((c) => ({ ...c, garantiaDias: e.target.value }))} />
                <p className="text-xs text-[#737688]">Duración de la garantía del repuesto.</p>
              </div>
              <Button type="submit" className="md:col-span-2" disabled={actionState.kind === 'part' && actionState.loading}>{actionState.kind === 'part' && actionState.loading ? 'Guardando...' : 'Agregar repuesto'}</Button>
            </form>
            {actionState.kind === 'part' && actionState.message ? <p className="mt-3 text-sm text-[#434656]">{actionState.message}</p> : null}
            {parts.length > 0 ? (
              <div className="mt-4 space-y-3">
                {parts.map((part) => (
                    <div key={part.id} className="rounded-2xl bg-[#eff4ff] px-4 py-3 text-sm text-[#434656]">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-[#0b1c30]">{getPartName(part)}</p>
                          <p className="mt-1">Cantidad: {getPartQuantity(part)} · Subtotal: {getPartSubtotal(part)}</p>
                          {getPartSupplier(part) ? <p className="mt-1">Proveedor: {getPartSupplier(part)}</p> : null}
                          {getPartWarrantyDays(part) ? <p className="mt-1">Garantía: {getPartWarrantyDays(part)} días</p> : null}
                        </div>
                        <button type="button" className="text-sm font-semibold text-[#ba1a1a]" onClick={() => handleDeletePart(part.id)}>Eliminar</button>
                      </div>
                    </div>
                ))}
              </div>
            ) : null}
          </SectionCard>
        ) : null}

        {/* Archivos */}
        {activeTab === 'archivos' ? (
          <SectionCard title="Evidencias y archivos del servicio" description="Guarda fotos, videos o documentos del proceso.">
            <form onSubmit={handleCreateFile} className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Tipo de archivo</label>
                <select className="w-full rounded-2xl border border-[#c3c5d9] bg-white px-4 py-3 text-[16px] text-[#0b1c30]" value={fileForm.tipo} onChange={(e) => setFileForm((c) => ({ ...c, tipo: e.target.value }))}><option value="imagen">Imagen</option><option value="video">Video</option><option value="documento">Documento</option></select>
                <p className="text-xs text-[#737688]">Selecciona el tipo de evidencia.</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Etapa del servicio</label>
                <select className="w-full rounded-2xl border border-[#c3c5d9] bg-white px-4 py-3 text-[16px] text-[#0b1c30]" value={fileForm.etapa} onChange={(e) => setFileForm((c) => ({ ...c, etapa: e.target.value }))}><option value="antes">Antes</option><option value="durante">Durante</option><option value="despues">Despues</option><option value="otro">Otro</option></select>
                <p className="text-xs text-[#737688]">Antes, durante o después de la reparación.</p>
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">URL del archivo</label>
                <input className="w-full rounded-2xl border border-[#c3c5d9] bg-white px-4 py-3 text-[16px] text-[#0b1c30]" placeholder="Ej: https://.../foto.jpg" value={fileForm.url} onChange={(e) => setFileForm((c) => ({ ...c, url: e.target.value }))} required />
                <p className="text-xs text-[#737688]">Dirección del archivo que quieres guardar.</p>
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Descripción del archivo</label>
                <textarea className="min-h-24 w-full rounded-2xl border border-[#c3c5d9] bg-white px-4 py-3 text-[16px] text-[#0b1c30]" placeholder="Ej: Foto del equipo encendiendo luego del cambio de batería." value={fileForm.descripcion} onChange={(e) => setFileForm((c) => ({ ...c, descripcion: e.target.value }))} />
                <p className="text-xs text-[#737688]">Explica qué muestra el archivo.</p>
              </div>
              <Button type="submit" className="md:col-span-2" disabled={actionState.kind === 'file' && actionState.loading}>{actionState.kind === 'file' && actionState.loading ? 'Guardando...' : 'Agregar archivo'}</Button>
            </form>
            {actionState.kind === 'file' && actionState.message ? <p className="mt-3 text-sm text-[#434656]">{actionState.message}</p> : null}
            {files.length > 0 ? (
              <div className="mt-4 space-y-3">
                {files.map((file) => (
                  <div key={file.id} className="rounded-2xl bg-[#eff4ff] px-4 py-3 text-sm text-[#434656]">
                    <div className="flex items-start justify-between gap-3">
                      <div><p className="font-semibold text-[#0b1c30]">{file.type} · {file.stage}</p><a href={file.url} target="_blank" rel="noreferrer" className="mt-1 inline-flex font-semibold text-[#003ec7]">Abrir archivo</a>{file.description ? <p className="mt-1">{file.description}</p> : null}</div>
                      <button type="button" className="text-sm font-semibold text-[#ba1a1a]" onClick={() => handleDeleteFile(file.id)}>Eliminar</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </SectionCard>
        ) : null}

        {/* Garantia */}
        {activeTab === 'garantia' ? (
          <SectionCard title="Garantía del trabajo realizado" description="Cobertura posterior a la reparación.">
            <form onSubmit={handleWarrantySubmit} className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Qué cubre la garantía</label>
                <textarea className="min-h-24 w-full rounded-2xl border border-[#c3c5d9] bg-white px-4 py-3 text-[16px] text-[#0b1c30]" placeholder="Ej: Cubre falla del repuesto instalado y mano de obra." value={warrantyForm.descripcion} onChange={(e) => setWarrantyForm((c) => ({ ...c, descripcion: e.target.value }))} required />
                <p className="text-xs text-[#737688]">Describe qué problemas o componentes estarán cubiertos.</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Duración en días</label>
                <input className="w-full rounded-2xl border border-[#c3c5d9] bg-white px-4 py-3 text-[16px] text-[#0b1c30]" type="number" min="1" placeholder="Ej: 30" value={warrantyForm.duracionDias} onChange={(e) => setWarrantyForm((c) => ({ ...c, duracionDias: e.target.value }))} required />
                <p className="text-xs text-[#737688]">Cuántos días de cobertura tendrá el servicio una vez pase a cobro.</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Observaciones</label>
                <textarea className="min-h-24 w-full rounded-2xl border border-[#c3c5d9] bg-white px-4 py-3 text-[16px] text-[#0b1c30]" placeholder="Ej: No cubre golpes, humedad o manipulación por terceros." value={warrantyForm.observaciones} onChange={(e) => setWarrantyForm((c) => ({ ...c, observaciones: e.target.value }))} />
                <p className="text-xs text-[#737688]">Exclusiones, condiciones o recomendaciones.</p>
              </div>
              <Button type="submit" disabled={actionState.kind === 'warranty' && actionState.loading}>{actionState.kind === 'warranty' && actionState.loading ? 'Guardando...' : warranty ? 'Actualizar garantia' : 'Crear garantia'}</Button>
            </form>
            {actionState.kind === 'warranty' && actionState.message ? <p className="mt-3 text-sm text-[#434656]">{actionState.message}</p> : null}
            {warranty ? <div className="mt-4 rounded-2xl bg-[#eff4ff] px-4 py-3 text-sm text-[#434656]"><p className="font-semibold text-[#0b1c30]">Garantia activa: {warranty.active ? 'Si' : 'No'}</p><p className="mt-1">Fin: {warranty.endDate}</p></div> : null}
          </SectionCard>
        ) : null}

        {/* Cotizacion */}
        {activeTab === 'cotizacion' && service.estado === 'solicitado' ? (
          <form onSubmit={handleInitialQuoteSubmit} className="surface-card p-6">
            <h2 className="text-[20px] font-semibold text-[#0b1c30]">Enviar cotizacion inicial</h2>
            <p className="mt-2 text-sm leading-6 text-[#434656]">Completa estos campos con el valor preliminar que verá el cliente.</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                 <label className="text-xs font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Mano de obra estimada</label>
                 <input className="w-full rounded-2xl border border-[#c3c5d9] bg-white px-4 py-3 text-[16px] text-[#0b1c30]" type="number" min="0" step="0.01" placeholder="Ej: 40.00" value={quoteForm.precioManoObra} onChange={(e) => setQuoteForm((c) => ({ ...c, precioManoObra: e.target.value }))} required />
                <p className="text-xs text-[#737688]">Valor base aproximado por tu trabajo técnico, sin incluir traslado ni diagnóstico.</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Domicilio estimado</label>
                 <input className="w-full rounded-2xl border border-[#c3c5d9] bg-white px-4 py-3 text-[16px] text-[#0b1c30]" type="number" min="0" step="0.01" placeholder="Ej: 5.00" value={quoteForm.precioDomicilio} onChange={(e) => setQuoteForm((c) => ({ ...c, precioDomicilio: e.target.value }))} />
                <p className="text-xs text-[#737688]">Costo del traslado o visita. Si no aplica, deja `0.00`.</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Diagnostico estimado</label>
                 <input className="w-full rounded-2xl border border-[#c3c5d9] bg-white px-4 py-3 text-[16px] text-[#0b1c30]" type="number" min="0" step="0.01" placeholder="Ej: 0.00" value={quoteForm.precioDiagnostico} onChange={(e) => setQuoteForm((c) => ({ ...c, precioDiagnostico: e.target.value }))} />
                <p className="text-xs text-[#737688]">Si cobras revisión previa. Si es gratis, deja `0.00`.</p>
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Mensaje para el cliente</label>
                 <textarea className="min-h-24 w-full rounded-2xl border border-[#c3c5d9] bg-white px-4 py-3 text-[16px] text-[#0b1c30]" placeholder="Ej: El valor puede variar si se confirman repuestos adicionales." value={quoteForm.notaPrecio} onChange={(e) => setQuoteForm((c) => ({ ...c, notaPrecio: e.target.value }))} />
                <p className="text-xs text-[#737688]">Explica condiciones, posibles cambios o cualquier observación.</p>
              </div>
            </div>
            {actionState.kind === 'quote' && actionState.message ? <p className="mt-3 text-sm text-[#434656]">{actionState.message}</p> : null}
            <Button type="submit" className="mt-4" disabled={actionState.kind === 'quote' && actionState.loading}>{actionState.kind === 'quote' && actionState.loading ? 'Enviando...' : 'Enviar cotizacion'}</Button>
          </form>
        ) : null}

        {/* Cierre y cobro */}
        {activeTab === 'cierre' && service.estado === 'en_reparacion' ? (
          <SectionCard
            title="Cerrar reparacion y cobro final"
            description="Abre el modal para registrar montos finales, repuestos y garantia antes de pasar a pendiente de pago."
          >
            <Button type="button" onClick={handleOpenFinalPaymentModal}>Abrir cierre y cobro</Button>
          </SectionCard>
        ) : null}

        {/* Calificacion */}
        {activeTab === 'calificacion' && service.estado === 'finalizado' ? (
          <SectionCard title="Calificacion del cliente">
            {!clientRating ? <p className="text-sm text-[#737688]">Este servicio aun no tiene calificacion del cliente.</p> : (
              <div className="space-y-3 text-sm text-[#434656]">
                <p>Puntuacion: {clientRating.score} / 5</p>
                {clientRating.comment ? <p>{clientRating.comment}</p> : null}
              </div>
            )}
            <div className="mt-6 border-t border-[#d8dbeb] pt-6">
              <h3 className="text-[18px] font-semibold text-[#0b1c30]">Tu calificacion para el cliente</h3>
              {!myRating ? (
                <div className="mt-4">
                  <RatingForm
                    serviceId={service.id}
                    description="Califica al cliente para dejar registro de la experiencia de trabajo entre ambas partes."
                    placeholder="Escribe un comentario sobre el cliente"
                    submitLabel="Calificar cliente"
                    successMessage="Calificacion del cliente enviada correctamente"
                    onSuccess={() => setRefreshTick((current) => current + 1)}
                  />
                </div>
              ) : (
                <div className="mt-4 rounded-2xl bg-[#eff4ff] px-4 py-3 text-sm text-[#434656]">
                  <p className="font-semibold text-[#0b1c30]">Puntuacion: {myRating.score} / 5</p>
                  {myRating.comment ? <p className="mt-2">{myRating.comment}</p> : null}
                </div>
              )}
            </div>
          </SectionCard>
        ) : null}

      </div>

      <Modal open={chatOpen} onClose={() => setChatOpen(false)} title={`Chat del servicio ${service.codigo_servicio || `#${service.id}`}`} widthClassName="max-w-5xl">
        <div className="flex h-[70vh] min-h-0 flex-col gap-4">
          <p className="text-sm leading-6 text-[#434656]">Usa este chat para coordinar detalles, aclarar sintomas o notificar avances directamente al cliente.</p>
          <ChatBox serviceId={service.id} reloadKey={reloadKey} />
          <MessageInput serviceId={service.id} onMessageSent={() => setReloadKey((c) => c + 1)} />
        </div>
      </Modal>

      <Modal open={quoteSentModalOpen} onClose={handleCloseQuoteSentModal} title="Estimado enviado" widthClassName="max-w-lg">
        <div className="space-y-4">
          <p className="text-sm leading-6 text-[#434656]">Se ha enviado el estimado inicial correctamente.</p>
          <div className="flex justify-end">
            <Button type="button" onClick={handleCloseQuoteSentModal}>Aceptar</Button>
          </div>
        </div>
      </Modal>

      <Modal open={finalPaymentModalOpen} onClose={() => setFinalPaymentModalOpen(false)} title="Cierre y cobro final" widthClassName="max-w-5xl">
        <form onSubmit={handleFinalAmountsSubmit} className="space-y-6">
          <p className="text-sm leading-6 text-[#434656]">Registra el valor final de mano de obra, repuestos, domicilio y diagnóstico antes de pasar el servicio a pendiente de pago. Tambien puedes dejar listas las condiciones de garantia.</p>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Mano de obra final</label>
               <input className="w-full rounded-2xl border border-[#c3c5d9] bg-white px-4 py-3 text-[16px] text-[#0b1c30]" type="number" min="0" step="0.01" placeholder={`Ej: ${currentLaborAmount.toFixed(2)}`} value={finalAmountsForm.precioManoObra} onChange={(e) => setFinalAmountsForm((c) => ({ ...c, precioManoObra: e.target.value }))} required />
              <p className="text-xs text-[#737688]">Valor definitivo por tu trabajo técnico realizado.</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Repuestos finales</label>
              <div className="rounded-2xl border border-[#c3c5d9] bg-white px-4 py-3 text-[16px] text-[#0b1c30]">{registeredPartsTotal.toFixed(2)}</div>
              <p className="text-xs text-[#737688]">Se calcula automáticamente con los repuestos registrados en el servicio y los que agregues en este cierre.</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Domicilio final</label>
               <input className="w-full rounded-2xl border border-[#c3c5d9] bg-white px-4 py-3 text-[16px] text-[#0b1c30]" type="number" min="0" step="0.01" placeholder={`Ej: ${currentDomicilioAmount.toFixed(2)}`} value={finalAmountsForm.precioDomicilio} onChange={(e) => setFinalAmountsForm((c) => ({ ...c, precioDomicilio: e.target.value }))} />
               <p className="text-xs text-[#737688]">Escribe el valor final de domicilio que quedará cobrado al cliente.</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Diagnóstico final</label>
               <input className="w-full rounded-2xl border border-[#c3c5d9] bg-white px-4 py-3 text-[16px] text-[#0b1c30]" type="number" min="0" step="0.01" placeholder={`Ej: ${currentDiagnosticoAmount.toFixed(2)}`} value={finalAmountsForm.precioDiagnostico} onChange={(e) => setFinalAmountsForm((c) => ({ ...c, precioDiagnostico: e.target.value }))} />
               <p className="text-xs text-[#737688]">Escribe el valor final de diagnóstico que quedará cobrado al cliente.</p>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Resumen final para el cliente</label>
               <textarea className="min-h-24 w-full rounded-2xl border border-[#c3c5d9] bg-white px-4 py-3 text-[16px] text-[#0b1c30]" placeholder="Ej: Se reemplazó conector de carga, se probó encendido y el equipo quedó operativo." value={finalAmountsForm.notaPrecio} onChange={(e) => setFinalAmountsForm((c) => ({ ...c, notaPrecio: e.target.value }))} />
              <p className="text-xs text-[#737688]">Describe qué se hizo, qué se cobró y cualquier observación final.</p>
            </div>
          </div>

          <div className="rounded-[24px] border border-[#d8dbeb] bg-[#f8faff] p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-[18px] font-semibold text-[#0b1c30]">Condiciones de garantía</h3>
                <p className="mt-2 text-sm leading-6 text-[#434656]">Completa esta información para dejar registrada la cobertura antes de pasar el servicio a pendiente de pago.</p>
              </div>
              <label className="inline-flex items-center gap-2 rounded-full border border-[#c3c5d9] bg-white px-3 py-2 text-sm font-semibold text-[#0b1c30]">
                <input type="checkbox" checked={warrantyApplies} onChange={(e) => setWarrantyApplies(e.target.checked)} />
                Aplica
              </label>
            </div>
            {warrantyApplies ? (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Qué cubre la garantía</label>
                  <textarea className="min-h-24 w-full rounded-2xl border border-[#c3c5d9] bg-white px-4 py-3 text-[16px] text-[#0b1c30]" placeholder="Ej: Cubre fallas del repuesto instalado y mano de obra." value={warrantyForm.descripcion} onChange={(e) => setWarrantyForm((c) => ({ ...c, descripcion: e.target.value }))} required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Duración en días</label>
                  <input className="w-full rounded-2xl border border-[#c3c5d9] bg-white px-4 py-3 text-[16px] text-[#0b1c30]" type="number" min="1" placeholder="Ej: 30" value={warrantyForm.duracionDias} onChange={(e) => setWarrantyForm((c) => ({ ...c, duracionDias: e.target.value }))} required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Observaciones</label>
                  <input className="w-full rounded-2xl border border-[#c3c5d9] bg-white px-4 py-3 text-[16px] text-[#0b1c30]" type="text" placeholder="Ej: No cubre golpes ni humedad." value={warrantyForm.observaciones} onChange={(e) => setWarrantyForm((c) => ({ ...c, observaciones: e.target.value }))} />
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-[#737688]">La garantía no se registrará en este cierre.</p>
            )}
          </div>

          <div className="rounded-[24px] border border-[#d8dbeb] bg-[#f8faff] p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-[18px] font-semibold text-[#0b1c30]">Repuestos</h3>
                <p className="mt-2 text-sm leading-6 text-[#434656]">Agrega los repuestos utilizados solo si realmente aplican al cierre.</p>
              </div>
              <label className="inline-flex items-center gap-2 rounded-full border border-[#c3c5d9] bg-white px-3 py-2 text-sm font-semibold text-[#0b1c30]">
                <input
                  type="checkbox"
                  checked={finalPartsApplies}
                  onChange={(e) => {
                    const nextValue = e.target.checked;
                    setFinalPartsApplies(nextValue);
                    if (!nextValue) {
                      setFinalParts([]);
                      setFinalPartForm({ nombre: '', cantidad: 1, precioUnitario: '', proveedor: '', garantiaDias: 0 });
                    }
                  }}
                />
                Aplica
              </label>
            </div>
            {parts.length > 0 ? (
              <div className="mt-4 space-y-3">
                <p className="text-sm font-semibold text-[#0b1c30]">Repuestos ya registrados</p>
                {parts.map((part) => (
                  <div key={`registered-${part.id}`} className="rounded-2xl bg-white px-4 py-3 text-sm text-[#434656] shadow-[0_8px_24px_rgba(11,28,48,0.06)]">
                    <p className="font-semibold text-[#0b1c30]">{getPartName(part)}</p>
                    <p className="mt-1">Cantidad: {getPartQuantity(part)} · Subtotal: {getPartSubtotal(part)}</p>
                    {getPartSupplier(part) ? <p className="mt-1">Proveedor: {getPartSupplier(part)}</p> : null}
                    {getPartWarrantyDays(part) ? <p className="mt-1">Garantía: {getPartWarrantyDays(part)} días</p> : null}
                  </div>
                ))}
              </div>
            ) : null}
            {finalPartsApplies ? (
              <div className="mt-4 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Nombre del repuesto</label>
                    <input className="w-full rounded-2xl border border-[#c3c5d9] bg-white px-4 py-3 text-[16px] text-[#0b1c30]" type="text" placeholder="Ej: Pantalla LCD" value={finalPartForm.nombre} onChange={(e) => setFinalPartForm((c) => ({ ...c, nombre: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Cantidad</label>
                    <input className="w-full rounded-2xl border border-[#c3c5d9] bg-white px-4 py-3 text-[16px] text-[#0b1c30]" type="number" min="1" step="1" value={finalPartForm.cantidad} onChange={(e) => setFinalPartForm((c) => ({ ...c, cantidad: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Precio unitario</label>
                    <input className="w-full rounded-2xl border border-[#c3c5d9] bg-white px-4 py-3 text-[16px] text-[#0b1c30]" type="number" min="0" step="0.01" placeholder="Ej: 15.00" value={finalPartForm.precioUnitario} onChange={(e) => setFinalPartForm((c) => ({ ...c, precioUnitario: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Proveedor</label>
                    <input className="w-full rounded-2xl border border-[#c3c5d9] bg-white px-4 py-3 text-[16px] text-[#0b1c30]" type="text" placeholder="Opcional" value={finalPartForm.proveedor} onChange={(e) => setFinalPartForm((c) => ({ ...c, proveedor: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Garantía del repuesto en días</label>
                    <input className="w-full rounded-2xl border border-[#c3c5d9] bg-white px-4 py-3 text-[16px] text-[#0b1c30]" type="number" min="0" step="1" placeholder="Ej: 30" value={finalPartForm.garantiaDias} onChange={(e) => setFinalPartForm((c) => ({ ...c, garantiaDias: e.target.value }))} />
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button type="button" onClick={handleAddFinalPart} className="inline-flex items-center justify-center rounded-2xl bg-[#003ec7] px-5 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-[#0052ff]">Agregar repuesto</button>
                  <button type="button" onClick={() => setFinalParts([])} className="inline-flex items-center justify-center rounded-2xl border border-[#c3c5d9] bg-white px-5 py-3 text-[14px] font-semibold text-[#0b1c30] transition-colors hover:bg-[#eff4ff]">Limpiar lista</button>
                </div>

                {finalParts.length > 0 ? (
                  <div className="space-y-3">
                    {finalParts.map((part) => (
                      <div key={part.id} className="rounded-2xl bg-white px-4 py-3 text-sm text-[#434656] shadow-[0_8px_24px_rgba(11,28,48,0.06)]">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-[#0b1c30]">{part.nombre}</p>
                            <p className="mt-1">Cantidad: {part.cantidad} · Precio unitario: {part.precioUnitario || 0}</p>
                            {part.proveedor ? <p className="mt-1">Proveedor: {part.proveedor}</p> : null}
                            <p className="mt-1">Garantía: {part.garantiaDias} días</p>
                          </div>
                          <button type="button" onClick={() => handleRemoveFinalPart(part.id)} className="text-sm font-semibold text-[#ba1a1a]">Eliminar</button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[#737688]">Aun no agregaste repuestos. Si no aplican, puedes dejar esta sección vacia.</p>
                )}
              </div>
            ) : (
              <p className="mt-4 text-sm text-[#737688]">Los repuestos no se registrarán en este cierre.</p>
            )}
          </div>

          {actionState.kind === 'final-amounts' && actionState.message ? <p className="text-sm text-[#434656]">{actionState.message}</p> : null}

          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={actionState.kind === 'final-amounts' && actionState.loading}>{actionState.kind === 'final-amounts' && actionState.loading ? 'Guardando...' : 'Confirmar pendiente de pago'}</Button>
            <button type="button" onClick={() => setFinalPaymentModalOpen(false)} className="inline-flex items-center justify-center rounded-2xl border border-[#c3c5d9] bg-white px-5 py-3 text-[14px] font-semibold text-[#0b1c30] transition-colors hover:bg-[#eff4ff]">Cancelar</button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
