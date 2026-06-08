import PublicPageLayout from '../../components/common/PublicPageLayout';
import { getPublicSiteConfig } from '../../lib/public-site';
import { companyValues, teamMembers } from '../../lib/marketing-content';

export default async function SobreNosotrosPage() {
  const site = await getPublicSiteConfig();

  return (
    <PublicPageLayout>
      <section className="mx-auto max-w-[1280px] px-5 py-12 md:px-16 md:py-16">
        <span className="eyebrow">Sobre nosotros</span>
        <h1 className="mt-3 text-[34px] font-extrabold leading-[1.1] text-[#0b1c30] md:text-[52px]">Una plataforma creada para volver mas confiable la reparacion tecnica</h1>
        <p className="mt-5 max-w-3xl text-[18px] leading-8 text-[#434656]">{site.appName} nace para ordenar la relacion entre clientes y tecnicos con un flujo claro de solicitud, seguimiento, pago y calificacion dentro de un mismo producto.</p>
      </section>

      <section className="mx-auto grid max-w-[1280px] gap-6 px-5 pb-16 md:px-16 lg:grid-cols-3">
        <article className="grid-surface lg:col-span-1">
          <span className="eyebrow">Mision</span>
          <p className="mt-4 text-[18px] leading-8 text-[#434656]">Conectar personas que necesitan reparar sus equipos con tecnicos confiables, reduciendo friccion, incertidumbre y falta de seguimiento.</p>
        </article>
        <article className="grid-surface lg:col-span-1">
          <span className="eyebrow">Vision</span>
          <p className="mt-4 text-[18px] leading-8 text-[#434656]">Convertirse en la capa digital de referencia para soporte tecnico local, con procesos trazables y reputacion verificable.</p>
        </article>
        <article className="grid-surface lg:col-span-1">
          <span className="eyebrow">Historia</span>
          <p className="mt-4 text-[18px] leading-8 text-[#434656]">El proyecto surge de una necesidad comun: pedir ayuda tecnica suele ser lento, opaco y dificil de auditar. La plataforma organiza ese recorrido de principio a fin.</p>
        </article>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-[1280px] px-5 md:px-16">
          <span className="eyebrow">Valores</span>
          <h2 className="section-title mt-3">Lo que diferencia a la plataforma</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {companyValues.map((value) => (
              <article key={value.title} className="grid-surface">
                <h3 className="text-[22px] font-semibold text-[#0b1c30]">{value.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#434656]">{value.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1280px] px-5 py-16 md:px-16">
        <span className="eyebrow">Equipo</span>
        <h2 className="section-title mt-3">Areas que sostienen el proyecto</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {teamMembers.map((member) => (
            <article key={member.name} className="grid-surface">
              <h3 className="text-[22px] font-semibold text-[#0b1c30]">{member.name}</h3>
              <p className="mt-3 text-sm leading-6 text-[#434656]">{member.role}</p>
            </article>
          ))}
        </div>
      </section>
    </PublicPageLayout>
  );
}
