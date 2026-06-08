import ServiceTable from '../../../components/admin/ServiceTable';

export default function AdminServicesPage() {
  return (
    <section className="mx-auto max-w-[1280px] px-5 py-8 md:px-10">
      <h1 className="section-title mb-6">Servicios</h1>
      <ServiceTable />
    </section>
  );
}
