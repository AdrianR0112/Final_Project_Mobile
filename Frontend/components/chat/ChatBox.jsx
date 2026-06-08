'use client';

import { useEffect, useRef, useState } from 'react';
import { getStoredUser } from '../../utils/auth';
import { getServiceMessages, markServiceMessagesAsRead } from '../../services/chat.service';
import { useSocket } from '../../hooks/useSocket';

export default function ChatBox({ serviceId, reloadKey = 0 }) {
  const { socket, joinServiceRoom } = useSocket();
  const [messages, setMessages] = useState([]);
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const messagesContainerRef = useRef(null);

  function scrollToBottom() {
    if (!messagesContainerRef.current) {
      return;
    }

    messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
  }

  async function markCurrentServiceMessagesAsRead() {
    if (!serviceId) {
      return;
    }

    await markServiceMessagesAsRead(serviceId).catch(() => null);
  }

  useEffect(() => {
    let cancelled = false;

    async function loadMessages() {
      if (!serviceId) return;

      try {
        setLoading((current) => (current && reloadKey === 0 ? true : current));
        const response = await getServiceMessages(serviceId);
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(data.message || 'No se pudieron cargar los mensajes');
        }

        if (!cancelled) {
          setService(data.service || null);
          setMessages(data.messages || []);
          setError(null);
        }

        await markCurrentServiceMessagesAsRead();
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadMessages();

    joinServiceRoom?.(serviceId);

    const handleNewMessage = (payload) => {
      if (Number(payload?.serviceId) !== Number(serviceId) || !payload?.message) {
        return;
      }

      markCurrentServiceMessagesAsRead();

      setMessages((current) => {
        if (current.some((message) => message.id === payload.message.id)) {
          return current;
        }

        return [...current, payload.message];
      });
    };

		const handleMessagesRead = (payload) => {
			if (Number(payload?.serviceId) !== Number(serviceId)) {
				return;
			}

			setMessages((current) => current.map((message) => (
				message.remitenteId !== payload?.readerId
					? { ...message, leido: true }
					: message
			)));
		};

    const handleServiceUpdate = (payload) => {
      if (Number(payload?.serviceId) !== Number(serviceId) || !payload?.service) {
        return;
      }

      setService((current) => ({ ...(current || {}), ...payload.service }));
    };

    socket?.on('chat:new_message', handleNewMessage);
    socket?.on('chat:messages_read', handleMessagesRead);
    socket?.on('service:updated', handleServiceUpdate);

    return () => {
      cancelled = true;
      socket?.off('chat:new_message', handleNewMessage);
      socket?.off('chat:messages_read', handleMessagesRead);
      socket?.off('service:updated', handleServiceUpdate);
    };
  }, [joinServiceRoom, reloadKey, serviceId, socket]);

  useEffect(() => {
    if (!messagesContainerRef.current) {
      return;
    }

    const animationFrameId = window.requestAnimationFrame(() => {
      scrollToBottom();
      window.setTimeout(scrollToBottom, 120);
    });

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [loading, messages, reloadKey, serviceId]);

	const currentUser = getStoredUser();

	function renderDeliveryState(message) {
		if (message.remitenteId !== currentUser?.id) {
			return null;
		}

		return (
			<span className="inline-flex items-center gap-1">
				<span className="material-symbols-outlined text-[14px]">
					{message.leido ? 'done_all' : 'done'}
				</span>
				<span>{message.leido ? 'Visto' : 'Enviado'}</span>
			</span>
		);
	}

	return (
    <div className="surface-card flex h-full min-h-0 flex-col gap-4 overflow-hidden p-6">
      {service ? (
        <div className="shrink-0 border-b border-[#c3c5d9] pb-4 text-sm text-[#434656]">
          <p><span className="font-semibold text-[#0b1c30]">Estado:</span> {service.estado}</p>
          <p><span className="font-semibold text-[#0b1c30]">Tecnico:</span> {service.tecnicoNombreCompleto || 'Pendiente de asignacion'}</p>
        </div>
      ) : null}
      {loading ? (
        <div className="flex flex-1 items-center justify-center text-[#737688]">Cargando mensajes...</div>
      ) : error ? (
        <div className="flex flex-1 items-center justify-center text-[#93000a]">Error: {error}</div>
      ) : messages.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-[#737688]">No hay mensajes aun</div>
      ) : (
        <div ref={messagesContainerRef} className="flex-1 space-y-3 overflow-y-auto pr-1">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.remitenteId === currentUser?.id ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-3xl px-4 py-3 text-sm ${
                message.remitenteId === currentUser?.id ? 'bg-[#003ec7] text-white' : 'bg-[#eff4ff] text-[#0b1c30]'
              }`}>
                <p className="mb-1 text-xs font-semibold uppercase tracking-[0.05em] opacity-70">
                  {message.remitente?.nombre ? `${message.remitente.nombre} ${message.remitente.apellido || ''}`.trim() : 'Usuario'}
                </p>
                <p>{message.contenido}</p>
                {message.archivoUrl ? (
                  String(message.tipoMensaje).toLowerCase() === 'imagen' ? (
                    <a href={message.archivoUrl} target="_blank" rel="noreferrer" className="mt-3 block">
                      <img src={message.archivoUrl} alt={message.contenido || 'Imagen adjunta'} className="max-h-56 rounded-2xl object-contain" onLoad={scrollToBottom} />
                    </a>
                  ) : (
                    <a href={message.archivoUrl} target="_blank" rel="noreferrer" className={`mt-3 inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-semibold ${message.remitenteId === currentUser?.id ? 'bg-white/15 text-white' : 'bg-white text-[#003ec7]'}`}>
                      <span className="material-symbols-outlined text-[18px]">attach_file</span>
                      Abrir archivo
                    </a>
                  )
						) : null}
						{message.fechaEnvio && (
							<div className="mt-1 flex items-center gap-2 text-xs opacity-70">
								<span>{new Date(message.fechaEnvio).toLocaleString()}</span>
								{renderDeliveryState(message)}
							</div>
						)}
					</div>
				</div>
          ))}
        </div>
      )}
    </div>
  );
}
