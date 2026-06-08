'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Button from '../common/Button';
import Input from '../common/Input';
import { useAuth } from '../../hooks/useAuth';
import { login } from '../../services/auth.service';
import { persistAuthSession, getUserRole } from '../../utils/auth';
import { getDashboardPathByRole } from '../../utils/roles';
import { normalizePublicAuthMessage } from '../../lib/auth-copy';

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

export default function LoginForm({
  loginHref = '/login',
  registerHref = '/register',
  title = 'Bienvenido de nuevo',
  description = 'Ingresa tus datos para acceder a la plataforma.',
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useAuth();
  const [form, setForm] = useState({ correo: '', password: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await login(form);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || 'No se pudo iniciar sesion');
      }

      persistAuthSession(data);
      setUser(data.user || null);

      router.push(searchParams.get('next') || getDashboardPathByRole(getUserRole(data.user)));
      router.refresh();
    } catch (submitError) {
      setError(normalizePublicAuthMessage(submitError.message || 'No se pudo iniciar sesion'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="flex border-b border-[#c3c5d9]">
        <Link href={loginHref} className="flex-1 border-b-2 border-[#003ec7] pb-3 text-center text-[14px] font-bold uppercase tracking-[0.05em] text-[#003ec7]">
          Ingresar
        </Link>
        <Link href={registerHref} className="flex-1 pb-3 text-center text-[14px] font-semibold uppercase tracking-[0.05em] text-[#434656] transition-colors hover:text-[#003ec7]">
          Registro
        </Link>
      </div>
      <div>
        <h1 className="mb-2 text-[28px] font-bold leading-[1.2] text-[#0b1c30] md:text-[32px]">{title}</h1>
        <p className="text-[16px] leading-6 text-[#434656]">{description}</p>
      </div>
      <div className="space-y-2">
        <label className="text-[14px] font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Correo electronico</label>
        <Input
          type="email"
          placeholder="correo@ejemplo.com"
          value={form.correo}
          onChange={(event) => setForm((current) => ({ ...current, correo: event.target.value }))}
          required
        />
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[14px] font-semibold uppercase tracking-[0.05em] text-[#0b1c30]">Contrasena</label>
          <Link href="/forgot-password" className="text-sm font-semibold text-[#003ec7] hover:underline">Olvidaste tu contrasena?</Link>
        </div>
        <PasswordInput
          visible={showPassword}
          onToggle={() => setShowPassword((current) => !current)}
          placeholder="••••••••"
          value={form.password}
          onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
          required
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-[#434656]">
        <input type="checkbox" className="h-4 w-4 rounded border-[#c3c5d9] text-[#003ec7]" />
        Recordar sesion
      </label>
      {error ? <p className="rounded-2xl bg-[#ffdad6] px-4 py-3 text-sm text-[#ba1a1a]">{error}</p> : null}
      <Button type="submit" className="w-full rounded-2xl py-3.5 disabled:cursor-not-allowed disabled:opacity-70" disabled={isSubmitting}>
        {isSubmitting ? 'Ingresando...' : 'Ingresar'}
        <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
      </Button>
      <div className="relative flex items-center py-3">
        <div className="h-px flex-1 bg-[#c3c5d9]" />
        <span className="px-4 text-sm text-[#737688]">O continuar con</span>
        <div className="h-px flex-1 bg-[#c3c5d9]" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <button type="button" className="rounded-2xl border border-[#c3c5d9] bg-white py-3 text-[14px] font-semibold text-[#0b1c30] transition-colors hover:bg-[#eff4ff]">Google</button>
        <button type="button" className="rounded-2xl border border-[#c3c5d9] bg-white py-3 text-[14px] font-semibold text-[#0b1c30] transition-colors hover:bg-[#eff4ff]">Apple</button>
      </div>
    </form>
  );
}
