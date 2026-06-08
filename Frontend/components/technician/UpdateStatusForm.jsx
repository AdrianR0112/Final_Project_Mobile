'use client';

import { useEffect, useState } from 'react';
import Button from '../common/Button';
import { updateAssignedServiceStatus } from '../../services/service.service';
import { getStateLabel } from '../../utils/serviceStatus';

export default function UpdateStatusForm({ serviceId, currentStatus = 'solicitado', onStatusUpdate }) {
  const [selectedStatus, setSelectedStatus] = useState(currentStatus);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    setSelectedStatus(currentStatus || 'solicitado');
  }, [currentStatus]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!serviceId) {
      setError('ID de servicio no especificado');
      return;
    }

    setError('');
    setSuccess(false);
    setIsSubmitting(true);

    try {
      const response = await updateAssignedServiceStatus(serviceId, { estado: selectedStatus });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || 'Error al actualizar el estado');
      }

      if (onStatusUpdate) {
        await onStatusUpdate(data.serviceRequest?.estado || selectedStatus, data.serviceRequest || null);
      }
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Error al actualizar el estado');
    } finally {
      setIsSubmitting(false);
    }
  }

  const statusFlow = {
    aceptado: ['en_camino'],
    en_camino: ['en_reparacion'],
    en_reparacion: ['pendiente_pago'],
    pago_enviado: ['finalizado', 'pendiente_pago'],
  };
  const statuses = statusFlow[currentStatus] || [];
  const statusLabels = {
    en_camino: 'En camino',
    en_reparacion: 'En reparacion',
    pendiente_pago: 'Pendiente de pago',
    finalizado: 'Validar pago y finalizar',
  };

  if (statuses.length === 0) {
    return null;
  }

  return (
    <form onSubmit={handleSubmit} className="surface-card p-6">
      <h2 className="mb-2 text-[20px] font-semibold text-[#0b1c30]">Actualizar estado del servicio</h2>
      <p className="mb-4 text-sm text-[#434656]">Estado actual: <span className="font-semibold text-[#0b1c30]">{getStateLabel(currentStatus)}</span>. Comunica avances del servicio segun la etapa actual.</p>
      {error && <div className="mb-4 text-sm text-[#93000a]">{error}</div>}
      {success && <div className="mb-4 text-sm text-[#00695c]">Estado actualizado correctamente</div>}
      <div className="grid gap-4 md:grid-cols-3">
        {statuses.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setSelectedStatus(status)}
            className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition-colors ${
              selectedStatus === status
                ? 'border-[#003ec7] bg-[#eff4ff] text-[#003ec7]'
                : 'border-[#c3c5d9] bg-white text-[#0b1c30] hover:bg-[#eff4ff]'
            }`}
          >
            {statusLabels[status]}
          </button>
        ))}
      </div>
      <Button type="submit" className="mt-4" disabled={isSubmitting}>
        {isSubmitting ? 'Guardando...' : 'Guardar cambios'}
      </Button>
    </form>
  );
}
