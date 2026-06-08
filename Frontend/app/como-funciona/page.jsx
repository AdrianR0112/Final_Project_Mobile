import Link from 'next/link';
import PublicPageLayout from '../../components/common/PublicPageLayout';
import { getPublicSiteConfig } from '../../lib/public-site';
import { detailedWorkflow, technicianBenefits } from '../../lib/marketing-content';

export default async function ComoFuncionaPage() {
  const site = await getPublicSiteConfig();

  return (
    <PublicPageLayout>
      <section className="mx-auto max-w-[1280px] px-5 py-12 md:px-16 md:py-16">
        <span className="eyebrow">Como funciona</span>
        <h1 className="mt-3 max-w-4xl text-[34px] font-extrabold leading-[1.1] text-[#0b1c30] md:text-[52px]">Del reporte inicial a la calificacion final, cada etapa queda clara para clientes y tecnicos</h1>
        <p className="mt-5 max-w-3xl text-[18px] leading-8 text-[#434656]">Este es el flujo completo de {site.appName} para mantener visibilidad, tiempos estimados y una comunicacion ordenada durante cada reparacion.</p>
      </section>

      <section className="mx-auto max-w-[1280px] px-5 pb-16 md:px-16">
        <div className="grid gap-6 lg:grid-cols-5">
          {detailedWorkflow.map((step) => (
            <article key={step.title} className="grid-surface">
              <h2 className="text-[22px] font-semibold text-[#0b1c30]">{step.title}</h2>
              <p className="mt-3 text-sm leading-6 text-[#434656]">{step.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto grid max-w-[1280px] gap-6 px-5 md:px-16 lg:grid-cols-2">
          <article className="grid-surface">
            <span className="eyebrow">Para clientes</span>
            <h2 className="mt-3 text-[28px] font-bold text-[#0b1c30]">Solicitar y seguir sin fricciones</h2>
            <div className="mt-5 grid gap-4">
              <p className="rounded-2xl bg-[#eff4ff] px-4 py-3 text-sm text-[#434656]">Describe el problema con el mayor detalle posible para acelerar diagnostico y cotizacion.</p>
              <p className="rounded-2xl bg-[#eff4ff] px-4 py-3 text-sm text-[#434656]">Recibe actualizaciones de estado, avances, repuestos sugeridos y confirmacion de cierre.</p>
              <p className="rounded-2xl bg-[#eff4ff] px-4 py-3 text-sm text-[#434656]">Valida el pago final y deja una calificacion vinculada al servicio completado.</p>
            </div>
          </article>
          <article className="grid-surface">
            <span className="eyebrow">Para tecnicos</span>
            <h2 className="mt-3 text-[28px] font-bold text-[#0b1c30]">Recibir, ejecutar y construir reputacion</h2>
            <div className="mt-5 grid gap-4">
              {technicianBenefits.map((benefit) => (
                <p key={benefit} className="rounded-2xl bg-[#eff4ff] px-4 py-3 text-sm text-[#434656]">{benefit}</p>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="mx-auto max-w-[1280px] px-5 py-16 md:px-16">
        <div className="rounded-[28px] bg-[#213145] p-8 text-white md:flex md:items-center md:justify-between md:p-12">
          <div>
            <h2 className="text-[28px] font-bold md:text-[32px]">Quieres probar el flujo completo?</h2>
            <p className="mt-3 max-w-2xl text-[18px] leading-8 text-[#bfc5e4]">Crea una cuenta o inicia tu postulacion para acceder al flujo completo de la plataforma.</p>
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row md:mt-0">
            <Link href="/register" className="rounded-full bg-[#003ec7] px-6 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-[#0052ff]">Crear cuenta</Link>
            <Link href="/technician-access/register" className="rounded-full border border-[#737688] px-6 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-white/10">Enviar postulacion</Link>
          </div>
        </div>
      </section>
    </PublicPageLayout>
  );
}
