import './globals.css';
import { Manrope } from 'next/font/google';
import { AuthProvider } from '../context/AuthContext';
import { SocketProvider } from '../context/SocketContext';
import { getPublicSiteConfig } from '../lib/public-site';

const manrope = Manrope({
  subsets: ['latin'],
});

export async function generateMetadata() {
  const site = await getPublicSiteConfig();

  return {
    title: site.appName,
    description: `Plataforma web y movil on-demand para conectar clientes con tecnicos de reparacion tecnologica a domicilio o en taller en ${site.appName}`,
  };
}

export default function RootLayout({ children }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
        />
      </head>
      <body suppressHydrationWarning className={`${manrope.className} bg-[#f8f9ff] text-[#0b1c30] antialiased`}>
        <AuthProvider>
          <SocketProvider>{children}</SocketProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
