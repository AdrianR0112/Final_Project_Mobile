'use client';

import { useState } from 'react';
import Link from 'next/link';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { resetPassword } from '../../services/auth.service';
import { getPasswordValidationMessage, normalizePublicAuthMessage } from '../../lib/auth-copy';

export default function ResetPasswordPage() {
  const [form, setForm] = useState({ token: '', newPassword: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      const passwordValidationMessage = getPasswordValidationMessage(form.newPassword);
      if (passwordValidationMessage) {
        throw new Error(passwordValidationMessage);
      }

      if (form.newPassword !== form.confirmPassword) {
        throw new Error('La confirmacion de contrasena no coincide');
      }

      const response = await resetPassword({ token: form.token, newPassword: form.newPassword });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || 'No se pudo restablecer la contrasena');
      }

      setSuccess(data.message || 'Contrasena restablecida correctamente');
      setForm({ token: '', newPassword: '', confirmPassword: '' });
    } catch (submitError) {
      setError(normalizePublicAuthMessage(submitError.message));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8f9ff] p-5 md:p-16">
      <div className="surface-card w-full max-w-xl p-6 md:p-8">
        <p className="text-sm uppercase tracking-[0.05em] text-[#737688]">Acceso</p>
        <h1 className="section-title mt-2">Restablecer contrasena</h1>
        <p className="mt-3 text-sm leading-6 text-[#434656]">Ingresa el token recibido y define una nueva contrasena segura para volver a entrar a la plataforma.</p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Input placeholder="Token de recuperacion" value={form.token} onChange={(event) => setForm((current) => ({ ...current, token: event.target.value }))} required />
          <Input type="password" minLength="7" placeholder="Nueva contrasena" value={form.newPassword} onChange={(event) => setForm((current) => ({ ...current, newPassword: event.target.value }))} required />
          <Input type="password" minLength="7" placeholder="Confirmar nueva contrasena" value={form.confirmPassword} onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))} required />
          <p className="text-xs text-[#737688]">Usa al menos 7 caracteres, una letra y un numero.</p>
          {error ? <div className="rounded-2xl bg-[#ffdad6] px-4 py-3 text-sm text-[#93000a]">{error}</div> : null}
          {success ? <div className="rounded-2xl bg-[#d8f8e1] px-4 py-3 text-sm text-[#00695c]">{success}</div> : null}
          <Button type="submit" className="w-full" disabled={isSubmitting}>{isSubmitting ? 'Restableciendo...' : 'Restablecer contrasena'}</Button>
        </form>
        <div className="mt-6 text-sm">
          <Link href="/login" className="font-semibold text-[#003ec7] hover:underline">Volver a iniciar sesion</Link>
        </div>
      </div>
    </main>
  );
}
