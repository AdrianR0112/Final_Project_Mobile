'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Button from '../../../../components/common/Button';
import Modal from '../../../../components/common/Modal';
import ChatBox from '../../../../components/chat/ChatBox';
import MessageInput from '../../../../components/chat/MessageInput';
import { getOpenServiceRequestById, sendInitialQuote } from '../../../../services/service.service';
import { getStateLabel } from '../../../../utils/serviceStatus';

const ServiceLocationMap = dynamic(() => import('../../../../components/common/ServiceLocationMap'), { ssr: false });

function DetailSection({ title, description, children }) {
  return (
    <div className="surface-card p-6">
      <h2 className="text-[20px] font-semibold text-[#0b1c30]">{title}</h2>
      {description ? <p className="mt-2 text-sm leading-6 text-[#434656]">{description}</p> : null}
      <div className="mt-4">{children}</div>
    </div>
  );
}

export default function TechnicianRequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const serviceId = params?.id;
  const [service, setService] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [quoteForm, setQuoteForm] = useState({
    precioManoObra: '',
    precioDomicilio: '0',
    precioDiagnostico: '0',
    notaPrecio: '',
  });
  const [quoteState, setQuoteState] = useState({ loading: false, message: '' });

  useEffect(() => {
    async function loadRequest() {
      if (!serviceId) {
        setError('ID de solicitud no disponible');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await getOpenServiceRequestById(serviceId);
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.message || 'No se pudo cargar la solicitud');
        }

        setService(data.serviceRequest || null);
        setFiles(data.files || []);
        setError('');
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setLoading(false);
      }
    }

    loadRequest();
  }, [serviceId]);

  async function handleOpenChat() {
    setError('');
    setChatOpen(true);
  }

  async function handleSendQuote(event) {
    event.preventDefault();
    setError('');
    setQuoteState({ loading: true, message: '' });

    try {
      const response = await sendInitialQuote(serviceId, {
        precioManoObra: Number(quoteForm.precioManoObra || 0),
        precioDomicilio: Number(quoteForm.precioDomicilio || 0),
        precioDiagnostico: Number(quoteForm.precioDiagnostico || 0),
        notaPrecio: quoteForm.notaPrecio || null,
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || 'No se pudo enviar el estimado inicial');
      }

      setService(data.serviceRequest || null);
      setQuoteState({ loading: false, message: 'Estimado inicial enviado correctamente' });
      router.push(`/technician/active-service/${serviceId}?quoteSent=1`);
    } catch (quoteError) {
      setQuoteState({ loading: false, message: quoteError.message });
    }
  }

  const imageFiles = files.filter((file) => String(file.type).toLowerCase() === 'imagen');
  const extraFiles = files.filter((file) => String(file.type).toLowerCase() !== 'imagen');
  const canSendQuote = service?.estado === 'solicitado';

  if (loading) {
    return <section className="mx-auto max-w-[1280px] px-5 py-8 text-center text-[#737688] md:px-10">Cargando solicitud...</section>;
  }

  if (error && !service) {
    return <section className="mx-auto max-w-[1280px] px-5 py-8 text-center text-[#93000a] md:px-10">{error}</section>;
  }

  if (!service) {
    return <section className="mx-auto max-w-[1280px] px-5 py-8 text-center text-[#737688] md:px-10">Solicitud no encontrada</section>;
  }

  return (
    <section className="mx-auto max-w-[1280px] px-5 py-8 md:px-10">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <button type="button" onClick={() => router.push('/technician/requests')} className="text-sm font-semibold text-[#003ec7]">Volver a solicitudes</button>
          <h1 className="section-title mt-2">Detalle de solicitud {service.codigo_servicio || `#${service.id}`}</h1>
          <p className="mt-2 text-sm text-[#737688]">Conversa con el cliente desde el chat para aclarar dudas y cuando tengas suficiente contexto envia el estimado inicial.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={handleOpenChat} className="inline-flex items-center justify-center rounded-2xl bg-[#003ec7] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0052ff]">Abrir chat</button>
        </div>
      </div>

      {error ? <div className="mb-4 rounded-2xl bg-[#ffdad6] px-4 py-3 text-sm text-[#93000a]">{error}</div> : null}

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
        <div className="space-y-6">
          <DetailSection
            title="Resumen de la solicitud"
            description="Revisa primero los datos generales del equipo y del cliente para confirmar si puedes atender esta solicitud sin pedir informacion adicional."
          >
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-[22px] font-semibold text-[#0b1c30]">{service.tipo_equipo || 'Solicitud de servicio'}</h2>
              <span className="rounded-full bg-[#eff4ff] px-3 py-1 text-xs font-semibold uppercase tracking-[0.05em] text-[#003ec7]">{service.modalidad || 'Sin modalidad'}</span>
              <span className="rounded-full bg-[#fff3d6] px-3 py-1 text-xs font-semibold uppercase tracking-[0.05em] text-[#805b00]">{service.prioridad || 'normal'}</span>
            </div>
            <p className="mt-4 text-[16px] leading-7 text-[#434656]">{service.descripcion_problema}</p>
            <div className="mt-6 grid gap-3 text-sm text-[#434656] md:grid-cols-2">
              <p><span className="font-semibold text-[#0b1c30]">Cliente:</span> {`${service.cliente_nombre || ''} ${service.cliente_apellido || ''}`.trim() || 'No disponible'}</p>
              <p><span className="font-semibold text-[#0b1c30]">Correo:</span> {service.cliente_correo || 'No disponible'}</p>
              <p><span className="font-semibold text-[#0b1c30]">Telefono:</span> {service.cliente_telefono || 'No disponible'}</p>
              <p><span className="font-semibold text-[#0b1c30]">Solicitado:</span> {service.fecha_solicitud ? new Date(service.fecha_solicitud).toLocaleString() : 'No disponible'}</p>
              <p><span className="font-semibold text-[#0b1c30]">Marca:</span> {service.marca_equipo || 'No especificada'}</p>
              <p><span className="font-semibold text-[#0b1c30]">Modelo:</span> {service.modelo_equipo || 'No especificado'}</p>
              <p><span className="font-semibold text-[#0b1c30]">Serie:</span> {service.numero_serie_equipo || 'No especificada'}</p>
              <p><span className="font-semibold text-[#0b1c30]">Estado actual:</span> {getStateLabel(service.estado)}</p>
              {service.direccion ? <p className="md:col-span-2"><span className="font-semibold text-[#0b1c30]">Direccion:</span> {service.direccion}</p> : null}
              {service.referencia_direccion ? <p className="md:col-span-2"><span className="font-semibold text-[#0b1c30]">Referencia:</span> {service.referencia_direccion}</p> : null}
            </div>
          </DetailSection>

          <DetailSection
            title="Ubicacion del servicio"
            description="Usa este mapa para validar el punto exacto de visita. Si la modalidad es a domicilio, confirma la direccion y la referencia antes de salir."
          >
            <div>
              <ServiceLocationMap location={service.latitud && service.longitud ? { lat: Number(service.latitud), lng: Number(service.longitud), address: service.direccion || '' } : null} />
            </div>
          </DetailSection>

          <DetailSection
            title="Imagenes y archivos del cliente"
            description="Aqui puedes revisar evidencia visual del problema. Abre cada imagen para verla completa antes de conversar con el cliente o enviar el estimado inicial."
          >
            {imageFiles.length === 0 && extraFiles.length === 0 ? (
              <p className="text-sm text-[#737688]">Esta solicitud no tiene archivos adjuntos.</p>
            ) : (
              <div className="space-y-5">
                {imageFiles.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {imageFiles.map((file) => (
                      <a key={file.id} href={file.url} target="_blank" rel="noreferrer" className="overflow-hidden rounded-[24px] border border-[#d8dbeb] bg-[#eff4ff]">
                        <img src={file.url} alt={file.description || `Imagen ${file.id}`} className="h-56 w-full object-cover" />
                        <div className="px-4 py-3 text-sm text-[#434656]">{file.description || 'Imagen adjunta del cliente'}</div>
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
          </DetailSection>
        </div>

        <div className="space-y-6">
          <DetailSection
            title="Flujo recomendado"
            description="Sigue este orden para trabajar mejor la solicitud y evitar enviar una cotizacion sin suficiente contexto."
          >
            <div className="mt-4 space-y-3 text-sm text-[#434656]">
              <p><span className="font-semibold text-[#0b1c30]">1. Abrir chat:</span> usa el modal para aclarar sintomas, confirmar ubicacion o pedir fotos adicionales. El chat funciona sin necesidad de aceptar la solicitud.</p>
              <p><span className="font-semibold text-[#0b1c30]">2. Enviar estimado inicial:</span> al enviarlo, la solicitud se asigna a ti automaticamente y aparece en tus servicios activos como cotizacion inicial enviada.</p>
            </div>
          </DetailSection>

          <form onSubmit={handleSendQuote} className="surface-card p-6">
            <h2 className="text-[20px] font-semibold text-[#0b1c30]">Enviar estimado inicial</h2>
            <p className="mt-2 text-sm leading-6 text-[#434656]">Completa cada campo con el valor que corresponda. Si un concepto no aplica, puedes dejarlo en `0.00`. Antes de enviar, asegúrate de haber conversado con el cliente si necesitas más contexto.</p>
            <div className="mt-4 grid gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Costo estimado de mano de obra</label>
                <input className="w-full rounded-2xl border border-[#c3c5d9] bg-white px-4 py-3 text-[16px] text-[#0b1c30]" type="number" min="0" step="0.01" placeholder="Ej: 40.00" value={quoteForm.precioManoObra} onChange={(event) => setQuoteForm((current) => ({ ...current, precioManoObra: event.target.value }))} required />
                <p className="text-xs text-[#737688]">Escribe el valor base aproximado por tu trabajo técnico, sin incluir domicilio ni diagnóstico.</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Costo estimado de domicilio</label>
                <input className="w-full rounded-2xl border border-[#c3c5d9] bg-white px-4 py-3 text-[16px] text-[#0b1c30]" type="number" min="0" step="0.01" placeholder="Ej: 5.00" value={quoteForm.precioDomicilio} onChange={(event) => setQuoteForm((current) => ({ ...current, precioDomicilio: event.target.value }))} />
                <p className="text-xs text-[#737688]">Coloca el valor por traslado o visita. Si no aplica, deja `0.00`.</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Costo estimado de diagnóstico</label>
                <input className="w-full rounded-2xl border border-[#c3c5d9] bg-white px-4 py-3 text-[16px] text-[#0b1c30]" type="number" min="0" step="0.01" placeholder="Ej: 0.00" value={quoteForm.precioDiagnostico} onChange={(event) => setQuoteForm((current) => ({ ...current, precioDiagnostico: event.target.value }))} />
                <p className="text-xs text-[#737688]">Usa este campo si cobras revisión previa. Si el diagnóstico es gratis, deja `0.00`.</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Mensaje para el cliente</label>
                <textarea className="min-h-28 w-full rounded-2xl border border-[#c3c5d9] bg-white px-4 py-3 text-[16px] text-[#0b1c30]" placeholder="Ej: El precio puede variar si se requieren repuestos adicionales." value={quoteForm.notaPrecio} onChange={(event) => setQuoteForm((current) => ({ ...current, notaPrecio: event.target.value }))} />
                <p className="text-xs text-[#737688]">Explica condiciones, posibles variaciones o cualquier aclaración importante sobre el estimado.</p>
              </div>
            </div>
            {quoteState.message ? <p className="mt-3 text-sm text-[#434656]">{quoteState.message}</p> : null}
            <div className="mt-4 flex flex-wrap gap-3">
              <Button type="submit" disabled={quoteState.loading || !canSendQuote}>{quoteState.loading ? 'Enviando...' : 'Enviar estimado inicial'}</Button>
            </div>
          </form>
        </div>
      </div>

      <Modal open={chatOpen} onClose={() => setChatOpen(false)} title={`Chat del servicio ${service.codigo_servicio || `#${service.id}`}`} widthClassName="max-w-5xl">
        <div className="flex h-[70vh] min-h-0 flex-col gap-4">
          <p className="text-sm leading-6 text-[#434656]">Usa este chat para pedir aclaraciones, confirmar dirección o explicar cómo calculaste el estimado inicial antes de enviarlo.</p>
          <ChatBox serviceId={service.id} reloadKey={reloadKey} />
          <MessageInput serviceId={service.id} onMessageSent={() => setReloadKey((current) => current + 1)} />
        </div>
      </Modal>
    </section>
  );
}
