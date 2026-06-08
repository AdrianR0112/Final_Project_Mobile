import Link from 'next/link';
import PublicPageLayout from '../../components/common/PublicPageLayout';
import { getPublicCoverageZones, getPublicSiteConfig } from '../../lib/public-site';

export default async function ContactoPage() {
  const [site, zones] = await Promise.all([getPublicSiteConfig(), getPublicCoverageZones()]);
  const contactChannels = [
    { label: 'Correo', value: site.contact.email, href: `mailto:${site.contact.email}` },
    { label: 'Telefono', value: site.contact.phone, href: `tel:${site.contact.phone.replace(/\s+/g, '')}` },
    { label: 'Instagram', value: site.contact.instagram.label, href: site.contact.instagram.url },
    { label: 'LinkedIn', value: site.contact.linkedin.label, href: site.contact.linkedin.url },
  ];

  return (
    <PublicPageLayout>
      <section className="mx-auto max-w-[1280px] px-5 py-12 md:px-16 md:py-16">
        <span className="eyebrow">Contacto</span>
        <h1 className="mt-3 text-[34px] font-extrabold leading-[1.1] text-[#0b1c30] md:text-[52px]">Conversemos sobre cobertura, soporte o alianzas</h1>
        <p className="mt-5 max-w-3xl text-[18px] leading-8 text-[#434656]">Si necesitas ayuda, quieres validar disponibilidad en tu zona o te interesa colaborar con {site.appName}, aqui tienes los canales principales.</p>
      </section>

      <section className="mx-auto grid max-w-[1280px] gap-6 px-5 pb-16 md:px-16 lg:grid-cols-[1fr_0.9fr]">
        <form className="grid-surface space-y-4">
          <h2 className="text-[28px] font-bold text-[#0b1c30]">Formulario de contacto</h2>
          <input className="w-full rounded-2xl border border-[#c3c5d9] bg-white px-4 py-3 text-[16px] text-[#0b1c30] outline-none" placeholder="Nombre completo" />
          <input className="w-full rounded-2xl border border-[#c3c5d9] bg-white px-4 py-3 text-[16px] text-[#0b1c30] outline-none" placeholder="Correo electronico" type="email" />
          <input className="w-full rounded-2xl border border-[#c3c5d9] bg-white px-4 py-3 text-[16px] text-[#0b1c30] outline-none" placeholder="Telefono" type="tel" />
          <textarea className="min-h-32 w-full rounded-2xl border border-[#c3c5d9] bg-white px-4 py-3 text-[16px] text-[#0b1c30] outline-none" placeholder="Cuentanos en que podemos ayudarte" />
          <button type="submit" className="inline-flex rounded-full bg-[#003ec7] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#0052ff]">Enviar consulta</button>
        </form>

        <div className="grid gap-6">
          <article className="grid-surface">
            <h2 className="text-[28px] font-bold text-[#0b1c30]">Canales directos</h2>
            <div className="mt-5 grid gap-4">
              {contactChannels.map((channel) => (
                <Link key={channel.label} href={channel.href} className="rounded-2xl bg-[#eff4ff] px-4 py-3 text-sm text-[#434656] transition-colors hover:bg-[#dfe9ff]">
                  <span className="font-semibold text-[#0b1c30]">{channel.label}:</span> {channel.value}
                </Link>
              ))}
            </div>
          </article>
          <article className="grid-surface">
            <h2 className="text-[28px] font-bold text-[#0b1c30]">Mapa de cobertura</h2>
            <div className="mt-5 rounded-[24px] border border-[#d8dbeb] bg-[linear-gradient(135deg,#eff4ff,#ffffff)] p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                {zones.map((zone) => (
                  <p key={zone.id} className="rounded-2xl bg-white px-4 py-3 text-sm text-[#434656]">{zone.nombre}{zone.ciudad ? ` · ${zone.ciudad}` : ''}</p>
                ))}
              </div>
            </div>
          </article>
        </div>
      </section>
    </PublicPageLayout>
  );
}
