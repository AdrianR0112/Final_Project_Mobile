import StatusBadge from '../common/StatusBadge';

export default function ServiceStatus() {
  return (
    <div className="surface-card p-6">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[20px] font-semibold text-[#0b1c30]">Estado actual</h3>
        <StatusBadge status="in_progress">En progreso</StatusBadge>
      </div>
      <p className="text-[16px] leading-6 text-[#434656]">
        El tecnico ya esta asignado y trabajando sobre el diagnostico del equipo.
      </p>
    </div>
  );
}
