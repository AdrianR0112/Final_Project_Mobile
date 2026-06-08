'use client';

import { useEffect, useState } from 'react';
import { getNotificationsWithFilters, markAllNotificationsAsRead, markNotificationAsRead } from '../../../services/notification.service';

export default function TechnicianNotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadNotifications() {
      try {
        setLoading(true);
        const response = await getNotificationsWithFilters({ limit: 50 });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.message || 'No se pudieron cargar las notificaciones');
        }
        setNotifications(data.notifications || []);
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setLoading(false);
      }
    }

    loadNotifications();
  }, []);

  async function handleRead(notificationId) {
    const response = await markNotificationAsRead(notificationId);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || 'No se pudo marcar la notificacion');
    setNotifications((current) => current.map((notification) => (notification.id === notificationId ? { ...notification, read: true } : notification)));
  }

  async function handleReadAll() {
    const response = await markAllNotificationsAsRead();
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || 'No se pudieron marcar las notificaciones');
    setNotifications((current) => current.map((notification) => ({ ...notification, read: true })));
  }

  return (
    <section className="mx-auto max-w-[1280px] px-5 py-8 md:px-10">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.05em] text-[#737688]">Centro</p>
          <h1 className="section-title mt-2">Notificaciones del tecnico</h1>
        </div>
        <button type="button" className="rounded-full border border-[#c3c5d9] px-4 py-2 text-sm font-semibold text-[#0b1c30] hover:bg-[#eff4ff]" onClick={handleReadAll}>Marcar todo como leido</button>
      </div>
      {loading ? <div className="text-center text-[#737688]">Cargando notificaciones...</div> : error ? <div className="text-center text-[#93000a]">Error: {error}</div> : notifications.length === 0 ? <div className="text-center text-[#737688]">No tienes notificaciones</div> : (
        <div className="space-y-4">
          {notifications.map((notification) => (
            <article key={notification.id} className={`rounded-3xl border p-5 ${notification.read ? 'border-[#c3c5d9] bg-white' : 'border-[#9db8ff] bg-[#eff4ff]'}`}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.05em] text-[#737688]">{notification.type} · {notification.channel}</p>
                  <h2 className="mt-2 text-[18px] font-semibold text-[#0b1c30]">{notification.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-[#434656]">{notification.message}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span className="text-xs text-[#737688]">{notification.date ? new Date(notification.date).toLocaleString() : 'Sin fecha'}</span>
                  {!notification.read ? <button type="button" className="text-sm font-semibold text-[#003ec7]" onClick={() => handleRead(notification.id)}>Marcar leida</button> : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
