import { SidebarProvider } from '../../context/SidebarContext';
import Sidebar from '../../components/common/Sidebar';
import DashboardTopbar from '../../components/common/DashboardTopbar';

export default function AdminLayout({ children }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen bg-[#f8f9ff]">
        <Sidebar role="admin" />
        <main className="min-w-0 transition-all duration-300 lg:pl-72">
          <DashboardTopbar role="admin" />
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
