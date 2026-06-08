'use client';

import { useEffect, useState } from 'react';
import { getAdminDashboard, getAdminReports } from '../../../services/admin.service';

function formatMoney(value) {
  return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(Number(value || 0));
}

export default function AdminReportsPage() {
  const [dashboard, setDashboard] = useState(null);
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [dashboardRes, reportsRes] = await Promise.all([getAdminDashboard(), getAdminReports()]);
        const dashboardData = await dashboardRes.json().catch(() => ({}));
        const reportsData = await reportsRes.json().catch(() => ({}));

        if (!dashboardRes.ok) {
          throw new Error(dashboardData.message || 'No se pudo cargar el dashboard');
        }

        if (!reportsRes.ok) {
          throw new Error(reportsData.message || 'No se pudieron cargar los reportes');
        }

        setDashboard(dashboardData);
        setReports(reportsData);
      } catch (loadError) {
        setError(loadError.message || 'No se pudieron cargar los reportes');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const serviceSummary = reports?.serviceSummary || [];
  const technicianIncome = reports?.technicianIncome || [];
  const users = dashboard?.users || {};
  const ratings = dashboard?.ratings || {};
  const serviceStates = dashboard?.serviceStates || [];

  return (
    <section className="mx-auto max-w-[1280px] px-5 py-8 md:px-10">
      <h1 className="section-title mb-6">Reportes y estadisticas basicas</h1>

      {loading ? <div className="surface-card p-8 text-center text-[#737688]">Cargando reportes...</div> : null}
      {error ? <div className="surface-card p-8 text-center text-[#93000a]">{error}</div> : null}

      {!loading && !error ? (
        <div className="space-y-6">
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <article className="surface-card p-5"><p className="text-sm text-[#737688]">Usuarios totales</p><p className="mt-2 text-[28px] font-bold text-[#0b1c30]">{users.total_usuarios || 0}</p></article>
            <article className="surface-card p-5"><p className="text-sm text-[#737688]">Tecnicos registrados</p><p className="mt-2 text-[28px] font-bold text-[#0b1c30]">{users.total_tecnicos || 0}</p></article>
            <article className="surface-card p-5"><p className="text-sm text-[#737688]">Calificaciones registradas</p><p className="mt-2 text-[28px] font-bold text-[#0b1c30]">{ratings.total_calificaciones || 0}</p></article>
            <article className="surface-card p-5"><p className="text-sm text-[#737688]">Promedio general</p><p className="mt-2 text-[28px] font-bold text-[#0b1c30]">{ratings.promedio || '0.00'}</p></article>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <div className="surface-card p-6">
              <h2 className="text-[20px] font-semibold text-[#0b1c30]">Servicios por estado</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {serviceStates.map((item) => (
                  <div key={item.nombre} className="rounded-2xl bg-[#eff4ff] px-4 py-3 text-sm text-[#434656]">
                    <p className="font-semibold capitalize text-[#0b1c30]">{item.nombre}</p>
                    <p className="mt-1 text-xl font-bold text-[#003ec7]">{item.total}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="surface-card p-6">
              <h2 className="text-[20px] font-semibold text-[#0b1c30]">Ranking de ingresos por tecnico</h2>
              <div className="mt-4 space-y-3">
                {technicianIncome.slice(0, 5).map((item) => (
                  <div key={item.tecnico_id} className="rounded-2xl bg-[#eff4ff] px-4 py-3 text-sm text-[#434656]">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-[#0b1c30]">{item.tecnico || `Tecnico #${item.tecnico_id}`}</p>
                      <p className="font-semibold text-[#003ec7]">{formatMoney(item.ingresos_netos)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="surface-card overflow-x-auto p-6">
            <h2 className="text-[20px] font-semibold text-[#0b1c30]">Ultimos servicios auditables</h2>
            <table className="mt-4 w-full min-w-[900px] text-left text-sm text-[#0b1c30]">
              <thead className="text-[13px] uppercase tracking-[0.05em] text-[#737688]">
                <tr>
                  <th className="py-3 pr-4">Codigo</th>
                  <th className="py-3 pr-4">Cliente</th>
                  <th className="py-3 pr-4">Tecnico</th>
                  <th className="py-3 pr-4">Estado</th>
                  <th className="py-3 pr-4">Equipo</th>
                  <th className="py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {serviceSummary.slice(0, 12).map((item, index) => (
                  <tr key={`${item.servicio_id}-${item.fecha_solicitud || item.codigo_servicio || 'sin-fecha'}-${index}`} className="border-t border-[#e3e6f2] text-[#434656]">
                    <td className="py-3 pr-4 font-semibold text-[#0b1c30]">{item.codigo_servicio || `#${item.servicio_id}`}</td>
                    <td className="py-3 pr-4">{item.cliente || 'Sin cliente'}</td>
                    <td className="py-3 pr-4">{item.tecnico || 'Sin tecnico'}</td>
                    <td className="py-3 pr-4 capitalize">{item.estado || 'Sin estado'}</td>
                    <td className="py-3 pr-4">{item.tipo_equipo || 'Sin tipo'}</td>
                    <td className="py-3 text-right font-semibold text-[#003ec7]">{formatMoney(item.precio_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      ) : null}
    </section>
  );
}
