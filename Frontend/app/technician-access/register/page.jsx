import TechnicianApplicationForm from '../../../components/auth/TechnicianApplicationForm';
import Navbar from '../../../components/common/Navbar';

export default function TechnicianRegisterPage() {
  return (
    <main className="min-h-screen bg-[#f8f9ff]">
      <Navbar />
      <div className="mx-auto max-w-[1120px] px-5 py-8 md:px-10 md:py-12">
        <TechnicianApplicationForm />
      </div>
    </main>
  );
}
