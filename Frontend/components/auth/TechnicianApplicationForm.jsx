'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Button from '../common/Button';
import Input from '../common/Input';
import { register } from '../../services/auth.service';
import { getTechnicianSpecialties } from '../../services/technician.service';
import { getPasswordValidationMessage, normalizePublicAuthMessage } from '../../lib/auth-copy';

const LocationMapPicker = dynamic(() => import('../client/LocationMapPicker'), { ssr: false });

function normalizeSpecialtyId(value) {
  return String(value);
}

function Section({ eyebrow, title, description, children }) {
  return (
    <section className="rounded-[28px] border border-[#d8dbeb] bg-white p-6 md:p-8">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#737688]">{eyebrow}</p>
        <h2 className="mt-2 text-[24px] font-semibold text-[#0b1c30]">{title}</h2>
        {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-[#434656]">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

function PasswordInput({ visible, onToggle, ...props }) {
  return (
    <div className="relative">
      <Input {...props} type={visible ? 'text' : 'password'} className="pr-24" />
      <button
        type="button"
        onClick={onToggle}
        aria-label={visible ? 'Ocultar contrasena' : 'Mostrar contrasena'}
        className="absolute right-3 top-1/2 inline-flex -translate-y-1/2 items-center justify-center rounded-full p-1 text-[#003ec7] transition-colors hover:bg-[#eff4ff] hover:text-[#0052ff]"
      >
        <span className="material-symbols-outlined text-[20px]">{visible ? 'visibility_off' : 'visibility'}</span>
      </button>
    </div>
  );
}

export default function TechnicianApplicationForm() {
  const [form, setForm] = useState({
    rol: 'tecnico',
    nombre: '',
    apellido: '',
    correo: '',
    telefono: '',
    cedula: '',
    ciudad: '',
    pais: '',
    direccionPrincipal: '',
    password: '',
    confirmPassword: '',
    descripcion: '',
    aniosExperiencia: '',
    radioAtencionKm: '',
    tarifaBase: '',
    tarifaDomicilio: '',
    direccionTaller: '',
    latitudTaller: '',
    longitudTaller: '',
    moneda: 'USD',
    specialtyIds: [],
  });
  const [specialties, setSpecialties] = useState([]);
  const [documentFile, setDocumentFile] = useState(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadSpecialties() {
      try {
        const response = await getTechnicianSpecialties();
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.message || 'No se pudieron cargar las especialidades');
        }

        if (!cancelled) {
          setSpecialties(data.specialties || []);
        }
      } catch {
        if (!cancelled) {
          setSpecialties([]);
        }
      }
    }

    loadSpecialties();

    return () => {
      cancelled = true;
    };
  }, []);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function toggleSpecialty(specialtyId) {
    const normalizedId = normalizeSpecialtyId(specialtyId);

    setForm((current) => ({
      ...current,
      specialtyIds: current.specialtyIds.includes(normalizedId)
        ? current.specialtyIds.filter((id) => id !== normalizedId)
        : [...current.specialtyIds, normalizedId],
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!acceptedTerms) {
      setError('Debes aceptar los terminos para continuar');
      return;
    }

    if (form.password.length <= 6) {
      setError('La contrasena debe tener al menos 7 caracteres');
      return;
    }

    const passwordValidationMessage = getPasswordValidationMessage(form.password);
    if (passwordValidationMessage) {
      setError(passwordValidationMessage);
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('La confirmacion de contrasena no coincide');
      return;
    }

    if (!documentFile) {
      setError('Debes adjuntar un documento para la revision del perfil');
      return;
    }

    setError('');
    setSuccessMessage('');
    setIsSubmitting(true);

    try {
      const payload = new FormData();
      payload.set('rol', 'tecnico');
      payload.set('nombre', form.nombre);
      payload.set('apellido', form.apellido);
      payload.set('correo', form.correo);
      payload.set('password', form.password);
      payload.set('confirmPassword', form.confirmPassword);
      payload.set('documento', documentFile);

      if (form.telefono) payload.set('telefono', form.telefono);
      if (form.cedula) payload.set('cedula', form.cedula);
      if (form.ciudad) payload.set('ciudad', form.ciudad);
      if (form.pais) payload.set('pais', form.pais);
      if (form.direccionPrincipal) payload.set('direccionPrincipal', form.direccionPrincipal);
      if (form.descripcion) payload.set('descripcion', form.descripcion);
      if (form.aniosExperiencia !== '') payload.set('aniosExperiencia', String(Number(form.aniosExperiencia)));
      if (form.radioAtencionKm !== '') payload.set('radioAtencionKm', String(Number(form.radioAtencionKm)));
      if (form.tarifaBase !== '') payload.set('tarifaBase', String(Number(form.tarifaBase)));
      if (form.tarifaDomicilio !== '') payload.set('tarifaDomicilio', String(Number(form.tarifaDomicilio)));
      if (form.direccionTaller) payload.set('direccionTaller', form.direccionTaller);
      if (form.latitudTaller !== '') payload.set('latitudTaller', String(Number(form.latitudTaller)));
      if (form.longitudTaller !== '') payload.set('longitudTaller', String(Number(form.longitudTaller)));
      if (form.moneda) payload.set('moneda', form.moneda);
      payload.set('specialtyIds', JSON.stringify(form.specialtyIds));

      const response = await register(payload);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || 'No se pudo enviar la postulacion');
      }

      setSuccessMessage(normalizePublicAuthMessage(data.message || 'Solicitud enviada. Cuando tu cuenta este habilitada podras ingresar.'));
      setForm((current) => ({
        ...current,
        password: '',
        confirmPassword: '',
        specialtyIds: [],
      }));
      setDocumentFile(null);
    } catch (submitError) {
      setError(normalizePublicAuthMessage(submitError.message || 'No se pudo enviar la postulacion'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[28px] bg-[#eff4ff] px-6 py-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#737688]">Portal profesional</p>
          <h1 className="mt-2 text-[30px] font-bold text-[#0b1c30] md:text-[38px]">Solicitud de registro tecnico</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#434656]">Completa tu postulacion por secciones. Revisaremos tu perfil, experiencia y configuracion profesional antes de habilitar el acceso.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/login" className="inline-flex rounded-full border border-[#c3c5d9] px-4 py-2.5 text-sm font-semibold text-[#0b1c30] transition-colors hover:bg-white">
            Ya tengo cuenta
          </Link>
          <Link href="/" className="inline-flex rounded-full border border-[#c3c5d9] px-4 py-2.5 text-sm font-semibold text-[#0b1c30] transition-colors hover:bg-white">
            Volver al inicio
          </Link>
        </div>
      </div>

      {successMessage ? <p className="rounded-2xl bg-[#d7f8ef] px-4 py-3 text-sm text-[#00695c]">{successMessage}</p> : null}
      {error ? <p className="rounded-2xl bg-[#ffdad6] px-4 py-3 text-sm text-[#ba1a1a]">{error}</p> : null}

      <Section eyebrow="01" title="Identidad" description="Datos personales y de contacto para identificarte dentro del proceso de aprobacion.">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-[14px] font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Nombres</label>
            <Input placeholder="Juan" value={form.nombre} onChange={(event) => updateField('nombre', event.target.value)} required />
          </div>
          <div className="space-y-2">
            <label className="text-[14px] font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Apellidos</label>
            <Input placeholder="Perez" value={form.apellido} onChange={(event) => updateField('apellido', event.target.value)} required />
          </div>
          <div className="space-y-2">
            <label className="text-[14px] font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Correo electronico</label>
            <Input type="email" placeholder="correo@ejemplo.com" value={form.correo} onChange={(event) => updateField('correo', event.target.value)} required />
          </div>
          <div className="space-y-2">
            <label className="text-[14px] font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Telefono</label>
            <Input type="tel" placeholder="+54 9 11 0000 0000" value={form.telefono} onChange={(event) => updateField('telefono', event.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-[14px] font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Cedula</label>
            <Input placeholder="Documento de identidad" value={form.cedula} onChange={(event) => updateField('cedula', event.target.value)} />
          </div>
          <div className="space-y-2 rounded-2xl border border-[#d8dbeb] bg-[#eff4ff] p-4 md:col-span-2">
            <div className="mb-3">
              <p className="text-[14px] font-semibold uppercase tracking-[0.05em] text-[#003ec7]">Seguridad de acceso</p>
              <p className="mt-1 text-sm text-[#434656]">La contrasena debe tener mas de 6 caracteres y debes confirmarla antes de enviar la postulacion.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-[14px] font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Contrasena</label>
                <PasswordInput visible={showPassword} onToggle={() => setShowPassword((current) => !current)} placeholder="Crea una contrasena segura" value={form.password} onChange={(event) => updateField('password', event.target.value)} minLength={7} required />
               </div>
               <div className="space-y-2">
                 <label className="text-[14px] font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Confirmar contrasena</label>
               <PasswordInput visible={showConfirmPassword} onToggle={() => setShowConfirmPassword((current) => !current)} placeholder="Repite tu contrasena" value={form.confirmPassword} onChange={(event) => updateField('confirmPassword', event.target.value)} minLength={7} required />
               </div>
             </div>
            <p className="mt-3 text-xs text-[#737688]">Usa al menos 7 caracteres, una letra y un numero.</p>
          </div>
        </div>
      </Section>

      <Section eyebrow="02" title="Cobertura" description="Ubicacion base y alcance geografico estimado para tus atenciones.">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-[14px] font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Ciudad</label>
            <Input placeholder="Ciudad" value={form.ciudad} onChange={(event) => updateField('ciudad', event.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-[14px] font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Pais</label>
            <Input placeholder="Pais" value={form.pais} onChange={(event) => updateField('pais', event.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-[14px] font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Direccion principal</label>
            <Input placeholder="Direccion" value={form.direccionPrincipal} onChange={(event) => updateField('direccionPrincipal', event.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-[14px] font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Radio de atencion (km)</label>
            <Input type="number" min="0" step="0.1" placeholder="10" value={form.radioAtencionKm} onChange={(event) => updateField('radioAtencionKm', event.target.value)} />
          </div>
        </div>
      </Section>

      <Section eyebrow="03" title="Perfil profesional" description="Explica tu experiencia, selecciona especialidades y define tu estructura inicial de tarifas.">
        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-[14px] font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Descripcion profesional</label>
            <textarea className="min-h-28 w-full rounded-2xl border border-[#c3c5d9] px-4 py-3 text-[16px] text-[#0b1c30]" placeholder="Describe tu experiencia, tipos de equipos que atiendes y fortalezas tecnicas" value={form.descripcion} onChange={(event) => updateField('descripcion', event.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-[14px] font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Documento para aprobacion</label>
            <input
              type="file"
              accept=".pdf,image/png,image/jpeg,image/webp"
              onChange={(event) => setDocumentFile(event.target.files?.[0] || null)}
              className="w-full rounded-2xl border border-[#c3c5d9] bg-white px-4 py-3 text-[16px] text-[#0b1c30]"
              required
            />
            <p className="text-xs text-[#737688]">Adjunta un PDF o imagen legible de tu documento o certificado para revisar tu perfil.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-2">
              <label className="text-[14px] font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Años de experiencia</label>
              <Input type="number" min="0" placeholder="0" value={form.aniosExperiencia} onChange={(event) => updateField('aniosExperiencia', event.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-[14px] font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Tarifa base</label>
              <Input type="number" min="0" step="0.01" placeholder="0.00" value={form.tarifaBase} onChange={(event) => updateField('tarifaBase', event.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-[14px] font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Tarifa domicilio</label>
              <Input type="number" min="0" step="0.01" placeholder="0.00" value={form.tarifaDomicilio} onChange={(event) => updateField('tarifaDomicilio', event.target.value)} />
            </div>
            <div className="space-y-2 xl:col-span-2">
              <label className="text-[14px] font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Direccion del taller</label>
              <Input placeholder="Direccion del local o taller" value={form.direccionTaller} onChange={(event) => updateField('direccionTaller', event.target.value)} />
            </div>
            <div className="space-y-2 xl:col-span-4">
              <label className="text-[14px] font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Ubicacion del taller en el mapa</label>
              <LocationMapPicker
                allowUseCurrentLocation
                defaultToCurrentLocation
                value={form.latitudTaller !== '' && form.longitudTaller !== '' ? {
                  lat: Number(form.latitudTaller),
                  lng: Number(form.longitudTaller),
                  address: form.direccionTaller,
                } : null}
                onChange={(location) => {
                  updateField('direccionTaller', location?.address || '');
                  updateField('latitudTaller', location?.lat ?? '');
                  updateField('longitudTaller', location?.lng ?? '');
                }}
              />
              <p className="text-xs text-[#737688]">Selecciona la direccion exacta del taller para guardar tambien latitud y longitud.</p>
            </div>
            <div className="space-y-2">
              <label className="text-[14px] font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Moneda</label>
              <Input placeholder="USD" value={form.moneda} onChange={(event) => updateField('moneda', event.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[14px] font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Especialidades</label>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {specialties.map((specialty) => (
                <button
                  key={specialty.id}
                  type="button"
                  onClick={() => toggleSpecialty(specialty.id)}
                  aria-pressed={form.specialtyIds.includes(normalizeSpecialtyId(specialty.id))}
                  className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition-colors ${form.specialtyIds.includes(normalizeSpecialtyId(specialty.id)) ? 'border-[#003ec7] bg-[#eff4ff] text-[#003ec7]' : 'border-[#c3c5d9] text-[#0b1c30] hover:border-[#003ec7]'}`}
                >
                  <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full border text-[12px] ${form.specialtyIds.includes(normalizeSpecialtyId(specialty.id)) ? 'border-[#003ec7] bg-[#003ec7] text-white' : 'border-[#c3c5d9] text-transparent'}`}>
                    ✓
                  </span>
                  <span>{specialty.nombre}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-[#737688]">Selecciona una o varias especialidades tecnicas para asociar tu perfil.</p>
          </div>
        </div>
      </Section>

      <section className="rounded-[28px] border border-[#d8dbeb] bg-white p-6 md:p-8">
        <label className="flex items-start gap-3 text-sm leading-6 text-[#434656]">
          <input type="checkbox" checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} className="mt-1 h-4 w-4 rounded border-[#c3c5d9] text-[#003ec7]" />
          Confirmo que la informacion enviada es veridica y acepto que mi cuenta tecnica debera ser validada antes de poder ingresar al sistema.
        </label>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs uppercase tracking-[0.08em] text-[#737688]">Revision del perfil requerida</p>
          <Button type="submit" className="rounded-full px-6 py-3.5 disabled:cursor-not-allowed disabled:opacity-70" disabled={isSubmitting}>
            {isSubmitting ? 'Enviando postulacion...' : 'Enviar solicitud tecnica'}
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </Button>
        </div>
      </section>
    </form>
  );
}
