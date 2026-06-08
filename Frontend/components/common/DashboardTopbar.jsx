'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef, useState } from 'react';
import Modal from './Modal';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';
import { useSidebar } from '../../context/SidebarContext';
import { clearAuthSession, persistAuthSession, getStoredToken } from '../../utils/auth';
import { getNotificationsWithFilters, getUnreadNotificationCount, markAllNotificationsAsRead } from '../../services/notification.service';
import { getServiceMessages, getUnreadMessageCount } from '../../services/chat.service';
import { getMyServices, getAssignedServiceRequests, getServiceHistory } from '../../services/service.service';
import { getCurrentUser, updateCurrentUser, uploadProfilePhoto } from '../../services/user.service';
import { getMyClientProfile } from '../../services/client.service';
import { getTechnicianProfile, getTechnicianSpecialties, updateTechnicianProfile, updateTechnicianSpecialties } from '../../services/technician.service';

const TECHNICIAN_ACTIVE_STATES = new Set(['solicitado', 'cotizacion_inicial_enviada', 'aceptado', 'en_camino', 'en_reparacion', 'pendiente_pago', 'pago_enviado']);
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

function getInitials(fullName) {
  return fullName
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function getRoleLabel(role) {
  if (role === 'admin') {
    return 'Administrador';
  }

  if (role === 'technician') {
    return 'Tecnico';
  }

  if (role === 'client') {
    return 'Cliente';
  }

  return 'Usuario';
}

function getAllMessagesHref(role) {
  if (role === 'admin') {
    return '/admin/dashboard';
  }

  return role === 'technician' ? '/technician/active-services' : '/client/services';
}

function getNotificationsHref(role) {
  if (role === 'admin') {
    return '/admin/notifications';
  }

  return `/${role}/notifications`;
}

function getProfileHref(role) {
  return `/${role}/profile`;
}

function formatRelativeDate(dateValue) {
  if (!dateValue) {
    return 'Sin fecha';
  }

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) {
    return 'Sin fecha';
  }

  return date.toLocaleString();
}

function getMessagePreview(message) {
  const content = String(message?.contenido || message?.content || '').trim();

  if (content) {
    return content;
  }

  if (message?.tipoMensaje && message.tipoMensaje !== 'texto') {
    return `Mensaje de tipo ${message.tipoMensaje}`;
  }

  return 'Mensaje reciente';
}

function normalizeNotification(notification) {
  if (!notification) {
    return null;
  }

  return {
    id: notification.id,
    serviceId: notification.serviceId ?? notification.servicio_id ?? notification.servicioId ?? null,
    type: notification.type ?? notification.tipo ?? 'info',
    channel: notification.channel ?? notification.canal ?? 'interna',
    title: notification.title ?? notification.titulo ?? 'Nueva notificacion',
    message: notification.message ?? notification.mensaje ?? '',
    actionUrl: notification.actionUrl ?? notification.url_accion ?? null,
    read: notification.read ?? notification.leida ?? false,
    date: notification.date ?? notification.fecha ?? new Date().toISOString(),
  };
}

function buildFloatingMessageAlert({ payload, role }) {
  if (!payload?.message) {
    return null;
  }

  const senderName = payload.message.remitente?.nombre
    ? `${payload.message.remitente.nombre} ${payload.message.remitente.apellido || ''}`.trim()
    : 'Nuevo mensaje';

  return {
    id: `message-${payload.serviceId}-${payload.message.id}`,
    href: `/${role}/chat/${payload.serviceId}`,
    icon: 'mail',
    badgeClassName: 'bg-[#eff4ff] text-[#003ec7]',
    title: senderName,
    subtitle: `Chat del servicio #${payload.serviceId}`,
    content: getMessagePreview(payload.message),
  };
}

function FloatingAlerts({ items, onDismiss }) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed right-4 top-20 z-[90] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-3">
      {items.map((item) => (
        <div key={item.id} className="pointer-events-auto overflow-hidden rounded-[24px] border border-[#d8dbeb] bg-white shadow-[0_20px_70px_rgba(11,28,48,0.18)]">
          <div className="flex items-start gap-3 p-4">
            <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${item.badgeClassName}`}>
              <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
            </div>
            <Link href={item.href} className="min-w-0 flex-1" onClick={() => onDismiss(item.id)}>
              <p className="truncate text-sm font-semibold text-[#0b1c30]">{item.title}</p>
              {item.subtitle ? <p className="mt-0.5 text-xs text-[#737688]">{item.subtitle}</p> : null}
              <p className="mt-2 line-clamp-3 text-sm text-[#434656]">{item.content}</p>
            </Link>
            <button
              type="button"
              onClick={() => onDismiss(item.id)}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#737688] transition-colors hover:bg-[#eff4ff] hover:text-[#0b1c30]"
              aria-label="Cerrar alerta"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function DropdownPanel({ title, actionHref, actionLabel, emptyText, items, renderItem }) {
  return (
    <div className="absolute right-0 top-[calc(100%+12px)] z-[70] w-[340px] overflow-hidden rounded-[24px] border border-[#d8dbeb] bg-white shadow-[0_20px_70px_rgba(11,28,48,0.16)]">
      <div className="flex items-center justify-between border-b border-[#d8dbeb] px-5 py-4">
        <h3 className="text-sm font-semibold text-[#0b1c30]">{title}</h3>
        <Link href={actionHref} className="text-xs font-semibold text-[#003ec7] hover:underline">
          {actionLabel}
        </Link>
      </div>
      <div className="max-h-[360px] overflow-y-auto p-3">
        {items.length === 0 ? (
          <p className="rounded-2xl px-3 py-4 text-sm text-[#737688]">{emptyText}</p>
        ) : (
          <div className="space-y-2">{items.map(renderItem)}</div>
        )}
      </div>
    </div>
  );
}

function ProfileModal({ open, onClose, role, user, setUser }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [sharedForm, setSharedForm] = useState(buildSharedForm(null));
  const [technicianForm, setTechnicianForm] = useState(buildTechnicianForm(null, []));
  const [specialties, setSpecialties] = useState([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

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
  }, [open, role]);

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
    <Modal open={open} onClose={onClose} title="Editar perfil" widthClassName="max-w-4xl">
      {loading ? <div className="py-10 text-center text-sm text-[#737688]">Cargando perfil...</div> : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {error ? <div className="rounded-2xl bg-[#ffdad6] px-4 py-3 text-sm text-[#93000a]">{error}</div> : null}
          {message ? <div className="rounded-2xl bg-[#d7f8ef] px-4 py-3 text-sm text-[#00695c]">{message}</div> : null}

          <section>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm uppercase tracking-[0.05em] text-[#737688]">Datos personales</p>
                <h3 className="text-[20px] font-semibold text-[#0b1c30]">Informacion basica</h3>
              </div>
              <div className="rounded-full bg-[#eff4ff] px-4 py-2 text-sm font-semibold text-[#003ec7]">{getRoleLabel(role)}</div>
            </div>
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
          </section>

          {role === 'technician' ? (
            <section className="rounded-[24px] bg-[#eff4ff] p-5">
              <p className="text-sm uppercase tracking-[0.05em] text-[#737688]">Perfil tecnico</p>
              <h3 className="mt-1 text-[20px] font-semibold text-[#0b1c30]">Configuracion profesional</h3>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Descripcion profesional</label>
                  <textarea placeholder="Describe tu experiencia, tipos de equipos que atiendes y fortalezas tecnicas" className="min-h-28 w-full rounded-xl border border-[#c3c5d9] px-3 py-2.5 text-sm" value={technicianForm.descripcion} onChange={(event) => setTechnicianForm((current) => ({ ...current, descripcion: event.target.value }))} />
                  <p className="text-xs text-[#737688]">Ej: Tecnico en laptops con 5 años de experiencia, especializado en cambio de pantallas y mantenimiento.</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Años de experiencia</label>
                  <input type="number" min="0" placeholder="Ej: 3" className="w-full rounded-xl border border-[#c3c5d9] px-3 py-2.5 text-sm" value={technicianForm.aniosExperiencia} onChange={(event) => setTechnicianForm((current) => ({ ...current, aniosExperiencia: event.target.value }))} />
                  <p className="text-xs text-[#737688]">Cantidad de años trabajando en reparacion tecnica.</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Radio de atencion (km)</label>
                  <input type="number" min="0" step="0.1" placeholder="Ej: 15" className="w-full rounded-xl border border-[#c3c5d9] px-3 py-2.5 text-sm" value={technicianForm.radioAtencionKm} onChange={(event) => setTechnicianForm((current) => ({ ...current, radioAtencionKm: event.target.value }))} />
                  <p className="text-xs text-[#737688]">Distancia maxima en km que estas dispuesto a desplazarte.</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Tarifa base (diagnostico)</label>
                  <input type="number" min="0" step="0.01" placeholder="Ej: 5.00" className="w-full rounded-xl border border-[#c3c5d9] px-3 py-2.5 text-sm" value={technicianForm.tarifaBase} onChange={(event) => setTechnicianForm((current) => ({ ...current, tarifaBase: event.target.value }))} />
                  <p className="text-xs text-[#737688]">Costo minimo por diagnostico o visita. En la moneda indicada.</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Tarifa domicilio</label>
                  <input type="number" min="0" step="0.01" placeholder="Ej: 3.50" className="w-full rounded-xl border border-[#c3c5d9] px-3 py-2.5 text-sm" value={technicianForm.tarifaDomicilio} onChange={(event) => setTechnicianForm((current) => ({ ...current, tarifaDomicilio: event.target.value }))} />
                  <p className="text-xs text-[#737688]">Costo adicional por ir al domicilio del cliente.</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Moneda</label>
                  <input type="text" placeholder="Ej: USD" className="w-full rounded-xl border border-[#c3c5d9] px-3 py-2.5 text-sm" value={technicianForm.moneda} onChange={(event) => setTechnicianForm((current) => ({ ...current, moneda: event.target.value }))} />
                  <p className="text-xs text-[#737688]">Codigo de moneda para tus tarifas. Ej: USD, COP, EUR.</p>
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Direccion del taller</label>
                  <textarea placeholder="Direccion del local o taller" className="min-h-24 w-full rounded-xl border border-[#c3c5d9] px-3 py-2.5 text-sm" value={technicianForm.direccionTaller} onChange={(event) => setTechnicianForm((current) => ({ ...current, direccionTaller: event.target.value }))} />
                  <p className="text-xs text-[#737688]">Ubicacion donde atiendes en modalidad taller.</p>
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
                  <p className="text-xs text-[#737688]">Selecciona la ubicación exacta del taller para guardar coordenadas.</p>
                </div>
                <div className="md:col-span-2">
                  <label className="flex items-center gap-3 rounded-xl border border-[#c3c5d9] bg-white px-4 py-3 text-sm font-medium text-[#0b1c30]">
                    <input type="checkbox" checked={technicianForm.disponible} onChange={(event) => setTechnicianForm((current) => ({ ...current, disponible: event.target.checked }))} />
                    Disponible para recibir servicios
                  </label>
                  <p className="mt-1.5 text-xs text-[#737688]">Activalo solo cuando puedas atender solicitudes. Si esta desactivado no apareceras en las busquedas.</p>
                </div>
              </div>
              <div className="mt-5">
                <p className="text-sm font-semibold text-[#0b1c30]">Especialidades</p>
                <p className="mt-1 text-xs text-[#737688]">Selecciona los tipos de equipo que reparas. Esto ayuda a que te lleguen las solicitudes correctas.</p>
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
            </section>
          ) : null}

          <div className="flex flex-col-reverse gap-3 border-t border-[#d8dbeb] pt-5 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="rounded-full border border-[#c3c5d9] px-5 py-2.5 text-sm font-semibold text-[#0b1c30] transition-colors hover:bg-[#eff4ff]">
              Cerrar
            </button>
            <button type="submit" className="rounded-full bg-[#003ec7] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0052ff] disabled:cursor-not-allowed disabled:opacity-70" disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}

export default function DashboardTopbar({ role }) {
  const { user, setUser } = useAuth();
  const router = useRouter();
  const { socket } = useSocket();
  const { openMobile, toggleCollapsed } = useSidebar();
  const isAdmin = role === 'admin';
  const [profileOpen, setProfileOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const [messageCount, setMessageCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [recentMessages, setRecentMessages] = useState([]);
  const [messageHref, setMessageHref] = useState(getAllMessagesHref(role));
  const [floatingAlerts, setFloatingAlerts] = useState([]);
  const wrapperRef = useRef(null);
  const [refreshTick, setRefreshTick] = useState(0);

  function dismissFloatingAlert(alertId) {
    setFloatingAlerts((current) => current.filter((alert) => alert.id !== alertId));
  }

  function enqueueFloatingAlert(alert) {
    if (!alert) {
      return;
    }

    setFloatingAlerts((current) => {
      const next = [alert, ...current.filter((item) => item.id !== alert.id)];
      return next.slice(0, 4);
    });

    window.setTimeout(() => {
      dismissFloatingAlert(alert.id);
    }, 6000);
  }

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpenMenu(null);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadTopbarData() {
      try {
        if (isAdmin) {
          const [notificationCountRes, notificationsRes] = await Promise.all([
            getUnreadNotificationCount(),
            getNotificationsWithFilters({ limit: 5 }),
          ]);

          const notificationCountData = await notificationCountRes.json().catch(() => ({}));
          const notificationsData = await notificationsRes.json().catch(() => ({}));

          if (!cancelled) {
            if (notificationCountRes.ok) {
              setNotificationCount(notificationCountData.unreadCount || 0);
            }

            if (notificationsRes.ok) {
              setNotifications((notificationsData.notifications || []).map(normalizeNotification).filter(Boolean));
            }

            setMessageCount(0);
            setRecentMessages([]);
            setMessageHref(getAllMessagesHref(role));
          }

          return;
        }

        const requestListPromise = role === 'technician'
          ? getAssignedServiceRequests({ limit: 10 })
          : getMyServices({ limit: 10 });
        const historyPromise = getServiceHistory({ limit: 10 });

        const [notificationCountRes, notificationsRes, messagesRes, servicesRes, historyRes] = await Promise.all([
          getUnreadNotificationCount(),
          getNotificationsWithFilters({ limit: 5 }),
          getUnreadMessageCount(),
          requestListPromise,
          historyPromise,
        ]);

        const notificationCountData = await notificationCountRes.json().catch(() => ({}));
        const notificationsData = await notificationsRes.json().catch(() => ({}));
        const messagesData = await messagesRes.json().catch(() => ({}));
        const servicesData = await servicesRes.json().catch(() => ({}));
        const historyData = await historyRes.json().catch(() => ({}));

        const activeServices = servicesData.serviceRequests || [];
        const historyServices = historyData.serviceHistory || [];
        const uniqueServices = new Map();

        [...activeServices, ...historyServices].forEach((service) => {
          if (service?.id && !uniqueServices.has(service.id)) {
            uniqueServices.set(service.id, service);
          }
        });

        const services = [...uniqueServices.values()];

        const activeChatService = role === 'technician'
          ? activeServices.find((service) => TECHNICIAN_ACTIVE_STATES.has(service.estado))
          : activeServices.find((service) => service.tecnico_id && service.estado !== 'cancelado' && service.estado !== 'finalizado');

        const messageResponses = await Promise.all(
          services.slice(0, 8).map(async (service) => {
            const response = await getServiceMessages(service.id);
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
              return null;
            }

            const messages = data.messages || [];
            const latestMessage = messages[messages.length - 1];
            if (!latestMessage) {
              return null;
            }

            return {
              id: `${service.id}-${latestMessage.id}`,
              href: `/${role}/chat/${service.id}`,
              title: role === 'technician'
                ? `${service.cliente_nombre || 'Cliente'} ${service.cliente_apellido || ''}`.trim()
                : service.codigo_servicio || service.tipo_equipo || `Servicio #${service.id}`,
              serviceLabel: service.codigo_servicio || service.tipo_equipo || `Servicio #${service.id}`,
              content: getMessagePreview(latestMessage),
              date: latestMessage.fechaEnvio,
              unread: latestMessage.remitenteId !== user?.id && !latestMessage.leido,
            };
          }),
        );

        const normalizedMessages = messageResponses
          .filter(Boolean)
          .sort((left, right) => new Date(right.date || 0).getTime() - new Date(left.date || 0).getTime());

        if (!cancelled) {
          if (notificationCountRes.ok) {
            setNotificationCount(notificationCountData.unreadCount || 0);
          }

          if (notificationsRes.ok) {
            setNotifications((notificationsData.notifications || []).map(normalizeNotification).filter(Boolean));
          }

          if (messagesRes.ok) {
            setMessageCount(messagesData.unreadCount || 0);
          }

          setRecentMessages(normalizedMessages);

          if (activeChatService?.id) {
            setMessageHref(`/${role}/chat/${activeChatService.id}`);
          } else {
            setMessageHref(getAllMessagesHref(role));
          }
        }
      } catch {
        if (!cancelled) {
          setMessageHref(getAllMessagesHref(role));
        }
      }
    }

    loadTopbarData();

    return () => {
      cancelled = true;
    };
  }, [isAdmin, refreshTick, role, user?.id]);

  useEffect(() => {
    if (!socket) {
      return undefined;
    }

    const handleRealtimeRefresh = () => {
      setRefreshTick((current) => current + 1);
    };

    const handleNotification = (payload) => {
      handleRealtimeRefresh();

      const normalizedNotification = normalizeNotification(payload);
      if (!normalizedNotification) {
        return;
      }

      enqueueFloatingAlert({
        id: `notification-${normalizedNotification.id}`,
        href: normalizedNotification.actionUrl || getNotificationsHref(role),
        icon: 'notifications',
        badgeClassName: 'bg-[#fff4d9] text-[#9a6700]',
        title: normalizedNotification.title,
        subtitle: 'Nueva notificacion',
        content: normalizedNotification.message,
      });
    };

    const handleNewMessage = (payload) => {
      handleRealtimeRefresh();

      if (!payload?.message || payload.message.remitenteId === user?.id || isAdmin) {
        return;
      }

      enqueueFloatingAlert(buildFloatingMessageAlert({ payload, role }));
    };

    const handleMessagesRead = () => {
      handleRealtimeRefresh();
    };

    socket.on('notification:new', handleNotification);
    socket.on('chat:new_message', handleNewMessage);
    socket.on('chat:messages_read', handleMessagesRead);
    socket.on('service:updated', handleRealtimeRefresh);

    return () => {
      socket.off('notification:new', handleNotification);
      socket.off('chat:new_message', handleNewMessage);
      socket.off('chat:messages_read', handleMessagesRead);
      socket.off('service:updated', handleRealtimeRefresh);
    };
  }, [isAdmin, role, socket, user?.id]);

  const displayName = useMemo(() => {
    const fullName = `${user?.nombre || ''} ${user?.apellido || ''}`.trim();
    return fullName || 'Usuario';
  }, [user]);

  async function markNotificationsAsViewed() {
    try {
      const response = await markAllNotificationsAsRead();
      if (!response.ok) {
        return;
      }

      setNotificationCount(0);
      setNotifications((current) => current.map((notification) => ({ ...notification, read: true })));
    } catch {
      // silencioso
    }
  }

  function toggleMenu(menuName) {
    setOpenMenu((current) => {
      const nextMenu = current === menuName ? null : menuName;

      if (menuName === 'notifications' && nextMenu === 'notifications' && notificationCount > 0) {
        markNotificationsAsViewed();
      }

      return nextMenu;
    });
  }

  function handleLogout() {
    clearAuthSession();
    setUser(null);
    setOpenMenu(null);
    setProfileOpen(false);
    router.push('/login');
    router.refresh();
  }

  return (
    <>
      <FloatingAlerts items={floatingAlerts} onDismiss={dismissFloatingAlert} />
      <header className="sticky top-0 z-50 border-b border-[#d8dbeb] bg-white/92 backdrop-blur">
        <div ref={wrapperRef} className="mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-5 py-4 md:px-10">
          <div className="min-w-0 flex items-center gap-3">
            <button
              type="button"
              onClick={openMobile}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#c3c5d9] bg-white text-[#0b1c30] transition-colors hover:bg-[#eff4ff] lg:hidden"
              aria-label="Abrir menu"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            <button
              type="button"
              onClick={toggleCollapsed}
              className="hidden h-10 w-10 items-center justify-center rounded-full border border-[#c3c5d9] bg-white text-[#0b1c30] transition-colors hover:bg-[#eff4ff] lg:inline-flex"
              aria-label="Colapsar menu"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <div className="relative">
              <button type="button" onClick={() => toggleMenu('notifications')} className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#c3c5d9] bg-white text-[#0b1c30] transition-colors hover:bg-[#eff4ff] hover:text-[#003ec7]" aria-label="Notificaciones">
                <span className="material-symbols-outlined">notifications</span>
                {notificationCount > 0 ? <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-[#003ec7] px-1.5 py-0.5 text-center text-[11px] font-bold text-white">{notificationCount}</span> : null}
              </button>
              {openMenu === 'notifications' ? (
                <DropdownPanel
                  title="Notificaciones recientes"
                  actionHref={getNotificationsHref(role)}
                  actionLabel="Ver todas"
                  emptyText="No tienes notificaciones recientes."
                  items={notifications}
                  renderItem={(notification) => (
                    <Link
                      key={notification.id}
                      href={getNotificationsHref(role)}
                      className={`block rounded-2xl px-3 py-3 text-sm transition-colors ${notification.read ? 'bg-white text-[#434656] hover:bg-[#f8f9ff]' : 'bg-[#eff4ff] text-[#0b1c30] hover:bg-[#dfe9ff]'}`}
                      onClick={() => setOpenMenu(null)}
                    >
                      <p className="font-semibold">{notification.title}</p>
                      <p className="mt-1 line-clamp-2">{notification.message}</p>
                      <p className="mt-2 text-xs text-[#737688]">{formatRelativeDate(notification.date)}</p>
                    </Link>
                  )}
                />
              ) : null}
            </div>

            {!isAdmin ? (
            <div className="relative">
              <button type="button" onClick={() => toggleMenu('messages')} className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#c3c5d9] bg-white text-[#0b1c30] transition-colors hover:bg-[#eff4ff] hover:text-[#003ec7]" aria-label="Mensajes">
                <span className="material-symbols-outlined">mail</span>
                {messageCount > 0 ? <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-[#003ec7] px-1.5 py-0.5 text-center text-[11px] font-bold text-white">{messageCount}</span> : null}
              </button>
              {openMenu === 'messages' ? (
                <DropdownPanel
                  title="Mensajes recientes"
                  actionHref={messageHref}
                  actionLabel="Ver todos"
                  emptyText="No tienes mensajes recientes."
                  items={recentMessages}
                  renderItem={(message) => (
                    <Link
                      key={message.id}
                      href={message.href}
                      className={`block rounded-2xl px-3 py-3 text-sm transition-colors ${message.unread ? 'bg-[#eff4ff] text-[#0b1c30] hover:bg-[#dfe9ff]' : 'bg-white text-[#434656] hover:bg-[#f8f9ff]'}`}
                      onClick={() => setOpenMenu(null)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{message.title}</p>
                          <p className="mt-0.5 truncate text-xs text-[#737688]">{message.serviceLabel}</p>
                        </div>
                        {message.unread ? <span className="mt-1 h-2.5 w-2.5 rounded-full bg-[#003ec7]" /> : null}
                      </div>
                      <p className="mt-2 line-clamp-2">{message.content}</p>
                      <p className="mt-2 text-xs text-[#737688]">{formatRelativeDate(message.date)}</p>
                    </Link>
                  )}
                />
              ) : null}
            </div>
            ) : null}

            <div className="relative">
              <button type="button" onClick={() => toggleMenu('profile')} className="inline-flex items-center gap-3 rounded-full border border-[#c3c5d9] bg-white px-3 py-2 text-left transition-colors hover:bg-[#eff4ff]">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#dce1ff] text-sm font-bold text-[#003ec7]">
                  {getInitials(displayName)}
                </span>
                <span className="hidden sm:block">
                  <span className="block max-w-[180px] truncate text-sm font-semibold text-[#0b1c30]">{displayName}</span>
                  <span className="block text-xs text-[#737688]">{getRoleLabel(role)}</span>
                </span>
                <span className="material-symbols-outlined hidden text-[18px] text-[#737688] sm:block">expand_more</span>
              </button>
              {openMenu === 'profile' ? (
                <div className="absolute right-0 top-[calc(100%+12px)] z-[70] w-[260px] overflow-hidden rounded-[24px] border border-[#d8dbeb] bg-white p-2 shadow-[0_20px_70px_rgba(11,28,48,0.16)]">
                  <Link
                    href={getProfileHref(role)}
                    onClick={() => setOpenMenu(null)}
                    className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold text-[#0b1c30] transition-colors hover:bg-[#eff4ff]"
                  >
                    <span className="material-symbols-outlined text-[20px]">manage_accounts</span>
                    Editar perfil
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold text-[#ba1a1a] transition-colors hover:bg-[#ffdad6]"
                  >
                    <span className="material-symbols-outlined text-[20px]">logout</span>
                    Cerrar sesión
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} role={role} user={user} setUser={setUser} />
    </>
  );
}
