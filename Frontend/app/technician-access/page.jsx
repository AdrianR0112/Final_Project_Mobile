import Link from 'next/link';
import Navbar from '../../components/common/Navbar';
import { getPublicSiteConfig } from '../../lib/public-site';

export default async function TechnicianAccessPage() {
  const site = await getPublicSiteConfig();

  return (
    <main className="min-h-screen bg-[#f8f9ff]">
      <Navbar />
      <div className="mx-auto max-w-[1080px] px-5 py-12 md:px-16">
        <section className="mt-10 rounded-[32px] bg-white p-8 shadow-[0_16px_48px_rgba(10,17,40,0.12)] md:p-12">
          <p className="text-sm uppercase tracking-[0.05em] text-[#737688]">Portal profesional</p>
          <h1 className="mt-3 text-[34px] font-extrabold leading-[1.1] text-[#0b1c30] md:text-[48px]">Acceso profesional de {site.appName}</h1>
          <p className="mt-4 max-w-3xl text-[18px] leading-8 text-[#434656]">
            Desde aqui puedes iniciar sesion con tu cuenta o enviar tu solicitud de registro tecnico con la informacion profesional requerida.
          </p>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <article className="rounded-[28px] border border-[#c3c5d9] bg-[#eff4ff] p-6">
              <h2 className="text-[24px] font-semibold text-[#0b1c30]">Ya tengo cuenta</h2>
              <p className="mt-3 text-sm leading-6 text-[#434656]">Ingresa con tu cuenta profesional para revisar solicitudes, servicios activos, historial y mensajes.</p>
              <Link href="/login" className="mt-6 inline-flex rounded-full bg-[#003ec7] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0052ff]">
                Iniciar sesion
              </Link>
            </article>
            <article className="rounded-[28px] border border-[#c3c5d9] bg-white p-6">
              <h2 className="text-[24px] font-semibold text-[#0b1c30]">Quiero postularme</h2>
              <p className="mt-3 text-sm leading-6 text-[#434656]">Completa tu registro tecnico. Revisaremos tu solicitud antes de habilitar el ingreso al sistema.</p>
              <Link href="/technician-access/register" className="mt-6 inline-flex rounded-full border border-[#c3c5d9] px-5 py-3 text-sm font-semibold text-[#0b1c30] transition-colors hover:bg-[#eff4ff]">
                Registrar solicitud tecnica
              </Link>
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}
