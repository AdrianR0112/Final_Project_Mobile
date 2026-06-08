'use client';

import { useEffect, useState } from 'react';
import { updateTechnicianProfile } from '../../services/technician.service';

export default function AvailabilityToggle({ initialAvailable = false, onChange }) {
  const [available, setAvailable] = useState(Boolean(initialAvailable));
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setAvailable(Boolean(initialAvailable));
  }, [initialAvailable]);

  async function handleToggle() {
    const nextValue = !available;

    try {
      setIsSubmitting(true);
      const response = await updateTechnicianProfile({ disponible: nextValue });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || 'No se pudo actualizar la disponibilidad');
      }

      setAvailable(nextValue);
      onChange?.(data.profile || null, nextValue);
    } catch {
      // Keep the UI stable if the update fails.
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isSubmitting}
      className={`inline-flex items-center gap-3 rounded-full px-4 py-2 text-[14px] font-semibold shadow-sm transition-colors ${
        available ? 'bg-[#0052ff] text-white' : 'border border-[#c3c5d9] bg-white text-[#0b1c30]'
      }`}
    >
      <span className={`h-2.5 w-2.5 rounded-full ${available ? 'bg-[#dfe3ff]' : 'bg-[#737688]'}`} />
      {isSubmitting ? 'Guardando...' : available ? 'Disponible' : 'No disponible'}
    </button>
  );
}
