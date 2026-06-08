import Link from 'next/link';
import PublicPageLayout from '../components/common/PublicPageLayout';
import { companyValues, technicianBenefits, workflowSteps } from '../lib/marketing-content';
import { getPublicSiteConfig } from '../lib/public-site';
import { getCatalogServices } from '../lib/service-catalog';

export default async function HomePage() {
  const [services, site] = await Promise.all([getCatalogServices(), getPublicSiteConfig()]);
  const featuredServices = services.slice(0, 4);

  return (
    <PublicPageLayout>
      <section className="mx-auto grid max-w-[1280px] gap-10 px-5 py-12 md:grid-cols-12 md:px-16 md:py-16">
        <div className="flex flex-col justify-center gap-6 md:col-span-6">
          <span className="eyebrow">Soporte tecnico on-demand</span>
          <h1 className="text-[28px] font-bold leading-[1.2] text-[#0b1c30] md:text-[48px] md:font-extrabold md:leading-[1.1] md:tracking-[-0.02em]">
            Repara tus equipos con seguimiento claro, tecnicos validados y tiempos estimados desde el primer contacto
          </h1>
          <p className="text-[18px] leading-8 text-[#434656]">
            {site.appName} conecta clientes con tecnicos para laptops, celulares, electrodomesticos y mas, con una experiencia pensada para solicitar, seguir, pagar y calificar cada servicio.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row">
            <Link href="/register" className="inline-flex items-center justify-center gap-2 rounded-full bg-[#003ec7] px-6 py-4 text-[14px] font-semibold uppercase tracking-[0.05em] text-white transition-colors hover:bg-[#0052ff]">
              Crear cuenta
              <span className="material-symbols-outlined rounded-full bg-white text-[18px] text-[#003ec7]">arrow_forward</span>
            </Link>
            <Link href="/tecnicos" className="inline-flex items-center justify-center rounded-full border border-[#c3c5d9] px-6 py-4 text-[14px] font-semibold uppercase tracking-[0.05em] text-[#0b1c30] transition-colors hover:bg-white">
              Quiero ser tecnico
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl border border-[#d8dbeb] bg-white p-5"><p className="text-sm text-[#737688]">Solicitud guiada</p><p className="mt-2 font-semibold text-[#0b1c30]">Describe la falla y sube contexto</p></div>
            <div className="rounded-3xl border border-[#d8dbeb] bg-white p-5"><p className="text-sm text-[#737688]">Seguimiento</p><p className="mt-2 font-semibold text-[#0b1c30]">Estado, avances y repuestos</p></div>
            <div className="rounded-3xl border border-[#d8dbeb] bg-white p-5"><p className="text-sm text-[#737688]">Cierre confiable</p><p className="mt-2 font-semibold text-[#0b1c30]">Pago y calificacion al finalizar</p></div>
          </div>
        </div>
        <div className="relative h-[420px] overflow-hidden rounded-[24px] shadow-[0_10px_40px_rgba(10,17,40,0.12)] md:col-span-6 md:h-[600px]">
          <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuCdX5xBvZwhj23QVgp9ppY_MgOCuHvGJSos5vNkbP18MDVM6D-tPy5Ny-ZkWzGip3NcPNRNujKnyZ5jfoZwoGFhWNk2ouqQKbiL6zyTV5qUqslmKBWf6jUp9CLODetPFE9VDWY_ovMn_4Fvst1FKhh7wuB4tSzzeNkDCw2bgqGQxBsfLFHqoL4YbIGVPZXOoYosOgZl0S5lsKBVnH11akN9G_PPWoycZeRhoYWRcxputdrobDcDavT7Od02388B-8XLWAGsQ1QHAbIc" alt="Tecnico reparando un equipo tecnologico" className="h-full w-full object-cover" />
        </div>
      </section>
      <section className="bg-white py-16">
        <div className="mx-auto max-w-[1280px] px-5 md:px-16">
          <div className="mb-10 max-w-3xl">
            <span className="eyebrow">Como funciona</span>
            <h2 className="section-title mt-3">Tres pasos para resolver una reparacion sin perder trazabilidad</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {workflowSteps.map((step, index) => (
              <article key={step.title} className="grid-surface">
                <div className="flex items-center justify-between">
                  <span className="material-symbols-outlined text-[32px] text-[#003ec7]">{step.icon}</span>
                  <span className="text-sm font-semibold text-[#737688]">0{index + 1}</span>
                </div>
                <h3 className="mt-6 text-[22px] font-semibold text-[#0b1c30]">{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#434656]">{step.description}</p>
              </article>
            ))}
          </div>
          <Link href="/como-funciona" className="mt-8 inline-flex rounded-full border border-[#c3c5d9] px-5 py-3 text-sm font-semibold text-[#0b1c30] transition-colors hover:bg-[#eff4ff]">
            Ver flujo completo
          </Link>
        </div>
      </section>
      <section className="bg-[#eff4ff] py-16">
        <div className="mx-auto max-w-[1280px] px-5 md:px-16">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <span className="mb-2 block text-[14px] font-semibold uppercase tracking-[0.05em] text-[#003ec7]">/ SERVICIOS /</span>
              <h2 className="section-title">Servicios destacados segun las solicitudes mas frecuentes</h2>
            </div>
            <Link href="/servicios" className="hidden rounded-full border border-[#c3c5d9] px-5 py-2 text-[14px] font-semibold text-[#0b1c30] transition-colors hover:bg-white md:inline-flex">
              Ver todos los servicios
            </Link>
          </div>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {featuredServices.map((service, index) => (
              <article key={service.title} className="surface-card surface-card-hover overflow-hidden">
                <div className="flex h-48 items-center justify-center bg-gradient-to-br from-[#d3e4fe] via-white to-[#e5eeff] p-6">
                  {service.imageUrl ? <img src={service.imageUrl} alt={service.title} className="h-20 w-20 object-contain" /> : <span className="material-symbols-outlined text-[48px] text-[#003ec7]">build</span>}
                </div>
                <div className="p-6">
                  {index === 0 ? <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#003ec7]">Mas solicitada</p> : null}
                  <h3 className="text-[20px] font-semibold text-[#0b1c30]">{service.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-[#434656]">{service.description}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="mx-auto grid max-w-[1280px] gap-6 px-5 py-16 md:px-16 lg:grid-cols-2">
        <article className="relative overflow-hidden rounded-[28px] bg-[#213145] p-8 text-white shadow-[0_12px_40px_rgba(10,17,40,0.2)] md:p-12">
          <span className="text-sm uppercase tracking-[0.05em] text-[#bfc5e4]">Para clientes</span>
          <div className="mt-4">
            <h2 className="text-[28px] font-bold leading-[1.2] md:text-[32px]">Listo para resolver el problema de tu equipo?</h2>
            <p className="mt-3 text-[18px] leading-8 text-[#bfc5e4]">Crea tu cuenta, solicita el servicio y sigue cada avance desde la plataforma.</p>
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row md:mt-0">
            <Link href="/register" className="rounded-full bg-[#003ec7] px-6 py-3 text-center text-[14px] font-semibold uppercase tracking-[0.05em] text-white transition-colors hover:bg-[#0052ff]">Crear cuenta</Link>
            <Link href="/login" className="rounded-full border border-[#737688] px-6 py-3 text-center text-[14px] font-semibold uppercase tracking-[0.05em] text-white transition-colors hover:bg-white/10">Iniciar sesion</Link>
          </div>
        </article>
        <article className="grid-surface bg-gradient-to-br from-white via-[#f5f8ff] to-[#eff4ff]">
          <span className="text-sm uppercase tracking-[0.05em] text-[#737688]">Para tecnicos</span>
          <h2 className="mt-4 text-[28px] font-bold leading-[1.2] text-[#0b1c30] md:text-[32px]">Convierte tu experiencia tecnica en nuevas solicitudes</h2>
          <div className="mt-5 grid gap-3">
            {technicianBenefits.slice(0, 3).map((benefit) => (
              <p key={benefit} className="rounded-2xl border border-[#d8dbeb] bg-white px-4 py-3 text-sm text-[#434656]">{benefit}</p>
            ))}
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link href="/tecnicos" className="rounded-full bg-[#003ec7] px-6 py-3 text-center text-[14px] font-semibold uppercase tracking-[0.05em] text-white transition-colors hover:bg-[#0052ff]">Conocer beneficios</Link>
            <Link href="/technician-access/register" className="rounded-full border border-[#c3c5d9] px-6 py-3 text-center text-[14px] font-semibold uppercase tracking-[0.05em] text-[#0b1c30] transition-colors hover:bg-white">Postularme ahora</Link>
          </div>
        </article>
      </section>
      <section className="bg-white py-16">
        <div className="mx-auto max-w-[1280px] px-5 md:px-16">
          <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-start">
            <div>
              <span className="eyebrow">Confianza y reputacion</span>
              <h2 className="section-title mt-3">Calificaciones verificadas dentro del flujo real de servicio</h2>
              <p className="mt-4 muted-copy">La plataforma registra calificaciones al cerrar un servicio, permite respuesta del tecnico y mantiene el historial asociado al caso. Esta seccion destaca la logica de reputacion sin publicar testimonios inventados.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {companyValues.map((value) => (
                <article key={value.title} className="grid-surface">
                  <h3 className="text-[20px] font-semibold text-[#0b1c30]">{value.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#434656]">{value.description}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
    </PublicPageLayout>
  );
}
