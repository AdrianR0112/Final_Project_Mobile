import PublicPageLayout from '../../components/common/PublicPageLayout';
import { getPublicSiteConfig } from '../../lib/public-site';
import { getCatalogServices } from '../../lib/service-catalog';

export default async function ServiciosPage() {
  const [services, site] = await Promise.all([getCatalogServices(), getPublicSiteConfig()]);

  return (
    <PublicPageLayout>
      <section className="mx-auto max-w-[1280px] px-5 py-12 md:px-16 md:py-16">
        <span className="eyebrow">Servicios</span>
        <h1 className="mt-3 text-[34px] font-extrabold leading-[1.1] text-[#0b1c30] md:text-[52px]">Catalogo de reparaciones y soporte tecnico</h1>
        <p className="mt-5 max-w-3xl text-[18px] leading-8 text-[#434656]">Explora los tipos de equipos que se pueden atender en {site.appName}, con descripcion, tiempo estimado y rangos de precio referenciales.</p>
      </section>

      <section className="mx-auto max-w-[1280px] px-5 pb-16 md:px-16">
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {services.map((service) => (
            <article key={service.title} className="surface-card surface-card-hover p-6">
              <div className="flex justify-center">
                {service.imageUrl ? (
                  <img src={service.imageUrl} alt={service.title} className="h-14 w-14 object-contain" />
                ) : (
                  <span className="material-symbols-outlined text-[34px] text-[#003ec7]">build</span>
                )}
              </div>
              <h2 className="mt-5 text-[22px] font-semibold text-[#0b1c30]">{service.title}</h2>
              <p className="mt-3 text-sm leading-6 text-[#434656]">{service.description}</p>
              {service.equipmentTypes.length > 0 ? <p className="mt-3 text-xs uppercase tracking-[0.05em] text-[#737688]">Tipos: {service.equipmentTypes.map((type) => type.nombre).join(' · ')}</p> : null}
              <div className="mt-5 grid gap-2 rounded-2xl bg-[#eff4ff] p-4 text-sm text-[#434656]">
                <p><span className="font-semibold text-[#0b1c30]">Tiempo estimado:</span> {service.eta}</p>
                <p><span className="font-semibold text-[#0b1c30]">Rango referencial:</span> {service.priceRange}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </PublicPageLayout>
  );
}
