import { Suspense } from 'react';
import LoginForm from '../../components/auth/LoginForm';
import Navbar from '../../components/common/Navbar';
import { getPublicSiteConfig } from '../../lib/public-site';

export default async function LoginPage() {
  const site = await getPublicSiteConfig();

  return (
    <main className="min-h-screen bg-[#f8f9ff]">
      <Navbar />
      <div className="flex items-center justify-center p-5 md:p-16">
        <div className="grid w-full max-w-[1280px] overflow-hidden rounded-[28px] bg-white shadow-[0_16px_48px_rgba(10,17,40,0.12)] md:min-h-[800px] md:grid-cols-2">
          <section className="relative hidden overflow-hidden bg-[#213145] p-16 text-white md:flex md:flex-col md:justify-between">
          <div className="absolute inset-0 opacity-20">
            <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuAgPfTrMdB6ODpxR-4VBYrKmuSU9I9oVW9UytHGHPumiN3d-Mo3co_Et2o8p8o_1ML8obuAtCxvKTyWJCjxshhpwSfbeRkyXEFQ8Gbq5ir9LMIymTQXqbvoNOJNJmpw4i1vlsjYkkO3Okp1QxdpzHaz5ORgRD7V-b-YtMPX9zMLWgDYop2Cn6-uePgz7Ww-zaaHH7oEmw174GI2NWUJlOKjNneSxYkZ__HW05xP-fnjyaBiNNV2lYLOotZ3GxGMI41TxGboWT6kxJY4" alt="Tecnico trabajando en la reparacion de un circuito" className="h-full w-full object-cover" />
          </div>
            <div className="relative z-10">
              <div className="mb-12 flex items-center gap-3">
                <span className="material-symbols-outlined material-symbols-filled text-[36px] text-[#dde1ff]">build_circle</span>
               <span className="text-[20px] font-black text-[#dde1ff]">{site.appName}</span>
              </div>
            <h1 className="max-w-md text-[48px] font-extrabold leading-[1.1] tracking-[-0.02em]">Servicios de reparacion tecnologica bajo demanda.</h1>
            <p className="mt-5 max-w-md text-[18px] leading-8 text-[#bfc5e4]">Ingresa para solicitar asistencia tecnica, gestionar visitas o aceptar trabajos cerca de ti.</p>
          </div>
          <div className="relative z-10 rounded-3xl border border-white/10 bg-[#0b1c30]/40 p-6 backdrop-blur">
            <p className="text-[16px] italic leading-7 text-white">"Solicite soporte urgente para mi laptop y en pocas horas ya tenia un tecnico atendiendo el caso."</p>
            <p className="mt-4 text-sm font-semibold text-[#dde1ff]">Daniela Rojas, clienta</p>
          </div>
        </section>
        <section className="flex items-center bg-white p-5 md:p-16">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-10 flex items-center justify-center gap-3 md:hidden">
              <span className="material-symbols-outlined material-symbols-filled text-[36px] text-[#003ec7]">build_circle</span>
              <span className="text-[20px] font-black text-[#003ec7]">{site.appName}</span>
            </div>
             <Suspense fallback={null}>
              <LoginForm
                loginHref="/login"
                registerHref="/register"
                title="Inicia sesion en tu cuenta"
                description="Usa un unico acceso para entrar a la plataforma. Al iniciar sesion te llevamos automaticamente a tu panel correspondiente."
              />
            </Suspense>
          </div>
        </section>
        </div>
      </div>
    </main>
  );
}
