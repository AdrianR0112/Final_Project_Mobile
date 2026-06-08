'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Button from '../common/Button';
import { assignTechnicianToService, getAdminServiceById, getAdminServices, getAdminTechnicians } from '../../services/admin.service';

function serviceLabel(service) {
  const equipment = [service.tipoEquipo, service.marcaEquipo, service.modeloEquipo].filter(Boolean).join(' ');
  return equipment || service.codigoServicio || `Servicio #${service.id}`;
}

function participantName(person) {
  if (!person) {
    return 'Sin asignar';
  }

  return [person.nombre, person.apellido].filter(Boolean).join(' ').trim() || person.correo || 'Sin nombre';
}

export default function ServiceTable() {
  const [rows, setRows] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [filters, setFilters] = useState({ asignadoPorAdmin: '', tecnicoId: '' });
  const [selectedService, setSelectedService] = useState(null);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState('');
  const [assigning, setAssigning] = useState(false);

  async function loadServices(nextFilters = filters) {
    try {
      setLoading(true);
      setError('');
      const response = await getAdminServices({
        limit: 100,
        asignadoPorAdmin: nextFilters.asignadoPorAdmin || undefined,
        tecnicoId: nextFilters.tecnicoId || undefined,
      });
      const data = await response.json().catch(() => ({ services: [] }));

      if (!response.ok) {
        throw new Error(data.message || 'No se pudieron cargar los servicios');
      }

      setRows(data.services || []);
    } catch (loadError) {
      setError(loadError.message || 'No se pudieron cargar los servicios');
    } finally {
      setLoading(false);
    }
  }

  async function loadTechnicians() {
    const response = await getAdminTechnicians({ disponible: true });
    const data = await response.json().catch(() => ({ technicians: [] }));

    if (!response.ok) {
      throw new Error(data.message || 'No se pudieron cargar los tecnicos disponibles');
    }

    setTechnicians(data.technicians || []);
  }

  useEffect(() => {
    async function bootstrap() {
      try {
        await Promise.all([loadServices(), loadTechnicians()]);
      } catch (bootstrapError) {
        setError(bootstrapError.message || 'No se pudieron cargar los datos de servicios');
      }
    }

    bootstrap();
  }, []);

  async function openServiceDetail(serviceId) {
    try {
      setError('');
      const response = await getAdminServiceById(serviceId);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || 'No se pudo cargar el detalle del servicio');
      }

      setSelectedService(data.service || null);
      setSelectedTechnicianId('');
    } catch (detailError) {
      setError(detailError.message || 'No se pudo cargar el detalle del servicio');
    }
  }

  async function handleAssignTechnician() {
    if (!selectedService || !selectedTechnicianId) {
      return;
    }

    try {
      setAssigning(true);
      setError('');
      setMessage('');

      const response = await assignTechnicianToService(selectedService.id, { technicianId: Number(selectedTechnicianId) });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || 'No se pudo asignar el tecnico');
      }

      const updatedService = data.serviceRequest;
      setRows((current) => current.map((item) => (item.id === updatedService.id ? updatedService : item)));
      setSelectedService(updatedService);
      setMessage(data.message || 'Tecnico asignado correctamente');
      await loadTechnicians();
    } catch (assignError) {
      setError(assignError.message || 'No se pudo asignar el tecnico');
    } finally {
      setAssigning(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="surface-card p-5">
        <div className="grid gap-3 md:grid-cols-3">
          <select className="w-full rounded-2xl border border-[#c3c5d9] bg-white px-4 py-3 text-[16px] text-[#0b1c30]" value={filters.asignadoPorAdmin} onChange={(event) => setFilters((current) => ({ ...current, asignadoPorAdmin: event.target.value }))}>
            <option value="">Asignacion manual o automatica</option>
            <option value="true">Asignados por admin</option>
            <option value="false">No asignados por admin</option>
          </select>
          <Input placeholder="Filtrar por id tecnico" value={filters.tecnicoId} onChange={(event) => setFilters((current) => ({ ...current, tecnicoId: event.target.value }))} />
          <Button className="w-full" onClick={() => loadServices(filters)}>Aplicar filtros</Button>
        </div>
      </div>

      {message ? <div className="rounded-2xl bg-[#d7f8ef] px-4 py-3 text-sm text-[#00695c]">{message}</div> : null}
      {error ? <div className="rounded-2xl bg-[#ffdad6] px-4 py-3 text-sm text-[#ba1a1a]">{error}</div> : null}

      <div className="surface-card overflow-x-auto">
        {loading ? (
          <div className="px-6 py-8 text-center text-[#737688]">Cargando servicios...</div>
        ) : rows.length === 0 ? (
          <div className="px-6 py-8 text-center text-[#737688]">No se encontraron servicios.</div>
        ) : (
          <table className="w-full min-w-[1100px] text-left">
            <thead className="bg-[#eff4ff] text-[14px] font-semibold uppercase tracking-[0.05em] text-[#434656]">
              <tr>
                <th className="px-6 py-4">Codigo</th>
                <th className="px-6 py-4">Servicio</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Tecnico</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4">Asignacion</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-[#c3c5d9] bg-white align-top text-sm text-[#0b1c30]">
                  <td className="px-6 py-4 font-semibold text-[#003ec7]">{row.codigoServicio || `#${row.id}`}</td>
                  <td className="px-6 py-4">
                    <p className="font-semibold">{serviceLabel(row)}</p>
                    <p className="mt-1 text-xs text-[#737688] line-clamp-2">{row.descripcionProblema || 'Sin descripcion'}</p>
                  </td>
                  <td className="px-6 py-4 text-[#434656]">{participantName(row.cliente)}</td>
                  <td className="px-6 py-4 text-[#434656]">{participantName(row.tecnico)}</td>
                  <td className="px-6 py-4 capitalize">{row.estado || 'Sin estado'}</td>
                  <td className="px-6 py-4">{row.asignadoPorAdmin ? 'Manual' : 'Normal'}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap justify-end gap-2">
                      <button type="button" className="rounded-full border border-[#c3c5d9] px-3 py-2 text-xs font-semibold text-[#0b1c30] hover:bg-[#eff4ff]" onClick={() => openServiceDetail(row.id)}>Ver detalle</button>
                      <Link href={`/admin/services/${row.id}`} className="rounded-full border border-[#003ec7] px-3 py-2 text-xs font-semibold text-[#003ec7] hover:bg-[#eff4ff]">Vista completa</Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={Boolean(selectedService)} onClose={() => setSelectedService(null)} title="Supervision del servicio" widthClassName="max-w-5xl">
        {selectedService ? (
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-[#eff4ff] px-4 py-4 text-sm text-[#434656]">
                <p className="font-semibold text-[#0b1c30]">Servicio</p>
                <p className="mt-2">{serviceLabel(selectedService)}</p>
                <p className="mt-1">Codigo: {selectedService.codigoServicio || `#${selectedService.id}`}</p>
                <p className="mt-1">Estado: {selectedService.estado || 'Sin estado'}</p>
                <p className="mt-1">Prioridad: {selectedService.prioridad || 'No definida'}</p>
              </div>
              <div className="rounded-2xl bg-[#eff4ff] px-4 py-4 text-sm text-[#434656]">
                <p className="font-semibold text-[#0b1c30]">Participantes</p>
                <p className="mt-2">Cliente: {participantName(selectedService.cliente)}</p>
                <p className="mt-1">Tecnico: {participantName(selectedService.tecnico)}</p>
                <p className="mt-1">Modalidad: {selectedService.modalidad || 'No definida'}</p>
                <p className="mt-1">Asignado por admin: {selectedService.asignadoPorAdmin ? 'Si' : 'No'}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-[#d8dbeb] px-4 py-4 text-sm text-[#434656]">
              <p className="font-semibold text-[#0b1c30]">Descripcion y ubicacion</p>
              <p className="mt-2 whitespace-pre-wrap">{selectedService.descripcionProblema || 'Sin descripcion'}</p>
              <p className="mt-3">Direccion: {selectedService.direccion || 'Sin direccion registrada'}</p>
              {selectedService.referenciaDireccion ? <p className="mt-1">Referencia: {selectedService.referenciaDireccion}</p> : null}
              {selectedService.notasAdmin ? <p className="mt-3">Notas admin: {selectedService.notasAdmin}</p> : null}
            </div>

            {!selectedService.tecnicoId ? (
              <div className="rounded-2xl border border-[#d8dbeb] px-4 py-4 text-sm text-[#434656]">
                <p className="font-semibold text-[#0b1c30]">Asignacion manual</p>
                <div className="mt-3 flex flex-col gap-3 md:flex-row">
                  <select className="w-full rounded-2xl border border-[#c3c5d9] bg-white px-4 py-3 text-[16px] text-[#0b1c30]" value={selectedTechnicianId} onChange={(event) => setSelectedTechnicianId(event.target.value)}>
                    <option value="">Selecciona un tecnico disponible</option>
                    {technicians.map((technician) => (
                      <option key={technician.id} value={technician.id}>{[technician.nombre, technician.apellido].filter(Boolean).join(' ')} - {technician.especialidades || 'Sin especialidad'}</option>
                    ))}
                  </select>
                  <Button className="md:min-w-[220px]" disabled={!selectedTechnicianId || assigning} onClick={handleAssignTechnician}>{assigning ? 'Asignando...' : 'Asignar tecnico'}</Button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
