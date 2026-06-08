'use client';

import { useState } from 'react';
import Link from 'next/link';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { forgotPassword } from '../../services/auth.service';
import { normalizePublicAuthMessage } from '../../lib/auth-copy';

export default function ForgotPasswordPage() {
  const [correo, setCorreo] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setResult(null);
    setIsSubmitting(true);

    try {
      const response = await forgotPassword({ correo });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || 'No se pudo generar el token de recuperacion');
      }

      setResult(data);
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
        <h1 className="section-title mt-2">Recuperar contrasena</h1>
        <p className="mt-3 text-sm leading-6 text-[#434656]">Ingresa tu correo para iniciar la recuperacion de acceso. Si el entorno de correo aun no esta configurado, se mostrara un token temporal para pruebas locales.</p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Input type="email" placeholder="correo@ejemplo.com" value={correo} onChange={(event) => setCorreo(event.target.value)} required />
          {error ? <div className="rounded-2xl bg-[#ffdad6] px-4 py-3 text-sm text-[#93000a]">{error}</div> : null}
          {result ? (
            <div className="rounded-2xl bg-[#d8f8e1] px-4 py-3 text-sm text-[#00695c]">
              <p>{result.message}</p>
              {result.recoveryToken ? <p className="mt-2 break-all"><span className="font-semibold">Token temporal:</span> {result.recoveryToken}</p> : null}
              {result.expiresAt ? <p className="mt-1"><span className="font-semibold">Expira:</span> {new Date(result.expiresAt).toLocaleString()}</p> : null}
            </div>
          ) : null}
          <Button type="submit" className="w-full" disabled={isSubmitting}>{isSubmitting ? 'Procesando...' : 'Continuar recuperacion'}</Button>
        </form>
        <div className="mt-6 flex justify-between text-sm">
          <Link href="/login" className="font-semibold text-[#003ec7] hover:underline">Volver a iniciar sesion</Link>
          <Link href="/reset-password" className="font-semibold text-[#003ec7] hover:underline">Ya tengo un token</Link>
        </div>
      </div>
    </main>
  );
}
