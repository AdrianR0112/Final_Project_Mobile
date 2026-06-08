'use client';

import { useEffect, useState } from 'react';
import { getAdminCoverageZones, getAdminDashboard, getAdminReports, getAdminSystemConfig } from '../../../services/admin.service';

function getServiceStateTotal(serviceStates = [], stateName) {
  return serviceStates.find((item) => item.nombre === stateName)?.total || 0;
}

function formatMoney(value) {
  const numericValue = Number(value || 0);
  return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(Number.isNaN(numericValue) ? 0 : numericValue);
}

export default function AdminDashboardPage() {
  const [dashboard, setDashboard] = useState(null);
  const [reports, setReports] = useState(null);
  const [coverageZones, setCoverageZones] = useState([]);
  const [systemConfig, setSystemConfig] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        const [dashboardRes, reportsRes, coverageRes, configRes] = await Promise.all([
          getAdminDashboard(),
          getAdminReports(),
          getAdminCoverageZones(),
          getAdminSystemConfig(),
        ]);
        const dashboardData = await dashboardRes.json().catch(() => ({}));
        const reportsData = await reportsRes.json().catch(() => ({}));
        const coverageData = await coverageRes.json().catch(() => ({}));
        const configData = await configRes.json().catch(() => ({}));

        if (!dashboardRes.ok) {
          throw new Error(dashboardData.message || 'No se pudo cargar el dashboard administrativo');
        }

        if (!reportsRes.ok) {
          throw new Error(reportsData.message || 'No se pudieron cargar los reportes');
        }

        if (!coverageRes.ok) {
          throw new Error(coverageData.message || 'No se pudieron cargar las zonas de cobertura');
        }

        if (!configRes.ok) {
          throw new Error(configData.message || 'No se pudo cargar la configuracion del sistema');
        }

        setDashboard(dashboardData);
        setReports(reportsData);
        setCoverageZones(coverageData.zones || []);
        setSystemConfig(configData.config || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  const users = dashboard?.users || {};
  const ratings = dashboard?.ratings || {};
  const serviceStates = dashboard?.serviceStates || [];
  const recentServices = dashboard?.recentServices || [];
  const technicianIncome = reports?.technicianIncome || [];
  const serviceSummary = reports?.serviceSummary || [];
  const activeZones = coverageZones.filter((zone) => zone.activa);
  const keyConfig = systemConfig.slice(0, 4);

  return (
    <div className="mx-auto max-w-[1280px] px-5 py-8 md:px-10">
      <h1 className="section-title mb-6">Panel administrativo de operaciones</h1>
      {loading ? (
        <div className="text-center text-[#737688]">Cargando datos...</div>
      ) : error ? (
        <div className="text-center text-[#93000a]">Error: {error}</div>
      ) : (
        <div className="space-y-6">
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <article className="surface-card p-5"><p className="text-sm text-[#737688]">Usuarios activos</p><p className="mt-2 text-[28px] font-bold text-[#0b1c30]">{users.usuarios_activos || 0}</p><p className="mt-1 text-xs text-[#737688]">Totales: {users.total_usuarios || 0}</p></article>
            <article className="surface-card p-5"><p className="text-sm text-[#737688]">Servicios solicitados</p><p className="mt-2 text-[28px] font-bold text-[#003ec7]">{getServiceStateTotal(serviceStates, 'solicitado')}</p><p className="mt-1 text-xs text-[#737688]">Asignados: {getServiceStateTotal(serviceStates, 'asignado')}</p></article>
            <article className="surface-card p-5"><p className="text-sm text-[#737688]">Servicios finalizados</p><p className="mt-2 text-[28px] font-bold text-[#0b1c30]">{getServiceStateTotal(serviceStates, 'finalizado')}</p><p className="mt-1 text-xs text-[#737688]">Cancelados: {getServiceStateTotal(serviceStates, 'cancelado')}</p></article>
            <article className="surface-card p-5"><p className="text-sm text-[#737688]">Promedio de calificaciones</p><p className="mt-2 text-[28px] font-bold text-[#0b1c30]">{ratings.promedio || '0.00'}</p><p className="mt-1 text-xs text-[#737688]">Totales: {ratings.total_calificaciones || 0}</p></article>
          </section>
          <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
            <div className="surface-card p-6">
              <h2 className="text-[20px] font-semibold text-[#0b1c30]">Actividad reciente de servicios</h2>
              {recentServices.length === 0 ? <p className="mt-4 text-sm text-[#737688]">No hay servicios recientes.</p> : <div className="mt-4 space-y-3">{recentServices.map((service, index) => <div key={`${service.servicio_id}-${service.fecha_solicitud || service.codigo_servicio || 'sin-fecha'}-${index}`} className="rounded-2xl bg-[#eff4ff] px-4 py-3 text-sm text-[#434656]"><div className="flex items-center justify-between gap-3"><div><p className="font-semibold text-[#0b1c30]">{service.codigo_servicio}</p><p className="mt-1">{service.tipo_equipo} · {service.estado}</p><p className="mt-1">Cliente: {service.cliente || 'N/A'} · Tecnico: {service.tecnico || 'Sin asignar'}</p></div><p className="shrink-0 font-semibold text-[#003ec7]">{formatMoney(service.precio_total)}</p></div></div>)}</div>}
            </div>
            <div className="surface-card p-6">
              <h2 className="text-[20px] font-semibold text-[#0b1c30]">Cobertura y sistema</h2>
              <div className="mt-4 space-y-4 text-sm text-[#434656]">
                <div className="rounded-2xl bg-[#eff4ff] px-4 py-3"><p className="font-semibold text-[#0b1c30]">Zonas activas</p><p className="mt-1">{activeZones.length} de {coverageZones.length}</p></div>
                <div className="rounded-2xl bg-[#eff4ff] px-4 py-3"><p className="font-semibold text-[#0b1c30]">Top tecnico por ingresos</p><p className="mt-1">{technicianIncome[0]?.tecnico || 'Sin datos'}</p><p className="mt-1 text-xs text-[#737688]">{formatMoney(technicianIncome[0]?.ingresos_netos)}</p></div>
                <div className="rounded-2xl bg-[#eff4ff] px-4 py-3"><p className="font-semibold text-[#0b1c30]">Configuracion clave</p>{keyConfig.length === 0 ? <p className="mt-1">Sin configuracion</p> : <div className="mt-2 space-y-2">{keyConfig.map((item) => <p key={item.clave}><span className="font-semibold">{item.clave}:</span> {item.valor}</p>)}</div>}</div>
              </div>
            </div>
          </section>
          <section className="grid gap-6 xl:grid-cols-2">
            <div className="surface-card p-6">
              <h2 className="text-[20px] font-semibold text-[#0b1c30]">Distribucion por estado</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2">{serviceStates.map((item) => <div key={item.nombre} className="rounded-2xl bg-[#eff4ff] px-4 py-3 text-sm text-[#434656]"><p className="font-semibold capitalize text-[#0b1c30]">{item.nombre}</p><p className="mt-1">{item.total}</p></div>)}</div>
            </div>
            <div className="surface-card p-6">
              <h2 className="text-[20px] font-semibold text-[#0b1c30]">Resumen consolidado</h2>
              <div className="mt-4 space-y-3">{serviceSummary.slice(0, 5).map((item, index) => <div key={`${item.servicio_id}-${item.fecha_solicitud || item.codigo_servicio || 'sin-fecha'}-${index}`} className="rounded-2xl bg-[#eff4ff] px-4 py-3 text-sm text-[#434656]"><div className="flex items-center justify-between gap-3"><div><p className="font-semibold text-[#0b1c30]">{item.codigo_servicio}</p><p className="mt-1">{item.tipo_equipo} · {item.estado}</p></div><p className="shrink-0 font-semibold text-[#003ec7]">{formatMoney(item.precio_total)}</p></div></div>)}</div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
