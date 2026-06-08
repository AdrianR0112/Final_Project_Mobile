import Link from 'next/link';
import { publicNavLinks, serviceMenuLinks } from '../../lib/marketing-content';
import { getPublicSiteConfig } from '../../lib/public-site';

export default async function PublicFooter() {
  const site = await getPublicSiteConfig();
  const channels = [
    { label: 'Correo', value: site.contact.email, href: `mailto:${site.contact.email}` },
    { label: 'Telefono', value: site.contact.phone, href: `tel:${site.contact.phone.replace(/\s+/g, '')}` },
    { label: 'Instagram', value: site.contact.instagram.label, href: site.contact.instagram.url },
    { label: 'LinkedIn', value: site.contact.linkedin.label, href: site.contact.linkedin.url },
  ];

  return (
    <footer className="border-t border-[#d8dbeb] bg-white">
      <div className="mx-auto grid max-w-[1280px] gap-8 px-5 py-10 md:px-16 lg:grid-cols-[1.3fr_1fr_1fr]">
        <div>
          <p className="text-sm uppercase tracking-[0.05em] text-[#737688]">{site.appName}</p>
          <h2 className="mt-2 text-[24px] font-bold text-[#0b1c30]">Atencion tecnica para clientes, con acceso profesional separado.</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#434656]">
            Si eres tecnico y quieres trabajar en la plataforma, accede desde el portal profesional para iniciar sesion o enviar tu solicitud de registro.
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.05em] text-[#737688]">Explora</p>
          <div className="mt-4 grid gap-3">
            {[...publicNavLinks, ...serviceMenuLinks.filter((link) => link.href !== '/servicios')].map((link) => (
              <Link key={link.href} href={link.href} className="text-sm text-[#434656] transition-colors hover:text-[#003ec7]">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.05em] text-[#737688]">Contacto</p>
          <div className="mt-4 grid gap-3">
            {channels.map((channel) => (
              <Link key={channel.label} href={channel.href} className="text-sm text-[#434656] transition-colors hover:text-[#003ec7]">
                {channel.label}: {channel.value}
              </Link>
            ))}
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/technician-access"
            className="inline-flex items-center justify-center rounded-full border border-[#c3c5d9] px-5 py-3 text-sm font-semibold text-[#0b1c30] transition-colors hover:bg-[#eff4ff]"
          >
            Acceso para tecnicos
          </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
