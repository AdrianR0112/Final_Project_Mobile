'use client';

import { createContext, useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../hooks/useAuth';
import API_URL from '../services/api';
import { getStoredToken } from '../utils/auth';

export const SocketContext = createContext(null);

function buildSocketUrl() {
  return String(API_URL || 'http://localhost:3001/api').replace(/\/api\/?$/, '');
}

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const token = getStoredToken();
    if (!token || !user) {
      setConnected(false);
      setSocket((current) => {
        current?.disconnect();
        return null;
      });
      return undefined;
    }

    const nextSocket = io(buildSocketUrl(), {
      transports: ['websocket'],
      auth: { token },
    });

    nextSocket.on('connect', () => setConnected(true));
    nextSocket.on('disconnect', () => setConnected(false));

    setSocket(nextSocket);

    return () => {
      nextSocket.disconnect();
      setConnected(false);
      setSocket(null);
    };
  }, [user]);

  const value = useMemo(() => ({
    socket,
    connected,
    joinServiceRoom(serviceId, callback) {
      if (!socket || !serviceId) {
        return;
      }

      socket.emit('service:join', { serviceId }, callback);
    },
  }), [connected, socket]);

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}
