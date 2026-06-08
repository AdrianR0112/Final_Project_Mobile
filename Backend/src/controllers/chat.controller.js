const chatModel = require('../models/chat.model');
const { emitToService } = require('../sockets/io');

const buildUploadedAttachmentUrl = (req) => {
	if (!req.file) {
		return null;
	}

	return `${req.protocol}://${req.get('host')}/uploads/chat-attachments/${req.file.filename}`;
};

const buildChatMessage = (message) => ({
	id: message.id,
	servicioId: message.servicio_id,
	remitenteId: message.remitente_id,
	tipoMensaje: message.tipo_mensaje,
	contenido: message.contenido,
	archivoUrl: message.archivo_url,
	leido: message.leido,
	fechaEnvio: message.fecha_envio,
	remitente: {
		id: message.remitente_id,
		nombre: message.remitente_nombre,
		apellido: message.remitente_apellido,
		correo: message.remitente_correo,
		rolId: message.rol_id,
	},
});

const buildChatService = (service) => ({
	id: service.id,
	clienteId: service.cliente_id,
	tecnicoId: service.tecnico_id,
	estadoId: service.estado_id,
	estado: service.estado,
	fechaSolicitud: service.fecha_solicitud,
	clienteNombre: service.cliente_nombre,
	clienteApellido: service.cliente_apellido,
	clienteCorreo: service.cliente_correo,
	tecnicoNombreCompleto: service.tecnico_nombre_completo,
});

const getUnreadMessagesCount = async (req, res) => {
	try {
		const userId = req.user?.id;
		const role = req.user?.role;
		if (!userId) {
			return res.status(401).json({ message: 'No autenticado' });
		}

		const unread = await chatModel.getUnreadChatCount(userId, role);
		return res.status(200).json({ unreadCount: unread.unread_count || 0 });
	} catch (error) {
		return res.status(500).json({ message: 'Error al obtener mensajes no leidos', error: error.message });
	}
};

const getServiceMessages = async (req, res) => {
	try {
		const userId = req.user?.id;
		const role = req.user?.role;
		if (!userId) {
			return res.status(401).json({ message: 'No autenticado' });
		}

		const serviceId = Number(req.params.serviceId);
		if (!Number.isInteger(serviceId) || serviceId <= 0) {
			return res.status(400).json({ message: 'serviceId invalido' });
		}

		const query = req.query || {};
		const limit = query.limit ? Number(query.limit) : 50;
		const offset = query.offset ? Number(query.offset) : 0;

		const result = await chatModel.listMessagesByService(serviceId, userId, role, { limit, offset });
		if (!result.service) {
			return res.status(404).json({ message: 'Servicio no encontrado' });
		}

		if (result.forbidden) {
			return res.status(403).json({ message: 'No autorizado para ver este chat' });
		}

		return res.status(200).json({
			service: buildChatService(result.service),
			messages: result.messages.map(buildChatMessage),
		});
	} catch (error) {
		return res.status(500).json({ message: 'Error al listar mensajes del chat', error: error.message });
	}
};

const sendServiceMessage = async (req, res) => {
	try {
		const userId = req.user?.id;
		const role = req.user?.role;
		if (!userId) {
			return res.status(401).json({ message: 'No autenticado' });
		}

		const serviceId = Number(req.params.serviceId);
		if (!Number.isInteger(serviceId) || serviceId <= 0) {
			return res.status(400).json({ message: 'serviceId invalido' });
		}

		const uploadedAttachmentUrl = buildUploadedAttachmentUrl(req);
		const { contenido, tipoMensaje, archivoUrl } = req.body || {};
		const resolvedAttachmentUrl = uploadedAttachmentUrl || archivoUrl || null;
		const resolvedContent = contenido !== undefined ? contenido : (req.file?.originalname || 'Archivo adjunto');

		if (contenido === undefined && !resolvedAttachmentUrl) {
			return res.status(400).json({ message: 'Debes enviar un mensaje o un archivo' });
		}

		const resolvedMessageType = tipoMensaje || (req.file ? (String(req.file.mimetype || '').startsWith('image/') ? 'imagen' : 'archivo') : 'texto');

		const result = await chatModel.createMessage(serviceId, userId, role, resolvedContent, {
			tipoMensaje: resolvedMessageType,
			archivoUrl: resolvedAttachmentUrl,
		});
		if (!result.service) {
			return res.status(404).json({ message: 'Servicio no encontrado' });
		}

		if (result.forbidden) {
			return res.status(403).json({ message: 'No autorizado para enviar mensajes en este chat' });
		}

		emitToService(serviceId, 'chat:new_message', {
			serviceId,
			message: buildChatMessage(result.message),
		});

		return res.status(201).json({
			message: 'Mensaje enviado correctamente',
			service: buildChatService(result.service),
			messageData: buildChatMessage(result.message),
		});
	} catch (error) {
		return res.status(500).json({ message: 'Error al enviar mensaje', error: error.message });
	}
};

const markServiceMessagesAsRead = async (req, res) => {
	try {
		const userId = req.user?.id;
		const role = req.user?.role;
		if (!userId) {
			return res.status(401).json({ message: 'No autenticado' });
		}

		const serviceId = Number(req.params.serviceId);
		if (!Number.isInteger(serviceId) || serviceId <= 0) {
			return res.status(400).json({ message: 'serviceId invalido' });
		}

		const result = await chatModel.markMessagesAsRead(serviceId, userId, role);
		if (!result.service) {
			return res.status(404).json({ message: 'Servicio no encontrado' });
		}

		if (result.forbidden) {
			return res.status(403).json({ message: 'No autorizado para modificar este chat' });
		}

		emitToService(serviceId, 'chat:messages_read', { serviceId, updatedCount: result.updatedCount, readerId: userId });

		return res.status(200).json({
			message: 'Mensajes marcados como leidos correctamente',
			updatedCount: result.updatedCount,
		});
	} catch (error) {
		return res.status(500).json({ message: 'Error al marcar mensajes como leidos', error: error.message });
	}
};

module.exports = {
	getUnreadMessagesCount,
	getServiceMessages,
	sendServiceMessage,
	markServiceMessagesAsRead,
};
