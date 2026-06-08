'use client';

import { useEffect, useState } from 'react';
import Button from '../../../components/common/Button';
import { getAdminRatings, updateRatingVisibility } from '../../../services/admin.service';

function personLabel(person) {
  return [person?.name, person?.lastName].filter(Boolean).join(' ').trim() || person?.email || 'Sin nombre';
}

export default function AdminRatingsPage() {
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [filters, setFilters] = useState({ visible: '' });
  const [updatingId, setUpdatingId] = useState(null);

  async function loadRatings(nextFilters = filters) {
    try {
      setLoading(true);
      setError('');
      const response = await getAdminRatings({ limit: 100, visible: nextFilters.visible || undefined });
      const data = await response.json().catch(() => ({ ratings: [] }));

      if (!response.ok) {
        throw new Error(data.message || 'No se pudieron cargar las calificaciones');
      }

      setRatings(data.ratings || []);
    } catch (loadError) {
      setError(loadError.message || 'No se pudieron cargar las calificaciones');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRatings();
  }, []);

  async function handleVisibilityChange(rating) {
    try {
      setUpdatingId(rating.id);
      setError('');
      setMessage('');

      const response = await updateRatingVisibility(rating.id, { visible: !rating.visible });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || 'No se pudo actualizar la visibilidad');
      }

      setRatings((current) => current.map((item) => (item.id === rating.id ? data.rating : item)));
      setMessage(data.message || 'Visibilidad actualizada correctamente');
    } catch (updateError) {
      setError(updateError.message || 'No se pudo actualizar la visibilidad');
    } finally {
      setUpdatingId(null);
    }
  }

  const total = ratings.length;
  const visibleCount = ratings.filter((rating) => rating.visible).length;
  const hiddenCount = total - visibleCount;
  const average = total ? (ratings.reduce((sum, rating) => sum + Number(rating.score || 0), 0) / total).toFixed(2) : '0.00';

  return (
    <div className="mx-auto max-w-[1280px] px-5 py-8 md:px-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="section-title">Control de calificaciones y comentarios</h1>
          <p className="mt-2 text-sm text-[#434656]">Administra la visibilidad de resenas, revisa comentarios y supervisa valoraciones entre clientes y tecnicos.</p>
        </div>
        <div className="flex gap-3">
          <select className="rounded-2xl border border-[#c3c5d9] bg-white px-4 py-3 text-[16px] text-[#0b1c30]" value={filters.visible} onChange={(event) => setFilters({ visible: event.target.value })}>
            <option value="">Todas</option>
            <option value="true">Solo visibles</option>
            <option value="false">Solo ocultas</option>
          </select>
          <Button onClick={() => loadRatings(filters)}>Filtrar</Button>
        </div>
      </div>

      {message ? <div className="mb-4 rounded-2xl bg-[#d7f8ef] px-4 py-3 text-sm text-[#00695c]">{message}</div> : null}
      {error ? <div className="mb-4 rounded-2xl bg-[#ffdad6] px-4 py-3 text-sm text-[#ba1a1a]">{error}</div> : null}

      <section className="mb-6 grid gap-4 md:grid-cols-4">
        <article className="surface-card p-5"><p className="text-sm text-[#737688]">Promedio</p><p className="mt-2 text-[28px] font-bold text-[#0b1c30]">{average}</p></article>
        <article className="surface-card p-5"><p className="text-sm text-[#737688]">Total comentarios</p><p className="mt-2 text-[28px] font-bold text-[#0b1c30]">{total}</p></article>
        <article className="surface-card p-5"><p className="text-sm text-[#737688]">Visibles</p><p className="mt-2 text-[28px] font-bold text-[#00695c]">{visibleCount}</p></article>
        <article className="surface-card p-5"><p className="text-sm text-[#737688]">Ocultas</p><p className="mt-2 text-[28px] font-bold text-[#ba1a1a]">{hiddenCount}</p></article>
      </section>

      <div className="surface-card overflow-x-auto">
        {loading ? (
          <div className="px-6 py-8 text-center text-[#737688]">Cargando calificaciones...</div>
        ) : ratings.length === 0 ? (
          <div className="px-6 py-8 text-center text-[#737688]">No hay calificaciones para mostrar.</div>
        ) : (
          <table className="w-full min-w-[1150px] text-left">
            <thead className="bg-[#eff4ff] text-[14px] font-semibold uppercase tracking-[0.05em] text-[#434656]">
              <tr>
                <th className="px-6 py-4">Servicio</th>
                <th className="px-6 py-4">Emisor</th>
                <th className="px-6 py-4">Receptor</th>
                <th className="px-6 py-4">Puntaje</th>
                <th className="px-6 py-4">Comentario</th>
                <th className="px-6 py-4">Visibilidad</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {ratings.map((rating) => (
                <tr key={rating.id} className="border-t border-[#c3c5d9] bg-white align-top text-sm text-[#0b1c30]">
                  <td className="px-6 py-4">
                    <p className="font-semibold">{rating.service?.type || `Servicio #${rating.serviceId}`}</p>
                    <p className="mt-1 text-xs text-[#737688]">Estado: {rating.service?.state || 'Sin estado'}</p>
                  </td>
                  <td className="px-6 py-4 text-[#434656]">{personLabel(rating.emitter)}</td>
                  <td className="px-6 py-4 text-[#434656]">{personLabel(rating.receiver)}</td>
                  <td className="px-6 py-4 font-semibold text-[#003ec7]">{rating.score}/5</td>
                  <td className="px-6 py-4 text-[#434656]">{rating.comment || 'Sin comentario'}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${rating.visible ? 'bg-[#d7f8ef] text-[#00695c]' : 'bg-[#ffdad6] text-[#ba1a1a]'}`}>{rating.visible ? 'Visible' : 'Oculta'}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button type="button" disabled={updatingId === rating.id} className="rounded-full border border-[#003ec7] px-3 py-2 text-xs font-semibold text-[#003ec7] hover:bg-[#eff4ff] disabled:opacity-70" onClick={() => handleVisibilityChange(rating)}>{rating.visible ? 'Ocultar comentario' : 'Mostrar comentario'}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
