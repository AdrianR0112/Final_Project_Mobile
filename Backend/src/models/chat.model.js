const db = require('../config/db');

const getChatServiceContext = async (serviceId) => {
	const { rows } = await db.query(
		`
			SELECT
				s.id,
				s.cliente_id,
				s.tecnico_id,
				s.estado_id,
				s.fecha_solicitud,
				es.nombre AS estado,
				c.nombre AS cliente_nombre,
				c.apellido AS cliente_apellido,
				c.correo AS cliente_correo,
				COALESCE(t.nombre || ' ' || t.apellido, '') AS tecnico_nombre_completo
			FROM servicios s
			JOIN estados_servicio es ON es.id = s.estado_id
			JOIN usuarios c ON c.id = s.cliente_id
			LEFT JOIN usuarios t ON t.id = s.tecnico_id
			WHERE s.id = $1
			LIMIT 1
		`,
		[serviceId],
	);

	return rows[0] || null;
};

const canAccessChatService = (service, userId, role) => {
	if (!service || !userId) {
		return false;
	}

	if (role === 'cliente') {
		return service.cliente_id === userId;
	}

	if (role === 'tecnico') {
		if (service.tecnico_id === userId) {
			return true;
		}

		if (!service.tecnico_id && service.estado === 'solicitado') {
			return true;
		}

		return false;
	}

	return false;
};

const listMessagesByService = async (serviceId, userId, role, { limit = 50, offset = 0 } = {}) => {
	const service = await getChatServiceContext(serviceId);
	if (!service) {
		return { service: null, messages: [] };
	}

	if (!canAccessChatService(service, userId, role)) {
		return { service, forbidden: true, messages: [] };
	}

	const { rows } = await db.query(
		`
			SELECT
				m.id,
				m.servicio_id,
				m.remitente_id,
				m.tipo_mensaje,
				m.contenido,
				m.archivo_url,
				m.leido,
				m.fecha_envio,
				u.nombre AS remitente_nombre,
				u.apellido AS remitente_apellido,
				u.correo AS remitente_correo,
				u.rol_id
			FROM mensajes_chat m
			JOIN usuarios u ON u.id = m.remitente_id
			WHERE m.servicio_id = $1
			ORDER BY m.fecha_envio ASC, m.id ASC
			LIMIT $2 OFFSET $3
		`,
		[serviceId, limit, offset],
	);

	return { service, messages: rows };
};

const createMessage = async (serviceId, senderId, role, contenido, { tipoMensaje = 'texto', archivoUrl = null } = {}) => {
	const service = await getChatServiceContext(serviceId);
	if (!service) {
		return { service: null, message: null, forbidden: false };
	}

	if (!canAccessChatService(service, senderId, role)) {
		return { service, message: null, forbidden: true };
	}

	const cleanedContent = String(contenido || '').trim();
	if (!cleanedContent && !archivoUrl) {
		throw new Error('Debes enviar texto o un archivo');
	}

	const { rows } = await db.query(
		`
			INSERT INTO mensajes_chat (servicio_id, remitente_id, tipo_mensaje, contenido, archivo_url)
			VALUES ($1, $2, $3, $4, $5)
			RETURNING id, servicio_id, remitente_id, tipo_mensaje, contenido, archivo_url, leido, fecha_envio
		`,
		[serviceId, senderId, tipoMensaje, cleanedContent || 'Archivo adjunto', archivoUrl],
	);

	const message = rows[0];
	const senderResult = await db.query(
		`SELECT id, nombre, apellido, correo, rol_id FROM usuarios WHERE id = $1 LIMIT 1`,
		[senderId],
	);

	return {
		service,
		message: {
			...message,
			remitente_nombre: senderResult.rows[0]?.nombre || null,
			remitente_apellido: senderResult.rows[0]?.apellido || null,
			remitente_correo: senderResult.rows[0]?.correo || null,
			rol_id: senderResult.rows[0]?.rol_id || null,
		},
		forbidden: false,
	};
};

const markMessagesAsRead = async (serviceId, userId, role) => {
	const service = await getChatServiceContext(serviceId);
	if (!service) {
		return { service: null, updatedCount: 0, forbidden: false };
	}

	if (!canAccessChatService(service, userId, role)) {
		return { service, updatedCount: 0, forbidden: true };
	}

	const senderColumn = 'remitente_id';
	const { rowCount } = await db.query(
		`
			UPDATE mensajes_chat
			SET leido = TRUE
			WHERE servicio_id = $1
			  AND ${senderColumn} <> $2
			  AND leido = FALSE
		`,
		[serviceId, userId],
	);

	return { service, updatedCount: rowCount, forbidden: false };
};

const getUnreadChatCount = async (userId, role) => {
	const userColumn = role === 'tecnico' ? 's.tecnico_id' : 's.cliente_id';
	const { rows } = await db.query(
		`
			SELECT COUNT(*)::INT AS unread_count
			FROM mensajes_chat m
			JOIN servicios s ON s.id = m.servicio_id
			WHERE ${userColumn} = $1
			  AND m.remitente_id <> $1
			  AND m.leido = FALSE
		`,
		[userId],
	);

	return rows[0] || { unread_count: 0 };
};

module.exports = {
	getChatServiceContext,
	canAccessChatService,
	listMessagesByService,
	createMessage,
	markMessagesAsRead,
	getUnreadChatCount,
};
