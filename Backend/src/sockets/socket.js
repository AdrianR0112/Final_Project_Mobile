const { verifyToken } = require('../utils/jwt');
const chatModel = require('../models/chat.model');

const parseToken = (socket) => {
  const authToken = socket.handshake.auth?.token;
  const queryToken = socket.handshake.query?.token;
  return authToken || queryToken || null;
};

module.exports = (io) => {
  io.on('connection', (socket) => {
    let socketUser = null;
    const token = parseToken(socket);

    if (token) {
      try {
        const decoded = verifyToken(token);
        socketUser = {
          id: decoded.sub,
          role: decoded.role,
          email: decoded.email,
        };
        socket.data.user = socketUser;
        socket.join(`user:${socketUser.id}`);
      } catch (error) {
        socket.emit('chat:error', { message: 'Token invalido o expirado' });
      }
    }

    socket.on('chat:join', async ({ serviceId }, callback) => {
      try {
        if (!socketUser) {
          const response = { ok: false, message: 'No autenticado' };
          if (callback) callback(response);
          return;
        }

        const numericServiceId = Number(serviceId);
        const service = await chatModel.getChatServiceContext(numericServiceId);
        if (!service) {
          const response = { ok: false, message: 'Servicio no encontrado' };
          if (callback) callback(response);
          return;
        }

        if (!chatModel.canAccessChatService(service, socketUser.id, socketUser.role)) {
          const response = { ok: false, message: 'No autorizado para este chat' };
          if (callback) callback(response);
          return;
        }

        const roomName = `service:${numericServiceId}`;
        socket.join(roomName);
        if (callback) callback({ ok: true, room: roomName });
      } catch (error) {
        if (callback) callback({ ok: false, message: error.message });
      }
    });

    socket.on('service:join', async ({ serviceId }, callback) => {
      try {
        if (!socketUser) {
          const response = { ok: false, message: 'No autenticado' };
          if (callback) callback(response);
          return;
        }

        const numericServiceId = Number(serviceId);
        const service = await chatModel.getChatServiceContext(numericServiceId);
        if (!service) {
          const response = { ok: false, message: 'Servicio no encontrado' };
          if (callback) callback(response);
          return;
        }

        if (!chatModel.canAccessChatService(service, socketUser.id, socketUser.role)) {
          const response = { ok: false, message: 'No autorizado para este servicio' };
          if (callback) callback(response);
          return;
        }

        const roomName = `service:${numericServiceId}`;
        socket.join(roomName);
        if (callback) callback({ ok: true, room: roomName });
      } catch (error) {
        if (callback) callback({ ok: false, message: error.message });
      }
    });

    socket.on('chat:send', async ({ serviceId, contenido }, callback) => {
      try {
        if (!socketUser) {
          if (callback) callback({ ok: false, message: 'No autenticado' });
          return;
        }

        const numericServiceId = Number(serviceId);
        const result = await chatModel.createMessage(numericServiceId, socketUser.id, socketUser.role, contenido);
        if (!result.service) {
          if (callback) callback({ ok: false, message: 'Servicio no encontrado' });
          return;
        }

        if (result.forbidden) {
          if (callback) callback({ ok: false, message: 'No autorizado para este chat' });
          return;
        }

        const payload = {
          serviceId: numericServiceId,
          message: {
            id: result.message.id,
            servicioId: result.message.servicio_id,
            remitenteId: result.message.remitente_id,
            contenido: result.message.contenido,
            leido: result.message.leido,
            fechaEnvio: result.message.fecha_envio,
            remitente: {
              id: result.message.remitente_id,
              nombre: result.message.remitente_nombre,
              apellido: result.message.remitente_apellido,
              correo: result.message.remitente_correo,
              rolId: result.message.rol_id,
            },
          },
        };

        io.to(`service:${numericServiceId}`).emit('chat:new_message', payload);
        if (callback) callback({ ok: true, ...payload });
      } catch (error) {
        if (callback) callback({ ok: false, message: error.message });
      }
    });

    socket.on('chat:read', async ({ serviceId }, callback) => {
      try {
        if (!socketUser) {
          if (callback) callback({ ok: false, message: 'No autenticado' });
          return;
        }

        const numericServiceId = Number(serviceId);
        const result = await chatModel.markMessagesAsRead(numericServiceId, socketUser.id, socketUser.role);
        if (!result.service) {
          if (callback) callback({ ok: false, message: 'Servicio no encontrado' });
          return;
        }

        if (result.forbidden) {
          if (callback) callback({ ok: false, message: 'No autorizado para este chat' });
          return;
        }

				const payload = { serviceId: numericServiceId, updatedCount: result.updatedCount, readerId: socketUser.id };
				io.to(`service:${numericServiceId}`).emit('chat:messages_read', payload);
        if (callback) callback({ ok: true, ...payload });
      } catch (error) {
        if (callback) callback({ ok: false, message: error.message });
      }
    });

    socket.on('disconnect', () => {});
  });
};
