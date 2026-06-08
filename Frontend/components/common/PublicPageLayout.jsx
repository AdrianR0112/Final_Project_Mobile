import Navbar from './Navbar';
import PublicFooter from './PublicFooter';

export default function PublicPageLayout({ children }) {
  return (
    <main className="min-h-screen bg-[#f8f9ff]">
      <Navbar />
      {children}
      <PublicFooter />
    </main>
  );
}
