'use client';

import { useEffect, useState } from 'react';
import { getAdminDashboard } from '../../services/admin.service';

export default function ReportCards() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        const response = await getAdminDashboard();
        const dashboardData = await response.json().catch(() => ({}));
        setData(dashboardData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  const cards = [
    { title: 'Tickets abiertos', value: data?.pending_requests || 0, icon: 'confirmation_number' },
    { title: 'Tiempo promedio de respuesta', value: data?.avg_response_time || '--', icon: 'schedule' },
    { title: 'Satisfaccion del cliente', value: data?.customer_satisfaction || '0%', icon: 'sentiment_satisfied' },
  ];

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {loading ? (
        <div className="col-span-full text-center text-[#737688]">Cargando datos...</div>
      ) : error ? (
        <div className="col-span-full text-center text-[#93000a]">Error: {error}</div>
      ) : (
        cards.map((card) => (
          <article key={card.title} className="surface-card surface-card-hover p-6">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e5eeff] text-[#003ec7]">
              <span className="material-symbols-outlined">{card.icon}</span>
            </div>
            <p className="text-sm uppercase tracking-[0.05em] text-[#434656]">{card.title}</p>
            <p className="mt-2 text-[32px] font-bold leading-[1.2] tracking-[-0.01em] text-[#0b1c30]">{card.value}</p>
          </article>
        ))
      )}
    </div>
  );
}
