'use client';

import { useEffect, useState } from 'react';
import Modal from '../../../components/common/Modal';
import Input from '../../../components/common/Input';
import Button from '../../../components/common/Button';
import { deleteAdminUser, getAdminTechnicians, updateAdminTechnicianApproval, updateAdminTechnicianProfile } from '../../../services/admin.service';
import { getTechnicianSpecialties } from '../../../services/technician.service';

function getApprovalStatus(technician) {
  if (technician.verificado_admin) {
    return 'Aprobado';
  }

  if (technician.motivo_rechazo) {
    return 'Observado';
  }

  return 'Pendiente';
}

export default function AdminTechniciansPage() {
  const [technicians, setTechnicians] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [selectedTechnician, setSelectedTechnician] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [profileForm, setProfileForm] = useState({
    descripcion: '',
    aniosExperiencia: '',
    radioAtencionKm: '',
    tarifaBase: '',
    tarifaDomicilio: '',
    direccionTaller: '',
    latitudTaller: '',
    longitudTaller: '',
    moneda: 'USD',
    documentoUrl: '',
    disponible: false,
    specialtyIds: [],
  });
  const [submitting, setSubmitting] = useState(false);

  async function loadTechnicians() {
    try {
      setLoading(true);
      setError('');
      const response = await getAdminTechnicians();
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || 'No se pudieron cargar las solicitudes tecnicas');
      }

      setTechnicians(data.technicians || []);
    } catch (loadError) {
      setError(loadError.message || 'No se pudieron cargar las solicitudes tecnicas');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    async function bootstrap() {
      await loadTechnicians();

      try {
        const response = await getTechnicianSpecialties();
        const data = await response.json().catch(() => ({}));
        if (response.ok) {
          setSpecialties(data.specialties || []);
        }
      } catch {}
    }

    bootstrap();
  }, []);

  function syncSelectedTechnician(technician) {
    setSelectedTechnician(technician);
    setRejectionReason(technician.motivo_rechazo || '');
    setProfileForm({
      descripcion: technician.descripcion || '',
      aniosExperiencia: technician.anios_experiencia ?? '',
      radioAtencionKm: technician.radio_atencion_km ?? '',
      tarifaBase: technician.tarifa_base ?? '',
      tarifaDomicilio: technician.tarifa_domicilio ?? '',
      direccionTaller: technician.direccion_taller || '',
      latitudTaller: technician.latitud_taller ?? '',
      longitudTaller: technician.longitud_taller ?? '',
      moneda: technician.moneda || 'USD',
      documentoUrl: technician.documento_url || '',
      disponible: Boolean(technician.disponible),
      specialtyIds: Array.isArray(technician.especialidad_ids) ? technician.especialidad_ids.map(Number) : [],
    });
  }

  async function submitApproval(approve) {
    if (!selectedTechnician) {
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setMessage('');

      const payload = approve ? { approve: true } : { approve: false, motivoRechazo: rejectionReason };
      const response = await updateAdminTechnicianApproval(selectedTechnician.id, payload);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || 'No se pudo actualizar la solicitud');
      }

      setTechnicians((current) => current.map((item) => (item.id === data.technician.id ? data.technician : item)));
      syncSelectedTechnician(data.technician);
      setMessage(data.message || 'Solicitud actualizada correctamente');
    } catch (submitError) {
      setError(submitError.message || 'No se pudo actualizar la solicitud');
    } finally {
      setSubmitting(false);
    }
  }

  async function saveTechnicianProfile() {
    if (!selectedTechnician) {
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setMessage('');

      const response = await updateAdminTechnicianProfile(selectedTechnician.id, {
        descripcion: profileForm.descripcion,
        aniosExperiencia: profileForm.aniosExperiencia === '' ? null : Number(profileForm.aniosExperiencia),
        radioAtencionKm: profileForm.radioAtencionKm === '' ? null : Number(profileForm.radioAtencionKm),
        tarifaBase: profileForm.tarifaBase === '' ? null : Number(profileForm.tarifaBase),
        tarifaDomicilio: profileForm.tarifaDomicilio === '' ? null : Number(profileForm.tarifaDomicilio),
        direccionTaller: profileForm.direccionTaller,
        latitudTaller: profileForm.latitudTaller === '' ? null : Number(profileForm.latitudTaller),
        longitudTaller: profileForm.longitudTaller === '' ? null : Number(profileForm.longitudTaller),
        moneda: profileForm.moneda,
        documentoUrl: profileForm.documentoUrl,
        disponible: profileForm.disponible,
        specialtyIds: profileForm.specialtyIds,
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || 'No se pudo actualizar el perfil tecnico');
      }

      setTechnicians((current) => current.map((item) => (item.id === data.technician.id ? data.technician : item)));
      syncSelectedTechnician(data.technician);
      setMessage(data.message || 'Perfil tecnico actualizado correctamente');
    } catch (saveError) {
      setError(saveError.message || 'No se pudo actualizar el perfil tecnico');
    } finally {
      setSubmitting(false);
    }
  }

  async function removeTechnicianAccount() {
    if (!selectedTechnician) {
      return;
    }

    const confirmed = window.confirm('Se eliminara por completo la cuenta del tecnico, su perfil tecnico y toda la informacion relacionada. Esta accion no se puede deshacer.');
    if (!confirmed) {
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      setMessage('');

      const response = await deleteAdminUser(selectedTechnician.id);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || 'No se pudo eliminar la cuenta del tecnico');
      }

      setTechnicians((current) => current.filter((item) => item.id !== selectedTechnician.id));
      setSelectedTechnician(null);
      setMessage(data.message || 'Cuenta del tecnico eliminada correctamente');
    } catch (deleteError) {
      setError(deleteError.message || 'No se pudo eliminar la cuenta del tecnico');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mx-auto max-w-[1280px] px-5 py-8 md:px-10">
      <div className="mb-6">
        <h1 className="section-title">Gestion de tecnicos</h1>
        <p className="mt-2 text-sm text-[#434656]">Acepta o devuelve solicitudes tecnicas despues de revisar documentacion, experiencia y datos del perfil.</p>
      </div>

      {message ? <div className="mb-4 rounded-2xl bg-[#d7f8ef] px-4 py-3 text-sm text-[#00695c]">{message}</div> : null}
      {error ? <div className="mb-4 rounded-2xl bg-[#ffdad6] px-4 py-3 text-sm text-[#ba1a1a]">{error}</div> : null}
      {loading ? <div className="surface-card p-8 text-center text-[#737688]">Cargando solicitudes...</div> : null}

      {!loading ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {technicians.length === 0 ? <div className="surface-card p-8 text-center text-[#737688]">No hay solicitudes tecnicas registradas.</div> : technicians.map((technician) => (
            <article key={technician.id} className="surface-card p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.05em] text-[#737688]">{getApprovalStatus(technician)}</p>
                  <h2 className="mt-2 text-[22px] font-semibold text-[#0b1c30]">{[technician.nombre, technician.apellido].filter(Boolean).join(' ') || `Tecnico #${technician.id}`}</h2>
                  <p className="mt-1 text-sm text-[#434656]">{technician.correo || 'Sin correo'}{technician.telefono ? ` · ${technician.telefono}` : ''}</p>
                </div>
                {technician.documento_url ? <a href={technician.documento_url} target="_blank" rel="noreferrer" className="rounded-full border border-[#003ec7] px-4 py-2 text-sm font-semibold text-[#003ec7] hover:bg-[#eff4ff]">Abrir documento</a> : <span className="rounded-full bg-[#ffdad6] px-4 py-2 text-sm font-semibold text-[#ba1a1a]">Sin documento</span>}
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-[#eff4ff] px-4 py-3 text-sm text-[#434656]">
                  <p className="font-semibold text-[#0b1c30]">Especialidades</p>
                  <p className="mt-1 line-clamp-2">{technician.especialidades || 'No especificadas'}</p>
                </div>
                <div className="rounded-2xl bg-[#eff4ff] px-4 py-3 text-sm text-[#434656]">
                  <p className="font-semibold text-[#0b1c30]">Validacion</p>
                  <p className="mt-1">{technician.documentos_verificados ? 'Documentacion revisada' : 'Pendiente de revision'}</p>
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <button type="button" onClick={() => { syncSelectedTechnician(technician); setError(''); setMessage(''); }} className="rounded-full bg-[#003ec7] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0052ff]">Revisar solicitud</button>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      <Modal open={Boolean(selectedTechnician)} onClose={() => setSelectedTechnician(null)} title="Revision de tecnico" widthClassName="max-w-4xl">
        {selectedTechnician ? (
          <div className="space-y-5">
            <section className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-[#eff4ff] px-4 py-4 text-sm text-[#434656]">
                <p className="font-semibold text-[#0b1c30]">Datos del tecnico</p>
                <p className="mt-2">{[selectedTechnician.nombre, selectedTechnician.apellido].filter(Boolean).join(' ') || `Tecnico #${selectedTechnician.id}`}</p>
                <p className="mt-1">{selectedTechnician.correo || 'Sin correo'}</p>
                <p className="mt-1">{selectedTechnician.telefono || 'Sin telefono'}</p>
              </div>
              <div className="rounded-2xl bg-[#eff4ff] px-4 py-4 text-sm text-[#434656]">
                <p className="font-semibold text-[#0b1c30]">Estado actual</p>
                <p className="mt-2">Aprobado: {selectedTechnician.verificado_admin ? 'Si' : 'No'}</p>
                <p className="mt-1">Documento verificado: {selectedTechnician.documentos_verificados ? 'Si' : 'No'}</p>
                <p className="mt-1">Motivo observacion: {selectedTechnician.motivo_rechazo || 'Ninguno'}</p>
              </div>
            </section>

            <section className="rounded-2xl border border-[#d8dbeb] px-4 py-4 text-sm text-[#434656]">
              <p className="font-semibold text-[#0b1c30]">Descripcion profesional</p>
              <p className="mt-2 whitespace-pre-wrap">{selectedTechnician.descripcion || 'Sin descripcion profesional.'}</p>
            </section>

            <section className="rounded-2xl border border-[#d8dbeb] px-4 py-4 text-sm text-[#434656]">
              <p className="font-semibold text-[#0b1c30]">Editar perfil tecnico</p>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                <Input placeholder="Descripcion" value={profileForm.descripcion} onChange={(event) => setProfileForm((current) => ({ ...current, descripcion: event.target.value }))} />
                <Input placeholder="Años de experiencia" type="number" value={profileForm.aniosExperiencia} onChange={(event) => setProfileForm((current) => ({ ...current, aniosExperiencia: event.target.value }))} />
                <Input placeholder="Radio de atencion (km)" type="number" value={profileForm.radioAtencionKm} onChange={(event) => setProfileForm((current) => ({ ...current, radioAtencionKm: event.target.value }))} />
                <Input placeholder="Tarifa base" type="number" value={profileForm.tarifaBase} onChange={(event) => setProfileForm((current) => ({ ...current, tarifaBase: event.target.value }))} />
                <Input placeholder="Tarifa domicilio" type="number" value={profileForm.tarifaDomicilio} onChange={(event) => setProfileForm((current) => ({ ...current, tarifaDomicilio: event.target.value }))} />
                <Input placeholder="Moneda" value={profileForm.moneda} onChange={(event) => setProfileForm((current) => ({ ...current, moneda: event.target.value }))} />
                <Input placeholder="Direccion taller" value={profileForm.direccionTaller} onChange={(event) => setProfileForm((current) => ({ ...current, direccionTaller: event.target.value }))} />
                <Input placeholder="URL documento" value={profileForm.documentoUrl} onChange={(event) => setProfileForm((current) => ({ ...current, documentoUrl: event.target.value }))} />
                <Input placeholder="Latitud taller" type="number" value={profileForm.latitudTaller} onChange={(event) => setProfileForm((current) => ({ ...current, latitudTaller: event.target.value }))} />
                <Input placeholder="Longitud taller" type="number" value={profileForm.longitudTaller} onChange={(event) => setProfileForm((current) => ({ ...current, longitudTaller: event.target.value }))} />
              </div>
              <label className="mt-4 flex items-center gap-2 text-sm font-medium text-[#0b1c30]"><input type="checkbox" checked={profileForm.disponible} onChange={(event) => setProfileForm((current) => ({ ...current, disponible: event.target.checked }))} />Disponible para asignaciones</label>
              <div className="mt-4">
                <p className="mb-2 font-semibold text-[#0b1c30]">Especialidades</p>
                <div className="grid gap-2 md:grid-cols-2">
                  {specialties.map((specialty) => {
                    const checked = profileForm.specialtyIds.includes(Number(specialty.id));
                    return (
                      <label key={specialty.id} className="flex items-center gap-2 rounded-2xl border border-[#d8dbeb] px-3 py-2">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(event) => setProfileForm((current) => ({
                            ...current,
                            specialtyIds: event.target.checked
                              ? [...current.specialtyIds, Number(specialty.id)]
                              : current.specialtyIds.filter((item) => item !== Number(specialty.id)),
                          }))}
                        />
                        <span>{specialty.nombre}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-[#d8dbeb] px-4 py-4 text-sm text-[#434656]">
              <p className="font-semibold text-[#0b1c30]">Motivo de rechazo u observacion</p>
              <Input className="mt-3" placeholder="Describe ajustes requeridos si no apruebas la solicitud" value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} />
            </section>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setSelectedTechnician(null)} className="rounded-full border border-[#c3c5d9] px-5 py-2.5 text-sm font-semibold text-[#0b1c30] hover:bg-[#eff4ff]">Cerrar</button>
              <button type="button" disabled={submitting} onClick={removeTechnicianAccount} className="rounded-full border border-[#ba1a1a] px-5 py-2.5 text-sm font-semibold text-[#ba1a1a] hover:bg-[#fff3f1] disabled:opacity-70">Eliminar tecnico</button>
              <button type="button" disabled={submitting} onClick={saveTechnicianProfile} className="rounded-full border border-[#003ec7] px-5 py-2.5 text-sm font-semibold text-[#003ec7] hover:bg-[#eff4ff] disabled:opacity-70">Guardar perfil tecnico</button>
              <button type="button" disabled={submitting} onClick={() => submitApproval(false)} className="rounded-full border border-[#ba1a1a] px-5 py-2.5 text-sm font-semibold text-[#ba1a1a] hover:bg-[#fff3f1] disabled:opacity-70">{submitting ? 'Procesando...' : 'Marcar observaciones'}</button>
              <Button disabled={submitting || selectedTechnician.verificado_admin} onClick={() => submitApproval(true)}>{selectedTechnician.verificado_admin ? 'Tecnico aprobado' : submitting ? 'Procesando...' : 'Aceptar tecnico'}</Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </section>
  );
}
