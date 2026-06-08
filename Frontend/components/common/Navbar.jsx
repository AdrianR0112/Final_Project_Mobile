'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { publicNavLinks, serviceMenuLinks } from '../../lib/marketing-content';
import { getPublicSiteConfig } from '../../lib/public-site';

export default function Navbar() {
  const [appName, setAppName] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadConfig() {
      const site = await getPublicSiteConfig();
      if (!cancelled) {
        setAppName(site.appName || 'ReparaFix');
      }
    }
    loadConfig();
    return () => { cancelled = true; };
  }, []);

  function closeMobile() {
    setMenuOpen(false);
    setServicesOpen(false);
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-[#c3c5d9] bg-[#f8f9ff]/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1280px] items-center justify-between px-5 py-4 md:px-16">
        <Link href="/" className="flex shrink-0 items-center gap-3" onClick={closeMobile}>
          <span className="material-symbols-outlined material-symbols-filled text-[32px] text-[#003ec7]">
            build_circle
          </span>
          <span className="text-[18px] font-black leading-7 text-[#003ec7] md:text-[20px]">{appName}</span>
        </Link>

        <div className="hidden items-center gap-6 lg:flex">
          {publicNavLinks.map((link) => (
            link.href === '/servicios' ? (
              <div key={link.href} className="group relative">
                <Link
                  href={link.href}
                  className="inline-flex items-center gap-1 text-[14px] font-semibold uppercase tracking-[0.05em] text-[#434656] transition-colors hover:text-[#003ec7]"
                >
                  {link.label}
                  <span className="material-symbols-outlined text-[18px]">expand_more</span>
                </Link>
                <div className="invisible absolute left-0 top-full z-20 mt-3 w-64 translate-y-2 rounded-[24px] border border-[#d8dbeb] bg-white p-3 opacity-0 shadow-[0_12px_36px_rgba(10,17,40,0.12)] transition-all duration-200 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                  {serviceMenuLinks.map((menuLink) => (
                    <Link
                      key={menuLink.href}
                      href={menuLink.href}
                      className="block rounded-2xl px-4 py-3 text-sm font-semibold text-[#434656] transition-colors hover:bg-[#eff4ff] hover:text-[#003ec7]"
                    >
                      {menuLink.label}
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <Link
                key={link.href}
                href={link.href}
                className="text-[14px] font-semibold uppercase tracking-[0.05em] text-[#434656] transition-colors hover:text-[#003ec7]"
              >
                {link.label}
              </Link>
            )
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden rounded-full bg-[#003ec7] px-5 py-2 text-[14px] font-semibold text-white transition-colors hover:bg-[#0052ff] md:inline-flex"
          >
            Iniciar sesion
          </Link>

          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#c3c5d9] bg-white text-[#0b1c30] transition-colors hover:bg-[#eff4ff] lg:hidden"
            aria-label="Abrir menu"
          >
            <span className="material-symbols-outlined">{menuOpen ? 'close' : 'menu'}</span>
          </button>
        </div>
      </div>

      {menuOpen ? (
        <>
          <div className="fixed inset-0 top-[73px] z-40 bg-black/40 lg:hidden" onClick={closeMobile} />
          <div className="absolute left-0 right-0 top-full z-50 border-b border-[#c3c5d9] bg-[#f8f9ff] shadow-lg lg:hidden">
            <div className="flex flex-col gap-1 px-5 py-4">
              {publicNavLinks.map((link) => (
                link.href === '/servicios' ? (
                  <div key={link.href}>
                    <button
                      type="button"
                      onClick={() => setServicesOpen((prev) => !prev)}
                      className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-[14px] font-semibold uppercase tracking-[0.05em] text-[#434656] hover:bg-[#eff4ff]"
                    >
                      {link.label}
                      <span className="material-symbols-outlined text-[20px] transition-transform" style={{ transform: servicesOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                        expand_more
                      </span>
                    </button>
                    {servicesOpen ? (
                      <div className="ml-4 mt-1 flex flex-col gap-1 border-l-2 border-[#d8dbeb] pl-3">
                        {serviceMenuLinks.map((menuLink) => (
                          <Link
                            key={menuLink.href}
                            href={menuLink.href}
                            onClick={closeMobile}
                            className="rounded-2xl px-3 py-2.5 text-sm font-semibold text-[#434656] hover:bg-[#eff4ff] hover:text-[#003ec7]"
                          >
                            {menuLink.label}
                          </Link>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={closeMobile}
                    className="rounded-2xl px-4 py-3 text-[14px] font-semibold uppercase tracking-[0.05em] text-[#434656] hover:bg-[#eff4ff]"
                  >
                    {link.label}
                  </Link>
                )
              ))}
              <Link
                href="/login"
                onClick={closeMobile}
                className="mt-2 rounded-full bg-[#003ec7] px-5 py-3 text-center text-[14px] font-semibold text-white md:hidden"
              >
                Iniciar sesion
              </Link>
            </div>
          </div>
        </>
      ) : null}
    </nav>
  );
}
