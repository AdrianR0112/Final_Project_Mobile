"use client";

import { useEffect, useState } from 'react';
import { SidebarProvider } from '../../context/SidebarContext';
import Sidebar from '../../components/common/Sidebar';
import DashboardTopbar from '../../components/common/DashboardTopbar';

export default function ClientLayout({ children }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <SidebarProvider>
      <div suppressHydrationWarning className="min-h-screen bg-[#f8f9ff]">
        <Sidebar role="client" />
        <main className="min-w-0 transition-all duration-300 lg:pl-72">
          <DashboardTopbar role="client" />
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
