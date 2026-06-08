'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { clearAuthSession } from '../../utils/auth';
import { getFallbackAppName, getPublicSiteConfig } from '../../lib/public-site';
import { useSidebar } from '../../context/SidebarContext';

const navByRole = {
  client: {
    links: [
      { href: '/client/dashboard', label: 'Inicio', icon: 'dashboard' },
      { href: '/client/request-service', label: 'Solicitar servicio', icon: 'add_circle' },
      { href: '/client/services', label: 'Mis servicios', icon: 'build' },
      { href: '/client/nearby-technicians', label: 'Tecnicos cercanos', icon: 'location_on' },
      { href: '/client/history', label: 'Historial', icon: 'history' },
    ],
  },
  technician: {
    links: [
      { href: '/technician/dashboard', label: 'Inicio', icon: 'dashboard' },
      { href: '/technician/requests', label: 'Solicitudes', icon: 'assignment' },
      { href: '/technician/active-services', label: 'Servicios activos', icon: 'play_circle' },
      { href: '/technician/history', label: 'Historial', icon: 'history' },
    ],
  },
  admin: {
    links: [
      { href: '/admin/dashboard', label: 'Inicio', icon: 'dashboard' },
      { href: '/admin/users', label: 'Usuarios', icon: 'group' },
      { href: '/admin/technicians', label: 'Solicitudes tecnicas', icon: 'badge' },
      { href: '/admin/services', label: 'Servicios', icon: 'home_repair_service' },
      { href: '/admin/ratings', label: 'Calificaciones', icon: 'star' },
      { href: '/admin/reports', label: 'Reportes', icon: 'analytics' },
    ],
  },
};

const roleLabels = {
  client: 'Panel de cliente',
  technician: 'Panel de tecnico',
  admin: 'Panel de admin',
};

export default function Sidebar({ role }) {
  const router = useRouter();
  const pathname = usePathname();
  const { setUser } = useAuth();
  const { mobileOpen, closeMobile, collapsed } = useSidebar();
  const nav = navByRole[role] || navByRole.client;
  const roleLabel = roleLabels[role] || roleLabels.client;
  const [appName, setAppName] = useState(getFallbackAppName());

  useEffect(() => {
    let cancelled = false;

    async function loadAppName() {
      const site = await getPublicSiteConfig();
      if (!cancelled) {
        setAppName(site.appName || getFallbackAppName());
      }
    }

    loadAppName();

    return () => {
      cancelled = true;
    };
  }, []);

  function handleLogout() {
    clearAuthSession();
    setUser(null);
    closeMobile();
    router.push('/login');
    router.refresh();
  }

  const sidebarContent = (
    <>
      <div className={`mb-10 ${collapsed ? 'flex justify-center' : ''}`}>
        <Link href="/" onClick={closeMobile} className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
          <span className="material-symbols-outlined material-symbols-filled text-[32px] text-[#003ec7]">
            build_circle
          </span>
          {!collapsed ? (
            <div>
              <span className="block text-[20px] font-black text-[#003ec7]">{appName}</span>
              <span className="block text-xs font-semibold uppercase tracking-[0.08em] text-[#737688]">{roleLabel}</span>
            </div>
          ) : null}
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-2">
        {nav.links.map((link) => {
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={closeMobile}
              title={collapsed ? link.label : undefined}
              className={`flex items-center rounded-2xl px-4 py-3 text-[14px] font-semibold transition-all ${
                collapsed ? 'justify-center gap-0' : 'gap-3'
              } ${
                active
                  ? 'bg-[#0052ff] text-[#dfe3ff] shadow-[0_8px_30px_rgba(0,62,199,0.18)]'
                  : 'text-[#434656] hover:bg-[#d3e4fe] hover:text-[#0b1c30]'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">{link.icon}</span>
              {!collapsed ? link.label : null}
            </Link>
          );
        })}
      </nav>
      <div className="mt-6 border-t border-[#c3c5d9] pt-4">
        <button
          type="button"
          onClick={handleLogout}
          title={collapsed ? 'Cerrar sesion' : undefined}
          className={`flex w-full items-center rounded-2xl px-4 py-3 text-[14px] font-semibold text-[#ba1a1a] transition-colors hover:bg-[#ffdad6] ${
            collapsed ? 'justify-center gap-0' : 'gap-3'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">logout</span>
          {!collapsed ? 'Cerrar sesion' : null}
        </button>
      </div>
    </>
  );

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 lg:hidden ${
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={closeMobile}
        aria-hidden="true"
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 h-screen overflow-y-auto border-r border-[#c3c5d9] bg-[#eff4ff] shadow-sm transition-all duration-300 ${
          collapsed ? 'w-[72px] px-3 py-6' : 'w-72 px-6 py-6'
        } flex flex-col
          max-lg:-translate-x-full max-lg:transition-transform
          ${mobileOpen ? 'max-lg:translate-x-0' : ''}
          lg:translate-x-0
        `}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
