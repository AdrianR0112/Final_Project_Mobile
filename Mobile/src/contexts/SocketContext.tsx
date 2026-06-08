import { createContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { getStoredToken } from '../utils/auth';
import { useAuth } from '../hooks/useAuth';
import { SOCKET_URL } from '../api/config';

interface SocketContextType {
  socket: Socket | null;
  connected: boolean;
  joinServiceRoom: (serviceId: number, callback?: (response: unknown) => void) => void;
}

export const SocketContext = createContext<SocketContextType>({
  socket: null,
  connected: false,
  joinServiceRoom: () => {},
});

export function SocketProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setConnected(false);
      setSocket((current) => {
        current?.disconnect();
        return null;
      });
      return;
    }

    let cancelled = false;

    async function connectSocket() {
      const token = await getStoredToken();
      if (!token || cancelled) return;

      const nextSocket = io(SOCKET_URL, {
        transports: ['websocket'],
        auth: { token },
      });

      nextSocket.on('connect', () => {
        if (!cancelled) setConnected(true);
      });
      nextSocket.on('disconnect', () => {
        if (!cancelled) setConnected(false);
      });

      if (!cancelled) setSocket(nextSocket);
    }

    connectSocket();

    return () => {
      cancelled = true;
    };
  }, [user, isAuthenticated]);

  const value = useMemo<SocketContextType>(
    () => ({
      socket,
      connected,
      joinServiceRoom(serviceId, callback) {
        if (!socket || !serviceId) return;
        socket.emit('service:join', { serviceId }, callback);
      },
    }),
    [connected, socket]
  );

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}
