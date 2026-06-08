import UserTable from '../../../components/admin/UserTable';

export default function AdminUsersPage() {
  return (
    <section className="mx-auto max-w-[1280px] px-5 py-8 md:px-10">
      <h1 className="section-title mb-6">Usuarios</h1>
      <UserTable />
    </section>
  );
}
