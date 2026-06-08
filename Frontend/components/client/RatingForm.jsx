'use client';

import { useState } from 'react';
import Button from '../common/Button';
import Input from '../common/Input';
import { createRating } from '../../services/rating.service';

export default function RatingForm({ serviceId, onSuccess, description = 'Tu opinion ayuda a mejorar la calidad de las atenciones y de la plataforma.', placeholder = 'Escribe un comentario sobre el servicio', submitLabel = 'Enviar calificacion', successMessage = 'Calificacion enviada correctamente' }) {
  const [form, setForm] = useState({ rating: 5, comment: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      const response = await createRating(serviceId, {
        puntuacion: parseInt(form.rating, 10),
        comentario: form.comment,
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || 'Error al enviar la calificación');
      }

      setForm({ rating: 5, comment: '' });
      setSuccess(true);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <p className="text-sm text-[#434656]">{description}</p>
      {error ? <div className="rounded-2xl bg-[#ffdad6] px-4 py-3 text-sm text-[#93000a]">{error}</div> : null}
      {success ? <div className="rounded-2xl bg-[#d8f8e1] px-4 py-3 text-sm text-[#00695c]">{successMessage}</div> : null}
      <div className="flex justify-center gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setForm((current) => ({ ...current, rating: star }))}
            className="inline-flex rounded-full p-1 transition-colors hover:scale-110"
            aria-label={`${star} estrella${star === 1 ? '' : 's'}`}
          >
            <span className={`material-symbols-outlined text-[40px] ${star <= form.rating ? 'material-symbols-filled text-[#003ec7]' : 'text-[#c3c5d9]'}`}>
              star
            </span>
          </button>
        ))}
      </div>
      <Input
        placeholder={placeholder}
        value={form.comment}
        onChange={(e) => setForm((current) => ({ ...current, comment: e.target.value }))}
      />
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Enviando...' : submitLabel}
      </Button>
    </form>
  );
}
