'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getAdminServiceById } from '../../../../services/admin.service';

function personLabel(person) {
  if (!person) {
    return 'Sin asignar';
  }

  return [person.nombre, person.apellido].filter(Boolean).join(' ').trim() || person.correo || 'Sin nombre';
}

export default function AdminServiceDetailPage() {
  const params = useParams();
  const serviceId = params?.id;
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadService() {
      if (!serviceId) {
        setError('ID de servicio no disponible');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await getAdminServiceById(serviceId);
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.message || 'No se pudo cargar el servicio');
        }

        setService(data.service || null);
      } catch (loadError) {
        setError(loadError.message || 'No se pudo cargar el servicio');
      } finally {
        setLoading(false);
      }
    }

    loadService();
  }, [serviceId]);

  return (
    <div className="mx-auto max-w-[1280px] px-5 py-8 md:px-10">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="section-title">Servicio {service?.codigoServicio || `#${serviceId}`}</h1>
          <p className="muted-copy mt-2">Revision administrativa completa de la orden, participantes y trazabilidad operativa.</p>
        </div>
        <Link href="/admin/services" className="rounded-full border border-[#003ec7] px-4 py-2 text-sm font-semibold text-[#003ec7] hover:bg-[#eff4ff]">Volver a servicios</Link>
      </div>

      {loading ? <div className="surface-card p-8 text-center text-[#737688]">Cargando servicio...</div> : null}
      {error ? <div className="surface-card p-8 text-center text-[#93000a]">{error}</div> : null}
      {!loading && !error && !service ? <div className="surface-card p-8 text-center text-[#737688]">Servicio no encontrado.</div> : null}

      {service ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <section className="surface-card p-6">
            <h2 className="text-[20px] font-semibold text-[#0b1c30]">Resumen del servicio</h2>
            <div className="mt-4 space-y-2 text-sm text-[#434656]">
              <p><span className="font-semibold text-[#0b1c30]">Equipo:</span> {[service.tipoEquipo, service.marcaEquipo, service.modeloEquipo].filter(Boolean).join(' ') || 'No definido'}</p>
              <p><span className="font-semibold text-[#0b1c30]">Estado:</span> {service.estado || 'Sin estado'}</p>
              <p><span className="font-semibold text-[#0b1c30]">Modalidad:</span> {service.modalidad || 'No definida'}</p>
              <p><span className="font-semibold text-[#0b1c30]">Prioridad:</span> {service.prioridad || 'No definida'}</p>
              <p><span className="font-semibold text-[#0b1c30]">Asignado por admin:</span> {service.asignadoPorAdmin ? 'Si' : 'No'}</p>
              <p><span className="font-semibold text-[#0b1c30]">Fecha solicitud:</span> {service.fechaSolicitud ? new Date(service.fechaSolicitud).toLocaleString() : 'Sin fecha'}</p>
              <p><span className="font-semibold text-[#0b1c30]">Fecha asignacion:</span> {service.fechaAsignacion ? new Date(service.fechaAsignacion).toLocaleString() : 'Sin fecha'}</p>
            </div>
          </section>

          <section className="surface-card p-6">
            <h2 className="text-[20px] font-semibold text-[#0b1c30]">Participantes</h2>
            <div className="mt-4 space-y-2 text-sm text-[#434656]">
              <p><span className="font-semibold text-[#0b1c30]">Cliente:</span> {personLabel(service.cliente)}</p>
              <p><span className="font-semibold text-[#0b1c30]">Tecnico:</span> {personLabel(service.tecnico)}</p>
              <p><span className="font-semibold text-[#0b1c30]">Direccion:</span> {service.direccion || 'Sin direccion'}</p>
              {service.referenciaDireccion ? <p><span className="font-semibold text-[#0b1c30]">Referencia:</span> {service.referenciaDireccion}</p> : null}
            </div>
          </section>

          <section className="surface-card p-6 xl:col-span-2">
            <h2 className="text-[20px] font-semibold text-[#0b1c30]">Incidencia reportada</h2>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-[#434656]">{service.descripcionProblema || 'Sin descripcion registrada.'}</p>
            {service.notasAdmin ? <p className="mt-4 text-sm text-[#434656]"><span className="font-semibold text-[#0b1c30]">Notas admin:</span> {service.notasAdmin}</p> : null}
            {service.notasTecnico ? <p className="mt-2 text-sm text-[#434656]"><span className="font-semibold text-[#0b1c30]">Notas tecnico:</span> {service.notasTecnico}</p> : null}
          </section>
        </div>
      ) : null}
    </div>
  );
}
