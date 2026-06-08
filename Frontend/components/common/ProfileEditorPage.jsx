'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { getMyClientProfile } from '../../services/client.service';
import { getTechnicianProfile, getTechnicianSpecialties, updateTechnicianProfile, updateTechnicianSpecialties } from '../../services/technician.service';
import { getCurrentUser, updateCurrentUser, updateCurrentUserPassword, uploadProfilePhoto } from '../../services/user.service';
import { getStoredToken, persistAuthSession } from '../../utils/auth';

const LocationMapPicker = dynamic(() => import('../client/LocationMapPicker'), { ssr: false });

function normalizeSpecialtyId(value) {
  return String(value);
}

function buildSharedForm(user) {
  return {
    nombre: user?.nombre || '',
    apellido: user?.apellido || '',
    telefono: user?.telefono || '',
    cedula: user?.cedula || '',
    genero: user?.genero || '',
    fechaNacimiento: user?.fechaNacimiento ? String(user.fechaNacimiento).slice(0, 10) : '',
    direccionPrincipal: user?.direccionPrincipal || '',
    ciudad: user?.ciudad || '',
    pais: user?.pais || '',
    fotoPerfilUrl: user?.fotoPerfilUrl || '',
    correo: user?.correo || '',
  };
}

function buildTechnicianForm(profile, specialtiesCatalog = []) {
  const selectedSpecialtyIds = specialtiesCatalog
    .filter((specialty) => (profile?.especialidades || []).includes(specialty.nombre))
    .map((specialty) => normalizeSpecialtyId(specialty.id));

  return {
    descripcion: profile?.descripcion || '',
    disponible: Boolean(profile?.disponible),
    aniosExperiencia: profile?.aniosExperiencia ?? '',
    radioAtencionKm: profile?.radioAtencionKm ?? '',
    tarifaBase: profile?.tarifaBase ?? '',
    tarifaDomicilio: profile?.tarifaDomicilio ?? '',
    direccionTaller: profile?.direccionTaller || '',
    latitudTaller: profile?.latitudTaller ?? '',
    longitudTaller: profile?.longitudTaller ?? '',
    moneda: profile?.moneda || 'USD',
    specialtyIds: selectedSpecialtyIds,
  };
}

function mapSharedPayload(form) {
  return {
    nombre: form.nombre.trim() || null,
    apellido: form.apellido.trim() || null,
    telefono: form.telefono.trim() || null,
    cedula: form.cedula.trim() || null,
    genero: form.genero.trim() || null,
    fechaNacimiento: form.fechaNacimiento || null,
    direccionPrincipal: form.direccionPrincipal.trim() || null,
    ciudad: form.ciudad.trim() || null,
    pais: form.pais.trim() || null,
    fotoPerfilUrl: form.fotoPerfilUrl.trim() || null,
  };
}

function mapTechnicianPayload(form) {
  const parseNumberOrNull = (value) => {
    if (value === '' || value === null || value === undefined) {
      return null;
    }

    const numericValue = Number(value);
    return Number.isNaN(numericValue) ? null : numericValue;
  };

  return {
    descripcion: form.descripcion.trim() || null,
    disponible: Boolean(form.disponible),
    aniosExperiencia: parseNumberOrNull(form.aniosExperiencia),
    radioAtencionKm: parseNumberOrNull(form.radioAtencionKm),
    tarifaBase: parseNumberOrNull(form.tarifaBase),
    tarifaDomicilio: parseNumberOrNull(form.tarifaDomicilio),
    direccionTaller: form.direccionTaller.trim() || null,
    latitudTaller: parseNumberOrNull(form.latitudTaller),
    longitudTaller: parseNumberOrNull(form.longitudTaller),
    moneda: form.moneda.trim() || null,
  };
}

function getRoleLabel(role) {
  if (role === 'admin') {
    return 'Administrador';
  }

  if (role === 'technician') {
    return 'Tecnico';
  }

  return 'Cliente';
}

function getSectionList(role) {
  return [
    { id: 'resumen', label: 'Resumen' },
    { id: 'datos-personales', label: 'Datos personales' },
    ...(role === 'technician' ? [{ id: 'perfil-tecnico', label: 'Perfil tecnico' }] : []),
    { id: 'seguridad', label: 'Seguridad' },
  ];
}

function getInitials(fullName) {
  return fullName
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function SectionCard({ id, eyebrow, title, description, children, tone = 'white' }) {
  const toneClassName = tone === 'tinted'
    ? 'border-[#d8dbeb] bg-[#eff4ff]'
    : 'border-[#d8dbeb] bg-white';

  return (
    <section id={id} className={`scroll-mt-28 rounded-[28px] border p-6 shadow-[0_18px_60px_rgba(11,28,48,0.08)] md:p-8 ${toneClassName}`}>
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#737688]">{eyebrow}</p>
        <h2 className="mt-2 text-[24px] font-semibold text-[#0b1c30]">{title}</h2>
        {description ? <p className="mt-2 max-w-3xl text-sm text-[#434656]">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export default function ProfileEditorPage({ role }) {
  const { user, setUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [sharedForm, setSharedForm] = useState(buildSharedForm(null));
  const [technicianForm, setTechnicianForm] = useState(buildTechnicianForm(null, []));
  const [specialties, setSpecialties] = useState([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordMessage, setPasswordMessage] = useState('');

  const displayName = useMemo(() => {
    const fullName = `${sharedForm.nombre} ${sharedForm.apellido}`.trim();
    return fullName || 'Usuario';
  }, [sharedForm.apellido, sharedForm.nombre]);

  const sectionList = useMemo(() => getSectionList(role), [role]);
  const [activeSection, setActiveSection] = useState(sectionList[0]?.id || 'resumen');

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        setLoading(true);
        setError('');
        setMessage('');

        if (role === 'technician') {
          const [userRes, technicianRes, specialtiesRes] = await Promise.all([
            getCurrentUser(),
            getTechnicianProfile(),
            getTechnicianSpecialties(),
          ]);

          const userData = await userRes.json().catch(() => ({}));
          const technicianData = await technicianRes.json().catch(() => ({}));
          const specialtiesData = await specialtiesRes.json().catch(() => ({}));

          if (!userRes.ok) {
            throw new Error(userData.message || 'No se pudo cargar el usuario');
          }

          if (!technicianRes.ok) {
            throw new Error(technicianData.message || 'No se pudo cargar el perfil tecnico');
          }

          if (!specialtiesRes.ok) {
            throw new Error(specialtiesData.message || 'No se pudo cargar las especialidades');
          }

          if (!cancelled) {
            const catalog = specialtiesData.specialties || [];
            setSpecialties(catalog);
            setSharedForm(buildSharedForm(userData.user || null));
            setTechnicianForm(buildTechnicianForm(technicianData.profile || null, catalog));
          }

          return;
        }

        if (role === 'admin') {
          const response = await getCurrentUser();
          const data = await response.json().catch(() => ({}));

          if (!response.ok) {
            throw new Error(data.message || 'No se pudo cargar el perfil');
          }

          if (!cancelled) {
            setSharedForm(buildSharedForm(data.user || null));
          }

          return;
        }

        const response = await getMyClientProfile();
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.message || 'No se pudo cargar el perfil');
        }

        if (!cancelled) {
          setSharedForm(buildSharedForm(data.profile || null));
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [role]);

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const userResponse = await updateCurrentUser(mapSharedPayload(sharedForm));
      const userData = await userResponse.json().catch(() => ({}));

      if (!userResponse.ok) {
        throw new Error(userData.message || 'No se pudo actualizar el perfil');
      }

      if (role === 'technician') {
        const technicianResponse = await updateTechnicianProfile(mapTechnicianPayload(technicianForm));
        const technicianData = await technicianResponse.json().catch(() => ({}));

        if (!technicianResponse.ok) {
          throw new Error(technicianData.message || 'No se pudo actualizar el perfil tecnico');
        }

        const specialtiesResponse = await updateTechnicianSpecialties({ specialtyIds: technicianForm.specialtyIds });
        const specialtiesData = await specialtiesResponse.json().catch(() => ({}));

        if (!specialtiesResponse.ok) {
          throw new Error(specialtiesData.message || 'No se pudieron actualizar las especialidades');
        }
      }

      const updatedUser = userData.user || user;
      const token = getStoredToken();

      if (updatedUser) {
        persistAuthSession({ token, user: updatedUser });
        setUser(updatedUser);
      }

      setMessage(role === 'technician' ? 'Perfil tecnico actualizado correctamente' : 'Perfil actualizado correctamente');
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotoUpload(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setUploadingPhoto(true);
    setError('');

    try {
      const response = await uploadProfilePhoto(file);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || 'No se pudo subir la foto');
      }

      setSharedForm((current) => ({ ...current, fotoPerfilUrl: data.fotoPerfilUrl || current.fotoPerfilUrl }));
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault();
    setPasswordSaving(true);
    setPasswordError('');
    setPasswordMessage('');

    try {
      if (passwordForm.newPassword.length < 6) {
        throw new Error('La nueva contrasena debe tener al menos 6 caracteres');
      }

      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        throw new Error('La confirmacion no coincide con la nueva contrasena');
      }

      const response = await updateCurrentUserPassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || 'No se pudo actualizar la contrasena');
      }

      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordMessage(data.message || 'Contrasena actualizada correctamente');
    } catch (submitError) {
      setPasswordError(submitError.message);
    } finally {
      setPasswordSaving(false);
    }
  }

  function toggleSpecialty(specialtyId) {
    const normalizedId = normalizeSpecialtyId(specialtyId);

    setTechnicianForm((current) => ({
      ...current,
      specialtyIds: current.specialtyIds.includes(normalizedId)
        ? current.specialtyIds.filter((id) => id !== normalizedId)
        : [...current.specialtyIds, normalizedId],
    }));
  }

  return (
    <div className="mx-auto max-w-[1280px] px-5 py-8 md:px-10">
      <div className="flex flex-col gap-6">
        <div className="rounded-[28px] bg-[linear-gradient(135deg,#003ec7_0%,#4d7cff_100%)] px-6 py-8 text-white shadow-[0_24px_80px_rgba(0,62,199,0.22)] md:px-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[#dfe8ff]">Configuracion de perfil</p>
              <h1 className="mt-2 text-[32px] font-semibold leading-tight">Edita tu perfil</h1>
              <p className="mt-3 max-w-2xl text-sm text-[#dfe8ff]">Actualiza tu informacion personal, revisa tu cuenta y guarda los cambios</p>
            </div>
            <div className="inline-flex w-fit items-center rounded-full bg-white/14 px-4 py-2 text-sm font-semibold backdrop-blur">
              {getRoleLabel(role)}
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-[#d8dbeb] bg-white p-4 shadow-[0_18px_60px_rgba(11,28,48,0.08)] md:p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#737688]">Secciones</p>
          <div className="mt-4 flex flex-wrap gap-3">
            {sectionList.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSection(section.id)}
                className={`inline-flex min-w-[160px] items-center justify-center rounded-[20px] border px-5 py-3 text-sm font-semibold transition-colors ${activeSection === section.id ? 'border-[#003ec7] bg-[#eff4ff] text-[#003ec7]' : 'border-[#c3c5d9] bg-[#f8f9ff] text-[#0b1c30] hover:bg-[#eff4ff] hover:text-[#003ec7]'}`}
              >
                {section.label}
              </button>
            ))}
          </div>
        </div>

        <div className="min-w-0 space-y-6">
            {loading ? (
              <div className="rounded-[28px] border border-[#d8dbeb] bg-white px-6 py-12 text-center text-sm text-[#737688] shadow-[0_18px_60px_rgba(11,28,48,0.08)]">
                Cargando perfil...
              </div>
            ) : (
              <>
                {error ? <div className="rounded-[24px] bg-[#ffdad6] px-4 py-3 text-sm text-[#93000a]">{error}</div> : null}
                {message ? <div className="rounded-[24px] bg-[#d7f8ef] px-4 py-3 text-sm text-[#00695c]">{message}</div> : null}

                {activeSection === 'resumen' ? (
                  <SectionCard
                    id="resumen"
                    eyebrow="Resumen"
                    title="Estado general de tu cuenta"
                    description="Verifica rapidamente como se muestra tu perfil antes de guardar cambios."
                  >
                    <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr_1fr]">
                      <div className="rounded-[24px] bg-[#eff4ff] p-5">
                        <div className="flex items-center gap-4">
                          {sharedForm.fotoPerfilUrl ? (
                            <img src={sharedForm.fotoPerfilUrl} alt="Foto de perfil" className="h-20 w-20 rounded-[24px] object-cover" />
                          ) : (
                            <div className="flex h-20 w-20 items-center justify-center rounded-[24px] bg-[#dce1ff] text-xl font-bold text-[#003ec7]">
                              {getInitials(displayName) || 'U'}
                            </div>
                          )}
                          <div>
                            <p className="text-[20px] font-semibold text-[#0b1c30]">{displayName}</p>
                            <p className="mt-1 text-sm text-[#434656]">{sharedForm.correo || 'Sin correo registrado'}</p>
                            <p className="mt-3 inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-[#003ec7]">
                              {getRoleLabel(role)}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="rounded-[24px] border border-[#d8dbeb] p-5">
                        <p className="text-sm text-[#737688]">Telefono</p>
                        <p className="mt-2 text-lg font-semibold text-[#0b1c30]">{sharedForm.telefono || 'Sin definir'}</p>
                      </div>
                      <div className="rounded-[24px] border border-[#d8dbeb] p-5">
                        <p className="text-sm text-[#737688]">Ubicacion</p>
                        <p className="mt-2 text-lg font-semibold text-[#0b1c30]">{[sharedForm.ciudad, sharedForm.pais].filter(Boolean).join(', ') || 'Sin definir'}</p>
                      </div>
                      {role === 'technician' ? (
                        <>
                          <div className="rounded-[24px] border border-[#d8dbeb] p-5">
                            <p className="text-sm text-[#737688]">Disponibilidad</p>
                            <p className="mt-2 text-lg font-semibold text-[#0b1c30]">{technicianForm.disponible ? 'Disponible' : 'No disponible'}</p>
                          </div>
                          <div className="rounded-[24px] border border-[#d8dbeb] p-5">
                            <p className="text-sm text-[#737688]">Especialidades</p>
                            <p className="mt-2 text-lg font-semibold text-[#0b1c30]">{technicianForm.specialtyIds.length}</p>
                          </div>
                          <div className="rounded-[24px] border border-[#d8dbeb] p-5">
                            <p className="text-sm text-[#737688]">Tarifa base</p>
                            <p className="mt-2 text-lg font-semibold text-[#0b1c30]">{technicianForm.tarifaBase || 'Sin definir'} {technicianForm.moneda || ''}</p>
                          </div>
                        </>
                      ) : null}
                    </div>
                  </SectionCard>
                ) : null}

                <form onSubmit={handleSubmit} className="space-y-6">
                  {activeSection === 'datos-personales' ? (
                    <SectionCard
                      id="datos-personales"
                      eyebrow="Datos personales"
                      title="Informacion basica"
                      description="Completa los datos que usa la plataforma para identificarte y contactarte."
                    >
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Nombre</label>
                          <input type="text" placeholder="Tu nombre" className="w-full rounded-xl border border-[#c3c5d9] px-3 py-2.5 text-sm" value={sharedForm.nombre} onChange={(event) => setSharedForm((current) => ({ ...current, nombre: event.target.value }))} />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Apellido</label>
                          <input type="text" placeholder="Tu apellido" className="w-full rounded-xl border border-[#c3c5d9] px-3 py-2.5 text-sm" value={sharedForm.apellido} onChange={(event) => setSharedForm((current) => ({ ...current, apellido: event.target.value }))} />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Correo electronico</label>
                          <input type="email" disabled className="w-full rounded-xl border border-[#c3c5d9] bg-[#f5f5f5] px-3 py-2.5 text-sm text-[#737688]" value={sharedForm.correo} />
                          <p className="text-xs text-[#737688]">No editable. Contacta a soporte para cambiarlo.</p>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Telefono</label>
                          <input type="text" placeholder="Ej: +57 300 000 0000" className="w-full rounded-xl border border-[#c3c5d9] px-3 py-2.5 text-sm" value={sharedForm.telefono} onChange={(event) => setSharedForm((current) => ({ ...current, telefono: event.target.value }))} />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Cedula</label>
                          <input type="text" placeholder="Documento de identidad" className="w-full rounded-xl border border-[#c3c5d9] px-3 py-2.5 text-sm" value={sharedForm.cedula} onChange={(event) => setSharedForm((current) => ({ ...current, cedula: event.target.value }))} />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Genero</label>
                          <select className="w-full rounded-xl border border-[#c3c5d9] px-3 py-2.5 text-sm" value={sharedForm.genero} onChange={(event) => setSharedForm((current) => ({ ...current, genero: event.target.value }))}>
                            <option value="">Selecciona</option>
                            <option value="masculino">Masculino</option>
                            <option value="femenino">Femenino</option>
                            <option value="otro">Otro</option>
                            <option value="prefiero_no_decir">Prefiero no decir</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Fecha de nacimiento</label>
                          <input type="date" className="w-full rounded-xl border border-[#c3c5d9] px-3 py-2.5 text-sm" value={sharedForm.fechaNacimiento} onChange={(event) => setSharedForm((current) => ({ ...current, fechaNacimiento: event.target.value }))} />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Ciudad</label>
                          <input type="text" placeholder="Ciudad donde vives" className="w-full rounded-xl border border-[#c3c5d9] px-3 py-2.5 text-sm" value={sharedForm.ciudad} onChange={(event) => setSharedForm((current) => ({ ...current, ciudad: event.target.value }))} />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Pais</label>
                          <input type="text" placeholder="Pais" className="w-full rounded-xl border border-[#c3c5d9] px-3 py-2.5 text-sm" value={sharedForm.pais} onChange={(event) => setSharedForm((current) => ({ ...current, pais: event.target.value }))} />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Foto de perfil</label>
                          <div className="flex items-start gap-4">
                            {sharedForm.fotoPerfilUrl ? (
                              <img src={sharedForm.fotoPerfilUrl} alt="Foto de perfil" className="h-20 w-20 rounded-2xl object-cover" />
                            ) : (
                              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[#dce1ff] text-sm font-bold text-[#003ec7]">
                                Sin foto
                              </div>
                            )}
                            <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-[#c3c5d9] px-4 py-3 text-sm font-semibold text-[#0b1c30] transition-colors hover:bg-[#eff4ff]">
                              {uploadingPhoto ? 'Subiendo...' : sharedForm.fotoPerfilUrl ? 'Cambiar foto' : 'Subir foto'}
                              <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handlePhotoUpload} disabled={uploadingPhoto} />
                            </label>
                          </div>
                          <p className="text-xs text-[#737688]">Formatos permitidos: JPG, PNG o WEBP. Maximo 5 MB.</p>
                        </div>
                        <div className="space-y-1.5 md:col-span-2">
                          <label className="text-xs font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Direccion principal</label>
                          <textarea placeholder="Calle, numero, barrio, referencias" className="min-h-24 w-full rounded-xl border border-[#c3c5d9] px-3 py-2.5 text-sm" value={sharedForm.direccionPrincipal} onChange={(event) => setSharedForm((current) => ({ ...current, direccionPrincipal: event.target.value }))} />
                        </div>
                      </div>
                    </SectionCard>
                  ) : null}

                  {role === 'technician' && activeSection === 'perfil-tecnico' ? (
                    <SectionCard
                      id="perfil-tecnico"
                      eyebrow="Perfil tecnico"
                      title="Configuracion profesional"
                      description="Ajusta la informacion que usan los clientes y la plataforma para asignarte solicitudes."
                      tone="tinted"
                    >
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-1.5 md:col-span-2">
                          <label className="text-xs font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Descripcion profesional</label>
                          <textarea placeholder="Describe tu experiencia, tipos de equipos que atiendes y fortalezas tecnicas" className="min-h-28 w-full rounded-xl border border-[#c3c5d9] bg-white px-3 py-2.5 text-sm" value={technicianForm.descripcion} onChange={(event) => setTechnicianForm((current) => ({ ...current, descripcion: event.target.value }))} />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Años de experiencia</label>
                          <input type="number" min="0" placeholder="Ej: 3" className="w-full rounded-xl border border-[#c3c5d9] bg-white px-3 py-2.5 text-sm" value={technicianForm.aniosExperiencia} onChange={(event) => setTechnicianForm((current) => ({ ...current, aniosExperiencia: event.target.value }))} />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Radio de atencion (km)</label>
                          <input type="number" min="0" step="0.1" placeholder="Ej: 15" className="w-full rounded-xl border border-[#c3c5d9] bg-white px-3 py-2.5 text-sm" value={technicianForm.radioAtencionKm} onChange={(event) => setTechnicianForm((current) => ({ ...current, radioAtencionKm: event.target.value }))} />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Tarifa base</label>
                          <input type="number" min="0" step="0.01" placeholder="Ej: 5.00" className="w-full rounded-xl border border-[#c3c5d9] bg-white px-3 py-2.5 text-sm" value={technicianForm.tarifaBase} onChange={(event) => setTechnicianForm((current) => ({ ...current, tarifaBase: event.target.value }))} />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Tarifa domicilio</label>
                          <input type="number" min="0" step="0.01" placeholder="Ej: 3.50" className="w-full rounded-xl border border-[#c3c5d9] bg-white px-3 py-2.5 text-sm" value={technicianForm.tarifaDomicilio} onChange={(event) => setTechnicianForm((current) => ({ ...current, tarifaDomicilio: event.target.value }))} />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Moneda</label>
                          <input type="text" placeholder="Ej: USD" className="w-full rounded-xl border border-[#c3c5d9] bg-white px-3 py-2.5 text-sm" value={technicianForm.moneda} onChange={(event) => setTechnicianForm((current) => ({ ...current, moneda: event.target.value }))} />
                        </div>
                        <div className="space-y-1.5 md:col-span-2">
                          <label className="text-xs font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Direccion del taller</label>
                          <textarea placeholder="Direccion del local o taller" className="min-h-24 w-full rounded-xl border border-[#c3c5d9] bg-white px-3 py-2.5 text-sm" value={technicianForm.direccionTaller} onChange={(event) => setTechnicianForm((current) => ({ ...current, direccionTaller: event.target.value }))} />
                        </div>
                        <div className="space-y-1.5 md:col-span-2">
                          <label className="text-xs font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Mapa del taller</label>
                          <LocationMapPicker
                            allowUseCurrentLocation
                            defaultToCurrentLocation
                            value={technicianForm.latitudTaller !== '' && technicianForm.longitudTaller !== '' ? {
                              lat: Number(technicianForm.latitudTaller),
                              lng: Number(technicianForm.longitudTaller),
                              address: technicianForm.direccionTaller,
                            } : null}
                            onChange={(location) => setTechnicianForm((current) => ({
                              ...current,
                              direccionTaller: location?.address || '',
                              latitudTaller: location?.lat ?? '',
                              longitudTaller: location?.lng ?? '',
                            }))}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="flex items-center gap-3 rounded-xl border border-[#c3c5d9] bg-white px-4 py-3 text-sm font-medium text-[#0b1c30]">
                            <input type="checkbox" checked={technicianForm.disponible} onChange={(event) => setTechnicianForm((current) => ({ ...current, disponible: event.target.checked }))} />
                            Disponible para recibir servicios
                          </label>
                        </div>
                      </div>
                      <div className="mt-5">
                        <p className="text-sm font-semibold text-[#0b1c30]">Especialidades</p>
                        <p className="mt-1 text-xs text-[#737688]">Selecciona los tipos de equipo que reparas para que las solicitudes lleguen mejor filtradas.</p>
                        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                          {specialties.map((specialty) => (
                            <button
                              key={specialty.id}
                              type="button"
                              onClick={() => toggleSpecialty(specialty.id)}
                              aria-pressed={technicianForm.specialtyIds.includes(normalizeSpecialtyId(specialty.id))}
                              className={`flex items-center gap-3 rounded-xl border bg-white px-4 py-3 text-left text-sm transition-colors ${technicianForm.specialtyIds.includes(normalizeSpecialtyId(specialty.id)) ? 'border-[#003ec7] bg-[#eff4ff] text-[#003ec7]' : 'border-[#c3c5d9] text-[#434656] hover:border-[#003ec7]'}`}
                            >
                              <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full border text-[12px] ${technicianForm.specialtyIds.includes(normalizeSpecialtyId(specialty.id)) ? 'border-[#003ec7] bg-[#003ec7] text-white' : 'border-[#c3c5d9] text-transparent'}`}>
                                ✓
                              </span>
                              <span>{specialty.nombre}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </SectionCard>
                  ) : null}

                  {activeSection === 'datos-personales' || activeSection === 'perfil-tecnico' ? (
                    <div className="flex justify-end">
                      <button type="submit" className="rounded-full bg-[#003ec7] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0052ff] disabled:cursor-not-allowed disabled:opacity-70" disabled={saving}>
                        {saving ? 'Guardando...' : 'Guardar cambios'}
                      </button>
                    </div>
                  ) : null}
                </form>

                {activeSection === 'seguridad' ? (
                  <SectionCard
                    id="seguridad"
                    eyebrow="Seguridad"
                    title="Cambiar contrasena"
                    description="Actualiza tu acceso sin salir de esta pagina."
                  >
                    {passwordError ? <div className="rounded-2xl bg-[#ffdad6] px-4 py-3 text-sm text-[#93000a]">{passwordError}</div> : null}
                    {passwordMessage ? <div className="rounded-2xl bg-[#d7f8ef] px-4 py-3 text-sm text-[#00695c]">{passwordMessage}</div> : null}
                    <form onSubmit={handlePasswordSubmit} className="mt-4 grid gap-4 md:grid-cols-3">
                      <input
                        type="password"
                        placeholder="Contrasena actual"
                        className="w-full rounded-xl border border-[#c3c5d9] px-3 py-2.5 text-sm"
                        value={passwordForm.currentPassword}
                        onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))}
                        required
                      />
                      <input
                        type="password"
                        placeholder="Nueva contrasena"
                        className="w-full rounded-xl border border-[#c3c5d9] px-3 py-2.5 text-sm"
                        value={passwordForm.newPassword}
                        onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))}
                        minLength={6}
                        required
                      />
                      <input
                        type="password"
                        placeholder="Confirmar nueva contrasena"
                        className="w-full rounded-xl border border-[#c3c5d9] px-3 py-2.5 text-sm"
                        value={passwordForm.confirmPassword}
                        onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                        minLength={6}
                        required
                      />
                      <div className="md:col-span-3 flex justify-end">
                        <button
                          type="submit"
                          className="rounded-full border border-[#003ec7] px-6 py-3 text-sm font-semibold text-[#003ec7] transition-colors hover:bg-[#eff4ff] disabled:cursor-not-allowed disabled:opacity-70"
                          disabled={passwordSaving}
                        >
                          {passwordSaving ? 'Actualizando...' : 'Actualizar contrasena'}
                        </button>
                      </div>
                    </form>
                  </SectionCard>
                ) : null}
              </>
            )}
          </div>
      </div>
    </div>
  );
}
