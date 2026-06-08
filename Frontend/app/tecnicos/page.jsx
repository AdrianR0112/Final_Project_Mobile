import Link from 'next/link';
import PublicPageLayout from '../../components/common/PublicPageLayout';
import { getPublicSiteConfig } from '../../lib/public-site';
import { technicianBenefits, technicianEarnings, technicianRequirements } from '../../lib/marketing-content';

export default async function TecnicosPage() {
  const site = await getPublicSiteConfig();

  return (
    <PublicPageLayout>
      <section className="mx-auto grid max-w-[1280px] gap-8 px-5 py-12 md:px-16 md:py-16 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <span className="eyebrow">Tecnicos</span>
          <h1 className="mt-3 text-[34px] font-extrabold leading-[1.1] text-[#0b1c30] md:text-[52px]">Haz crecer tu trabajo tecnico con solicitudes, visibilidad y reputacion</h1>
          <p className="mt-5 max-w-3xl text-[18px] leading-8 text-[#434656]">{site.appName} esta pensado para captar tecnicos que quieran recibir solicitudes mejor filtradas, gestionar sus avances y construir confianza a partir de calificaciones verificadas.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/technician-access/register" className="inline-flex items-center justify-center rounded-full bg-[#003ec7] px-6 py-4 text-sm font-semibold text-white transition-colors hover:bg-[#0052ff]">Enviar postulacion</Link>
            <Link href="/technician-access/login" className="inline-flex items-center justify-center rounded-full border border-[#c3c5d9] px-6 py-4 text-sm font-semibold text-[#0b1c30] transition-colors hover:bg-white">Ya tengo acceso</Link>
          </div>
        </div>
        <aside className="grid-surface bg-gradient-to-br from-[#213145] to-[#2f4665] text-white">
          <p className="text-sm uppercase tracking-[0.05em] text-[#bfc5e4]">Registro prominente</p>
          <h2 className="mt-3 text-[28px] font-bold">Empieza tu postulacion hoy</h2>
          <p className="mt-4 text-sm leading-6 text-[#d9dff5]">El formulario tecnico ya existe dentro del portal profesional. Desde ahi podras cargar documento, experiencia, cobertura, tarifas y especialidades.</p>
          <Link href="/technician-access/register" className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#003ec7] transition-colors hover:bg-[#eff4ff]">Abrir formulario</Link>
        </aside>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto grid max-w-[1280px] gap-6 px-5 md:px-16 lg:grid-cols-2">
          <article className="grid-surface">
            <h2 className="text-[28px] font-bold text-[#0b1c30]">Beneficios de unirte</h2>
            <div className="mt-5 grid gap-4">
              {technicianBenefits.map((benefit) => (
                <p key={benefit} className="rounded-2xl bg-[#eff4ff] px-4 py-3 text-sm text-[#434656]">{benefit}</p>
              ))}
            </div>
          </article>
          <article className="grid-surface">
            <h2 className="text-[28px] font-bold text-[#0b1c30]">Requisitos principales</h2>
            <div className="mt-5 grid gap-4">
              {technicianRequirements.map((requirement) => (
                <p key={requirement} className="rounded-2xl bg-[#eff4ff] px-4 py-3 text-sm text-[#434656]">{requirement}</p>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="mx-auto max-w-[1280px] px-5 py-16 md:px-16">
        <span className="eyebrow">Cuanto puedes ganar</span>
        <h2 className="section-title mt-3">Tus ingresos dependen del tipo de servicio, complejidad y repuestos</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {technicianEarnings.map((earning) => (
            <article key={earning.title} className="grid-surface">
              <h3 className="text-[22px] font-semibold text-[#0b1c30]">{earning.title}</h3>
              <p className="mt-3 text-sm leading-6 text-[#434656]">{earning.detail}</p>
            </article>
          ))}
        </div>
      </section>
    </PublicPageLayout>
  );
}
