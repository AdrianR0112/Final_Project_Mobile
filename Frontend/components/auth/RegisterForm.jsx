'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Button from '../common/Button';
import Input from '../common/Input';
import { useAuth } from '../../hooks/useAuth';
import { register } from '../../services/auth.service';
import { getTechnicianSpecialties } from '../../services/technician.service';
import { persistAuthSession, getUserRole } from '../../utils/auth';
import { getDashboardPathByRole } from '../../utils/roles';
import { getPasswordValidationMessage, normalizePublicAuthMessage } from '../../lib/auth-copy';

function normalizeSpecialtyId(value) {
  return String(value);
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

export default function RegisterForm({
  fixedRole = 'cliente',
  loginHref = '/login',
  registerHref = '/register',
  title = 'Crear una cuenta',
  description = 'Registrate para solicitar asistencia tecnica especializada.',
  submitLabel = 'Crear cuenta',
}) {
  const router = useRouter();
  const { setUser } = useAuth();
  const [form, setForm] = useState({
    rol: fixedRole,
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
    moneda: 'USD',
    specialtyIds: [],
  });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [specialties, setSpecialties] = useState([]);
  const isTechnician = fixedRole === 'tecnico';
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (!isTechnician) {
      return;
    }

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
  }, [isTechnician]);

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

    const passwordValidationMessage = getPasswordValidationMessage(form.password);
    if (passwordValidationMessage) {
      setError(passwordValidationMessage);
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('La confirmacion de contrasena no coincide');
      return;
    }

    setError('');
    setSuccessMessage('');
    setIsSubmitting(true);

    try {
      const response = await register({
        ...form,
        rol: fixedRole,
        telefono: form.telefono || undefined,
        cedula: form.cedula || undefined,
        ciudad: form.ciudad || undefined,
        pais: form.pais || undefined,
        direccionPrincipal: form.direccionPrincipal || undefined,
        descripcion: form.descripcion || undefined,
        aniosExperiencia: form.aniosExperiencia === '' ? undefined : Number(form.aniosExperiencia),
        radioAtencionKm: form.radioAtencionKm === '' ? undefined : Number(form.radioAtencionKm),
        tarifaBase: form.tarifaBase === '' ? undefined : Number(form.tarifaBase),
        tarifaDomicilio: form.tarifaDomicilio === '' ? undefined : Number(form.tarifaDomicilio),
        moneda: form.moneda || undefined,
        specialtyIds: isTechnician ? form.specialtyIds : undefined,
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || 'No se pudo crear la cuenta');
      }

      if (data.requiresApproval) {
        setSuccessMessage(normalizePublicAuthMessage(data.message || 'Solicitud enviada. Cuando tu cuenta este habilitada podras ingresar.'));
        setForm((current) => ({
          ...current,
          password: '',
          confirmPassword: '',
          specialtyIds: [],
        }));
        return;
      }

      persistAuthSession(data);
      setUser(data.user || null);
      router.push(getDashboardPathByRole(getUserRole(data.user)));
      router.refresh();
    } catch (submitError) {
      setError(normalizePublicAuthMessage(submitError.message || 'No se pudo crear la cuenta'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="flex border-b border-[#c3c5d9]">
        <Link href={loginHref} className="flex-1 pb-3 text-center text-[14px] font-semibold uppercase tracking-[0.05em] text-[#434656] transition-colors hover:text-[#003ec7]">
          Ingresar
        </Link>
        <Link href={registerHref} className="flex-1 border-b-2 border-[#003ec7] pb-3 text-center text-[14px] font-bold uppercase tracking-[0.05em] text-[#003ec7]">
          Registro
        </Link>
      </div>
      <div>
        <h1 className="mb-2 text-[28px] font-bold leading-[1.2] text-[#0b1c30] md:text-[32px]">{title}</h1>
        <p className="text-[16px] leading-6 text-[#434656]">{description}</p>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-[14px] font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Nombres</label>
          <Input placeholder="Juan" value={form.nombre} onChange={(event) => updateField('nombre', event.target.value)} required />
        </div>
        <div className="space-y-2">
          <label className="text-[14px] font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Apellidos</label>
          <Input placeholder="Perez" value={form.apellido} onChange={(event) => updateField('apellido', event.target.value)} required />
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-[14px] font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Correo electronico</label>
        <Input type="email" placeholder="correo@ejemplo.com" value={form.correo} onChange={(event) => updateField('correo', event.target.value)} required />
      </div>
      <div className="space-y-2">
        <label className="text-[14px] font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Telefono</label>
        <Input type="tel" placeholder="+54 9 11 0000 0000" value={form.telefono} onChange={(event) => updateField('telefono', event.target.value)} />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-[14px] font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Cedula</label>
          <Input placeholder="Documento de identidad" value={form.cedula} onChange={(event) => updateField('cedula', event.target.value)} />
        </div>
        <div className="space-y-2">
          <label className="text-[14px] font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Ciudad</label>
          <Input placeholder="Ciudad" value={form.ciudad} onChange={(event) => updateField('ciudad', event.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-[14px] font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Pais</label>
        <Input placeholder="Pais" value={form.pais} onChange={(event) => updateField('pais', event.target.value)} />
      </div>
      <div className="space-y-2">
        <label className="text-[14px] font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Direccion principal</label>
        <Input placeholder="Direccion" value={form.direccionPrincipal} onChange={(event) => updateField('direccionPrincipal', event.target.value)} />
      </div>
      {isTechnician ? (
        <>
          <div className="space-y-2">
            <label className="text-[14px] font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Descripcion profesional</label>
            <textarea className="min-h-24 w-full rounded-2xl border border-[#c3c5d9] px-4 py-3 text-[16px] text-[#0b1c30]" placeholder="Describe tu experiencia y servicios" value={form.descripcion} onChange={(event) => updateField('descripcion', event.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-[14px] font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Especialidades</label>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
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
            <p className="text-xs text-[#737688]">Selecciona una o varias especialidades tecnicas.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-[14px] font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Años de experiencia</label>
              <Input type="number" min="0" placeholder="0" value={form.aniosExperiencia} onChange={(event) => updateField('aniosExperiencia', event.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-[14px] font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Radio de atencion (km)</label>
              <Input type="number" min="0" step="0.1" placeholder="10" value={form.radioAtencionKm} onChange={(event) => updateField('radioAtencionKm', event.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-[14px] font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Tarifa base</label>
              <Input type="number" min="0" step="0.01" placeholder="0.00" value={form.tarifaBase} onChange={(event) => updateField('tarifaBase', event.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-[14px] font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Tarifa domicilio</label>
              <Input type="number" min="0" step="0.01" placeholder="0.00" value={form.tarifaDomicilio} onChange={(event) => updateField('tarifaDomicilio', event.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-[14px] font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Moneda</label>
              <Input placeholder="USD" value={form.moneda} onChange={(event) => updateField('moneda', event.target.value)} />
            </div>
          </div>
        </>
      ) : null}
      <div className="space-y-2">
        <label className="text-[14px] font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Contrasena</label>
        <PasswordInput visible={showPassword} onToggle={() => setShowPassword((current) => !current)} placeholder="Crea una contrasena" value={form.password} onChange={(event) => updateField('password', event.target.value)} minLength={7} required />
        <p className="text-xs text-[#737688]">Debe tener al menos 7 caracteres, una letra y un numero.</p>
      </div>
      <div className="space-y-2">
        <label className="text-[14px] font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Confirmar contrasena</label>
        <PasswordInput visible={showConfirmPassword} onToggle={() => setShowConfirmPassword((current) => !current)} placeholder="Repite tu contrasena" value={form.confirmPassword} onChange={(event) => updateField('confirmPassword', event.target.value)} minLength={7} required />
      </div>
      <label className="flex items-start gap-2 text-sm text-[#434656]">
        <input type="checkbox" checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} className="mt-1 h-4 w-4 rounded border-[#c3c5d9] text-[#003ec7]" />
        Acepto los terminos del servicio y la politica de privacidad.
      </label>
      {successMessage ? <p className="rounded-2xl bg-[#d7f8ef] px-4 py-3 text-sm text-[#00695c]">{successMessage}</p> : null}
      {error ? <p className="rounded-2xl bg-[#ffdad6] px-4 py-3 text-sm text-[#ba1a1a]">{error}</p> : null}
      <Button type="submit" className="w-full rounded-2xl py-3.5 disabled:cursor-not-allowed disabled:opacity-70" disabled={isSubmitting}>
        {isSubmitting ? 'Creando cuenta...' : submitLabel}
        <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
      </Button>
    </form>
  );
}
