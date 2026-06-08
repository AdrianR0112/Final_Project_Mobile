import RegisterForm from '../../components/auth/RegisterForm';
import Navbar from '../../components/common/Navbar';
import { getPublicSiteConfig } from '../../lib/public-site';

export default async function RegisterPage() {
  const site = await getPublicSiteConfig();

  return (
    <main className="min-h-screen bg-[#f8f9ff]">
      <Navbar />
      <div className="flex items-center justify-center p-5 md:p-16">
        <div className="grid w-full max-w-[1280px] overflow-hidden rounded-[28px] bg-white shadow-[0_16px_48px_rgba(10,17,40,0.12)] md:min-h-[800px] md:grid-cols-2">
          <section className="relative hidden overflow-hidden bg-[#213145] p-16 text-white md:flex md:flex-col md:justify-between">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(0,82,255,0.24),transparent_40%)]" />
          <div className="relative z-10">
            <div className="mb-12 flex items-center gap-3">
              <span className="material-symbols-outlined material-symbols-filled text-[36px] text-[#dde1ff]">build_circle</span>
              <span className="text-[20px] font-black text-[#dde1ff]">{site.appName}</span>
            </div>
            <h1 className="max-w-md text-[48px] font-extrabold leading-[1.1] tracking-[-0.02em]">Unete a la plataforma que conecta clientes con tecnicos disponibles.</h1>
            <p className="mt-5 max-w-md text-[18px] leading-8 text-[#bfc5e4]">Crea una cuenta para solicitar reparaciones de equipos tecnologicos o para atender servicios a domicilio y en taller.</p>
          </div>
          <div className="relative z-10 grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl bg-white/10 p-5"><p className="text-sm uppercase tracking-[0.05em] text-[#bfc5e4]">Tecnicos</p><p className="mt-2 text-[20px] font-semibold">Disponibles</p></div>
            <div className="rounded-3xl bg-white/10 p-5"><p className="text-sm uppercase tracking-[0.05em] text-[#bfc5e4]">Atencion</p><p className="mt-2 text-[20px] font-semibold">Domicilio o taller</p></div>
            <div className="rounded-3xl bg-white/10 p-5"><p className="text-sm uppercase tracking-[0.05em] text-[#bfc5e4]">Seguimiento</p><p className="mt-2 text-[20px] font-semibold">En tiempo real</p></div>
          </div>
        </section>
        <section className="flex items-center bg-white p-5 md:p-16">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-10 flex items-center justify-center gap-3 md:hidden">
              <span className="material-symbols-outlined material-symbols-filled text-[36px] text-[#003ec7]">build_circle</span>
              <span className="text-[20px] font-black text-[#003ec7]">{site.appName}</span>
            </div>
            <RegisterForm
              fixedRole="cliente"
              loginHref="/login"
              registerHref="/register"
              title="Crear cuenta"
              description="Registrate para solicitar asistencia, seguir el estado de tus servicios y centralizar tus reparaciones."
              submitLabel="Crear cuenta"
            />
          </div>
        </section>
        </div>
      </div>
    </main>
  );
}
